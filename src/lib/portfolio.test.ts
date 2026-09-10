import assert from 'node:assert/strict';
import test from 'node:test';
import { holdings } from './holdings';
import { buildPortfolio, type Resolved } from './portfolio';
import type { Fundamentals, Quote } from './types';

const SHEET_INVESTMENT: Record<string, number> = {
  'Financial Sector': 328450,
  'Tech Sector': 337820,
  Consumer: 263565,
  Power: 158860,
  'Pipe Sector': 198656,
  Others: 255709,
};
const SHEET_TOTAL = 1543060;

const quote = (cmp: number): Resolved<Quote> => ({
  value: { cmp },
});

const build = (quotes: Map<string, Resolved<Quote>>) =>
  buildPortfolio(quotes, new Map<string, Resolved<Fundamentals>>(), {
    fetchedAt: new Date(0),
    stale: false,
    rateLimit: null,
  });

test('investment and weights reconcile with the source spreadsheet', () => {
  const p = build(new Map(holdings.map((h) => [h.yahoo, quote(h.purchasePrice)])));

  assert.equal(p.totals.investment, SHEET_TOTAL);
  for (const s of p.sectors) assert.equal(s.investment, SHEET_INVESTMENT[s.name]);
  assert.equal(p.sectors.length, 6);

  const hdfc = p.sectors[0].rows[0];
  assert.equal(hdfc.name, 'HDFC Bank');
  assert.equal(hdfc.investment, 74500);
  assert.ok(Math.abs(hdfc.weight - 0.048280689) < 1e-9);

  const weights = p.sectors.reduce((sum, s) => sum + s.weight, 0);
  assert.ok(Math.abs(weights - 1) < 1e-12);
});

test('gain and loss follow the live price', () => {
  const p = build(new Map(holdings.map((h) => [h.yahoo, quote(h.purchasePrice * 1.1)])));

  assert.ok(Math.abs(p.totals.gainLoss - SHEET_TOTAL * 0.1) < 1e-6);
  assert.ok(Math.abs(p.totals.gainLossPct - 0.1) < 1e-12);
  for (const s of p.sectors) assert.ok(s.gainLoss > 0);
});

test('unpriced holdings are carried at cost and counted', () => {
  const quotes = new Map(holdings.map((h) => [h.yahoo, quote(h.purchasePrice)]));
  quotes.set('LTIM.NS', { error: 'symbol not found' });
  const p = build(quotes);

  const ltim = p.sectors[1].rows.find((r) => r.yahoo === 'LTIM.NS')!;
  assert.equal(ltim.cmp, null);
  assert.equal(ltim.presentValue, null);
  assert.equal(ltim.gainLoss, null);
  assert.equal(ltim.quoteError, 'symbol not found');

  assert.equal(p.failures, 1);
  assert.equal(p.totals.investment, SHEET_TOTAL);
  assert.equal(p.totals.presentValue, SHEET_TOTAL);
  assert.equal(p.sectors[1].investment, SHEET_INVESTMENT['Tech Sector']);
});
