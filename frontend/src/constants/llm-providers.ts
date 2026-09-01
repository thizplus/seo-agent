export const LLM_PROVIDERS = [
  { value: "gemini", label: "Google Gemini", placeholder: "AIza..." },
  { value: "openai", label: "OpenAI (GPT-4o)", placeholder: "sk-..." },
  { value: "claude", label: "Anthropic Claude", placeholder: "sk-ant-..." },
  { value: "deepseek", label: "DeepSeek", placeholder: "sk-..." },
  { value: "groq", label: "Groq (LLaMA 3)", placeholder: "gsk_..." },
  { value: "mistral", label: "Mistral AI", placeholder: "..." },
] as const

export type LLMProvider = (typeof LLM_PROVIDERS)[number]["value"]
