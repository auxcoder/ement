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

import { resolveContainer } from "../di/provider.js";
import { reactive } from "./reactive.js";
import { scheduleUpdate } from "./scheduler.js";

export class NgElement extends HTMLElement {
  #shadow;
  #bindings = new Map(); // prop → [{ node, template }]

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });
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
   * Supports type coercion via static `propTypes` declaration.
   *
   * @example
   * class MyComp extends NgElement {
   *   static observedAttributes = ['user-name', 'is-active', 'count'];
   *   static propTypes = { isActive: Boolean, count: Number };
   * }
   * // <my-comp user-name="Alice" is-active count="5">
   * // → this.userName = 'Alice', this.isActive = true, this.count = 5
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    const prop = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const coerced = this.#coerceValue(prop, newValue, name);
    this[prop] = coerced;
    this._notifyChange(prop, coerced);
  }

  /**
   * Coerce attribute string to the declared type.
   * @private
   */
  #coerceValue(prop, value, attrName) {
    const types = this.constructor.propTypes;
    if (!types || !types[prop]) return value;

    const type = types[prop];

    if (type === Boolean) {
      // Boolean attributes: presence = true, absence = false
      // <el active> → true, <el active="false"> → false, removal → false
      if (value === null) return false;
      if (value === "false" || value === "0") return false;
      return true;
    }

    if (type === Number) {
      if (value === null || value === "") return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }

    return value;
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
    if (typeof this.template === "string") {
      // Build step already inlined it
      this._resolvedTemplate = this.template;
    } else if (this.templateUrl) {
      const res = await fetch(this.templateUrl);
      this._resolvedTemplate = await res.text();
    } else {
      this._resolvedTemplate = "";
    }

    // Styles
    if (typeof this.styles === "string") {
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
      const styleEl = document.createElement("style");
      styleEl.textContent = styles;
      this.#shadow.appendChild(styleEl);
    }

    // Parse and append template
    if (template) {
      const tpl = document.createElement("template");
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
    if (typeof document !== "undefined" && document.createTreeWalker) {
      const walker = document.createTreeWalker(
        root,
        4 /* NodeFilter.SHOW_TEXT */,
      );
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
    if (!text || !text.includes("{{")) return;

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
          new RegExp(`\\{\\{\\s*${p}\\s*\\}\\}`, "g"),
          v ?? "",
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

  // ─── Conditional Rendering ─────────────────────────────────────────────────

  /**
   * Show or hide an element in the shadow DOM by selector.
   * Uses `display: none` — element stays in DOM but is invisible.
   * Equivalent to AngularJS `ng-show` / `ng-hide`.
   *
   * @param {string} selector - CSS selector within shadow DOM
   * @param {boolean} condition - Whether to show (true) or hide (false)
   *
   * @example
   * this.show('.loading', this.isLoading);
   * this.show('.content', !this.isLoading);
   */
  show(selector, condition) {
    const el = this.#shadow.querySelector?.(selector);
    if (el) {
      el.style.display = condition ? "" : "none";
    }
  }

  /**
   * Conditionally create or remove a DOM subtree.
   * Equivalent to AngularJS `ng-if` — element is fully removed when false.
   *
   * @param {string} selector - CSS selector for the container element
   * @param {boolean} condition - Whether to render content
   * @param {Function} templateFn - Returns HTML string or DOM node to insert
   * @returns {Node|null} The inserted node, or null if removed
   *
   * @example
   * this.when('.error-container', this.hasError, () => {
   *   const el = document.createElement('p');
   *   el.textContent = this.errorMessage;
   *   el.className = 'error';
   *   return el;
   * });
   */
  when(selector, condition, templateFn) {
    const container = this.#shadow.querySelector?.(selector);
    if (!container) return null;

    // Track what we've inserted with a data attribute
    const marker = `__ng_when_${selector}`;

    if (condition) {
      // Only create if not already present
      if (!container[marker]) {
        const content = templateFn();
        container.appendChild(content);
        container[marker] = content;
      }
      return container[marker];
    } else {
      // Remove if present
      if (container[marker]) {
        container[marker].remove?.();
        container[marker] = null;
      }
      return null;
    }
  }

  // ─── List Rendering ─────────────────────────────────────────────────────────

  /**
   * Render a list of items into a container, with keyed reconciliation.
   * Equivalent to AngularJS `ng-repeat` with `track by`.
   *
   * Reuses existing DOM nodes when possible (matched by key), only
   * creating/removing nodes that actually changed.
   *
   * @param {string} selector - CSS selector for the container element
   * @param {Array} items - Array of data items to render
   * @param {Function} templateFn - (item, index) => DOM node
   * @param {Function} [keyFn] - (item) => unique key (default: index)
   *
   * @example
   * this.repeat('.todo-list', this.todos, (todo) => {
   *   const li = document.createElement('li');
   *   li.textContent = todo.text;
   *   return li;
   * }, (todo) => todo.id);
   */
  repeat(selector, items, templateFn, keyFn = (_, i) => i) {
    const container = this.#shadow.querySelector?.(selector);
    if (!container) return;

    // Track existing nodes by key
    const marker = `__ng_repeat_${selector}`;
    const existingMap = container[marker] || new Map(); // key → node
    const newMap = new Map();

    // Build new list
    const fragment = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = keyFn(item, i);

      if (existingMap.has(key)) {
        // Reuse existing node
        newMap.set(key, existingMap.get(key));
        existingMap.delete(key);
      } else {
        // Create new node
        const node = templateFn(item, i);
        node.__ngKey = key;
        newMap.set(key, node);
      }
      fragment.push(newMap.get(key));
    }

    // Remove nodes that no longer exist
    for (const [, node] of existingMap) {
      node.remove?.();
    }

    // Clear and re-append in order
    if (container.innerHTML !== undefined) container.innerHTML = "";
    if (container.childNodes) container.childNodes.length = 0;
    for (const node of fragment) {
      container.appendChild(node);
    }

    // Store map for next reconciliation
    container[marker] = newMap;
  }

  // ─── Event Emission ────────────────────────────────────────────────────────

  /**
   * Emit a custom event that bubbles through Shadow DOM.
   * Equivalent to AngularJS's `&` scope binding (output callback).
   *
   * @param {string} name - Event name (will be kebab-cased by convention)
   * @param {*} detail - Data to pass with the event
   * @param {Object} [options] - Additional event options
   * @returns {boolean} Whether the event was not cancelled
   *
   * @example
   * // Child component:
   * this.emit('item-selected', { id: 42 });
   *
   * // Parent listens:
   * childEl.addEventListener('item-selected', (e) => {
   *   console.log(e.detail.id); // 42
   * });
   */
  emit(name, detail = null, options = {}) {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true, // crosses Shadow DOM boundary
      cancelable: true,
      ...options,
    });
    return this.dispatchEvent(event);
  }
}
