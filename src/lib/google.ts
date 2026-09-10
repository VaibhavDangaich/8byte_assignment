import { errorMessage, pool } from './async';
import { holdings } from './holdings';
import type { Resolved } from './portfolio';
import type { Fundamentals } from './types';

const ENDPOINT = 'https://www.google.com/finance/quote';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TTL_MS = 6 * 60 * 60 * 1000;
const CONCURRENCY = 4;

function field(html: string, label: string) {
  const match = html.match(new RegExp(`>${label}</div><div class="[^"]*">([^<]+)</div>`));
  return match ? match[1].trim() : null;
}

function amount(raw: string | null) {
  if (!raw) return null;
  const value = Number(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const res = await fetch(`${ENDPOINT}/${symbol}?hl=en`, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Google Finance returned ${res.status}`);

  const html = await res.text();
  if (!html.includes('>Previous close</div>') && !html.includes('>P/E ratio</div>')) {
    throw new Error('no quote page on Google Finance');
  }

  return {
    price: amount(
      html.match(/class="gO24Ff">[^<]+<\/div>[\s\S]*?jsname="Pdsbrc"[^>]*>\s*<span>([^<]+)<\/span>/)?.[1] ??
        null,
    ),
    peRatio: amount(field(html, 'P/E ratio')),
    eps: amount(field(html, 'EPS')),
    lastReport: field(html, 'Last report'),
    fiscalPeriod: field(html, 'Fiscal period'),
  };
}

const store = new Map<string, Resolved<Fundamentals>>();
let fetchedAt = 0;
let inflight: Promise<void> | null = null;

function refresh() {
  if (inflight || Date.now() - fetchedAt < TTL_MS) return;
  inflight = pool(holdings, CONCURRENCY, async (h) => {
    try {
      store.set(h.google, { value: await fetchFundamentals(h.google) });
    } catch (err) {
      if (!store.has(h.google)) store.set(h.google, { error: errorMessage(err) });
    }
  })
    .then(() => {
      fetchedAt = Date.now();
    })
    .finally(() => {
      inflight = null;
    });
}

export function getFundamentals() {
  refresh();
  return { fundamentals: new Map(store), pending: inflight };
}
