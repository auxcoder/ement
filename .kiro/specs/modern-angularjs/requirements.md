# Modern AngularJS — Requirements

## Project Goal

Reimagine AngularJS (1.x) using modern browser APIs that didn't exist (or weren't widely supported) when AngularJS was created (2010-2012). This is a learning exercise to:

1. Deeply understand how AngularJS was built and the trade-offs made at the time
2. Explore how modern web platform features solve the same problems natively
3. Produce a minimal, zero-dependency framework that preserves AngularJS's developer ergonomics

---

## Historical Context

When AngularJS was created, the browser landscape was:

- No Custom Elements or Shadow DOM
- No `Proxy`, no `MutationObserver` (widely)
- No native modules (ESM)
- No `fetch()`, only XMLHttpRequest
- No `Promise` natively
- No `template` element
- No `URL`, `URLSearchParams`, `History.pushState` was new
- No `Intl` APIs
- No `requestAnimationFrame` in all browsers
- No CSS custom properties, no `@layer`, no `:has()`
- jQuery was needed for cross-browser DOM manipulation

AngularJS invented or bundled solutions for all of these. Today, the platform provides native answers.

---

## Feature Mapping: AngularJS → Modern Browser APIs

### 1. Components & Templates (Directives / Compile)

| AngularJS Feature                     | Original Problem                   | Modern Replacement                                                              |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Directives (element/attribute)        | Custom reusable UI components      | **Custom Elements** (Web Components v1)                                         |
| Template compilation (`$compile`)     | Parse HTML, link scope to DOM      | **`<template>` element** + `cloneNode` from external `.html` file               |
| `templateUrl`                         | Separate HTML file for template    | **`import.meta.url`** relative URL + build-time inlining or runtime fetch+cache |
| Transclusion                          | Content projection                 | **`<slot>` elements** (Shadow DOM)                                              |
| Template scope isolation              | Encapsulated component state       | **Shadow DOM** encapsulation                                                    |
| `ng-transclude`                       | Project parent content into child  | **Named `<slot>`s**                                                             |
| `$templateCache` / `$templateRequest` | Cache templates, fetch from server | Class-level template cache (fetch once per component type)                      |

**Learning Insight**: AngularJS built an entire compiler to do what the browser now does natively with Custom Elements + Shadow DOM.

**Template Separation Principle**: Like AngularJS's `templateUrl`, templates live in real `.html` files — not inline strings in JavaScript. This preserves full HTML/CSS tooling (linting, formatting, autocomplete, accessibility checkers). The framework resolves templates via `import.meta.url` relative to the component file:

- **With bundler (production)**: Template is inlined at build time — zero runtime cost, zero async.
- **Without bundler (dev/learning)**: Template is fetched on first use and cached at the class level — subsequent instances are synchronous.

One API, one code path, two runtime behaviors depending on whether a build step is present.

---

### 2. Data Binding & Reactivity (Scope / Digest Cycle)

| AngularJS Feature                  | Original Problem                | Modern Replacement                                                         |
| ---------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `$scope`                           | Component state container       | **Class fields** on Custom Element                                         |
| Dirty checking / digest cycle      | Detect changes to plain objects | **`Proxy`** for deep observation                                           |
| `$watch` / `$watchCollection`      | Observe value changes           | **`Proxy`** traps + **`MutationObserver`** for DOM                         |
| Two-way binding (`ng-model`)       | Sync form inputs ↔ model        | **Unidirectional flow**: state → view (reactive), view → state (events up) |
| `$apply` / `$digest`               | Trigger change detection        | Automatic via Proxy traps (synchronous) or **microtask** batching          |
| Expression evaluation (`{{expr}}`) | Interpolate model into view     | **Tagged Template Literals** or manual `textContent` updates               |
| One-time binding (`::expr`)        | Optimize static data            | Straightforward: just set once, don't observe                              |

**Learning Insight**: The digest cycle with dirty checking was an O(n) approach necessary because JavaScript had no way to intercept property access/mutation. `Proxy` (ES2015+) solves this in O(1) per mutation.

**Why NOT Two-Way Binding** (Historical Lesson): AngularJS's signature feature turned out to be an anti-pattern that every subsequent framework rejected:

