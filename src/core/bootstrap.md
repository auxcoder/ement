# bootstrap

Application entry point helper. Wires together an `ElContainer`, `ElHttp`, and optionally an `ElRouter` in one call.

**Module:** `core/bootstrap`
**Exports:** `bootstrap`

## API

### `bootstrap(root, config)`

| Param             | Type                         | Description                                                                    |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `root`            | `string \ HTMLElement`       | CSS selector or element to attach the container to                             |
| `config.services` | `Array<[Symbol, Function]>`  | Additional `[token, factory]` pairs to register                                |
| `config.http`     | `Object`                     | `ElHttp` constructor options (`baseUrl`, `interceptors`, `timeout`, `retries`) |
| `config.routes`   | `(router: ElRouter) => void` | Configure routes and hooks                                                     |
| `config.outlet`   | `string`                     | CSS selector for the outlet inside root (default: `'route-outlet'`)            |

Returns `{ container, router, http }`.

- `container` — the root `ElContainer`. Use to resolve services imperatively.
- `router` — the `ElRouter` instance, or `null` if `config.routes` was not provided.
- `http` — the `ElHttp` instance registered under `HttpToken`.

## Example

```javascript
import { bootstrap } from "ement";
import { AuthToken } from "ement/di/tokens";
import { AuthService } from "./services/auth.js";

const app = bootstrap("#app", {
  http: {
    baseUrl: "/api",
    timeout: 10_000,
    interceptors: [
      {
        request: (config) => {
          config.headers["Authorization"] = `Bearer ${AuthService.token}`;
          return config;
        },
      },
    ],
  },

  services: [[AuthToken, () => new AuthService()]],

  routes: (router) => {
    router
      .route("/", "app-home")
      .route("/login", "app-login")
      .route("/users/:id", "user-detail", {
        resolve: async ({ id }) => ({
          user: await fetch(`/api/users/${id}`).then((r) => r.json()),
        }),
      });

    router.onBefore(async (from, to) => {
      const auth = app.container.resolve(AuthToken);
      if (!auth.isLoggedIn && to.path !== "/login") return "/login";
    });
  },
});
```

## What it does internally

1. Finds the `root` element — throws if not found.
2. Creates a new `ElContainer`.
3. Creates an `ElHttp` with `config.http` options and registers it under `HttpToken`.
4. Registers all `config.services` entries.
5. Calls `provideContainer(rootEl, container)` — attaches the container to the DOM subtree.
6. If `config.routes` is provided: creates `ElRouter` targeting the outlet element, registers it under `RouterToken`, calls `config.routes(router)`, installs link interception, and calls `router.start()`.

## Notes

- Calling `bootstrap` multiple times (e.g., for micro-frontend embedding) creates independent container trees.
- The `container` is attached to the root DOM element via a Symbol key. Any `ElElement` descendant can call `resolveContainer(this)` to reach it.
- Services are registered as singletons by default.
