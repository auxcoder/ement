# RouteOutlet

Custom element that serves as the mounting point for routed components.

**Module:** `router/route-outlet`
**Exports:** `RouteOutlet`
**Tag:** `<route-outlet>`

## Overview

`<route-outlet>` is the container where `ElRouter` mounts and unmounts components during navigation. It manages the lifecycle of the currently active component: clearing the previous one before mounting the next.

You typically don't call its methods directly — `ElRouter` does. Declare it in your HTML and pass it to the router constructor.

## Usage

```html
<route-outlet></route-outlet>
```

```javascript
import { ElRouter } from "ement/router/router";

const outlet = document.querySelector("route-outlet");
const router = new ElRouter(outlet);
```

## API

### `outlet.currentComponent`

Read-only. The currently mounted `HTMLElement`, or `null` if the outlet is empty.

### `outlet.mount(element)`

Mount a component element. Clears the current component first, then appends the new element.

```javascript
// Called internally by ElRouter — you rarely need this directly
outlet.mount(document.createElement("my-component"));
```

### `outlet.clear()`

Remove the current component and empty the outlet.

## Notes

- The element auto-registers as `'route-outlet'` in browser environments.
- In Node.js test environments (no `customElements`), registration is skipped — safe to import without a DOM.
- Using `ElRouter` with a regular `<div>` instead of `<route-outlet>` works — the router calls `innerHTML = ''` and `appendChild` directly. `<route-outlet>` adds the `mount()` and `clear()` convenience API and the `currentComponent` property.
