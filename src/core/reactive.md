# reactive

Proxy-based reactivity system. Replaces AngularJS's digest cycle and dirty-checking.

**Module:** `core/reactive`
**Exports:** `reactive`, `toRaw`, `isReactive`

## How it works

Every property mutation on a reactive object is intercepted by a Proxy. The `onChange` callback fires synchronously per mutation. Nested objects become reactive lazily on first access. Arrays are also reactive — mutating methods (`push`, `pop`, `splice`, etc.) trigger the callback.

This is O(1) per mutation, versus AngularJS's O(n) dirty-check pass across all watchers. No `$apply()` or `$digest()` needed.

## API

### `reactive(target, onChange)`

Wraps an object in a reactive proxy.

| Param      | Type                                 | Description                       |
| ---------- | ------------------------------------ | --------------------------------- |
| `target`   | `Object`                             | The plain object to make reactive |
| `onChange` | `(prop, newValue, oldValue) => void` | Called on every mutation          |

Returns a `Proxy` wrapping `target`.

```javascript
import { reactive } from "ement";

const state = reactive(
  { count: 0, user: { name: "Alice" } },
  (prop, value, old) => {
    console.log(`${prop}: ${old} → ${value}`);
  },
);

state.count++; // "count: 0 → 1"
state.user.name = "Bob"; // "user.name: Alice → Bob"
state.items = [];
state.items.push("x"); // "items: [...] → [...]"
```

### `toRaw(proxy)`

Returns the underlying plain object, bypassing the proxy. Use for serialization or passing to external libraries that should not observe changes.

```javascript
const raw = toRaw(state);
JSON.stringify(raw); // safe — no proxy overhead
```

### `isReactive(value)`

Returns `true` if the value is a reactive proxy created by `reactive()`.

```javascript
isReactive(state); // true
isReactive({}); // false
```

## Rules

- Only top-level reassignment triggers `onChange`. Mutating a nested object in place is invisible **unless** you accessed it through the proxy first (which makes it reactive lazily).
- Do not double-wrap a reactive object — `reactive()` is a no-op if the target is already a proxy.
- Circular references are handled via a `WeakMap` cache — no infinite loops.
- `delete state.prop` also triggers `onChange` with `newValue = undefined`.

## AngularJS comparison

| AngularJS                     | Ement                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| `$scope.$watch('name', fn)`   | `reactive({ name }, fn)` — automatic, no watch declaration |
| `$scope.$apply(fn)`           | Not needed — mutations are intercepted directly            |
| O(n) dirty-check on `$digest` | O(1) Proxy set trap                                        |
| No deep reactivity by default | Deep reactivity via lazy nested proxies                    |
