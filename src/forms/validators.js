/**
 * Common validator functions.
 * Signature: (modelValue, viewValue?) => errorKey | null
 * Returns null when valid, or an error key string when invalid.
 *
 * @module forms/validators
 */

// TODO: Phase 6, Task 6.8
export const required = (v) => (!v && v !== 0 ? "required" : null);

export const minLength = (min) => (v) => (v?.length < min ? "minLength" : null);

export const maxLength = (max) => (v) => (v?.length > max ? "maxLength" : null);

export const pattern =
  (regex, key = "pattern") =>
  (v) =>
    v && !regex.test(v) ? key : null;

export const min = (min) => (v) => (v != null && v < min ? "min" : null);

export const max = (max) => (v) => (v != null && v > max ? "max" : null);

export const email = (v) => {
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "email";
};
