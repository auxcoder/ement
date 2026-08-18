/**
 * Intl-based formatting utilities.
 * Replaces AngularJS built-in filters (currency, date, number).
 *
 * @module filters/intl
 */

// TODO: Phase 8, Tasks 8.1 - 8.3

/**
 * Format a number as currency.
 */
export function formatCurrency(value, currency = 'USD', locale = undefined) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

/**
 * Format a number with locale-aware separators.
 */
export function formatNumber(value, options = {}, locale = undefined) {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a number as percentage.
 */
export function formatPercent(value, locale = undefined) {
  return new Intl.NumberFormat(locale, { style: 'percent' }).format(value);
}

/**
 * Format a date with predefined styles.
 */
export function formatDate(value, style = 'medium', locale = undefined) {
  const styles = {
    short: { dateStyle: 'short' },
    medium: { dateStyle: 'medium' },
    long: { dateStyle: 'long' },
    full: { dateStyle: 'full' },
  };
  return new Intl.DateTimeFormat(locale, styles[style] || styles.medium).format(new Date(value));
}

/**
 * Format relative time (e.g., "3 days ago").
 */
export function formatRelative(date, locale = undefined) {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return rtf.format(-seconds, 'second');
}
