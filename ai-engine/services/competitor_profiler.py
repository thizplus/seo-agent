import json
import re

from domain.ports.llm_port import LLMPort
from domain.ports.scraper_port import ScraperPort
from services.skill_loader import SkillLoader, SkillRouter


class CompetitorProfiler:
    """วิเคราะห์คู่แข่งด้วย Crawl + LLM"""

    def __init__(self, llm: LLMPort, skill_loader: SkillLoader, scraper: ScraperPort):
        self.llm = llm
        self.skill_router = SkillRouter(skill_loader)
        self.scraper = scraper

    async def analyze(self, competitor_url: str, site_url: str = "") -> dict:
        crawl_data = await self.scraper.crawl(competitor_url, max_pages=20)
        skill_context = self.skill_router.get_context("competitor_analysis")

        pages_info = []
        for p in crawl_data["pages"][:15]:
            pages_info.append(f"- [{p['page_type']}] {p['title']} ({p['word_count']} words)")
            if p.get("h2s"):
                pages_info.append(f"  topics: {', '.join(p['h2s'][:3])}")

        prompt = f"""วิเคราะห์เว็บคู่แข่ง: {competitor_url}
เทียบกับเว็บเรา: {site_url}

{f"## Competitor Analysis Knowledge{chr(10)}{skill_context}" if skill_context else ""}

## ข้อมูลจาก Crawl ({crawl_data['total_pages']} pages)
{chr(10).join(pages_info)}

## ตอบเป็น JSON:
{{
  "url": "{competitor_url}",
  "summary": "สรุป 2-3 ประโยค",
  "strengths": ["จุดแข็ง 1", "จุดแข็ง 2"],
  "weaknesses": ["จุดอ่อน 1", "จุดอ่อน 2"],
  "contentGaps": [{{"keyword": "...", "opportunity": "..."}}],
  "topPages": [{{"url": "...", "title": "...", "wordCount": 0}}],
  "recommendations": ["คำแนะนำ 1", "คำแนะนำ 2"]
}}"""

        response = await self.llm.generate(prompt, temperature=0.5)
        try:
            cleaned = re.sub(r"```json\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {"url": competitor_url, "summary": response[:500], "strengths": [], "weaknesses": [], "contentGaps": [], "topPages": [], "recommendations": []}
