import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'positions.json');

export const defaultPositions = [
  { id: 1, symbol: 'PFE',  buyDate: '2026-02-02', buyPrice: 25.55,   qty: 10, sl: 22,   tp: 35,  broker: 'קולמקס', currentPrice: 26.20 },
  { id: 2, symbol: 'CNK',  buyDate: '2025-06-17', buyPrice: 32,      qty: 20, sl: 25,   tp: 35,  broker: 'קולמקס', currentPrice: 33.13 },
  { id: 3, symbol: 'QUBT', buyDate: '2025-09-22', buyPrice: 19.87,   qty: 25, sl: 5,    tp: 25,  broker: 'קולמקס', currentPrice: 10.45 },
  { id: 4, symbol: 'RBLX', buyDate: '2026-06-02', buyPrice: 46,      qty: 15, sl: 39.8, tp: 75,  broker: 'קולמקס', currentPrice: 43.93 },
  { id: 5, symbol: 'HOOD', buyDate: '2026-06-05', buyPrice: 87.32,   qty: 16, sl: null, tp: 111, broker: 'בלינק',  currentPrice: 93.92 },
  { id: 6, symbol: 'LUV',  buyDate: '2026-06-05', buyPrice: 41.5650, qty: 20, sl: 38,   tp: 48,  broker: 'קולמקס', currentPrice: 47.11 },
  { id: 7, symbol: 'BAC',  buyDate: '2026-06-15', buyPrice: 53.83,   qty: 4,  sl: 48,   tp: null,broker: 'קולמקס', currentPrice: 56.47 },
];

export async function readPositions() {
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error('empty');
  } catch (e) {
    // First run or corrupt file → seed with defaults
    await writePositions(defaultPositions);
    return JSON.parse(JSON.stringify(defaultPositions));
  }
}

export async function writePositions(positions) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(positions, null, 2), 'utf-8');
}
