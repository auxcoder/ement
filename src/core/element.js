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
import { reactive } from './reactive.js';
import { scheduleUpdate } from './scheduler.js';

export class NgElement extends HTMLElement {
  #shadow;
  #bindings = new Map(); // prop → [{ node, template }]

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
   * Renders the template and styles into the Shadow DOM,
   * then parses {{ prop }} bindings and connects them to reactive state.
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
      const content = tpl.content.cloneNode(true);
      this.#parseBindings(content);
      this.#shadow.appendChild(content);
    }

    // Initial render of all bindings
    for (const [prop] of this.#bindings) {
      this.#updateBinding(prop, this[prop]);
    }
  }

  // ─── Template Bindings ({{ prop }}) ────────────────────────────────────────

  /**
   * Walks the DOM tree to find {{ prop }} expressions in text nodes.
   * Records them so they can be updated when the property changes.
   * @private
   */
  #parseBindings(root) {
    // TreeWalker for text nodes
    if (typeof document !== 'undefined' && document.createTreeWalker) {
      const walker = document.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
      while (walker.nextNode()) {
        this.#processTextNode(walker.currentNode);
      }
    }
  }

  /**
   * Checks a text node for {{ prop }} patterns and registers bindings.
   * @private
   */
  #processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || !text.includes('{{')) return;

    const matches = [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)];
    if (matches.length === 0) return;

    for (const match of matches) {
      const prop = match[1];
      if (!this.#bindings.has(prop)) {
        this.#bindings.set(prop, []);
      }
      this.#bindings.get(prop).push({
        node: textNode,
        template: text,
      });
    }
  }

  /**
   * Updates all text nodes bound to a given property.
   * @private
   */
  #updateBinding(prop, value) {
    const entries = this.#bindings.get(prop);
    if (!entries) return;

    for (const { node, template } of entries) {
      // Replace all {{ prop }} occurrences in the original template string
      let result = template;
      for (const [p, v] of this.#getAllBoundValues()) {
        result = result.replace(
          new RegExp(`\\{\\{\\s*${p}\\s*\\}\\}`, 'g'),
          v ?? '',
        );
      }
      node.textContent = result;
    }
  }

  /**
   * Gets current values for all bound properties.
   * @private
   */
  #getAllBoundValues() {
    const entries = [];
    for (const prop of this.#bindings.keys()) {
      entries.push([prop, this[prop]]);
    }
    return entries;
  }

  /**
   * Notify that a property changed — schedules binding updates.
   * Call this from reactive setters or manually after state changes.
   */
  _notifyChange(prop, value) {
    if (this.#bindings.has(prop)) {
      scheduleUpdate(() => this.#updateBinding(prop, value));
    }
  }
}
