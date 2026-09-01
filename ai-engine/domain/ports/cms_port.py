from abc import ABC, abstractmethod


class CMSPort(ABC):
    """Port สำหรับ CMS — WordPress, Ghost, Shopify, etc."""

    @abstractmethod
    async def publish(
        self,
        title: str,
        content: str,
        slug: str,
        meta_description: str,
    ) -> dict:
        """Publish post ใหม่

        Returns:
            {"publishedUrl": str, "cmsPostId": str}
        """
        ...

    @abstractmethod
    async def update(
        self,
        post_id: str,
        title: str,
        content: str,
        slug: str,
        meta_description: str,
    ) -> dict:
        """Update post เดิม

        Returns:
            {"publishedUrl": str, "cmsPostId": str}
        """
        ...
