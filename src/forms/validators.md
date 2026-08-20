# validators

Common sync validator functions for use with `ElField`.

**Module:** `forms/validators`
**Exports:** `required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `email`

## Validator signature

```
(modelValue, viewValue?) => errorKey | null
```

Returns `null` if valid. Returns an error key string (e.g. `'required'`) if invalid.

## Built-in validators

### `required`

Fails if the value is falsy (but not `0`).

```javascript
required("hello"); // null
required(""); // 'required'
required(null); // 'required'
required(0); // null  — zero is a valid value
```

### `minLength(min)`

Fails if `value.length < min`.

```javascript
minLength(3)("hi"); // 'minLength'
minLength(3)("hey"); // null
minLength(3)(null); // null  — length check skipped if falsy
```

### `maxLength(max)`

Fails if `value.length > max`.

```javascript
maxLength(5)("toolong"); // 'maxLength'
maxLength(5)("ok"); // null
```

### `pattern(regex, key?)`

Fails if the value doesn't match the regex. `key` is the error name returned (default: `'pattern'`).

```javascript
pattern(/^\d+$/)("123"); // null
pattern(/^\d+$/)("abc"); // 'pattern'
pattern(/^\d+$/, "digits")("abc"); // 'digits'
```

### `min(min)`

Fails if `value < min` (numeric).

```javascript
min(0)(-1); // 'min'
min(0)(0); // null
```

### `max(max)`

Fails if `value > max` (numeric).

```javascript
max(100)(150); // 'max'
max(100)(50); // null
```

### `email`

Fails if the value is not a valid email format.

```javascript
email("a@b.com"); // null
email("notanemail"); // 'email'
email(""); // null  — empty passes (combine with required for mandatory emails)
```

## Combining validators

```javascript
import { ElField } from "ement/forms/field";
import { required, minLength, maxLength, email } from "ement/forms/validators";

new ElField(input, {
  validators: [required, minLength(3), maxLength(100), email],
});
```

The first validator to return an error key short-circuits — subsequent validators still run, but all active errors accumulate in `field.errors`.

## Custom validators

A custom validator is any function that matches the signature:

```javascript
const noSpaces = (v) => (v?.includes(" ") ? "noSpaces" : null);

const usernameField = new ElField(input, {
  validators: [required, noSpaces, minLength(3)],
});
```

## AngularJS-compatible object format

Validators can also be passed as an object for migration compatibility:

```javascript
validators: {
  required: (v) => !!v,
  minLength: (v) => !v || v.length >= 3,
}
```

`true` = valid, `false` = invalid. The key becomes the error name in `field.errors`.
