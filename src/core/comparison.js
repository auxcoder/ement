/**
 * Comparative Example: AngularJS Directives vs NgElement
 *
 * Run with: node src/core/comparison.js
 *
 * Shows the same component implemented both ways, highlighting
 * what's simpler, what's harder, and what's the same.
 *
 * @module core/comparison
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Comparative Example: AngularJS Directive vs NgElement');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─── The Component: A User Card ────────────────────────────────────────────────

console.log('─── Component: User Card ───────────────────────────────────────\n');
console.log('  A card that displays a user name, shows a "verified" badge');
console.log('  conditionally, renders a list of roles, and emits an event');
console.log('  when clicked.\n');

// ─── AngularJS Version ─────────────────────────────────────────────────────────

console.log('─── AngularJS Directive ─────────────────────────────────────────\n');
console.log(`
  // user-card.directive.js
  angular.module('app').directive('userCard', function() {
    return {
      restrict: 'E',
      scope: {
        userName: '<',       // one-way binding (input)
        isVerified: '<',     // one-way binding (input)
        roles: '<',          // one-way binding (input)
        onSelect: '&',       // expression binding (output)
      },
      templateUrl: 'components/user-card/user-card.html',
      link: function(scope, element) {
        scope.handleClick = function() {
          scope.onSelect({ user: scope.userName });
        };
      }
    };
  });

  // user-card.html
  <div class="user-card" ng-click="handleClick()">
    <h3>{{ userName }}</h3>
    <span ng-if="isVerified" class="badge">✓ Verified</span>
    <ul>
      <li ng-repeat="role in roles track by $index">{{ role }}</li>
    </ul>
    <ng-transclude></ng-transclude>
  </div>

  // Usage:
  <user-card
    user-name="$ctrl.user.name"
    is-verified="$ctrl.user.verified"
    roles="$ctrl.user.roles"
    on-select="$ctrl.selectUser(user)">
    <p>Extra content here</p>
  </user-card>
`);

// ─── ng-modern Version ─────────────────────────────────────────────────────────

console.log('─── ng-modern NgElement ────────────────────────────────────────\n');
console.log(`
  // user-card/user-card.js
  import { NgElement } from 'ng-modern';

  class UserCard extends NgElement {
    static templateUrl = new URL('./user-card.html', import.meta.url);
    static stylesUrl = new URL('./user-card.css', import.meta.url);
    static observedAttributes = ['user-name', 'is-verified'];
    static propTypes = { isVerified: Boolean };

    roles = [];

    onInit() {
      this.shadowRoot.querySelector('.user-card')
        .addEventListener('click', () => {
          this.emit('user-select', { user: this.userName });
        });
      this.renderRoles();
    }

    renderRoles() {
      this.repeat('.role-list', this.roles, (role) => {
        const li = document.createElement('li');
        li.textContent = role;
        return li;
      });
      this.show('.badge', this.isVerified);
    }
  }

  customElements.define('user-card', UserCard);

  // user-card.html
  <div class="user-card">
    <h3>{{ userName }}</h3>
    <span class="badge">✓ Verified</span>
    <ul class="role-list"></ul>
    <slot></slot>
  </div>

  // Usage:
  <user-card
    user-name="Alice"
    is-verified
    .roles="\${JSON.stringify(['admin', 'editor'])}">
    <p>Extra content here</p>
  </user-card>

  // Parent listens:
  document.querySelector('user-card')
    .addEventListener('user-select', (e) => {
      console.log('Selected:', e.detail.user);
    });
`);

// ─── Analysis ──────────────────────────────────────────────────────────────────

console.log('─── Analysis ─────────────────────────────────────────────────────\n');
console.log(`
  ┌─────────────────────────┬────────────────────────────┬──────────────────────────────┐
  │ Aspect                  │ AngularJS                  │ ng-modern                    │
  ├─────────────────────────┼────────────────────────────┼──────────────────────────────┤
  │ Template file           │ ✅ Separate .html           │ ✅ Separate .html              │
  │ Style encapsulation     │ ❌ Global CSS (leak)        │ ✅ Shadow DOM (isolated)       │
  │ Input (props)           │ scope: { name: '<' }       │ observedAttributes + propTypes│
  │ Output (events)         │ scope: { onX: '&' }        │ this.emit() + addEventListener│
  │ Content projection      │ ng-transclude              │ <slot> (native)              │
  │ Conditional             │ ng-if (declarative)        │ this.show() / this.when()    │
  │ List rendering          │ ng-repeat (declarative)    │ this.repeat() (imperative)   │
  │ Data binding            │ {{ expr }} (auto)          │ {{ prop }} + _notifyChange   │
  │ Registration            │ angular.module().directive │ customElements.define()      │
  │ Interoperability        │ AngularJS only             │ Any framework / vanilla      │
  └─────────────────────────┴────────────────────────────┴──────────────────────────────┘

  WHAT'S SIMPLER in ng-modern:
  • Style encapsulation — free with Shadow DOM, no BEM/naming conventions
  • Content projection — native <slot>, no transclusion scope complexity
  • Events — standard CustomEvent, no '&' binding magic
  • No $digest — changes propagate without manual triggers
  • Interop — works with React, Vue, vanilla, anything that speaks DOM

  WHAT'S HARDER in ng-modern:
  • Conditional/list rendering is imperative (method calls vs template directives)
  • No template-level expressions (ng-if="x > 5" has no equivalent)
  • More manual wiring (addEventListener vs declarative ng-click)
  • Must call _notifyChange or use reactive() to trigger binding updates

  WHAT'S THE SAME:
  • Separate template files (HTML tooling works for both)
  • Component encapsulation philosophy (isolated scope ↔ Shadow DOM)
  • Lifecycle hooks (link/controller ↔ onInit/onDestroy)
  • Props in, events out (unidirectional when using '<' bindings)
`);

console.log('═══════════════════════════════════════════════════════════════');
