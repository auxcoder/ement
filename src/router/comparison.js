/**
 * Comparative Example: ngRoute vs ui-router vs ng-modern Router
 *
 * Run with: node src/router/comparison.js
 *
 * Same app: protected admin section with auth guard and shared permissions.
 *
 * @module router/comparison
 */

console.log("═════════════════════════════════════════════════════════════");
console.log("  Comparative Example: Router Approaches");
console.log("  Scenario: Admin section with auth guard + shared permissions");
console.log("═════════════════════════════════════════════════════════════\n");

// ─── 1. ngRoute ──────────────────────────────────────────────────────────────

console.log("─── 1. ngRoute ───────────────────────────────────────────────\n");
console.log(`
  $routeProvider
    .when('/', { template: '<home>', controller: 'HomeCtrl' })
    .when('/login', { template: '<login>', controller: 'LoginCtrl' })
    .when('/admin/users', { template: '<admin-users>', controller: 'AdminUsersCtrl' })
    .when('/admin/reports', { template: '<admin-reports>', controller: 'AdminReportsCtrl' })
    .otherwise({ redirectTo: '/' });

  // Auth guard — hacky, uses $routeChangeStart event
  $rootScope.$on('$routeChangeStart', function(event, next) {
    if (next.$$route?.originalPath?.startsWith('/admin') && !AuthService.isLoggedIn()) {
      event.preventDefault();
      $location.path('/login');
    }
  });

  // Shared permissions — each controller loads independently (duplicate)
  function AdminUsersCtrl($scope, PermissionService) {
    PermissionService.load().then(perms => { $scope.perms = perms; });
  }
  function AdminReportsCtrl($scope, PermissionService) {
    PermissionService.load().then(perms => { $scope.perms = perms; });
  }

  ❌ PROBLEMS:
  • No built-in guards — must use $routeChangeStart hack
  • No shared resolve — each controller fetches permissions independently
  • event.preventDefault() doesn't actually work in all versions
  • No redirect mechanism in route config
  • Flat routes only — no grouping concept
`);

// ─── 2. ui-router ────────────────────────────────────────────────────────────

console.log("─── 2. ui-router ─────────────────────────────────────────────\n");
console.log(`
  $stateProvider
    .state('home', { url: '/', component: 'home' })
    .state('login', { url: '/login', component: 'login' })
    .state('admin', {
      abstract: true,
      url: '/admin',
      resolve: {
        permissions: (PermissionService) => PermissionService.load()
      }
    })
    .state('admin.users', {
      url: '/users',
      component: 'adminUsers'  // inherits permissions from parent
    })
    .state('admin.reports', {
      url: '/reports',
      component: 'adminReports'  // inherits permissions from parent
    });

  // Auth guard — transition hook
  $transitions.onBefore({ to: 'admin.**' }, function(transition) {
    if (!AuthService.isLoggedIn()) {
      return transition.router.stateService.target('login');
    }
  });

  ✅ STRENGTHS:
  • Built-in transition hooks (onBefore, onSuccess, onError)
  • Resolve inheritance (parent → child)
  • Abstract states for shared config
  • Navigate by state name ($state.go)

  ❌ COMPLEXITY WE DON'T NEED:
  • Full state machine (states, transitions, lifecycle objects)
  • Multiple named views (ui-view="sidebar")
  • Deep nesting (admin.users.detail.edit)
  • $state.go() by name (URL is simpler and debuggable)
  • Resolve inheritance hides data origin
`);

// ─── 3. ng-modern ────────────────────────────────────────────────────────────

console.log(
  "─── 3. ng-modern Router ───────────────────────────────────────\n",
);
console.log(`
  import { Router } from 'ng-modern/router/router';

  const router = new Router(document.querySelector('route-outlet'));

  // Group: shared permissions for admin section (resolve once, cache)
  router.group('admin', {
    resolve: async () => ({ permissions: await permissionService.load() })
  });

  // Routes
  router
    .route('/', 'app-home')
    .route('/login', 'app-login')
    .route('/admin/users', 'admin-users', { group: 'admin' })
    .route('/admin/reports', 'admin-reports', { group: 'admin' });

  // Auth guard — transition hook
  router.onBefore(async (from, to) => {
    if (to.path.startsWith('/admin') && !authService.isLoggedIn()) {
      return '/login';  // redirect
    }
  });

  // On logout, invalidate cached permissions
  authService.onLogout(() => router.invalidateGroup('admin'));

  ✅ WHAT WE KEPT FROM UI-ROUTER:
  • Transition hooks (onBefore/onSuccess/onError) — the real value
  • Shared resolve via route groups — one level, explicit, cached
  • Async guards for auth/roles/permissions

  ❌ WHAT WE DROPPED (AND WHY):
  • State machine → flat routes (simplicity, URL is the truth)
  • Named views → single outlet (component composition handles layouts)
  • $state.go('name') → router.navigate('/path') (URL is debuggable)
  • Resolve inheritance → explicit group data (no hidden parent data)

  ✅ WHAT WE ADDED OVER BOTH:
  • invalidateGroup() — cache control (logout clears shared data)
  • return '/path' from onBefore — redirect is just a string, not an API
  • Native URLPattern — powerful matching without custom parser
`);

console.log("─── Summary Table ────────────────────────────────────────────\n");
console.log(`
  ┌──────────────────────┬────────────┬───────────┬────────────┐
  │ Feature              │ ngRoute    │ ui-router │ ng-modern  │
  ├──────────────────────┼────────────┼───────────┼────────────┤
  │ Auth guards          │ ❌ hack     │ ✅ hooks   │ ✅ hooks    │
  │ Shared resolve       │ ❌ manual   │ ✅ inherit │ ✅ groups   │
  │ Cache control        │ ❌          │ ❌         │ ✅ invalidate│
  │ Redirect             │ ❌ $location│ ✅ target  │ ✅ string   │
  │ URL-based            │ ✅          │ ⚠️ optional│ ✅          │
  │ Complexity           │ Low        │ High      │ Medium     │
  │ Learning curve       │ Low        │ High      │ Low        │
  │ Lines of config      │ ~15        │ ~30       │ ~15        │
  └──────────────────────┴────────────┴───────────┴────────────┘
`);

console.log("═════════════════════════════════════════════════════════════");
