# Modern AngularJS — Design Document

## Overview

This document describes the architecture of **"ng-modern"** — a learning-oriented micro-framework that reimagines AngularJS using native browser APIs. The design prioritizes clarity and minimal code over production-readiness.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Code                         │
│   (Custom Elements defined using NgElement base class)          │
├─────────────────────────────────────────────────────────────────┤
│                        ng-modern core                           │
│  ┌───────────┐  ┌───────────┐  ┌────────┐  ┌───────────────┐  │
│  │ Reactivity│  │ Component │  │ Router │  │ HTTP / Fetch  │  │
│  │  (Proxy)  │  │  (CE+SD)  │  │(History)│  │   wrapper     │  │
│  └───────────┘  └───────────┘  └────────┘  └───────────────┘  │
│  ┌───────────┐  ┌───────────┐  ┌────────┐  ┌───────────────┐  │
│  │   Forms   │  │ Animation │  │  DI    │  │   Security    │  │
│  │(Validity) │  │  (WAAPI)  │  │ (Map)  │  │(TrustedTypes) │  │
│  └───────────┘  └───────────┘  └────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Browser Platform APIs                         │
│  Custom Elements, Shadow DOM, Proxy, fetch, History,            │
│  Web Animations, Intl, Trusted Types, Constraint Validation     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Design

Each module is a standalone ES module that can be imported independently. No central "angular.module()" registration.

### File Structure

```
src/
├── core/
│   ├── reactive.js          # Proxy-based reactivity
│   ├── scheduler.js         # Microtask batched DOM updates
│   └── element.js           # NgElement base class (template resolution)
├── di/
│   ├── container.js         # Core DI container (interface-based)
│   └── tokens.js            # Service interface tokens (Symbols)
├── router/
│   ├── router.js            # History-based router
│   └── route-outlet.js      # <route-outlet> custom element
├── http/
│   └── http.js              # fetch() wrapper with interceptors
├── forms/
│   ├── field.js             # Field class (NgModelController reimagined)
│   ├── form-group.js        # FormGroup aggregation
│   ├── parsers.js           # Common parser functions
│   ├── formatters.js        # Common formatter functions
│   └── validators.js        # Common validator functions
├── animate/
│   └── animate.js           # Web Animations API helpers
├── security/
│   └── sanitize.js          # HTML sanitization
├── filters/
│   └── intl.js              # Intl-based formatting
└── index.js                 # Main entry point (re-exports all)
```

**Root project files:**

```
ng-modern/
├── src/                     # Framework source (structure above)
├── vite-plugins/
│   └── inline-templates.js  # Rollup plugin: inlines .html/.css at build time
├── vite.config.js           # Vite configuration (dev server + build)
├── package.json             # Scripts: dev, build, build:lib, preview, size
├── index.html               # Dev entry point (Vite dev server serves this)
└── dist/                    # Build output (gitignored)
```

**Application component convention (co-located files):**

```
app/
├── components/
│   ├── user-card/
│   │   ├── user-card.js     # Logic only — imports template/styles via URL
│   │   ├── user-card.html   # Real HTML file (full tooling support)
│   │   └── user-card.css    # Real CSS file (stylelint, PostCSS, etc.)
│   └── nav-bar/
│       ├── nav-bar.js
│       ├── nav-bar.html
│       └── nav-bar.css
├── services/
│   └── auth.js              # Service implementations
└── main.js                  # App bootstrap + DI container setup
```

---

## Core Module: Reactivity System

### How AngularJS Did It (Digest Cycle)

```javascript
// AngularJS: register a watcher, then trigger digest to detect changes
$scope.$watch("name", function (newVal, oldVal) {
  // react to change
});
$scope.name = "World";
$scope.$apply(); // manually trigger dirty checking
```

Problems:

- O(n) dirty checking — every watcher runs on every digest
- Needs manual `$apply()` for external async (setTimeout, fetch, etc.)
- Max 10 digest iterations before giving up (TTL)
- Watchers checked by reference or deep equality (expensive)

### How We Do It (Proxy)

```javascript
// Modern: changes are detected as they happen
import { reactive } from "./core/reactive.js";

const state = reactive({ name: "World" }, (prop, value) => {
  // this runs immediately when state.name is assigned
  updateDOM(prop, value);
});

state.name = "Universe"; // callback fires automatically
```

### Implementation Design

```javascript
// core/reactive.js
export function reactive(target, onChange) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const oldValue = obj[prop];
      obj[prop] = value;
      if (oldValue !== value) {
        onChange(prop, value, oldValue);
      }
      return true;
    },
    get(obj, prop) {
      const value = obj[prop];
      // Deep reactivity: wrap nested objects
      if (value && typeof value === "object" && !value.__isProxy) {
        obj[prop] = reactive(value, (nestedProp, val, old) => {
          onChange(`${prop}.${nestedProp}`, val, old);
        });
        return obj[prop];
      }
      return value;
    },
  });
}
```

### Batched Updates (Scheduler)

To avoid redundant DOM updates when multiple properties change in the same synchronous block:

```javascript
// core/scheduler.js
let pending = false;
let queue = new Set();

export function scheduleUpdate(updateFn) {
  queue.add(updateFn);
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      for (const fn of queue) fn();
      queue.clear();
      pending = false;
    });
  }
}
```

**Trade-off analysis**: AngularJS's digest cycle batched naturally (all watchers run in one pass). Our Proxy fires per-property, so we need explicit batching via microtask. This is essentially what Vue 3 does.

---

## Core Module: Component System

### How AngularJS Did It (Directives)

```javascript
// AngularJS: define a directive with DDO (Directive Definition Object)
angular.module("app").directive("userCard", function () {
  return {
    restrict: "E",
    scope: { user: "=" },
    templateUrl: "components/user-card.html", // separate HTML file!
    link: function (scope, element, attrs) {
      // DOM manipulation here
    },
  };
});
```

AngularJS's `templateUrl` was great DX — real HTML files with full tooling support. We preserve this.

### How We Do It (Custom Elements + External Templates)

**File structure (co-located):**

```
components/user-card/
├── user-card.js       ← logic only
├── user-card.html     ← real HTML file (lintable, formattable, IDE support)
└── user-card.css      ← real CSS file (stylelint, PostCSS, etc.)
```

**user-card.html:**

```html
<div class="card">
  <h2><slot name="title"></slot></h2>
  <p class="name">{{ userName }}</p>
</div>
```

**user-card.css:**

```css
.card {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 4px;
}
.name {
  color: #333;
  margin: 0;
}
```

**user-card.js:**

```javascript
import { NgElement } from "ng-modern";

class UserCard extends NgElement {
  static observedAttributes = ["user-name"];
  static templateUrl = new URL("./user-card.html", import.meta.url);
  static stylesUrl = new URL("./user-card.css", import.meta.url);

  // Reactive properties — this is ALL the JS you write
  userName = "";
}

customElements.define("user-card", UserCard);
```

**Key insight**: `import.meta.url` resolves relative to the module file itself. No IDs, no string conventions, no mismatches. The URL is always correct because it's relative to where the JS file lives.

