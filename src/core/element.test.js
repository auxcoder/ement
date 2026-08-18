/**
 * Tests for core/element.js
 * Run with: node --test src/core/element.test.js
 *
 * Uses a minimal DOM shim since NgElement relies on browser APIs.
 * Integration tests in the browser will cover full behavior.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── Minimal DOM Shim ──────────────────────────────────────────────────────────

class MockShadowRoot {
  constructor() { this.children = []; this.innerHTML = ''; }
  appendChild(child) { this.children.push(child); return child; }
  getElementById(id) { return null; }
}

class MockHTMLElement {
  constructor() { this.parentElement = null; }
  attachShadow() { return new MockShadowRoot(); }
  getAttribute() { return null; }
}

class MockTemplateElement {
  constructor() { this.innerHTML = ''; this.content = { cloneNode: () => ({ nodeType: 11 }) }; }
}

// Shim globals
globalThis.HTMLElement = MockHTMLElement;
globalThis.document = {
  createElement(tag) {
    if (tag === 'template') return new MockTemplateElement();
    if (tag === 'style') return { textContent: '' };
    return { tagName: tag };
  },
};
globalThis.fetch = async (url) => ({
  text: async () => `<div>fetched from ${url}</div>`,
});

// Now import NgElement (after shims are in place)
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

      // Second call uses cache (doesn't re-fetch)
      globalThis.fetch = async () => { throw new Error('should not fetch again'); };
      await FetchComp._ensureResources();
      assert.equal(FetchComp._resolvedTemplate, '<div>fetched from http://example.com/comp.html</div>');

      // Restore fetch
      globalThis.fetch = async (url) => ({ text: async () => `<div>fetched from ${url}</div>` });
    });

    it('uses inline styles string when available', async () => {
      class StyledComp extends NgElement {
        static template = '<p>styled</p>';
        static styles = ':host { color: red; }';
      }

      await StyledComp._ensureResources();
      assert.equal(StyledComp._resolvedStyles, ':host { color: red; }');
    });

    it('fetches stylesUrl', async () => {
      class FetchStyleComp extends NgElement {
        static templateUrl = 'http://example.com/comp.html';
        static stylesUrl = 'http://example.com/comp.css';
      }

      await FetchStyleComp._ensureResources();
      assert.equal(FetchStyleComp._resolvedStyles, '<div>fetched from http://example.com/comp.css</div>');
    });

    it('each subclass has its own cache (no cross-contamination)', async () => {
      class CompA extends NgElement { static template = '<p>A</p>'; }
      class CompB extends NgElement { static template = '<p>B</p>'; }

      await CompA._ensureResources();
      await CompB._ensureResources();

      assert.equal(CompA._resolvedTemplate, '<p>A</p>');
      assert.equal(CompB._resolvedTemplate, '<p>B</p>');
    });
  });

  describe('attributeChangedCallback', () => {
    it('converts kebab-case to camelCase', () => {
      class AttrComp extends NgElement {
        static observedAttributes = ['user-name', 'is-active'];
      }

      const comp = new AttrComp();
      comp.attributeChangedCallback('user-name', null, 'Alice');
      assert.equal(comp.userName, 'Alice');

      comp.attributeChangedCallback('is-active', null, 'true');
      assert.equal(comp.isActive, 'true');
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