- **Cascading updates** — A mutates B which mutates C which mutates A, creating unpredictable state
- **Undebuggable** — no clear answer to "what changed this value and why?"
- **Performance death spirals** — digest cycles that can't stabilize (10-iteration TTL)
- **Tight coupling** — parent and child sharing mutable references prevents independent reasoning

Every major framework post-AngularJS adopted **unidirectional data flow**: data flows down (props/attributes), intent flows up (events/callbacks). This makes state changes traceable, debuggable, and predictable. Our design follows this principle: `Proxy` makes state → DOM reactive automatically, but DOM → state always requires an explicit event handler — the developer is always in control of state mutations.

---

### 3. Dependency Injection (`$injector`)

| AngularJS Feature                        | Original Problem                  | Modern Replacement                                                            |
| ---------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `$injector` / DI container               | Decouple services, enable testing | **Interface-based DI container** — register implementations against contracts |
| `module.service()` / `module.factory()`  | Register singletons               | Container with singleton/transient lifetime management                        |
| `module.provider()`                      | Configurable service creation     | Factory functions with config parameters, registered in container             |
| `$inject` annotation (minification-safe) | Identify deps by name             | Not needed — ES Modules use direct references, container uses string keys     |
| `module.constant()` / `module.value()`   | Share config values               | Container registration with `{ lifetime: 'value' }` or plain `export const`   |

**Learning Insight**: AngularJS DI solved two distinct problems: (1) dependency resolution (what depends on what) and (2) dependency substitution (swap implementations for testing). ES Modules solve #1 beautifully but make #2 dependent on external tooling (`vi.mock`, jest `moduleNameMapper`, etc.) that's fragile and framework-specific.

**Why DI is a Core Requirement**: Interface-based DI remains the cleanest way to:

- **Mock services in tests** without patching module internals or relying on tool-specific hacks
- **Swap implementations** at runtime (e.g., in-memory storage vs API, real HTTP vs fake)
- **Scale test suites** — each test configures its own container with the exact dependencies it needs
- **Document contracts** — the interface/type defines what a service must provide, not the implementation

The container should be lightweight but opinionated: services are registered against an interface (or token), and consumers resolve by interface. This is AngularJS's lasting contribution to frontend architecture.

---

### 4. HTTP & Server Communication (`$http`)

| AngularJS Feature    | Original Problem                   | Modern Replacement                                               |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `$http` service      | XHR wrapper with promises          | **`fetch()` API**                                                |
| `$http` interceptors | Modify requests/responses globally | `fetch()` wrapper with middleware pattern or **Service Workers** |
| `$httpBackend`       | Abstract XHR for testing           | Native `fetch` + `MSW` (Mock Service Worker) for testing         |
| JSONP support        | Cross-origin before CORS           | Not needed — **CORS** is universal                               |
| `$http.defaults`     | Global headers, transforms         | A configured `fetch` wrapper class                               |
| `$resource`          | REST resource abstraction          | `fetch()` + simple REST helper class                             |

**Learning Insight**: `$http` wrapped the inconsistent XHR API and added promise support before `Promise` existed. `fetch()` is promise-native, streaming, and clean.

---

### 5. Routing (`ngRoute` / `ui-router` / `$location`)

| AngularJS Feature                        | Original Problem                      | Modern Replacement                                                |
| ---------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| `$location` service                      | Abstract URL manipulation             | **`URL`** and **`URLSearchParams`** APIs                          |
| `$routeProvider`                         | Declarative route → template mapping  | **Navigation API** (new) or `popstate` + `URLPattern`             |
| Hashbang routing (`#!`)                  | SPAs before `pushState`               | **`History.pushState()`** / `History.replaceState()`              |
| Route resolve                            | Load data before showing view         | `async connectedCallback()` or top-level `await`                  |
| Route events (`$routeChangeStart`, etc.) | Lifecycle hooks on navigation         | **Navigation API** events or custom `EventTarget`                 |
| Deep linking                             | Bookmarkable application state        | Native URL handling (always worked, no framework needed)          |
| ui-router state tree                     | Parent/child route hierarchy          | **Route groups** with shared resolve (one level deep)             |
| ui-router transition hooks               | Guard navigation (auth, roles)        | **Transition pipeline**: `onBefore`, `onSuccess`, `onError` hooks |
| ui-router multiple named views           | Independent page regions              | ❌ Skipped — overhead without real payoff (experience-based)      |
| ui-router `$state.go()`                  | Navigate by state name                | ❌ Skipped — native `pushState` + URL is sufficient               |
| ui-router resolve inheritance            | Child inherits parent's resolved data | ❌ Skipped — hides data origin, reduces visibility                |