### NgElement Base Class Design

```javascript
// core/element.js
import { reactive } from "./reactive.js";
import { scheduleUpdate } from "./scheduler.js";

export class NgElement extends HTMLElement {
  #shadow;
  #bindings = new Map(); // tracks {{ expr }} → DOM text nodes

  // Class-level template cache — fetched once per component TYPE, not per instance
  static #resolvedTemplate = null;
  static #resolvedStyles = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });

    // Make component state reactive
    reactive(this, (prop, value) => {
      scheduleUpdate(() => this.#updateBindings(prop, value));
    });
  }

  async connectedCallback() {
    await this.constructor.#ensureResources();
    this.#render();
    this.onInit?.();
  }

  disconnectedCallback() {
    this.onDestroy?.();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const prop = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const oldPropValue = this[prop];
    this[prop] = newValue;
    // Notify onChanges lifecycle hook
    this.onChanges?.({
      [prop]: {
        previous: oldPropValue,
        current: newValue,
        firstChange: oldValue === null,
      },
    });
  }

  /**
   * Template resolution — ONE path, TWO behaviors:
   * - With bundler: templateUrl is replaced with inline string at build time (sync, zero cost)
   * - Without bundler: fetches the URL and caches at class level (async only on first instance)
   */
  static async #ensureResources() {
    if (this.#resolvedTemplate) return; // already cached

    // Template
    if (typeof this.template === "string") {
      // Build step already inlined it
      this.#resolvedTemplate = this.template;
    } else if (this.templateUrl) {
      const res = await fetch(this.templateUrl);
      this.#resolvedTemplate = await res.text();
    }

    // Styles
    if (typeof this.styles === "string") {
      this.#resolvedStyles = this.styles;
    } else if (this.stylesUrl) {
      const res = await fetch(this.stylesUrl);
      this.#resolvedStyles = await res.text();
    }
  }

  #render() {
    const template = this.constructor.#resolvedTemplate;
    const styles = this.constructor.#resolvedStyles;

    // Add scoped styles
    if (styles) {
      const styleEl = document.createElement("style");
      styleEl.textContent = styles;
      this.#shadow.appendChild(styleEl);
    }

    // Parse template and find bindings
    const tpl = document.createElement("template");
    tpl.innerHTML = template;
    const content = tpl.content.cloneNode(true);
    this.#parseBindings(content);
    this.#shadow.appendChild(content);
  }

  #parseBindings(node) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const matches = textNode.textContent.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
      for (const match of matches) {
        const prop = match[1];
        if (!this.#bindings.has(prop)) this.#bindings.set(prop, []);
        this.#bindings.get(prop).push({
          node: textNode,
          template: textNode.textContent,
        });
      }
    }
    // Initial render
    for (const [prop, nodes] of this.#bindings) {
      this.#updateBindings(prop, this[prop]);
    }
  }

  #updateBindings(prop, value) {
    const nodes = this.#bindings.get(prop);
    if (!nodes) return;
    for (const { node, template } of nodes) {
      node.textContent = template.replace(
        new RegExp(`\\{\\{\\s*${prop}\\s*\\}\\}`, "g"),
        value ?? "",
      );
    }
  }
}
```

**Trade-off analysis**:

- AngularJS's `$compile` handled arbitrary expressions (`{{ user.name | uppercase }}`). Our version starts simpler with direct property access.
- Shadow DOM gives us encapsulation that AngularJS required `scope: { ... }` isolation for.
- We lose AngularJS's template-level logic (`ng-if`, `ng-repeat`) — these become methods or separate helper elements.
- Templates are real `.html` files with full tooling support — just like AngularJS's `templateUrl`, but with `import.meta.url` for explicit co-location instead of string paths.

### Property Binding — `bind()`

Replaces AngularJS's `<` (one-way) and `&` (expression) scope bindings. One method handles both directions:

```javascript
class UserPage extends ElElement {
  static template = "<item-card></item-card>";

  user = { name: "Alice", id: 42 };
  items = [];

  onInit() {
    this.bind("item-card", {
      // Inputs (0 args = getter): parent state → child property (synced)
      user: () => this.user,
      items: () => this.items,

      // Outputs (1+ args = callback): child calls → parent handles
      onDelete: (data) => this.removeUser(data.id),
      onSelect: (data) => (this.selected = data),
    });
  }
}
```

**How it maps to AngularJS:**

| AngularJS       | Ement bind()                                                         |
| --------------- | -------------------------------------------------------------------- |
| `user: '<'`     | `user: () => this.user`                                              |
| `onDelete: '&'` | `onDelete: (data) => this.handle(data)`                              |
| `label: '@'`    | `static observedAttributes = ['label']` (strings stay as attributes) |

**Key behaviors:**

- Inputs re-sync automatically when parent state changes (no stale references)
- Outputs are just function references — child calls them directly (no events needed)
- Callbacks don't trigger `onChanges` — they're communication channels, not data
- Works with multiple instances (querySelectorAll)

---

## Router Module

### How AngularJS Did It

```javascript
// ngRoute — flat, simple
$routeProvider
  .when("/users/:id", { template: "...", controller: "UserCtrl" })
  .otherwise({ redirectTo: "/" });

// ui-router — state tree, transition hooks
$stateProvider
  .state("app", { abstract: true, resolve: { user: loadUser } })
  .state("app.dashboard", { url: "/dashboard", component: "dashboard" })
  .state("app.settings", { url: "/settings", component: "settings" });

$transitions.onBefore({ to: "app.**" }, (transition) => {
  if (!AuthService.isLoggedIn())
    return transition.router.stateService.target("login");
});
```

### How We Do It

Our router takes the pragmatic subset from ui-router that proved valuable in real-world usage:

1. **Flat routes with URLPattern** — the base case (like ngRoute)
2. **Route groups** — parent/child for shared resolves (one level, not arbitrary depth)
3. **Transition hooks** — `onBefore`, `onSuccess`, `onError` pipeline for auth/roles/permissions

What we deliberately skip (complexity without proportional gain):

- Multiple named outlets
- Navigate-by-state-name (`$state.go`)
- Resolve inheritance (hides data origin)

