/**
 * Comparative Example: AngularJS Filters vs Intl APIs
 *
 * Run with: node src/filters/comparison.js
 *
 * @module filters/comparison
 */

import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatRelative,
} from "./intl.js";

console.log("═════════════════════════════════════════════════════════════");
console.log("  Comparative Example: AngularJS Filters vs Intl APIs");
console.log("═════════════════════════════════════════════════════════════\n");

console.log("─── AngularJS Filters ───────────────────────────────────────\n");
console.log(`
  {{ 1234.5 | currency }}              → $1,234.50
  {{ 1234.5 | currency:'EUR' }}        → €1,234.50 (not locale-aware!)
  {{ 0.75 | number:2 }}                → 0.75
  {{ myDate | date:'medium' }}         → Aug 18, 2026 (English only by default)
  {{ myDate | date:'dd/MM/yyyy' }}     → 18/08/2026

  ❌ Problems:
  • Currency symbol placement is NOT locale-aware (always prefix)
  • Date patterns are custom (not ICU standard)
  • No relative time ("3 days ago")
  • Adding locales requires including angular-locale_XX.js files
  • No plural rules, no list formatting
`);

console.log("─── ement (Intl APIs) ───────────────────────────────────\n");

const now = new Date("2026-08-18T12:00:00");

console.log(
  '  formatCurrency(1234.5, "USD", "en-US")  →',
  formatCurrency(1234.5, "USD", "en-US"),
);
console.log(
  '  formatCurrency(1234.5, "EUR", "de-DE")  →',
  formatCurrency(1234.5, "EUR", "de-DE"),
);
console.log(
  '  formatCurrency(1234.5, "JPY", "ja-JP")  →',
  formatCurrency(1234.5, "JPY", "ja-JP"),
);
console.log("");
console.log(
  '  formatNumber(1234567, {}, "en-US")      →',
  formatNumber(1234567, {}, "en-US"),
);
console.log(
  '  formatNumber(1234567, {}, "de-DE")      →',
  formatNumber(1234567, {}, "de-DE"),
);
console.log("");
console.log(
  '  formatDate(now, "short", "en-US")       →',
  formatDate(now, "short", "en-US"),
);
console.log(
  '  formatDate(now, "long", "es-ES")        →',
  formatDate(now, "long", "es-ES"),
);
console.log(
  '  formatDate(now, "full", "ja-JP")        →',
  formatDate(now, "full", "ja-JP"),
);
console.log("");
const fiveMin = new Date(Date.now() - 5 * 60 * 1000);
const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
console.log(
  "  formatRelative(5min ago)                →",
  formatRelative(fiveMin, "en-US"),
);
console.log(
  "  formatRelative(3days ago)               →",
  formatRelative(threeDays, "en-US"),
);

console.log(`

  ✅ Advantages of Intl:
  • Currency placement is locale-correct (€1.234,50 in German, not $1,234.50€)
  • All locales built into the runtime — no extra files to load
  • Relative time formatting (Intl.RelativeTimeFormat)
  • Plural rules (Intl.PluralRules) — "1 item" vs "2 items" in any language
  • List formatting (Intl.ListFormat) — "A, B, and C" vs "A, B y C"
  • Standard ICU patterns — same format strings work everywhere
  • Zero dependencies — it's just the browser/Node runtime
`);

console.log("─── Summary ──────────────────────────────────────────────────\n");
console.log(`
  ┌──────────────────┬─────────────────────────┬─────────────────────────┐
  │ Feature          │ AngularJS Filters       │ Intl APIs               │
  ├──────────────────┼─────────────────────────┼─────────────────────────┤
  │ Currency         │ {{ x | currency }}      │ formatCurrency(x)       │
  │ Locale-aware     │ ⚠️ Requires locale file  │ ✅ Built-in             │
  │ Date formatting  │ Custom patterns         │ ICU standard            │
  │ Relative time    │ ❌                       │ ✅ formatRelative()     │
  │ Pluralization    │ ❌ (need angular-translate)│ ✅ Intl.PluralRules   │
  │ List formatting  │ ❌                       │ ✅ Intl.ListFormat      │
  │ Dependencies     │ angular-locale files    │ None (runtime)          │
  │ Correctness      │ ⚠️ Approximate           │ ✅ CLDR-based           │
  └──────────────────┴─────────────────────────┴─────────────────────────┘
`);

console.log("═════════════════════════════════════════════════════════════");
