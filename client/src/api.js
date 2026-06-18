const BASE = '/api';

async function req(path, options = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

export const fetchPositions     = ()         => req('/positions');
export const addPosition        = (body)     => req('/positions',         { method: 'POST', body: JSON.stringify(body) });
export const updatePosition     = (id, body) => req(`/positions/${id}`,   { method: 'PUT',  body: JSON.stringify(body) });
export const deletePosition     = (id)       => req(`/positions/${id}`,   { method: 'DELETE' });
export const refreshPrices      = ()         => req('/refresh-prices',    { method: 'POST' });
export const resetPositions     = ()         => req('/reset',             { method: 'POST' });
export const fetchMarketStatus  = ()         => req('/market-status');

// Notifications
export const fetchNotifications = ()         => req('/notifications');
export const addNotification    = (body)     => req('/notifications',     { method: 'POST', body: JSON.stringify(body) });

// Undo/Redo
export const fetchUndoHistory   = ()         => req('/undo-history');
export const saveUndoState      = (body)     => req('/undo-save',         { method: 'POST', body: JSON.stringify(body) });
export const undoLastChange     = ()         => req('/undo',              { method: 'POST' });