**Learning Insight**: `$location` abstracted hashbang vs HTML5 mode because pushState was new and inconsistent. Today pushState is universal, and the Navigation API adds even more power.

**Pragmatic ui-router Lesson**: In real-world usage, only two ui-router features proved consistently valuable: (1) route groups with shared resources (parent/child for shared resolves), and (2) transition hooks for auth/permissions/role guards. Multiple named views, state-based navigation, and resolve inheritance added complexity without proportional benefit. This design takes the useful parts and leaves the rest.

---

### 6. Promises & Async (`$q`)

| AngularJS Feature        | Original Problem                    | Modern Replacement                                      |
| ------------------------ | ----------------------------------- | ------------------------------------------------------- |
| `$q` service             | Promise implementation (pre-native) | **Native `Promise`**                                    |
| `$q.defer()`             | Create resolvable promise           | `new Promise((resolve, reject) => ...)`                 |
| `$q.all()`               | Wait for multiple promises          | `Promise.all()` / `Promise.allSettled()`                |
| `$q.race()`              | First to resolve                    | `Promise.race()` / `Promise.any()`                      |
| `$timeout` / `$interval` | Async wrappers that trigger digest  | `setTimeout` / `setInterval` (Proxy handles reactivity) |
| Integration with digest  | Promises trigger UI update          | **Microtask queue** (promises auto-schedule) + Proxy    |

**Learning Insight**: `$q` existed because native Promise didn't. The digest-cycle integration was needed because AngularJS couldn't know when async operations completed. Proxy + microtasks handle this naturally.

---

### 7. DOM Manipulation (jqLite)

| AngularJS Feature                | Original Problem                        | Modern Replacement                                                             |
| -------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| jqLite                           | Cross-browser DOM (without full jQuery) | **Native DOM APIs** (querySelector, classList, etc.)                           |
| `angular.element()`              | Wrap DOM element                        | Direct `document.querySelector()`                                              |
| `.on()` / `.off()`               | Event binding                           | `addEventListener` / `removeEventListener` + **`AbortController`** for cleanup |
| `.addClass()` / `.removeClass()` | Class manipulation                      | `element.classList` API                                                        |
| `.css()`                         | Style manipulation                      | `element.style` + **CSS Custom Properties**                                    |
| `.find()` / `.children()`        | DOM traversal                           | `querySelectorAll()`, `children`, `closest()`                                  |

**Learning Insight**: jqLite existed because IE6-8 DOM APIs were inconsistent and verbose. Modern DOM APIs are consistent across all browsers and equally expressive.

---

### 8. Filters

| AngularJS Feature         | Original Problem      | Modern Replacement                                            |
| ------------------------- | --------------------- | ------------------------------------------------------------- |
| `currency` filter         | Format currency       | **`Intl.NumberFormat`**                                       |
| `date` filter             | Format dates          | **`Intl.DateTimeFormat`** / **`Temporal`** (Stage 3)          |
| `number` filter           | Format numbers        | **`Intl.NumberFormat`**                                       |
| `lowercase` / `uppercase` | Text transform        | `String.prototype.toLocaleLowerCase()` / CSS `text-transform` |
| `orderBy` filter          | Sort arrays           | `Array.prototype.toSorted()` (non-mutating)                   |
| `filter` filter           | Filter arrays         | `Array.prototype.filter()`                                    |
| `limitTo` filter          | Slice arrays/strings  | `Array.prototype.slice()`                                     |
| `json` filter             | Pretty-print JSON     | `JSON.stringify(val, null, 2)`                                |
| Custom filters            | Pipe-style transforms | Plain functions (composition)                                 |

**Learning Insight**: AngularJS filters bundled i18n formatting before `Intl` existed. Today, `Intl` gives locale-aware formatting that's more correct and complete.

---

### 9. Forms & Validation (`ngModel` / `NgModelController`, `form`)

