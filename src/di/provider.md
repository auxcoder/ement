# DI Provider

DOM-based container distribution. Attaches an `ElContainer` to a DOM subtree so descendant components can resolve services without importing them directly.

**Module:** `di/provider`
**Exports:** `provideContainer`, `resolveContainer`, `ElProvider`

## API

### `provideContainer(element, container)`

Attach a container to a DOM element. Any descendant can then call `resolveContainer` to reach it.

| Param       | Type          | Description                     |
| ----------- | ------------- | ------------------------------- |
| `element`   | `HTMLElement` | The root element of the subtree |
| `container` | `ElContainer` | The container to attach         |

```javascript
import { ElContainer } from "ement/di/container";
import { provideContainer } from "ement/di/provider";

const container = new ElContainer();
container.register(HttpToken, () => new ElHttp({ baseUrl: "/api" }));
provideContainer(document.getElementById("app"), container);
```

### `resolveContainer(element)`

Walk up the DOM (including across Shadow DOM boundaries) to find the nearest container. Throws if none is found.

| Param     | Type          | Description                                            |
| --------- | ------------- | ------------------------------------------------------ |
| `element` | `HTMLElement` | Starting element (typically `this` inside a component) |

Returns the nearest `ElContainer`.

```javascript
// Inside an ElElement:
connectedCallback() {
  const container = resolveContainer(this);
  this.http = container.resolve(HttpToken);
}
```

### `ElProvider` custom element

The `<el-provider>` element creates its own `ElContainer` when connected to the DOM. Register services through its `.container` property.

```html
<el-provider id="root"></el-provider>
```

```javascript
const provider = document.querySelector("#root");
provider.container.register(HttpToken, () => new ElHttp());
```

You can also assign a pre-built container (e.g. one with a parent):

```javascript
const parent = existingContainer;
const child = parent.createChild();
child.register(AuthToken, () => mockAuth);
provider.container = child;
```

## Shadow DOM traversal

`resolveContainer` walks `parentElement` in the regular DOM, and `getRootNode().host` to cross Shadow DOM boundaries. This means components inside shadow roots can still reach a container attached to a light DOM ancestor.

## AngularJS comparison

| AngularJS                                                     | Ement                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `$scope` hierarchy — implicit inheritance via prototype chain | `provideContainer` — explicit attachment to a DOM element |
| Service injection via `$injector` global                      | `resolveContainer(this)` — walks DOM tree                 |
| No sub-tree isolation                                         | Child containers can shadow parent tokens per sub-tree    |
