import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readPositions, writePositions, defaultPositions } from './db.js';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTIFICATIONS_FILE = join(__dirname, 'data/notifications.json');
const UNDO_FILE = join(__dirname, 'data/undo-history.json');

const app = express();
const PORT = process.env.PORT || 3001;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'] }));
app.use(express.json());

// ── Helper functions ──────────────────────────────────────────────────────────

async function readNotifications() {
  try {
    const data = await readFile(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

async function writeNotifications(notifications) {
  await writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
}

async function readUndoHistory() {
  try {
    const data = await readFile(UNDO_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { stack: [], index: -1 };
  }
}

async function writeUndoHistory(history) {
  await writeFile(UNDO_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

// Serve React build in production
const clientDist = join(__dirname, '../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// ── Positions CRUD ────────────────────────────────────────────────────────────

app.get('/api/positions', async (req, res) => {
  try { res.json(await readPositions()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/positions', async (req, res) => {
  try {
    const positions = await readPositions();
    const newId = Math.max(0, ...positions.map(p => p.id)) + 1;
    const newPos = { id: newId, ...req.body };
    positions.push(newPos);
    await writePositions(positions);
    res.json(newPos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/positions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const positions = await readPositions();
    const idx = positions.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    positions[idx] = { ...positions[idx], ...req.body, id };
    await writePositions(positions);
    res.json(positions[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/positions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    let positions = await readPositions();
    positions = positions.filter(p => p.id !== id);
    await writePositions(positions);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reset to defaults ─────────────────────────────────────────────────────────

app.post('/api/reset', async (req, res) => {
  try {
    const fresh = JSON.parse(JSON.stringify(defaultPositions));
    await writePositions(fresh);
    res.json(fresh);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Refresh prices via Finnhub ────────────────────────────────────────────────

app.post('/api/refresh-prices', async (req, res) => {
  if (!FINNHUB_KEY) {
    return res.status(500).json({
      error: 'FINNHUB_API_KEY לא מוגדר בקובץ .env — ראה הוראות ב-README'
    });
  }

  try {
    const positions = await readPositions();
    const symbols = [...new Set(positions.map(p => p.symbol))];

    // Fetch all quotes in parallel
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${symbol}`);
        const data = await r.json();
        // Finnhub returns { c: currentPrice, d: change, dp: changePct, h, l, o, pc }
        if (!data.c || data.c === 0) throw new Error(`No price for ${symbol}`);
        return { symbol, price: data.c, change: data.d, changePct: data.dp };
      })
    );

    const priceMap = {};
    const errors = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        priceMap[r.value.symbol] = r.value;
      } else {
        errors.push(r.reason?.message || 'unknown error');
      }
    });

    // Update positions with new prices
    let updated = false;
    positions.forEach(p => {
      if (priceMap[p.symbol]) {
        p.currentPrice = priceMap[p.symbol].price;
        p.lastChange = priceMap[p.symbol].change;
        p.lastChangePct = priceMap[p.symbol].changePct;
        updated = true;
      }
    });

    if (updated) await writePositions(positions);

    res.json({
      ok: true,
      updatedCount: Object.keys(priceMap).length,
      errors: errors.length > 0 ? errors : undefined,
      positions,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Notifications ────────────────────────────────────────────────────────────

app.get('/api/notifications', async (req, res) => {
  try { res.json(await readNotifications()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const notifications = await readNotifications();
    const newNotif = {
      id: Date.now(),
      positionId: req.body.positionId,
      symbol: req.body.symbol,
      type: req.body.type, // 'tp-hit' or 'sl-hit'
      price: req.body.price,
      level: req.body.level, // TP or SL value
      timestamp: new Date().toISOString(),
    };
    notifications.push(newNotif);
    await writeNotifications(notifications);
    res.json(newNotif);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Undo/Redo ─────────────────────────────────────────────────────────────────

app.get('/api/undo-history', async (req, res) => {
  try { res.json(await readUndoHistory()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/undo-save', async (req, res) => {
  try {
    const history = await readUndoHistory();
    // Save current state to undo stack
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(JSON.stringify(req.body.state));
    history.index = history.stack.length - 1;
    await writeUndoHistory(history);
    res.json({ ok: true, canUndo: history.index > 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/undo', async (req, res) => {
  try {
    const history = await readUndoHistory();
    if (history.index > 0) {
      history.index--;
      await writeUndoHistory(history);
      const prevState = JSON.parse(history.stack[history.index]);
      res.json({ ok: true, state: prevState, canUndo: history.index > 0 });
    } else {
      res.status(400).json({ error: 'No undo history' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Market status ─────────────────────────────────────────────────────────────

app.get('/api/market-status', (req, res) => {
  res.json({ isOpen: isNYSEOpen(), serverTime: new Date().toISOString() });
});

/**
 * Returns true during NYSE trading hours converted to Israel time.
 * NYSE: 09:30–16:00 ET  →  16:30–23:00 Israel (IDT, UTC+3, summer)
 * Trading days: Sunday–Thursday (Israel work week ≈ US Mon–Fri)
 *
 * Israel DST (IDT = UTC+3): roughly late March → late October
 * Israel standard (IST = UTC+2): late October → late March
 */
function isNYSEOpen() {
  const now = new Date();
  // Determine Israel UTC offset (simplified DST approximation)
  const month = now.getUTCMonth(); // 0-indexed
  // IDT (UTC+3): April(3) – September(8) inclusive, plus parts of March/Oct
  const israelOffset = (month >= 3 && month <= 8) ? 3 : 2;

  const israelMs = now.getTime() + israelOffset * 3_600_000;
  const d = new Date(israelMs);
  const day = d.getUTCDay();                        // 0=Sun … 6=Sat
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();

  const isWeekday = day >= 0 && day <= 4;           // Sun–Thu
  const isInHours = mins >= 16 * 60 + 30 && mins < 23 * 60;
  return isWeekday && isInHours;
}

// ── SPA fallback (must be after all API routes) ───────────────────────────────
if (existsSync(clientDist)) {
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio server → http://localhost:${PORT}`);
  console.log(`   Finnhub API key: ${FINNHUB_KEY ? '✓ loaded' : '✗ MISSING — copy .env.example to .env and add your key'}`);
  console.log(`   NYSE open now:   ${isNYSEOpen() ? '✓ yes (auto-refresh active)' : '✗ no (auto-refresh paused)'}\n`);
});
