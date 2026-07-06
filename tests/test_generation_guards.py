"""Tests for the runaway-generation guards: max_tokens and llm_timeout.

Without an output cap, OpenAI-compatible servers (vLLM, ...) allow
completions up to the model's remaining context window, so a thinking model
stuck in a reasoning loop can occupy the server for tens of minutes on a
single call. Both knobs must reach the underlying chat client when set and
be omitted when explicitly disabled (None).
"""

import importlib

import pytest

from tradingagents.llm_clients.factory import create_llm_client


@pytest.mark.unit
class TestGuardForwarding:
    @pytest.mark.parametrize(
        "provider,model",
        [
            ("openai", "gpt-4.1"),
            ("anthropic", "claude-sonnet-4-6"),
            ("deepseek", "deepseek-chat"),
        ],
    )
    def test_max_tokens_reaches_client_when_set(self, provider, model):
        llm = create_llm_client(
            provider=provider, model=model, max_tokens=8192, api_key="placeholder"
        ).get_llm()
        assert llm.max_tokens == 8192

    def test_timeout_reaches_openai_client(self):
        llm = create_llm_client(
            provider="openai", model="gpt-4.1", timeout=300.0, api_key="placeholder"
        ).get_llm()
        assert llm.request_timeout == 300.0

    def test_unset_leaves_provider_defaults(self):
        # Not passing the guards must not force values onto the client.
        llm = create_llm_client(
            provider="openai", model="gpt-4.1", api_key="placeholder"
        ).get_llm()
        assert llm.max_tokens is None
        assert llm.request_timeout is None


@pytest.mark.unit
class TestGuardEnvOverlay:
    def test_env_overrides_are_int_coerced(self, monkeypatch):
        import tradingagents.default_config as dc
        monkeypatch.setenv("TRADINGAGENTS_MAX_TOKENS", "4096")
        monkeypatch.setenv("TRADINGAGENTS_LLM_TIMEOUT", "120")
        importlib.reload(dc)
        assert dc.DEFAULT_CONFIG["max_tokens"] == 4096
        assert dc.DEFAULT_CONFIG["llm_timeout"] == 120
        monkeypatch.delenv("TRADINGAGENTS_MAX_TOKENS", raising=False)
        monkeypatch.delenv("TRADINGAGENTS_LLM_TIMEOUT", raising=False)
        importlib.reload(dc)

    def test_defaults_are_enabled(self, monkeypatch):
        import tradingagents.default_config as dc
        monkeypatch.delenv("TRADINGAGENTS_MAX_TOKENS", raising=False)
        monkeypatch.delenv("TRADINGAGENTS_LLM_TIMEOUT", raising=False)
        importlib.reload(dc)
        assert dc.DEFAULT_CONFIG["max_tokens"] == 8192
        assert dc.DEFAULT_CONFIG["llm_timeout"] == 300


@pytest.mark.unit
class TestProviderKwargsGuards:
    """_get_provider_kwargs coerces and forwards the guards, or omits them."""

    def _kwargs_for(self, **config):
        from tradingagents.graph.trading_graph import TradingAgentsGraph
        # Call the method without constructing the full graph.
        graph = TradingAgentsGraph.__new__(TradingAgentsGraph)
        graph.config = {"llm_provider": "openai", **config}
        return TradingAgentsGraph._get_provider_kwargs(graph)

    def test_int_passthrough(self):
        kwargs = self._kwargs_for(max_tokens=8192, llm_timeout=300)
        assert kwargs["max_tokens"] == 8192
        assert kwargs["timeout"] == 300.0

    def test_string_coerced(self):
        kwargs = self._kwargs_for(max_tokens="4096", llm_timeout="120")
        assert kwargs["max_tokens"] == 4096
        assert kwargs["timeout"] == 120.0

    def test_none_omitted(self):
        kwargs = self._kwargs_for(max_tokens=None, llm_timeout=None)
        assert "max_tokens" not in kwargs
        assert "timeout" not in kwargs

    def test_empty_string_omitted(self):
        kwargs = self._kwargs_for(max_tokens="", llm_timeout="")
        assert "max_tokens" not in kwargs
        assert "timeout" not in kwargs
