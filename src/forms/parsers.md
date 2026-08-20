# parsers

View → model transform functions for use in `ElField`'s `parsers` pipeline.

**Module:** `forms/parsers`
**Exports:** `trim`, `lowercase`, `uppercase`, `toNumber`, `toDate`, `toBoolean`, `stripNonDigits`, `maxLength`

## Parser signature

```
(viewValue: string) => modelValue | undefined
```

Parsers run left-to-right. Returning `undefined` halts the pipeline — the model value is not updated and no `onChange` fires.

## Built-in parsers

| Parser           | Input → Output                          | Notes                              |
| ---------------- | --------------------------------------- | ---------------------------------- |
| `trim`           | `" hello "` → `"hello"`                 | Strips leading/trailing whitespace |
| `lowercase`      | `"HELLO"` → `"hello"`                   |                                    |
| `uppercase`      | `"hello"` → `"HELLO"`                   |                                    |
| `toNumber`       | `"42"` → `42`, `""` → `null`            | Empty string becomes `null`        |
| `toDate`         | `"2026-01-15"` → `Date`                 | Returns `null` for empty string    |
| `toBoolean`      | `"true"` / `"1"` → `true`, else `false` | For checkbox or toggle inputs      |
| `stripNonDigits` | `"(555) 123-4567"` → `"5551234567"`     | Removes all non-digit characters   |
| `maxLength(n)`   | `"toolong"` → `"toolon"` (with n=6)     | Trims view value to max length     |

## Examples

```javascript
import { ElField } from "ement/forms/field";
import { trim, toNumber } from "ement/forms/parsers";

// Numeric input: whitespace-trimmed, cast to number
new ElField(document.querySelector("#price"), {
  parsers: [trim, toNumber],
});

// Phone input: strip formatting, keep only digits as model value
import { stripNonDigits } from "ement/forms/parsers";
new ElField(document.querySelector("#phone"), {
  parsers: [stripNonDigits],
});
```

## Custom parsers

A custom parser is any function `(value) => transformed`. Combine freely:

```javascript
const normalizeEmail = (v) => v?.trim().toLowerCase();
const parseJson = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};

new ElField(input, {
  parsers: [normalizeEmail],
});
```

## Halting the pipeline

Return `undefined` to signal that the input is unparseable and stop processing:

```javascript
const strictPositiveNumber = (v) => {
  const n = Number(v);
  return isNaN(n) || n <= 0 ? undefined : n;
};
```

When `undefined` is returned, `field.modelValue` stays at its last valid value and `onChange` is not called.
