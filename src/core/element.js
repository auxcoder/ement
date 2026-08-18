/**
 * NgElement — Custom Element base class.
 * Replaces AngularJS directives + $compile.
 *
 * Features:
 * - Shadow DOM encapsulation
 * - External template/styles resolution (fetch + cache or build-time inline)
 * - Lifecycle hooks: onInit(), onDestroy()
 * - DI container access via DOM traversal
 *
 * Template resolution — ONE path, TWO behaviors:
 * - With bundler: templateUrl is replaced with inline string at build time (zero async)
 * - Without bundler: fetches the URL and caches at class level (async only on first instance)
 *
 * @module core/element
 */

import { resolveContainer } from '../di/provider.js';

export class NgElement extends HTMLElement {
  #shadow;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Access the Shadow DOM root.
   */
  get shadowRoot() {
    return this.#shadow;
  }

  /**
   * Access the nearest DI container (walks up the DOM).
   */
  get container() {
    return resolveContainer(this);
  }

  /**
   * Called by the browser when the element is added to the DOM.
   * Resolves template/styles, renders, then calls onInit().
   */
  async connectedCallback() {
    await this.constructor._ensureResources();
    this.#render();
    this.onInit?.();
  }

  /**
   * Called by the browser when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.onDestroy?.();
  }

  /**
   * Called by the browser when an observed attribute changes.
   * Converts kebab-case attributes to camelCase properties.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    const prop = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    this[prop] = newValue;
  }

  // ─── Template Resolution (class-level cache) ───────────────────────────────

  /**
   * Ensures template and styles are resolved (fetched or inlined).
   * Called once per component TYPE, not per instance.
   * @private
   */
  static async _ensureResources() {
    // Already resolved for this class
    if (this._resolvedTemplate !== undefined) return;

    // Template
    if (typeof this.template === 'string') {
      // Build step already inlined it
      this._resolvedTemplate = this.template;
    } else if (this.templateUrl) {
      const res = await fetch(this.templateUrl);
      this._resolvedTemplate = await res.text();
    } else {
      this._resolvedTemplate = '';
    }

    // Styles
    if (typeof this.styles === 'string') {
      this._resolvedStyles = this.styles;
    } else if (this.stylesUrl) {
      const res = await fetch(this.stylesUrl);
      this._resolvedStyles = await res.text();
    } else {
      this._resolvedStyles = null;
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  /**
   * Renders the template and styles into the Shadow DOM.
   * @private
   */
  #render() {
    const template = this.constructor._resolvedTemplate;
    const styles = this.constructor._resolvedStyles;

    // Add scoped styles
    if (styles) {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      this.#shadow.appendChild(styleEl);
    }

    // Parse and append template
    if (template) {
      const tpl = document.createElement('template');
      tpl.innerHTML = template;
      this.#shadow.appendChild(tpl.content.cloneNode(true));
    }
  }
}
