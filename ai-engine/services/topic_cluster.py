import json
import re

from domain.ports.llm_port import LLMPort
from services.skill_loader import SkillLoader, SkillRouter


class TopicClusterService:
    """จัดกลุ่ม keywords เป็น Topic Cluster ด้วย LLM"""

    def __init__(self, llm: LLMPort, skill_loader: SkillLoader):
        self.llm = llm
        self.skill_router = SkillRouter(skill_loader)

    async def create_cluster(self, keywords: list[str], site_url: str = "") -> dict:
        skill_context = self.skill_router.get_context("internal_linking")

        prompt = f"""จัดกลุ่ม keywords เหล่านี้เป็น Topic Cluster:

Keywords: {json.dumps(keywords, ensure_ascii=False)}
Site: {site_url}

{f"## Site Architecture Knowledge{chr(10)}{skill_context}" if skill_context else ""}

## ตอบเป็น JSON:
{{
  "pillarKeyword": "keyword หลัก",
  "pillarTitle": "หัวข้อบทความ pillar",
  "supportingKeywords": [{{"keyword": "...", "title": "...", "relationship": "..."}}],
  "linkMap": [{{"from": "...", "to": "...", "anchorText": "..."}}]
}}"""

        response = await self.llm.generate(prompt, temperature=0.5)
        try:
            cleaned = re.sub(r"```json\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {
                "pillarKeyword": keywords[0] if keywords else "",
                "pillarTitle": keywords[0] if keywords else "",
                "supportingKeywords": [{"keyword": kw, "title": kw, "relationship": "related"} for kw in keywords[1:]],
                "linkMap": [],
            }
