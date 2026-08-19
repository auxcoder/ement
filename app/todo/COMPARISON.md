# AngularJS → ement Comparison Guide

If you wrote X in AngularJS, here's how in ement — and why the solution changed.

## Components

**AngularJS:**

```javascript
angular.module('app').directive('userCard', function() {
  return {
    restrict: 'E',
    scope: { name: '<', onSelect: '&' },
    templateUrl: 'user-card.html',
    link: function(scope, el) { ... }
  };
});
```

**ement:**

```javascript
class UserCard extends NgElement {
  static templateUrl = new URL('./user-card.html', import.meta.url);
  static observedAttributes = ['name'];
  onInit() { ... }
}
customElements.define('user-card', UserCard);
```

**Why:** Custom Elements are a web standard. No framework registration, works everywhere.

---

## Reactivity

**AngularJS:**

```javascript
$scope.count = 0;
$scope.$watch("count", function (newVal) {
  /* update DOM */
});
$scope.count = 5;
$scope.$apply(); // manual trigger!
```

**ement:**

```javascript
const state = reactive({ count: 0 }, (prop, value) => {
  /* update DOM */
});
state.count = 5; // callback fires automatically
```

**Why:** Proxy detects changes in O(1). No manual $apply, no digest cycle, no TTL limit.

---

## Dependency Injection

**AngularJS:**

```javascript
angular.module('app').service('UserService', ['$http', function($http) { ... }]);
// Test:
module(function($provide) { $provide.value('$http', mockHttp); });
```

**ement:**

```javascript
container.register(HttpToken, () => new Http());
// Test:
testContainer.register(HttpToken, () => fakeHttp);
```

**Why:** Symbol tokens (not strings), no minification issues, framework-agnostic.

---

## HTTP

**AngularJS:**

```javascript
$http.get("/api/users").then(function (response) {
  $scope.users = response.data; // .data wrapping
});
```

**ement:**

```javascript
const users = await http.get("/users"); // JSON directly, async/await
```

**Why:** fetch() is native, no .data wrapping, no $digest needed.

---

## Routing

**AngularJS (ui-router):**

```javascript
$stateProvider.state('admin.users', { url: '/users', component: 'adminUsers' });
$transitions.onBefore({ to: 'admin.**' }, transition => { ... });
```

**ement:**

```javascript
router.route("/admin/users", "admin-users", { group: "admin" });
router.onBefore(async (from, to) => {
  if (!auth.isLoggedIn()) return "/login";
});
```

**Why:** Flat routes + hooks = same power as ui-router guards, without state machine complexity.

---

## Forms

**AngularJS:**

```html
<input ng-model="user.email" required />
<!-- Two-way binding: implicit, cascading mutations possible -->
```

**ement:**

```javascript
const field = new Field(input, {
  parsers: [trim, lowercase],
  validators: [required, email],
  onChange: (value) => {
    this.email = value;
  }, // explicit
});
```

**Why:** Same parser/formatter/validator pipeline as NgModelController, but onChange is explicit — no cascading mutations, no "what changed this value?" mystery.

---

## Content Projection (Transclusion)

**AngularJS:**

```javascript
{ transclude: true, template: '<div><ng-transclude></ng-transclude></div>' }
```

**ement:**

```html
<div><slot></slot></div>
<!-- Named: <slot name="header"></slot> -->
```

**Why:** `<slot>` is native Shadow DOM. Zero framework code, no transclusion scope issues.

---

## Animations

**AngularJS:**

```css
.item.ng-enter {
  opacity: 0;
  transition: 0.3s;
}
.item.ng-enter-active {
  opacity: 1;
}
```

**ement:**

```javascript
animateIn(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
```

**Why:** Web Animations API gives programmatic control (pause, reverse, speed) with hardware acceleration.

---

## Filters / Formatting

**AngularJS:**

```html
{{ price | currency }}
<!-- requires angular-locale files -->
```

**ement:**

```javascript
formatCurrency(price, "EUR", "de-DE"); // Intl — all locales built-in
```

**Why:** Intl APIs use CLDR data built into every runtime. More correct, zero dependencies.

---

## Security

**AngularJS:**

```javascript
$sce.trustAsHtml(content); // "I trust this, skip security"
// Template expressions use eval() — incompatible with CSP
```

**ement:**

```javascript
sanitizeHTML(content); // Always sanitize, no escape hatch
// Templates use property lookup — fully CSP-compatible
```

**Why:** DOMParser-based sanitization, no eval(), no parser differential exploits.

---

## Testing

**AngularJS:**

```javascript
beforeEach(module('app'));
inject(function(UserService, $httpBackend) {
  $httpBackend.when('GET', '/users').respond([...]);
});
```

**ement:**

```javascript
const container = new Container();
container.register(HttpToken, () => ({ get: async () => [...] }));
const service = container.resolve(UserServiceToken);
```

**Why:** No framework-specific test API. Just create a container, register fakes, resolve. Works in any test runner.
