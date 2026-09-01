import httpx
from typing import Optional


class CMSPublisher:
    """Publish บทความไป WordPress ผ่าน REST API"""

    async def publish(
        self,
        title: str,
        content: str,
        slug: str,
        meta_description: str,
        wp_url: str,
        wp_username: str,
        wp_app_password: str,
    ) -> dict:
        """สร้าง post ใหม่บน WordPress

        Returns:
            dict with publishedUrl and cmsPostId
        """
        endpoint = f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts"

        post_data = {
            "title": title,
            "content": content,
            "slug": slug,
            "status": "publish",
            "excerpt": meta_description,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                endpoint,
                json=post_data,
                auth=(wp_username, wp_app_password),
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code not in (200, 201):
                raise Exception(
                    f"WordPress API error {resp.status_code}: {resp.text[:500]}"
                )

            data = resp.json()
            return {
                "publishedUrl": data.get("link", ""),
                "cmsPostId": str(data.get("id", "")),
            }

    async def update(
        self,
        cms_post_id: str,
        title: str,
        content: str,
        slug: str,
        meta_description: str,
        wp_url: str,
        wp_username: str,
        wp_app_password: str,
    ) -> dict:
        """Update post เดิมบน WordPress"""
        endpoint = f"{wp_url.rstrip('/')}/wp-json/wp/v2/posts/{cms_post_id}"

        post_data = {
            "title": title,
            "content": content,
            "slug": slug,
            "excerpt": meta_description,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                endpoint,
                json=post_data,
                auth=(wp_username, wp_app_password),
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                raise Exception(
                    f"WordPress API error {resp.status_code}: {resp.text[:500]}"
                )

            data = resp.json()
            return {
                "publishedUrl": data.get("link", ""),
                "cmsPostId": str(data.get("id", "")),
            }