```javascript
// router/router.js
export class Router extends EventTarget {
  #routes = [];
  #groups = new Map(); // route groups with shared resolves
  #hooks = { onBefore: [], onSuccess: [], onError: [] };
  #outlet = null;
  #currentRoute = null;

  constructor(outlet) {
    super();
    this.#outlet = outlet;
    window.addEventListener("popstate", () => this.#resolve());

    // Intercept link clicks for SPA navigation
    document.addEventListener("click", (e) => {
      const anchor = e.target.closest("a[href]");
      if (
        anchor &&
        anchor.origin === location.origin &&
        !anchor.hasAttribute("data-external")
      ) {
        e.preventDefault();
        this.navigate(anchor.pathname + anchor.search);
      }
    });
  }

  /**
   * Register a route group — shared resolve for a set of child routes.
   * Like ui-router's abstract parent state, but explicit and one level deep.
   *
   * @example
   * router.group('admin', {
   *   resolve: async () => ({ permissions: await loadPermissions() })
   * });
   * router.route('/admin/users', 'admin-users', { group: 'admin' });
   * router.route('/admin/settings', 'admin-settings', { group: 'admin' });
   */
  group(name, { resolve } = {}) {
    this.#groups.set(name, { resolve, data: null, resolved: false });
    return this;
  }

  route(pattern, component, { resolve, group } = {}) {
    const urlPattern = new URLPattern({ pathname: pattern });
    this.#routes.push({ urlPattern, component, resolve, group });
    return this;
  }

  /**
   * Transition hooks — the real value from ui-router.
   * Use for auth guards, role checks, analytics, loading states.
   *
   * @example
   * router.onBefore(async (from, to) => {
   *   if (to.path.startsWith('/admin') && !user.isAdmin) {
   *     return '/login'; // redirect
   *   }
   *   // return undefined to continue, false to cancel
   * });
   */
  onBefore(hookFn) {
    this.#hooks.onBefore.push(hookFn);
    return this;
  }
  onSuccess(hookFn) {
    this.#hooks.onSuccess.push(hookFn);
    return this;
  }
  onError(hookFn) {
    this.#hooks.onError.push(hookFn);
    return this;
  }

  navigate(path) {
    history.pushState(null, "", path);
    this.#resolve();
  }

  async #resolve() {
    const url = new URL(location.href);

    for (const route of this.#routes) {
      const match = route.urlPattern.exec(url);
      if (!match) continue;

      const params = match.pathname.groups;
      const from = this.#currentRoute;
      const to = { path: url.pathname, params, route };

      try {
        // --- Transition hooks: onBefore ---
        for (const hook of this.#hooks.onBefore) {
          const result = await hook(from, to);
          if (result === false) return; // cancel navigation
          if (typeof result === "string") {
            // redirect — navigate to the returned path instead
            this.navigate(result);
            return;
          }
        }

        // --- Resolve data ---
        let data = {};

        // Group resolve (shared resources — runs once, cached per group)
        if (route.group) {
          const group = this.#groups.get(route.group);
          if (group && !group.resolved) {
            group.data = await group.resolve(params);
            group.resolved = true;
          }
          if (group) data = { ...group.data };
        }

        // Route-level resolve (specific to this route)
        if (route.resolve) {
          const routeData = await route.resolve(params);
          data = { ...data, ...routeData };
        }

        // --- Mount component ---
        this.#mount(route.component, params, data);
        this.#currentRoute = to;

        // --- Transition hooks: onSuccess ---
        for (const hook of this.#hooks.onSuccess) {
          await hook(from, to, data);
        }

        this.dispatchEvent(
          new CustomEvent("navigate", { detail: { from, to, data } }),
        );
      } catch (error) {
        // --- Transition hooks: onError ---
        for (const hook of this.#hooks.onError) {
          await hook(error, from, to);
        }
      }
      return;
    }
  }

  #mount(Component, params, data) {
    this.#outlet.innerHTML = "";
    const el = document.createElement(Component);
    el.params = params;
    el.routeData = data;
    this.#outlet.appendChild(el);
  }

  /**
   * Invalidate a group's cached resolve data.
   * Call when shared resources need to be re-fetched (e.g., user logs out).
   */
  invalidateGroup(name) {
    const group = this.#groups.get(name);
    if (group) {
      group.resolved = false;
      group.data = null;
    }
  }
}
```

### Usage Example — Real-World Auth Pattern

```javascript
import { Router } from "./src/router/router.js";
import { container } from "./main.js";
import { AuthToken } from "./src/di/tokens.js";

const outlet = document.querySelector("route-outlet");
const router = new Router(outlet);

// Route group: admin section shares permission data
router.group("admin", {
  resolve: async () => {
    const auth = container.resolve(AuthToken);
    return { permissions: await auth.getPermissions() };
  },
});

// Routes
router
  .route("/", "app-home")
  .route("/login", "app-login")
  .route("/admin/users", "admin-users", { group: "admin" })
  .route("/admin/reports", "admin-reports", { group: "admin" })
  .route("/profile/:id", "user-profile", {
    resolve: async (params) => {
      const res = await fetch(`/api/users/${params.id}`);
      return { user: await res.json() };
    },
  });

// Transition hooks — the guards
router.onBefore(async (from, to) => {
  const auth = container.resolve(AuthToken);

  // Protect admin routes
  if (to.path.startsWith("/admin") && !auth.hasRole("admin")) {
    return "/login";
  }

  // Protect any authenticated route
  if (to.path !== "/login" && !auth.isLoggedIn()) {
    return "/login";
  }
});

router.onSuccess((from, to) => {
  // Analytics, scroll restoration, etc.
  window.scrollTo(0, 0);
  console.log(`Navigated: ${from?.path ?? "(initial)"} → ${to.path}`);
});

router.onError((error, from, to) => {
  console.error(`Navigation to ${to.path} failed:`, error);
  // Could show error toast, redirect to error page, etc.
});
```

### Design Decisions

| Decision                                | Rationale                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Route groups (not state tree)           | One level of shared resolve covers 90% of real use cases without state machine complexity  |
| Transition hooks (from ui-router)       | The single most valuable ui-router feature — auth, roles, permissions, analytics           |
| Group resolve is cached + invalidatable | Shared data (permissions, user profile) shouldn't re-fetch on every child navigation       |
| No named outlets                        | In practice, component composition handles multi-region layouts without router involvement |
| No `router.go('stateName')`             | URLs are the contract. Native `pushState` with a URL is explicit and debuggable            |
| No resolve inheritance                  | Each route's `routeData` is flat and obvious — no hidden parent data leaking in            |

**Key modern APIs used**: `URLPattern`, `History.pushState`, `EventTarget`, `URL`, `AbortController` (for future cancellation).

---

## HTTP Module

### How AngularJS Did It

```javascript
$http.get("/api/users").then(function (response) {
  $scope.users = response.data;
});
```

### How We Do It

```javascript
// http/http.js
export class Http {
  #baseUrl = "";
  #interceptors = [];

  constructor({ baseUrl = "", interceptors = [] } = {}) {
    this.#baseUrl = baseUrl;
    this.#interceptors = interceptors;
  }

  async request(url, options = {}) {
    let config = { url: this.#baseUrl + url, ...options };

    // Run request interceptors
    for (const interceptor of this.#interceptors) {
      if (interceptor.request) config = await interceptor.request(config);
    }

    const { url: finalUrl, ...fetchOptions } = config;
    let response = await fetch(finalUrl, fetchOptions);

    // Run response interceptors
    for (const interceptor of this.#interceptors) {
      if (interceptor.response) response = await interceptor.response(response);
    }

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText, response);
    }
    return response;
  }

  get(url, options) {
    return this.request(url, { ...options, method: "GET" });
  }
  post(url, body, options) {
    return this.request(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  }
  put(url, body, options) {
    return this.request(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  }
  delete(url, options) {
    return this.request(url, { ...options, method: "DELETE" });
  }
}

class HttpError extends Error {
  constructor(status, statusText, response) {
    super(`HTTP ${status}: ${statusText}`);
    this.status = status;
    this.response = response;
  }
}
```

