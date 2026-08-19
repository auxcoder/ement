# Modern AngularJS — Implementation Tasks

## Overview

Phased implementation plan for building ng-modern. Each phase builds on the previous and produces a working, testable artifact. The order mirrors how AngularJS itself layered: reactivity first, then components, then the ecosystem around them.

---

## Phase 1: Core Reactivity System

**Goal**: Implement Proxy-based reactivity with batched DOM updates. This is the foundation everything else builds on — equivalent to AngularJS's `$rootScope` + digest cycle.

**Estimated time**: 2-3 hours

### Tasks

- [ ] **Task 1.1**: Create project structure
  - Initialize `src/` directory with ES module structure
  - Create `package.json` with `"type": "module"`
  - Add basic `index.html` test harness
  - No build tools yet — native ES modules only

- [ ] **Task 1.2**: Implement `reactive()` function
  - Proxy handler with `get`/`set` traps
  - Deep reactivity (nested objects become proxies on access)
  - Array method interception (push, pop, splice, etc.)
  - Circular reference protection
  - Test: mutating a property triggers the callback
  - Test: nested mutations trigger with dotted path

- [ ] **Task 1.3**: Implement microtask scheduler
  - `scheduleUpdate(fn)` queues updates
  - Uses `queueMicrotask()` for batching
  - Deduplicates — same function only runs once per batch
  - Test: 10 property changes → 1 DOM update
  - Test: updates happen before next frame (microtask, not setTimeout)

