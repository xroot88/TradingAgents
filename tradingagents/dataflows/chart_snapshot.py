"""Build a chart snapshot for the trade decision summary.

Fetches recent 5-minute OHLCV bars from yfinance and computes the standard
indicator stack the UI displays: 50- and 200-period SMAs (over 5-min bars),
20-period Bollinger bands (2-sigma), 14-period RSI, and raw volume. The
result is serialised to a small JSON document that the frontend renders with
TradingView lightweight-charts.

Snapshots are persisted alongside each saved report so historical runs keep
showing the chart the analysts actually saw, rather than re-fetching live
data every time the report is opened.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Indicator helpers
# ---------------------------------------------------------------------------


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Wilder-style RSI on a close-price series."""
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    return (100 - (100 / (1 + rs))).astype(float)


def _bollinger(series: pd.Series, period: int = 20, sigma: float = 2.0):
    middle = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = middle + sigma * std
    lower = middle - sigma * std
    return upper, middle, lower


# ---------------------------------------------------------------------------
# Snapshot
# ---------------------------------------------------------------------------


def _to_unix(ts: pd.Timestamp) -> int:
    """Lightweight-charts expects a UTC unix second timestamp."""
    if ts.tzinfo is None:
        ts = ts.tz_localize("UTC")
    return int(ts.tz_convert("UTC").timestamp())


def _round4(x: float) -> float:
    return round(float(x), 4)


def _series_to_points(time_index: pd.DatetimeIndex, values: pd.Series) -> List[Dict[str, Any]]:
    pts: List[Dict[str, Any]] = []
    for ts, v in zip(time_index, values):
        if pd.isna(v):
            continue
        pts.append({"time": _to_unix(ts), "value": _round4(v)})
    return pts


def build_chart_snapshot(
    symbol: str,
    *,
    period: str = "5d",
    interval: str = "5m",
) -> Optional[Dict[str, Any]]:
    """Return a chart payload for ``symbol`` or ``None`` if data is unavailable.

    Defaults are 5 trading days at a 5-minute interval, which yields ~390 bars
    on US equities — enough for a meaningful 200-period SMA while keeping the
    JSON payload around 60-80 kB. Errors (rate limits, unknown ticker,
    weekend/holiday with no bars) are logged and ``None`` is returned so the
    caller can decide whether to drop the chart from the report rather than
    fail the whole run.
    """
    try:
        df = yf.Ticker(symbol).history(period=period, interval=interval)
    except Exception as exc:
        logger.warning("chart_snapshot: yfinance history failed for %s (%s)", symbol, exc)
        return None
    if df is None or df.empty:
        logger.info("chart_snapshot: no bars for %s (period=%s, interval=%s)", symbol, period, interval)
        return None

    df = df.dropna(subset=["Close"])
    if df.empty:
        return None

    close = df["Close"].astype(float)
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()
    bb_upper, bb_middle, bb_lower = _bollinger(close, 20, 2.0)
    rsi = _rsi(close, 14)

    candles = []
    volume = []
    for ts, row in df.iterrows():
        unix = _to_unix(ts)
        o, h, l, c = (
            float(row["Open"]),
            float(row["High"]),
            float(row["Low"]),
            float(row["Close"]),
        )
        candles.append({
            "time": unix,
            "open": _round4(o),
            "high": _round4(h),
            "low": _round4(l),
            "close": _round4(c),
        })
        vol = int(row.get("Volume", 0) or 0)
        volume.append({
            "time": unix,
            "value": vol,
            "color": "rgba(74, 222, 128, 0.5)" if c >= o else "rgba(248, 113, 113, 0.5)",
        })

    return {
        "symbol": symbol,
        "interval": interval,
        "period": period,
        "as_of": _to_unix(df.index[-1]),
        "candles": candles,
        "volume": volume,
        "indicators": {
            "sma50": _series_to_points(df.index, sma50),
            "sma200": _series_to_points(df.index, sma200),
            "bb_upper": _series_to_points(df.index, bb_upper),
            "bb_middle": _series_to_points(df.index, bb_middle),
            "bb_lower": _series_to_points(df.index, bb_lower),
            "rsi": _series_to_points(df.index, rsi),
        },
    }
