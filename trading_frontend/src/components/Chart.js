import React, { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

// Three stacked panes: price (with BBs and SMAs), RSI, Volume.
// Lightweight-charts auto-syncs the time axis across panes.
const PANE = { PRICE: 0, RSI: 1, VOLUME: 2 };

const COLORS = {
  text: '#d1d5db',
  grid: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.08)',
  bg: 'transparent',
  upWick: '#4ade80',
  downWick: '#f87171',
  upBody: '#4ade80',
  downBody: '#f87171',
  sma50: '#60a5fa',
  sma200: '#f59e0b',
  bbBand: 'rgba(167, 139, 250, 0.7)',
  bbMid: 'rgba(167, 139, 250, 0.45)',
  rsi: '#a78bfa',
  rsiBand: 'rgba(167, 139, 250, 0.35)',
};

function Legend({ chart }) {
  if (!chart) return null;
  const interval = chart.interval || '5m';
  return (
    <div className="chart-legend">
      <span className="chart-legend-ticker">{chart.symbol}</span>
      <span className="chart-legend-meta">· {interval} candles</span>
      <span className="chart-legend-keys">
        <span className="legend-key">
          <span className="dot" style={{ background: COLORS.sma50 }} /> SMA 50
        </span>
        <span className="legend-key">
          <span className="dot" style={{ background: COLORS.sma200 }} /> SMA 200
        </span>
        <span className="legend-key">
          <span className="dot" style={{ background: COLORS.bbBand }} /> Bollinger (20, 2σ)
        </span>
        <span className="legend-key">
          <span className="dot" style={{ background: COLORS.rsi }} /> RSI (14)
        </span>
        <span className="legend-key">
          <span className="dot dot-bar" /> Volume
        </span>
      </span>
    </div>
  );
}

function Chart({ chart }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;

    const container = containerRef.current;
    const c = createChart(container, {
      width: container.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = c;

    // ---- Pane 0: price ----
    const candles = c.addSeries(
      CandlestickSeries,
      {
        upColor: COLORS.upBody,
        downColor: COLORS.downBody,
        wickUpColor: COLORS.upWick,
        wickDownColor: COLORS.downWick,
        borderVisible: false,
      },
      PANE.PRICE
    );
    candles.setData(chart.candles);

    const ind = chart.indicators || {};
    if (ind.bb_upper?.length) {
      const upper = c.addSeries(
        LineSeries,
        { color: COLORS.bbBand, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
        PANE.PRICE
      );
      upper.setData(ind.bb_upper);
      const middle = c.addSeries(
        LineSeries,
        {
          color: COLORS.bbMid,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        },
        PANE.PRICE
      );
      middle.setData(ind.bb_middle || []);
      const lower = c.addSeries(
        LineSeries,
        { color: COLORS.bbBand, lineWidth: 1, priceLineVisible: false, lastValueVisible: false },
        PANE.PRICE
      );
      lower.setData(ind.bb_lower || []);
    }
    if (ind.sma50?.length) {
      const s50 = c.addSeries(
        LineSeries,
        { color: COLORS.sma50, lineWidth: 2, priceLineVisible: false, lastValueVisible: false },
        PANE.PRICE
      );
      s50.setData(ind.sma50);
    }
    if (ind.sma200?.length) {
      const s200 = c.addSeries(
        LineSeries,
        { color: COLORS.sma200, lineWidth: 2, priceLineVisible: false, lastValueVisible: false },
        PANE.PRICE
      );
      s200.setData(ind.sma200);
    }

    // ---- Pane 1: RSI ----
    if (ind.rsi?.length) {
      const rsi = c.addSeries(
        LineSeries,
        {
          color: COLORS.rsi,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
        },
        PANE.RSI
      );
      rsi.setData(ind.rsi);
      // Reference overbought/oversold bands at 70 and 30.
      rsi.createPriceLine({
        price: 70,
        color: COLORS.rsiBand,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
      });
      rsi.createPriceLine({
        price: 30,
        color: COLORS.rsiBand,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
      });
    }

    // ---- Pane 2: Volume ----
    if (chart.volume?.length) {
      const vol = c.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: 'volume' },
          priceLineVisible: false,
          lastValueVisible: false,
        },
        PANE.VOLUME
      );
      vol.setData(chart.volume);
    }

    // Stack the panes: ~60% price, ~20% RSI, ~20% volume.
    const panes = c.panes();
    if (panes[PANE.PRICE]) panes[PANE.PRICE].setHeight(252);
    if (panes[PANE.RSI]) panes[PANE.RSI].setHeight(84);
    if (panes[PANE.VOLUME]) panes[PANE.VOLUME].setHeight(84);

    c.timeScale().fitContent();

    const onResize = () => {
      c.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      c.remove();
      chartRef.current = null;
    };
  }, [chart]);

  if (!chart || !chart.candles?.length) return null;

  return (
    <div className="chart-card">
      <Legend chart={chart} />
      <div ref={containerRef} className="chart-canvas" />
    </div>
  );
}

export default Chart;
