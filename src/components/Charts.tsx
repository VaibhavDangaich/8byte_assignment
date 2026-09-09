'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Legend,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { amount, percent, signedAmount, signedPercent } from '@/lib/format';
import type { Portfolio } from '@/lib/types';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const SECTOR_COLORS = ['#a78bfa', '#60a5fa', '#35e39b', '#fbbf24', '#f472b6', '#22d3ee'];

const INK = '#a49dbd';
const GRID = 'rgba(255, 255, 255, 0.07)';

const tooltipStyle = {
  backgroundColor: 'rgba(12, 10, 24, 0.94)',
  borderColor: 'rgba(255, 255, 255, 0.14)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  titleColor: '#f2f0f8',
  bodyColor: '#a49dbd',
  displayColors: false,
} as const;

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/75 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">{title}</h3>
        <p className="text-[11px] text-ink-faint">{hint}</p>
      </div>
      <div className="mt-4 h-56">{children}</div>
    </div>
  );
}

export default function Charts({ portfolio }: { portfolio: Portfolio }) {
  const { sectors } = portfolio;

  const allocation = useMemo(
    () => ({
      labels: sectors.map((s) => s.name),
      datasets: [
        {
          data: sectors.map((s) => s.investment),
          backgroundColor: SECTOR_COLORS.map((c) => `${c}cc`),
          hoverBackgroundColor: SECTOR_COLORS,
          borderColor: 'rgba(7, 5, 16, 0.85)',
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    }),
    [sectors],
  );

  const allocationOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: { animateRotate: true, animateScale: true, duration: 900 },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: INK,
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: (item: TooltipItem<'doughnut'>) => {
              const sector = sectors[item.dataIndex];
              return `₹${amount(sector.investment)} · ${percent(sector.weight, 1)} of portfolio`;
            },
          },
        },
      },
    }),
    [sectors],
  );

  const performance = useMemo(
    () => ({
      labels: sectors.map((s) => s.name),
      datasets: [
        {
          data: sectors.map((s) => s.gainLossPct * 100),
          backgroundColor: sectors.map((s) =>
            s.gainLoss >= 0 ? 'rgba(53, 227, 155, 0.75)' : 'rgba(255, 107, 125, 0.75)',
          ),
          hoverBackgroundColor: sectors.map((s) => (s.gainLoss >= 0 ? '#35e39b' : '#ff6b7d')),
          borderRadius: 5,
          borderSkipped: false,
          barThickness: 22,
        },
      ],
    }),
    [sectors],
  );

  const performanceOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: (item: TooltipItem<'bar'>) => {
              const sector = sectors[item.dataIndex];
              return `${signedAmount(sector.gainLoss)} · ${signedPercent(sector.gainLossPct)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: { color: INK, font: { size: 11 }, callback: (value) => `${value}%` },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: INK, font: { size: 11 } },
        },
      },
    }),
    [sectors],
  );

  return (
    <section aria-label="Portfolio charts" className="grid gap-4 lg:grid-cols-2">
      <Panel title="Allocation by sector" hint="share of amount invested">
        <Doughnut data={allocation} options={allocationOptions} />
      </Panel>
      <Panel title="Return by sector" hint="gain or loss against cost">
        <Bar data={performance} options={performanceOptions} />
      </Panel>
    </section>
  );
}
