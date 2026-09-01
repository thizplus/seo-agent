import httpx

from domain.ports.image_search_port import ImageSearchPort


class PexelsAdapter(ImageSearchPort):
    """Pexels API — รูปฟรี ใช้ได้เชิงพาณิชย์"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.pexels.com/v1"

    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/search",
                params={"query": query, "per_page": count, "orientation": orientation},
                headers={"Authorization": self.api_key},
            )

            if resp.status_code != 200:
                return []

            data = resp.json()
            results = []
            for photo in data.get("photos", []):
                results.append({
                    "url": photo["src"]["large2x"],       # รูปใหญ่
                    "thumb_url": photo["src"]["medium"],   # thumbnail
                    "width": photo["width"],
                    "height": photo["height"],
                    "source": "pexels",
                    "photographer": photo.get("photographer", ""),
                    "source_url": photo.get("url", ""),
                })

            return results
