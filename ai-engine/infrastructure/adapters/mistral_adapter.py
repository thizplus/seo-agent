from typing import Optional

from openai import AsyncOpenAI

from domain.ports.llm_port import LLMPort


class MistralAdapter(LLMPort):
    """Mistral implementation ของ LLMPort (OpenAI-compatible API)"""

    def __init__(self, api_key: str, model: str = "mistral-large-latest"):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.mistral.ai/v1",
        )
        self.model = model

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=temperature,
        )
        return response.choices[0].message.content or ""

    async def generate_json(
        self, prompt: str, system_prompt: Optional[str] = None,
    ) -> str:
        json_prompt = f"{prompt}\n\nตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block"
        return await self.generate(json_prompt, system_prompt, temperature=0.3)
