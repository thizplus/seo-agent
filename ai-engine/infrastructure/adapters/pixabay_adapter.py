import httpx

from domain.ports.image_search_port import ImageSearchPort


class PixabayAdapter(ImageSearchPort):
    """Pixabay API — รูปฟรี ใช้ได้เชิงพาณิชย์ ไม่ต้อง credit"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://pixabay.com/api"

    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        # Pixabay ใช้ "horizontal" แทน "landscape"
        orient_map = {"landscape": "horizontal", "portrait": "vertical", "square": "all"}

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                self.base_url,
                params={
                    "key": self.api_key,
                    "q": query,
                    "per_page": count,
                    "orientation": orient_map.get(orientation, "horizontal"),
                    "image_type": "photo",
                    "safesearch": "true",
                },
            )

            if resp.status_code != 200:
                return []

            data = resp.json()
            results = []
            for photo in data.get("hits", []):
                results.append({
                    "url": photo.get("largeImageURL", ""),
                    "thumb_url": photo.get("webformatURL", ""),
                    "width": photo.get("imageWidth", 0),
                    "height": photo.get("imageHeight", 0),
                    "source": "pixabay",
                    "photographer": photo.get("user", ""),
                    "source_url": photo.get("pageURL", ""),
                })

            return results
