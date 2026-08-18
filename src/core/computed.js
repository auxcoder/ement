/**
 * Computed properties — derived values that auto-update when dependencies change.
 *
 * How it works:
 * 1. On first read, the compute function runs and we track which reactive
 *    properties were accessed (dependency tracking via getter interception).
 * 2. When any dependency changes, the computed value is marked dirty.
 * 3. On next read, it re-computes. If not read, it doesn't re-compute (lazy).
 *
 * This is equivalent to AngularJS's $watch on an expression, but:
 * - Lazy: doesn't compute until read (vs digest runs all watchers)
 * - Cached: returns cached value if deps unchanged
 * - Automatic: no manual dependency declaration needed
 *
 * @module core/computed
 */

// Global tracking state — captures property accesses during computation
let activeTracker = null;

/**
 * Creates a computed value that auto-updates when its reactive dependencies change.
 *
 * @param {Function} computeFn - Function that derives a value from reactive state
 * @returns {{ value: *, destroy: Function }} Computed accessor + cleanup
 *
 * @example
 * const state = reactive({ firstName: 'John', lastName: 'Doe' }, onChange);
 * const fullName = computed(() => `${state.firstName} ${state.lastName}`);
 *
 * fullName.value; // 'John Doe'
 * state.firstName = 'Jane';
 * fullName.value; // 'Jane Doe' (re-computed because firstName was accessed)
 */
export function computed(computeFn) {
  let cachedValue;
  let dirty = true;
  let deps = new Set(); // set of "obj:prop" keys this computed depends on

  const comp = {
    get value() {
      if (dirty) {
        // Track dependencies during computation
        const tracker = new Set();
        activeTracker = tracker;

        try {
          cachedValue = computeFn();
        } finally {
          activeTracker = null;
        }

        deps = tracker;
        dirty = false;
      }
      return cachedValue;
    },

    /**
     * Mark this computed as dirty (needs re-computation on next read).
     * Called by the reactive system when a tracked dependency changes.
     */
    invalidate() {
      dirty = true;
    },

    /**
     * Check if the computed needs re-computation.
     */
    get isDirty() {
      return dirty;
    },

    /**
     * Clean up — remove this computed from dependency tracking.
     */
    destroy() {
      deps.clear();
      dirty = true;
      cachedValue = undefined;
    },
  };

  return comp;
}

/**
 * Notify the dependency tracker that a property was accessed.
 * Called from within a reactive proxy's get trap.
 *
 * @param {string} path - The property path being accessed (e.g., 'user.name')
 */
export function trackAccess(path) {
  if (activeTracker) {
    activeTracker.add(path);
  }
}

/**
 * Check if there's an active computation tracking dependencies.
 *
 * @returns {boolean}
 */
export function isTracking() {
  return activeTracker !== null;
}
