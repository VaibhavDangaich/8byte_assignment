# Technical notes

What was hard, what I found, and what I chose. Every claim here was verified against the live
services rather than assumed.

## 1. Neither data source has a public API

Both providers are unofficial, and they fail in different ways.

**Yahoo.** There is no supported public API. Three transports exist and I use all three, in order
of cost:

1. `v7/finance/quote` fetches all 26 symbols in **one request**. It needs a cookie and a crumb
   token, obtained by hitting `fc.yahoo.com` for a session cookie and then `v1/test/getcrumb`.
2. `v8/finance/chart/{symbol}` needs no authentication but is one request per symbol.
3. The `finance.yahoo.com/quote/{symbol}` HTML page, scraped for `data-testid="qsp-price"`.

**Google.** Scraped from `google.com/finance/quote/{SYMBOL}:{EXCHANGE}`. Two traps here. The
request 302 redirects to `/finance/beta/quote/...`, so redirects must be followed. And the class
names are obfuscated and rotate, so selecting on them would break. I match on the visible label
text instead (`P/E ratio`, `EPS`, `Last report`, `Fiscal period`), which is far more stable
because it is what users read.

## 2. Rate limiting was the dominant constraint

This shaped the whole backend. During development Yahoo rate limited my IP across **every**
endpoint for over an hour, including the crumb handshake, which meant even the cheap batch path
was unavailable. That is the honest reason the fallback chain exists.

What the code does about it:

- **Batch first.** One request for 26 symbols instead of 26 is a 26x reduction in rate limit
  pressure. This is the single most important decision in the fetch layer.
- **Exponential backoff** at 30s, 60s, 120s, 300s. Retrying every 15 seconds into a 429 extends
  the ban. On a 429 the server stops trying and reports when it will try again.
- **The rate limit is surfaced, not hidden.** The API returns `rateLimit: { retryAt, seconds }`
  and the UI shows a countdown, keeps polling, and recovers by itself. A frozen number with no
  explanation is worse than an honest "the feed is throttled, retrying in 45s".
- **A single 429 aborts the rest of that tier** rather than hammering 25 more times into a wall.
- **Cached values survive failures.** An error never overwrites a good price, so a blip degrades
  to slightly stale data instead of empty columns.

## 3. Serving the response must not depend on the upstream

My first version awaited the refresh inline. With Yahoo throttled, every request ran the full
cascade and took a measured **6.4 seconds**, every time. A page load with nothing cached therefore
sat on a loading state for the whole cascade.

Fixed with stale while revalidate: the route returns the current cache immediately and refreshes
in the background. It only blocks when the cache is completely empty, and even then it is capped
at 2.5 seconds.

| | before | after |
|---|---|---|
| cold cache | 6.4s | 2.5s (capped) |
| warm cache | 6.4s | **4ms** |

An in flight guard means concurrent requests share one refresh rather than stampeding.

## 4. Symbols do not map cleanly, so they are not resolved at runtime

The spreadsheet's `NSE/BSE` column is a BSE numeric code for 20 of the 26 rows, and those codes
resolve inconsistently on Yahoo. `511577.BO` works. `532174.BO` returns a 404 because Yahoo maps
ICICI Bank as `ICICIBANK.NS`. Yahoo's own search endpoint returned an empty array for several
plain company names, so it cannot be relied on either.

So each holding carries three identifiers: the sheet's code for display, a verified Yahoo symbol,
and a verified Google symbol. I checked all 26 against both providers before committing them.
Runtime resolution would add a request per symbol and still guess wrong.

**LTIMindtree is genuinely gone from both providers.** I tried `LTIM.NS`, `LTIM.BO`, `540005.BO`
(which returns a stale 2019 mutual fund, a different instrument entirely), and `LTIMINDTREE`,
`LTIMIND`, `MINDTREE` and `LTI` on `:NSE`. It renders as `n/a` with the reason on hover.

## 5. A wrong number is worse than a missing number

Because Google Finance stayed reachable while Yahoo was throttled, and because its quote page
carries the price alongside the P/E, I use it as a price fallback. It costs **zero extra
requests**, since that page is already being fetched for fundamentals.

The first attempt was badly wrong and is the most useful thing I learned. Matching the first
`jsname="Pdsbrc"` span returned **27,653.35 for all 26 holdings**: a market index from the page
header. The portfolio showed a present value of 5.7 crore against 15 lakh invested, a 3,649
percent gain.

The page has 66 such spans. The fix anchors the match to the company name element
(`class="gO24Ff"`) and takes the price that follows it, which correctly returns 690.15 for HDFC
Bank and matches Yahoo's own figure. Every row reports its `priceSource`, so `yahoo` versus
`google` is visible rather than implied.

