import httpx

from domain.ports.image_search_port import ImageSearchPort


class UnsplashAdapter(ImageSearchPort):
    """Unsplash API — รูปฟรี ใช้ได้เชิงพาณิชย์"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.unsplash.com"

    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/search/photos",
                params={"query": query, "per_page": count, "orientation": orientation},
                headers={"Authorization": f"Client-ID {self.api_key}"},
            )

            if resp.status_code != 200:
                return []

            data = resp.json()
            results = []
            for photo in data.get("results", []):
                results.append({
                    "url": photo["urls"]["regular"],
                    "thumb_url": photo["urls"]["small"],
                    "width": photo["width"],
                    "height": photo["height"],
                    "source": "unsplash",
                    "photographer": photo.get("user", {}).get("name", ""),
                    "source_url": photo.get("links", {}).get("html", ""),
                })

            return results
