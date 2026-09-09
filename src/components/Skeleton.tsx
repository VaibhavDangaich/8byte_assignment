import ParticleText from './ParticleText';

const Shimmer = ({ className = '' }: { className?: string }) => (
  <div className={`shimmer rounded bg-white/[0.07] ${className}`} />
);

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-white/10 bg-surface/75 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
    {children}
  </div>
);

export default function Skeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your holdings</span>

      <header className="relative overflow-hidden rounded-xl border border-white/10 bg-surface/75 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
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
            scatter={190}
            gatherDuration={1700}
            stagger={430}
            idleDrift={0.6}
            trigger="mount"
            glow
          />

          <p className="mt-2 text-xs text-ink-soft">reaching Yahoo and Google Finance</p>

          <Shimmer className="mt-4 h-14 w-72 max-w-full" />
          <Shimmer className="mt-3 h-7 w-44" />

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-4">
            {['Invested', 'Holdings', 'Sectors', 'Return'].map((label) => (
              <div key={label}>
                <dt className="text-[11px] font-medium tracking-[0.14em] text-ink-soft uppercase">
                  {label}
                </dt>
                <dd className="mt-1.5">
                  <Shimmer className="h-6 w-24" />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {['Allocation by sector', 'Return by sector'].map((title) => (
          <Panel key={title}>
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              {title}
            </h3>
            <div className="mt-4 flex h-56 items-center justify-center">
              <Shimmer className="size-40 rounded-full" />
            </div>
          </Panel>
        ))}
      </section>

      <section>
        <Shimmer className="mb-4 h-6 w-28" />
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {Array.from({ length: 8 }, (_, row) => (
            <div
              key={row}
              className="flex items-center gap-4 border-b border-white/[0.06] px-4 py-3.5 last:border-0"
            >
              <Shimmer className="h-4 flex-1" />
              <Shimmer className="hidden h-4 w-20 sm:block" />
              <Shimmer className="hidden h-4 w-24 md:block" />
              <Shimmer className="h-4 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
