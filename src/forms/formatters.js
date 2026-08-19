/**
 * Common formatter functions (model → view transforms).
 * Use these when the model representation differs from what the input displays.
 *
 * For display-only formatting (labels, text), use filters/intl.js instead.
 *
 * @module forms/formatters
 */

/**
 * Phone: raw digits → formatted display.
 * Model: "5551234567" → View: "(555) 123-4567"
 */
export const phone = (v) => {
  if (!v) return "";
  const digits = String(v).replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return v;
};

/**
 * Date object → YYYY-MM-DD string (for <input type="date">).
 * Model: Date instance → View: "2026-08-19"
 */
export const date = (v) => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

/**
 * Mask all but last N characters (for sensitive data display).
 * Model: "4111222233334444" → View: "••••••••••••4444"
 *
 * @param {number} [visible=4] - Characters to show at end
 * @param {string} [char='•'] - Mask character
 */
export const mask =
  (visible = 4, char = "•") =>
  (v) => {
    if (!v) return "";
    const str = String(v);
    if (str.length <= visible) return str;
    return char.repeat(str.length - visible) + str.slice(-visible);
  };

/**
 * Number → currency string for input display with thousand separators.
 * Model: 1234.5 → View: "1,234.50"
 *
 * For display-only labels with currency symbol ($, €), use filters/intl.js formatCurrency().
 *
 * @param {number} [decimals=2]
 * @param {string} [locale] - BCP 47 locale for separator style (default: user's locale)
 */
export const currency = (decimals = 2, locale = undefined) => (v) => {
  if (v == null) return '';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(v));
};

/**
 * Decimal → percentage string for input display.
 * Model: 0.75 → View: "75"
 * (The input shows the number, the template/label adds the % symbol)
 *
 * @param {number} [decimals=0]
 */
export const percentage = (decimals = 0) => (v) => {
  if (v == null) return '';
  return (Number(v) * 100).toFixed(decimals);
};
