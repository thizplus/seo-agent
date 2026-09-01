from typing import Optional

from domain.ports.llm_port import LLMPort
from domain.ports.serp_port import SERPPort
from services.article_writer import ArticleWriter
from services.skill_loader import SkillLoader


class RankingOptimizer:
    """Feedback loop: ดึง metrics → ตัดสินใจ → ปรับปรุง content"""

    def __init__(self, skill_loader: SkillLoader, serp: SERPPort):
        self.skill_loader = skill_loader
        self.serp = serp

    def decide(self, metrics: dict) -> Optional[str]:
        if metrics["impressions"] < 50:
            return None
        if not metrics.get("indexed", True):
            return "fix_index"
        if metrics["ctr"] < 0.02:
            return "rewrite_title"
        if 5 < metrics["position"] <= 15:
            return "expand_content"
        if metrics["position"] > 15:
            return "add_internal_links"
        return None

    async def execute(self, action: str, article: dict, llm: LLMPort) -> dict:
        """Execute optimization action

        Args:
            action: rewrite_title | expand_content
            article: {title, content, keyword}
            llm: LLM provider (injected — ไม่สร้างเอง)
        """
        writer = ArticleWriter(llm, self.skill_loader, self.serp)

        result = {"action": action, "before": {}, "after": {}, "changes": []}

        if action == "rewrite_title":
            old_title = article.get("title", "")
            new_title = await writer.rewrite_title(old_title, article.get("keyword", ""))
            result["before"] = {"title": old_title}
            result["after"] = {"title": new_title}
            result["changes"] = ["title"]

        elif action == "expand_content":
            old_content = article.get("content", "")
            new_content = await writer.expand_article(old_content, article.get("keyword", ""))
            result["before"] = {"wordCount": len(old_content.split())}
            result["after"] = {"content": new_content, "wordCount": len(new_content.split())}
            result["changes"] = ["content"]

        elif action == "add_internal_links":
            result["changes"] = ["suggested_links"]
            result["after"] = {"suggestion": "Add internal links to related articles"}

        elif action == "fix_index":
            result["changes"] = ["resubmit"]
            result["after"] = {"suggestion": "Resubmit URL to Google Search Console"}

        return result
