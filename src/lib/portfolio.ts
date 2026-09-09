import { holdings } from './holdings';
import type { Fundamentals, Portfolio, Quote, RateLimit, Row, Sector, Totals } from './types';

export type Resolved<T> = { value: T } | { error: string };

function totalsOf(rows: Row[]): Totals {
  const investment = rows.reduce((sum, r) => sum + r.investment, 0);
  const presentValue = rows.reduce((sum, r) => sum + (r.presentValue ?? r.investment), 0);
  const gainLoss = presentValue - investment;
  return { investment, presentValue, gainLoss, gainLossPct: investment ? gainLoss / investment : 0 };
}

export type Feed = {
  fetchedAt: Date;
  stale: boolean;
  rateLimit: RateLimit | null;
};

export function buildPortfolio(
  quotes: Map<string, Resolved<Quote>>,
  fundamentals: Map<string, Resolved<Fundamentals>>,
  feed: Feed,
): Portfolio {
  const totalInvestment = holdings.reduce((sum, h) => sum + h.purchasePrice * h.qty, 0);

  const rows = holdings.map<Row>((h) => {
    const investment = h.purchasePrice * h.qty;
    const q = quotes.get(h.yahoo);
    const f = fundamentals.get(h.google);
    const quote = q && 'value' in q ? q.value : null;
    const fund = f && 'value' in f ? f.value : null;
    const cmp = quote?.cmp ?? fund?.price ?? null;
    const presentValue = cmp === null ? null : cmp * h.qty;
    const prev = quote?.previousClose;
    const priceSource = quote?.cmp != null ? 'yahoo' : fund?.price != null ? 'google' : null;

    return {
      ...h,
      investment,
      weight: investment / totalInvestment,
      cmp,
      presentValue,
      gainLoss: presentValue === null ? null : presentValue - investment,
      gainLossPct: presentValue === null ? null : (presentValue - investment) / investment,
      dayChangePct: cmp === null || !prev ? null : (cmp - prev) / prev,
      peRatio: fund?.peRatio ?? null,
      eps: fund?.eps ?? null,
      lastReport: fund?.lastReport ?? null,
      fiscalPeriod: fund?.fiscalPeriod ?? null,
      priceSource,
      quoteError: q && 'error' in q ? q.error : null,
      fundamentalsError: f && 'error' in f ? f.error : null,
    };
  });

  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.sector);
    if (bucket) bucket.push(row);
    else grouped.set(row.sector, [row]);
  }

  const sectors: Sector[] = [...grouped].map(([name, sectorRows]) => ({
    name,
    rows: sectorRows,
    weight: sectorRows.reduce((sum, r) => sum + r.weight, 0),
    ...totalsOf(sectorRows),
  }));

  return {
    sectors,
    totals: totalsOf(rows),
    fetchedAt: feed.fetchedAt.toISOString(),
    stale: feed.stale,
    rateLimit: feed.rateLimit,
    failures: rows.filter((r) => r.cmp === null).length,
  };
}
