import base64

from openai import AsyncOpenAI

from domain.ports.image_gen_port import ImageGenerationPort


class DALLEAdapter(ImageGenerationPort):
    """DALL-E implementation ของ ImageGenerationPort"""

    def __init__(self, api_key: str, model: str = "dall-e-3"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def generate(self, prompt: str, width: int = 1024, height: int = 1024) -> bytes:
        size = "1024x1024"
        if width > height:
            size = "1792x1024"
        elif height > width:
            size = "1024x1792"

        response = await self.client.images.generate(
            model=self.model,
            prompt=prompt,
            size=size,
            quality="standard",
            response_format="b64_json",
            n=1,
        )

        b64 = response.data[0].b64_json
        if not b64:
            raise Exception("No image generated")
        return base64.b64decode(b64)
