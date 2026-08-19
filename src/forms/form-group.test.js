/**
 * Tests for forms/form-group.js
 * Run with: node --test src/forms/form-group.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Field } from "./field.js";
import { FormGroup } from "./form-group.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(value = "") {
  const listeners = {};
  return {
    value,
    classList: {
      toggle() {},
      has() {
        return false;
      },
    },
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    type(v) {
      this.value = v;
      for (const fn of listeners["input"] || []) fn({ target: this });
    },
    blur() {
      for (const fn of listeners["blur"] || []) fn();
    },
  };
}

function makeForm() {
  const listeners = {};
  return {
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    submit() {
      let prevented = false;
      const event = {
        preventDefault() {
          prevented = true;
        },
      };
      for (const fn of listeners["submit"] || []) fn(event);
      return prevented;
    },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("FormGroup", () => {
  it("valid is false if any child field is invalid", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const emailInput = makeInput();
    const emailField = new Field(emailInput, {
      validators: [(v) => (!v ? "required" : null)],
    });

    const nameInput = makeInput();
    const nameField = new Field(nameInput);

    group.addField("email", emailField);
    group.addField("name", nameField);

    emailInput.type(""); // triggers required error
    assert.equal(group.valid, false);

    emailInput.type("test@test.com");
    assert.equal(group.valid, true);
  });

  it("dirty is true if any child field is dirty", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input1 = makeInput();
    const input2 = makeInput();
    group.addField("a", new Field(input1));
    group.addField("b", new Field(input2));

    assert.equal(group.dirty, false);

    input1.type("changed");
    assert.equal(group.dirty, true);
  });

  it("touched is true if any child field is touched", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input1 = makeInput();
    const input2 = makeInput();
    group.addField("a", new Field(input1));
    group.addField("b", new Field(input2));

    assert.equal(group.touched, false);

    input2.blur();
    assert.equal(group.touched, true);
  });

  it("errors aggregates all field errors", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const emailInput = makeInput();
    const passInput = makeInput();
    group.addField(
      "email",
      new Field(emailInput, {
        validators: [(v) => (!v ? "required" : null)],
      }),
    );
    group.addField(
      "password",
      new Field(passInput, {
        validators: [
          (v) => (!v ? "required" : null),
          (v) => (v && v.length < 8 ? "minLength" : null),
        ],
      }),
    );

    emailInput.type("");
    passInput.type("short");

    assert.deepEqual(group.errors, {
      email: { required: true },
      password: { minLength: true },
    });
  });

  it("blocks form submit when invalid and marks all touched", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input1 = makeInput();
    const input2 = makeInput();
    const field1 = new Field(input1, {
      validators: [(v) => (!v ? "required" : null)],
    });
    const field2 = new Field(input2, {
      validators: [(v) => (!v ? "required" : null)],
    });
    group.addField("a", field1);
    group.addField("b", field2);

    // Both empty → invalid
    input1.type("");
    input2.type("");

    const prevented = form.submit();
    assert.equal(prevented, true);
    assert.equal(field1.touched, true);
    assert.equal(field2.touched, true);
  });

  it("allows submit when valid", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input = makeInput();
    group.addField("name", new Field(input));
    input.type("Alice");

    const prevented = form.submit();
    assert.equal(prevented, false);
  });

  it("reset() resets all fields with values", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const emailInput = makeInput();
    const passInput = makeInput();
    const emailField = new Field(emailInput, { formatters: [(v) => v ?? ""] });
    const passField = new Field(passInput, { formatters: [(v) => v ?? ""] });
    group.addField("email", emailField);
    group.addField("password", passField);

    emailInput.type("dirty@mail.com");
    passInput.type("secret");

    group.reset({ email: "", password: "" });

    assert.equal(emailField.dirty, false);
    assert.equal(passField.dirty, false);
    assert.equal(emailInput.value, "");
    assert.equal(passInput.value, "");
  });

  it("field() returns individual field", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input = makeInput();
    const field = new Field(input);
    group.addField("name", field);

    assert.strictEqual(group.field("name"), field);
    assert.equal(group.field("missing"), undefined);
  });

  it("removeField() destroys and removes", () => {
    const form = makeForm();
    const group = new FormGroup(form);

    const input = makeInput();
    const field = new Field(input);
    group.addField("temp", field);

    group.removeField("temp");
    assert.equal(group.field("temp"), undefined);
  });
});
