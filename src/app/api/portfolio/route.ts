import { after } from 'next/server';
import { errorMessage } from '@/lib/async';
import { getFundamentals } from '@/lib/google';
import { buildPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/lib/yahoo';

export async function GET() {
  try {
    const { quotes, feed, pending: quotesPending } = await getQuotes();
    const { fundamentals, pending: fundamentalsPending } = getFundamentals();
    const portfolio = buildPortfolio(quotes, fundamentals, feed);

    if (quotesPending || fundamentalsPending) {
      after(() => Promise.allSettled([quotesPending, fundamentalsPending]));
    }
    return Response.json(portfolio, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: errorMessage(err) }, { status: 502 });
  }
}
