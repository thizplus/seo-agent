from abc import ABC, abstractmethod
from typing import Optional


class LLMPort(ABC):
    """Port สำหรับ LLM provider — Gemini, OpenAI, Claude, etc."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        """Generate text จาก prompt"""
        ...

    @abstractmethod
    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate JSON response"""
        ...
