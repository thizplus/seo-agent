import json
import re

from domain.ports.llm_port import LLMPort
from domain.ports.scraper_port import ScraperPort
from domain.ports.serp_port import SERPPort
from services.skill_loader import SkillLoader, SkillRouter


class SiteAnalyzer:
    """วิเคราะห์เว็บไซต์ด้วย LLM + Marketing Skills"""

    def __init__(self, llm: LLMPort, skill_loader: SkillLoader, scraper: ScraperPort, serp: SERPPort = None):
        self.llm = llm
        self.skill_router = SkillRouter(skill_loader)
        self.scraper = scraper
        self.serp = serp

    async def analyze(self, url: str, site_name: str = "") -> dict:
        crawl_data = await self.scraper.crawl(url, max_pages=50)

        context_skill = self.skill_router.get_context("site_analysis")
        seo_skill = self.skill_router.get_context("seo_audit")
        pages_summary = self._summarize_pages(crawl_data["pages"])

        system_prompt = f"""คุณคือ SEO & Marketing Strategist ระดับมืออาชีพ
วิเคราะห์เว็บไซต์อย่างละเอียด ตอบเป็นภาษาไทย

{f"## Marketing Knowledge{chr(10)}{context_skill}" if context_skill else ""}
{f"## SEO Audit Knowledge{chr(10)}{seo_skill}" if seo_skill else ""}"""

        prompt = f"""วิเคราะห์เว็บไซต์ "{site_name}" ({url})

## ข้อมูลจาก Crawl ({crawl_data['total_pages']} pages)
{pages_summary}

## วิเคราะห์และตอบเป็น JSON:
{{
  "businessType": "ecommerce | service | blog | corporate | other",
  "industry": "ชื่ออุตสาหกรรม",
  "brandVoice": "อธิบาย tone & voice ของแบรนด์ 2-3 ประโยค",
  "targetPersona": {{"age": "ช่วงอายุ", "gender": "เพศ", "painPoints": ["..."], "goals": ["..."]}},
  "seoScore": {{"technical": 1-10, "content": 1-10, "onpage": 1-10}},
  "recommendations": [{{"category": "technical|content|onpage|offpage", "priority": "high|medium|low", "title": "...", "description": "..."}}]
}}"""

        response = await self.llm.generate(prompt, system_prompt, temperature=0.5)
        result = self._parse_response(response)

        result["crawlSummary"] = {
            "totalPages": crawl_data["total_pages"],
            "sitemapUrls": len(crawl_data["sitemap_urls"]),
            "pageTypes": self._count_page_types(crawl_data["pages"]),
        }

        # LLM เลือก seed keywords — หน้าละ 1-3 คำ
        result["suggestedSeeds"] = await self._extract_seeds_with_llm(crawl_data)

        # Auto-discover competitors จาก SERP
        if self.serp and result["suggestedSeeds"]:
            result["competitors"] = await self._discover_competitors(result["suggestedSeeds"][:3], url)

        return result

    async def extract_page_keywords(self, crawl_data: dict) -> list[dict]:
        """ให้ LLM เลือก SEO keyword ต่อ page (1-3 คำ/page) พร้อมผูก URL

        Returns: [{"url": "...", "keywords": ["kw1", "kw2"]}]
        """
        page_entries = []
        for page in crawl_data.get("pages", []):
            ptype = page.get("page_type", "other")
            if ptype in ("contact", "about"):
                continue
            h1 = page.get("h1", "")
            title = page.get("title", "")
            h2s = page.get("h2s", [])[:5]
            meta = page.get("meta_description", "")
            if not h1 and not title:
                continue
            page_entries.append(
                f"[{ptype}] URL: {page['url']}\n"
                f"  Title: {title}\n"
                f"  H1: {h1}\n"
                f"  H2s: {', '.join(h2s)}\n"
                f"  Meta: {meta[:100]}"
            )

        if not page_entries:
            return []

        prompt = f"""จากข้อมูลเว็บไซต์ที่ crawl มา ให้เลือก SEO keyword ที่ดีที่สุดสำหรับแต่ละหน้า

กฎ:
- แต่ละหน้า product/service เลือก 1-3 keywords
- keyword ต้องเป็นคำที่คนค้นหาใน Google จริงๆ
- ไม่เอาชื่อแบรนด์ ไม่เอาคำกว้างเกินไป
- เน้น keyword ภาษาไทยที่มี search volume
- ต้องผูกกับ URL ของหน้านั้น
- ให้ระบุ intent (transactional/commercial/informational) และ score (1-10) ด้วย
  - score สูง = keyword ที่มีโอกาส rank สูง + เกี่ยวข้องกับธุรกิจ + มี search volume

## ข้อมูลหน้าเว็บ ({len(page_entries)} หน้า)
{chr(10).join(page_entries[:20])}

## ตอบเป็น JSON array:
[{{"url": "https://...", "keywords": [{{"keyword": "...", "intent": "transactional|commercial|informational", "score": 1-10}}]}}]"""

        try:
            response = await self.llm.generate(prompt, temperature=0.3)
            cleaned = re.sub(r"```json\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            result = json.loads(cleaned.strip())
            if isinstance(result, list):
                return result
        except Exception:
            pass

        # Fallback
        fallback = []
        for page in crawl_data.get("pages", []):
            if page.get("page_type") in ("product", "service") and page.get("h1"):
                fallback.append({"url": page["url"], "keywords": [page["h1"]]})
        return fallback

    async def _extract_seeds_with_llm(self, crawl_data: dict) -> list[str]:
        """ดึง flat seeds list (backward compatible)"""
        page_keywords = await self.extract_page_keywords(crawl_data)
        seeds = []
        seen = set()
        for pk in page_keywords:
            for kw in pk.get("keywords", []):
                if isinstance(kw, str) and kw.lower() not in seen:
                    seen.add(kw.lower())
                    seeds.append(kw)
        return seeds[:20]

    def _extract_seeds_basic(self, crawl_data: dict) -> list[str]:
        """Fallback: ดึง H1 จาก product/service pages"""
        SKIP = {"หน้าแรก", "home", "ติดต่อ", "contact", "เกี่ยวกับ", "about", "บทความ", "blog"}
        seeds = []
        seen = set()
        for page in crawl_data.get("pages", []):
            if page.get("page_type") not in ("product", "service"):
                continue
            h1 = (page.get("h1") or "").strip()
            if h1 and len(h1) >= 4 and h1.lower() not in seen and not any(w in h1.lower() for w in SKIP):
                seen.add(h1.lower())
                seeds.append(h1)
        return seeds[:15]

    async def _discover_competitors(self, seeds: list[str], own_url: str) -> list[str]:
        """ค้นหาคู่แข่งอัตโนมัติจาก SERP top 10"""
        from urllib.parse import urlparse
        own_domain = urlparse(own_url).netloc.replace("www.", "")
        competitor_domains = {}

        for seed in seeds:
            try:
                serp_data = await self.serp.analyze(seed)
                for result in serp_data.get("results", []):
                    url = result.get("url", "")
                    if not url:
                        continue
                    domain = urlparse(url).netloc.replace("www.", "")
                    # ข้ามเว็บตัวเอง + เว็บใหญ่ (marketplace, social)
                    if domain == own_domain:
                        continue
                    if any(skip in domain for skip in ["facebook", "youtube", "tiktok", "shopee", "lazada", "pantip", "wikipedia"]):
                        continue
                    competitor_domains[domain] = competitor_domains.get(domain, 0) + 1
            except Exception:
                continue

        # เรียงตามจำนวนครั้งที่เจอ → top 5
        sorted_competitors = sorted(competitor_domains.items(), key=lambda x: x[1], reverse=True)
        return [f"https://{domain}" for domain, _ in sorted_competitors[:5]]

    def _summarize_pages(self, pages: list[dict]) -> str:
        if not pages:
            return "ไม่พบหน้าเว็บ"
        lines = []
        for p in pages[:20]:
            lines.append(f"- [{p['page_type']}] {p['title']} ({p['word_count']} words)")
            if p.get("meta_description"):
                lines.append(f"  meta: {p['meta_description'][:100]}")
            if p.get("h2s"):
                lines.append(f"  h2s: {', '.join(p['h2s'][:5])}")
        return "\n".join(lines)

    def _count_page_types(self, pages: list[dict]) -> dict:
        counts = {}
        for p in pages:
            t = p.get("page_type", "other")
            counts[t] = counts.get(t, 0) + 1
        return counts

    def _parse_response(self, response: str) -> dict:
        try:
            cleaned = re.sub(r"```json\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {
                "businessType": "other", "industry": "", "brandVoice": response[:500],
                "targetPersona": {}, "seoScore": {"technical": 5, "content": 5, "onpage": 5},
                "recommendations": [],
            }
