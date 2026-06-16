/**
 * Format currency values with consistent styling
 */
export function formatUSDT(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactUSDT(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format percentages
 */
export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format R-multiple
 */
export function formatR(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}R`;
}

/**
 * Format crypto price based on magnitude
 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/**
 * Format large numbers
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US');
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(totalMinutes: number, lang: 'id' | 'en' = 'id'): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'id') {
    if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
    if (hours > 0) return `${hours} jam`;
    return `${minutes} menit`;
  }

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} hours`;
  return `${minutes} min`;
}

/**
 * Format countdown timer (HH:MM:SS)
 */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [m, s].map((v) => v.toString().padStart(2, '0'));
  if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
  return parts.join(':');
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string | null | undefined, lang: 'id' | 'en' = 'id'): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateStr: string | null | undefined, lang: 'id' | 'en' = 'id'): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
