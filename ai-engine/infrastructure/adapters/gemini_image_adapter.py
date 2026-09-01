import base64

import httpx

from domain.ports.image_gen_port import ImageGenerationPort


class GeminiImageAdapter(ImageGenerationPort):
    """Gemini image generation — ลอง models ตามลำดับจนกว่าจะสำเร็จ"""

    # Models ที่รองรับ image generation (เรียงจากดีสุด → fallback)
    IMAGE_MODELS = [
        "gemini-3.1-flash-image-preview",
        "gemini-3-pro-image-preview",
        "gemini-2.5-flash-image",
    ]

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate(self, prompt: str, width: int = 1024, height: int = 1024) -> bytes:
        last_error = ""
        for model in self.IMAGE_MODELS:
            try:
                return await self._generate_with_model(model, prompt)
            except Exception as e:
                last_error = str(e)
                continue

        raise Exception(f"All image models failed. Last error: {last_error}")

    async def _generate_with_model(self, model: str, prompt: str) -> bytes:
        url = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"

        body = {
            "contents": [
                {"parts": [{"text": f"Generate a high quality image: {prompt}"}]}
            ],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            },
        }

        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(url, json=body)

            if resp.status_code != 200:
                raise Exception(f"{model} error {resp.status_code}: {resp.text[:200]}")

            data = resp.json()

            for candidate in data.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    inline_data = part.get("inlineData", {})
                    if inline_data.get("mimeType", "").startswith("image/"):
                        b64 = inline_data.get("data", "")
                        if b64:
                            return base64.b64decode(b64)

            raise Exception(f"{model}: no image in response")
