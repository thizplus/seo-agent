from abc import ABC, abstractmethod


class ImageStoragePort(ABC):
    """Port สำหรับ Image Storage — WordPress Media, S3, Local"""

    @abstractmethod
    async def upload(self, image_bytes: bytes, filename: str, alt_text: str = "") -> str:
        """Upload image แล้ว return URL

        Returns:
            public URL ของรูป
        """
        ...

    @abstractmethod
    async def delete(self, image_url: str) -> bool:
        """ลบ image จาก storage

        Returns:
            True ถ้าลบสำเร็จ
        """
        ...
