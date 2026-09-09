import Decorative from "./Decorative";
import ParticleText from "./ParticleText";
import { amount, clock, signedAmount, signedPercent } from "@/lib/format";
import type { Portfolio } from "@/lib/types";

function Figure({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-ink-soft uppercase">
        {label}
      </dt>
      <dd className={`mt-1.5 text-xl tnum ${className}`}>{value}</dd>
    </div>
  );
}

export default function Summary({
  portfolio,
  countdown,
  error,
}: {
  portfolio: Portfolio;
  countdown: number;
  error: string | null;
}) {
  const { totals, rateLimit } = portfolio;
  const up = totals.gainLoss >= 0;

  return (
    <header className="relative overflow-hidden rounded-xl border border-white/10 bg-surface/75 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="sr-only">Portfolio</h1>
        <Decorative>
          <ParticleText
            text="Portfolio"
            className="font-display h-28 w-full sm:h-40"
            fontSize="clamp(3.5rem, 13vw, 9rem)"
            fontWeight={700}
            fontFamily="inherit"
            color="#ffffff"
            highlightColor="#a78bfa"
            particleSize={2.4}
            density={3}
            scatter={160}
            gatherDuration={1500}
            stagger={380}
            pointerRepel={42}
            repelRadius={120}
            idleDrift={0.6}
            trigger="hover"
            glow
          />
        </Decorative>

        <p className="mt-2 text-xs text-ink-soft tnum">
          {error
            ? "showing last known prices"
            : `updated ${clock(portfolio.fetchedAt)}`}
          {!error && !rateLimit && ` · refreshing in ${countdown}s`}
        </p>

        <p className="mt-4 font-display text-5xl leading-none font-semibold tracking-tight tnum sm:text-6xl">
          ₹{amount(totals.presentValue)}
        </p>

        <p
          className={`mt-3 inline-flex items-baseline gap-3 rounded px-2 py-1 text-base tnum ${
            up ? "bg-gain-wash text-gain" : "bg-loss-wash text-loss"
          }`}
        >
          <span>{signedAmount(totals.gainLoss)}</span>
          <span className="font-medium">
            {signedPercent(totals.gainLossPct)}
          </span>
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-4">
          <Figure label="Invested" value={`₹${amount(totals.investment)}`} />
          <Figure
            label="Holdings"
            value={`${26 - portfolio.failures} of 26 priced`}
          />
          <Figure label="Sectors" value={String(portfolio.sectors.length)} />
          <Figure
            label="Return"
            value={signedPercent(totals.gainLossPct)}
            className={up ? "text-gain" : "text-loss"}
          />
        </dl>
      </div>
    </header>
  );
}
