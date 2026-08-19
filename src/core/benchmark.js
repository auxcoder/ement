/**
 * Comparative benchmark: AngularJS digest cycle vs Proxy-based reactivity.
 *
 * This is a learning exercise — not a production benchmark tool.
 * It simulates both approaches to illustrate the performance characteristics.
 *
 * Run with: node src/core/benchmark.js
 *
 * @module core/benchmark
 */

import { reactive } from "./reactive.js";

// ─── Simulate AngularJS Digest Cycle ───────────────────────────────────────────

/**
 * Simulates AngularJS's dirty checking approach.
 * Every $digest iteration checks ALL watchers by comparing old vs new values.
 *
 * Problems this demonstrates:
 * - O(n) per digest: every watcher runs regardless of what changed
 * - Multiple iterations needed if watchers mutate state (TTL of 10)
 * - Must manually trigger with $apply()
 */
function simulateDigestCycle(watcherCount) {
  // State: plain object (like $scope)
  const scope = {};
  const watchers = [];

  // Register watchers (like $scope.$watch)
  for (let i = 0; i < watcherCount; i++) {
    scope[`prop${i}`] = 0;
    watchers.push({
      prop: `prop${i}`,
      last: 0,
      listener: () => {}, // would update DOM
    });
  }

  // One digest cycle — checks ALL watchers
  function digest() {
    let dirty = true;
    let iterations = 0;
    const TTL = 10;

    while (dirty && iterations < TTL) {
      dirty = false;
      iterations++;
      for (const watcher of watchers) {
        const current = scope[watcher.prop];
        if (current !== watcher.last) {
          watcher.listener(current, watcher.last);
          watcher.last = current;
          dirty = true; // something changed, need another pass
        }
      }
    }
    return iterations;
  }

  return { scope, digest, watchers };
}

// ─── Proxy-based Reactivity ────────────────────────────────────────────────────

/**
 * Our approach: Proxy fires per-property change.
 * - O(1) per mutation — only the changed property triggers its callback
 * - No manual trigger needed
 * - No iteration limit concerns
 */
function setupProxyReactivity(propCount) {
  const initial = {};
  for (let i = 0; i < propCount; i++) {
    initial[`prop${i}`] = 0;
  }

  let notifications = 0;
  const state = reactive(initial, () => {
    notifications++;
  });

  return { state, getNotifications: () => notifications };
}

// ─── Benchmarks ────────────────────────────────────────────────────────────────

function runBenchmark(label, fn, iterations = 1000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn(i);
  }
  const elapsed = performance.now() - start;
  return { label, elapsed, iterations, perOp: elapsed / iterations };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

console.log("════════════════════════════════════════════════════════════");
console.log("  Comparative Benchmark: Digest Cycle vs Proxy Reactivity");
console.log("════════════════════════════════════════════════════════════\n");

const WATCHER_COUNTS = [100, 1000, 5000];
const MUTATIONS_PER_RUN = 1000;

for (const count of WATCHER_COUNTS) {
  console.log(
    `─── ${count} properties/watchers ───────────────────────────────\n`,
  );

  // Benchmark 1: Digest cycle — change 1 property, run full digest
  const { scope, digest } = simulateDigestCycle(count);
  const digestResult = runBenchmark(
    `Digest (${count} watchers, 1 change → full scan)`,
    (i) => {
      scope[`prop${i % count}`] = i; // change 1 property
      digest(); // scan ALL watchers
    },
    MUTATIONS_PER_RUN,
  );

  // Benchmark 2: Proxy — change 1 property, instant notification
  const { state } = setupProxyReactivity(count);
  const proxyResult = runBenchmark(
    `Proxy  (${count} props, 1 change → instant)`,
    (i) => {
      state[`prop${i % count}`] = i; // change 1 property — callback fires immediately
    },
    MUTATIONS_PER_RUN,
  );

  console.log(`  ${digestResult.label}`);
  console.log(
    `    Total: ${digestResult.elapsed.toFixed(2)}ms | Per mutation: ${(digestResult.perOp * 1000).toFixed(2)}µs`,
  );
  console.log("");
  console.log(`  ${proxyResult.label}`);
  console.log(
    `    Total: ${proxyResult.elapsed.toFixed(2)}ms | Per mutation: ${(proxyResult.perOp * 1000).toFixed(2)}µs`,
  );
  console.log("");
  console.log(
    `  Proxy is ${(digestResult.elapsed / proxyResult.elapsed).toFixed(1)}x faster`,
  );
  console.log("");
}

console.log("─── Analysis ─────────────────────────────────────────────────\n");
console.log("  WHERE PROXY WINS:");
console.log(
  "  • Single property change: O(1) vs O(n) — the more watchers, the bigger the gap",
);
console.log("  • No manual $apply() needed — changes detected as they happen");
console.log("  • No TTL risk — no cascading digest iterations");
console.log('  • No "digest already in progress" errors');
console.log("");
console.log("  WHERE DIRTY-CHECKING WAS SIMPLER:");
console.log("  • Can watch any expression (computed values, function results)");
console.log("    → We solve this with computed()");
console.log("  • Batches naturally (all watchers checked in one pass)");
console.log("    → We solve this with the microtask scheduler");
console.log("  • Works with plain objects from external libraries");
console.log(
  "    → Proxy requires wrapping; external objects need manual handling",
);
console.log("  • Deep equality checks built-in ($watchCollection)");
console.log("    → Deep nested proxies are lazy but add memory overhead");
console.log("");
console.log("  CONCLUSION:");
console.log("  Proxy is fundamentally better for reactivity (O(1) vs O(n)),");
console.log(
  "  but requires complementary tools (scheduler, computed) to match",
);
console.log("  the full digest cycle experience. The trade-off is worth it —");
console.log("  AngularJS apps with 2000+ watchers became unusable, while");
console.log("  Proxy-based systems stay constant-time regardless of scale.");
console.log("");
console.log("═══════════════════════════════════════════════════════════════");
