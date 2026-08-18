/**
 * Tests for core/reactive.js
 * Run with: node --test src/core/reactive.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reactive, toRaw, isReactive } from "./reactive.js";

describe("reactive()", () => {
  it("triggers onChange when a property is set", () => {
    const changes = [];
    const state = reactive({ name: "World" }, (prop, value, old) => {
      changes.push({ prop, value, old });
    });

    state.name = "Universe";

    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "name");
    assert.equal(changes[0].value, "Universe");
    assert.equal(changes[0].old, "World");
  });

  it("does not trigger onChange when value is the same", () => {
    const changes = [];
    const state = reactive({ count: 5 }, (prop) => {
      changes.push(prop);
    });

    state.count = 5; // same value
    assert.equal(changes.length, 0);
  });

  it("handles NaN correctly (NaN === NaN should not trigger)", () => {
    const changes = [];
    const state = reactive({ value: NaN }, (prop) => {
      changes.push(prop);
    });

    state.value = NaN; // Object.is(NaN, NaN) is true
    assert.equal(changes.length, 0);
  });

  it("triggers onChange for nested property mutations", () => {
    const changes = [];
    const state = reactive({ user: { name: "Alice" } }, (prop, value) => {
      changes.push({ prop, value });
    });

    state.user.name = "Bob";

    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "user.name");
    assert.equal(changes[0].value, "Bob");
  });

  it("triggers onChange for deeply nested mutations", () => {
    const changes = [];
    const state = reactive({ a: { b: { c: "deep" } } }, (prop, value) => {
      changes.push({ prop, value });
    });

    state.a.b.c = "deeper";

    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "a.b.c");
    assert.equal(changes[0].value, "deeper");
  });

  it("handles array push", () => {
    const changes = [];
    const state = reactive({ items: ["a", "b"] }, (prop) => {
      changes.push(prop);
    });

    state.items.push("c");

    // Array mutator triggers once for the whole operation
    assert.ok(changes.length >= 1);
    assert.equal(state.items.length, 3);
    assert.equal(state.items[2], "c");
  });

  it("handles array splice", () => {
    const changes = [];
    const state = reactive({ items: ["a", "b", "c"] }, (prop) => {
      changes.push(prop);
    });

    state.items.splice(1, 1);

    assert.ok(changes.length >= 1);
    assert.deepEqual(toRaw(state.items), ["a", "c"]);
  });

  it("handles array pop and shift", () => {
    const changes = [];
    const state = reactive({ items: [1, 2, 3] }, (prop) => {
      changes.push(prop);
    });

    const popped = state.items.pop();
    assert.equal(popped, 3);
    assert.equal(state.items.length, 2);

    const shifted = state.items.shift();
    assert.equal(shifted, 1);
    assert.equal(state.items.length, 1);
  });

  it("handles array sort and reverse", () => {
    const changes = [];
    const state = reactive({ items: [3, 1, 2] }, (prop) => {
      changes.push(prop);
    });

    state.items.sort();
    assert.deepEqual(toRaw(state.items), [1, 2, 3]);

    state.items.reverse();
    assert.deepEqual(toRaw(state.items), [3, 2, 1]);
  });

  it("handles property deletion", () => {
    const changes = [];
    const state = reactive({ a: 1, b: 2 }, (prop, value, old) => {
      changes.push({ prop, value, old });
    });

    delete state.b;

    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "b");
    assert.equal(changes[0].value, undefined);
    assert.equal(changes[0].old, 2);
    assert.equal("b" in state, false);
  });

  it("does not double-wrap an already reactive object", () => {
    const state = reactive({ x: 1 }, () => {});
    const again = reactive(state, () => {});
    assert.strictEqual(state, again);
  });

  it("handles circular references without infinite loop", () => {
    const obj = { name: "root" };
    obj.self = obj; // circular

    const changes = [];
    const state = reactive(obj, (prop, value) => {
      changes.push({ prop, value });
    });

    // Access circular reference — should not throw
    assert.equal(state.self.name, "root");

    // Mutate through circular path
    state.self.name = "changed";
    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "self.name");
  });

  it("handles setting a new nested object", () => {
    const changes = [];
    const state = reactive({ config: null }, (prop, value) => {
      changes.push({ prop, value });
    });

    state.config = { theme: "dark" };
    assert.equal(changes.length, 1);
    assert.equal(changes[0].prop, "config");

    // New nested object should also be reactive
    state.config.theme = "light";
    assert.equal(changes.length, 2);
    assert.equal(changes[1].prop, "config.theme");
    assert.equal(changes[1].value, "light");
  });
});

describe("toRaw()", () => {
  it("returns the underlying object", () => {
    const original = { x: 1, nested: { y: 2 } };
    const state = reactive(original, () => {});

    assert.strictEqual(toRaw(state), original);
  });

  it("returns the input if not a proxy", () => {
    const obj = { x: 1 };
    assert.strictEqual(toRaw(obj), obj);
    assert.strictEqual(toRaw(null), null);
    assert.strictEqual(toRaw(undefined), undefined);
  });
});

describe("isReactive()", () => {
  it("returns true for reactive proxies", () => {
    const state = reactive({ x: 1 }, () => {});
    assert.equal(isReactive(state), true);
  });

  it("returns false for plain objects", () => {
    assert.equal(isReactive({ x: 1 }), false);
    assert.equal(isReactive(null), false);
    assert.equal(isReactive(42), false);
  });
});
