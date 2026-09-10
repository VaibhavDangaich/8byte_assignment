# Portfolio Dashboard

A live dashboard for a 26 holding Indian equity portfolio. Purchase prices and quantities come
from the supplied spreadsheet; current market price comes from Yahoo Finance, and P/E plus latest
earnings come from Google Finance. Holdings are grouped into six sectors with per sector subtotals,
and the market columns refresh every 15 seconds.

## Requirements

- Node.js 20 or newer (developed on Node 25)
- npm

No API keys and no environment variables. Both data sources are public.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. If that port is taken, Next.js picks the next free one and prints the
URL it chose.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Aggregation tests, reconciled against the spreadsheet |
| `npm run lint` | ESLint |

## What you see

**Summary card.** Present value, gain or loss in rupees and percent, amount invested, how many
holdings currently have a live price, and the sector count.

**Charts.** A doughnut of allocation by sector, and a bar chart of return by sector. Both animate
on load and on data change.

**Holdings table.** All eleven columns the brief asks for, grouped by sector with a subtotal row
per sector and a portfolio total in the footer. The columns are banded into three groups that
reflect how often the data underneath actually changes:

- **Position** (never changes): Particulars, Purchase, Qty, Investment, Weight, NSE/BSE
- **Live market** (every 15 seconds): CMP, Present value, Gain / loss
- **Fundamentals** (quarterly): P/E, Latest earnings

Gains are green, losses are red. `n/a` marks a value the upstream source does not have; hover it
for the reason.

**Search.** Filters by stock name, sector, or exchange code. While a filter is active the sector
subtotals are hidden, because a subtotal over a filtered subset would be misleading.

## Live updates

The browser polls `/api/portfolio` every 15 seconds. The server keeps its own cache and answers
from it immediately, refreshing upstream in the background, so a page load never waits on Yahoo or
Google. Prices are cached for 12 seconds when the JSON API is reachable and 60 seconds when the
fallback path is in use, since that path is much more expensive. Fundamentals are cached for
6 hours because they only move on earnings.

If Yahoo starts rate limiting, the dashboard says so and shows a countdown to the next attempt
rather than silently freezing. It keeps polling and recovers on its own.

## Project layout

```
src/
  app/
    api/portfolio/route.ts   Composes the response, returns 502 on total failure
    page.tsx                 Polling loop and page composition
    layout.tsx               Fonts, background
    globals.css              Theme tokens and keyframes
  components/
    Summary.tsx              Headline figures
    Charts.tsx               Doughnut and bar (chart.js)
    PortfolioTable.tsx       Sector grouped table and search
    FeedNotice.tsx           Rate limit and degraded state messaging
    Skeleton.tsx             Loading placeholder in the real layout's shape
    WebThreads.tsx           Animated background (ogl)
    ParticleText.tsx         Particle wordmark
    Decorative.tsx           Error boundary isolating decorative elements
    Backdrop.tsx             Background placement and tuning
  lib/
    holdings.ts              The 26 holdings, generated from the spreadsheet
    types.ts                 Shared types
    portfolio.ts             Derives every computed figure, groups by sector
    yahoo.ts                 Price fetching, caching, rate limit backoff
    google.ts                Fundamentals scraping and caching
    format.ts                Indian number and percent formatting
    async.ts                 Concurrency pool
    portfolio.test.ts        Aggregation tests
```

## Data notes

Nothing computed is ever seeded. Investment, weight, present value, gain or loss and every
subtotal are derived at request time. `npm test` pins the results to the spreadsheet's own
figures: all 26 investments, all 26 weights, all six sector subtotals, and the
1,543,060 grand total.

Three details about the source data are worth knowing:

- The spreadsheet's three rows below the grand total (Infy, Happiest Minds, Easemytrip) sit under
  a "Sold Price" marker and are excluded as closed positions. The sheet's own total confirms this.
- Columns L, M and N in the spreadsheet are stale. Four separate rows share an identical
  Market Cap, P/E and Earnings triplet, which is a copy paste artifact. Those columns are ignored
  and fundamentals are fetched live instead.
- Purchase prices predate several corporate actions. Bajaj Finance shows roughly negative 84
  percent because of its June 2025 stock split and bonus issue, not because of a price collapse.
  The arithmetic is correct and the conclusion is not. See TECHNICAL.md.

Three holdings have no live price anywhere: LTIMindtree is absent from both providers, and Gensol
and Savani Financials have no fundamentals published. A holding with no live price is carried at
cost so that a failed lookup contributes zero gain or loss instead of shrinking its sector.

Prices are delayed and unverified. This is a portfolio tracker, not investment advice.
