/**
 * Interface-based Dependency Injection container.
 * Replaces AngularJS's $injector / $provide.
 *
 * Services are registered against Symbol tokens (interfaces)
 * and resolved by token. Enables test mocking without module patching.
 *
 * @module di/container
 */

/**
 * DI ElContainer — register and resolve services by token.
 *
 * @example
 * const container = new ElContainer();
 * container.register(HttpToken, () => new Http({ baseUrl: '/api' }));
 * const http = container.resolve(HttpToken);
 */
export class ElContainer {
  #services = new Map();
  #singletons = new Map();
  #parent = null;
  #resolving = new Set(); // circular dependency detection

  /**
   * @param {Container|null} parent - Parent container for hierarchical resolution
   */
  constructor(parent = null) {
    this.#parent = parent;
  }

  /**
   * Register a service factory against a token.
   *
   * @param {Symbol} token - The interface token to register against
   * @param {Function} factory - Factory function: (container) => instance
   * @param {Object} [options]
   * @param {boolean} [options.singleton=true] - Shared instance (true) or new per resolve (false)
   * @returns {ElContainer} this (for chaining)
   *
   * @example
   * container.register(HttpToken, (c) => new Http({ baseUrl: '/api' }));
   * container.register(LoggerToken, () => console, { singleton: false });
   */
  register(token, factory, { singleton = true } = {}) {
    this.#services.set(token, { factory, singleton });
    // Clear cached singleton if re-registering
    this.#singletons.delete(token);
    return this;
  }

  /**
   * Resolve a service by token.
   * Checks this container first, then walks up to parent.
   *
   * @param {Symbol} token - The interface token to resolve
   * @returns {*} The service instance
   * @throws {Error} If no provider found or circular dependency detected
   */
  resolve(token) {
    // Return cached singleton if available
    if (this.#singletons.has(token)) {
      return this.#singletons.get(token);
    }

    const registration = this.#services.get(token);

    if (registration) {
      // Circular dependency detection
      if (this.#resolving.has(token)) {
        throw new Error(
          `Circular dependency detected while resolving ${token.toString()}`,
        );
      }

      this.#resolving.add(token);
      try {
        const instance = registration.factory(this);
        if (registration.singleton) {
          this.#singletons.set(token, instance);
        }
        return instance;
      } finally {
        this.#resolving.delete(token);
      }
    }

    // Delegate to parent container
    if (this.#parent) {
      return this.#parent.resolve(token);
    }

    throw new Error(
      `No provider registered for ${token.toString()}. ` +
        `Did you forget to register it in the container?`,
    );
  }

  /**
   * Check if a token is registered (in this container or parent).
   *
   * @param {Symbol} token
   * @returns {boolean}
   */
  has(token) {
    if (this.#services.has(token)) return true;
    if (this.#parent) return this.#parent.has(token);
    return false;
  }

  /**
   * Create a child container that inherits this container's registrations.
   * Child can override tokens without mutating the parent.
   *
   * @returns {ElContainer}
   *
   * @example
   * const child = container.createChild();
   * child.register(HttpToken, () => mockHttp); // shadows parent
   */
  createChild() {
    return new ElContainer(this);
  }
}
