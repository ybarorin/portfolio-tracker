import { useState, useEffect, useCallback, useRef } from 'react';
import Summary      from './components/Summary.jsx';
import AlertsSection from './components/AlertsSection.jsx';
import PositionCard from './components/PositionCard.jsx';
import PieChart     from './components/PieChart.jsx';
import TrendChart   from './components/TrendChart.jsx';
import BarsChart    from './components/BarsChart.jsx';
import {
  fetchPositions, addPosition, updatePosition,
  deletePosition, refreshPrices, resetPositions,
  addNotification, saveUndoState, undoLastChange,
} from './api.js';
import { enrich, generateIntraday, isNYSEOpenIsrael } from './utils.js';

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [positions,   setPositions]   = useState([]);
  const [expandedId,  setExpandedId]  = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saveMsg,     setSaveMsg]     = useState('נתוני הפוזיציות שמורים בשרת');
  const [saveSaved,   setSaveSaved]   = useState(false);
  const [error,       setError]       = useState(null);
  const [marketOpen,  setMarketOpen]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isDirty,     setIsDirty]     = useState(false);
  const [canUndo,     setCanUndo]     = useState(false);

  // Intraday cache lives in a ref so updates don't cause re-renders
  const intradayCacheRef = useRef({});
  const autoTimerRef     = useRef(null);
  const undoStackRef     = useRef([]);
  const notifiedRef      = useRef({}); // Track which TP/SL we've already notified about

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Load positions
    fetchPositions()
      .then(data => {
        setPositions(data);
        undoStackRef.current = [JSON.stringify(data)];
        setExpandedId(data[0]?.id ?? null);
      })
      .catch(e => setError('לא ניתן לטעון פוזיציות: ' + e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Market-status polling (every minute) ───────────────────────────────────

  useEffect(() => {
    const check = () => setMarketOpen(isNYSEOpenIsrael());
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-refresh every 5 min when market is open ───────────────────────────

  const doRefresh = useCallback(async (auto = false) => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await refreshPrices();
      const oldPositions = positions;
      setPositions(result.positions);

      // Check for price crossings
      checkPriceCrossings(oldPositions, result.positions);

      intradayCacheRef.current = {}; // invalidate intraday on price update
      setLastRefresh(new Date());
      flash(auto ? 'עודכן אוטומטית ✓' : 'מחירים עודכנו ✓');
      if (result.errors?.length) {
        setError('חלק מהמניות לא עודכנו: ' + result.errors.join(', '));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, [positions]);

  useEffect(() => {
    clearInterval(autoTimerRef.current);
    if (marketOpen) {
      autoTimerRef.current = setInterval(() => doRefresh(true), AUTO_REFRESH_MS);
    }
    return () => clearInterval(autoTimerRef.current);
  }, [marketOpen, doRefresh]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function flash(msg) {
    setSaveMsg(msg);
    setSaveSaved(true);
    setTimeout(() => { setSaveMsg('נתוני הפוזיציות שמורים בשרת'); setSaveSaved(false); }, 2000);
  }

  function getIntraday(pos) {
    if (!intradayCacheRef.current[pos.id]) {
      intradayCacheRef.current[pos.id] = generateIntraday(pos.currentPrice, pos.id);
    }
    return intradayCacheRef.current[pos.id];
  }

  // Check if price crossed TP/SL levels
  function checkPriceCrossings(oldPositions, newPositions) {
    newPositions.forEach(newPos => {
      const oldPos = oldPositions.find(p => p.id === newPos.id);
      if (!oldPos) return;

      const notifKey = `${newPos.id}`;
      if (!notifiedRef.current[notifKey]) {
        notifiedRef.current[notifKey] = {};
      }

      // Check TP
      if (newPos.tp && oldPos.currentPrice !== newPos.currentPrice) {
        const crossedTP = (oldPos.currentPrice <= newPos.tp && newPos.currentPrice >= newPos.tp) ||
                          (oldPos.currentPrice >= newPos.tp && newPos.currentPrice <= newPos.tp);
        if (crossedTP && !notifiedRef.current[notifKey].tp) {
          notifiedRef.current[notifKey].tp = true;
          triggerNotification(newPos, 'tp-hit');
        }
      }

      // Check SL
      if (newPos.sl && oldPos.currentPrice !== newPos.currentPrice) {
        const crossedSL = (oldPos.currentPrice >= newPos.sl && newPos.currentPrice <= newPos.sl) ||
                          (oldPos.currentPrice <= newPos.sl && newPos.currentPrice >= newPos.sl);
        if (crossedSL && !notifiedRef.current[notifKey].sl) {
          notifiedRef.current[notifKey].sl = true;
          triggerNotification(newPos, 'sl-hit');
        }
      }
    });
  }

  function triggerNotification(pos, type) {
    const title = type === 'tp-hit' ? '🎯 יעד רווח הושג!' : '🛑 Stop Loss הופעל!';
    const level = type === 'tp-hit' ? pos.tp : pos.sl;

    // Browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const body = type === 'tp-hit'
        ? `${pos.symbol} הגיע ל-TP: ${level}$ (מחיר נוכחי: ${pos.currentPrice}$)`
        : `${pos.symbol} הגיע ל-SL: ${level}$ (מחיר נוכחי: ${pos.currentPrice}$)`;

      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `${type}-${pos.id}`,
        requireInteraction: true,
      });

      // Also send to service worker for background notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          data: { title, symbol: pos.symbol, level, price: pos.currentPrice, notifType: type }
        });
      }
    }

    // UI alert
    flash(`${title} ${pos.symbol} ב-${level}$`);

    // Save to server
    addNotification({
      positionId: pos.id,
      symbol: pos.symbol,
      type,
      price: pos.currentPrice,
      level,
    }).catch(e => console.warn('Failed to save notification:', e));
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleUpdate(id, changes) {
    try {
      setPositions(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, ...changes } : p);

        // Save to undo stack
        undoStackRef.current.push(JSON.stringify(updated));
        setCanUndo(true);

        // Mark as dirty
        setIsDirty(true);
        setSaveMsg('שינויים לא שמורים ⚠');

        return updated;
      });

      // Auto-save to server after a short delay
      setTimeout(async () => {
        try {
          await updatePosition(id, changes);
          setIsDirty(false);
          flash('נשמר ✓');
        } catch (e) { setError(e.message); }
      }, 500);
    } catch (e) { setError(e.message); }
  }

  async function handleUndo() {
    if (undoStackRef.current.length > 1) {
      undoStackRef.current.pop(); // Remove current state
      const prevState = JSON.parse(undoStackRef.current[undoStackRef.current.length - 1]);
      setPositions(prevState);
      setCanUndo(undoStackRef.current.length > 1);
      setIsDirty(true);
      flash('בוטל ↶');
    }
  }

  async function handleAdd() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const newPos = await addPosition({
        symbol: 'NEW', buyDate: today, buyPrice: 1, qty: 1,
        sl: null, tp: null, broker: '', currentPrice: 1,
      });
      setPositions(prev => {
        const updated = [...prev, newPos];
        undoStackRef.current.push(JSON.stringify(updated));
        setCanUndo(true);
        return updated;
      });
      setExpandedId(newPos.id);
    } catch (e) { setError(e.message); }
  }

  async function handleRemove(id) {
    try {
      await deletePosition(id);
      setPositions(prev => {
        const updated = prev.filter(p => p.id !== id);
        undoStackRef.current.push(JSON.stringify(updated));
        setCanUndo(true);
        return updated;
      });
      delete intradayCacheRef.current[id];
      if (expandedId === id) setExpandedId(null);
    } catch (e) { setError(e.message); }
  }

  async function handleReset() {
    if (!confirm('לאפס את כל הנתונים לברירת המחדל המקורית? פעולה זו תמחק שינויים ידניים.')) return;
    try {
      const data = await resetPositions();
      setPositions(data);
      undoStackRef.current = [JSON.stringify(data)];
      setCanUndo(false);
      intradayCacheRef.current = {};
      setExpandedId(data[0]?.id ?? null);
      flash('אופס לברירת מחדל ✓');
    } catch (e) { setError(e.message); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const enriched = positions.map(enrich);

  if (loading) {
    return (
      <div className="wrap" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <div style={{ color: '#9FB4CC' }}>טוען פוזיציות…</div>
      </div>
    );
  }

  return (
    <div className="wrap">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="header">
        <div>
          <div className="eyebrow">תיק השקעות — מעקב חי</div>
          <h1>הפורטפוליו שלי</h1>
        </div>
        <div className="header-right">
          <button className="btn" onClick={() => doRefresh(false)} disabled={refreshing}>
            {refreshing ? '⏳ מרענן…' : '↻ רענן מחירים'}
          </button>
          <button
            className="btn"
            onClick={handleUndo}
            disabled={!canUndo}
            title="בטל שינוי אחרון"
            style={{ opacity: canUndo ? 1 : 0.5 }}
          >
            ↶ בטל
          </button>
          <div style={{ fontSize: 12, color: marketOpen ? '#34D399' : '#5B6B7C' }}>
            {marketOpen
              ? '🟢 שוק פתוח — רענון אוטומטי כל 5 דקות'
              : '⚪ שוק סגור — רענון אוטומטי כבוי'}
          </div>
        </div>
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div className={`save-status${saveSaved ? ' saved' : ''}${isDirty ? ' dirty' : ''}`}>
        {saveMsg}
        {lastRefresh && ` | עדכון אחרון: ${lastRefresh.toLocaleTimeString('he-IL')}`}
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="error-box">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <Summary enriched={enriched} />

      {/* ── TP/SL alerts ───────────────────────────────────────────────────── */}
      <AlertsSection enriched={enriched} />

      {/* ── Positions list ─────────────────────────────────────────────────── */}
      <div className="section-title">פוזיציות</div>
      {positions.map(pos => (
        <PositionCard
          key={pos.id}
          pos={pos}
          isExpanded={expandedId === pos.id}
          intraday={expandedId === pos.id ? getIntraday(pos) : null}
          onToggle={() => setExpandedId(prev => prev === pos.id ? null : pos.id)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
      <button className="add-btn" onClick={handleAdd}>+ הוסף פוזיציה</button>

      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="section-title">הקצאת התיק לפי שווי</div>
          <PieChart enriched={enriched} />
        </div>
        <div className="chart-card">
          <div className="section-title">מגמת שווי התיק (30 ימים, מדומה)</div>
          <TrendChart enriched={enriched} />
          <div className="chart-note" style={{ marginTop: 8, marginBottom: 0 }}>
            * מגמה מדומה לצורך הדגמה, מסתיימת בשווי התיק הנוכחי.
          </div>
        </div>
      </div>

      <div className="bars-card">
        <div className="section-title">רווח/הפסד לפי מניה</div>
        <BarsChart enriched={enriched} />
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div className="disclaimer">
        האפליקציה מציגה ניתוח אוטומטי בהתבסס על הכללים (TP/SL) שהזנת — זהו כלי עזר בלבד ולא ייעוץ השקעות.
        ההחלטה הסופית על קנייה, מכירה או שינוי יעדים היא שלך בלבד.
        <br /><br />
        <button className="btn" onClick={handleReset} style={{ margin: '8px auto', display: 'flex' }}>
          איפוס לנתוני ברירת המחדל
        </button>
      </div>
    </div>
  );
}
