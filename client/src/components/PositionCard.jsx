import { useState, useRef } from 'react';
import { enrich, statusColors, badgeLabel, fmt, pct } from '../utils.js';
import LineChart from './LineChart.jsx';

function Insight({ p }) {
  const ep = enrich(p);
  let title = '', body = '', color = '#9FB4CC';

  if (ep.status === 'tp-hit') {
    title = 'המחיר הגיע ליעד הרווח (TP)';
    body  = `המניה עברה את ${fmt(ep.tp)}$ שהגדרת כיעד. שווה לבחון מימוש רווח חלקי או מלא, או הזזת TP גבוה יותר אם המגמה נראית חזקה.`;
    color = '#10B981';
  } else if (ep.status === 'sl-hit') {
    title = 'המחיר חצה את ה-Stop Loss';
    body  = `המחיר נמצא מתחת ל-${fmt(ep.sl)}$ שהגדרת. שווה לבדוק האם זה זמן ליישם את ה-SL שהוגדר, או אם יש סיבה לעדכן את התוכנית.`;
    color = '#EF4444';
  } else if (ep.status === 'near-tp') {
    title = 'מתקרבים ליעד הרווח';
    body  = `נשארו כ-${fmt(ep.distToTP, 1)}% עד ה-TP (${fmt(ep.tp)}$). זה זמן טוב לחשוב מראש מה התוכנית — מימוש מלא, חלקי, או הזזת היעד.`;
    color = '#06B6D4';
  } else if (ep.status === 'near-sl') {
    title = 'מתקרבים ל-Stop Loss';
    body  = `נשארו כ-${fmt(ep.distToSL, 1)}% עד ה-SL (${fmt(ep.sl)}$). שווה לעקוב מקרוב ולוודא שהתוכנית עדיין רלוונטית.`;
    color = '#F59E0B';
  } else if (ep.status === 'no-sl') {
    title = 'אין הגדרת Stop Loss';
    body  = 'הפוזיציה הזו ללא SL מוגדר. הגדרת SL עוזרת להגביל סיכון אם המחיר זז בכיוון לא צפוי.';
    color = '#94A3B8';
  } else {
    title = 'בטווח התכנון';
    body  = `המחיר נמצא בין ה-SL וה-TP שהגדרת` +
      (ep.distToTP !== null ? `, כ-${fmt(ep.distToTP, 1)}% מה-TP` : '') +
      (ep.distToSL !== null ? ` וכ-${fmt(ep.distToSL, 1)}% מה-SL` : '') +
      '. אין פעולה דרושה כרגע לפי התוכנית.';
    color = '#64748B';
  }

  return (
    <div className="insight" style={{ borderColor: color + '30' }}>
      <div className="insight-title" style={{ color }}>{title}</div>
      <div className="insight-body">{body}</div>
    </div>
  );
}

function Field({ label, fieldKey, value, type, prefix, extraClass, onChange }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="field-wrap">
        {prefix && <span className="field-prefix">{prefix}</span>}
        <input
          className={`field-input${prefix ? ' with-prefix' : ''}${extraClass ? ' ' + extraClass : ''}`}
          type={type}
          defaultValue={value ?? ''}
          onBlur={e => {
            let val = e.target.value;
            if (['buyPrice', 'qty', 'sl', 'tp', 'currentPrice'].includes(fieldKey)) {
              val = val === '' ? null : parseFloat(val);
              if (val !== null && isNaN(val)) val = null;
            }
            onChange(fieldKey, val);
          }}
        />
      </div>
    </div>
  );
}

