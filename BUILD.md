# Build & Development Guide

## Commands

```bash
npm run dev       # Vite dev server on :3000 (native ES modules, no bundling)
npm run build     # Production build → dist/ (minified, tree-shaken, source maps)
npm run preview   # Preview the production build locally
npm run test      # Run all tests (node --test)
```

## Development Mode

`npm run dev` starts Vite's dev server which serves native ES modules directly — no bundling in development. Templates are fetched at runtime via `import.meta.url` and cached per component class.

Changes to `.js`, `.html`, or `.css` files trigger hot reload.

API proxy is configured for `/api` → `http://localhost:8080` (adjust in `vite.config.js`).

## Production Build

`npm run build` produces optimized output in `dist/`:

- Templates and styles are **inlined** at build time (zero runtime fetch)
- Code is **tree-shaken** (unused modules excluded)
- Each module is a **separate chunk** (host apps import only what they need)
- **Source maps** included for debugging
- Target: **ES2020** (Custom Elements + Proxy + ESM)

### Build Output Structure

```
dist/
├── ement.js          # Main entry (re-exports all)
├── core/
│   ├── element.js        # NgElement base class
│   ├── reactive.js       # Proxy reactivity
│   └── scheduler.js      # Microtask batching
├── di/
│   ├── container.js      # DI container
│   └── tokens.js         # Service tokens
├── router/
│   └── router.js         # SPA router
├── http/
│   └── http.js           # HTTP client
├── forms/
│   ├── field.js          # Field (NgModelController reimagined)
│   ├── form-group.js     # Form aggregation
│   ├── parsers.js        # Common parsers
│   ├── formatters.js     # Common formatters
│   └── validators.js     # Common validators
├── animate/
│   └── animate.js        # Animation helpers
├── security/
│   └── sanitize.js       # HTML sanitization
└── filters/
    └── intl.js           # Intl formatting
```

### Bundle Size

| Metric                     | Size             |
| -------------------------- | ---------------- |
| Raw minified (all modules) | ~30KB            |
| Gzipped (all modules)      | ~13KB            |
| Budget                     | < 15KB gzipped   |
| Status                     | ✅ Within budget |

## Template Inlining Plugin

The custom Rollup plugin (`vite-plugins/inline-templates.js`) transforms component files at build time:

**Before (source):**

```javascript
class UserCard extends NgElement {
  static templateUrl = new URL("./user-card.html", import.meta.url);
  static stylesUrl = new URL("./user-card.css", import.meta.url);
}
```

**After (built):**

```javascript
class UserCard extends NgElement {
  static template = '<div class="card"><slot></slot></div>';
  static styles = ":host { display: block; }";
}
```

In development, templates are fetched at runtime (no plugin transformation). The component code is identical — one path, two behaviors.

## Integrating with an Existing AngularJS + Webpack App

### 1. Install ement as a local dependency

```bash
# In your AngularJS app directory:
npm install ../path/to/ng-elements/dist
# OR link for development:
npm link ../path/to/ng-elements
```

### 2. Import components

```javascript
// In your AngularJS app code:
import "ement/dist/core/element.js";
import "ement/dist/forms/field.js";
// Custom elements are now registered and available
```

### 3. Use in AngularJS templates

```html
<!-- AngularJS template: Custom Elements just work -->
<user-card user-name="{{ $ctrl.user.name }}"></user-card>
```

### 4. Communication between AngularJS and ement

**AngularJS → ement:** HTML attributes (AngularJS interpolation → `observedAttributes`)

**ement → AngularJS:** CustomEvents

```javascript
// AngularJS directive to bridge events:
angular.module("app").directive("ngModernBridge", function () {
  return {
    link: function (scope, element, attrs) {
      element[0].addEventListener("user-select", function (e) {
        scope.$apply(function () {
          scope.$eval(attrs.onUserSelect, { $event: e.detail });
        });
      });
    },
  };
});
```

## Testing

```bash
npm test                          # All tests
node --test src/core/*.test.js    # Core module tests only
node --test src/forms/*.test.js   # Forms tests only
```

Tests use Node's built-in test runner (`node:test`) — no additional test framework needed.
