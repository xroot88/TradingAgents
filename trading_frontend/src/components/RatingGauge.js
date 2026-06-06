import React from 'react';

// 270deg arc: Sell at the 7:30 clock position, Hold at 12, Buy at 4:30.
// score is in [-1, +1]; the needle angle is score * 135deg from "up".
const RANGE_DEG = 135;
const W = 280;
const H = 190;
const CX = W / 2;
const CY = 138;
const R_OUTER = 110;
const R_INNER = 86;

function polar(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

// Build an SVG arc path between two angles measured from "up" (clockwise = +).
function arcPath(startDeg, endDeg, radius) {
  const start = polar(startDeg, radius);
  const end = polar(endDeg, radius);
  const sweep = endDeg > startDeg ? 1 : 0;
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${large} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

// Filled wedge (annulus segment) between two angles, used for the colored zones.
function wedgePath(startDeg, endDeg) {
  const outerStart = polar(startDeg, R_OUTER);
  const outerEnd = polar(endDeg, R_OUTER);
  const innerEnd = polar(endDeg, R_INNER);
  const innerStart = polar(startDeg, R_INNER);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function Tick({ angle, label, color }) {
  const outer = polar(angle, R_OUTER + 4);
  const inner = polar(angle, R_OUTER - 4);
  const text = polar(angle, R_OUTER + 22);
  return (
    <g>
      <line
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x={text.x}
        y={text.y}
        fill={color}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.2"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}

function RatingGauge({ score, rating }) {
  const safeScore = clamp(typeof score === 'number' ? score : 0, -1, 1);
  const needleDeg = safeScore * RANGE_DEG;
  const needleTip = polar(needleDeg, R_INNER - 6);
  const baseLeft = polar(needleDeg - 90, 6);
  const baseRight = polar(needleDeg + 90, 6);

  // Color zones, matched to the rating palette in styles.css.
  const zones = [
    { from: -RANGE_DEG, to: -45, color: 'var(--error)', op: 0.55 },
    { from: -45, to: 45, color: 'var(--warning)', op: 0.55 },
    { from: 45, to: RANGE_DEG, color: 'var(--success)', op: 0.55 },
  ];

  return (
    <div className="gauge-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={`Decision gauge: ${rating || 'unknown'}`}
      >
        {zones.map((z, i) => (
          <path
            key={i}
            d={wedgePath(z.from, z.to)}
            fill={z.color}
            opacity={z.op}
          />
        ))}

        <path
          d={arcPath(-RANGE_DEG, RANGE_DEG, R_OUTER)}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <path
          d={arcPath(-RANGE_DEG, RANGE_DEG, R_INNER)}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />

        <Tick angle={-RANGE_DEG} label="SELL" color="var(--error)" />
        <Tick angle={-67.5} label="" color="var(--text-dim)" />
        <Tick angle={0} label="HOLD" color="var(--warning)" />
        <Tick angle={67.5} label="" color="var(--text-dim)" />
        <Tick angle={RANGE_DEG} label="BUY" color="var(--success)" />

        <polygon
          points={`${needleTip.x.toFixed(2)},${needleTip.y.toFixed(2)} ${baseLeft.x.toFixed(2)},${baseLeft.y.toFixed(2)} ${baseRight.x.toFixed(2)},${baseRight.y.toFixed(2)}`}
          fill="currentColor"
        />
        <circle
          cx={CX}
          cy={CY}
          r="9"
          fill="var(--bg-elev-2)"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        <text
          x={CX}
          y={CY + 38}
          fill="currentColor"
          fontSize="18"
          fontWeight="700"
          letterSpacing="1.4"
          textAnchor="middle"
        >
          {(rating || 'UNKNOWN').toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export default RatingGauge;
