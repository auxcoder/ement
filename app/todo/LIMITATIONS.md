# Limitations & Missing Pieces

What AngularJS does that ng-modern can't replicate natively, where the modern approach is worse for DX, and what would be needed for production use.

## What We Can't Replicate Natively

### Declarative Template Logic

AngularJS had `ng-if`, `ng-repeat`, `ng-switch`, `ng-show` directly in HTML. No native equivalent exists without a template engine.

ng-modern uses imperative methods (`this.show()`, `this.when()`, `this.repeat()`). This works but loses the "scan the template and understand the UI" readability that AngularJS templates had.

**What would fix it:** A template compiler (like Lit's `html` tagged template or Svelte's compiler). But that adds complexity and a build step — against our zero-dependency philosophy.

### Expression Evaluation in Templates

AngularJS: `{{ user.name | uppercase }}`, `ng-if="items.length > 0"`

ng-modern: `{{ userName }}` — only simple property names. No expressions, no filters in templates, no ternaries.

**Why:** Expression evaluation requires `eval()` or a custom parser. AngularJS used `$parse` (effectively `new Function()`), which is incompatible with CSP. We chose CSP-safety over template expressiveness.

### Two-Way Binding Ergonomics

`ng-model` was one attribute to wire a form input. Our `Field` class requires ~5-10 lines of setup per input.

**The trade-off is intentional** — explicit data flow is more debuggable, but more verbose. The pipeline power (parsers, formatters) offsets this, but simple forms feel heavier.

### Attribute Directives on Native Elements

AngularJS: `<input ng-model="x" ng-disabled="loading" my-custom-directive>`

ng-modern: Custom Elements can't be applied as attributes on native elements. You can't add behavior to a `<button>` without wrapping it in a custom element.

**What would fix it:** A directive system that uses `MutationObserver` to watch for attribute changes on native elements. Possible but adds complexity.

---

## Where Modern is Worse for DX

| Area           | AngularJS               | ng-modern                 | Gap                |
| -------------- | ----------------------- | ------------------------- | ------------------ |
| Form setup     | 1 attribute             | 5-10 lines                | Verbose            |
| Template logic | Declarative             | Imperative                | Readability        |
| Expressions    | Any JS expression       | Property names only       | Limited            |
| Global styles  | Just works              | Need `::part` or CSS vars | Friction           |
| Error messages | Comprehensive           | Minimal                   | Developer guidance |
| DevTools       | Batarang                | None                      | Debugging          |
| Ecosystem      | Huge (filters, plugins) | Just the core             | Everything DIY     |

---

## What's Needed for Production Use

### Must Have

1. **Error boundaries** — global error handler when components throw
2. **DevTools** — browser extension to inspect components, state, DI container
3. **SSR** — server-side rendering for SEO/performance (Custom Elements + Declarative Shadow DOM)
4. **Hot Module Replacement** — proper HMR for custom elements (re-registration problem)
5. **TypeScript** — type definitions for the full API
6. **Documentation site** — API reference, guides, tutorials

### Should Have

1. **Template compiler** — compile-time template logic (if/for/switch) into efficient DOM ops
2. **CLI scaffolding** — `ng-modern new component user-card`
3. **Testing utilities** — `renderComponent(UserCard, { props, container })` helper
4. **Migration tool** — codemods to convert AngularJS directives to NgElement

### Nice to Have

1. **State management** — global reactive store (like Redux but using Proxy)
2. **i18n** — message extraction and translation pipeline
3. **A11y linting** — accessibility checks at compile time
4. **Performance profiling** — track re-renders, binding updates
