# formatters

Model → view transform functions for use in `ElField`'s `formatters` pipeline.

**Module:** `forms/formatters`
**Exports:** `phone`, `date`, `mask`, `currency`, `percentage`

> **Formatters vs filters:** Formatters are for inputs — they control what the user sees and edits inside a form field. For display-only formatting in templates (labels, tables, spans), use [`filters/intl`](../filters/intl.md).

## Formatter signature

```
(modelValue: any) => viewValue: string
```

Formatters run left-to-right when `ElField.writeValue(model)` is called, transforming the model into a string for display in the input.

## Built-in formatters

### `phone`

Formats a 10-digit string into `(NNN) NNN-NNNN`. Passes through unchanged if not exactly 10 digits.

```javascript
phone("5551234567"); // '(555) 123-4567'
phone(""); // ''
phone("123"); // '123'  (not 10 digits — pass-through)
```

### `date`

Formats a `Date` or date string into `YYYY-MM-DD` (the format `<input type="date">` expects).

```javascript
date(new Date("2026-08-19")); // '2026-08-19'
date("2026-08-19T00:00:00Z"); // '2026-08-19'
date(null); // ''
```

### `mask(visible?, char?)`

Masks all but the last `visible` characters. Default: last 4 visible, mask char `•`.

```javascript
mask()("4111222233334444"); // '••••••••••••4444'
mask(4, "*")("4111222233334444"); // '************4444'
mask(4)("short"); // 'short'  (≤4 chars — no masking)
```

### `currency(decimals?, locale?)`

Formats a number with locale-aware thousand separators and fixed decimals. Does **not** add a currency symbol — use `filters/intl.formatCurrency` for display labels.

```javascript
currency()(1234.5); // '1,234.50'  (en locale)
currency(0)(1234.567); // '1,235'
currency(2, "de-DE")(1234.5); // '1.234,50'
```

### `percentage(decimals?)`

Converts a decimal to a percentage number string for display. The `%` symbol is not added — add it in the template label.

```javascript
percentage()(0.75); // '75'
percentage(1)(0.755); // '75.5'
percentage()(null); // ''
```

## Example: price input

```javascript
import { ElField } from "ement/forms/field";
import { trim, toNumber } from "ement/forms/parsers";
import { currency } from "ement/forms/formatters";
import { required, min } from "ement/forms/validators";

const priceField = new ElField(document.querySelector("#price"), {
  parsers: [trim, toNumber],
  formatters: [currency(2)],
  validators: [required, min(0)],
  onChange: (value) => {
    product.price = value;
  },
});

priceField.writeValue(product.price); // e.g. 1234.50 → input shows "1,234.50"
// User edits "1234.50" → parser converts to 1234.5 → model updated
```

## Custom formatters

```javascript
const yesNo = (v) => (v ? "Yes" : "No");
const initials = (v) =>
  v
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "";
```
