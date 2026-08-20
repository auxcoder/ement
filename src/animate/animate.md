# animate

Web Animations API helpers for enter/leave/stagger animations. Replaces AngularJS's `ngAnimate`.

**Module:** `animate/animate`  
**Exports:** `animateIn`, `animateOut`, `stagger`, `presets`

## API

### `animateIn(element, keyframes, options?)`

Run an enter animation on an element. Returns the `Animation` object.

| Param | Type | Description |
|---|---|---|
| `element` | `HTMLElement` | Element to animate |
| `keyframes` | `Keyframe[]` | Web Animations keyframes |
| `options` | `KeyframeAnimationOptions` | Overrides defaults: `{ duration: 300, easing: 'ease-in-out', fill: 'forwards' }` |

```javascript
import { animateIn, presets } from 'ement/animate/animate';

animateIn(card, presets.fadeIn);
animateIn(modal, presets.slideInDown, { duration: 200 });
```

### `animateOut(element, keyframes, options?)`

Run a leave animation, then **remove the element from the DOM** when it finishes.

```javascript
import { animateOut, presets } from 'ement/animate/animate';

animateOut(toast, presets.fadeOut);
// toast.remove() called automatically on animation end
```

### `stagger(elements, keyframes, options?)`

Animate a list of elements with a time offset between each. Returns an array of `Animation` objects.

| Param | Type | Description |
|---|---|---|
| `elements` | `HTMLElement[] \| NodeList` | Elements to animate |
| `keyframes` | `Keyframe[]` | Web Animations keyframes |
| `options.delay` | `number` | Ms between each element's start (default: `50`) |
| `options.*` | any | All other `KeyframeAnimationOptions` |

```javascript
import { stagger, presets } from 'ement/animate/animate';

const items = document.querySelectorAll('li');
stagger(items, presets.slideInLeft, { delay: 80, duration: 250 });
```

## Presets

| Name | Effect |
|---|---|
| `presets.fadeIn` | opacity 0 → 1 |
| `presets.fadeOut` | opacity 1 → 0 |
| `presets.slideInDown` | fade + translateY(-20px) → normal |
| `presets.slideOutUp` | normal → fade + translateY(-20px) |
| `presets.slideInLeft` | fade + translateX(-20px) → normal |
| `presets.scaleIn` | scale(0.9) + opacity 0 → normal |

All presets are plain `Keyframe[]` arrays — pass them directly to any of the three helpers.

## Custom keyframes

Presets are just a convenience. Any valid Web Animations keyframes work:

```javascript
animateIn(el, [
  { transform: 'rotate(-5deg) scale(0.95)', opacity: 0 },
  { transform: 'rotate(0deg) scale(1)', opacity: 1 },
], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
```

## AngularJS comparison

| AngularJS `ngAnimate` | Ement |
|---|---|
| CSS class-based (`.ng-enter`, `.ng-leave`) | Imperative JS calls to `animateIn` / `animateOut` |
| Hooks into digest cycle | Pure Web Animations API — no framework coupling |
| Automatic for `ng-if`, `ng-repeat` | Manual call in component lifecycle |
| Requires `ngAnimate` module | No module — import directly |
