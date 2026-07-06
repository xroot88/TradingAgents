"""TradingAgents HTTP backend.

Accepts an analysis request from the UI, runs the LangGraph pipeline in a
worker thread, and exposes per-agent progress over /status so the UI can
render a live progress panel.
"""

import asyncio
import json
import os
import re
import sys
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from tradingagents.default_config import DEFAULT_CONFIG  # noqa: E402
from tradingagents.graph.trading_graph import TradingAgentsGraph  # noqa: E402

# Ordered list of agent nodes the graph emits stream updates for.
# Used by the UI to render the progress panel and to compute "X / N" done.
AGENTS = [
    "Market Analyst",
    "Sentiment Analyst",
    "News Analyst",
    "Fundamentals Analyst",
    "Bull Researcher",
    "Bear Researcher",
    "Research Manager",
    "Trader",
    "Aggressive Analyst",
    "Conservative Analyst",
    "Neutral Analyst",
    "Portfolio Manager",
]

# Map UI effort to provider-specific reasoning effort + debate depth.
EFFORT_PRESETS: Dict[str, Dict[str, Any]] = {
    "low": {
        "openai_reasoning_effort": "low",
        "anthropic_effort": "low",
        "google_thinking_level": "minimal",
        "max_debate_rounds": 1,
        "max_risk_discuss_rounds": 1,
    },
    "medium": {
        "openai_reasoning_effort": "medium",
        "anthropic_effort": "medium",
        "google_thinking_level": "high",
        "max_debate_rounds": 2,
        "max_risk_discuss_rounds": 2,
    },
    "high": {
        "openai_reasoning_effort": "high",
        "anthropic_effort": "high",
        "google_thinking_level": "high",
        "max_debate_rounds": 3,
        "max_risk_discuss_rounds": 3,
    },
}