- [ ] **Task 1.4**: Implement `computed()` helper
  - Tracks which reactive properties are accessed during computation
  - Re-computes when dependencies change
  - Lazy evaluation (doesn't compute until read)
  - Test: computed value updates when dependency changes
  - Test: computed doesn't recalculate if deps unchanged

- [ ] **Task 1.5**: Write comparative test — digest cycle vs Proxy
  - Benchmark: 1000 watchers (AngularJS style) vs 1000 Proxy traps
  - Document the performance characteristics
  - Note where Proxy wins and where dirty-checking was simpler

### Phase 1 Deliverable

A working `reactive()` function with tests proving it detects changes, batches updates, and handles edge cases (arrays, nested objects, circular refs).

---

## Phase 2: DI Container

**Goal**: Implement the interface-based dependency injection container. This comes before components because components will resolve their services from the container — DI is foundational infrastructure, not an add-on.

**Estimated time**: 2 hours

### Tasks

- [ ] **Task 2.1**: Implement `Container` class
  - `register(token, factory, options)` — register services against Symbol tokens
  - `resolve(token)` — create/retrieve instances
  - Singleton lifetime (default): one instance shared across all resolves
  - Transient lifetime: new instance per resolve
  - Circular dependency detection (throw on resolve cycle)
  - Test: resolving a registered token returns the instance
  - Test: singleton returns same instance on multiple resolves
  - Test: transient returns different instances

- [ ] **Task 2.2**: Implement container hierarchy
  - `createChild()` — child container inherits parent registrations
  - Child can override parent tokens (shadow, don't mutate parent)
  - Resolution walks up the chain: child → parent → grandparent
  - Test: child resolves from parent when not overridden
  - Test: child override shadows parent without affecting parent consumers

- [ ] **Task 2.3**: Implement service tokens module
  - Define `Symbol` tokens for core services (Http, Router, Storage, etc.)
  - Tokens are the "interfaces" — they define what you ask for, not what you get
  - Test: tokens are unique and descriptive in errors

- [ ] **Task 2.4**: Implement container-aware base for NgElement
  - Components access container via DOM traversal (walk up to find provider)
  - `this.container.resolve(Token)` in component code
  - Container provider element: `<ng-app container={...}>` or similar
  - Test: nested component resolves service from ancestor container

- [ ] **Task 2.5**: Write comparative example
  - Same service resolved in AngularJS (`$inject`) vs ng-modern (container.resolve)
  - Same mock swapped in test: AngularJS (`$provide.value()`) vs test container
  - Show why this is cleaner than `vi.mock('./path/to/module.js')`

### Phase 2 Deliverable

A working DI container with hierarchy, used by all subsequent modules for service resolution and test mocking.

---

## Phase 3: Component System (NgElement)

**Goal**: Build the Custom Element base class that replaces AngularJS directives. This is the equivalent of `$compile` + DDO (Directive Definition Object).

**Estimated time**: 3-4 hours

### Tasks

- [ ] **Task 3.1**: Implement basic `NgElement` class with external template resolution
  - Extends `HTMLElement`
  - Attaches Shadow DOM in constructor
  - Template resolution via `static templateUrl` (using `import.meta.url`)
  - Styles resolution via `static stylesUrl`
  - Class-level cache: fetch once per component _type_, all instances reuse
  - With bundler: `templateUrl` is replaced with inline string at build time (zero async)
  - Without bundler: fetches and caches on first instantiation
  - Lifecycle: `onInit()` (after template rendered), `onDestroy()` (disconnectedCallback)
  - Resolves services from DI container (via DOM traversal to nearest provider)
  - Test: element renders external `.html` template into Shadow DOM
  - Test: second instance of same component doesn't re-fetch (uses cache)
  - Test: component `.js` file contains zero HTML/CSS (separation verified)

- [ ] **Task 3.2**: Implement template binding (`{{ prop }}`)
  - TreeWalker to find text node expressions
  - Map expressions to reactive properties
  - Updates text nodes when property changes
  - Test: changing a property updates the rendered text
  - Test: multiple bindings to same property all update

- [ ] **Task 3.3**: Implement attribute → property reflection
  - `observedAttributes` → `attributeChangedCallback`
  - Automatic kebab-case to camelCase conversion
  - Type coercion (string attrs → boolean/number props where declared)
  - Test: setting `user-name="Alice"` updates `this.userName`

- [ ] **Task 3.4**: Implement slot-based content projection (transclusion)
  - Default `<slot>` for simple projection
  - Named slots for multi-slot projection
  - Test: child content projects into default slot
  - Test: named slot selects specific children

- [ ] **Task 3.5**: Implement event emission (output binding)
  - Helper method to dispatch CustomEvents
  - Bubble through Shadow DOM via `composed: true`
  - Test: child component event reaches parent listener
  - Compare: AngularJS `&` scope binding vs CustomEvent

- [ ] **Task 3.6**: Implement conditional rendering helper
  - `this.show(selector, condition)` — shows/hides element
  - `this.when(condition, templateFn)` — creates/removes DOM
  - Test: toggling condition creates/removes elements
  - Compare: `ng-if` vs manual DOM manipulation

- [ ] **Task 3.7**: Implement list rendering helper
  - `this.repeat(container, items, templateFn, keyFn)`
  - Keyed reconciliation (reuse existing elements when possible)
  - Test: adding/removing items updates DOM efficiently
  - Compare: `ng-repeat` with `track by` vs keyed reconciliation

- [ ] **Task 3.8**: Write comparative example
  - Same component in AngularJS directive syntax and NgElement
  - Document what's simpler, what's harder, what's the same

- [ ] **Task 3.9**: Implement `onChanges` lifecycle hook
  - Called when reactive properties change (after the setter fires)
  - Receives a changes object: `{ propName: { previous, current, firstChange } }`
  - Called for attribute changes (via `attributeChangedCallback`)
  - Called for programmatic property sets (via reactive getter/setter)
  - Batched via microtask (multiple changes in same tick → one `onChanges` call with all changes)
  - Equivalent to AngularJS `$onChanges` / Angular `ngOnChanges`
  - Test: `onChanges` fires with correct previous/current values
  - Test: multiple property changes in same tick are batched into one call
  - Test: `firstChange` is true on initial attribute set
  - Test: `onChanges` not called if value is the same (Object.is)

### Phase 3 Deliverable

A working component base class that renders templates, binds data, handles slots, resolves services from the DI container, manages lifecycle (onInit, onChanges, onDestroy), and reacts to property changes. Multiple example components demonstrating the API.

---

## Phase 4: Router

**Goal**: SPA routing using History API and URLPattern, with route groups for shared resources and a transition hook pipeline for auth/permissions. Takes the pragmatic best of ngRoute (simplicity) and ui-router (guards + grouping) without the state machine complexity.

**Estimated time**: 3-4 hours

### Tasks

- [ ] **Task 4.1**: Implement `Router` class (core)
  - Route registration with URLPattern
  - `navigate(path)` using `history.pushState()`
  - `popstate` listener for back/forward
  - URL parameter extraction (`:id` → `params.id`)
  - Track current route for `from`/`to` in transitions
  - Test: navigating changes the displayed component
  - Test: browser back/forward resolves correct route

- [ ] **Task 4.2**: Implement `<route-outlet>` element
  - Custom element that receives route changes
  - Mounts/unmounts component elements
  - Passes route params and resolved data to mounted component
  - Test: route change swaps component in outlet

- [ ] **Task 4.3**: Implement link interception
  - Click handler on `<a>` tags with same-origin hrefs
  - Prevents full page reload, calls `router.navigate()`
  - Opt-out via `data-external` attribute
  - Test: clicking internal link navigates without reload
  - Test: `data-external` links open normally

- [ ] **Task 4.4**: Implement transition hook pipeline
  - `router.onBefore(async (from, to) => ...)` — runs before navigation
    - Return `undefined` to continue
    - Return `false` to cancel navigation
    - Return a `string` to redirect to that path
  - `router.onSuccess(async (from, to, data) => ...)` — runs after successful mount
  - `router.onError(async (error, from, to) => ...)` — runs if resolve or mount fails
  - Multiple hooks per phase (all run in registration order)
  - Async-aware (hooks can await auth checks, permission loads, etc.)
  - Test: `onBefore` returning false cancels navigation
  - Test: `onBefore` returning '/login' redirects
  - Test: `onSuccess` fires after mount with route data
  - Test: `onError` catches resolve failures

- [ ] **Task 4.5**: Implement route groups (shared resolve)
  - `router.group(name, { resolve })` — define a group with shared resolve function
  - `router.route(pattern, component, { group: 'name' })` — assign route to group
  - Group resolve runs once on first child route hit, result cached
  - All routes in the group receive the group's resolved data merged with their own
  - `router.invalidateGroup(name)` — clears cache (e.g., on logout)
  - Test: two routes in same group share resolved data
  - Test: group resolve runs only once (cached)
  - Test: `invalidateGroup` forces re-resolve on next navigation

- [ ] **Task 4.6**: Implement route-level resolve
  - `resolve: async (params) => data` on individual route config
  - Data passed to component as `routeData` property
  - Merged with group data (route-level overrides group on conflict)
  - Test: component receives pre-loaded data on mount

- [ ] **Task 4.7**: Write comparative example
  - Same multi-route app with auth guard:
    - ngRoute version (limited — no guards, needs `$routeChangeStart` hack)
    - ui-router version (full state tree, `$transitions.onBefore`)
    - ng-modern version (flat routes + hooks — simpler, same power for guards)
  - Document: what we kept from ui-router and why, what we dropped and why

### Phase 4 Deliverable

A working SPA router with URL-based navigation, parameter passing, transition hook pipeline (auth/roles/permissions), and route groups for shared resources. Demo app showing protected routes with redirect-to-login pattern.

---

## Phase 5: HTTP Module

**Goal**: fetch() wrapper with interceptor pattern. Equivalent to `$http`.

**Estimated time**: 1-2 hours

### Tasks

- [ ] **Task 5.1**: Implement `Http` class
  - `get`, `post`, `put`, `delete`, `patch` methods
  - Automatic JSON serialization/deserialization
  - Base URL configuration
  - Request/response type inference
  - Test: GET request returns parsed JSON

- [ ] **Task 5.2**: Implement interceptor pipeline
  - Request interceptors (add headers, auth tokens)
  - Response interceptors (transform data, handle errors)
  - Error interceptors (retry logic, refresh tokens)
  - Test: auth interceptor adds bearer token to all requests

- [ ] **Task 5.3**: Implement request cancellation
  - `AbortController` integration
  - Per-request and global cancellation
  - Automatic cancellation on component disconnect
  - Test: disconnecting component cancels pending requests

- [ ] **Task 5.4**: Implement retry and timeout
  - Configurable retry count with exponential backoff
  - Request timeout via `AbortSignal.timeout()`
  - Test: failed request retries up to configured max

- [ ] **Task 5.5**: Write comparative example
  - Same API call with `$http` interceptors vs fetch wrapper
  - Highlight: no digest integration needed (Proxy handles it)

### Phase 5 Deliverable

A working HTTP client that wraps fetch with DX improvements similar to `$http`.

---

## Phase 6: Forms & Validation

**Goal**: Implement the `Field` class (modern NgModelController) with viewValue/modelValue separation, parser/formatter pipelines, sync/async validators, and `FormGroup` aggregation. Preserves NgModelController's middleware architecture while replacing implicit two-way binding with explicit `onChange` propagation.

**Estimated time**: 3-4 hours

### Tasks

- [ ] **Task 6.1**: Implement `Field` class — core pipeline
  - Constructor takes input element + options (parsers, formatters, validators, onChange)
  - `viewValue` / `modelValue` dual representation (like NgModelController)
  - Input event → parsers pipeline (view → model transform chain)
  - Each parser receives previous output, returns transformed value
  - Parser returning `undefined` halts the pipeline (rejection)
  - After parsers: sync validators run against `modelValue`
  - `onChange(modelValue, state)` callback fires — developer decides propagation
  - Test: parser chain transforms `"  HELLO "` → `"hello"` (trim + lowercase)
  - Test: parser returning undefined halts pipeline, onChange not called with invalid
  - Test: onChange receives final modelValue and full state object

- [ ] **Task 6.2**: Implement `Field.writeValue()` — model → view (formatters)
  - `writeValue(modelValue)` sets model, runs formatters (model → view), updates input
  - Formatter pipeline: each formatter receives previous output, returns display string
  - Updates `input.value` with final viewValue
  - Re-validates after write (model may now be invalid)
  - Test: `writeValue(42)` with number formatter → input shows `"42"`
  - Test: `writeValue(new Date())` with date formatter → input shows `"2026-08-18"`
  - Test: phone formatter: `writeValue("5551234567")` → input shows `"(555) 123-4567"`

- [ ] **Task 6.3**: Implement sync validators
  - Validator signature: `(modelValue, viewValue) => errorKey | null`
  - Run after parsers in the input pipeline
  - Run after writeValue for programmatic updates
  - Populate `field.errors` object: `{ required: true, minLength: true }`
  - `field.valid` is `true` only when `errors` is empty
  - Provide common validator factories: `required`, `minLength(n)`, `maxLength(n)`, `pattern(regex)`, `min(n)`, `max(n)`, `email`
  - Test: required validator sets `errors.required` when empty
  - Test: multiple validators produce multiple error keys
  - Test: valid input produces empty errors object

- [ ] **Task 6.4**: Implement async validators with AbortController
  - Async validator signature: `async (modelValue, signal) => errorKey | null`
  - Only run if sync validators pass (same behavior as NgModelController)
  - `field.pending = true` while async validators run
  - AbortController cancels previous async validation on new input (no stale results)
  - Re-fires `onChange` after async validation completes
  - Test: async validator marks field pending while in-flight
  - Test: fast typing cancels previous validation (AbortController)
  - Test: stale async result is ignored after abort
  - Test: async errors merge with any sync errors

- [ ] **Task 6.5**: Implement state tracking + CSS classes
  - Track: dirty/pristine (any input event), touched/untouched (blur event)
  - CSS classes applied to input: `ng-valid`, `ng-invalid`, `ng-dirty`, `ng-pristine`, `ng-touched`, `ng-untouched`, `ng-pending`
  - Programmatic controls: `markDirty()`, `markPristine()`, `markTouched()`, `reset(value)`
  - `reset()` clears dirty + touched, calls writeValue with provided value
  - `destroy()` aborts pending async + clears timeouts
  - Test: typing adds `ng-dirty`, removes `ng-pristine`
  - Test: blur adds `ng-touched`
  - Test: `reset()` restores pristine + untouched state

- [ ] **Task 6.6**: Implement debounce option
  - `debounce` option in Field constructor (milliseconds)
  - Input events are debounced before entering the parser pipeline
  - Prevents excessive pipeline runs on fast typing
  - Test: fast typing only fires pipeline once after debounce period
  - Test: debounce 0 (default) fires immediately

- [ ] **Task 6.7**: Implement `FormGroup` class
  - Constructor takes form element
  - `addField(name, field)` / `removeField(name)` — explicit registration
  - Aggregate state: `valid`, `dirty`, `touched`, `pending` (any field)
  - `errors` returns `{ fieldName: { errorKey: true } }` for all invalid fields
  - `field(name)` returns individual Field instance
  - `reset(values)` resets all fields with optional values map
  - `destroy()` destroys all registered fields
  - Blocks form submit when invalid + marks all fields touched (show errors)
  - Test: form `valid` is false if any child field is invalid
  - Test: form `dirty` is true if any child field is dirty
  - Test: submit blocked when invalid, all fields marked touched
  - Test: `reset({ email: '', password: '' })` clears all fields

- [ ] **Task 6.8**: Implement common parser/formatter/validator libraries
  - Parsers: `trim`, `lowercase`, `uppercase`, `toNumber`, `toDate`, `toBoolean`, `stripNonDigits`, `maxLength(n)`
  - Formatters: `fromNumber`, `fromDate`, `currency`, `phone`, `percentage`
  - Validators: `required`, `minLength(n)`, `maxLength(n)`, `pattern(regex, key)`, `min(n)`, `max(n)`, `email`
  - All are plain functions — composable, no framework coupling
  - Test: each parser/formatter/validator works independently

- [ ] **Task 6.9**: Write comparative example — NgModelController vs Field
  - Same registration form with: email (async check), phone (formatted), age (number)
  - AngularJS version: `ng-model`, `$parsers`, `$formatters`, `$asyncValidators`
  - ng-modern version: `Field` with pipelines + `FormGroup`
  - Data flow diagrams for both approaches
  - Highlight: same pipeline power, but explicit propagation in ng-modern
  - Document: the race condition NgModelController had with async validators (no cancellation) that Field solves with AbortController

### Phase 6 Deliverable

Working form system with `Field` class (NgModelController reimagined) providing viewValue/modelValue separation, composable parser/formatter pipelines, sync+async validators with stale-request cancellation, and `FormGroup` aggregation. Data flow: DOM → parsers → validators → onChange (explicit) → state. State → formatters → DOM (via writeValue).

---

## Phase 7: Animations

**Goal**: Web Animations API wrappers for enter/leave/move. Equivalent to `ngAnimate`.

**Estimated time**: 1-2 hours

### Tasks

- [ ] **Task 7.1**: Implement `animateIn()` / `animateOut()`
  - Keyframe-based enter/leave animations
  - `animateOut` removes element after animation completes
  - Configurable duration, easing, fill mode
  - Test: element fades in when added to DOM

- [ ] **Task 7.2**: Implement `stagger()` helper
  - Incrementally delayed animations for lists
  - Integrates with list rendering helper (Phase 3)
  - Test: list items animate in sequence

- [ ] **Task 7.3**: Implement lifecycle animation hooks
  - `NgElement` calls animation on `connectedCallback` / `disconnectedCallback`
  - Static `enterAnimation` / `leaveAnimation` on component class
  - Promise-based (await animation before remove)
  - Test: component animates in when connected, out when removed

- [ ] **Task 7.4**: Write comparative example
  - CSS class-based animation (AngularJS style) vs WAAPI
  - Show stagger example both ways

### Phase 7 Deliverable

Animation helpers that make lifecycle animations declarative on components.

---

## Phase 8: Filters / Formatting (Intl)

**Goal**: Utility functions using Intl APIs. Equivalent to AngularJS filters.

**Estimated time**: 1 hour

### Tasks

- [ ] **Task 8.1**: Implement currency/number formatting
  - `formatCurrency(value, currency, locale)`
  - `formatNumber(value, options, locale)`
  - `formatPercent(value, locale)`
  - Uses `Intl.NumberFormat` internally
  - Test: formats number to locale-specific currency string

- [ ] **Task 8.2**: Implement date formatting
  - `formatDate(value, style, locale)`
  - Predefined styles: short, medium, long, full
  - Custom patterns via Intl options
  - Relative time: `formatRelative(date)` using `Intl.RelativeTimeFormat`
  - Test: formats dates correctly for different locales

- [ ] **Task 8.3**: Implement list/plural formatting
  - `formatList(items, type, locale)` using `Intl.ListFormat`
  - `formatPlural(count, forms, locale)` using `Intl.PluralRules`
  - Test: pluralization works for English and Spanish

- [ ] **Task 8.4**: Write comparative example
  - Same data formatted with AngularJS filters vs Intl APIs
  - Show where Intl is more correct (locale-aware sorting, etc.)

### Phase 8 Deliverable

A set of pure functions for i18n-aware formatting, zero dependencies.

---

## Phase 9: Security

**Goal**: HTML sanitization and safe rendering. Equivalent to `$sce` + `$sanitize`.

**Estimated time**: 1-2 hours

### Tasks

- [ ] **Task 9.1**: Implement `sanitizeHTML()`
  - DOMParser-based sanitization
  - Configurable allowlist (tags, attributes)
  - Strips event handlers, javascript: URIs
  - Test: removes `<script>` and `onclick` attributes

- [ ] **Task 9.2**: Implement safe HTML rendering on NgElement
  - `this.setHTML(selector, html)` method
  - Always sanitizes before inserting
  - Optional Trusted Types integration
  - Test: setting HTML strips dangerous content

- [ ] **Task 9.3**: Implement CSP-compatible template evaluation
  - No `eval()` or `new Function()` (unlike AngularJS expressions)
  - All template expressions resolve to property lookups
  - Test: works with strict CSP headers

- [ ] **Task 9.4**: Write comparative example
  - `$sce.trustAsHtml()` vs Trusted Types
  - `$sanitize` vs DOMParser-based sanitization
  - Document the security model differences

### Phase 9 Deliverable

Secure-by-default HTML rendering that's CSP-compatible.

---

## Phase 10: Integration Testing Patterns

**Goal**: Demonstrate how DI enables scalable unit testing without module-patching tools. Show patterns for testing components, services, and compositions.

**Estimated time**: 1-2 hours

### Tasks

- [ ] **Task 10.1**: Test a component with mocked dependencies
  - Create test container with fake Http and Storage
  - Instantiate component against test container
  - Verify component behavior without network calls
  - Test: component renders data from fake service

- [ ] **Task 10.2**: Test service composition
  - Service A depends on Service B — mock B, test A in isolation
  - Use child container to override only the dependency under test
  - Test: service A uses fake B without knowing

- [ ] **Task 10.3**: Test router guards with DI
  - Mock auth service to return logged-in / logged-out
  - Verify guard blocks/allows navigation based on mock state
  - Test: guard rejects navigation when auth mock returns false

- [ ] **Task 10.4**: Write comparative testing example
  - Same test in AngularJS (`$httpBackend`, `$provide`) vs ng-modern (container)
  - Same test using `vi.mock()` to show why DI is cleaner
  - Document: no path-coupling, no hoisting magic, no framework-specific API

### Phase 10 Deliverable

A test suite demonstrating that DI makes testing composable, readable, and tool-independent.

---

## Phase 11: Integration & Documentation

**Goal**: Build a complete example app and documentation showing the full framework.

**Estimated time**: 3-4 hours

### Tasks

- [ ] **Task 11.1**: Build a complete TodoMVC app
  - Uses all modules: components, DI, routing, HTTP, forms, animations
  - Multiple routes: list view, detail view, settings
  - Demonstrates component composition and data flow

- [ ] **Task 11.2**: Build an AngularJS comparison guide
  - Side-by-side code for every major pattern
  - "If you wrote X in AngularJS, here's how in ng-modern"
  - Include the _why_ — what problem was solved and how the solution changed

- [ ] **Task 11.3**: Measure and document bundle sizes
  - Each module individually
  - Full framework combined
  - Compare to AngularJS 1.8 minified (170KB)
  - Compare to common alternatives (Vue, Preact, Lit)

- [ ] **Task 11.4**: Document limitations and missing pieces
  - What AngularJS does that we can't replicate natively
  - Where the modern approach is worse for DX
  - What would be needed for production use

- [ ] **Task 11.5**: Write "Lessons Learned" reflection
  - What was AngularJS's greatest engineering insight?
  - What trade-offs were forced by the platform limitations of 2010?
  - What can modern framework authors learn from AngularJS's design?
  - What would you do differently with hindsight?

### Phase 11 Deliverable

A polished demo app, comparison documentation, and reflective analysis.

---

## Phase 12: Build & Optimization (Vite/Rollup)

**Goal**: Production build pipeline using Vite (which uses Rollup under the hood) that inlines templates/styles, tree-shakes unused modules, and produces optimized bundles ready to be loaded into an existing AngularJS application. Also serves as the dev server (replacing the need for a simple HTTP server during development).

**Estimated time**: 3-4 hours

### Tasks

- [ ] **Task 12.1**: Set up Vite project configuration
  - Install Vite as dev dependency (pinned version)
  - Create `vite.config.js` with library mode configuration
  - Configure ES module output (no IIFE/UMD needed — target app has Webpack)
  - Configure dev server with hot reload
  - Test: `npm run dev` starts dev server, components render with runtime template fetch
  - Test: `npm run build` produces optimized output in `dist/`

- [ ] **Task 12.2**: Write Vite plugin — template inlining
  - Custom Rollup plugin that transforms component files at build time
  - Detects `static templateUrl = new URL('./file.html', import.meta.url)`
  - Reads the referenced `.html` file
  - Replaces `templateUrl` with `static template = '...'` (inlined string)
  - Handles HTML minification (collapse whitespace, remove comments)
  - Test: built output contains no `templateUrl` references
  - Test: built output has template strings inlined in the component
  - Test: component behavior is identical between dev (fetch) and build (inline)

- [ ] **Task 12.3**: Write Vite plugin — styles inlining
  - Same pattern: detects `static stylesUrl = new URL('./file.css', import.meta.url)`
  - Reads the referenced `.css` file
  - Replaces with `static styles = '...'` (inlined string)
  - Handles CSS minification (via Vite's built-in CSS processing)
  - Optional: CSS nesting, custom properties resolution for older targets
  - Test: built output contains no `stylesUrl` references
  - Test: styles are correctly scoped in Shadow DOM after inlining

- [ ] **Task 12.4**: Configure tree-shaking and code splitting
  - Ensure each module (router, http, forms, etc.) is independently importable
  - Dead code elimination: unused modules don't end up in bundle
  - Optional code splitting: lazy-load routes as separate chunks
  - Configure `external` for when ng-modern is consumed by the host app's Webpack
  - Test: importing only `core/element.js` + `core/reactive.js` produces minimal bundle
  - Test: full framework bundle < 15KB gzipped
  - Test: individual module sizes documented

- [ ] **Task 12.5**: Configure library mode output
  - Output as ES modules (the host app's Webpack will consume them)
  - Preserve module boundaries for the host bundler's tree-shaking
  - Generate source maps for debugging in the host app
  - Produce a single entry point (`dist/ng-modern.js`) + individual module entries
  - Test: output is valid ES module syntax
  - Test: can be imported from another Webpack 5 project

- [ ] **Task 12.6**: Dev server configuration
  - Vite dev server serves native ES modules (no bundling in dev)
  - Hot Module Replacement (HMR) for component files
  - Custom HMR handling: re-register custom elements on change (or reload)
  - Proxy configuration for API calls (useful when testing with real backend)
  - Test: changing a `.html` template triggers reload
  - Test: changing a `.js` component triggers HMR or reload
  - Test: API proxy forwards requests to configured backend

- [ ] **Task 12.7**: Integration build — output for host AngularJS app
  - Build mode that outputs a chunk loadable by the host app's Webpack
  - The host app imports ng-modern components as a Webpack external or federated module
  - Document the integration pattern: how the AngularJS app loads ng-modern components
  - Test: ng-modern bundle loads alongside AngularJS without conflicts
  - Test: Custom Elements defined by ng-modern are usable in AngularJS templates

- [ ] **Task 12.8**: Write build documentation
  - Document: `npm run dev` — development with native ES modules + runtime fetch
  - Document: `npm run build` — production with inlined templates, tree-shaken
  - Document: `npm run build:lib` — library output for host app consumption
  - Document: how the template/style inlining plugin works
  - Document: how to add ng-modern components to an existing AngularJS + Webpack app
  - Bundle size report: before/after comparison

### Phase 12 Deliverable

A Vite-based build pipeline that:
1. Provides zero-config dev server (native ES modules, HMR)
2. Inlines templates/styles at build time via custom Rollup plugins
3. Tree-shakes and produces optimized ES module output
4. Outputs a library bundle consumable by the host AngularJS app's Webpack build
5. Maintains the "no build step required for development" principle

---

## Summary

| Phase     | Focus            | Estimated Time | AngularJS Equivalent                                                 |
| --------- | ---------------- | -------------- | -------------------------------------------------------------------- |
| 1         | Reactivity       | 2-3 hrs        | `$rootScope`, `$watch`, `$digest`                                    |
| 2         | DI Container     | 2 hrs          | `$injector`, `$provide`, modules                                     |
| 3         | Components       | 3-4 hrs        | Directives, `$compile`, transclusion                                 |
| 4         | Router           | 3-4 hrs        | `ngRoute`, ui-router (groups + transition hooks only)                |
| 5         | HTTP             | 1-2 hrs        | `$http`, `$resource`                                                 |
| 6         | Forms            | 3-4 hrs        | `NgModelController` (Field class: parsers, formatters, validators)   |
| 7         | Animations       | 1-2 hrs        | `ngAnimate`                                                          |
| 8         | Filters/Intl     | 1 hr           | Built-in filters                                                     |
| 9         | Security         | 1-2 hrs        | `$sce`, `$sanitize`                                                  |
| 10        | Testing Patterns | 1-2 hrs        | `ngMock`, `$httpBackend`                                             |
| 11        | Integration      | 3-4 hrs        | Full app + docs                                                      |
| 12        | Build (Vite)     | 3-4 hrs        | N/A (AngularJS had no build step originally)                         |
| **Total** |                  | **~26-36 hrs** |                                                                      |

---

## Acceptance Criteria (Overall Project)

- [ ] All 12 phases completed with working code
- [ ] Each module has tests proving correctness
- [ ] DI container enables full test isolation without module-patching tools
- [ ] Complete TodoMVC app runs in browser with no build step (dev mode)
- [ ] Complete TodoMVC app builds with Vite and runs from `dist/` (production mode)
- [ ] Bundle size < 15KB gzipped (full framework)
- [ ] Vite plugins inline templates/styles at build time
- [ ] Library output is consumable by a Webpack 5 host application
- [ ] Comparison guide covers all 12 feature areas from requirements
- [ ] "Lessons Learned" document captures insights about AngularJS design
- [ ] Zero runtime dependencies

---

## References

- [Requirements Document](./requirements.md)
- [Design Document](./design.md)
- [AngularJS Source Code](https://github.com/angular/angular.js)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)

---

## Document Metadata

**Created**: 2026-08-13
**Status**: Not Started
**Estimated Total Effort**: 26-36 hours
