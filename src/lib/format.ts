const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const precise = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const amount = (value: number) => grouped.format(Math.round(value));

export const price = (value: number) => precise.format(value);

export const signedAmount = (value: number) =>
  `${value < 0 ? '-' : '+'}${grouped.format(Math.abs(Math.round(value)))}`;

export const percent = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;

export const signedPercent = (value: number, digits = 2) =>
  `${value < 0 ? '-' : '+'}${Math.abs(value * 100).toFixed(digits)}%`;

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour12: false });
