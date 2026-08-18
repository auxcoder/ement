/**
 * Common formatter functions (model → view transforms).
 * Each formatter takes a model value and returns a display string.
 *
 * @module forms/formatters
 */

// TODO: Phase 6, Task 6.8
export const fromNumber = (v) => v == null ? '' : String(v);
export const fromDate = (v) => v instanceof Date ? v.toISOString().split('T')[0] : '';
export const currency = (v) => v == null ? '' : v.toFixed(2);
export const percentage = (v) => v == null ? '' : `${(v * 100).toFixed(0)}%`;
export const phone = (v) => {
  if (!v) return '';
  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  return v;
};
