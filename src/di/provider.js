/**
 * DI container integration with the DOM.
 *
 * Provides:
 * 1. `<ng-provider>` element — attaches a Container to a DOM subtree
 * 2. `resolveContainer(element)` — walks up the DOM to find the nearest container
 *
 * This is how components access services without importing implementations directly.
 * Similar to AngularJS's scope inheritance, but using DOM hierarchy.
 *
 * @module di/provider
 */

import { ElContainer } from "./container.js";

// Symbol used to attach container to a DOM element
const CONTAINER_KEY = Symbol("__ngContainer");

/**
 * Attach a container to a DOM element.
 * Any descendant can resolve services from this container.
 *
 * @param {HTMLElement} element - The DOM element to provide from
 * @param {Container} container - The container instance
 *
 * @example
 * const container = new ElContainer();
 * container.register(HttpToken, () => new Http());
 * provideContainer(document.getElementById('app'), container);
 */
export function provideContainer(element, container) {
  element[CONTAINER_KEY] = container;
}

/**
 * Walk up the DOM to find the nearest container.
 * Checks the element itself, then ancestors, crossing Shadow DOM boundaries.
 *
 * @param {HTMLElement} element - Starting element
 * @returns {Container} The nearest container
 * @throws {Error} If no container found in any ancestor
 *
 * @example
 * // Inside a component:
 * const container = resolveContainer(this);
 * const http = container.resolve(HttpToken);
 */
export function resolveContainer(element) {
  let el = element;

  while (el) {
    if (el[CONTAINER_KEY]) {
      return el[CONTAINER_KEY];
    }
    // Walk up: parentElement within same DOM, or host element across Shadow DOM
    el = el.parentElement || el.getRootNode()?.host;
  }

  throw new Error(
    "No DI container found in DOM ancestors. " +
      "Wrap your app with provideContainer(element, container).",
  );
}

/**
 * `<ng-provider>` custom element.
 * Convenience element that creates and attaches a container to itself.
 * Child elements can resolve services from it.
 *
 * Usage:
 *   const provider = document.createElement('ng-provider');
 *   provider.container.register(HttpToken, () => new Http());
 *   document.body.appendChild(provider);
 *
 * Or programmatically:
 *   const provider = document.querySelector('ng-provider');
 *   provider.container.register(HttpToken, () => http);
 */
const BaseElement = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class NgProvider extends BaseElement {
  #container;

  constructor() {
    super();
    this.#container = new ElContainer();
    this[CONTAINER_KEY] = this.#container;
  }

  /**
   * Access the container to register services.
   */
  get container() {
    return this.#container;
  }

  /**
   * Set a pre-configured container (e.g., one with a parent).
   */
  set container(c) {
    this.#container = c;
    this[CONTAINER_KEY] = c;
  }
}

// Only define if in browser environment (skip in Node tests)
if (typeof customElements !== "undefined") {
  customElements.define("ng-provider", NgProvider);
}
