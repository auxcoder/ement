# ElFormGroup

Aggregates multiple `ElField` instances into a form with unified state. Replaces AngularJS's form controller (`NgFormController`).

**Module:** `forms/form-group`
**Exports:** `ElFormGroup`

## Constructor

```javascript
new ElFormGroup(formElement?)
```

| Param         | Type              | Description |
| ------------- | ----------------- | ----------- |
| `formElement` | `HTMLFormElement` | Optional.   |

If provided, prevents native submit when the form is invalid and marks all fields touched so errors become visible.

## API

### `group.addField(name, field)`

Register an `ElField` under a name.

```javascript
group.addField("email", emailField);
group.addField("password", passwordField);
```

Returns `this` for chaining.

### `group.removeField(name)`

Unregister a field and call its `destroy()`.

### `group.field(name)`

Get a registered field by name.

```javascript
const email = group.field("email");
email.writeValue("user@example.com");
```

### `group.reset(values?)`

Reset all fields. Optionally provide a `{ fieldName: value }` map.

```javascript
group.reset();
group.reset({ email: "", password: "" });
```

### `group.destroy()`

Destroy all registered fields and clear the group.

## Aggregate state (read-only)

| Property        | Type      | Logic                                                         |
| --------------- | --------- | ------------------------------------------------------------- |
| `group.valid`   | `boolean` | `true` only if **all** fields are valid                       |
| `group.dirty`   | `boolean` | `true` if **any** field is dirty                              |
| `group.touched` | `boolean` | `true` if **any** field is touched                            |
| `group.pending` | `boolean` | `true` if **any** field has pending async validation          |
| `group.errors`  | `Object`  | `{ fieldName: { errorKey: true } }` — only fields with errors |

## Example

```javascript
import { ElFormGroup } from "ement/forms/form-group";
import { ElField } from "ement/forms/field";
import { required, email, minLength } from "ement/forms/validators";

const form = new ElFormGroup(document.querySelector("#login-form"));

form.addField(
  "email",
  new ElField(document.querySelector("#email"), {
    validators: [required, email],
  }),
);

form.addField(
  "password",
  new ElField(document.querySelector("#password"), {
    validators: [required, minLength(8)],
  }),
);

document.querySelector("#submit").addEventListener("click", () => {
  if (!form.valid) {
    console.log("Errors:", form.errors);
    return;
  }

  const email = form.field("email").modelValue;
  const password = form.field("password").modelValue;
  login(email, password);
});
```

## AngularJS comparison

| AngularJS form controller                      | Ement `ElFormGroup`                       |
| ---------------------------------------------- | ----------------------------------------- |
| Automatic via `<form name="myForm">` directive | Manual: `new ElFormGroup(formEl)`         |
| `$scope.myForm.$valid`                         | `form.valid`                              |
| `$scope.myForm.$dirty`                         | `form.dirty`                              |
| `$scope.myForm.$error`                         | `form.errors`                             |
| Fields auto-register via `ng-model`            | Fields manually registered via `addField` |