| AngularJS Feature                                 | Original Problem               | Modern Replacement                                                                   |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `ng-model`                                        | Two-way bind inputs            | **`Field` class**: viewValue/modelValue + middleware pipelines, explicit `onChange`  |
| `NgModelController.$parsers`                      | Transform view → model         | **`Field` parsers pipeline**: composable functions, view string → typed model value  |
| `NgModelController.$formatters`                   | Transform model → view         | **`Field` formatters pipeline**: composable functions, typed model → view string     |
| `NgModelController.$viewValue / $modelValue`      | Dual representation            | **`Field.viewValue` / `Field.modelValue`**: same separation, read-only access        |
| Form validation states (`$valid`, `$dirty`, etc.) | Track form state               | **`Field` state** + CSS classes (`ng-valid`, `ng-dirty`, `ng-touched`, `ng-pending`) |
| `$validators` / `$asyncValidators`                | Sync/async validation pipeline | **`Field` validators**: run after parsers, async with `AbortController` cancellation |
| Custom validators                                 | Business rule validation       | **`Field` validator functions**: `(modelValue, viewValue) => errorKey \| null`       |
| `ng-messages`                                     | Display validation messages    | **`Field.errors` object** + CSS pseudo-classes + conditional rendering               |
| `ng-model-options` (debounce)                     | Throttle model updates         | **`Field` debounce option** on input event handling                                  |
| `form.$valid`, `form.$dirty`                      | Aggregate form state           | **`FormGroup` class**: aggregates child `Field` instances                            |

**Learning Insight**: AngularJS built a complete validation system because the Constraint Validation API was incomplete. Today browsers provide validity states, custom messages, and CSS pseudo-selectors for form validation natively. However, the **NgModelController middleware architecture** (parsers, formatters, validators) was genuinely excellent design — it's Express-style middleware for form data.

**What NgModelController Got Right (That We Preserve)**:

1. **viewValue / modelValue separation** — the DOM always deals in strings; your app logic deals in typed values. The transform layer between them is explicit and composable.
2. **Parser pipeline** — chainable functions that transform user input into application values (trim → lowercase → parse number). Each step is independently testable.
3. **Formatter pipeline** — the reverse: when code sets a model value, formatters produce the display string. One API, bidirectional transform.
4. **Validation runs at the right point** — after parsing (you validate the _model_ value, not the raw string), before propagation.
5. **State tracking as first-class** — dirty/pristine, touched/untouched, valid/invalid, pending — all built-in and automatic.

**What We Fix (The Two-Way Binding Problem)**:

- NgModelController pushed `$modelValue` back into scope _automatically_. This was the source of cascading mutations.
- Our `Field` class runs the same pipeline but calls `onChange(modelValue, state)` — the developer decides explicitly what to do with the result. The pipeline processes; the developer propagates. Same power, traceable flow.

**Design Principle**: The `Field` class is the modern NgModelController — same middleware architecture, same dual-value model, same validation lifecycle — but with explicit propagation instead of implicit two-way binding.

---

### 10. Animation (`ngAnimate`)

| AngularJS Feature                    | Original Problem               | Modern Replacement                                                 |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------ |
| CSS class-based animations           | Animate on state changes       | **CSS Transitions** + **`element.animate()` (Web Animations API)** |
| JavaScript animations                | Complex choreography           | **Web Animations API** with `KeyframeEffect`                       |
| Animation hooks (enter, leave, move) | Component lifecycle animations | CSS `:defined`, `connectedCallback`/`disconnectedCallback` + WAAPI |
| `$animate` service                   | Programmatic animation control | `element.animate()` returns `Animation` object                     |
| Staggering                           | Delay sequences                | **CSS `transition-delay`** + `nth-child` or WAAPI with delay param |

**Learning Insight**: AngularJS needed JavaScript hooks because CSS animations lacked programmatic control and sequencing. The Web Animations API gives full JS control with hardware acceleration.

---

### 11. Security (`$sce`, `$sanitize`)

| AngularJS Feature                   | Original Problem              | Modern Replacement                                                        |
| ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `$sce` (Strict Contextual Escaping) | Prevent XSS via trusted types | **Trusted Types API**                                                     |
| `$sanitize`                         | Clean unsafe HTML             | **Sanitizer API** (experimental) or `DOMPurify` patterns with `DOMParser` |
| `ng-bind-html`                      | Safe HTML rendering           | `element.setHTML()` (Sanitizer API) or manual `DOMParser` + allowlist     |
| `$sceDelegate`                      | Configure trust per context   | **Content-Security-Policy** headers                                       |

