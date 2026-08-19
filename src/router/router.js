/**
 * History-based SPA router with route groups and transition hooks.
 * Replaces ngRoute + pragmatic ui-router features (guards, shared resolves).
 *
 * @module router/router
 */

export class Router extends EventTarget {
  #routes = [];
  #groups = new Map();
  #hooks = { onBefore: [], onSuccess: [], onError: [] };
  #outlet = null;
  #currentRoute = null;

  /**
   * @param {HTMLElement} outlet - The DOM element where routed components mount
   */
  constructor(outlet) {
    super();
    this.#outlet = outlet;

    if (typeof window !== "undefined") {
      window.addEventListener("popstate", () => this.#resolve());
    }
  }

  /**
   * Register a route group with a shared resolve function.
   * Group resolve runs once on first child hit, result is cached.
   *
   * @param {string} name - Group name
   * @param {Object} options
   * @param {Function} options.resolve - async (params) => data
   * @returns {Router} this
   */
  group(name, { resolve } = {}) {
    this.#groups.set(name, { resolve, data: null, resolved: false });
    return this;
  }

  /**
   * Register a route.
   *
   * @param {string} pattern - URL pattern (e.g., '/users/:id')
   * @param {string} component - Custom element tag name to mount
   * @param {Object} [options]
   * @param {Function} [options.resolve] - async (params) => data
   * @param {string} [options.group] - Group name for shared resolve
   * @returns {Router} this
   */
  route(pattern, component, { resolve, group } = {}) {
    const urlPattern = new URLPattern({ pathname: pattern });
    this.#routes.push({ pattern, urlPattern, component, resolve, group });
    return this;
  }

  /**
   * Register a transition hook that runs BEFORE navigation.
   * Return undefined to continue, false to cancel, or a string to redirect.
   *
   * @param {Function} hookFn - async (from, to) => undefined | false | string
   * @returns {Router} this
   */
  onBefore(hookFn) {
    this.#hooks.onBefore.push(hookFn);
    return this;
  }

  /**
   * Register a hook that runs AFTER successful navigation.
   *
   * @param {Function} hookFn - async (from, to, data) => void
   * @returns {Router} this
   */
  onSuccess(hookFn) {
    this.#hooks.onSuccess.push(hookFn);
    return this;
  }

  /**
   * Register a hook that runs when navigation fails (resolve error, etc.).
   *
   * @param {Function} hookFn - async (error, from, to) => void
   * @returns {Router} this
   */
  onError(hookFn) {
    this.#hooks.onError.push(hookFn);
    return this;
  }

  /**
   * Navigate to a path programmatically.
   *
   * @param {string} path - The URL path to navigate to
   */
  navigate(path) {
    if (typeof history !== "undefined") {
      history.pushState(null, "", path);
    }
    this.#resolve(path);
  }

  /**
   * Get the current route info.
   * @returns {{ path: string, params: Object, route: Object }|null}
   */
  get current() {
    return this.#currentRoute;
  }

  /**
   * Invalidate a group's cached resolve data.
   * Forces re-resolve on next navigation to a route in that group.
   *
   * @param {string} name - Group name
   */
  invalidateGroup(name) {
    const group = this.#groups.get(name);
    if (group) {
      group.resolved = false;
      group.data = null;
    }
  }

  /**
   * Manually trigger route resolution for the current URL.
   * Useful for initial page load.
   */
  start() {
    if (typeof location !== "undefined") {
      this.#resolve(location.pathname + location.search);
    }
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  async #resolve(overridePath) {
    const path =
      overridePath ||
      (typeof location !== "undefined" ? location.pathname : "/");
    const url = new URL(path, "http://localhost");

    for (const route of this.#routes) {
      const match = route.urlPattern.exec(url);
      if (!match) continue;

      const params = match.pathname.groups;
      const from = this.#currentRoute;
      const to = { path, params, route };

      try {
        // Run onBefore hooks
        for (const hook of this.#hooks.onBefore) {
          const result = await hook(from, to);
          if (result === false) return; // cancel
          if (typeof result === "string") {
            this.navigate(result); // redirect
            return;
          }
        }

        // Resolve data
        let data = {};

        // Group resolve (cached)
        if (route.group) {
          const group = this.#groups.get(route.group);
          if (group && !group.resolved) {
            group.data = await group.resolve(params);
            group.resolved = true;
          }
          if (group) data = { ...group.data };
        }

        // Route-level resolve
        if (route.resolve) {
          const routeData = await route.resolve(params);
          data = { ...data, ...routeData };
        }

        // Mount component
        this.#mount(route.component, params, data);
        this.#currentRoute = to;

        // Run onSuccess hooks
        for (const hook of this.#hooks.onSuccess) {
          await hook(from, to, data);
        }

        this.dispatchEvent(
          new CustomEvent("navigate", { detail: { from, to, data } }),
        );
      } catch (error) {
        for (const hook of this.#hooks.onError) {
          await hook(error, from, to);
        }
      }
      return;
    }
  }

  #mount(component, params, data) {
    if (!this.#outlet) return;

    // Clear outlet
    if (this.#outlet.innerHTML !== undefined) {
      this.#outlet.innerHTML = "";
    }

    // Create and configure component element
    const el =
      typeof document !== "undefined"
        ? document.createElement(component)
        : { tagName: component, params: null, routeData: null };

    el.params = params;
    el.routeData = data;
    this.#outlet.appendChild(el);
  }
}
