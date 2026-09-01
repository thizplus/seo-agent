import os
from pathlib import Path


class SkillLoader:
    """โหลด marketing skills จากโฟลเดอร์ skills/"""

    def __init__(self, skills_dir: str = "skills/"):
        self.skills_dir = Path(skills_dir)
        self._cache: dict[str, str] = {}

    def load(self, skill_name: str) -> str:
        """โหลด skill .md file แล้ว cache ไว้"""
        if skill_name not in self._cache:
            path = self.skills_dir / f"{skill_name}.md"
            if path.exists():
                self._cache[skill_name] = path.read_text(encoding="utf-8")
            else:
                self._cache[skill_name] = ""
        return self._cache[skill_name]

    def load_many(self, skill_names: list[str]) -> str:
        """โหลดหลาย skills รวมเป็น context เดียว"""
        parts = []
        for name in skill_names:
            content = self.load(name)
            if content:
                parts.append(f"## Skill: {name}\n{content}")
        return "\n\n---\n\n".join(parts)

    def list_skills(self) -> list[str]:
        """แสดง skills ทั้งหมดที่มี"""
        if not self.skills_dir.exists():
            return []
        return [f.stem for f in self.skills_dir.glob("*.md")]


class SkillRouter:
    """เลือก skill อัตโนมัติตาม task type"""

    SKILL_MAP = {
        "site_analysis": ["product-marketing-context"],
        "seo_audit": ["seo-audit", "schema-markup"],
        "competitor_analysis": ["competitor-profiling"],
        "topic_suggestion": ["programmatic-seo", "competitor-profiling"],
        "article_writing": ["copywriting", "seo-audit"],
        "cro_analysis": ["page-cro", "signup-flow"],
        "internal_linking": ["site-architecture"],
    }

    def __init__(self, skill_loader: SkillLoader):
        self.loader = skill_loader

    def get_context(self, task_type: str) -> str:
        """โหลดเฉพาะ skills ที่จำเป็น"""
        skill_names = self.SKILL_MAP.get(task_type, [])
        return self.loader.load_many(skill_names)
