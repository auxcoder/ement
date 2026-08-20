# ElField

Input binding with a `parsers → validators → onChange` pipeline, and a formatters pipeline for writing model values back to the input. Replaces AngularJS's `NgModelController`.

**Module:** `forms/field`
**Exports:** `ElField`

## Pipeline

```
User types → input event → parsers → validators → onChange(modelValue, state)
                                                         ↑
writeValue(model) → formatters → input.value ───────────┘
```

## Constructor

```javascript
new ElField(input, options?)
```

| Param                     | Type                     | Description                               |
| ------------------------- | ------------------------ | ----------------------------------------- |
| `input`                   | `HTMLElement`            | The element (`<input>`, `<select>`, etc.) |
| `options.parsers`         | `Function[]`             | view → model transform chain              |
| `options.formatters`      | `Function[]`             | model → view transform chain              |
| `options.validators`      | `Function[] \| Object`   | Sync validators (see below)               |
| `options.asyncValidators` | `Function[] \| Object`   | Async validators                          |
| `options.onChange`        | `(model, state) => void` | Called after each pipeline run            |
| `options.debounce`        | `number`                 | Debounce events in ms ( `0`)              |

## Validators

Two formats are supported:

**Array format (ement):** each function returns an error key string if invalid, or `null` if valid.

```javascript
validators: [
  (v) => (!v ? "required" : null),
  (v) => (v?.length < 3 ? "minLength" : null),
];
```

**Object format (AngularJS-compatible):** `{ errorKey: (modelValue, viewValue) => boolean }`. `true` = valid.

```javascript
validators: {
  required: (v) => !!v,
  minLength: (v) => !v || v.length >= 3,
}
```

Async validators follow the same two-format pattern, but receive a `signal` (`AbortSignal`) as the second argument and return a `Promise`. Async validators only run when all sync validators pass.

```javascript
asyncValidators: [
  async (v, signal) => {
    const taken = await checkUsername(v, signal);
    return taken ? "usernameTaken" : null;
  },
];
```

## State

All state is available as read-only properties:

| Property           | Type      | Description                                      |
| ------------------ | --------- | ------------------------------------------------ |
| `field.modelValue` | `any`     | Current model value (after parsers)              |
| `field.viewValue`  | `string`  | Current input string                             |
| `field.valid`      | `boolean` | `true` if no errors                              |
| `field.dirty`      | `boolean` | `true` after first user input                    |
| `field.touched`    | `boolean` | `true` after first blur                          |
| `field.pending`    | `boolean` | `true` while async validators run                |
| `field.errors`     | `Object`  | `{ errorKey: true }` for each active error       |
| `field.snapshot`   | `Object`  | Shallow copy of all state (passed to `onChange`) |

### CSS classes

Automatically toggled on the input element:

| Class                         | Condition                    |
| ----------------------------- | ---------------------------- |
| `el-valid` / `el-invalid`     | `valid` state                |
| `el-dirty` / `el-pristine`    | `dirty` state                |
| `el-touched` / `el-untouched` | `touched` state              |
| `el-pending`                  | Async validation in progress |

## Methods

### `field.writeValue(modelValue)`

Push a model value into the input. Runs formatters then sets `input.value`.

```javascript
field.writeValue(user.birthDate); // Date → "2000-01-15" (with date formatter)
```

### `field.reset(modelValue?)`

Reset dirty, touched, and errors. Optionally write a new value.

```javascript
field.reset(); // clear state, keep current value
field.reset(defaultUser.name); // clear state + write new value
```

### `field.markDirty()` / `field.markPristine()`

Programmatically set dirty state.

### `field.markTouched()`

Programmatically mark as touched.

### `field.destroy()`

Cancel pending async validation and clear debounce timers. Call when removing the input from the DOM.

## Example

```javascript
import { ElField } from "ement/forms/field";
import { trim, toNumber } from "ement/forms/parsers";
import { currency } from "ement/forms/formatters";
import { required, min } from "ement/forms/validators";

const priceField = new ElField(document.querySelector("#price"), {
  parsers: [trim, toNumber],
  formatters: [currency(2)],
  validators: [required, min(0)],
  onChange: (value, state) => {
    console.log("price:", value, "valid:", state.valid);
  },
  debounce: 300,
});

// Reflect model state into input:
priceField.writeValue(product.price);
```

## AngularJS comparison

| AngularJS `NgModelController`        | Ement `ElField`                     |
| ------------------------------------ | ----------------------------------- |
| `$parsers` array                     | `parsers` option                    |
| `$formatters` array                  | `formatters` option                 |
| `$validators` object                 | `validators` (array or object)      |
| `$asyncValidators` object            | `asyncValidators` (array or object) |
| `$setViewValue` (internal)           | `writeValue(model)`                 |
| `$render`                            | `writeValue(model)`                 |
| `$setPristine` / `$setDirty`         | `markPristine()` / `markDirty()`    |
| `ng-valid`, `ng-invalid` CSS classes | `el-valid`, `el-invalid`            |
