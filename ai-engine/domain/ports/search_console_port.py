from abc import ABC, abstractmethod


class SearchConsolePort(ABC):
    """Port สำหรับ Search Console — Google GSC, Bing Webmaster, etc."""

    @abstractmethod
    def get_page_metrics(self, page_url: str, days: int = 28) -> dict:
        """ดึง metrics สำหรับ URL

        Returns:
            {"clicks", "impressions", "ctr", "position", "indexed", "queries": [...]}
        """
        ...
