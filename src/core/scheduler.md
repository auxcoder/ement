# scheduler

Microtask-based update scheduler. Batches multiple reactive mutations into a single DOM update.

**Module:** `core/scheduler`
**Exports:** `scheduleUpdate`, `flushUpdates`, `pendingCount`

## Why it exists

`reactive()` fires its `onChange` callback synchronously per property mutation. Without batching, setting 5 properties would trigger 5 separate DOM re-renders. The scheduler deduplicates: the same update function scheduled multiple times in the same synchronous block runs only once, in the next microtask.

This is the equivalent of AngularJS's batched `$digest` cycle, but driven by `queueMicrotask` instead of a manual trigger.

## API

### `scheduleUpdate(updateFn)`

Enqueues an update function to run in the next microtask. If the same function reference is scheduled again before the batch flushes, it runs only once.

| Param      | Type       | Description                |
| ---------- | ---------- | -------------------------- |
| `updateFn` | `Function` | DOM update callback to run |

```javascript
import { scheduleUpdate } from "ement";

function renderCount() {
  document.querySelector("#count").textContent = state.count;
}

state.count = 1;
state.count = 2;
state.count = 3;
scheduleUpdate(renderCount); // called 3 times but renderCount runs only once
scheduleUpdate(renderCount);
scheduleUpdate(renderCount);
// → renderCount() fires once in the next microtask with count = 3
```

### `flushUpdates()`

Flushes all pending updates synchronously. Primarily used in tests to assert DOM state immediately after mutations without waiting for the microtask queue.

```javascript
import { scheduleUpdate, flushUpdates } from "ement";

scheduleUpdate(render);
flushUpdates(); // render() runs now, synchronously
// → safe to assert DOM state here
```

### `pendingCount()`

Returns the number of update functions currently queued. Useful for debugging or test assertions.

```javascript
scheduleUpdate(renderA);
scheduleUpdate(renderB);
pendingCount(); // 2
flushUpdates();
pendingCount(); // 0
```

## Batching guarantee

Updates scheduled while a batch is flushing are deferred to the **next** batch — there is no infinite loop risk. Each `flush()` copies and clears the queue before executing, so newly scheduled updates during execution go into a fresh batch.

## AngularJS comparison

| AngularJS                                     | Ement                                          |
| --------------------------------------------- | ---------------------------------------------- |
| `$scope.$digest()` — manual trigger           | `queueMicrotask` — automatic, browser-native   |
| All watchers re-evaluated on each digest      | Only explicitly scheduled functions run        |
| `$scope.$apply(fn)` to batch external changes | Call `scheduleUpdate` from reactive `onChange` |
