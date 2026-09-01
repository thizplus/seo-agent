from typing import Optional

import google.generativeai as genai

from domain.ports.llm_port import LLMPort


class GeminiAdapter(LLMPort):
    """Gemini implementation ของ LLMPort"""

    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [system_prompt]})
            contents.append({"role": "model", "parts": ["เข้าใจแล้วครับ พร้อมทำงานตามที่กำหนด"]})
        contents.append({"role": "user", "parts": [prompt]})

        response = await self.model.generate_content_async(
            contents,
            generation_config=genai.types.GenerationConfig(temperature=temperature),
        )
        return response.text

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        json_prompt = f"{prompt}\n\nตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block"
        return await self.generate(json_prompt, system_prompt, temperature=0.3)
