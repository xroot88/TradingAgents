import os
from typing import Any, Optional
from langchain_openai import ChatOpenAI
from .base_client import BaseLLMClient

class GenericOpenAIClient(BaseLLMClient):
    """
    A clean-slate client that treats the LLM as a standard OpenAI-compatible API.
    No proprietary SDK features are enabled, ensuring compatibility with LiteLLM/Local servers.
    """
    def __init__(
        self,
        model: str,
        base_url: Optional[str] = None,
        **kwargs,
    ):
        # Priority: Explicit base_url -> Environment variable -> Default
        effective_base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.petrovich.ai")
        super().__init__(model, base_url=effective_base_url, **kwargs)

    def get_llm(self) -> Any:
        # Instantiate the simplest possible ChatOpenAI client
        return ChatOpenAI(
            model=self.model,
            base_url=self.base_url,
            api_key=self.kwargs.get("api_key") or os.environ.get("OPENAI_API_KEY"),
            **{k: v for k, v in self.kwargs.items() if k != "api_key"}
        )

    def validate_model(self) -> bool:
        return True
