from domain.ports.scraper_port import ScraperPort
from services.crawler import Crawler


class BS4CrawlerAdapter(ScraperPort):
    """BeautifulSoup4 implementation ของ ScraperPort"""

    def __init__(self):
        self._crawler = Crawler()

    async def crawl(self, url: str, max_pages: int = 50) -> dict:
        return await self._crawler.crawl(url, max_pages)
