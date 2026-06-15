// ── Formatting ────────────────────────────────────────────────────────────────

export function fmt(n, digits = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

// ── Position enrichment ───────────────────────────────────────────────────────

export function enrich(p) {
  const marketValue = p.currentPrice * p.qty;
  const cost        = p.buyPrice * p.qty;
  const pnl         = marketValue - cost;
  const pnlPct      = cost > 0 ? (pnl / cost) * 100 : 0;
  const distToTP    = p.tp ? ((p.tp - p.currentPrice) / p.currentPrice) * 100 : null;
  const distToSL    = p.sl ? ((p.currentPrice - p.sl) / p.currentPrice) * 100 : null;

  let status = 'normal', statusLabel = 'בטווח התכנון';
  if      (p.tp && p.currentPrice >= p.tp)            { status = 'tp-hit';  statusLabel = 'הגיע ל-TP — שווה לבדוק מימוש רווח'; }
  else if (p.sl && p.currentPrice <= p.sl)            { status = 'sl-hit';  statusLabel = 'חצה את ה-SL — שווה לבדוק יציאה'; }
  else if (distToTP !== null && distToTP <= 3 && distToTP > 0) { status = 'near-tp'; statusLabel = `מתקרב ל-TP (${fmt(distToTP, 1)}% משם)`; }
  else if (distToSL !== null && distToSL <= 3 && distToSL > 0) { status = 'near-sl'; statusLabel = `מתקרב ל-SL (${fmt(distToSL, 1)}% משם)`; }
  else if (!p.sl)                                     { status = 'no-sl';   statusLabel = 'אין הגדרת SL — שיקלו להגדיר'; }

  return { ...p, marketValue, cost, pnl, pnlPct, distToTP, distToSL, status, statusLabel };
}

// ── Status theming ────────────────────────────────────────────────────────────

export const statusColors = {
  'tp-hit':  { border: '#10B981', text: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  'sl-hit':  { border: '#EF4444', text: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  'near-tp': { border: '#06B6D4', text: '#22D3EE', bg: 'rgba(6,182,212,0.08)' },
  'near-sl': { border: '#F59E0B', text: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  'no-sl':   { border: '#94A3B8', text: '#94A3B8', bg: 'rgba(148,163,184,0.08)' },
  'normal':  { border: '#334155', text: '#64748B', bg: 'rgba(100,116,139,0.05)' },
};

export const badgeLabel = {
  normal: 'תקין', 'no-sl': 'אין SL', 'tp-hit': 'TP!', 'sl-hit': 'SL!',
  'near-tp': 'קרוב ל-TP', 'near-sl': 'קרוב ל-SL',
};

export const PALETTE = [
  '#3B82F6','#34D399','#F59E0B','#8B5CF6','#06B6D4',
  '#F87171','#EAB308','#A78BFA','#FB923C','#4ADE80',
];

// ── Simulated intraday data ───────────────────────────────────────────────────

export function generateIntraday(currentPrice, seedKey) {
  const open  = currentPrice * (0.99 + Math.random() * 0.02);
  const range = Math.abs(currentPrice - open) + currentPrice * 0.015;
  let seed = ((seedKey * 1000 + currentPrice * 37) % 1000) / 1000 || 0.5;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const points = [];
  for (let i = 0; i <= 12; i++) {
    const t     = i / 12;
    const drift = open + (currentPrice - open) * t;
    const noise = (rnd() - 0.5) * range * 0.6;
    const hour  = 9 + Math.floor(t * 6.5);
    const min   = i % 2 === 0 ? '30' : '00';
    points.push({ time: `${hour}:${min}`, price: Math.max(0.01, drift + noise) });
  }
  points[points.length - 1].price = currentPrice;
  return points;
}

// ── NYSE hours in Israel time ─────────────────────────────────────────────────

export function isNYSEOpenIsrael() {
  const now   = new Date();
  const month = now.getUTCMonth();
  const israelOffset = (month >= 3 && month <= 8) ? 3 : 2; // IDT/IST
  const d     = new Date(now.getTime() + israelOffset * 3_600_000);
  const day   = d.getUTCDay();
  const mins  = d.getUTCHours() * 60 + d.getUTCMinutes();
  return day <= 4 && mins >= 16 * 60 + 30 && mins < 23 * 60;
}
