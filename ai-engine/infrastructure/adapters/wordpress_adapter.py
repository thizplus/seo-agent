import httpx

from domain.ports.cms_port import CMSPort
from services.content_formatter import GutenbergFormatter


class WordPressAdapter(CMSPort):
    """WordPress REST API — auto แปลง Markdown → Gutenberg blocks"""

    def __init__(self, wp_url: str, wp_username: str, wp_app_password: str):
        self.wp_url = wp_url.rstrip("/")
        self.wp_username = wp_username
        self.wp_app_password = wp_app_password
        self.formatter = GutenbergFormatter()

    async def publish(
        self, title: str, content: str, slug: str, meta_description: str, status: str = "publish"
    ) -> dict:
        # แปลง Markdown → Gutenberg blocks
        gutenberg_content = self.formatter.format(content)

        endpoint = f"{self.wp_url}/wp-json/wp/v2/posts"
        post_data = {
            "title": title,
            "content": gutenberg_content,
            "slug": slug,
            "status": status,
            "excerpt": meta_description,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                endpoint, json=post_data,
                auth=(self.wp_username, self.wp_app_password),
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code not in (200, 201):
                raise Exception(f"WordPress API error {resp.status_code}: {resp.text[:500]}")

            data = resp.json()
            return {
                "publishedUrl": data.get("link", ""),
                "cmsPostId": str(data.get("id", "")),
            }

    async def update(
        self, post_id: str, title: str, content: str, slug: str, meta_description: str
    ) -> dict:
        gutenberg_content = self.formatter.format(content)

        endpoint = f"{self.wp_url}/wp-json/wp/v2/posts/{post_id}"
        post_data = {
            "title": title,
            "content": gutenberg_content,
            "slug": slug,
            "excerpt": meta_description,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                endpoint, json=post_data,
                auth=(self.wp_username, self.wp_app_password),
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code != 200:
                raise Exception(f"WordPress API error {resp.status_code}: {resp.text[:500]}")

            data = resp.json()
            return {
                "publishedUrl": data.get("link", ""),
                "cmsPostId": str(data.get("id", "")),
            }