**Learning Insight**: AngularJS pioneered contextual escaping. The browser is now adopting the same philosophy via Trusted Types and the Sanitizer API.

---

### 12. Testing (`ngMock`)

| AngularJS Feature         | Original Problem                     | Modern Replacement                                                        |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `$httpBackend.when()`     | Mock HTTP in tests                   | **DI container**: register a fake `Http` implementation in test container |
| `$componentController`    | Instantiate controllers in isolation | Direct construction of Custom Element with test container                 |
| `$timeout.flush()`        | Control async in tests               | `vi.useFakeTimers()` / `jest.useFakeTimers()`                             |
| `$rootScope.$digest()`    | Force synchronous update             | Not needed — Proxy updates are synchronous                                |
| Module injection in tests | Swap real deps for mocks             | **DI container**: register mocks against same interface tokens            |

**Learning Insight**: AngularJS's DI was its killer feature for testing — you could swap any service for a mock with zero ceremony. ES Module mocking (`vi.mock()`, `moduleNameMapper`) is fragile, path-dependent, and framework-specific. Our DI container preserves AngularJS's testing ergonomics: register a mock implementation in the test container, and the component under test uses it transparently.

**Testing Pattern:**

```javascript
// Production: container has real services
container.register("http", () => new Http({ baseUrl: "/api" }));

// Test: same interface, fake implementation
testContainer.register("http", () => ({
  get: async (url) => ({ json: async () => mockData }),
  post: async (url, body) => {
    lastPost = body;
    return { ok: true };
  },
}));
```

---

## Non-Functional Requirements

### NFR-1: Zero Runtime Dependencies

- No runtime dependencies beyond the browser platform
- No build step required for development (native ES modules + runtime template fetch)
- **Vite** (Rollup) for production builds — inlines templates/styles for zero-async rendering
- Vite dev server provides HMR and API proxy during development
- Custom Rollup plugins handle template/style inlining (no magic, inspectable transform)
- Library mode output: ES modules consumable by host app's bundler (Webpack 5)
- Components use co-located `.html` and `.css` files — full tooling support (linting, formatting, autocomplete)
- Dev dependencies (Vite, Rollup plugins) don't ship to production — only the browser-native framework code does

### NFR-2: Size Budget

- Core framework (reactivity + components) < 5KB gzipped
- Full framework (all features) < 15KB gzipped
- Compare: AngularJS 1.8 minified = ~170KB

### NFR-3: Browser Support

- All browsers supporting Custom Elements v1 + Proxy + ES Modules
- Chrome 67+, Firefox 63+, Safari 12.1+, Edge 79+
- No polyfills needed

### NFR-4: Developer Experience

- Preserve declarative template feel of AngularJS
- Components should be as easy to define as AngularJS directives
- Unidirectional data flow: props down, events up — predictable and debuggable
- Error messages should be clear and helpful

### NFR-5: Performance

- No dirty checking — O(1) change detection via Proxy
- Batched DOM updates via microtask scheduling
- Lazy component instantiation (on `connectedCallback`)
- Memory-efficient: no scope hierarchy to maintain

---

## Scope

### In Scope

- Core reactivity system (Proxy-based, one-way: state → DOM)
- Custom Element base class with declarative templates
- Interface-based DI container (core — enables testability)
- Controlled form inputs (one-way state + explicit event handlers)
- Simple router using History/Navigation API
- HTTP helper wrapping fetch
- Filter/pipe utilities using Intl APIs
- Animation helpers using Web Animations API
- Security helpers using Trusted Types

### Out of Scope

- Server-side rendering (could be added later)
- CLI tooling / scaffolding
- DevTools extension
- Migration tool from AngularJS
- Full backward compatibility with AngularJS APIs

---

## Success Criteria

- [ ] Every AngularJS core feature has a documented modern equivalent
- [ ] Working prototype demonstrates: reactive component, routing, HTTP, forms
- [ ] Bundle size < 15KB gzipped for the full framework
- [ ] All examples run in modern browsers without polyfills
- [ ] Clear documentation showing the "before (AngularJS) → after (modern)" for each concept
- [ ] Trade-off analysis: what AngularJS got right that still has no native equivalent

---

## Document Metadata

**Created**: 2026-08-13
**Status**: Draft
**Purpose**: Learning exercise & exploration
