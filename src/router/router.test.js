/**
 * Tests for router/router.js
 * Run with: node --test src/router/router.test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── Shims ─────────────────────────────────────────────────────────────────────

globalThis.CustomEvent = class CustomEvent {
  constructor(type, opts = {}) {
    this.type = type;
    this.detail = opts.detail ?? null;
  }
};

globalThis.URLPattern = (await import('node:url')).URLPattern
  ?? class URLPattern {
    #pattern;
    constructor({ pathname }) { this.#pattern = pathname; }
    exec(url) {
      const regex = this.#pattern
        .replace(/:(\w+)/g, '(?<$1>[^/]+)')
        .replace(/\*/g, '.*');
      const match = new URL(url, 'http://localhost').pathname.match(new RegExp(`^${regex}$`));
      if (!match) return null;
      return { pathname: { groups: match.groups || {} } };
    }
  };

// Check if native URLPattern is available (Node 22+)
let URLPatternImpl;
try {
  new URLPattern({ pathname: '/' });
  URLPatternImpl = URLPattern;
} catch {
  // Use our polyfill
  URLPatternImpl = globalThis.URLPattern;
}
globalThis.URLPattern = URLPatternImpl;

globalThis.document = {
  createElement(tag) {
    return { tagName: tag, params: null, routeData: null };
  },
};

const { Router } = await import('./router.js');

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeOutlet() {
  return {
    innerHTML: '',
    children: [],
    appendChild(child) { this.children.push(child); return child; },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Router', () => {
  describe('route matching and navigation', () => {
    it('navigates to a matching route and mounts component', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/', 'app-home');
      router.route('/about', 'app-about');

      router.navigate('/about');
      // Give async a tick
      await new Promise(r => setTimeout(r, 10));

      assert.equal(outlet.children.length, 1);
      assert.equal(outlet.children[0].tagName, 'app-about');
    });

    it('extracts URL parameters', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/users/:id', 'user-profile');

      router.navigate('/users/42');
      await new Promise(r => setTimeout(r, 10));

      assert.equal(outlet.children[0].params.id, '42');
    });

    it('tracks current route', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/home', 'app-home');

      assert.equal(router.current, null);

      router.navigate('/home');
      await new Promise(r => setTimeout(r, 10));

      assert.equal(router.current.path, '/home');
    });
  });

  describe('transition hooks — onBefore', () => {
    it('cancels navigation when hook returns false', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/secret', 'secret-page');
      router.onBefore(async () => false);

      router.navigate('/secret');
      await new Promise(r => setTimeout(r, 10));

      assert.equal(outlet.children.length, 0);
    });

    it('redirects when hook returns a string', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/admin', 'admin-page');
      router.route('/login', 'login-page');
      router.onBefore(async (from, to) => {
        if (to.path === '/admin') return '/login';
      });

      router.navigate('/admin');
      await new Promise(r => setTimeout(r, 20));

      const last = outlet.children[outlet.children.length - 1];
      assert.equal(last.tagName, 'login-page');
    });

    it('continues when hook returns undefined', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/open', 'open-page');
      router.onBefore(async () => undefined);

      router.navigate('/open');
      await new Promise(r => setTimeout(r, 10));

      assert.equal(outlet.children[0].tagName, 'open-page');
    });
  });

  describe('transition hooks — onSuccess and onError', () => {
    it('fires onSuccess after mount', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/page', 'my-page');

      let successCalled = false;
      router.onSuccess(async (from, to, data) => {
        successCalled = true;
      });

      router.navigate('/page');
      await new Promise(r => setTimeout(r, 10));

      assert.equal(successCalled, true);
    });

    it('fires onError when resolve throws', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/broken', 'broken-page', {
        resolve: async () => { throw new Error('fail'); },
      });

      let caughtError = null;
      router.onError(async (err) => { caughtError = err; });

      router.navigate('/broken');
      await new Promise(r => setTimeout(r, 10));

      assert.ok(caughtError);
      assert.equal(caughtError.message, 'fail');
    });
  });

  describe('route resolve', () => {
    it('passes resolved data to mounted component', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);
      router.route('/users/:id', 'user-view', {
        resolve: async (params) => ({ user: { id: params.id, name: 'Alice' } }),
      });

      router.navigate('/users/7');
      await new Promise(r => setTimeout(r, 10));

      assert.deepEqual(outlet.children[0].routeData, { user: { id: '7', name: 'Alice' } });
    });
  });

  describe('route groups (shared resolve)', () => {
    it('shares resolved data across routes in same group', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);

      let resolveCount = 0;
      router.group('admin', {
        resolve: async () => { resolveCount++; return { perms: ['read', 'write'] }; },
      });

      router.route('/admin/users', 'admin-users', { group: 'admin' });
      router.route('/admin/settings', 'admin-settings', { group: 'admin' });

      router.navigate('/admin/users');
      await new Promise(r => setTimeout(r, 10));
      assert.equal(resolveCount, 1);
      assert.deepEqual(outlet.children[0].routeData, { perms: ['read', 'write'] });

      router.navigate('/admin/settings');
      await new Promise(r => setTimeout(r, 10));
      // Group resolve should NOT run again (cached)
      assert.equal(resolveCount, 1);
    });

    it('invalidateGroup forces re-resolve', async () => {
      const outlet = makeOutlet();
      const router = new Router(outlet);

      let resolveCount = 0;
      router.group('session', {
        resolve: async () => { resolveCount++; return { token: 'abc' }; },
      });
      router.route('/dashboard', 'app-dash', { group: 'session' });

      router.navigate('/dashboard');
      await new Promise(r => setTimeout(r, 10));
      assert.equal(resolveCount, 1);

      router.invalidateGroup('session');
      router.navigate('/dashboard');
      await new Promise(r => setTimeout(r, 10));
      assert.equal(resolveCount, 2);
    });
  });
});
