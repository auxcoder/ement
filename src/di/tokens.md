# Service Tokens

Symbol constants that act as interface tokens for the DI container.

**Module:** `di/tokens`
**Exports:** `HttpToken`, `RouterToken`, `StorageToken`, `AuthToken`

## What tokens are

A token is a `Symbol` — a unique, unforgeable key. Consumers ask the container for a service by token; they never reference the concrete implementation class. This decouples usage from implementation and makes mocking trivial.

```javascript
// Consumer asks for "an HTTP client":
const http = container.resolve(HttpToken);

// Doesn't matter what concrete class is behind it:
container.register(HttpToken, () => new ElHttp()); // production
container.register(HttpToken, () => new MockHttp()); // tests
```

## Built-in tokens

| Token          | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `HttpToken`    | The HTTP client service (`ElHttp` by default)                         |
| `RouterToken`  | The SPA router service (`ElRouter` by default)                        |
| `StorageToken` | A storage service (not provided built-in — register your own)         |
| `AuthToken`    | An authentication service (not provided built-in — register your own) |

`bootstrap()` automatically registers `HttpToken` and `RouterToken`. `StorageToken` and `AuthToken` are conventions — register whatever implementation you choose.

## Defining custom tokens

Create your own tokens for application services using the same pattern:

```javascript
// tokens.js (your app)
export const UserServiceToken = Symbol("UserService");
export const AnalyticsToken = Symbol("Analytics");
```

```javascript
import { UserServiceToken } from "./tokens.js";
import { UserService } from "./user.service.js";

container.register(UserServiceToken, (c) => {
  const http = c.resolve(HttpToken);
  return new UserService(http);
});
```

## AngularJS comparison

| AngularJS                                          | Ement                                       |
| -------------------------------------------------- | ------------------------------------------- |
| String service names: `$injector.get('MyService')` | Symbol tokens: `container.resolve(MyToken)` |
| Name collisions possible                           | Symbols are globally unique — no collisions |
| Minification can break string-based injection      | Symbols survive minification                |
