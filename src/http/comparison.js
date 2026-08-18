/**
 * Comparative Example: AngularJS $http vs ng-modern Http
 *
 * Run with: node src/http/comparison.js
 *
 * @module http/comparison
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Comparative Example: $http vs ng-modern Http');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─── 1. AngularJS $http ────────────────────────────────────────────────────────

console.log('─── 1. AngularJS $http ─────────────────────────────────────────\n');
console.log(`
  // Configuration
  angular.module('app').config(function($httpProvider) {
    $httpProvider.defaults.headers.common['X-App'] = 'my-app';
    $httpProvider.interceptors.push('authInterceptor');
  });

  // Interceptor (service)
  angular.module('app').factory('authInterceptor', function(AuthService) {
    return {
      request: function(config) {
        config.headers.Authorization = 'Bearer ' + AuthService.getToken();
        return config;
      },
      responseError: function(rejection) {
        if (rejection.status === 401) {
          AuthService.logout();
        }
        return $q.reject(rejection);
      }
    };
  });

  // Usage in controller
  $http.get('/api/users').then(function(response) {
    $scope.users = response.data;  // response wraps data in .data
  }).catch(function(err) {
    $scope.error = err.statusText;
  });
  $rootScope.$digest();  // may need manual trigger!

  ❌ PAIN POINTS:
  • response.data wrapping (fetch returns the response directly)
  • Need $digest after external async (setTimeout, WebSocket, etc.)
  • Interceptors are named services — string-based DI coupling
  • No built-in cancellation (need $q.defer + timeout config)
  • No built-in retry
  • JSONP support adds complexity nobody uses anymore
`);

// ─── 2. ng-modern Http ─────────────────────────────────────────────────────────

console.log('─── 2. ng-modern Http (fetch wrapper) ─────────────────────────\n');
console.log(`
  // Configuration
  import { Http } from 'ng-modern/http/http';

  const http = new Http({
    baseUrl: '/api',
    headers: { 'X-App': 'my-app' },
    timeout: 10000,     // 10s default timeout
    retries: 2,         // retry server errors twice
    retryDelay: 1000,   // exponential backoff from 1s
    interceptors: [{
      request: async (config) => {
        config.headers['Authorization'] = 'Bearer ' + auth.getToken();
        return config;
      },
      responseError: async (error) => {
        if (error.status === 401) auth.logout();
      }
    }]
  });

  // Usage — clean async/await, no .data wrapping
  try {
    const users = await http.get('/users');  // returns parsed JSON directly
    this.users = users;
  } catch (err) {
    this.error = err.message;
  }
  // No $digest needed — Proxy reactivity handles it!

  // Cancellation
  const controller = new AbortController();
  http.get('/slow', { signal: controller.signal });
  controller.abort();  // cancel the request

  // Cancel all on component disconnect
  onDestroy() {
    this.http.cancelAll();
  }

  ✅ IMPROVEMENTS OVER $http:
  • No .data wrapping — get() returns parsed JSON directly
  • No $digest needed — Proxy handles reactivity
  • Built-in timeout (AbortController-based)
  • Built-in retry with exponential backoff
  • Per-request cancellation via AbortSignal
  • cancelAll() for component lifecycle cleanup
  • Interceptors are plain objects (no DI string coupling)
  • async/await (no .then() chains, no $q)
`);

// ─── Summary ───────────────────────────────────────────────────────────────────

console.log('─── Summary ────────────────────────────────────────────────────\n');
console.log(`
  ┌──────────────────────┬──────────────────────┬──────────────────────┐
  │ Feature              │ $http                │ ng-modern Http       │
  ├──────────────────────┼──────────────────────┼──────────────────────┤
  │ Base API             │ XMLHttpRequest       │ fetch()              │
  │ Response format      │ { data, status, ... }│ Parsed JSON directly │
  │ Async model          │ $q promises          │ native async/await   │
  │ Digest integration   │ Required ($apply)    │ Not needed (Proxy)   │
  │ Interceptors         │ Named services (DI)  │ Plain objects        │
  │ Cancellation         │ $q.defer + timeout   │ AbortController      │
  │ Timeout              │ Config option        │ Built-in + per-request│
  │ Retry                │ ❌ Manual             │ ✅ Built-in + backoff │
  │ cancelAll()          │ ❌                    │ ✅                    │
  │ Streaming            │ ❌                    │ ✅ (fetch supports it)│
  └──────────────────────┴──────────────────────┴──────────────────────┘
`);

console.log('═══════════════════════════════════════════════════════════════');
