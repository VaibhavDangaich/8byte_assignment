export type Holding = {
  name: string;
  sector: string;
  exchange: string;
  purchasePrice: number;
  qty: number;
  yahoo: string;
  google: string;
};

export type Quote = {
  cmp: number;
  previousClose: number | null;
  currency: string;
};

export type Fundamentals = {
  price: number | null;
  peRatio: number | null;
  eps: number | null;
  lastReport: string | null;
  fiscalPeriod: string | null;
};

export type Row = Holding & {
  investment: number;
  weight: number;
  cmp: number | null;
  presentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  dayChangePct: number | null;
  peRatio: number | null;
  eps: number | null;
  lastReport: string | null;
  fiscalPeriod: string | null;
  priceSource: 'yahoo' | 'google' | null;
  quoteError: string | null;
  fundamentalsError: string | null;
};

export type Totals = {
  investment: number;
  presentValue: number;
  gainLoss: number;
  gainLossPct: number;
};

export type Sector = Totals & {
  name: string;
  rows: Row[];
  weight: number;
};

export type RateLimit = {
  retryAt: string;
  seconds: number;
};

export type Portfolio = {
  sectors: Sector[];
  totals: Totals;
  fetchedAt: string;
  stale: boolean;
  failures: number;
  rateLimit: RateLimit | null;
};
