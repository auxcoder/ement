/**
 * Bundle Size Analysis
 *
 * Run with: node app/todo/bundle-size.js
 *
 * Measures the raw source size of each module.
 * Production gzipped sizes require `npm run build` (Vite/Rollup).
 *
 * @module app/todo/bundle-size
 */

import { readFileSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, "../../src");

const modules = [
  { name: "core/reactive", path: "core/reactive.js" },
  { name: "core/scheduler", path: "core/scheduler.js" },
  { name: "core/computed", path: "core/computed.js" },
  { name: "core/element", path: "core/element.js" },
  { name: "di/container", path: "di/container.js" },
  { name: "di/provider", path: "di/provider.js" },
  { name: "di/tokens", path: "di/tokens.js" },
  { name: "router/router", path: "router/router.js" },
  { name: "router/route-outlet", path: "router/route-outlet.js" },
  { name: "router/links", path: "router/links.js" },
  { name: "http/http", path: "http/http.js" },
  { name: "forms/field", path: "forms/field.js" },
  { name: "forms/form-group", path: "forms/form-group.js" },
  { name: "forms/parsers", path: "forms/parsers.js" },
  { name: "forms/formatters", path: "forms/formatters.js" },
  { name: "forms/validators", path: "forms/validators.js" },
  { name: "animate/animate", path: "animate/animate.js" },
  { name: "security/sanitize", path: "security/sanitize.js" },
  { name: "filters/intl", path: "filters/intl.js" },
];

console.log("═══════════════════════════════════════════════════════════════");
console.log("  ement — Bundle Size Analysis (Source)");
console.log("══════════════════════════════════════════════════════════════\n");

let totalBytes = 0;
const results = [];

for (const mod of modules) {
  const filePath = resolve(srcDir, mod.path);
  try {
    const stat = statSync(filePath);
    const content = readFileSync(filePath, "utf-8");
    // Strip comments and empty lines for "code size"
    const codeLines = content.split("\n").filter((l) => {
      const trimmed = l.trim();
      return (
        trimmed &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("/*")
      );
    });
    const codeBytes = codeLines.join("\n").length;

    results.push({ name: mod.name, raw: stat.size, code: codeBytes });
    totalBytes += stat.size;
  } catch {
    results.push({ name: mod.name, raw: 0, code: 0, error: "NOT FOUND" });
  }
}

console.log("  Module                      │ Raw     │ Code (no comments)");
console.log("  ────────────────────────────┼─────────┼───────────────────");
for (const r of results) {
  const name = r.name.padEnd(28);
  const raw = `${(r.raw / 1024).toFixed(1)}KB`.padStart(7);
  const code = r.error
    ? r.error
    : `${(r.code / 1024).toFixed(1)}KB`.padStart(7);
  console.log(`  ${name}│ ${raw} │ ${code}`);
}
console.log("  ────────────────────────────┼─────────┼───────────────────");
console.log(
  `  TOTAL                       │ ${(totalBytes / 1024).toFixed(1)}KB`.padEnd(
    42,
  ) + "│",
);

console.log(`
  ─── Estimates ────────────────────────────────────────────────

  Source total:    ${(totalBytes / 1024).toFixed(1)}KB
  Minified (est):  ~${((totalBytes * 0.4) / 1024).toFixed(1)}KB (typical 60% reduction)
  Gzipped (est):   ~${((totalBytes * 0.15) / 1024).toFixed(1)}KB (typical 85% reduction)

  Target:          < 15KB gzipped
  Status:          ${(totalBytes * 0.15) / 1024 < 15 ? "✅ Within budget" : "❌ Over budget"}

  ─── Comparison ───────────────────────────────────────────────

  ement (full):             ~${((totalBytes * 0.15) / 1024).toFixed(1)}KB gzipped (estimated)
  AngularJS 1.8 (min):      170KB  (60KB gzipped)
  Vue 3 (runtime):          50KB   (16KB gzipped)
  Preact:                   11KB   (4KB gzipped)
  Lit:                      16KB   (6KB gzipped)

  Note: ement is a learning framework, not competing on features
  with production frameworks. The comparison shows scale.
`);

console.log("═══════════════════════════════════════════════════════════════");
