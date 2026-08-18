/**
 * Microtask-based update scheduler.
 * Batches multiple property changes into a single DOM update.
 *
 * Why this exists:
 * AngularJS's digest cycle naturally batched (all watchers run in one pass).
 * Our Proxy fires per-property, so we need explicit batching via microtask.
 * This ensures that setting 10 properties in a row results in 1 DOM update,
 * not 10 separate ones.
 *
 * @module core/scheduler
 */

let pending = false;
let queue = new Set();

/**
 * Schedule an update function to run in the next microtask.
 * Deduplicates — same function reference only runs once per batch.
 *
 * @param {Function} updateFn - The DOM update function to schedule
 *
 * @example
 * // These three calls result in renderUser() running only ONCE:
 * scheduleUpdate(renderUser);
 * scheduleUpdate(renderUser);
 * scheduleUpdate(renderUser);
 */
export function scheduleUpdate(updateFn) {
  queue.add(updateFn);
  if (!pending) {
    pending = true;
    queueMicrotask(flush);
  }
}

/**
 * Flush all scheduled updates immediately (synchronous).
 * Useful for testing when you need updates to apply before assertions.
 */
export function flushUpdates() {
  flush();
}

/**
 * Get the number of currently pending updates (for testing/debugging).
 *
 * @returns {number}
 */
export function pendingCount() {
  return queue.size;
}

// ─── Internal ──────────────────────────────────────────────────────────────────

function flush() {
  // Copy and clear before executing — allows updates to schedule
  // new updates without infinite loops (they'll go in the next batch)
  const batch = [...queue];
  queue.clear();
  pending = false;

  for (const fn of batch) {
    fn();
  }
}
