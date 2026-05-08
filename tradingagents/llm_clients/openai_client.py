import os
from typing import Any, Optional
from langchain_openai import ChatOpenAI
from .base_client import BaseLLMClient

class NormalizedChatOpenAI(ChatOpenAI):
    def invoke(self, input, config=None, **kwargs):
        return super().invoke(input, config, **kwargs)

class OpenAIClient(BaseLLMClient):
    def __init__(self, model: str, base_url: Optional[str] = None, provider: str = "openai", **kwargs):
        super().__init__(model, base_url, **kwargs)
        self.provider = provider.lower()

    def get_llm(self) -> Any:
        llm_kwargs = {
            "model": self.model,
            "base_url": self.base_url or "https://api.petrovich.ai",
            "api_key": os.environ.get("OPENAI_API_KEY"),
        }
        return NormalizedChatOpenAI(**llm_kwargs)

    def validate_model(self) -> bool:
        return True
