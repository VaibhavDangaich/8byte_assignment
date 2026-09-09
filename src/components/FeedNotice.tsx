import type { Portfolio } from '@/lib/types';

function countdownLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export default function FeedNotice({
  portfolio,
  retryIn,
  error,
}: {
  portfolio: Portfolio;
  retryIn: number;
  error: string | null;
}) {
  if (portfolio.rateLimit) {
    return (
      <div className="rounded-lg border border-loss/30 bg-loss-wash/70 px-4 py-3 backdrop-blur-xl text-sm text-loss">
        <p className="font-medium">Yahoo Finance is rate limiting this address.</p>
        <p className="mt-1 text-ink-soft">
          Prices below are the last ones received. Trying again in{' '}
          <span className="tnum font-medium text-loss">{countdownLabel(Math.max(retryIn, 0))}</span>
          . This page updates on its own once the feed lets us back in.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-loss/30 bg-loss-wash/70 px-4 py-3 backdrop-blur-xl text-sm text-loss">
        <p className="font-medium">Live prices stopped updating.</p>
        <p className="mt-1 text-ink-soft">{error}. Showing the last figures received.</p>
      </div>
    );
  }

  if (portfolio.failures > 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface/75 px-4 py-3 backdrop-blur-xl text-sm text-ink-soft">
        {portfolio.failures} of 26 holdings have no live price and are held at cost. Hover any n/a to see why.
      </div>
    );
  }

  return null;
}
