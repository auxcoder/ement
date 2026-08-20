# ElContainer

Interface-based dependency injection container. Replaces AngularJS's `$injector` and `$provide`.

**Module:** `di/container`
**Exports:** `ElContainer`

## Overview

Services are registered against `Symbol` tokens (the "interface") and resolved by token at runtime. Concrete implementations are never imported directly by consumers — they ask the container. This makes mocking in tests trivial: register a mock implementation against the same token.

Containers can be nested (parent/child). A child container resolves from its own registrations first, then delegates to its parent.

## API

### `new ElContainer(parent?)`

| Param    | Type                  | Description                             |
| -------- | --------------------- | --------------------------------------- |
| `parent` | `ElContainer \| null` | Optional parent for hierarchical lookup |

### `container.register(token, factory, options?)`

Register a service.

| Param               | Type                 | Description                                                  |
| ------------------- | -------------------- | ------------------------------------------------------------ |
| `token`             | `Symbol`             | The token to register against                                |
| `factory`           | `(container) => any` | Factory called, create the instance. Receives the container. |
| `options.singleton` | `boolean`            | Default `true`. If `false`, a new instance in `resolve`.     |

Returns `this` for chaining.

```javascript
container.register(HttpToken, (c) => new ElHttp({ baseUrl: "/api" }));
container.register(LoggerToken, () => console, { singleton: false });
```

### `container.resolve(token)`

Resolve a service by token. Throws if no provider is found anywhere in the ancestor chain.

```javascript
const http = container.resolve(HttpToken);
```

### `container.has(token)`

Check if a token is resolvable (this container or any ancestor).

```javascript
if (container.has(AuthToken)) {
  const auth = container.resolve(AuthToken);
}
```

### `container.createChild()`

Create a child container that inherits all parent registrations. Child registrations shadow the parent without mutating it.

```javascript
const testContainer = container.createChild();
testContainer.register(HttpToken, () => mockHttp);
// resolving HttpToken from testContainer returns mockHttp
// resolving from the parent is unchanged
```

## Circular dependency detection

If service A depends on service B which depends on service A, `resolve` throws:

```
Circular dependency detected while resolving Symbol(Http)
```

## Example: testing with a child container

```javascript
import { ElContainer } from "ement/di/container";
import { HttpToken } from "ement/di/tokens";

const appContainer = new ElContainer();
appContainer.register(HttpToken, () => new ElHttp({ baseUrl: "/api" }));

// In tests:
const testContainer = appContainer.createChild();
testContainer.register(HttpToken, () => ({
  get: () => Promise.resolve(mockData),
}));

const http = testContainer.resolve(HttpToken); // returns mock
```

## AngularJS comparison

| AngularJS                                  | Ement                                                 |
| ------------------------------------------ | ----------------------------------------------------- |
| `$provide.service('MyService', MyService)` | `container.register(MyToken, (c) => new MyService())` |
| `$injector.get('MyService')`               | `container.resolve(MyToken)`                          |
| String-based tokens                        | Symbol-based tokens — no name collisions              |
| Singleton by default                       | Singleton by default, configurable per registration   |
| Module-level registration                  | Instance-level — multiple containers in same app      |
