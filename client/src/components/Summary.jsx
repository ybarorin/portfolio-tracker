import { fmt, pct } from '../utils.js';

export default function Summary({ enriched }) {
  const cost  = enriched.reduce((s, p) => s + p.cost, 0);
  const value = enriched.reduce((s, p) => s + p.marketValue, 0);
  const pnl   = value - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  const cards = [
    { label: 'שווי תיק נוכחי',    value: `$${fmt(value)}`,   accent: '#3B82F6' },
    { label: 'עלות כוללת',         value: `$${fmt(cost)}`,    accent: '#5B6B7C' },
    {
      label: 'רווח / הפסד',
      value: `${pnl >= 0 ? '+' : ''}$${fmt(Math.abs(pnl))}`,
      sub:   pct(pnlPct),
      accent: pnl >= 0 ? '#10B981' : '#EF4444',
    },
    { label: 'פוזיציות פעילות',   value: enriched.length,    accent: '#8B5CF6' },
  ];

  return (
    <div className="summary">
      {cards.map((c, i) => (
        <div key={i} className="card" style={{ borderTopColor: c.accent }}>
          <div className="card-label">{c.label}</div>
          <div className="card-value">{c.value}</div>
          {c.sub && <div className="card-sub" style={{ color: c.accent }}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
