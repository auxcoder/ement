# ElRouter

History-based SPA router with route groups, data resolvers, and transition hooks.

**Module:** `router/router`
**Exports:** `ElRouter`

## API

### `new ElRouter(outlet)`

| Param    | Type          | Description                                     |
| -------- | ------------- | ----------------------------------------------- |
| `outlet` | `HTMLElement` | DOM element where routed components are mounted |

### `router.route(pattern, component, options?)`

Register a route.

| Param             | Type                       | Description                                              |
| ----------------- | -------------------------- | -------------------------------------------------------- |
| `pattern`         | `string`                   | URL pattern (e.g. `/users/:id`)                          |
| `component`       | `string`                   | Custom element tag name to mount on match                |
| `options.resolve` | `async (params) => Object` | Async data loader. Result is set as `el.routeData`.      |
| `options.group`   | `string`                   | Name of a registered group to inherit its cached resolve |

Returns `this` for chaining.

### `router.group(name, options)`

Register a route group with a shared resolve function. Resolve runs once and is cached until `invalidateGroup(name)` is called.

```javascript
router
  .group("admin", {
    resolve: async () => ({ permissions: await fetchPermissions() }),
  })
  .route("/admin/users", "admin-users", { group: "admin" })
  .route("/admin/settings", "admin-settings", { group: "admin" });
```

### `router.onBefore(hookFn)`

Register a guard that runs before each navigation.

- Return `undefined` (or nothing) to continue.
- Return `false` to cancel navigation.
- Return a `string` path to redirect.

```javascript
router.onBefore(async (from, to) => {
  if (!auth.isLoggedIn && to.path !== "/login") {
    return "/login"; // redirect
  }
});
```

### `router.onSuccess(hookFn)`

Hook called after successful navigation. Receives `(from, to, data)`.

### `router.onError(hookFn)`

Hook called when navigation fails (resolve throws, etc.). Receives `(error, from, to)`.

### `router.navigate(path)`

Navigate programmatically. Pushes to `history` and resolves the route.

```javascript
router.navigate("/users/42");
```

### `router.start()`

Resolve the current URL (`location.pathname`). Call once after configuring routes to handle the initial page load.

### `router.current`

Read-only. Returns `{ path, params, route }` for the currently active route, or `null` if no route has resolved yet.

### `router.invalidateGroup(name)`

Clear a group's cached resolve data. The next navigation to a route in that group will re-run the group resolve.

## Mounted component properties

When a component mounts, the router sets two properties on the element:

| Property       | Value                                                 |
| -------------- | ----------------------------------------------------- |
| `el.params`    | URL parameters from the pattern (e.g. `{ id: '42' }`) |
| `el.routeData` | Merged result from group resolve + route resolve      |

## Events

`ElRouter extends EventTarget`. A `navigate` CustomEvent fires after each successful transition:

```javascript
router.addEventListener("navigate", (e) => {
  const { from, to, data } = e.detail;
});
```

## Full example

```javascript
import { ElRouter } from "ement/router/router";
import { interceptLinks } from "ement/router/links";

const outlet = document.querySelector("route-outlet");
const router = new ElRouter(outlet);

router
  .group("auth", { resolve: () => fetchCurrentUser() })
  .route("/", "app-home")
  .route("/login", "login-page")
  .route("/users", "users-list", { group: "auth" })
  .route("/users/:id", "user-detail", {
    group: "auth",
    resolve: ({ id }) => fetchUser(id),
  });

router.onBefore((from, to) => {
  if (requiresAuth(to.path) && !currentUser) return "/login";
});

interceptLinks(router);
router.start();
```

## AngularJS comparison

| AngularJS (`ngRoute`)                                    | Ement                                 |
| -------------------------------------------------------- | ------------------------------------- |
| `$routeProvider.when('/path', { controller, template })` | `router.route('/path', 'my-element')` |
| `$routeParams`                                           | `el.params` (set by router on mount)  |
| `resolve` in route config                                | `options.resolve` — same concept      |
| `$location.path('/new')`                                 | `router.navigate('/new')`             |
| No built-in guards                                       | `router.onBefore(fn)`                 |
