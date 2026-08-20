# interceptLinks

SPA link interception. Captures same-origin `<a>` clicks and routes them through `ElRouter` instead of triggering a full page reload.

**Module:** `router/links`
**Exports:** `interceptLinks`

## API

### `interceptLinks(router, root?)`

Install click delegation on a root element.

| Param    | Type          | Description                                             |
| -------- | ------------- | ------------------------------------------------------- |
| `router` | `ElRouter`    | The router instance to navigate through                 |
| `root`   | `EventTarget` | Root to attach the listener to. Defaults to `document`. |

Returns a `cleanup` function — call it to remove the listener.

```javascript
import { interceptLinks } from "ement/router/links";

const cleanup = interceptLinks(router);

// Later, if you need to tear down (e.g., micro-frontend unmount):
cleanup();
```

## What it intercepts

A click on an `<a href="...">` is intercepted if **all** of the following are true:

- Left mouse button, no modifier keys (`Ctrl`, `Meta`, `Shift`, `Alt`)
- No `target` attribute (e.g. `target="_blank"` is ignored)
- No `data-external` attribute (explicit opt-out)
- `href` is not `mailto:`, `tel:`, or a bare hash (`#`)
- Same origin as the current page

For anything that doesn't match, the browser handles the navigation normally.

## Opting out

Add `data-external` to links that should navigate the full page:

```html
<a href="/docs/download.pdf" data-external>Download PDF</a>
<a href="https://github.com/org/repo" data-external>GitHub</a>
```

## Example with bootstrap

`bootstrap()` calls `interceptLinks` automatically when `config.routes` is provided. Manual use is only needed when you create a router without `bootstrap`:

```javascript
const router = new ElRouter(outlet);
// ... configure routes ...
router.start();
interceptLinks(router, document.getElementById("app"));
```
