/** Deposit rate card shared by the Deposits page and Zora's FD action. */
export const FD_RATES: { minMonths: number; label: string; rate: number }[] = [
  { minMonths: 3, label: '3 – 5 months', rate: 4.5 },
  { minMonths: 6, label: '6 – 11 months', rate: 5.75 },
  { minMonths: 12, label: '12 – 17 months', rate: 6.5 },
  { minMonths: 18, label: '18 – 35 months', rate: 6.75 },
  { minMonths: 36, label: '36 – 60 months', rate: 6.6 },
];
export const RD_RATE = 6.5;
export const FD_MIN_AMOUNT = 10000;

export const rateFor = (months: number) => [...FD_RATES].reverse().find((r) => months >= r.minMonths)?.rate ?? 4.5;

export function fdMaturity(principal: number, months: number, rate: number) {
  return Math.round(principal * Math.pow(1 + rate / 400, 4 * (months / 12)));
}

export function rdMaturity(monthly: number, months: number, rate: number) {
  // quarterly compounding approximation used by most Indian banks' RD calculators
  let total = 0;
  for (let m = 1; m <= months; m++) total += monthly * Math.pow(1 + rate / 400, 4 * ((months - m + 1) / 12));
  return Math.round(total);
}