app = FastAPI(title="TradingAgents Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

jobs: Dict[str, Dict[str, Any]] = {}
company_name_cache: Dict[str, str] = {}


class AnalysisRequest(BaseModel):
    ticker: str
    api_key: str
    effort: str = "medium"


async def _validate_vllm_key(api_key: str) -> None:
    """Probe the upstream LLM endpoint with the user-supplied key.

    Translates upstream auth failures into a clean HTTP 401 for the UI, instead
    of letting the failure surface mid-run as a vague background-job error.
    """
    base_url = os.getenv("OPENAI_BASE_URL", "http://localhost:8000/v1").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{base_url}/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Upstream LLM unreachable: {e}")
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Upstream LLM error ({resp.status_code})")


async def _validate_ticker_exists(symbol: str) -> None:
    """Reject unknown tickers up-front so the UI fails fast.

    A yfinance error (rate limit, network, throttling) blocks the run
    rather than silently letting it proceed — better to surface the
    lookup failure than to start a long run on an unverified ticker.
    """
    import yfinance as yf

    def _check() -> bool:
        hist = yf.Ticker(symbol).history(period="5d")
        return not hist.empty

    try:
        valid = await asyncio.to_thread(_check)
    except Exception as e:
        raise HTTPException(
            status_code=502, detail=f"Ticker lookup failed: {e}"
        )
    if not valid:
        raise HTTPException(status_code=400, detail=f"Unknown ticker: {symbol}")


def _initial_progress() -> Dict[str, Any]:
    return {
        "agents": list(AGENTS),
        "agent_status": {a: "pending" for a in AGENTS},
        "completed": 0,
        "total": len(AGENTS),
        "current_agent": None,
    }


def _build_config(effort: str) -> Dict[str, Any]:
    overrides = EFFORT_PRESETS.get(effort, EFFORT_PRESETS["medium"])
    cfg = {**DEFAULT_CONFIG, **overrides}
    base_url = os.getenv("OPENAI_BASE_URL")
    if base_url:
        cfg["OPENAI_BASE_URL"] = base_url
    model = os.getenv("TRADING_MODEL", "gemma4a")
    cfg["deep_think_llm"] = model
    cfg["quick_think_llm"] = model
    return cfg


def _run_blocking(job_id: str, ticker: str, effort: str) -> None:
    """Run the graph synchronously, streaming per-node updates into job state."""
    job = jobs[job_id]
    progress = job["progress"]
    try:
        config = _build_config(effort)
        graph_obj = TradingAgentsGraph(config=config)
        trade_date = datetime.now().strftime("%Y-%m-%d")

        init_state = graph_obj.propagator.create_initial_state(
            ticker,
            trade_date,
            past_context=graph_obj.memory_log.get_past_context(ticker),
        )
        args = graph_obj.propagator.get_graph_args()
        # Override "values" -> "updates" so each chunk identifies the node that
        # just finished. Keys in the chunk dict are node names.
        args["stream_mode"] = "updates"

        # Best-effort accumulation of state fields we care about for the
        # final result. Skipping `messages` because it uses a list-reducer.
        accumulated: Dict[str, Any] = dict(init_state)

        for chunk in graph_obj.graph.stream(init_state, **args):
            if job.get("cancelled"):
                break
            for node_name, state_update in chunk.items():
                if state_update:
                    for k, v in state_update.items():
                        if k == "messages":
                            continue
                        accumulated[k] = v
                if node_name in progress["agent_status"]:
                    progress["agent_status"][node_name] = "done"
                    progress["current_agent"] = node_name
                    progress["completed"] = sum(
                        1 for s in progress["agent_status"].values() if s == "done"
                    )

        if job.get("cancelled"):
            job["status"] = "cancelled"
            return

        invest_debate = accumulated.get("investment_debate_state") or {}
        risk_debate = accumulated.get("risk_debate_state") or {}

        chart = None
        try:
            from cli.main import save_report_to_disk
            report_dir = ROOT / "reports" / f"{ticker}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            save_report_to_disk(accumulated, ticker, report_dir, config)
            # Persist effort level so past reports can recover it
            (report_dir / "metadata.json").write_text(
                json.dumps({"effort": effort}, separators=(",", ":")), encoding="utf-8"
            )
            job["report_path"] = str(report_dir)
            chart_file = report_dir / "chart.json"
            if chart_file.is_file():
                chart = json.loads(chart_file.read_text(encoding="utf-8"))
        except Exception:
            traceback.print_exc()

        job["status"] = "completed"
        job["result"] = {
            "final_decision": accumulated.get("final_trade_decision", ""),
            "investment_plan": accumulated.get("investment_plan", ""),
            "trader_plan": accumulated.get("trader_investment_plan", ""),
            "chart": chart,
            "details": {
                "market": accumulated.get("market_report", ""),
                "sentiment": accumulated.get("sentiment_report", ""),
                "news": accumulated.get("news_report", ""),
                "fundamentals": accumulated.get("fundamentals_report", ""),
            },
            "research_debate": {
                "history": invest_debate.get("history", ""),
                "bull_history": invest_debate.get("bull_history", ""),
                "bear_history": invest_debate.get("bear_history", ""),
                "judge_decision": invest_debate.get("judge_decision", ""),
            },
            "risk_debate": {
                "history": risk_debate.get("history", ""),
                "aggressive_history": risk_debate.get("aggressive_history", ""),
                "conservative_history": risk_debate.get("conservative_history", ""),
                "neutral_history": risk_debate.get("neutral_history", ""),
                "judge_decision": risk_debate.get("judge_decision", ""),
            },
        }
    except Exception as e:
        traceback.print_exc()
        job["status"] = "failed"
        job["error"] = str(e)


async def run_trading_graph(
    job_id: str, ticker: str, api_key: str, effort: str
) -> None:
    os.environ["OPENAI_API_KEY"] = api_key
    jobs[job_id]["status"] = "running"
    await asyncio.to_thread(_run_blocking, job_id, ticker, effort)


@app.post("/analyze")
async def analyze(request: AnalysisRequest, background_tasks: BackgroundTasks):
    ticker = request.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    api_key = request.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=401, detail="API key is required")
    await _validate_vllm_key(api_key)
    await _validate_ticker_exists(ticker)

    effort = request.effort if request.effort in EFFORT_PRESETS else "medium"

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "pending",
        "progress": _initial_progress(),
        "result": None,
        "error": None,
        "ticker": ticker,
        "effort": effort,
        "started_at": datetime.utcnow().isoformat() + "Z",
        "cancelled": False,
    }
    background_tasks.add_task(
        run_trading_graph, job_id, ticker, api_key, effort
    )
    return {"job_id": job_id}


@app.post("/cancel/{job_id}")
async def cancel(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] in ("completed", "failed", "cancelled"):
        return {"status": job["status"]}
    job["cancelled"] = True
    return {"status": "cancelling"}


@app.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/health")
async def health():
    return {"ok": True, "agents": AGENTS}


# Directory naming convention: {TICKER}_{YYYYMMDD}_{HHMMSS}
_REPORT_DIR_RE = re.compile(r"^(?P<ticker>[A-Z0-9.\-]+)_(?P<date>\d{8})_(?P<time>\d{6})$")


def _parse_report_dir(name: str) -> Optional[Dict[str, str]]:
    m = _REPORT_DIR_RE.match(name)
    if not m:
        return None
    date, time = m.group("date"), m.group("time")
    iso = (
        f"{date[0:4]}-{date[4:6]}-{date[6:8]}T"
        f"{time[0:2]}:{time[2:4]}:{time[4:6]}Z"
    )
    return {"name": name, "ticker": m.group("ticker"), "started_at": iso}


