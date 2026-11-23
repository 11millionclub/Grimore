/** Formats cents as a price, e.g. 499 -> "€4.99", 500 -> "€5". */
export const money = (cents: number | null | undefined, currency = 'EUR') =>
  cents === null || cents === undefined ? '' : new Intl.NumberFormat('en-IE', { style: 'currency', currency, minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
