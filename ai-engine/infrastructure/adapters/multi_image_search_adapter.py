from domain.ports.image_search_port import ImageSearchPort


class MultiImageSearchAdapter(ImageSearchPort):
    """ค้นหาจากหลายแหล่งพร้อมกัน แล้วรวมผลลัพธ์"""

    def __init__(self, adapters: list[ImageSearchPort]):
        self.adapters = adapters

    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        all_results = []

        for adapter in self.adapters:
            try:
                results = await adapter.search(query, count=count, orientation=orientation)
                all_results.extend(results)
            except Exception:
                continue

        return all_results[:count * 2]  # return มากกว่าที่ขอ ให้เลือก
