from ddgs import DDGS

from domain.ports.image_search_port import ImageSearchPort


class GoogleImageSearchAdapter(ImageSearchPort):
    """DuckDuckGo image search via ddgs library — ฟรี ไม่ต้อง API key"""

    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        try:
            raw = DDGS().images(query, max_results=count)

            results = []
            for item in raw:
                url = item.get("image", "")
                if not url:
                    continue

                results.append({
                    "url": url,
                    "thumb_url": item.get("thumbnail", url),
                    "width": item.get("width", 0),
                    "height": item.get("height", 0),
                    "source": "duckduckgo",
                    "photographer": item.get("source", ""),
                    "source_url": item.get("url", ""),
                })

            return results
        except Exception:
            return []
