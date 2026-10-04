import { aggregateHistoryByInterval, nftTripleKey } from '../src/services/historyService';
import { __test_computeBaselines } from '../src/services/historyService';

let mismatches = 0, total = 0;
const TFS = ['24h','7D','30D','90D'];
const stepMs: Record<string, number> = {'24h':3600e3,'7D':43200e3,'30D':86400e3,'90D':259200e3};
const spanMs: Record<string, number> = {'24h':86400e3,'7D':7*86400e3,'30D':30*86400e3,'90D':90*86400e3};
for (let i = 0; i < 500; i++) {
  const tf = TFS[i % 4];
  const now = Date.now();
  const raw: any[] = [];
  const hist = spanMs[tf] * (0.3 + Math.random() * 1.4); // some series shorter than window
  const gap = tf === '24h' || tf === '7D' ? 3600e3 : 86400e3;
  for (let t = now - hist; t <= now; t += gap * (0.5 + Math.random())) raw.push({ timestamp: new Date(t).toISOString(), price_sfl: 1 + Math.random() * 5 });
  // chart: full series
  const chartFirst = (aggregateHistoryByInterval(raw, tf, 0)[0] as any).price_sfl;
  // movers: restricted window like fetchMarketMovers
  const target = now - spanMs[tf];
  const pad = (tf === '24h' || tf === '7D') ? 4*3600e3 : 5*86400e3;
  const win = raw.filter(r => { const t = new Date(r.timestamp).getTime(); return t >= target - pad && t <= target + stepMs[tf] + pad; });
  if (win.length === 0) continue;
  const { baselineMap } = __test_computeBaselines(win.map(r => ({ key: 'x', timestamp: r.timestamp, value: r.price_sfl })), tf, now);
  total++;
  if (Math.abs(baselineMap['x'] - chartFirst) > 1e-5) mismatches++;
}
console.log({ total, mismatches });
console.log(nftTripleKey('wearables', 5, 'Parsnip (Wearable)'), nftTripleKey('collectibles', 5, 'Parsnip'));
process.exit(0);
