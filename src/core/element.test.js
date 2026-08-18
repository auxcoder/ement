/**
 * Tests for core/element.js
 * Run with: node --test src/core/element.test.js
 *
 * Uses a minimal DOM shim since NgElement relies on browser APIs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Minimal DOM Shim ──────────────────────────────────────────────────────────

class MockTextNode {
  constructor(text) { this.textContent = text; this.nodeType = 3; }
}

class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.childNodes = [];
    this.parentElement = null;
    this.textContent = '';
  }
  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }
}

class MockDocumentFragment {
  constructor() { this.childNodes = []; this.nodeType = 11; }
  appendChild(child) { this.childNodes.push(child); return child; }
  cloneNode() { return this; }
}

class MockShadowRoot {
  constructor() { this.children = []; this.childNodes = []; }
  appendChild(child) {
    // Flatten DocumentFragment (like real DOM does)
    if (child.nodeType === 11 && child.childNodes) {
      for (const c of child.childNodes) {
        this.children.push(c);
        this.childNodes.push(c);
      }
    } else {
      this.children.push(child);
      this.childNodes.push(child);
    }
    return child;
  }
  getElementById() { return null; }
}

class MockHTMLElement {
  constructor() { this.parentElement = null; }
  attachShadow() { return new MockShadowRoot(); }
}

class MockTemplateElement {
  constructor() {
    this._innerHTML = '';
    this.content = new MockDocumentFragment();
  }
  set innerHTML(val) {
    this._innerHTML = val;
    // Parse text nodes from the HTML (very simplified)
    const textMatches = val.match(/>[^<]+</g) || [];
    this.content.childNodes = [];
    for (const m of textMatches) {
      const text = m.slice(1, -1);
      if (text.trim()) {
        this.content.childNodes.push(new MockTextNode(text));
      }
    }
    // Also handle pure text templates
    if (this.content.childNodes.length === 0 && val.includes('{{')) {
      this.content.childNodes.push(new MockTextNode(val));
    }
  }
  get innerHTML() { return this._innerHTML; }
}

// TreeWalker shim — walks text nodes
class MockTreeWalker {
  constructor(root) {
    this.nodes = [];
    this._index = -1;
    this._collectTextNodes(root);
  }
  _collectTextNodes(node) {
    if (node.nodeType === 3) { this.nodes.push(node); return; }
    if (node.childNodes) {
      for (const child of node.childNodes) this._collectTextNodes(child);
    }
  }
  nextNode() {
    this._index++;
    this.currentNode = this.nodes[this._index];
    return this.currentNode || null;
  }
}

globalThis.HTMLElement = MockHTMLElement;
globalThis.document = {
  createElement(tag) {
    if (tag === 'template') return new MockTemplateElement();
    if (tag === 'style') return { textContent: '' };
    return new MockElement(tag);
  },
  createTreeWalker(root) { return new MockTreeWalker(root); },
};
globalThis.fetch = async (url) => ({
  text: async () => `<div>fetched from ${url}</div>`,
});

// Import after shims
const { NgElement } = await import('./element.js');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('NgElement', () => {
  describe('template resolution', () => {
    it('uses inline template string when available', async () => {
      class InlineComp extends NgElement {
        static template = '<p>Hello inline</p>';
      }
      await InlineComp._ensureResources();
      assert.equal(InlineComp._resolvedTemplate, '<p>Hello inline</p>');
    });

    it('fetches templateUrl and caches at class level', async () => {
      class FetchComp extends NgElement {
        static templateUrl = 'http://example.com/comp.html';
      }
      await FetchComp._ensureResources();
      assert.equal(FetchComp._resolvedTemplate, '<div>fetched from http://example.com/comp.html</div>');

      // Second call uses cache
      globalThis.fetch = async () => { throw new Error('should not fetch again'); };
      await FetchComp._ensureResources();
      globalThis.fetch = async (url) => ({ text: async () => `<div>fetched from ${url}</div>` });
    });

    it('each subclass has its own cache', async () => {
      class CompA extends NgElement { static template = '<p>A</p>'; }
      class CompB extends NgElement { static template = '<p>B</p>'; }
      await CompA._ensureResources();
      await CompB._ensureResources();
      assert.equal(CompA._resolvedTemplate, '<p>A</p>');
      assert.equal(CompB._resolvedTemplate, '<p>B</p>');
    });
  });

  describe('template bindings ({{ prop }})', () => {
    it('parses and renders {{ prop }} from template', async () => {
      class BindComp extends NgElement {
        static template = '{{ greeting }}';
        greeting = 'Hello World';
      }
      const comp = new BindComp();
      await comp.connectedCallback();

      // The template text node is appended to shadow root via the fragment
      const shadow = comp.shadowRoot;
      // Fragment's childNodes were appended to shadow
      const textNode = shadow.children.find(c => c.textContent !== undefined && c.textContent !== '');
      assert.ok(textNode, 'Should have a text node in shadow DOM');
      assert.equal(textNode.textContent, 'Hello World');
    });

    it('updates binding when _notifyChange is called', async () => {
      class UpdateComp extends NgElement {
        static template = '{{ name }}';
        name = 'Alice';
      }
      const comp = new UpdateComp();
      await comp.connectedCallback();

      const shadow = comp.shadowRoot;
      const boundNode = shadow.children.find(c => c.textContent === 'Alice');
      assert.ok(boundNode, 'Initial binding should render "Alice"');

      // Update
      comp.name = 'Bob';
      comp._notifyChange('name', 'Bob');

      const { flushUpdates } = await import('./scheduler.js');
      flushUpdates();

      assert.equal(boundNode.textContent, 'Bob');
    });

    it('handles multiple bindings to same property', async () => {
      class MultiComp extends NgElement {
        static template = '{{ x }} and {{ x }}';
        x = 'hi';
      }
      const comp = new MultiComp();
      await comp.connectedCallback();

      const shadow = comp.shadowRoot;
      const textNode = shadow.children.find(c => c.textContent?.includes('hi'));
      assert.ok(textNode, 'Should find text node with "hi"');
      assert.equal(textNode.textContent, 'hi and hi');
    });
  });

  describe('attributeChangedCallback', () => {
    it('converts kebab-case to camelCase', () => {
      class AttrComp extends NgElement {
        static observedAttributes = ['user-name'];
      }
      const comp = new AttrComp();
      comp.attributeChangedCallback('user-name', null, 'Alice');
      assert.equal(comp.userName, 'Alice');
    });

    it('does not update if value unchanged', () => {
      class NoChangeComp extends NgElement {}
      const comp = new NoChangeComp();
      comp.userName = 'Original';
      comp.attributeChangedCallback('user-name', 'same', 'same');
      assert.equal(comp.userName, 'Original');
    });
  });

  describe('lifecycle', () => {
    it('calls onInit after connectedCallback', async () => {
      let initCalled = false;
      class LifecycleComp extends NgElement {
        static template = '<p>hi</p>';
        onInit() { initCalled = true; }
      }
      const comp = new LifecycleComp();
      await comp.connectedCallback();
      assert.equal(initCalled, true);
    });

    it('calls onDestroy on disconnectedCallback', () => {
      let destroyed = false;
      class DestroyComp extends NgElement {
        static template = '';
        onDestroy() { destroyed = true; }
      }
      const comp = new DestroyComp();
      comp.disconnectedCallback();
      assert.equal(destroyed, true);
    });
  });
});
