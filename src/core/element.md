# ElElement — Reactivity Design

## How It Works

After the template renders, ElElement finds every property name used in `{{ }}` bindings and replaces that property on the instance with a getter/setter via `Object.defineProperty`.

```javascript
class MyComp extends ElElement {
  static template = "<h1>{{ name }}</h1>";
  name = "Alice";

  onInit() {
    this.name = "Bob"; // template updates automatically
  }
}
```

Setting `this.name` triggers a scheduled DOM update via microtask batching. No manual notification needed.

## Trade-offs

### 1. Only template-bound properties are reactive

If you have `this.count` but it's not in any `{{ count }}` binding, setting it won't trigger anything. It's silent — not an error, just not reactive.

### 2. Timing matters

The getter/setter installs in `connectedCallback` (after render). If you set a property _before_ the element connects to the DOM, it's just a plain assignment — no reactivity yet. The initial render uses whatever value was there at connection time.

### 3. Class field declaration order

When you write `name = 'Alice'` as a class field, it runs in the constructor. The getter/setter installs later (in `connectedCallback`). So the class field sets the initial value, and we capture it when installing the getter/setter. This works — but it's subtle.

### 4. No deep reactivity

```javascript
// This does NOT trigger an update:
this.user.name = "Bob";

// This DOES trigger an update:
this.user = { ...this.user, name: "Bob" };
```

The getter/setter only intercepts top-level property assignment, not nested mutations. This is the same trade-off React, Solid, and every non-Vue framework makes.

### 5. Properties not in templates need manual calls

If you use `this.show()`, `this.repeat()`, or other imperative helpers, those aren't template bindings — you call them explicitly when state changes.

## Why Not Other Approaches?

| Approach                                     | Pros                                                   | Cons                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **defineProperty per binding** (what we use) | Simple, no Proxy on `this`, works with Custom Elements | Only top-level, only bound props                                                                              |
| **Proxy wrapping `this`**                    | Deep reactivity, catches everything                    | Can't replace `this` in constructor, breaks `instanceof`, private fields (`#shadow`) don't work through Proxy |
| **Explicit `state` object with Proxy**       | Full reactivity on a separate object                   | Developer writes `this.state.name` not `this.name` — worse DX                                                 |
| **Signals (like Solid/Preact)**              | Fine-grained, composable                               | Different mental model, not property assignment                                                               |

### Why Proxy on `this` doesn't work for Custom Elements

```javascript
class ElElement extends HTMLElement {
  #shadow; // private field

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
    // Can't do: return new Proxy(this, handler);
    // Because:
    // 1. Private fields are bound to the original object, not the Proxy
    // 2. Returning from HTMLElement constructor is not allowed
    // 3. instanceof checks would break
  }
}
```

Private fields (`#shadow`, `#bindings`, `#state`) are stored on the _target_ object, not the Proxy. Accessing `proxy.#shadow` throws — JavaScript looks up private fields on the object identity, and the Proxy is a different identity.

## The Rule

> Reassign the property to trigger reactivity. Mutating nested objects in place is invisible.

This is well-understood — React's `setState`, Solid's `setSignal`, Svelte's reassignment rule — all follow this same principle. It enables simple, predictable change detection without the memory and performance overhead of deep observation.
