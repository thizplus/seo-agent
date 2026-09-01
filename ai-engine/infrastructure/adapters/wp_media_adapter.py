import httpx

from domain.ports.image_storage_port import ImageStoragePort


class WordPressMediaAdapter(ImageStoragePort):
    """WordPress Media Library implementation ของ ImageStoragePort"""

    def __init__(self, wp_url: str, wp_username: str, wp_app_password: str):
        self.wp_url = wp_url.rstrip("/")
        self.wp_username = wp_username
        self.wp_app_password = wp_app_password

    async def upload(self, image_bytes: bytes, filename: str, alt_text: str = "") -> str:
        endpoint = f"{self.wp_url}/wp-json/wp/v2/media"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                endpoint,
                content=image_bytes,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Type": "image/webp" if filename.endswith(".webp") else "image/png",
                },
                auth=(self.wp_username, self.wp_app_password),
            )

            if resp.status_code not in (200, 201):
                raise Exception(f"WordPress Media upload error {resp.status_code}: {resp.text[:300]}")

            data = resp.json()
            media_id = data.get("id")

            # อัพเดท alt text
            if alt_text and media_id:
                await client.post(
                    f"{endpoint}/{media_id}",
                    json={"alt_text": alt_text},
                    auth=(self.wp_username, self.wp_app_password),
                )

            return data.get("source_url", "")

    async def delete(self, image_url: str) -> bool:
        """ลบ media จาก WordPress โดยหาจาก URL"""
        try:
            filename = image_url.split("/")[-1].replace(".webp", "")
            async with httpx.AsyncClient(timeout=15) as client:
                # หา media ID จาก filename
                resp = await client.get(
                    f"{self.wp_url}/wp-json/wp/v2/media",
                    params={"search": filename},
                    auth=(self.wp_username, self.wp_app_password),
                )
                if resp.status_code != 200 or not resp.json():
                    return False

                media_id = resp.json()[0]["id"]

                # ลบ media (force=true เพื่อลบถาวร)
                del_resp = await client.delete(
                    f"{self.wp_url}/wp-json/wp/v2/media/{media_id}",
                    params={"force": "true"},
                    auth=(self.wp_username, self.wp_app_password),
                )
                return del_resp.status_code == 200
        except Exception:
            return False
