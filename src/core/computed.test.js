/**
 * Tests for core/computed.js
 * Run with: node --test src/core/computed.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reactive } from "./reactive.js";
import { computed } from "./computed.js";

describe("computed()", () => {
  it("computes a value from reactive state", () => {
    const state = reactive({ firstName: "John", lastName: "Doe" }, () => {});
    const fullName = computed(() => `${state.firstName} ${state.lastName}`);

    assert.equal(fullName.value, "John Doe");
  });

  it("re-computes when a dependency changes", () => {
    const state = reactive({ count: 1 }, () => {});
    const doubled = computed(() => state.count * 2);

    assert.equal(doubled.value, 2);

    state.count = 5;
    doubled.invalidate(); // dependency changed → mark dirty
    assert.equal(doubled.value, 10);
  });

  it("does not recalculate if deps unchanged (cached)", () => {
    let computeCount = 0;
    const state = reactive({ x: 10 }, () => {});
    const result = computed(() => {
      computeCount++;
      return state.x * 2;
    });

    result.value; // first compute
    result.value; // should use cache
    result.value; // should use cache

    assert.equal(computeCount, 1);
  });

  it("re-computes only after invalidation", () => {
    let computeCount = 0;
    const state = reactive({ x: 1 }, () => {});
    const result = computed(() => {
      computeCount++;
      return state.x + 100;
    });

    assert.equal(result.value, 101);
    assert.equal(computeCount, 1);

    // Not invalidated — still cached
    assert.equal(result.value, 101);
    assert.equal(computeCount, 1);

    // Invalidate and re-read
    state.x = 2;
    result.invalidate();
    assert.equal(result.value, 102);
    assert.equal(computeCount, 2);
  });

  it("is lazy — does not compute until .value is read", () => {
    let computeCount = 0;
    const state = reactive({ x: 1 }, () => {});

    const result = computed(() => {
      computeCount++;
      return state.x;
    });

    // Not read yet — should not have computed
    assert.equal(computeCount, 0);

    // Now read it
    result.value;
    assert.equal(computeCount, 1);
  });

  it("tracks nested property access", () => {
    const state = reactive({ user: { name: "Alice" } }, () => {});
    const greeting = computed(() => `Hello, ${state.user.name}`);

    assert.equal(greeting.value, "Hello, Alice");

    state.user.name = "Bob";
    greeting.invalidate();
    assert.equal(greeting.value, "Hello, Bob");
  });

  it("handles multiple reactive sources", () => {
    const a = reactive({ value: 1 }, () => {});
    const b = reactive({ value: 2 }, () => {});
    const sum = computed(() => a.value + b.value);

    assert.equal(sum.value, 3);

    a.value = 10;
    sum.invalidate();
    assert.equal(sum.value, 12);

    b.value = 20;
    sum.invalidate();
    assert.equal(sum.value, 30);
  });

  it("isDirty reflects computation state", () => {
    const state = reactive({ x: 1 }, () => {});
    const result = computed(() => state.x * 2);

    // Initially dirty (never computed)
    assert.equal(result.isDirty, true);

    result.value; // compute
    assert.equal(result.isDirty, false);

    result.invalidate();
    assert.equal(result.isDirty, true);

    result.value; // re-compute
    assert.equal(result.isDirty, false);
  });

  it("destroy cleans up and marks as dirty", () => {
    const state = reactive({ x: 1 }, () => {});
    const result = computed(() => state.x);

    assert.equal(result.value, 1);
    assert.equal(result.isDirty, false);

    result.destroy();

    // After destroy, it's dirty and cache is cleared
    assert.equal(result.isDirty, true);
  });
});
