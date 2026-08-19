/**
 * Common parser functions (view → model transforms).
 * Each parser takes a value and returns the transformed value.
 * Returning undefined halts the pipeline.
 *
 * @module forms/parsers
 */

// TODO: Phase 6, Task 6.8
export const trim = (v) => v?.trim();
export const lowercase = (v) => v?.toLowerCase();
export const uppercase = (v) => v?.toUpperCase();
export const toNumber = (v) => (v === "" ? null : Number(v));
export const toDate = (v) => (v ? new Date(v) : null);
export const toBoolean = (v) => v === "true" || v === "1";
export const stripNonDigits = (v) => v?.replace(/\D/g, "");
export const maxLength = (max) => (v) => v?.slice(0, max);