---

## Forms Module

### How AngularJS Did It (NgModelController)

```html
<form name="myForm">
  <input ng-model="user.email" type="email" required />
  <span ng-show="myForm.email.$error.required">Required</span>
  <span ng-show="myForm.email.$error.email">Invalid email</span>
</form>
```

Under the hood, `NgModelController` was a middleware pipeline:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NgModelController                              │
│                                                                   │
│   VIEW (DOM)                              MODEL (scope)           │
│   ┌──────────┐                           ┌──────────┐           │
│   │$viewValue│                           │$modelValue│           │
│   └────┬─────┘                           └────┬─────┘           │
│        │                                      │                  │
│        ▼ (user types)                         ▼ (code sets)      │
│   ┌──────────┐                           ┌──────────┐           │
│   │$parsers  │ ──── view → model ────►   │$formatters│           │
│   │(pipeline)│                           │(pipeline) │ ◄── model → view
│   └──────────┘                           └──────────┘           │
│        │                                      │                  │
│        ▼                                                         │
│   ┌──────────┐                                                   │
│   │$validators│ (sync + async)                                   │
│   └──────────┘                                                   │
│        │                                                         │
│        ▼                                                         │
│   ┌──────────────────────────────────┐                           │
│   │ $valid, $dirty, $touched, $error │                           │
│   └──────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

This architecture was **genuinely excellent** — Express-style middleware for form data. The problem was never the controller itself; it was the implicit two-way binding around it that pushed `$modelValue` back into scope automatically, causing cascading mutations.

### How We Do It (Field Class — NgModelController Reimagined)

We preserve the dual-value model and middleware pipelines, but replace implicit two-way binding with explicit `onChange` propagation:

```
┌───────────────────────────────────────────────────────────────────┐
│                         Field                                     │
│                                                                   │
│   VIEW (DOM)                              MODEL (component state) │
│   ┌──────────┐                           ┌──────────┐             │
│   │viewValue │                           │modelValue│             │
│   └────┬─────┘                           └────┬─────┘             │
│        │                                      │                   │
│        ▼ (user types)                         ▼ (code calls       │
│   ┌──────────┐                           ┌──────────┐ writeValue) │
│   │ parsers  │ ──── view → model ────►   │formatters│             │
│   │(pipeline)│                           │(pipeline)│ ◄── model → view
│   └──────────┘                           └──────────┘             │
│        │                                                          │
│        ▼                                                          │
│   ┌────────────────────┐                                          │
│   │ validators (sync)  │                                          │
│   │ asyncValidators    │ ← with AbortController cancellation      │
│   └────────────────────┘                                          │
│        │                                                          │
│        ▼                                                          │
│   ┌──────────────────────────────────────┐                        │
│   │ valid, dirty, touched, errors, pending│                       │
│   └──────────────────────────────────────┘                        │
│        │                                                          │
│        ▼                                                          │
│   ┌──────────────────────────────────────┐                        │
│   │ onChange(modelValue, state)           │ ← EXPLICIT (not auto) │
│   │ Developer decides what to do         │                        │
│   └──────────────────────────────────────┘                        │
└───────────────────────────────────────────────────────────────────┘
```

**Key difference from NgModelController**: The pipeline runs the same way, but the result hits `onChange` instead of being pushed into scope automatically. The developer is always in control of state mutations.

### Implementation Design

```javascript
// forms/field.js

/**
 * Field — the modern equivalent of NgModelController.
 * Manages the viewValue ↔ modelValue transform pipeline
 * and validation, but data flow is ALWAYS explicit and one-way.
 *
 * Unlike NgModelController:
 * - No implicit two-way binding (you decide when to write to state)
 * - No scope watches (Proxy handles reactivity)
 * - No digest cycle integration needed
 * - Async validators use AbortController (cancel stale validations)
 */
export class Field {
  #input;
  #parsers = []; // view → model transforms (like $parsers)
  #formatters = []; // model → view transforms (like $formatters)
  #validators = []; // sync validators
  #asyncValidators = []; // async validators
  #state = {
    viewValue: "",
    modelValue: undefined,
    valid: true,
    dirty: false,
    touched: false,
    errors: {}, // { required: true, minLength: true, ... }
    pending: false, // async validation in progress
  };
  #onChange; // explicit callback (replaces two-way binding)
  #abortController; // cancel pending async validation
  #debounceMs;
  #debounceTimeout;

  constructor(input, options = {}) {
    const {
      parsers = [],
      formatters = [],
      validators = [],
      asyncValidators = [],
      onChange,
      debounce = 0,
    } = options;

    this.#input = input;
    this.#parsers = parsers;
    this.#formatters = formatters;
    this.#validators = validators;
    this.#asyncValidators = asyncValidators;
    this.#onChange = onChange;
    this.#debounceMs = debounce;

    // Events from DOM → pipeline
    input.addEventListener("input", (e) => {
      if (this.#debounceMs > 0) {
        clearTimeout(this.#debounceTimeout);
        this.#debounceTimeout = setTimeout(
          () => this.#handleInput(e.target.value),
          this.#debounceMs,
        );
      } else {
        this.#handleInput(e.target.value);
      }
    });
    input.addEventListener("blur", () => this.#markTouched());
  }

  /**
   * The pipeline: viewValue → parsers → validators → modelValue → onChange
   * Same flow as NgModelController, minus the implicit scope binding.
   */
  #handleInput(rawValue) {
    this.#state.viewValue = rawValue;
    this.#state.dirty = true;

    // Run parsers (view → model) — like NgModelController.$parsers
    let modelValue = rawValue;
    for (const parser of this.#parsers) {
      modelValue = parser(modelValue);
      if (modelValue === undefined) break; // parser rejected the value
    }
    this.#state.modelValue = modelValue;

    // Run sync validators
    this.#validate(modelValue);

    // Explicit propagation — developer decides what to do
    if (this.#onChange) {
      this.#onChange(modelValue, this.#state);
    }
  }

  #validate(modelValue) {
    this.#state.errors = {};

    for (const validator of this.#validators) {
      const result = validator(modelValue, this.#state.viewValue);
      if (result) {
        this.#state.errors[result] = true;
      }
    }
    this.#state.valid = Object.keys(this.#state.errors).length === 0;

    // Async validators only run if sync passes (same as NgModelController)
    if (this.#state.valid && this.#asyncValidators.length > 0) {
      this.#runAsyncValidators(modelValue);
    }

    this.#syncCssClasses();
  }

  async #runAsyncValidators(modelValue) {
    // Cancel previous async validation (stale request cancellation)
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    this.#state.pending = true;
    this.#syncCssClasses();

    for (const validator of this.#asyncValidators) {
      const result = await validator(modelValue, signal);
      if (signal.aborted) return; // stale — ignore result
      if (result) {
        this.#state.errors[result] = true;
      }
    }

    this.#state.pending = false;
    this.#state.valid = Object.keys(this.#state.errors).length === 0;
    this.#syncCssClasses();

    // Re-notify after async validation completes
    if (this.#onChange) {
      this.#onChange(this.#state.modelValue, this.#state);
    }
  }

  /**
   * Write model → view (like NgModelController.$formatters).
   * Called when application state changes and the input must reflect it.
   */
  writeValue(modelValue) {
    this.#state.modelValue = modelValue;

    // Run formatters (model → view)
    let viewValue = modelValue;
    for (const formatter of this.#formatters) {
      viewValue = formatter(viewValue);
    }
    this.#state.viewValue = viewValue;
    this.#input.value = viewValue ?? "";

    this.#validate(modelValue);
  }

  #markTouched() {
    this.#state.touched = true;
    this.#syncCssClasses();
  }

  #syncCssClasses() {
    const cl = this.#input.classList;
    cl.toggle("ng-valid", this.#state.valid);
    cl.toggle("ng-invalid", !this.#state.valid);
    cl.toggle("ng-dirty", this.#state.dirty);
    cl.toggle("ng-pristine", !this.#state.dirty);
    cl.toggle("ng-touched", this.#state.touched);
    cl.toggle("ng-untouched", !this.#state.touched);
    cl.toggle("ng-pending", this.#state.pending);
  }

  // Read-only access to state (like NgModelController's properties)
  get modelValue() {
    return this.#state.modelValue;
  }
  get viewValue() {
    return this.#state.viewValue;
  }
  get valid() {
    return this.#state.valid;
  }
  get dirty() {
    return this.#state.dirty;
  }
  get touched() {
    return this.#state.touched;
  }
  get errors() {
    return { ...this.#state.errors };
  }
  get pending() {
    return this.#state.pending;
  }

  // Programmatic controls
  markDirty() {
    this.#state.dirty = true;
    this.#syncCssClasses();
  }
  markPristine() {
    this.#state.dirty = false;
    this.#syncCssClasses();
  }
  markTouched() {
    this.#markTouched();
  }
  reset(modelValue) {
    this.#state.dirty = false;
    this.#state.touched = false;
    this.#state.errors = {};
    this.writeValue(modelValue);
  }

  destroy() {
    this.#abortController?.abort();
    clearTimeout(this.#debounceTimeout);
  }
}
```

