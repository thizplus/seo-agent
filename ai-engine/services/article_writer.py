import json
import re

from domain.ports.llm_port import LLMPort
from domain.ports.serp_port import SERPPort
from services.skill_loader import SkillLoader, SkillRouter


class ArticleWriter:
    """สร้างบทความ SEO ที่เน้น EEAT"""

    def __init__(self, llm: LLMPort, skill_loader: SkillLoader, serp: SERPPort):
        self.llm = llm
        self.skill_router = SkillRouter(skill_loader)
        self.serp = serp

    async def generate(
        self,
        keyword: str,
        site_url: str = "",
        site_name: str = "",
        brand_voice: str = "",
        industry: str = "",
        secondary_keywords: list[str] = None,
        pillar_url: str = "",
    ) -> dict:
        serp_data = await self.serp.analyze(keyword)
        skill_context = self.skill_router.get_context("article_writing")
        target_words = max(serp_data["avg_word_count"] + 500, 2000)

        system_prompt = f"""คุณคือ SEO Content Expert ระดับมืออาชีพ เชี่ยวชาญด้าน EEAT
เขียนเป็นภาษาไทย ใช้ข้อมูลจริง อ้างอิงแหล่งที่มา

{f"## Marketing Knowledge{chr(10)}{skill_context}" if skill_context else ""}

{f"## Brand Voice{chr(10)}{brand_voice}" if brand_voice else ""}"""

        # สร้างส่วน secondary keywords + pillar URL
        secondary_section = ""
        if secondary_keywords:
            kw_list = ', '.join(secondary_keywords)
            secondary_section = f"""
## Keywords รอง (ต้องใช้เป็น H2/H3 ในบทความ)
{kw_list}
- ใช้ keyword รองเหล่านี้เป็นหัวข้อ H2 หรือ H3 ในบทความอย่างน้อย 1 ครั้งต่อ keyword
- กระจาย keyword รองในเนื้อหาอย่างเป็นธรรมชาติ"""

        pillar_section = ""
        if pillar_url:
            pillar_section = f"""
## Internal Linking
- ใส่ internal link กลับไปยังหน้าหลัก: {pillar_url}
- ใช้ anchor text ที่เกี่ยวข้องกับ keyword หลัก "{keyword}"
- ใส่ลิงก์อย่างน้อย 1-2 จุดในเนื้อหา"""

        article_prompt = f"""เขียนบทความ SEO สำหรับ keyword: "{keyword}"

## ข้อมูลเว็บไซต์
- เว็บ: {site_name} ({site_url})
- อุตสาหกรรม: {industry}

## ข้อมูลคู่แข่ง (SERP Top 10)
- จำนวนคำเฉลี่ย: {serp_data['avg_word_count']} คำ
- Search Intent: {serp_data.get('intent', 'informational')}
- Headings ที่พบบ่อย: {', '.join(serp_data.get('common_headings', [])[:10]) or 'N/A'}
- คู่แข่ง Top 5: {', '.join(r.get('title','')[:30] for r in serp_data.get('results', [])[:5]) or 'N/A'}
{secondary_section}
{pillar_section}

## Requirements
1. เขียน {target_words}+ คำ (ต้องมากกว่าคู่แข่ง)
2. โครงสร้าง H1 → H2 → H3 ชัดเจน
3. เน้น EEAT: Experience, Expertise, Authority, Trust
4. มี FAQ section (3-5 คำถาม)
5. มี meta description (150-160 ตัวอักษร)
6. keyword หลักอยู่ใน H1, H2 แรก, ย่อหน้าแรก
7. เขียนเป็น Markdown format

## Output Format (JSON)
ตอบเป็น JSON เท่านั้น:
{{
  "title": "หัวข้อบทความ (มี keyword)",
  "slug": "slug-ภาษาอังกฤษ",
  "content": "เนื้อหาบทความใน Markdown",
  "metaDescription": "meta description 150-160 ตัวอักษร",
  "wordCount": จำนวนคำ,
  "eeatScore": {{"experience": 1-10, "expertise": 1-10, "authority": 1-10, "trust": 1-10}},
  "schemaMarkup": {{"@context": "https://schema.org", "@type": "Article", "headline": "...", "description": "..."}}
}}"""

        response = await self.llm.generate(article_prompt, system_prompt, temperature=0.7)
        return self._parse_response(response, keyword)

    async def rewrite_title(self, title: str, keyword: str) -> str:
        prompt = f"""Rewrite SEO title ให้น่าคลิกขึ้น (CTR สูงขึ้น):

Title ปัจจุบัน: {title}
Keyword: {keyword}

Requirements:
- ภาษาไทย
- ไม่เกิน 60 ตัวอักษร
- มี keyword
- กระตุ้นให้คลิก (ใช้ตัวเลข, คำถาม, power words)

ตอบแค่ title ใหม่ 1 บรรทัด ไม่ต้องอธิบาย"""

        return (await self.llm.generate(prompt, temperature=0.8)).strip()

    async def expand_article(self, content: str, keyword: str) -> str:
        prompt = f"""ปรับปรุงบทความนี้ให้ดีขึ้นเพื่อขึ้นอันดับ:

Keyword: {keyword}

บทความปัจจุบัน:
{content[:8000]}

สิ่งที่ต้องเพิ่ม:
1. เพิ่มเนื้อหาเชิงลึก + ตัวอย่างจริง
2. เพิ่ม FAQ ใหม่ 2-3 ข้อ
3. เพิ่มสถิติ/ข้อมูลอ้างอิง
4. ปรับ heading structure ให้ดีขึ้น
5. เพิ่ม EEAT signals

ตอบเป็นบทความ Markdown เต็ม"""

        return await self.llm.generate(prompt, temperature=0.7)

    def _parse_response(self, response: str, keyword: str) -> dict:
        # Step 1: ลบ markdown code block wrapper
        cleaned = response.strip()
        bt3 = chr(96) * 3  # ``` (backticks)
        if cleaned.startswith(bt3):
            # ลบ ```json หรือ ``` ที่ขึ้นต้น
            first_newline = cleaned.find("\n")
            if first_newline > 0:
                cleaned = cleaned[first_newline + 1:]
            # ลบ ``` ที่ลงท้าย
            if cleaned.rstrip().endswith(bt3):
                cleaned = cleaned.rstrip()[:-3]
        cleaned = cleaned.strip()

        # Step 2: ลอง parse JSON
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict) and "content" in data:
                return data
        except json.JSONDecodeError:
            pass

        # Step 3: หา JSON object ใน response (อาจมี text อื่นครอบ)
        match = re.search(r"\{", cleaned)
        if match:
            # หา matching closing brace
            depth = 0
            start = match.start()
            for i in range(start, len(cleaned)):
                if cleaned[i] == "{":
                    depth += 1
                elif cleaned[i] == "}":
                    depth -= 1
                    if depth == 0:
                        json_str = cleaned[start:i+1]
                        try:
                            data = json.loads(json_str)
                            if isinstance(data, dict) and "content" in data:
                                return data
                        except json.JSONDecodeError:
                            break

        # Step 4: Regex ดึง fields ทีละตัว (สำหรับ JSON ที่ content มี newlines เยอะ)
        title = self._extract_field(cleaned, "title") or keyword
        slug = self._extract_field(cleaned, "slug") or keyword.lower().replace(" ", "-")
        meta = self._extract_field(cleaned, "metaDescription") or keyword

        # ดึง content (field ที่ยาวที่สุด — มักเป็น markdown)
        content_match = re.search(r'"content"\s*:\s*"', cleaned)
        if content_match:
            start = content_match.end()
            # หา closing quote ที่ไม่ใช่ escaped
            i = start
            content_chars = []
            while i < len(cleaned):
                if cleaned[i] == "\\" and i + 1 < len(cleaned):
                    if cleaned[i+1] == "n":
                        content_chars.append("\n")
                    elif cleaned[i+1] == '"':
                        content_chars.append('"')
                    elif cleaned[i+1] == "\\":
                        content_chars.append("\\")
                    else:
                        content_chars.append(cleaned[i:i+2])
                    i += 2
                elif cleaned[i] == '"':
                    break
                else:
                    content_chars.append(cleaned[i])
                    i += 1
            content = "".join(content_chars)
            if len(content) > 100:
                return {
                    "title": title, "slug": slug, "content": content,
                    "metaDescription": meta, "wordCount": len(content.split()),
                    "eeatScore": {"experience": 5, "expertise": 5, "authority": 5, "trust": 5},
                    "schemaMarkup": {},
                }

        # Step 5: ใช้ response ตรงๆ เป็น content (ไม่ใช่ JSON เลย)
        return {
            "title": keyword, "slug": keyword.lower().replace(" ", "-"),
            "content": response, "metaDescription": keyword,
            "wordCount": len(response.split()),
            "eeatScore": {"experience": 5, "expertise": 5, "authority": 5, "trust": 5},
            "schemaMarkup": {},
        }

    def _extract_field(self, text: str, field: str) -> str:
        match = re.search(rf'"{field}"\s*:\s*"([^"]*)"', text)
        return match.group(1) if match else ""
