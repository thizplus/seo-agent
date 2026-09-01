from domain.ports.serp_port import SERPPort
from services.serp_analyzer import SERPAnalyzer


class GoogleSERPAdapter(SERPPort):
    """Google scraping implementation ของ SERPPort"""

    def __init__(self):
        self._analyzer = SERPAnalyzer()

    async def analyze(self, keyword: str) -> dict:
        return await self._analyzer.analyze(keyword)
