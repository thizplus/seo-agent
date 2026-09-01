from typing import Optional

import anthropic

from domain.ports.llm_port import LLMPort


class ClaudeAdapter(LLMPort):
    """Anthropic Claude implementation ของ LLMPort"""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate(
        self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.7,
    ) -> str:
        kwargs = {
            "model": self.model,
            "max_tokens": 8192,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = await self.client.messages.create(**kwargs)
        return response.content[0].text

    async def generate_json(
        self, prompt: str, system_prompt: Optional[str] = None,
    ) -> str:
        json_prompt = f"{prompt}\n\nตอบเป็น JSON เท่านั้น ไม่ต้องมี markdown code block"
        return await self.generate(json_prompt, system_prompt, temperature=0.3)
