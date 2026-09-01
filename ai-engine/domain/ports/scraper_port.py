from abc import ABC, abstractmethod


class ScraperPort(ABC):
    """Port สำหรับ web crawler — BS4, Playwright, etc."""

    @abstractmethod
    async def crawl(self, url: str, max_pages: int = 50) -> dict:
        """Crawl เว็บแล้ว return pages data

        Returns:
            {"pages": [...], "sitemap_urls": [...], "total_pages": int}
        """
        ...
