"""Tests for the news analyst's no-tool-call guard.

The news analyst's report is whatever response carries no tool calls. If
the model answers on turn 0 without touching get_news/get_global_news, the
"report" would be pure model memory with no data behind it. The guard
retries once with an explicit nudge to call tools; if the model still
refuses, the answer is accepted so the graph cannot loop forever.
"""

from unittest.mock import MagicMock

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from tradingagents.agents.analysts.news_analyst import create_news_analyst


def _make_state(messages=None):
    return {
        "trade_date": "2026-01-15",
        "asset_type": "stock",
        "company_of_interest": "NVDA",
        "messages": messages or [],
    }


def _tool_call_message():
    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": "get_news",
                "args": {"ticker": "NVDA", "start_date": "2026-01-08", "end_date": "2026-01-15"},
                "id": "call_1",
            }
        ],
    )


def _llm_with_responses(responses):
    """LLM whose bound chain replays canned responses and records its inputs."""
    bound = MagicMock(side_effect=list(responses))
    llm = MagicMock()
    llm.bind_tools.return_value = bound
    return llm, bound


@pytest.mark.unit
class TestNewsAnalystToolGuard:
    def test_no_tools_on_first_turn_triggers_nudged_retry(self):
        llm, bound = _llm_with_responses(
            [AIMessage(content="Report from memory."), _tool_call_message()]
        )
        result = create_news_analyst(llm)(_make_state())

        assert bound.call_count == 2
        retry_prompt = bound.call_args_list[1].args[0]
        assert any(
            isinstance(m, HumanMessage) and "must ground your report" in m.content
            for m in retry_prompt.to_messages()
        )
        # Retry produced tool calls, so no report yet — graph goes to tools.
        assert result["news_report"] == ""
        assert result["messages"][0].tool_calls

    def test_retry_refusal_is_accepted_as_report(self):
        llm, bound = _llm_with_responses(
            [AIMessage(content="From memory."), AIMessage(content="Still from memory.")]
        )
        result = create_news_analyst(llm)(_make_state())

        assert bound.call_count == 2
        assert result["news_report"] == "Still from memory."

    def test_no_retry_when_tool_results_already_in_history(self):
        history = [
            _tool_call_message(),
            ToolMessage(content="NVDA headlines...", tool_call_id="call_1"),
        ]
        llm, bound = _llm_with_responses([AIMessage(content="Grounded report.")])
        result = create_news_analyst(llm)(_make_state(history))

        assert bound.call_count == 1
        assert result["news_report"] == "Grounded report."

    def test_no_retry_when_first_response_calls_tools(self):
        llm, bound = _llm_with_responses([_tool_call_message()])
        result = create_news_analyst(llm)(_make_state())

        assert bound.call_count == 1
        assert result["news_report"] == ""