### FormGroup — Aggregating Field Instances

```javascript
// forms/form-group.js

/**
 * FormGroup aggregates multiple Field instances — like AngularJS form controller.
 * Provides form-level state (valid, dirty, touched) as a read-only aggregate.
 */
export class FormGroup {
  #fields = new Map();
  #formElement;

  constructor(formElement) {
    this.#formElement = formElement;

    // Block submit when invalid
    formElement.addEventListener("submit", (e) => {
      if (!this.valid) {
        e.preventDefault();
        // Mark all untouched fields as touched (show errors)
        for (const field of this.#fields.values()) {
          field.markTouched();
        }
      }
    });
  }

  /**
   * Register a Field with a name (like NgModelController registering with form)
   */
  addField(name, field) {
    this.#fields.set(name, field);
    return this;
  }

  removeField(name) {
    this.#fields.get(name)?.destroy();
    this.#fields.delete(name);
  }

  // Aggregate state (read-only)
  get valid() {
    for (const field of this.#fields.values()) {
      if (!field.valid) return false;
    }
    return true;
  }

  get dirty() {
    for (const field of this.#fields.values()) {
      if (field.dirty) return true;
    }
    return false;
  }

  get touched() {
    for (const field of this.#fields.values()) {
      if (field.touched) return true;
    }
    return false;
  }

  get pending() {
    for (const field of this.#fields.values()) {
      if (field.pending) return true;
    }
    return false;
  }

  get errors() {
    const all = {};
    for (const [name, field] of this.#fields) {
      const fieldErrors = field.errors;
      if (Object.keys(fieldErrors).length > 0) {
        all[name] = fieldErrors;
      }
    }
    return all;
  }

  // Get individual field state
  field(name) {
    return this.#fields.get(name);
  }

  // Programmatic controls
  reset(values = {}) {
    for (const [name, field] of this.#fields) {
      field.reset(values[name]);
    }
  }

  destroy() {
    for (const field of this.#fields.values()) {
      field.destroy();
    }
    this.#fields.clear();
  }
}
```

### Usage Example — Login Form with Pipelines

**login-form.html:**

```html
<form id="form" novalidate>
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" placeholder="Email" />
    <span class="error" data-error="required">Email is required</span>
    <span class="error" data-error="email">Invalid email format</span>
    <span class="error" data-error="emailTaken"
      >This email is already registered</span
    >
    <span class="pending">Checking availability...</span>
  </div>
  <div class="field">
    <label for="password">Password</label>
    <input id="password" type="password" placeholder="Password" />
    <span class="error" data-error="required">Password is required</span>
    <span class="error" data-error="minLength"
      >Password must be at least 8 characters</span
    >
  </div>
  <button type="submit">Login</button>
</form>
```

**login-form.js:**

```javascript
import { NgElement } from "../../src/core/element.js";
import { Field } from "../../src/forms/field.js";
import { FormGroup } from "../../src/forms/form-group.js";

class LoginForm extends NgElement {
  static templateUrl = new URL("./login-form.html", import.meta.url);
  static stylesUrl = new URL("./login-form.css", import.meta.url);

  // State (single source of truth)
  email = "";
  password = "";

  onInit() {
    const form = this.shadowRoot.getElementById("form");
    const emailInput = this.shadowRoot.getElementById("email");
    const passwordInput = this.shadowRoot.getElementById("password");

    // Email field — full pipeline (parsers + validators + async)
    const emailField = new Field(emailInput, {
      parsers: [
        (v) => v.trim(), // strip whitespace
        (v) => v.toLowerCase(), // normalize case
      ],
      formatters: [
        (v) => v ?? "", // null-safe for display
      ],
      validators: [
        (v) => (!v ? "required" : null),
        (v) => (v && !v.includes("@") ? "email" : null),
      ],
      asyncValidators: [
        async (v, signal) => {
          const res = await fetch(
            `/api/check-email?email=${encodeURIComponent(v)}`,
            { signal },
          );
          const { available } = await res.json();
          return available ? null : "emailTaken";
        },
      ],
      debounce: 300,
      onChange: (modelValue, state) => {
        // Explicit: YOU decide when state updates
        this.email = modelValue;
      },
    });

    // Password field — simpler pipeline
    const passwordField = new Field(passwordInput, {
      validators: [
        (v) => (!v ? "required" : null),
        (v) => (v && v.length < 8 ? "minLength" : null),
      ],
      onChange: (modelValue) => {
        this.password = modelValue;
      },
    });

    // Form group — aggregates fields
    this.formGroup = new FormGroup(form);
    this.formGroup.addField("email", emailField);
    this.formGroup.addField("password", passwordField);

    // Submit — reads from state, not from DOM
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.formGroup.valid) {
        this.dispatchEvent(
          new CustomEvent("login", {
            detail: { email: this.email, password: this.password },
            composed: true,
          }),
        );
      }
    });
  }

  onDestroy() {
    this.formGroup?.destroy();
  }
}

customElements.define("login-form", LoginForm);
```

