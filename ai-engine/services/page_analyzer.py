"""Page-Level Analysis — SERP + On-Page Audit + Recommendations"""

import json
import re

from domain.ports.llm_port import LLMPort
from domain.ports.scraper_port import ScraperPort
from domain.ports.serp_port import SERPPort


class PageAnalyzer:
    def __init__(self, llm: LLMPort, scraper: ScraperPort, serp: SERPPort):
        self.llm = llm
        self.scraper = scraper
        self.serp = serp

    async def analyze(self, page_url: str, keywords: list[str], site_url: str = "") -> dict:
        """วิเคราะห์ 1 page: SERP + on-page audit + recommendations"""
        from urllib.parse import urlparse

        own_domain = urlparse(site_url or page_url).netloc.replace("www.", "")

        # 1. Crawl our page
        our_page = await self._crawl_single(page_url)

        # 2. SERP analyze ทุก keyword
        serp_snapshots = {}
        for kw in keywords:
            try:
                serp_data = await self.serp.analyze(kw)
                our_position = 0
                for r in serp_data.get("results", []):
                    r_domain = urlparse(r.get("url", "")).netloc.replace("www.", "")
                    if r_domain == own_domain:
                        our_position = r.get("position", 0)
                        break

                serp_snapshots[kw] = {
                    "our_position": our_position,
                    "avg_word_count": serp_data.get("avg_word_count", 0),
                    "competition_count": serp_data.get("competition_count", 0),
                    "results": serp_data.get("results", [])[:10],
                }
            except Exception:
                serp_snapshots[kw] = {"our_position": 0, "results": [], "avg_word_count": 0}

        # 3. Calculate audit
        avg_wc = max((s.get("avg_word_count", 0) for s in serp_snapshots.values()), default=0)
        avg_competition = max((s.get("competition_count", 0) for s in serp_snapshots.values()), default=0)

        issues = self._audit(our_page, avg_wc, keywords)
        score = self._calc_score(issues)

        # 4. LLM recommendations
        recommendations = await self._get_recommendations(our_page, serp_snapshots, issues, keywords)

        return {
            "page_url": page_url,
            "our_page": our_page,
            "serp_snapshots": serp_snapshots,
            "avg_word_count": avg_wc,
            "competition_count": avg_competition,
            "audit_score": score,
            "issues": issues,
            "recommendations": recommendations,
        }

    async def _crawl_single(self, url: str) -> dict:
        """Crawl 1 page ดึงข้อมูล on-page"""
        try:
            crawl = await self.scraper.crawl(url, max_pages=1)
            if crawl.get("pages"):
                p = crawl["pages"][0]
                return {
                    "word_count": p.get("word_count", 0),
                    "h1": p.get("h1", ""),
                    "meta_description": p.get("meta_description", ""),
                    "h2_count": len(p.get("h2s", [])),
                    "h2s": p.get("h2s", []),
                    "title": p.get("title", ""),
                }
        except Exception:
            pass
        return {"word_count": 0, "h1": "", "meta_description": "", "h2_count": 0, "h2s": [], "title": ""}

    def _audit(self, our_page: dict, avg_wc: int, keywords: list[str]) -> list[dict]:
        """On-page audit — เทียบเรา vs คู่แข่ง"""
        issues = []
        our_wc = our_page.get("word_count", 0)
        h1 = our_page.get("h1", "")
        meta = our_page.get("meta_description", "")
        h2_count = our_page.get("h2_count", 0)

        # Word count
        if avg_wc > 0 and our_wc < avg_wc * 0.6:
            diff = avg_wc - our_wc
            issues.append({"type": "word_count", "severity": "critical",
                          "message": f"เนื้อหา {our_wc} คำ น้อยกว่า avg คู่แข่ง {avg_wc} คำ (ขาด {diff} คำ)"})
        elif avg_wc > 0 and our_wc < avg_wc:
            diff = avg_wc - our_wc
            issues.append({"type": "word_count", "severity": "warning",
                          "message": f"เนื้อหา {our_wc} คำ ต่ำกว่า avg คู่แข่ง {avg_wc} คำ เล็กน้อย (ขาด {diff} คำ)"})

        # H1
        if not h1:
            issues.append({"type": "h1", "severity": "critical", "message": "ไม่มี H1"})
        elif keywords and not any(kw.lower() in h1.lower() for kw in keywords):
            issues.append({"type": "h1", "severity": "warning",
                          "message": f"H1 '{h1}' ไม่มี keyword หลัก"})

        # Meta description
        if not meta:
            issues.append({"type": "meta", "severity": "critical", "message": "ไม่มี meta description"})
        elif len(meta) < 100:
            issues.append({"type": "meta", "severity": "warning",
                          "message": f"meta description สั้นเกินไป ({len(meta)} ตัวอักษร ควร 120-160)"})

        # H2 count
        if h2_count < 3:
            issues.append({"type": "h2_count", "severity": "warning",
                          "message": f"มี H2 แค่ {h2_count} หัวข้อ ควรมีอย่างน้อย 5+"})

        return issues

    def _calc_score(self, issues: list[dict]) -> int:
        """คำนวณ audit score (100 = perfect)"""
        score = 100
        for issue in issues:
            if issue["severity"] == "critical":
                score -= 25
            elif issue["severity"] == "warning":
                score -= 10
        return max(0, score)

    async def _get_recommendations(self, our_page: dict, serp_snapshots: dict, issues: list[dict], keywords: list[str]) -> list[str]:
        """LLM สรุป recommendations"""
        issues_text = "\n".join(f"- [{i['severity']}] {i['message']}" for i in issues)
        serp_text = ""
        for kw, data in serp_snapshots.items():
            serp_text += f"\nKeyword: {kw} (อันดับเรา: {data.get('our_position', 0) or 'ไม่ติดอันดับ'})\n"
            for r in data.get("results", [])[:3]:
                serp_text += f"  #{r.get('position', '?')} {r.get('url', '')} ({r.get('word_count', 0)} words)\n"

        prompt = f"""วิเคราะห์หน้าเว็บนี้และให้คำแนะนำ SEO:

หน้าเรา:
- Word Count: {our_page.get('word_count', 0)}
- H1: {our_page.get('h1', 'ไม่มี')}
- Meta: {our_page.get('meta_description', 'ไม่มี')[:100]}
- H2s: {', '.join(our_page.get('h2s', [])[:5])}

ปัญหาที่พบ:
{issues_text}

คู่แข่ง Top 3:
{serp_text}

ให้คำแนะนำ 3-5 ข้อ สั้นกระชับ เน้น action ที่ทำได้ทันที
ตอบเป็น JSON array: ["คำแนะนำ 1", "คำแนะนำ 2", ...]"""

        try:
            response = await self.llm.generate(prompt, temperature=0.3)
            cleaned = re.sub(r"```json?\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            result = json.loads(cleaned.strip())
            if isinstance(result, list):
                return result[:5]
        except Exception:
            pass

        # Fallback
        return [i["message"] for i in issues[:5]]
