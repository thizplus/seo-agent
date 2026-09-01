import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse


class SERPAnalyzer:
    """วิเคราะห์ SERP top 10 สำหรับ keyword — ใช้ DuckDuckGo (ไม่ถูก block)"""

    async def analyze(self, keyword: str) -> dict:
        """Search + วิเคราะห์ top 10"""
        try:
            results = await self._search(keyword)
            if not results:
                return self._empty_result()

            # Crawl top results เพื่อดู word count จริง
            enriched = []
            for i, r in enumerate(results[:10]):
                wc = await self._get_word_count(r["url"])
                enriched.append({
                    "position": i + 1,
                    "url": r["url"],
                    "title": r["title"],
                    "word_count": wc,
                })

            word_counts = [r["word_count"] for r in enriched if r["word_count"] > 0]

            return {
                "results": enriched,
                "avg_word_count": int(sum(word_counts) / len(word_counts)) if word_counts else 1500,
                "min_word_count": min(word_counts) if word_counts else 1000,
                "max_word_count": max(word_counts) if word_counts else 2000,
                "competition_count": len(enriched),
                "intent": self._detect_intent(keyword),
            }
        except Exception:
            return self._empty_result()

    async def _search(self, keyword: str) -> list[dict]:
        """Search ผ่าน DuckDuckGo — filter เฉพาะเว็บที่เกี่ยวข้อง"""
        try:
            from duckduckgo_search import DDGS
            # เพิ่ม "ไทย" หรือ "thailand" ใน query ถ้า keyword เป็นภาษาไทย
            query = keyword
            # ใช้ max_results มากขึ้นเพื่อ filter ทีหลัง
            raw = DDGS().text(query, region="th-th", max_results=20)

            # Filter: ตัดเว็บที่ไม่เกี่ยวข้องออก
            BLOCKED_DOMAINS = {
                "zhihu.com", "quora.com", "reddit.com", "wikipedia.org",
                "facebook.com", "youtube.com", "tiktok.com", "twitter.com",
                "amazon.com", "ebay.com", "alibaba.com",
            }
            BLOCKED_TLDS = {".cn", ".ph", ".jp", ".kr", ".tw", ".in", ".ru"}

            filtered = []
            for r in raw:
                url = r.get("href", "")
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc.lower().replace("www.", "")
                    # ตัด blocked domains
                    if any(bd in domain for bd in BLOCKED_DOMAINS):
                        continue
                    # ตัด blocked TLDs (เว็บจีน, ฟิลิปปินส์ ฯลฯ)
                    if any(domain.endswith(tld) for tld in BLOCKED_TLDS):
                        continue
                    filtered.append({"title": r["title"], "url": url})
                except Exception:
                    continue

                if len(filtered) >= 10:
                    break

            return filtered
        except Exception:
            return []

    async def _get_word_count(self, url: str) -> int:
        """Crawl หน้าเว็บเพื่อนับคำจริง"""
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                if resp.status_code != 200 or "text/html" not in resp.headers.get("content-type", ""):
                    return 0
            soup = BeautifulSoup(resp.text, "html.parser")
            body = soup.find("body")
            text = body.get_text(separator=" ", strip=True) if body else ""
            return len(text.split())
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

    def _empty_result(self) -> dict:
        return {
            "results": [],
            "avg_word_count": 1500,
            "min_word_count": 1000,
            "max_word_count": 2000,
            "competition_count": 0,
            "intent": "informational",
        }
