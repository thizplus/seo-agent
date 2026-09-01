from abc import ABC, abstractmethod


class SERPPort(ABC):
    """Port สำหรับ SERP analysis — Google scraping, SerpAPI, etc."""

    @abstractmethod
    async def analyze(self, keyword: str) -> dict:
        """วิเคราะห์ SERP top 10

        Returns:
            {"avg_word_count", "common_headings", "intent", "competition_count", ...}
        """
        ...
