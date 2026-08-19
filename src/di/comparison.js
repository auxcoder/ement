/**
 * Comparative Example: Dependency Injection
 * AngularJS ($inject) vs ement (Container) vs vi.mock()
 *
 * Run with: node src/di/comparison.js
 *
 * This demonstrates why interface-based DI is cleaner than module patching
 * for testing, and how our Container preserves AngularJS's testing ergonomics.
 *
 * @module di/comparison
 */

import { Container } from "./container.js";

console.log("═════════════════════════════════════════════════════════════");
console.log("  Comparative Example: Dependency Injection Approaches");
console.log("══════════════════════════════════════════════════════════════n");

// ─── 1. AngularJS Approach ───────────────────────────────────────────────────

console.log("─── 1. AngularJS ($inject / $provide) ────────────────────────n");
console.log(`
  // Registration (app module):
  angular.module('app')
    .service('HttpService', ['$http', function($http) {
      this.getUsers = () => $http.get('/api/users');
    }])
    .service('UserService', ['HttpService', function(HttpService) {
      this.list = () => HttpService.getUsers().then(r => r.data);
    }]);

  // Test (mock via $provide):
  beforeEach(module('app'));
  beforeEach(module(function($provide) {
    $provide.value('HttpService', {
      getUsers: () => $q.resolve({ data: [{ name: 'Alice' }] })
    });
  }));

  it('lists users', inject(function(UserService) {
    UserService.list().then(users => {
      expect(users[0].name).toBe('Alice');
    });
    $rootScope.$digest(); // manual flush!
  }));

  ✅ PROS:
  • Mock any service by name — clean, no path coupling
  • $provide.value() is explicit and readable

  ❌ CONS:
  • String-based injection — typos are runtime errors
  • $digest() required to flush promises
  • Module system is global — test pollution possible
  • Minification requires $inject annotation ceremony
`);

// ─── 2. vi.mock() / jest.mock() Approach ───────────────────────────────────────

console.log("─── 2. vi.mock() / jest.mock() ──────────────────────────────\n");
console.log(`
  // Production code:
  import { httpService } from '../services/http.js';

  export function listUsers() {
    return httpService.getUsers();
  }

  // Test (mock via module patching):
  vi.mock('../services/http.js', () => ({
    httpService: {
      getUsers: vi.fn().mockResolvedValue([{ name: 'Alice' }])
    }
  }));

  import { listUsers } from './user-service.js';

  it('lists users', async () => {
    const users = await listUsers();
    expect(users[0].name).toBe('Alice');
  });

  ❌ CONS:
  • Path-coupled — rename the file, all mocks break
  • Hoisting magic — vi.mock() is hoisted above imports (confusing)
  • Framework-specific — works in Vitest, different in Jest, nothing in Mocha
  • Fragile — mock must match the exact export shape
  • Can't easily mock differently per test without vi.doMock()
  • Factory runs once — shared state between tests (pollution)
`);

// ─── 3. ement Approach (Container) ───────────────────────────────────────

console.log("─── 3. ement (Interface-based Container) ────────────────\n");

const HttpToken = Symbol("Http");
const UserServiceToken = Symbol("UserService");

// Production setup
const appContainer = new Container();
appContainer.register(HttpToken, () => ({
  getUsers: async () => ({ data: [{ name: "Real User" }] }),
}));
appContainer.register(UserServiceToken, (c) => ({
  list: async () => {
    const http = c.resolve(HttpToken);
    const response = await http.getUsers();
    return response.data;
  },
}));

// Test setup — swap Http for a fake, UserService uses it transparently
const testContainer = new Container();
testContainer.register(HttpToken, () => ({
  getUsers: async () => ({ data: [{ name: "Alice" }, { name: "Bob" }] }),
}));
testContainer.register(UserServiceToken, (c) => ({
  list: async () => {
    const http = c.resolve(HttpToken);
    const response = await http.getUsers();
    return response.data;
  },
}));

// Demonstrate
async function demo() {
  // Production
  const prodService = appContainer.resolve(UserServiceToken);
  const prodUsers = await prodService.list();
  console.log(`  Production: ${JSON.stringify(prodUsers)}`);

  // Test
  const testService = testContainer.resolve(UserServiceToken);
  const testUsers = await testService.list();
  console.log(`  Test:       ${JSON.stringify(testUsers)}`);

  console.log(`
  // Production setup:
  const container = new Container();
  container.register(HttpToken, () => new Http({ baseUrl: '/api' }));
  container.register(UserServiceToken, (c) => ({
    list: async () => {
      const http = c.resolve(HttpToken);
      return (await http.getUsers()).data;
    }
  }));

  // Test setup (per-test isolation):
  const testContainer = new Container();
  testContainer.register(HttpToken, () => ({
    getUsers: async () => ({ data: [{ name: 'Alice' }] })
  }));
  testContainer.register(UserServiceToken, /* same factory */);

  it('lists users', async () => {
    const service = testContainer.resolve(UserServiceToken);
    const users = await service.list();
    expect(users[0].name).toBe('Alice');
  });

  ✅ PROS:
  • No path coupling — mock by token, not file path
  • No hoisting magic — container configured before test, explicitly
  • Framework-agnostic — works in Vitest, Jest, Mocha, browser, Node
  • Per-test isolation — each test creates its own container
  • Composable — child containers override only what's needed
  • Readable — test setup declares exactly what's being faked
  • Type-safe tokens — Symbol() prevents typos (vs AngularJS string names)

  ❌ CONS:
  • More ceremony than direct imports (register + resolve vs just import)
  • Must remember to register all dependencies
  • Slight indirection — "where is this service defined?" requires grep
`);
}

demo().then(() => {
  console.log("═════════════════════════════════════════════════════════════");
});
