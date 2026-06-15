import { PALETTE, fmt } from '../utils.js';

export default function PieChart({ enriched }) {
  const total = enriched.reduce((s, p) => s + p.marketValue, 0);
  const cx = 120, cy = 120, r = 90;

  if (total <= 0 || enriched.length === 0) {
    return (
      <svg className="pie" viewBox="0 0 240 240">
        <circle cx={cx} cy={cy} r={r} fill="#232E3D" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">אין נתונים</text>
      </svg>
    );
  }

  let angle = -Math.PI / 2;
  const slices = enriched.map((p, i) => {
    const frac     = p.marketValue / total;
    const sweep    = frac * Math.PI * 2;
    const x1       = cx + r * Math.cos(angle);
    const y1       = cy + r * Math.sin(angle);
    const endAngle = angle + sweep;
    const x2       = cx + r * Math.cos(endAngle);
    const y2       = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const color    = PALETTE[i % PALETTE.length];
    const path     = frac >= 0.9999
      ? <circle key={p.id} cx={cx} cy={cy} r={r} fill={color} />
      : <path
          key={p.id}
          d={`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
          fill={color}
          stroke="#0F1419"
          strokeWidth="2"
        />;
    angle = endAngle;
    return { path, p, frac, color };
  });

  return (
    <>
      <svg className="pie" viewBox="0 0 240 240">
        {slices.map(s => s.path)}
      </svg>
      <div className="legend">
        {slices.map(({ p, frac, color }) => (
          <div key={p.id} className="legend-item">
            <div className="legend-dot" style={{ background: color }} />
            <div className="legend-name">{p.symbol}</div>
            <div className="legend-spacer" />
            <div>${fmt(p.marketValue)}</div>
            <div className="legend-pct">{(frac * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </>
  );
}
