import { fmt } from '../utils.js';

export default function BarsChart({ enriched }) {
  if (enriched.length === 0) return null;

  const W = 700, H = 220, padL = 50, padR = 20, padT = 20, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const vals = enriched.map(p => p.pnl);
  let max = Math.max(...vals, 0);
  let min = Math.min(...vals, 0);
  if (max === min) { max += 1; min -= 1; }
  const range = max - min;

  const zeroY  = padT + innerH - ((0 - min) / range) * innerH;
  const step   = innerW / enriched.length;
  const barW   = step * 0.55;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = min + range * i / 4;
    const y   = (padT + innerH - ((val - min) / range) * innerH).toFixed(1);
    return (
      <g key={i}>
        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#232E3D" strokeWidth="1" />
        <text x={padL - 6} y={parseFloat(y) + 4} textAnchor="end">{fmt(val, 0)}</text>
      </g>
    );
  });

  const bars = enriched.map((p, i) => {
    const x      = padL + i * step + (step - barW) / 2;
    const yVal   = padT + innerH - ((p.pnl - min) / range) * innerH;
    const barTop = Math.min(yVal, zeroY);
    const barH   = Math.max(Math.abs(yVal - zeroY), 1);
    const color  = p.pnl >= 0 ? '#34D399' : '#F87171';
    return (
      <g key={p.id}>
        <rect x={x.toFixed(1)} y={barTop.toFixed(1)} width={barW.toFixed(1)} height={barH.toFixed(1)} fill={color} rx="4" />
        <text x={(x + barW / 2).toFixed(1)} y={H - 8} textAnchor="middle">{p.symbol}</text>
      </g>
    );
  });

  return (
    <svg className="bars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {yTicks}
      <line x1={padL} y1={zeroY.toFixed(1)} x2={W - padR} y2={zeroY.toFixed(1)} stroke="#5B6B7C" strokeWidth="1" />
      {bars}
    </svg>
  );
}