@app.get("/reports")
async def list_reports() -> Dict[str, List[Dict[str, str]]]:
    """List saved runs on disk, newest first, for the UI's recent-runs panel."""
    base = ROOT / "reports"
    if not base.is_dir():
        return {"reports": []}
    entries: List[Dict[str, str]] = []
    for child in base.iterdir():
        if not child.is_dir():
            continue
        parsed = _parse_report_dir(child.name)
        if parsed is None:
            continue
        entries.append(parsed)
    entries.sort(key=lambda e: e["started_at"], reverse=True)
    return {"reports": entries}


@app.post("/demo/{report_name}")
async def demo(report_name: str):
    """Build a synthetic completed job from a saved report on disk.

    Used for visual QA of the UI without re-running the full agent graph.
    """
    safe = report_name.strip()
    if not safe or "/" in safe or "\\" in safe or safe.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid report name")
    report_dir = ROOT / "reports" / safe
    if not report_dir.is_dir():
        raise HTTPException(status_code=404, detail="Report not found")

    def _read(rel: str) -> str:
        p = report_dir / rel
        return p.read_text() if p.is_file() else ""

    parsed = _parse_report_dir(safe)
    ticker = parsed["ticker"] if parsed else safe.split("_")[0]

    chart_file = report_dir / "chart.json"
    chart = None
    if chart_file.is_file():
        try:
            chart = json.loads(chart_file.read_text(encoding="utf-8"))
        except Exception:
            chart = None
    else:
        # Backfill: pre-chart-snapshot reports get a live snapshot generated
        # on first /demo open so the UI can render the chart without a re-run.
        try:
            from tradingagents.dataflows.chart_snapshot import build_chart_snapshot
            chart = await asyncio.to_thread(build_chart_snapshot, ticker)
            if chart:
                chart_file.write_text(
                    json.dumps(chart, separators=(",", ":")), encoding="utf-8"
                )
        except Exception:
            chart = None

    started_at = parsed["started_at"] if parsed else datetime.utcnow().isoformat() + "Z"
    # Recover effort from persisted metadata; fall back to "demo" for old reports
    effort = "demo"
    meta_file = report_dir / "metadata.json"
    if meta_file.is_file():
        try:
            effort = json.loads(meta_file.read_text(encoding="utf-8")).get("effort", "demo")
        except Exception:
            pass
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "completed",
        "progress": _initial_progress(),
        "result": {
            "final_decision": _read("5_portfolio/decision.md"),
            "investment_plan": _read("2_research/manager.md"),
            "trader_plan": _read("3_trading/trader.md"),
            "chart": chart,
            "details": {
                "market": _read("1_analysts/market.md"),
                "sentiment": _read("1_analysts/sentiment.md"),
                "news": _read("1_analysts/news.md"),
                "fundamentals": _read("1_analysts/fundamentals.md"),
            },
            "research_debate": {
                "history": _read("2_research/bull.md")
                + "\n\n"
                + _read("2_research/bear.md"),
                "bull_history": _read("2_research/bull.md"),
                "bear_history": _read("2_research/bear.md"),
                "judge_decision": _read("2_research/manager.md"),
            },
            "risk_debate": {
                "history": "\n\n".join(
                    [
                        _read("4_risk/aggressive.md"),
                        _read("4_risk/conservative.md"),
                        _read("4_risk/neutral.md"),
                    ]
                ),
                "aggressive_history": _read("4_risk/aggressive.md"),
                "conservative_history": _read("4_risk/conservative.md"),
                "neutral_history": _read("4_risk/neutral.md"),
                "judge_decision": _read("5_portfolio/decision.md"),
            },
        },
        "error": None,
        "ticker": ticker,
        "effort": effort,
        "started_at": started_at,
        "cancelled": False,
    }
    return {"job_id": job_id}


@app.get("/company/{ticker}")
async def company(ticker: str):
    symbol = ticker.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Ticker is required")
    if symbol in company_name_cache:
        return {"ticker": symbol, "name": company_name_cache[symbol]}

    import yfinance as yf

    def _lookup() -> str:
        info = yf.Ticker(symbol).info or {}
        return (info.get("longName") or info.get("shortName") or "").strip()

    try:
        name = await asyncio.to_thread(_lookup)
    except Exception:
        name = ""
    company_name_cache[symbol] = name
    return {"ticker": symbol, "name": name}


# Serve the React build at the site root. Mounted last so the API routes
# above take priority over the static catch-all.
FRONTEND_BUILD = ROOT / "trading_frontend" / "build"
if FRONTEND_BUILD.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3000)
