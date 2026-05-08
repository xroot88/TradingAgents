"""Trader: turns the Research Manager's investment plan into a concrete transaction proposal."""

from __future__ import annotations

import functools
import logging
from datetime import datetime, timedelta

from langchain_core.messages import AIMessage

from tradingagents.agents.schemas import TraderProposal, render_trader_proposal
from tradingagents.agents.utils.agent_utils import build_instrument_context
from tradingagents.agents.utils.structured import (
    bind_structured,
    invoke_structured_or_freetext,
)
from tradingagents.dataflows.interface import route_to_vendor

logger = logging.getLogger(__name__)


def _recent_price_context(ticker: str, trade_date: str) -> str:
    """Fetch ~10 calendar days of OHLCV ending on trade_date so the Trader has a
    price anchor for entry and stop-loss levels. Returns "" on any failure so the
    Trader still runs (just without the anchor) when data is unavailable.
    """
    try:
        end = datetime.strptime(trade_date, "%Y-%m-%d")
        start = end - timedelta(days=10)
        csv = route_to_vendor(
            "get_stock_data",
            ticker,
            start.strftime("%Y-%m-%d"),
            end.strftime("%Y-%m-%d"),
        )
        if not isinstance(csv, str):
            return ""
        # yfinance returns a prose "No data found for symbol..." sentinel for
        # unknown tickers instead of raising; require at least a header + one
        # data row of CSV before treating the response as a usable anchor.
        if sum(1 for line in csv.splitlines() if "," in line) < 2:
            return ""
        return csv
    except Exception as exc:
        logger.warning("Trader price anchor fetch failed for %s @ %s: %s", ticker, trade_date, exc)
        return ""


def create_trader(llm):
    structured_llm = bind_structured(llm, TraderProposal, "Trader")

    def trader_node(state, name):
        company_name = state["company_of_interest"]
        trade_date = state.get("trade_date")
        instrument_context = build_instrument_context(company_name)
        investment_plan = state["investment_plan"]
        recent_prices = _recent_price_context(company_name, trade_date) if trade_date else ""

        price_block = (
            f"Recent OHLCV for {company_name} (use these to set realistic absolute "
            f"entry and stop-loss levels in the instrument's quote currency — not "
            f"relative offsets, percentages, or P&L deltas):\n{recent_prices}\n\n"
            if recent_prices
            else ""
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a trading agent analyzing market data to make investment decisions. "
                    "Based on your analysis, provide a specific recommendation to buy, sell, or hold. "
                    "Anchor your reasoning in the analysts' reports and the research plan."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Based on a comprehensive analysis by a team of analysts, here is an investment "
                    f"plan tailored for {company_name}. {instrument_context} This plan incorporates "
                    f"insights from current technical market trends, macroeconomic indicators, and "
                    f"social media sentiment. Use this plan as a foundation for evaluating your next "
                    f"trading decision.\n\n{price_block}"
                    f"Proposed Investment Plan: {investment_plan}\n\n"
                    f"Leverage these insights to make an informed and strategic decision."
                ),
            },
        ]

        trader_plan = invoke_structured_or_freetext(
            structured_llm,
            llm,
            messages,
            render_trader_proposal,
            "Trader",
        )

        return {
            "messages": [AIMessage(content=trader_plan)],
            "trader_investment_plan": trader_plan,
            "sender": name,
        }

    return functools.partial(trader_node, name="Trader")
