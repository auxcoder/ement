# computed

Lazy, cached derived values that auto-invalidate when reactive dependencies change.

**Module:** `core/computed`
**Exports:** `computed`

## How it works

1. On first `.value` read, the compute function runs. During execution, every reactive property access is tracked via `trackAccess()`.
2. The dependency set is stored. When any tracked property changes, the computed is marked dirty.
3. On the next `.value` read, it re-computes. If not read, it does not re-compute (lazy evaluation).

This is equivalent to AngularJS's `$watch` on an expression, but lazy (only evaluates when consumed) and cached (returns the same result if no dependency changed).

## API

### `computed(computeFn)`

Creates a computed value.

| Param       | Type        | Description                             |
| ----------- | ----------- | --------------------------------------- |
| `computeFn` | `() => any` | Function that reads from reactive state |

Returns an object with:

| Property        | Type       | Description                             |
| --------------- | ---------- | --------------------------------------- |
| `.value`        | `any`      | Get the current (possibly cached) value |
| `.isDirty`      | `boolean`  | Whether re-computation is needed        |
| `.invalidate()` | `Function` | Mark dirty manually                     |
| `.destroy()`    | `Function` | Clear cache and dependency tracking     |

```javascript
import { reactive } from "ement/core/reactive";
import { computed } from "ement/core/computed";

const state = reactive({ firstName: "John", lastName: "Doe" }, onChange);

const fullName = computed(() => `${state.firstName} ${state.lastName}`);

fullName.value; // 'John Doe' — computed on first read
fullName.value; // 'John Doe' — cached, compute fn NOT called again

state.firstName = "Jane"; // marks fullName dirty
fullName.value; // 'Jane Doe' — re-computed
```

## Dependency tracking

Dependencies are tracked by property path string (e.g. `"user.name"`). Tracking is global and synchronous — only one computed can track at a time. Do not call `computed().value` from within another computed's compute function in an async context.

```javascript
// This works — synchronous, nested reads are tracked correctly
const display = computed(() => {
  const n = fullName.value; // accesses state.firstName + state.lastName
  return `Hello, ${n}!`;
});
```

## Caveats

- Dependencies are captured on each re-computation. If a conditional branch changes which properties are read, the dependency set updates accordingly.
- Array mutations tracked through `reactive()` (push, splice, etc.) invalidate computeds that accessed the array.
- Does not track `toRaw()` accesses — bypassing the proxy bypasses tracking.

## AngularJS comparison

| AngularJS                              | Ement                                    |
| -------------------------------------- | ---------------------------------------- |
| `$scope.$watch(expr, fn)`              | `computed(fn)` — no callback, pull-based |
| Eager: runs on every `$digest`         | Lazy: only runs when `.value` is read    |
| Manual dependency declaration optional | Automatic dependency detection           |
