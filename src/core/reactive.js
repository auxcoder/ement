/**
 * Proxy-based reactivity system.
 * Replaces AngularJS's digest cycle / dirty checking.
 *
 * Key differences from AngularJS:
 * - O(1) per mutation (vs O(n) dirty checking across all watchers)
 * - No manual $apply() needed — changes are detected as they happen
 * - Deep reactivity: nested objects become reactive on access
 * - Array mutations (push, pop, splice, etc.) trigger change callbacks
 *
 * @module core/reactive
 */

import { trackAccess } from './computed.js';

const PROXY_FLAG = Symbol("__isProxy");
const RAW_FLAG = Symbol("__raw");

/**
 * Creates a reactive proxy around a target object.
 * Any property mutation triggers the onChange callback.
 *
 * @param {Object} target - The object to make reactive
 * @param {Function} onChange - Callback: (prop, newValue, oldValue) => void
 * @returns {Proxy} Reactive proxy
 *
 * @example
 * const state = reactive({ name: 'World', count: 0 }, (prop, value, old) => {
 *   console.log(`${prop} changed: ${old} → ${value}`);
 * });
 * state.name = 'Universe'; // logs: "name changed: World → Universe"
 * state.count++;           // logs: "count changed: 0 → 1"
 */
export function reactive(target, onChange) {
  // Don't double-wrap
  if (target && target[PROXY_FLAG]) return target;

  // Track nested proxies to avoid re-wrapping (handles circular refs)
  const proxyCache = new WeakMap();

  return createProxy(target, onChange, "", proxyCache);
}

/**
 * Access the raw (unproxied) object behind a reactive proxy.
 * Useful for serialization or passing to external libraries.
 *
 * @param {Proxy} proxy - A reactive proxy
 * @returns {Object} The underlying raw object
 */
export function toRaw(proxy) {
  return proxy?.[RAW_FLAG] ?? proxy;
}

/**
 * Check if an object is a reactive proxy.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isReactive(value) {
  return value?.[PROXY_FLAG] === true;
}

// ─── Internal ──────────────────────────────────────────────────────────────────

// Array methods that mutate and should trigger change notification
const ARRAY_MUTATORS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

function createProxy(target, onChange, parentPath, proxyCache) {
  // Already proxied this exact object? Return cached proxy (circular ref protection)
  if (proxyCache.has(target)) return proxyCache.get(target);

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      // Internal flags
      if (prop === PROXY_FLAG) return true;
      if (prop === RAW_FLAG) return obj;

      const value = Reflect.get(obj, prop, receiver);

      // Track this access for computed() dependency detection
      if (typeof prop === 'string') {
        const path = parentPath ? `${parentPath}.${prop}` : prop;
        trackAccess(path);
      }

      // Intercept array mutator methods
      if (
        Array.isArray(obj) &&
        ARRAY_MUTATORS.has(prop) &&
        typeof value === "function"
      ) {
        return (...args) => {
          const result = value.apply(obj, args);
          const path = parentPath || "self";
          onChange(path, obj, obj);
          return result;
        };
      }

      // Deep reactivity: wrap nested objects on access (lazy)
      if (value !== null && typeof value === "object") {
        const nestedPath = parentPath
          ? `${parentPath}.${String(prop)}`
          : String(prop);

        // If already a proxy, it was cached with a different path context.
        // Return a new proxy with the correct path for this access point.
        if (value[PROXY_FLAG]) {
          // Already reactive but accessed via a new path (e.g., circular ref)
          // Create a path-corrected proxy wrapping the raw object
          const raw = value[RAW_FLAG];
          return createProxy(raw, onChange, nestedPath, new WeakMap());
        }

        const nestedProxy = createProxy(
          value,
          onChange,
          nestedPath,
          proxyCache,
        );
        // Store back so subsequent access returns the same proxy
        Reflect.set(obj, prop, nestedProxy, receiver);
        return nestedProxy;
      }

      return value;
    },

    set(obj, prop, value, receiver) {
      const oldValue = Reflect.get(obj, prop, receiver);

      // Unwrap if setting a proxy as value
      const rawValue = value?.[RAW_FLAG] ?? value;

      // Skip if value hasn't changed (except NaN !== NaN case)
      if (Object.is(oldValue, rawValue)) return true;

      Reflect.set(obj, prop, rawValue, receiver);

      // Don't notify on internal array length changes triggered by mutators
      // (the mutator wrapper already notifies)
      if (Array.isArray(obj) && prop === "length") return true;

      const path = parentPath ? `${parentPath}.${String(prop)}` : String(prop);
      onChange(path, rawValue, oldValue);

      return true;
    },

    deleteProperty(obj, prop) {
      if (prop in obj) {
        const oldValue = obj[prop];
        delete obj[prop];
        const path = parentPath
          ? `${parentPath}.${String(prop)}`
          : String(prop);
        onChange(path, undefined, oldValue);
      }
      return true;
    },
  });

  proxyCache.set(target, proxy);
  return proxy;
}