export default function PositionCard({ pos, isExpanded, intraday, onToggle, onUpdate, onRemove }) {
  const ep = enrich(pos);
  const c  = statusColors[ep.status];
  const [editingPrice, setEditingPrice] = useState(false);
  const priceInputRef = useRef(null);

  function commitPrice(val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) onUpdate(pos.id, { currentPrice: num });
    setEditingPrice(false);
  }

  function handleFieldChange(key, val) {
    onUpdate(pos.id, { [key]: val });
  }

  const changePct = pos.lastChangePct;
  const changeVal = pos.lastChange;

  return (
    <div className="position">
      {/* Header row */}
      <div className="pos-header" onClick={onToggle}>
        <div className="pos-bar" style={{ background: c.border }} />

        <div style={{ minWidth: 70 }}>
          <div className="pos-symbol">{pos.symbol}</div>
          <div className="pos-broker">{pos.broker || '—'}</div>
        </div>

        <div className="pos-spacer" />

        {/* Current price — click to edit inline */}
        <div className="pos-stat">
          <div className="pos-stat-label">מחיר נוכחי</div>
          {editingPrice ? (
            <input
              ref={priceInputRef}
              className="pos-price-input"
              type="number"
              defaultValue={pos.currentPrice}
              autoFocus
              onClick={e => e.stopPropagation()}
              onBlur={e => commitPrice(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitPrice(e.target.value);
                if (e.key === 'Escape') setEditingPrice(false);
              }}
            />
          ) : (
            <span
              className="pos-price"
              onClick={e => { e.stopPropagation(); setEditingPrice(true); }}
            >
              ${fmt(pos.currentPrice)}
            </span>
          )}
          {changeVal != null && (
            <div className="pos-change" style={{ color: changeVal >= 0 ? '#34D399' : '#F87171' }}>
              {changeVal >= 0 ? '+' : ''}{fmt(changeVal)} ({changePct >= 0 ? '+' : ''}{fmt(changePct)}%)
            </div>
          )}
        </div>

        {/* P&L */}
        <div className="pos-stat">
          <div className="pos-stat-label">רווח/הפסד</div>
          <div className="pos-pnl" style={{ color: ep.pnl >= 0 ? '#34D399' : '#F87171' }}>
            {ep.pnl >= 0 ? '▲' : '▼'} ${fmt(Math.abs(ep.pnl))}
          </div>
          <div className="pos-pnl-pct" style={{ color: ep.pnl >= 0 ? '#34D399' : '#F87171' }}>
            {pct(ep.pnlPct)}
          </div>
        </div>

        <div className="badge" style={{ background: c.bg, color: c.text }}>
          {badgeLabel[ep.status]}
        </div>
        <div className="chev">{isExpanded ? '▲' : '▼'}</div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="pos-body">
          <div className="fields">
            <Field label="תאריך קנייה" fieldKey="buyDate"   value={pos.buyDate}   type="date"   onChange={handleFieldChange} />
            <Field label="מחיר קנייה"  fieldKey="buyPrice"  value={pos.buyPrice}  type="number" prefix="$" onChange={handleFieldChange} />
            <Field label="כמות"         fieldKey="qty"       value={pos.qty}       type="number" onChange={handleFieldChange} />
            <Field label="Stop Loss"    fieldKey="sl"        value={pos.sl}        type="number" prefix="$" extraClass="sl" onChange={handleFieldChange} />
            <Field label="Take Profit"  fieldKey="tp"        value={pos.tp}        type="number" prefix="$" extraClass="tp" onChange={handleFieldChange} />
            <Field label="בית השקעות"  fieldKey="broker"    value={pos.broker}    type="text"   onChange={handleFieldChange} />
          </div>

          {intraday && (
            <>
              <div className="chart-title">תנודות מדומות במהלך יום המסחר</div>
              <LineChart points={intraday} pos={ep} />
              <div className="chart-note">
                * הגרף מציג תנודות מדומות לצורך הדגמה.
                המחיר האמיתי מתעדכן בלחיצה על ↻ רענן מחירים (Finnhub API).
              </div>
            </>
          )}

          <Insight p={pos} />

          <button className="remove-btn" onClick={e => { e.stopPropagation(); onRemove(pos.id); }}>
            🗑 הסר פוזיציה
          </button>
        </div>
      )}
    </div>
  );
}
