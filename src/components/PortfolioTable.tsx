'use client';

import { memo, useMemo, useState } from 'react';
import { amount, percent, price, signedAmount, signedPercent } from '@/lib/format';
import type { Portfolio, Row, Sector } from '@/lib/types';

const ZONES = [
  { label: 'Position', span: 6 },
  { label: 'Live market', span: 3 },
  { label: 'Fundamentals', span: 2 },
];

const COLUMNS = [
  { label: 'Particulars', align: 'text-left' },
  { label: 'Purchase', align: 'text-right' },
  { label: 'Qty', align: 'text-right' },
  { label: 'Investment', align: 'text-right' },
  { label: 'Weight', align: 'text-right' },
  { label: 'NSE/BSE', align: 'text-left' },
  { label: 'CMP', align: 'text-right' },
  { label: 'Present value', align: 'text-right' },
  { label: 'Gain / loss', align: 'text-right' },
  { label: 'P/E', align: 'text-right' },
  { label: 'Latest earnings', align: 'text-right' },
];

const EDGE = 'border-l border-white/10';
const num = 'px-4 py-3 text-right tnum whitespace-nowrap';

function Missing({ reason }: { reason: string | null }) {
  return (
    <span className="cursor-help text-ink-faint" title={reason ?? 'not available'}>
      n/a
    </span>
  );
}

