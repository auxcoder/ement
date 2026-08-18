/**
 * Integration Testing Patterns — Phase 10
 * Demonstrates how DI enables scalable unit testing without module-patching tools.
 *
 * Run with: node --test src/testing/patterns.test.js
 *
 * @module testing/patterns
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Container } from '../di/container.js';

// ─── Service Tokens ────────────────────────────────────────────────────────────

const HttpToken = Symbol('Http');
const AuthToken = Symbol('Auth');
const StorageToken = Symbol('Storage');
const UserServiceToken = Symbol('UserService');

// ─── Task 10.1: Test a component with mocked dependencies ─────────────────────

describe('Task 10.1: Component with mocked dependencies', () => {
  it('component uses fake Http from test container', async () => {
    // Production service (would make real API calls)
    const realHttp = {
      get: async (url) => { throw new Error('Should not call real HTTP!'); },
    };

    // Test fake — returns predictable data
    const fakeHttp = {
      get: async (url) => {
        if (url === '/users') return [{ name: 'Alice' }, { name: 'Bob' }];
        return [];
      },
    };

    // Test container with fake
    const testContainer = new Container();
    testContainer.register(HttpToken, () => fakeHttp);

    // Simulate component behavior (resolves from container)
    const http = testContainer.resolve(HttpToken);
    const users = await http.get('/users');

    assert.equal(users.length, 2);
    assert.equal(users[0].name, 'Alice');
  });

  it('component uses fake Storage (in-memory)', () => {
    // Fake storage using Map (instead of localStorage)
    const fakeStorage = new Map();

    const testContainer = new Container();
    testContainer.register(StorageToken, () => ({
      getItem: (key) => fakeStorage.get(key) ?? null,
      setItem: (key, val) => fakeStorage.set(key, val),
      removeItem: (key) => fakeStorage.delete(key),
    }));

    // Component behavior
    const storage = testContainer.resolve(StorageToken);
    storage.setItem('theme', 'dark');
    assert.equal(storage.getItem('theme'), 'dark');
    assert.equal(storage.getItem('missing'), null);
  });
});

// ─── Task 10.2: Test service composition ───────────────────────────────────────

describe('Task 10.2: Service composition with child container', () => {
  it('mock only the dependency under test', async () => {
    // UserService depends on Http
    const userServiceFactory = (container) => ({
      list: async () => {
        const http = container.resolve(HttpToken);
        return http.get('/users');
      },
      getById: async (id) => {
        const http = container.resolve(HttpToken);
        return http.get(`/users/${id}`);
      },
    });

    // App container with real registration pattern
    const appContainer = new Container();
    appContainer.register(HttpToken, () => ({
      get: async () => { throw new Error('real http'); },
    }));
    appContainer.register(UserServiceToken, userServiceFactory);

    // Test: override only Http, UserService uses it transparently
    const testContainer = appContainer.createChild();
    testContainer.register(HttpToken, () => ({
      get: async (url) => {
        if (url === '/users') return [{ id: 1, name: 'Test User' }];
        if (url === '/users/1') return { id: 1, name: 'Test User', email: 'test@test.com' };
        return null;
      },
    }));
    // Re-register UserService in child so it resolves Http from child
    testContainer.register(UserServiceToken, userServiceFactory);

    const userService = testContainer.resolve(UserServiceToken);

    const users = await userService.list();
    assert.equal(users[0].name, 'Test User');

    const user = await userService.getById(1);
    assert.equal(user.email, 'test@test.com');
  });
});

// ─── Task 10.3: Test router guards with DI ─────────────────────────────────────

describe('Task 10.3: Router guards with DI', () => {
  it('guard rejects when auth mock returns not logged in', async () => {
    const testContainer = new Container();
    testContainer.register(AuthToken, () => ({
      isLoggedIn: () => false,
      hasRole: () => false,
    }));

    // Simulate the guard function (same code as production)
    const authGuard = async (from, to) => {
      const auth = testContainer.resolve(AuthToken);
      if (to.path.startsWith('/admin') && !auth.isLoggedIn()) {
        return '/login'; // redirect
      }
    };

    const result = await authGuard(null, { path: '/admin/users' });
    assert.equal(result, '/login');
  });

  it('guard allows when auth mock returns logged in', async () => {
    const testContainer = new Container();
    testContainer.register(AuthToken, () => ({
      isLoggedIn: () => true,
      hasRole: (role) => role === 'admin',
    }));

    const authGuard = async (from, to) => {
      const auth = testContainer.resolve(AuthToken);
      if (to.path.startsWith('/admin') && !auth.isLoggedIn()) {
        return '/login';
      }
      // undefined = continue
    };

    const result = await authGuard(null, { path: '/admin/users' });
    assert.equal(result, undefined); // allowed
  });

  it('role-based guard rejects insufficient permissions', async () => {
    const testContainer = new Container();
    testContainer.register(AuthToken, () => ({
      isLoggedIn: () => true,
      hasRole: (role) => role === 'viewer', // not admin
    }));

    const roleGuard = async (from, to) => {
      const auth = testContainer.resolve(AuthToken);
      if (to.path.startsWith('/admin') && !auth.hasRole('admin')) {
        return '/forbidden';
      }
    };

    const result = await roleGuard(null, { path: '/admin/settings' });
    assert.equal(result, '/forbidden');
  });
});

// ─── Task 10.4: Comparative testing example ────────────────────────────────────

describe('Task 10.4: Why DI is cleaner than vi.mock()', () => {
  it('demonstrates per-test isolation without hoisting magic', async () => {
    // Test A: Http returns users
    const containerA = new Container();
    containerA.register(HttpToken, () => ({
      get: async () => [{ name: 'From Test A' }],
    }));

    // Test B: Http returns empty (different test, different container)
    const containerB = new Container();
    containerB.register(HttpToken, () => ({
      get: async () => [],
    }));

    // Both tests run independently — no shared state, no ordering issues
    const httpA = containerA.resolve(HttpToken);
    const httpB = containerB.resolve(HttpToken);

    const resultA = await httpA.get('/users');
    const resultB = await httpB.get('/users');

    assert.equal(resultA.length, 1);
    assert.equal(resultB.length, 0);

    // With vi.mock() this would require:
    // - vi.doMock() with factory (complex)
    // - OR vi.clearAllMocks() between tests (shared state)
    // - OR separate describe blocks with different mock setups (verbose)
    //
    // With DI: just create a new container. Done.
  });

  it('no path coupling — rename files without breaking tests', () => {
    // vi.mock('../services/http.js') → breaks if file moves
    // container.register(HttpToken, ...) → token is a Symbol, never breaks

    const token = Symbol('MyService');
    const container = new Container();
    container.register(token, () => ({ works: true }));

    // Token doesn't care where the implementation lives
    assert.equal(container.resolve(token).works, true);
  });
});