### Parser/Formatter Examples (Common Patterns)

```javascript
// Common parsers (view → model)
const parsers = {
  trim: (v) => v?.trim(),
  lowercase: (v) => v?.toLowerCase(),
  toNumber: (v) => (v === "" ? null : Number(v)),
  toDate: (v) => (v ? new Date(v) : null),
  toBoolean: (v) => v === "true" || v === "1",
  stripNonDigits: (v) => v?.replace(/\D/g, ""),
  maxLength: (max) => (v) => v?.slice(0, max),
};

// Common formatters (model → view)
const formatters = {
  fromNumber: (v) => (v == null ? "" : String(v)),
  fromDate: (v) => (v instanceof Date ? v.toISOString().split("T")[0] : ""),
  currency: (v) => (v == null ? "" : v.toFixed(2)),
  phone: (v) => {
    if (!v) return "";
    // Format: (555) 123-4567
    return `(${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6, 10)}`;
  },
};

// Common validators
const validators = {
  required: (v) => (!v && v !== 0 ? "required" : null),
  minLength: (min) => (v) => (v?.length < min ? "minLength" : null),
  maxLength: (max) => (v) => (v?.length > max ? "maxLength" : null),
  pattern:
    (regex, key = "pattern") =>
    (v) =>
      v && !regex.test(v) ? key : null,
  min: (min) => (v) => (v != null && v < min ? "min" : null),
  max: (max) => (v) => (v != null && v > max ? "max" : null),
  email: (v) => (v && !v.includes("@") ? "email" : null),
};
```

### Comparison: NgModelController vs Field

| Aspect                   | NgModelController                | Field                                   |
| ------------------------ | -------------------------------- | --------------------------------------- |
| viewValue / modelValue   | ✅ Yes                           | ✅ Yes                                  |
| $parsers pipeline        | ✅ Yes (array, runs in order)    | ✅ Yes (same — composable array)        |
| $formatters pipeline     | ✅ Yes                           | ✅ Yes (via `writeValue()`)             |
| $validators              | ✅ Yes                           | ✅ Yes (run after parsers)              |
| $asyncValidators         | ✅ Yes (no cancellation)         | ✅ Yes + `AbortController` cancellation |
| State propagation        | Implicit (two-way scope binding) | **Explicit** (`onChange` callback)      |
| State mutation control   | Scope watch triggers digest      | Developer decides in `onChange`         |
| CSS classes              | ng-valid, ng-dirty, etc.         | ✅ Same classes                         |
| Debounce                 | ng-model-options                 | Built-in option                         |
| Form aggregation         | form controller (auto-registers) | `FormGroup` (explicit `addField`)       |
| Digest cycle needed      | ✅ Required                      | ❌ Not needed                           |
| Stale async cancellation | ❌ No (race conditions possible) | ✅ AbortController                      |
| Error tracking           | `$error` object                  | `errors` object (same pattern)          |
| Testability              | Mock scope + $compile + $digest  | Instantiate with a DOM element          |
| Memory cleanup           | Scope $destroy                   | Explicit `destroy()` + AbortController  |

### Design Decisions

| Decision                                  | Rationale                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Preserve viewValue/modelValue split       | Best part of NgModelController — typed separation between DOM strings and app values                            |
| Preserve parser/formatter pipelines       | Composable, testable middleware — this was genuinely great design                                               |
| Replace two-way binding with `onChange`   | Same pipeline power, but developer controls propagation — no cascading mutations                                |
| AbortController for async validators      | NgModelController had race conditions with async validators — stale responses could overwrite fresh ones        |
| CSS classes match AngularJS names         | `ng-valid`, `ng-dirty`, etc. — familiar DX, easy migration from existing CSS                                    |
| FormGroup is explicit (not auto-register) | AngularJS auto-registered inputs in form scope — magic. Explicit `addField` is clear about what's being tracked |
| Debounce built into Field                 | Common need, prevents excessive pipeline runs on fast typing                                                    |

**Trade-off**: Slightly more verbose than `ng-model` (you write a `Field` constructor with options instead of one attribute). But: traceable data flow, no cascading mutations, stale-request cancellation, and each piece is independently testable. The `$parsers`/`$formatters` ergonomics are preserved — that was never the problem.

---

## DI Module (Core)

Interface-based dependency injection — the primary mechanism for testability and service substitution. This is not optional; it's how components access services.

**Design principle**: Components never import service implementations directly. They resolve services from a container by interface token. This makes every service swappable in tests without module-patching hacks.

```javascript
// di/container.js

// Tokens are just unique identifiers for interfaces
export const HttpToken = Symbol("Http");
export const RouterToken = Symbol("Router");
export const StorageToken = Symbol("Storage");

export class Container {
  #services = new Map();
  #singletons = new Map();
  #parent = null;

  constructor(parent = null) {
    this.#parent = parent;
  }

  // Register a service factory against a token
  register(token, factory, { singleton = true } = {}) {
    this.#services.set(token, { factory, singleton });
    return this;
  }

  // Resolve a service — checks this container, then parent
  resolve(token) {
    if (this.#singletons.has(token)) return this.#singletons.get(token);

    const service = this.#services.get(token);
    if (service) {
      const instance = service.factory(this);
      if (service.singleton) this.#singletons.set(token, instance);
      return instance;
    }

    // Delegate to parent container (scope inheritance)
    if (this.#parent) return this.#parent.resolve(token);

    throw new Error(`No provider for ${token.toString()}`);
  }

  // Create a child container (like AngularJS child scopes)
  createChild() {
    return new Container(this);
  }

  // Check if a token is registered (in this or parent)
  has(token) {
    if (this.#services.has(token)) return true;
    if (this.#parent) return this.#parent.has(token);
    return false;
  }
}
```

**Usage — production vs test:**

```javascript
// --- Production setup ---
import { Container, HttpToken, StorageToken } from "./di/container.js";
import { Http } from "./http/http.js";

const appContainer = new Container();
appContainer.register(HttpToken, () => new Http({ baseUrl: "/api" }));
appContainer.register(StorageToken, () => localStorage);

// --- Test setup ---
const testContainer = new Container();
testContainer.register(HttpToken, () => ({
  get: async (url) => ({ json: async () => ({ users: [] }) }),
  post: async (url, body) => ({ ok: true, json: async () => body }),
}));
testContainer.register(StorageToken, () => new Map()); // in-memory fake

// --- Component uses interface, doesn't know which implementation ---
class UserList extends NgElement {
  onInit() {
    const http = this.container.resolve(HttpToken);
    http
      .get("/users")
      .then((r) => r.json())
      .then((users) => {
        this.users = users;
      });
  }
}
```

**Integration with NgElement:**

```javascript
// The base class receives a container reference
export class NgElement extends HTMLElement {
  get container() {
    // Walk up the DOM to find the nearest container provider
    // (similar to AngularJS scope inheritance)
    let el = this;
    while (el) {
      if (el.__container) return el.__container;
      el = el.parentElement || el.getRootNode()?.host;
    }
    throw new Error(
      "No DI container found. Wrap your app in a container provider.",
    );
  }
}
```

