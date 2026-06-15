import { statusColors } from '../utils.js';

export default function AlertsSection({ enriched }) {
  const alerts = enriched.filter(p =>
    ['tp-hit', 'sl-hit', 'near-tp', 'near-sl'].includes(p.status)
  );
  if (alerts.length === 0) return null;

  return (
    <div className="alerts-section">
      <div className="section-title">⚠ נקודות לתשומת לב</div>
      {alerts.map(p => {
        const c = statusColors[p.status];
        return (
          <div
            key={p.id}
            className="alert"
            style={{ borderColor: c.border + '40', borderRightColor: c.border }}
          >
            <b>{p.symbol}</b>
            <span className="msg">{p.statusLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
