import os
from typing import Any, Optional
from langchain_openai import ChatOpenAI
from .base_client import BaseLLMClient

class LocalLLMClient(BaseLLMClient):
    """
    A simplified OpenAI-compatible client for local models or LiteLLM.
    Bypasses proprietary OpenAI SDK features to avoid 404/401 errors.
    """
    def __init__(
        self,
        model: str,
        base_url: Optional[str] = None,
        **kwargs,
    ):
        # Use the provided base_url or fallback to the one configured in .env
        effective_base_url = base_url or os.getenv("OPENAI_BASE_URL", "http://localhost:8000/v1")
        super().__init__(model, base_url=effective_base_url, **kwargs)

    def get_llm(self) -> Any:
        # We instantiate ChatOpenAI directly without using a wrapper class 
        # that might trigger the 'responses' API logic.
        return ChatOpenAI(
            model=self.model,
            base_url=self.base_url,
            api_key=os.environ.get("OPENAI_API_KEY"),
            **self.kwargs
        )

    def validate_model(self) -> bool:
        # For local models, we skip strict validation
        return True
