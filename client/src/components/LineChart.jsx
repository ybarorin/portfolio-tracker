import { useState } from 'react';
import { fmt } from '../utils.js';

export default function LineChart({ points, pos }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, time, price }

  const W = 700, H = 180, padL = 36, padR = 10, padT = 20, padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allVals = [...points.map(d => d.price)];
  if (pos.sl) allVals.push(pos.sl);
  if (pos.tp) allVals.push(pos.tp);
  allVals.push(pos.buyPrice);

  let min = Math.min(...allVals), max = Math.max(...allVals);
  const margin = (max - min) * 0.08 || max * 0.02 || 1;
  min -= margin; max += margin;

  const xOf = i => padL + (i / (points.length - 1)) * innerW;
  const yOf = v => padT + innerH - ((v - min) / (max - min)) * innerH;

  const lineColor = pos.pnl >= 0 ? '#34D399' : '#F87171';

  const pathD = points
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.price).toFixed(1)}`)
    .join(' ');

  function refLine(val, color, label) {
    if (val == null) return null;
    const y = yOf(val).toFixed(1);
    return (
      <g key={label}>
        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={color} strokeDasharray="4 4" strokeWidth="1" />
        <text x={padL + 4} y={parseFloat(y) - 4} fill={color}>{label}</text>
      </g>
    );
  }

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = min + (max - min) * i / 4;
    const y   = yOf(val).toFixed(1);
    return (
      <g key={i}>
        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#232E3D" strokeWidth="1" />
        <text x="2" y={parseFloat(y) + 4}>{val.toFixed(1)}</text>
      </g>
    );
  });

  // X-axis labels
  const xTicks = points
    .filter((_, i) => i % 3 === 0 || i === points.length - 1)
    .map((d, _, arr) => {
      const i = points.indexOf(d);
      return (
        <text key={i} x={xOf(i).toFixed(1)} y={H - 4} textAnchor="middle">{d.time}</text>
      );
    });

  return (
    <div style={{ position: 'relative' }}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setTooltip(null)}
      >
        {yTicks}
        {refLine(pos.sl, '#F59E0B', 'SL')}
        {refLine(pos.tp, '#10B981', 'TP')}
        {refLine(pos.buyPrice, '#3B82F6', 'קנייה')}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" />
        {xTicks}
        {/* Invisible hover targets */}
        {points.map((d, i) => (
          <circle
            key={i}
            cx={xOf(i).toFixed(1)}
            cy={yOf(d.price).toFixed(1)}
            r="14"
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={e => {
              const rect = e.currentTarget.closest('svg').getBoundingClientRect();
              const svgX  = parseFloat(xOf(i));
              const scaleX = rect.width / W;
              setTooltip({ screenX: rect.left + svgX * scaleX, screenY: rect.top - 36, time: d.time, price: d.price });
            }}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="tooltip-box"
          style={{ left: tooltip.screenX + 12, top: tooltip.screenY + 36 - 28 }}
        >
          {tooltip.time} — ${fmt(tooltip.price)}
        </div>
      )}
    </div>
  );
}
