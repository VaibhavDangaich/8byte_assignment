import { holdings } from './holdings';
import type { Fundamentals, Portfolio, Quote, Row, Sector, Totals } from './types';

export type Resolved<T> = { value: T } | { error: string };

function totalsOf(rows: Row[]): Totals {
  const investment = rows.reduce((sum, r) => sum + r.investment, 0);
  const presentValue = rows.reduce((sum, r) => sum + (r.presentValue ?? r.investment), 0);
  const gainLoss = presentValue - investment;
  return { investment, presentValue, gainLoss, gainLossPct: investment ? gainLoss / investment : 0 };
}

export function buildPortfolio(
  quotes: Map<string, Resolved<Quote>>,
  fundamentals: Map<string, Resolved<Fundamentals>>,
  fetchedAt: Date,
  stale: boolean,
): Portfolio {
  const totalInvestment = holdings.reduce((sum, h) => sum + h.purchasePrice * h.qty, 0);

  const rows = holdings.map<Row>((h) => {
    const investment = h.purchasePrice * h.qty;
    const q = quotes.get(h.yahoo);
    const f = fundamentals.get(h.google);
    const quote = q && 'value' in q ? q.value : null;
    const fund = f && 'value' in f ? f.value : null;
    const cmp = quote?.cmp ?? null;
    const presentValue = cmp === null ? null : cmp * h.qty;
    const prev = quote?.previousClose;

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
    fetchedAt: fetchedAt.toISOString(),
    stale,
    failures: rows.filter((r) => r.cmp === null).length,
  };
}
