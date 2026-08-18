/**
 * Tests for router/route-outlet.js
 * Run with: node --test src/router/route-outlet.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Shim
globalThis.HTMLElement = class {};
globalThis.customElements = { define() {} };

const { RouteOutlet } = await import('./route-outlet.js');

describe('RouteOutlet', () => {
  it('starts with no current component', () => {
    const outlet = new RouteOutlet();
    assert.equal(outlet.currentComponent, null);
  });

  it('mounts a component element', () => {
    const outlet = new RouteOutlet();
    outlet.innerHTML = '';
    outlet.appendChild = function(el) { this._child = el; };

    const comp = { tagName: 'my-comp', remove() {} };
    outlet.mount(comp);

    assert.strictEqual(outlet.currentComponent, comp);
    assert.strictEqual(outlet._child, comp);
  });

  it('clears previous component on new mount', () => {
    const outlet = new RouteOutlet();
    outlet.innerHTML = '';
    outlet.appendChild = function(el) { this._child = el; };

    let removed = false;
    const first = { tagName: 'first-comp', remove() { removed = true; } };
    const second = { tagName: 'second-comp', remove() {} };

    outlet.mount(first);
    outlet.mount(second);

    assert.equal(removed, true);
    assert.strictEqual(outlet.currentComponent, second);
  });

  it('clear() removes current component', () => {
    const outlet = new RouteOutlet();
    outlet.innerHTML = '';
    outlet.appendChild = function(el) { this._child = el; };

    let removed = false;
    const comp = { tagName: 'comp', remove() { removed = true; } };
    outlet.mount(comp);

    outlet.clear();
    assert.equal(removed, true);
    assert.equal(outlet.currentComponent, null);
  });
});
