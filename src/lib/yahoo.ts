import { errorMessage, pool } from './async';
import { holdings } from './holdings';
import type { Resolved } from './portfolio';
import type { Quote } from './types';

const BATCH_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const CHART_URL = 'https://query2.finance.yahoo.com/v8/finance/chart';
const PAGE_URL = 'https://finance.yahoo.com/quote';
const CREDENTIAL_URL = 'https://fc.yahoo.com';
const CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const TTL_FAST_MS = 12_000;
const BOOTSTRAP_WAIT_MS = 2_500;
const TTL_PAGE_MS = 60_000;
const FALLBACK_CONCURRENCY = 2;
const PAGE_CONCURRENCY = 4;
const BACKOFF_MS = [30_000, 60_000, 120_000, 300_000];

class RateLimited extends Error {
  constructor() {
    super('Yahoo Finance is rate limiting this address');
  }
}

const headers = (extra?: HeadersInit) => ({ 'User-Agent': USER_AGENT, ...extra });

function readQuote(raw: Record<string, unknown>): Quote | null {
  const cmp = raw.regularMarketPrice;
  if (typeof cmp !== 'number') return null;
  return {
    cmp,
    previousClose:
      typeof raw.regularMarketPreviousClose === 'number' ? raw.regularMarketPreviousClose : null,
    currency: typeof raw.currency === 'string' ? raw.currency : 'INR',
  };
}

let session: { cookie: string; crumb: string } | null = null;

async function openSession() {
  const seed = await fetch(CREDENTIAL_URL, { headers: headers(), signal: AbortSignal.timeout(8_000) });
  const cookie = seed.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error('Yahoo Finance did not issue a session cookie');

  const res = await fetch(CRUMB_URL, {
    headers: headers({ cookie }),
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status === 429) throw new RateLimited();

  const crumb = (await res.text()).trim();
  if (!crumb || crumb.includes(' ')) throw new Error('Yahoo Finance did not issue a crumb');
  return { cookie, crumb };
}

async function fetchBatch(symbols: string[]) {
  session ??= await openSession();
  const url = `${BATCH_URL}?symbols=${symbols.join(',')}&crumb=${encodeURIComponent(session.crumb)}`;
  const res = await fetch(url, {
    headers: headers({ cookie: session.cookie, Accept: 'application/json' }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    session = null;
    throw new Error('Yahoo Finance session expired');
  }
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

  const result = (await res.json())?.quoteResponse?.result;
  if (!Array.isArray(result)) throw new Error('unexpected Yahoo Finance response');

  const quotes = new Map<string, Quote>();
  for (const raw of result) {
    const quote = readQuote(raw);
    if (quote && typeof raw.symbol === 'string') quotes.set(raw.symbol, quote);
  }
  return quotes;
}

async function fetchOne(symbol: string): Promise<Quote> {
  const res = await fetch(`${CHART_URL}/${symbol}?interval=1d&range=1d`, {
    headers: headers({ Accept: 'application/json' }),
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });

  if (res.status === 404) throw new Error('not listed on Yahoo Finance');
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

  const meta = (await res.json())?.chart?.result?.[0]?.meta;
  const quote = meta && {
    regularMarketPrice: meta.regularMarketPrice,
    regularMarketPreviousClose: meta.chartPreviousClose ?? meta.previousClose,
    currency: meta.currency,
  };
  const parsed = quote && readQuote(quote);
  if (!parsed) throw new Error('no price in Yahoo Finance response');
  return parsed;
}

function readTag(html: string, testId: string) {
  const match = html.match(new RegExp(`data-testid="${testId}"[^>]*>([^<]+)<`));
  if (!match) return null;
  const value = Number(match[1].replace(/[^0-9.-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

async function fetchFromPage(symbol: string): Promise<Quote> {
  const res = await fetch(`${PAGE_URL}/${symbol}/`, {
    headers: headers({ 'Accept-Language': 'en-US,en;q=0.9' }),
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });

  if (res.status === 404) throw new Error('not listed on Yahoo Finance');
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

  const html = await res.text();
  const cmp = readTag(html, 'qsp-price');
  if (cmp === null) throw new Error('no price on Yahoo Finance page');

  const change = readTag(html, 'qsp-price-change');
  return { cmp, previousClose: change === null ? null : cmp - change, currency: 'INR' };
}

const store = new Map<string, Resolved<Quote>>();
let ttl = TTL_FAST_MS;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
let strikes = 0;
let retryAfter = 0;

function record(symbol: string, quote: Quote) {
  store.set(symbol, { value: quote });
}

function recordError(symbol: string, message: string) {
  const existing = store.get(symbol);
  if (!existing || 'error' in existing) store.set(symbol, { error: message });
}

function settle(nextTtl: number) {
  strikes = 0;
  retryAfter = 0;
  ttl = nextTtl;
  fetchedAt = Date.now();
}

async function perSymbol(
  symbols: string[],
  concurrency: number,
  fetcher: (symbol: string) => Promise<Quote>,
) {
  let limited = false;
  let priced = 0;
  await pool(symbols, concurrency, async (symbol) => {
    if (limited) return;
    try {
      record(symbol, await fetcher(symbol));
      priced++;
    } catch (err) {
      if (err instanceof RateLimited) limited = true;
      recordError(symbol, errorMessage(err));
    }
  });
  return priced;
}

async function load() {
  const symbols = holdings.map((h) => h.yahoo);

  try {
    const quotes = await fetchBatch(symbols);
    for (const symbol of symbols) {
      const quote = quotes.get(symbol);
      if (quote) record(symbol, quote);
      else recordError(symbol, 'not listed on Yahoo Finance');
    }
    settle(TTL_FAST_MS);
    return;
  } catch (err) {
    if (!(err instanceof RateLimited)) session = null;
  }

  if ((await perSymbol(symbols, FALLBACK_CONCURRENCY, fetchOne)) > 0) {
    settle(TTL_FAST_MS);
    return;
  }

  if ((await perSymbol(symbols, PAGE_CONCURRENCY, fetchFromPage)) > 0) {
    settle(TTL_PAGE_MS);
    return;
  }

  retryAfter = Date.now() + BACKOFF_MS[Math.min(strikes++, BACKOFF_MS.length - 1)];
}

export async function getQuotes() {
  const now = Date.now();
  if (now - fetchedAt >= ttl && now >= retryAfter && !inflight) {
    inflight = load().finally(() => {
      inflight = null;
    });
  }

  if (store.size === 0 && inflight) {
    await Promise.race([
      inflight,
      new Promise((resolve) => setTimeout(resolve, BOOTSTRAP_WAIT_MS)),
    ]);
  }

  const waiting = retryAfter - Date.now();
  return {
    quotes: new Map(store),
    feed: {
      fetchedAt: new Date(fetchedAt),
      stale: Date.now() - fetchedAt >= ttl,
      rateLimit:
        waiting > 0
          ? { retryAt: new Date(retryAfter).toISOString(), seconds: Math.ceil(waiting / 1000) }
          : null,
    },
  };
}
