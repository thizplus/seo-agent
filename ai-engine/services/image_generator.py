import io
import re
from typing import Optional

from PIL import Image

from domain.ports.llm_port import LLMPort
from domain.ports.image_gen_port import ImageGenerationPort
from domain.ports.image_storage_port import ImageStoragePort


class ImageGenerator:
    """สร้างรูปสำหรับบทความ + SEO optimize"""

    def __init__(
        self,
        llm: LLMPort,
        image_gen: ImageGenerationPort,
        image_storage: ImageStoragePort,
    ):
        self.llm = llm
        self.image_gen = image_gen
        self.image_storage = image_storage

    async def generate_for_article(
        self,
        title: str,
        keyword: str,
        content: str = "",
        count: int = 2,
    ) -> list[dict]:
        """Generate รูปสำหรับบทความ

        Returns:
            [{"url": str, "alt_text": str, "prompt": str, "position": int}]
        """
        # 1. สร้าง image prompts ด้วย LLM
        prompts = await self._generate_prompts(title, keyword, content, count)

        # 2. Generate + upload แต่ละรูป
        results = []
        for i, prompt_data in enumerate(prompts):
            try:
                # Generate image
                image_bytes = await self.image_gen.generate(prompt_data["prompt"])

                # Optimize: convert to WebP
                webp_bytes = self._to_webp(image_bytes)

                # Upload
                # ใช้ ASCII filename เท่านั้น (WP upload อาจมีปัญหากับ Unicode)
                slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", keyword.lower()))[:30] or "article"
                filename = f"{slug}-{i + 1}.webp"
                url = await self.image_storage.upload(
                    webp_bytes, filename, alt_text=prompt_data["alt_text"]
                )

                results.append({
                    "url": url,
                    "alt_text": prompt_data["alt_text"],
                    "prompt": prompt_data["prompt"],
                    "position": i + 1,
                    "format": "webp",
                    "file_size_kb": len(webp_bytes) // 1024,
                })
            except Exception as e:
                results.append({
                    "url": "",
                    "alt_text": prompt_data.get("alt_text", ""),
                    "prompt": prompt_data.get("prompt", ""),
                    "position": i + 1,
                    "error": str(e),
                })

        return results

    async def _generate_prompts(
        self, title: str, keyword: str, content: str, count: int
    ) -> list[dict]:
        """ใช้ LLM สร้าง image prompts + alt text"""
        prompt = f"""สร้าง {count} image prompts สำหรับบทความ SEO:

Title: {title}
Keyword: {keyword}

Requirements:
- Prompt ต้องเป็นภาษาอังกฤษ (สำหรับ AI image generator)
- Style: professional, clean, modern
- ห้ามมีข้อความ/ตัวอักษรในรูป
- Alt text ต้องเป็นภาษาไทย มี keyword

ตอบเป็น JSON array:
[
  {{"prompt": "English image generation prompt", "alt_text": "Thai alt text มี keyword"}}
]"""

        response = await self.llm.generate(prompt, temperature=0.7)
        try:
            cleaned = re.sub(r"```json\s*", "", response)
            cleaned = re.sub(r"```\s*$", "", cleaned)
            import json
            return json.loads(cleaned.strip())
        except Exception:
            return [
                {"prompt": f"Professional illustration about {keyword}, modern clean style", "alt_text": f"{keyword} - {title}"}
                for _ in range(count)
            ]

    def _to_webp(self, image_bytes: bytes, quality: int = 80) -> bytes:
        """Convert image to WebP format"""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            output = io.BytesIO()
            img.save(output, format="WEBP", quality=quality)
            return output.getvalue()
        except Exception:
            return image_bytes

    def _slugify(self, text: str) -> str:
        slug = re.sub(r"[^\w\s-]", "", text.lower(), flags=re.UNICODE)
        slug = re.sub(r"[-\s]+", "-", slug).strip("-")[:50]
        return slug if slug else "image"
