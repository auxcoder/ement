/**
 * Application bootstrap helper.
 * Sugar over Container + Http + Router setup.
 *
 * @module core/bootstrap
 */

import { Container } from "../di/container.js";
import { HttpToken, RouterToken } from "../di/tokens.js";
import { Http } from "../http/http.js";
import { Router } from "../router/router.js";
import { interceptLinks } from "../router/links.js";
import { provideContainer } from "../di/provider.js";

/**
 * Bootstrap an ng-modern application.
 *
 * @param {string|HTMLElement} root - CSS selector or element to attach the app to
 * @param {Object} config
 * @param {Array} [config.services] - Array of [token, factory] pairs to register
 * @param {Object} [config.http] - Http configuration (baseUrl, interceptors, timeout, retries)
 * @param {Function} [config.routes] - (router) => void — configure routes and hooks
 * @param {string} [config.outlet] - CSS selector for route-outlet (default: 'route-outlet')
 * @returns {{ container: Container, router: Router|null, http: Http }}
 *
 * @example
 * const app = bootstrap('#app', {
 *   http: {
 *     baseUrl: '/api',
 *     timeout: 10000,
 *     interceptors: [authInterceptor],
 *   },
 *   services: [
 *     [AuthToken, () => new AuthService()],
 *     [UserServiceToken, (c) => new UserService(c.resolve(HttpToken))],
 *   ],
 *   routes: (router) => {
 *     router
 *       .route('/', 'app-home')
 *       .route('/login', 'app-login')
 *       .route('/admin/users', 'admin-users', { group: 'admin' });
 *     router.onBefore(authGuard);
 *   },
 * });
 */
export function bootstrap(root, config = {}) {
  const {
    services = [],
    http: httpConfig,
    routes,
    outlet = "route-outlet",
  } = config;

  // Resolve root element
  const rootEl = typeof root === "string" ? document.querySelector(root) : root;

  if (!rootEl) {
    throw new Error(`bootstrap: root element "${root}" not found`);
  }

  // Create container
  const container = new Container();

  // Register Http
  const httpInstance = new Http(httpConfig || {});
  container.register(HttpToken, () => httpInstance);

  // Register user services
  for (const [token, factory] of services) {
    container.register(token, factory);
  }

  // Attach container to root element
  provideContainer(rootEl, container);

  // Setup router (if routes configured)
  let router = null;
  if (routes) {
    const outletEl = rootEl.querySelector(outlet) || rootEl;
    router = new Router(outletEl);
    container.register(RouterToken, () => router);

    // Configure routes
    routes(router);

    // Intercept link clicks
    interceptLinks(router, rootEl);

    // Resolve initial route
    router.start();
  }

  return { container, router, http: httpInstance };
}
