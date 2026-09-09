import { errorMessage } from '@/lib/async';
import { getFundamentals } from '@/lib/google';
import { buildPortfolio } from '@/lib/portfolio';
import { getQuotes } from '@/lib/yahoo';

export async function GET() {
  try {
    const { quotes, feed } = await getQuotes();
    const portfolio = buildPortfolio(quotes, getFundamentals(), feed);
    return Response.json(portfolio, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: errorMessage(err) }, { status: 502 });
  }
}
