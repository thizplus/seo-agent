"""Serper.dev Adapter — Google SERP API ที่แม่น 100%"""

import httpx
from domain.ports.serp_port import SERPPort


class SerperAdapter(SERPPort):
    """ใช้ Serper.dev ดึงผล Google Search จริง"""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def analyze(self, keyword: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://google.serper.dev/search",
                    json={"q": keyword, "gl": "th", "hl": "th", "num": 10},
                    headers={"X-API-KEY": self.api_key, "Content-Type": "application/json"},
                )
                if resp.status_code != 200:
                    return self._empty()

                data = resp.json()

            results = []
            for i, item in enumerate(data.get("organic", [])[:10]):
                results.append({
                    "position": item.get("position", i + 1),
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "word_count": 0,
                })

            # Crawl word count ของ top 5 (ไม่ทำทั้งหมดเพื่อประหยัดเวลา)
            for r in results[:5]:
                r["word_count"] = await self._get_word_count(r["url"])

            word_counts = [r["word_count"] for r in results if r["word_count"] > 0]

            return {
                "results": results,
                "avg_word_count": int(sum(word_counts) / len(word_counts)) if word_counts else 1500,
                "min_word_count": min(word_counts) if word_counts else 1000,
                "max_word_count": max(word_counts) if word_counts else 2000,
                "competition_count": len(results),
                "intent": self._detect_intent(keyword),
            }
        except Exception:
            return self._empty()

    async def _get_word_count(self, url: str) -> int:
        try:
            from bs4 import BeautifulSoup
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                if resp.status_code != 200 or "text/html" not in resp.headers.get("content-type", ""):
                    return 0
            soup = BeautifulSoup(resp.text, "html.parser")
            body = soup.find("body")
            return len(body.get_text(separator=" ", strip=True).split()) if body else 0
        except Exception:
            return 0

    def _detect_intent(self, keyword: str) -> str:
        kw = keyword.lower()
        if any(w in kw for w in ["ซื้อ", "ราคา", "สั่ง", "buy", "price", "order", "จอง"]):
            return "transactional"
        if any(w in kw for w in ["รีวิว", "เปรียบเทียบ", "ดีไหม", "แนะนำ", "review", "best"]):
            return "commercial"
        if any(w in kw for w in ["วิธี", "คืออะไร", "how to", "what is", "ทำไม"]):
            return "informational"
        return "informational"

    def _empty(self) -> dict:
        return {
            "results": [], "avg_word_count": 1500, "min_word_count": 1000,
            "max_word_count": 2000, "competition_count": 0, "intent": "informational",
        }
