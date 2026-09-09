'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Charts from '@/components/Charts';
import FeedNotice from '@/components/FeedNotice';
import PortfolioTable from '@/components/PortfolioTable';
import Summary from '@/components/Summary';
import type { Portfolio } from '@/lib/types';

const REFRESH_SECONDS = 15;

export default function Page() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextPoll, setNextPoll] = useState(REFRESH_SECONDS);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const res = await fetch('/api/portfolio');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `request failed with ${res.status}`);
      setPortfolio(body as Portfolio);
      setError(null);
      setNextPoll((body as Portfolio).rateLimit?.seconds ?? REFRESH_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setNextPoll(REFRESH_SECONDS);
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const tick = setInterval(() => {
      setNextPoll((seconds) => {
        if (seconds > 1) return seconds - 1;
        load();
        return REFRESH_SECONDS;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  if (!portfolio) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
        {error ? (
          <div className="rounded-lg border border-loss/30 bg-loss-wash/70 px-4 py-3 backdrop-blur-xl text-sm">
            <p className="font-medium text-loss">Could not reach the price feed.</p>
            <p className="mt-1 text-ink-soft">{error}. Retrying in {nextPoll}s.</p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Loading holdings…</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <Summary portfolio={portfolio} countdown={nextPoll} error={error} />
      <FeedNotice portfolio={portfolio} retryIn={nextPoll} error={error} />
      <Charts portfolio={portfolio} />
      <PortfolioTable portfolio={portfolio} />
      <footer className="border-t border-white/10 pt-4 text-xs leading-relaxed text-ink-soft">
        Prices come from unofficial Yahoo Finance endpoints; P/E and earnings are read off Google
        Finance pages. Both are delayed and unverified. Not investment advice.
      </footer>
    </main>
  );
}
