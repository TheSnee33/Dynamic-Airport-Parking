// Pricing math. functions/index.js uses the same rules; the server's number is the one that is charged.
export function daysBetween(dropOff, pickup) {
  const a = new Date(dropOff), b = new Date(pickup);
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return Math.max(1, Math.ceil((b - a) / 86400000));
}

// pricing: { perDay: number|null, perWeek: number|null }
export function quote(dropOff, pickup, pricing) {
  const days = daysBetween(dropOff, pickup);
  const perDay = pricing?.perDay ?? null;
  const perWeek = pricing?.perWeek ?? null;
  if (!days || perDay == null) return { days, total: null };
  let total;
  if (perWeek != null) {
    const weeks = Math.floor(days / 7), rest = days % 7;
    total = weeks * perWeek + Math.min(rest * perDay, perWeek);
  } else {
    total = days * perDay;
  }
  return { days, total };
}

export const usd = (n) => (n == null ? "—" : "$" + Number(n).toFixed(Number.isInteger(n) ? 0 : 2));

export function pricingFromSite() {
  const S = window.SITE || {};
  return { perDay: S.pricePerDay ?? null, perWeek: S.pricePerWeek ?? null };
}
