import { fmt } from '../utils.js';

export default function TrendChart({ enriched }) {
  const currentValue = enriched.reduce((s, p) => s + p.marketValue, 0);
  const costValue    = enriched.reduce((s, p) => s + p.cost, 0);

  const W = 480, H = 240, padL = 50, padR = 16, padT = 16, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = 30;

  // Deterministic pseudo-random walk from cost → currentValue
  let seed = Math.round(currentValue * 7) % 10000 || 1234;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const points = Array.from({ length: N }, (_, i) => {
    const t    = i / (N - 1);
    const base = costValue + (currentValue - costValue) * t;
    const noise = (rnd() - 0.5) * Math.abs(currentValue) * 0.04;
    return base + noise;
  });
  points[N - 1] = currentValue;

  let min = Math.min(...points, costValue);
  let max = Math.max(...points, costValue);
  const margin = (max - min) * 0.08 || max * 0.02 || 1;
  min -= margin; max += margin;

  const xOf = i => padL + (i / (N - 1)) * innerW;
  const yOf = v => padT + innerH - ((v - min) / (max - min)) * innerH;

  const lineColor = currentValue >= costValue ? '#34D399' : '#F87171';
  const pathD = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${xOf(N-1).toFixed(1)},${(padT+innerH).toFixed(1)} L${xOf(0).toFixed(1)},${(padT+innerH).toFixed(1)} Z`;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = min + (max - min) * i / 4;
    const y   = yOf(val).toFixed(1);
    return (
      <g key={i}>
        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#232E3D" strokeWidth="1" />
        <text x="2" y={parseFloat(y) + 4}>${fmt(val, 0)}</text>
      </g>
    );
  });

  const xLabels = [0, Math.floor((N-1)/2), N-1].map(i => (
    <text key={i} x={xOf(i).toFixed(1)} y={H - 6} textAnchor="middle">
      {i === N - 1 ? 'היום' : `לפני ${N-1-i} ימים`}
    </text>
  ));

  const costY = yOf(costValue).toFixed(1);

  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks}
      <line x1={padL} y1={costY} x2={W - padR} y2={costY} stroke="#5B6B7C" strokeDasharray="4 4" strokeWidth="1" />
      <text x={W - padR - 4} y={parseFloat(costY) - 4} textAnchor="end" fill="#5B6B7C">עלות</text>
      <path d={areaD} fill="url(#trendGrad)" />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" />
      {xLabels}
    </svg>
  );
}
