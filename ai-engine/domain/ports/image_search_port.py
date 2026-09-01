from abc import ABC, abstractmethod


class ImageSearchPort(ABC):
    """Port สำหรับค้นหารูปภาพฟรี — Pexels, Unsplash, Pixabay"""

    @abstractmethod
    async def search(self, query: str, count: int = 5, orientation: str = "landscape") -> list[dict]:
        """ค้นหารูปภาพ

        Args:
            query: keyword ที่จะค้นหา
            count: จำนวนรูปที่ต้องการ
            orientation: landscape | portrait | square

        Returns:
            [{"url": str, "thumb_url": str, "width": int, "height": int, "source": str, "photographer": str}]
        """
        ...
