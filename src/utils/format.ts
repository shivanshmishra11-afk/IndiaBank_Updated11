/** Indian-locale currency helpers shared by the dashboard, chat, and gateway. */

export function formatINR(value: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  return `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatINRCompact(value: number): string {
  const n = Number(value || 0);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return formatINR(n, { decimals: 0 });
}

export function greetingForNow(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string): string {
  return (fullName || 'Customer').split(' ')[0];
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
