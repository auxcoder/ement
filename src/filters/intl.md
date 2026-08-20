# intl filters

Locale-aware display formatting using native `Intl` APIs. Replaces AngularJS's built-in `currency`, `date`, `number` filters.

**Module:** `filters/intl`
**Exports:** `formatCurrency`, `formatNumber`, `formatPercent`, `formatDate`, `formatRelative`, `formatList`, `formatPlural`

> **Filters vs formatters:** These functions are for display — labels, table cells, template bindings. For transforming values inside form inputs (model ↔ view), use [`forms/formatters`](../forms/formatters.md).

All functions accept an optional `locale` argument (BCP 47 tag, e.g. `'en-US'`, `'de-DE'`). When omitted, the user's browser locale is used.

## API

### `formatCurrency(value, currency?, locale?)`

```javascript
formatCurrency(1234.5); // '$1,234.50'  (en-US)
formatCurrency(1234.5, "EUR", "de-DE"); // '1.234,50 €'
```

| Param      | Default        |
| ---------- | -------------- |
| `currency` | `'USD'`        |
| `locale`   | browser locale |

### `formatNumber(value, options?, locale?)`

Wraps `Intl.NumberFormat`. Pass any `Intl.NumberFormat` options.

```javascript
formatNumber(1234567.89); // '1,234,567.89'
formatNumber(1234567.89, { maximumFractionDigits: 0 }); // '1,234,568'
formatNumber(0.00123, { notation: "scientific" }); // '1.23E-3'
```

### `formatPercent(value, locale?)`

Formats a decimal as a percentage.

```javascript
formatPercent(0.75); // '75%'
formatPercent(1.0); // '100%'
```

### `formatDate(value, style?, locale?)`

| Style                | Example (en-US)              |
| -------------------- | ---------------------------- |
| `'short'`            | `8/19/26`                    |
| `'medium'` (default) | `Aug 19, 2026`               |
| `'long'`             | `August 19, 2026`            |
| `'full'`             | `Wednesday, August 19, 2026` |

```javascript
formatDate(new Date()); // 'Aug 19, 2026'
formatDate("2026-01-01", "long"); // 'January 1, 2026'
formatDate(new Date(), "short", "de-DE"); // '19.8.26'
```

### `formatRelative(date, locale?)`

Formats a past or future date relative to now.

```javascript
formatRelative(Date.now() - 3 * 60 * 1000); // '3 minutes ago'
formatRelative(Date.now() - 2 * 86400 * 1000); // '2 days ago'
formatRelative(Date.now() + 86400 * 1000); // 'tomorrow'
```

Uses `Intl.RelativeTimeFormat` with `{ numeric: 'auto' }`.

### `formatList(items, type?, locale?)`

Joins an array into a locale-aware list string.

| Type                      | Example (en-US) |
| ------------------------- | --------------- |
| `'conjunction'` (default) | `"A, B, and C"` |
| `'disjunction'`           | `"A, B, or C"`  |
| `'unit'`                  | `"A, B, C"`     |

```javascript
formatList(["React", "Vue", "Svelte"]); // 'React, Vue, and Svelte'
formatList(["React", "Vue"], "disjunction"); // 'React or Vue'
formatList(["React", "Vue", "Svelte"], "conjunction", "es"); // 'React, Vue y Svelte'
```

### `formatPlural(count, forms, locale?)`

Select the correct plural form. `#` in the string is replaced by `count`.

```javascript
formatPlural(1, { one: "# item", other: "# items" }); // '1 item'
formatPlural(5, { one: "# item", other: "# items" }); // '5 items'
formatPlural(0, { one: "# item", other: "# items" }); // '0 items'
```

Supports all `Intl.PluralRules` categories: `zero`, `one`, `two`, `few`, `many`, `other`.

## AngularJS comparison

| AngularJS filter                   | Ement                                               |
| ---------------------------------- | --------------------------------------------------- |
| `{{ value \| currency }}`          | `formatCurrency(value)`                             |
| `{{ value \| date:'mediumDate' }}` | `formatDate(value, 'medium')`                       |
| `{{ value \| number:2 }}`          | `formatNumber(value, { maximumFractionDigits: 2 })` |
| No relative time                   | `formatRelative(date)`                              |
| No list formatting                 | `formatList(items)`                                 |
| No plural rules                    | `formatPlural(count, forms)`                        |
