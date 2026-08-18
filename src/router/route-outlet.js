/**
 * <route-outlet> custom element.
 * Mounts/unmounts components based on active route.
 * Acts as the mounting point for the Router.
 *
 * Usage:
 *   <route-outlet></route-outlet>
 *
 *   const outlet = document.querySelector('route-outlet');
 *   const router = new Router(outlet);
 *
 * @module router/route-outlet
 */

const BaseElement = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

export class RouteOutlet extends BaseElement {
  #currentComponent = null;

  constructor() {
    super();
  }

  /**
   * Get the currently mounted component element.
   * @returns {HTMLElement|null}
   */
  get currentComponent() {
    return this.#currentComponent;
  }

  /**
   * Mount a component by clearing the outlet and appending the new element.
   * Called internally by the Router.
   *
   * @param {HTMLElement} element - The component element to mount
   */
  mount(element) {
    this.clear();
    this.#currentComponent = element;
    this.appendChild(element);
  }

  /**
   * Clear the outlet — remove the current component.
   */
  clear() {
    if (this.#currentComponent) {
      this.#currentComponent.remove?.();
      this.#currentComponent = null;
    }
    if (this.innerHTML !== undefined) {
      this.innerHTML = '';
    }
  }
}

// Register if in browser
if (typeof customElements !== 'undefined') {
  customElements.define('route-outlet', RouteOutlet);
}