**Why this is better than `vi.mock()` / `jest.mock()`:**

- No path-coupling — mocks are registered by token, not by file path
- No hoisting magic — container is configured explicitly before the test runs
- Composable — create child containers to override only what one test needs
- Runtime — works identically in browser tests, Node tests, and production
- Readable — the test setup declares exactly what's being faked

---

## Animation Module

```javascript
// animate/animate.js
export function animateIn(element, keyframes, options = {}) {
  const defaults = { duration: 300, easing: "ease-in-out", fill: "forwards" };
  return element.animate(keyframes, { ...defaults, ...options });
}

export function animateOut(element, keyframes, options = {}) {
  const animation = animateIn(element, keyframes, options);
  animation.onfinish = () => element.remove();
  return animation;
}

// Stagger helper (replaces ngAnimate stagger)
export function stagger(elements, keyframes, { delay = 50, ...options } = {}) {
  return Array.from(elements).map((el, i) =>
    el.animate(keyframes, { ...options, delay: i * delay }),
  );
}
```

---

## Security Module

```javascript
// security/sanitize.js
export function sanitizeHTML(
  html,
  allowedTags = ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

  const toRemove = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!allowedTags.includes(node.tagName.toLowerCase())) {
      toRemove.push(node);
    } else {
      // Strip event handler attributes
      for (const attr of [...node.attributes]) {
        if (attr.name.startsWith("on") || attr.value.includes("javascript:")) {
          node.removeAttribute(attr.name);
        }
      }
    }
  }

  for (const node of toRemove) {
    node.replaceWith(...node.childNodes);
  }

  return doc.body.innerHTML;
}
```

---

## Build & Optimization (Vite/Rollup)

### Why Vite?

Vite is the natural choice for this project because it mirrors our philosophy:

- **Dev mode**: Serves native ES modules directly — no bundling. Matches our "no build step for development" principle.
- **Build mode**: Uses Rollup under the hood — mature, well-understood, excellent tree-shaking.
- **Plugin system**: Rollup plugins are simple transform functions — we write two small plugins for template/style inlining.
- **Library mode**: First-class support for producing a library (not just an app) — exactly what we need for host-app consumption.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Development (npm run dev)                     │
│                                                                   │
│   Browser ←──── Vite Dev Server ←──── Native ES Modules          │
│      │                                       │                    │
│      │  <script type="module" src="main.js"> │                    │
│      │                                       │                    │
│      └── fetch('./component.html') ──────────┘                    │
│      └── fetch('./component.css')  ──────────┘                    │
│                                                                   │
│   Templates & styles fetched at runtime, cached per class.        │
│   No transformation. What you write is what runs.                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Production (npm run build)                       │
│                                                                   │
│   Source ──► Rollup + Plugins ──► dist/                          │
│                    │                                              │
│     ┌──────────────┼──────────────┐                              │
│     │              │              │                                │
│     ▼              ▼              ▼                                │
│  Template      Styles        Tree-shake                           │
│  Inlining     Inlining      & Minify                             │
│     │              │              │                                │
│     │  templateUrl → template     │                               │
│     │  stylesUrl   → styles       │                               │
│     └──────────────┼──────────────┘                              │
│                    ▼                                              │
│   dist/ng-modern.js        (full bundle, ES module)              │
│   dist/core/element.js     (individual module entries)           │
│   dist/router/router.js                                          │
│   dist/forms/field.js                                            │
│   ...                                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            Host App Integration (AngularJS + Webpack 5)           │
│                                                                   │
│   Host Webpack config:                                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  resolve: {                                              │   │
│   │    alias: { 'ng-modern': './node_modules/ng-modern/dist' }│   │
│   │  }                                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│   // In AngularJS component:                                     │
│   import { NgElement } from 'ng-modern';                         │
│   // Custom Elements coexist with AngularJS directives           │
└─────────────────────────────────────────────────────────────────┘
```

### Vite Plugin: Template Inlining

```javascript
// vite-plugins/inline-templates.js

import { readFileSync } from "fs";
import { resolve, dirname } from "path";

/**
 * Rollup plugin that inlines templateUrl/stylesUrl at build time.
 * Transforms:
 *   static templateUrl = new URL('./user-card.html', import.meta.url);
 * Into:
 *   static template = '<div class="card">...</div>';
 */
