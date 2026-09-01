from abc import ABC, abstractmethod


class ImageGenerationPort(ABC):
    """Port สำหรับ Image Generation — Gemini Imagen, DALL-E, Stable Diffusion"""

    @abstractmethod
    async def generate(self, prompt: str, width: int = 1024, height: int = 1024) -> bytes:
        """Generate image จาก prompt

        Returns:
            image bytes (PNG/JPEG)
        """
        ...
