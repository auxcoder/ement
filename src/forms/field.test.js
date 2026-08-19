/**
 * Tests for forms/field.js
 * Run with: node --test src/forms/field.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Field } from "./field.js";

// ─── Mock Input ────────────────────────────────────────────────────────────────

function makeInput(initialValue = "") {
  const listeners = {};
  const classes = new Set();
  return {
    value: initialValue,
    classList: {
      toggle(cls, force) {
        force ? classes.add(cls) : classes.delete(cls);
      },
      has(cls) {
        return classes.has(cls);
      },
    },
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    // Helper: simulate typing
    type(value) {
      this.value = value;
      for (const fn of listeners["input"] || []) {
        fn({ target: this });
      }
    },
    // Helper: simulate blur
    blur() {
      for (const fn of listeners["blur"] || []) fn();
    },
    _classes: classes,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Field — core pipeline", () => {
  it("runs parsers on input (view → model)", () => {
    const input = makeInput();
    let received;

    const field = new Field(input, {
      parsers: [(v) => v.trim(), (v) => v.toLowerCase()],
      onChange: (modelValue) => {
        received = modelValue;
      },
    });

    input.type("  HELLO  ");

    assert.equal(received, "hello");
    assert.equal(field.modelValue, "hello");
    assert.equal(field.viewValue, "  HELLO  ");
  });

  it("parser returning undefined halts pipeline", () => {
    const input = makeInput();
    let onChangeCalled = false;

    const field = new Field(input, {
      parsers: [
        (v) => (v === "" ? undefined : v), // reject empty
      ],
      onChange: () => {
        onChangeCalled = true;
      },
    });

    input.type("");

    // onChange still fires (with undefined modelValue)
    assert.equal(field.modelValue, undefined);
  });

  it("onChange receives modelValue and full state", () => {
    const input = makeInput();
    let receivedState;

    const field = new Field(input, {
      onChange: (modelValue, state) => {
        receivedState = state;
      },
    });

    input.type("hello");

    assert.equal(receivedState.modelValue, "hello");
    assert.equal(receivedState.viewValue, "hello");
    assert.equal(receivedState.dirty, true);
    assert.equal(receivedState.valid, true);
  });

  it("marks field dirty on input", () => {
    const input = makeInput();
    const field = new Field(input);

    assert.equal(field.dirty, false);
    input.type("x");
    assert.equal(field.dirty, true);
  });

  it("marks field touched on blur", () => {
    const input = makeInput();
    const field = new Field(input);

    assert.equal(field.touched, false);
    input.blur();
    assert.equal(field.touched, true);
  });
});

describe("Field — writeValue (formatters)", () => {
  it("runs formatters and sets input value", () => {
    const input = makeInput();
    const field = new Field(input, {
      formatters: [(v) => (v == null ? "" : String(v))],
    });

    field.writeValue(42);

    assert.equal(input.value, "42");
    assert.equal(field.modelValue, 42);
    assert.equal(field.viewValue, "42");
  });

  it("phone formatter example", () => {
    const input = makeInput();
    const field = new Field(input, {
      formatters: [
        (v) => {
          if (!v) return "";
          return `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6, 10)}`;
        },
      ],
    });

    field.writeValue("5551234567");

    assert.equal(input.value, "(555) 123-4567");
  });
});

describe("Field — sync validators", () => {
  it("populates errors object on invalid input (array format)", () => {
    const input = makeInput();
    const field = new Field(input, {
      validators: [
        (v) => (!v ? "required" : null),
        (v) => (v && v.length < 3 ? "minLength" : null),
      ],
    });

    input.type("");
    assert.equal(field.valid, false);
    assert.deepEqual(field.errors, { required: true });

    input.type("ab");
    assert.equal(field.valid, false);
    assert.deepEqual(field.errors, { minLength: true });

    input.type("abc");
    assert.equal(field.valid, true);
    assert.deepEqual(field.errors, {});
  });

  it("supports object format — AngularJS-compatible (boolean return)", () => {
    const input = makeInput();
    const field = new Field(input, {
      validators: {
        required: (v) => !!v,
        phone: (v) => /^\d{10}$/.test(v),
      },
    });

    input.type("");
    assert.equal(field.valid, false);
    assert.deepEqual(field.errors, { required: true, phone: true });

    input.type("abc");
    assert.equal(field.valid, false);
    assert.deepEqual(field.errors, { phone: true });

    input.type("5551234567");
    assert.equal(field.valid, true);
    assert.deepEqual(field.errors, {});
  });
});

describe("Field — async validators", () => {
  it("marks pending during async validation", async () => {
    const input = makeInput();
    let resolveValidator;

    const field = new Field(input, {
      asyncValidators: [
        (value, signal) =>
          new Promise((r) => {
            resolveValidator = r;
          }),
      ],
    });

    input.type("test");
    assert.equal(field.pending, true);

    resolveValidator(null); // valid
    await new Promise((r) => setTimeout(r, 5));

    assert.equal(field.pending, false);
    assert.equal(field.valid, true);
  });

  it("cancels stale async validation on new input", async () => {
    const input = makeInput();
    let callCount = 0;
    let signals = [];

    const field = new Field(input, {
      asyncValidators: [
        async (value, signal) => {
          callCount++;
          signals.push(signal);
          await new Promise((r) => setTimeout(r, 50));
          if (signal.aborted) return null;
          return value === "taken" ? "emailTaken" : null;
        },
      ],
    });

    input.type("first");
    input.type("second"); // should abort the first

    assert.equal(signals[0].aborted, true); // first was cancelled

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(field.pending, false);
  });
});

describe("Field — CSS classes", () => {
  it("applies ng-dirty, ng-pristine classes", () => {
    const input = makeInput();
    const field = new Field(input);

    // Before any interaction, no classes yet (sync happens on events)
    // Type to trigger dirty
    input.type("x");
    assert.ok(input._classes.has("ng-dirty"));
    assert.ok(!input._classes.has("ng-pristine"));

    // Reset to pristine
    field.markPristine();
    assert.ok(!input._classes.has("ng-dirty"));
    assert.ok(input._classes.has("ng-pristine"));
  });

  it("applies ng-touched on blur", () => {
    const input = makeInput();
    const field = new Field(input);

    assert.ok(!input._classes.has("ng-touched"));
    input.blur();
    assert.ok(input._classes.has("ng-touched"));
    assert.ok(!input._classes.has("ng-untouched"));
  });

  it("applies ng-valid / ng-invalid", () => {
    const input = makeInput();
    const field = new Field(input, {
      validators: [(v) => (!v ? "required" : null)],
    });

    input.type("");
    assert.ok(input._classes.has("ng-invalid"));

    input.type("x");
    assert.ok(input._classes.has("ng-valid"));
  });
});

describe("Field — programmatic controls", () => {
  it("reset() clears dirty, touched, and writes value", () => {
    const input = makeInput();
    const field = new Field(input, {
      formatters: [(v) => v ?? ""],
    });

    input.type("dirty");
    input.blur();
    assert.equal(field.dirty, true);
    assert.equal(field.touched, true);

    field.reset("clean");
    assert.equal(field.dirty, false);
    assert.equal(field.touched, false);
    assert.equal(input.value, "clean");
    assert.equal(field.modelValue, "clean");
  });

  it("destroy() clears timeout and aborts async", () => {
    const input = makeInput();
    const field = new Field(input, {
      debounce: 1000,
      asyncValidators: [async () => null],
    });

    input.type("x");
    // Should not throw
    field.destroy();
  });
});

describe("Field — debounce", () => {
  it("debounces input events", async () => {
    const input = makeInput();
    let callCount = 0;

    const field = new Field(input, {
      debounce: 30,
      onChange: () => {
        callCount++;
      },
    });

    input.type("a");
    input.type("ab");
    input.type("abc");

    assert.equal(callCount, 0); // not fired yet

    await new Promise((r) => setTimeout(r, 50));
    assert.equal(callCount, 1); // fired once after debounce
  });

  it("debounce 0 fires immediately", () => {
    const input = makeInput();
    let callCount = 0;

    const field = new Field(input, {
      debounce: 0,
      onChange: () => {
        callCount++;
      },
    });

    input.type("x");
    assert.equal(callCount, 1);
  });
});