The lesson: on a scraped page, never select the first match for a value that appears many times.
Anchor to something semantically tied to what you want.

## 6. A decorative background took down the entire dashboard

The worst bug of the build, and worth writing up because the symptom pointed nowhere near the
cause.

The dashboard would load, then after several refreshes get permanently stuck on the loading
skeleton. The API answered in 4ms, so the server was fine. Chrome's console gave it away:

```
"unable to create webgl context"
Uncaught TypeError: Cannot set properties of null (setting 'renderer')
```

`ogl`'s `Renderer` constructor ends with `this.gl.renderer = this`. When the browser cannot hand
out a WebGL context, `gl` is null and that line throws **uncaught, inside a `useEffect`**. React
unmounted the whole tree, so the data fetching effect died along with the background. Browsers cap
concurrent WebGL contexts at around 16, and development hot reloads leak them, which is exactly
why it worked at first and then failed after enough refreshes.

Three layers of fix, because a background animation must never be able to do this:

1. `new Renderer()` is wrapped in try/catch with a null check on `gl`.
2. Shader and program creation is guarded too, releasing the canvas and context on failure.
3. A `Decorative` error boundary isolates the background and the particle wordmark, so any
   decorative failure degrades to nothing rendered instead of a dead page.

Verified by reproducing the exact failure: headless Chrome with no GPU. WebGL still fails, zero
uncaught errors, and the full dashboard renders.

A related smaller bug in the same area: passing `fontFamily: "var(--font-fraunces), serif"` to a
canvas silently fails, because `ctx.font` cannot parse a CSS variable. The context keeps its
default 10px sans-serif, so the wordmark sampled a 10px glyph and rendered as a speck. It now
reads the computed font family off the container.

## 7. Correctness is pinned to the spreadsheet

Nothing computed is seeded. Investment, weight, present value, gain or loss and all subtotals are
derived. The tests assert against the spreadsheet's own numbers: all 26 investments, all 26
weights, all six sector subtotals, and the 1,543,060 total. Two decisions came out of reading the
sheet closely:

- **Rows 38 to 40 are excluded.** Infy, Happiest Minds and Easemytrip sit *below* the grand total
  under a "Sold Price" marker, which makes them closed positions. `E35` sums to 1,543,060 without
  them, confirming the reading.
- **Columns L, M and N are ignored.** Rows 31, 32, 33 and 40 all share the identical triplet
  `16138.14228 / 41.86 / 37.26`, a copy paste artifact. Fundamentals are fetched live instead.

**Unpriced holdings are carried at cost**, contributing zero gain or loss rather than shrinking
their sector's present value. There is a test for this, because the alternative silently
understates a sector whenever a lookup fails.

## 8. Known limitation: corporate actions

**This is the one number on the dashboard I would not defend.**

Purchase prices in the spreadsheet predate several splits and bonus issues. Bajaj Finance shows
about negative 84 percent (bought at 6,466, now trading near 1,039) and HDFC Bank about negative
54 percent. Bajaj Finance executed a 1:10 split plus a 4:1 bonus in June 2025. The share count
went up and the price came down proportionally; the position did not lose 84 percent of its value.

Present value and every total are correct, because they use live prices and the recorded quantity.
Only gain or loss on affected rows is distorted, since it compares a pre split purchase price with
a post split market price.

I left the data as supplied rather than quietly adjusting someone's holdings. Three ways to
resolve it, in increasing order of correctness:

1. Document it and move on, which is where it stands.
2. Add a split adjustment factor per holding, applied to purchase price and quantity.
3. Fetch split history from Yahoo's chart endpoint (`events=split`) and adjust automatically. The
   most correct option and the one I would build next, at the cost of another request per symbol
   and a longer cache.

## Other decisions worth a line

**No `react-table`.** The brief recommends it. The data arrives already grouped into six sectors,
so six `<tbody>` blocks with a subtotal row each is less code than configuring TanStack's grouping
API, and easier to reason about. If column resizing, multi sort or virtualisation were needed the
trade would flip.

**Concurrency is capped per tier**: 4 for the fundamentals scrape, 2 for the per symbol price
fallback. The Google page is 1.18 MB and the Yahoo page 826 KB, so 26 of either is a lot of
bandwidth. The batch endpoint exists precisely to avoid this, and the caps only matter when it is
unavailable.

**Fundamentals never block a response.** That refresh is fire and forget; a request uses whatever
is cached. Since P/E only moves on earnings, a stale value costs nothing.

**Sector subtotals are hidden while a search filter is active.** A subtotal computed over a
filtered subset invites a wrong reading, and a subtotal of the full sector next to two visible
rows invites a different wrong reading. Showing neither is the honest option.