export function inlineTemplates() {
  return {
    name: "ng-modern-inline-templates",
    enforce: "pre",

    transform(code, id) {
      if (!id.endsWith(".js")) return null;

      // Match: static templateUrl = new URL('./path.html', import.meta.url)
      const templateUrlRegex =
        /static\s+templateUrl\s*=\s*new\s+URL\(\s*['"](.+?)['"]\s*,\s*import\.meta\.url\s*\)/g;
      // Match: static stylesUrl = new URL('./path.css', import.meta.url)
      const stylesUrlRegex =
        /static\s+stylesUrl\s*=\s*new\s+URL\(\s*['"](.+?)['"]\s*,\s*import\.meta\.url\s*\)/g;

      let transformed = code;
      let hasChanges = false;

      // Inline templates
      transformed = transformed.replace(
        templateUrlRegex,
        (match, relativePath) => {
          const filePath = resolve(dirname(id), relativePath);
          const content = readFileSync(filePath, "utf-8")
            .replace(/\s+/g, " ") // collapse whitespace
            .replace(/> </g, "><") // remove gaps between tags
            .trim();
          hasChanges = true;
          return `static template = ${JSON.stringify(content)}`;
        },
      );

      // Inline styles
      transformed = transformed.replace(
        stylesUrlRegex,
        (match, relativePath) => {
          const filePath = resolve(dirname(id), relativePath);
          const content = readFileSync(filePath, "utf-8")
            .replace(/\s+/g, " ") // collapse whitespace
            .replace(/\/\*.*?\*\//g, "") // remove comments
            .trim();
          hasChanges = true;
          return `static styles = ${JSON.stringify(content)}`;
        },
      );

      return hasChanges ? { code: transformed, map: null } : null;
    },
  };
}
```

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { inlineTemplates } from "./vite-plugins/inline-templates.js";

export default defineConfig({
  plugins: [inlineTemplates()],

  build: {
    lib: {
      entry: {
        "ng-modern": "./src/index.js",
        "core/element": "./src/core/element.js",
        "core/reactive": "./src/core/reactive.js",
        "di/container": "./src/di/container.js",
        "router/router": "./src/router/router.js",
        "http/http": "./src/http/http.js",
        "forms/field": "./src/forms/field.js",
        "forms/form-group": "./src/forms/form-group.js",
      },
      formats: ["es"], // ES modules only — host app bundles further if needed
    },
    rollupOptions: {
      output: {
        preserveModules: false,
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: "terser",
    target: "es2020", // Custom Elements + Proxy + ESM
  },

  // Dev server
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:lib": "vite build --mode lib",
    "preview": "vite preview",
    "size": "vite build && gzip -k dist/ng-modern.js && ls -lh dist/ng-modern.js.gz"
  }
}
```

### Host App Integration Pattern

When plugging ng-modern into an existing AngularJS + Webpack 5 application:

```javascript
// In the AngularJS app's webpack.config.js
module.exports = {
  resolve: {
    alias: {
      "ng-modern": path.resolve(__dirname, "node_modules/ng-modern/dist"),
    },
  },
};

// In an AngularJS component that wants to use ng-modern components:
import "ng-modern/components/fancy-widget/fancy-widget.js";

// Now <fancy-widget> is available as a Custom Element
// Use it in AngularJS templates:
// <fancy-widget user-name="{{ $ctrl.user.name }}"></fancy-widget>
```

**Coexistence strategy**: Custom Elements and AngularJS directives can coexist in the same DOM. AngularJS sees `<fancy-widget>` as an unknown element and leaves it alone. The Custom Element registers itself and manages its own Shadow DOM. Communication happens via:

- **AngularJS → ng-modern**: HTML attributes (AngularJS interpolation → `observedAttributes`)
- **ng-modern → AngularJS**: CustomEvents (ng-modern dispatches, AngularJS listens via directive)

### Design Decisions

| Decision                           | Rationale                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Vite over Webpack                  | Vite's dev server uses native ESM (matches our principle). Rollup produces cleaner output than Webpack for libraries. |
| Custom Rollup plugins (not loader) | Plugins are simpler, framework-agnostic, and reusable. A Webpack loader would tie us to the host's build tool.        |
| ES module output only              | Target apps use modern bundlers. No need for UMD/CommonJS. ES modules enable host-side tree-shaking.                  |
| Library mode with multiple entries | Allows host app to import individual modules (`ng-modern/forms/field`) without pulling the full framework.            |
| Source maps in production          | Critical for debugging when ng-modern runs inside the host AngularJS app.                                             |
| Template inlining as Rollup plugin | Zero runtime cost in production. Dev mode still uses fetch (validates both paths).                                    |

---

## Design Decisions & Trade-offs

| Decision                                       | Rationale                              | What We Lose vs AngularJS                                                  |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Proxy over dirty-checking                      | O(1) detection, no manual trigger      | Can't observe unproxied objects from external libraries                    |
| Unidirectional flow over two-way binding       | Predictable state, traceable mutations | More verbose form setup (Field class vs 1 `ng-model` attribute)            |
| Custom Elements over custom directive compiler | Standard, interoperable                | Lose the ability to use attribute-restricted directives on native elements |
| Shadow DOM for encapsulation                   | Native style isolation                 | Global styles don't penetrate (need CSS custom props or `::part`)          |
| ES Modules + DI container                      | Static deps + runtime substitution     | Slightly more ceremony than direct imports (worth it for testability)      |
| URLPattern for routing                         | Expressive, standards-based            | Newer API, less universal (polyfill available)                             |
| Microtask batching over digest                 | Simpler, no TTL issues                 | Updates are async (next microtask) rather than synchronous-feeling         |
| No template directives (ng-if, ng-repeat)      | Simplicity                             | Need JS methods or helper elements for conditional/list rendering          |

---

## What AngularJS Got Right (Still Hard Natively)

1. **Declarative templates with logic** — `ng-if`, `ng-repeat`, `ng-switch` inline in HTML. No native equivalent without a template engine.
2. **Low-ceremony form handling** — `ng-model` was wrong in design (two-way binding causes cascading mutation) but its _middleware architecture_ (parsers, formatters, validators) was excellent. Our `Field` class preserves the pipeline while fixing the propagation. The DX gap is setup verbosity (Field constructor vs single attribute), not capability.
3. **Unified async model** — Everything (HTTP, timers, animations) went through the digest cycle. We handle each differently.
4. **Error handling** — `$exceptionHandler` caught all errors. We'd need a global error boundary pattern.

## What AngularJS Got Right (That We Preserve)

1. **Testability via DI** — Interface-based injection made mocking trivial. We keep this as a core feature, not an afterthought.
2. **Component encapsulation** — Isolated scopes kept components independent. Shadow DOM gives us this natively now.
3. **Declarative over imperative** — Templates describe _what_, not _how_. We preserve this with reactive bindings.

---

## Example: Complete Mini App

**File structure:**

```
todo-app/
├── index.html
├── main.js
├── components/
│   └── todo-app/
│       ├── todo-app.js
│       ├── todo-app.html
│       └── todo-app.css
```

**index.html:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>ng-modern Todo App</title>
  </head>
  <body>
    <todo-app></todo-app>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

**main.js** (bootstrap + DI container setup):

```javascript
import { Container, HttpToken } from "./src/di/container.js";
import { Http } from "./src/http/http.js";
import "./components/todo-app/todo-app.js";

// Configure the app container
const container = new Container();
container.register(HttpToken, () => new Http({ baseUrl: "/api" }));

// Provide container to the app root
document.querySelector("todo-app").__container = container;
```

**components/todo-app/todo-app.html:**

```html
<h1>Todos (<span id="count"></span>)</h1>
<form id="add-form">
  <input type="text" id="input" placeholder="Add todo..." required />
  <button type="submit">Add</button>
</form>
<ul id="list"></ul>
```

**components/todo-app/todo-app.css:**

```css
:host {
  display: block;
  max-width: 400px;
  font-family: system-ui;
}
h1 {
  color: #333;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
```

**components/todo-app/todo-app.js:**

```javascript
import { NgElement } from "../../src/core/element.js";
import { HttpToken } from "../../src/di/tokens.js";

class TodoApp extends NgElement {
  static templateUrl = new URL("./todo-app.html", import.meta.url);
  static stylesUrl = new URL("./todo-app.css", import.meta.url);

  todos = [];
  count = 0;

  onInit() {
    const form = this.shadowRoot.getElementById("add-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = this.shadowRoot.getElementById("input");
      this.addTodo(input.value);
      input.value = "";
    });
    this.loadTodos();
  }

  async loadTodos() {
    const http = this.container.resolve(HttpToken);
    const res = await http.get("/todos");
    this.todos = await res.json();
    this.count = this.todos.length;
    this.renderList();
  }

  addTodo(text) {
    this.todos.push({ text, done: false });
    this.count = this.todos.length;
    this.renderList();
  }

  renderList() {
    const list = this.shadowRoot.getElementById("list");
    list.innerHTML = this.todos.map((t) => `<li>${t.text}</li>`).join("");
    this.shadowRoot.getElementById("count").textContent = this.count;
  }
}

customElements.define("todo-app", TodoApp);
```

**Key observations:**

- `todo-app.js` contains only logic — zero HTML, zero CSS
- `todo-app.html` is a real HTML file — your IDE gives you autocompletion, linting, formatting
- `todo-app.css` is a real CSS file — stylelint, PostCSS, everything works
- The `Http` service is resolved from DI — testable by swapping the container
- `import.meta.url` ensures the template URL is always correct relative to the component

---

## References

- [Requirements Document](./requirements.md)
- [Tasks Document](./tasks.md)
- [MDN: Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [MDN: URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [MDN: Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [AngularJS Developer Guide](https://docs.angularjs.org/guide)

---

## Document Metadata

**Created**: 2026-08-13
**Status**: Draft
**Purpose**: Architecture reference for implementation