const Holding = memo(function Holding({ row, widest }: { row: Row; widest: number }) {
  const up = (row.gainLoss ?? 0) >= 0;

  return (
    <tr className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-surface/85 px-4 py-3 text-left font-medium whitespace-nowrap backdrop-blur-xl"
      >
        {row.name}
      </th>
      <td className={`${num} text-ink-soft`}>{price(row.purchasePrice)}</td>
      <td className={`${num} text-ink-soft`}>{row.qty}</td>
      <td className={num}>{amount(row.investment)}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="flex items-center justify-end gap-2">
          <span className="h-1 w-10 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <span
              className="block h-full rounded-full bg-accent/70"
              style={{ width: `${(row.weight / widest) * 100}%` }}
            />
          </span>
          <span className="w-12 text-right text-ink-soft tnum">{percent(row.weight)}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-left text-xs tracking-wide text-ink-soft whitespace-nowrap">
        {row.exchange}
      </td>

      <td className={`${num} ${EDGE} font-medium`}>
        {row.cmp === null ? (
          <Missing reason={row.quoteError} />
        ) : (
          <span key={row.cmp} className="settle inline-block rounded px-1">
            {price(row.cmp)}
          </span>
        )}
      </td>
      <td className={num}>
        {row.presentValue === null ? (
          <Missing reason={row.quoteError} />
        ) : (
          amount(row.presentValue)
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {row.gainLoss === null || row.gainLossPct === null ? (
          <Missing reason={row.quoteError} />
        ) : (
          <span
            className={`inline-flex items-baseline justify-end gap-2 rounded px-2 py-0.5 tnum ${
              up ? 'bg-gain-wash text-gain' : 'bg-loss-wash text-loss'
            }`}
          >
            <span className="font-medium">{signedAmount(row.gainLoss)}</span>
            <span className="text-xs opacity-80">{signedPercent(row.gainLossPct)}</span>
          </span>
        )}
      </td>

      <td className={`${num} ${EDGE} text-ink-soft`}>
        {row.peRatio === null ? (
          <Missing reason={row.fundamentalsError ?? 'not reported by Google Finance'} />
        ) : (
          row.peRatio.toFixed(2)
        )}
      </td>
      <td className={`${num} text-ink-soft`}>
        {row.eps === null ? (
          <Missing reason={row.fundamentalsError ?? 'not reported by Google Finance'} />
        ) : (
          <>
            {price(row.eps)}
            {row.fiscalPeriod && (
              <span className="ml-2 text-xs text-ink-faint">{row.fiscalPeriod}</span>
            )}
          </>
        )}
      </td>
    </tr>
  );
});

function SectorBand({
  sector,
  shown,
  filtered,
}: {
  sector: Sector;
  shown: number;
  filtered: boolean;
}) {
  const up = sector.gainLoss >= 0;

  return (
    <tr className="bg-white/[0.06]">
      <th
        scope="rowgroup"
        className="sticky left-0 z-10 bg-sunk/80 py-2.5 pr-4 pl-4 backdrop-blur-xl text-left whitespace-nowrap"
      >
        <span className="border-l-2 border-accent pl-2.5 text-xs font-semibold tracking-[0.12em] uppercase">
          {sector.name}
        </span>
      </th>
      <td colSpan={2} className="px-4 py-2.5 text-right text-xs text-ink-soft whitespace-nowrap">
        {filtered ? `${shown} of ${sector.rows.length} shown` : `${sector.rows.length} holdings`}
      </td>

      {filtered ? (
        <td colSpan={8} />
      ) : (
        <>
          <td className={`${num} py-2.5 text-xs font-semibold`}>{amount(sector.investment)}</td>
          <td className={`${num} py-2.5 text-xs font-semibold text-ink-soft`}>
            {percent(sector.weight, 1)}
          </td>
          <td />
          <td className={`${num} ${EDGE} py-2.5 text-xs font-semibold`} />
          <td className={`${num} py-2.5 text-xs font-semibold`}>{amount(sector.presentValue)}</td>
          <td className="px-4 py-2.5 text-right whitespace-nowrap">
            <span className={`text-xs font-semibold tnum ${up ? 'text-gain' : 'text-loss'}`}>
              {signedAmount(sector.gainLoss)}
              <span className="ml-2 opacity-80">{signedPercent(sector.gainLossPct)}</span>
            </span>
          </td>
          <td className={EDGE} />
          <td />
        </>
      )}
    </tr>
  );
}

export default function PortfolioTable({ portfolio }: { portfolio: Portfolio }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const filtered = term.length > 0;

  const groups = useMemo(
    () =>
      portfolio.sectors
        .map((sector) => ({
          sector,
          rows: filtered
            ? sector.rows.filter(
                (row) =>
                  row.name.toLowerCase().includes(term) ||
                  row.exchange.toLowerCase().includes(term) ||
                  row.sector.toLowerCase().includes(term),
              )
            : sector.rows,
        }))
        .filter((group) => group.rows.length > 0),
    [portfolio.sectors, term, filtered],
  );

  const widest = useMemo(
    () => Math.max(...portfolio.sectors.flatMap((s) => s.rows.map((r) => r.weight))),
    [portfolio.sectors],
  );

  const shown = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const { totals } = portfolio;

  return (
    <section aria-label="Holdings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Holdings</h2>

        <div className="flex items-center gap-3">
          {filtered && (
            <span className="text-xs text-ink-soft tnum">
              {shown} of 26 {shown === 1 ? 'holding' : 'holdings'}
            </span>
          )}
          <label className="relative">
            <span className="sr-only">Search holdings</span>
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, sector or code"
              className="w-56 rounded-md border border-white/10 bg-surface/70 py-2 pr-3 pl-9 backdrop-blur-xl text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none sm:w-72"
            />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-surface/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <table className="w-full min-w-[1120px] border-collapse text-[13px]">
          <caption className="sr-only">Holdings grouped by sector</caption>
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-20 bg-surface/85 backdrop-blur-xl" />
              {ZONES.map((zone, index) => (
                <th
                  key={zone.label}
                  colSpan={zone.span - (index === 0 ? 1 : 0)}
                  scope="colgroup"
                  className={`px-4 pt-3 pb-1 text-left text-[10px] font-semibold tracking-[0.16em] text-ink-faint uppercase ${
                    index === 0 ? '' : EDGE
                  }`}
                >
                  {zone.label}
                </th>
              ))}
            </tr>
            <tr className="border-b border-white/15">
              {COLUMNS.map((column, index) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`px-4 pb-2.5 text-xs font-semibold tracking-wide text-ink-soft whitespace-nowrap ${column.align} ${
                    index === 0 ? 'sticky left-0 z-20 bg-surface/85 backdrop-blur-xl' : ''
                  } ${index === 6 || index === 9 ? EDGE : ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map(({ sector, rows }) => (
            <tbody key={sector.name} className="group">
              <SectorBand sector={sector} shown={rows.length} filtered={filtered} />
              {rows.map((row) => (
                <Holding key={row.yahoo} row={row} widest={widest} />
              ))}
            </tbody>
          ))}

          {!filtered && (
            <tfoot>
              <tr className="border-t-2 border-white/20">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface/85 px-4 py-3.5 text-left font-semibold backdrop-blur-xl whitespace-nowrap"
                >
                  Total
                </th>
                <td colSpan={2} />
                <td className={`${num} py-3.5 font-semibold`}>{amount(totals.investment)}</td>
                <td className={`${num} py-3.5 font-semibold text-ink-soft`}>100.0%</td>
                <td />
                <td className={`${num} ${EDGE}`} />
                <td className={`${num} py-3.5 font-semibold`}>{amount(totals.presentValue)}</td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <span
                    className={`inline-flex items-baseline gap-2 rounded px-2 py-0.5 font-semibold tnum ${
                      totals.gainLoss >= 0 ? 'bg-gain-wash text-gain' : 'bg-loss-wash text-loss'
                    }`}
                  >
                    {signedAmount(totals.gainLoss)}
                    <span className="text-xs opacity-80">{signedPercent(totals.gainLossPct)}</span>
                  </span>
                </td>
                <td className={EDGE} />
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {filtered && shown === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          Nothing matches “{query}”. Try a stock name, a sector, or an exchange code.
        </p>
      )}
    </section>
  );
}
