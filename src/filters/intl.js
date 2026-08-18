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

/**
 * Format a list of items with locale-aware conjunctions.
 * e.g., ["A", "B", "C"] → "A, B, and C" (en) or "A, B y C" (es)
 *
 * @param {string[]} items - List of strings to join
 * @param {string} [type='conjunction'] - 'conjunction' (and), 'disjunction' (or), 'unit'
 * @param {string} [locale] - BCP 47 locale
 * @returns {string}
 */
export function formatList(items, type = 'conjunction', locale = undefined) {
  return new Intl.ListFormat(locale, { style: 'long', type }).format(items);
}

/**
 * Select the correct plural form for a count.
 * Returns the matching form from the provided map.
 *
 * @param {number} count - The number to pluralize for
 * @param {Object} forms - Map of plural categories to strings: { one: '...', other: '...' }
 * @param {string} [locale] - BCP 47 locale
 * @returns {string} The selected form with # replaced by the count
 *
 * @example
 * formatPlural(1, { one: '# item', other: '# items' }) → "1 item"
 * formatPlural(5, { one: '# item', other: '# items' }) → "5 items"
 */
export function formatPlural(count, forms, locale = undefined) {
  const rule = new Intl.PluralRules(locale).select(count);
  const template = forms[rule] || forms.other || '';
  return template.replace('#', String(count));
}
