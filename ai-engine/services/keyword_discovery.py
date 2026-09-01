import httpx
from bs4 import BeautifulSoup
from typing import Optional

from utils.gsc_client import GSCClient


class KeywordDiscovery:
    """หา keyword ใหม่จากหลายแหล่ง"""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async def discover(
        self,
        seed_keywords: list[str],
        site_url: str = "",
        gsc_refresh_token: str = "",
        gsc_site_url: str = "",
    ) -> list[dict]:
        """หา keyword จากทุกแหล่ง

        Returns:
            list of {keyword, source, intent, score}
        """
        results = []

        # 1. Google Suggest
        for seed in seed_keywords:
            suggests = await self.from_google_suggest(seed)
            results.extend(suggests)

        # 2. GSC Keywords (ถ้ามี)
        if gsc_refresh_token and gsc_site_url:
            gsc_keywords = self.from_gsc(gsc_refresh_token, gsc_site_url)
            results.extend(gsc_keywords)

        # 3. SERP Related (ถ้ามี seed)
        if seed_keywords:
            related = await self.from_serp_related(seed_keywords[0])
            results.extend(related)

        # Deduplicate
        seen = set()
        unique = []
        for r in results:
            kw = r["keyword"].lower().strip()
            if kw and kw not in seen:
                seen.add(kw)
                unique.append(r)

        return unique

    async def from_google_suggest(self, seed: str) -> list[dict]:
        """ดึง keyword จาก Google Autocomplete"""
        results = []
        queries = [seed] + [f"{seed} {chr(c)}" for c in range(ord("a"), ord("z") + 1)]

        async with httpx.AsyncClient(timeout=10, headers=self.HEADERS) as client:
            for q in queries[:10]:  # จำกัด 10 queries
                try:
                    resp = await client.get(
                        "https://suggestqueries.google.com/complete/search",
                        params={"client": "firefox", "q": q, "hl": "th"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        suggestions = data[1] if len(data) > 1 else []
                        for s in suggestions:
                            if s.lower() != seed.lower():
                                results.append({
                                    "keyword": s,
                                    "source": "google_suggest",
                                    "intent": self._detect_intent(s),
                                })
                except Exception:
                    continue

        return results

    def from_gsc(self, refresh_token: str, site_url: str) -> list[dict]:
        """ดึง keyword จาก GSC ที่ rank 8-20 (gold mine)"""
        try:
            client = GSCClient(refresh_token, site_url)
            # ดึง keyword ทั้งหมดใน 28 วัน
            end_date = __import__("datetime").datetime.now().date() - __import__("datetime").timedelta(days=3)
            start_date = end_date - __import__("datetime").timedelta(days=28)

            body = {
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "dimensions": ["query"],
                "rowLimit": 500,
            }
            response = client.service.searchanalytics().query(siteUrl=site_url, body=body).execute()

            results = []
            for row in response.get("rows", []):
                position = row.get("position", 0)
                if 8 <= position <= 20:  # Gold mine range
                    results.append({
                        "keyword": row["keys"][0],
                        "source": "gsc",
                        "intent": self._detect_intent(row["keys"][0]),
                        "impressions": row.get("impressions", 0),
                        "position": round(position, 1),
                    })

            return results
        except Exception:
            return []

    async def from_serp_related(self, keyword: str) -> list[dict]:
        """ดึง related searches จาก Google"""
        try:
            async with httpx.AsyncClient(timeout=15, headers=self.HEADERS) as client:
                resp = await client.get(
                    "https://www.google.com/search",
                    params={"q": keyword, "num": 10, "hl": "th"},
                )
                if resp.status_code != 200:
                    return []

            soup = BeautifulSoup(resp.text, "html.parser")
            related = []

            # Related searches
            for el in soup.select("div.s75CSd, div.brs_col a"):
                text = el.get_text(strip=True)
                if text and text.lower() != keyword.lower():
                    related.append({
                        "keyword": text,
                        "source": "serp_related",
                        "intent": self._detect_intent(text),
                    })

            return related[:10]
        except Exception:
            return []

    def _detect_intent(self, keyword: str) -> str:
        kw = keyword.lower()
        if any(w in kw for w in ["ซื้อ", "ราคา", "สั่ง", "buy", "price", "order", "จอง"]):
            return "transactional"
        if any(w in kw for w in ["รีวิว", "เปรียบเทียบ", "ดีไหม", "แนะนำ", "review", "best", "top"]):
            return "commercial"
        if any(w in kw for w in ["วิธี", "คืออะไร", "how to", "what is", "ทำไม"]):
            return "informational"
        return "informational"
