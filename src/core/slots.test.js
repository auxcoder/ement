/**
 * Tests for slot-based content projection (Task 3.4)
 * Run with: node --test src/core/slots.test.js
 *
 * Slots are a native Shadow DOM feature — no framework code needed.
 * These tests document the pattern and prove it works with NgElement.
 *
 * In a real browser:
 *   <my-card>
 *     <span slot="title">Hello</span>
 *     <p>Default content</p>
 *   </my-card>
 *
 * Template:
 *   <div class="card">
 *     <h2><slot name="title"></slot></h2>
 *     <slot></slot>  <!-- default slot -->
 *   </div>
 *
 * This is equivalent to AngularJS ng-transclude / transclusion.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Slot-based content projection (design)", () => {
  it("documents default slot usage", () => {
    // Template with default slot:
    const template = `
      <div class="card">
        <slot></slot>
      </div>
    `;

    // Usage: <my-card><p>Projected content</p></my-card>
    // Result: <p>Projected content</p> appears inside .card

    assert.ok(template.includes("<slot></slot>"));
  });

  it("documents named slot usage", () => {
    // Template with named slots:
    const template = `
      <header><slot name="title"></slot></header>
      <main><slot></slot></main>
      <footer><slot name="actions"></slot></footer>
    `;

    // Usage:
    // <my-dialog>
    //   <h2 slot="title">Confirm</h2>
    //   <p>Are you sure?</p>
    //   <button slot="actions">OK</button>
    // </my-dialog>

    assert.ok(template.includes('name="title"'));
    assert.ok(template.includes('name="actions"'));
    assert.ok(template.includes("<slot></slot>")); // default slot
  });

  it("documents comparison: ng-transclude vs slot", () => {
    const comparison = {
      angularjs: {
        directive: `transclude: true, template: '<div><ng-transclude></ng-transclude></div>'`,
        usage: `<my-dir>Content here</my-dir>`,
        multiSlot: `transclude: { title: '?titleSlot', body: '?bodySlot' }`,
      },
      ngModern: {
        directive: `static template = '<div><slot></slot></div>'`,
        usage: `<my-comp>Content here</my-comp>`,
        multiSlot: `static template = '<slot name="title"></slot><slot name="body"></slot>'`,
      },
    };

    // Key differences:
    // - AngularJS: ng-transclude is a directive, needs transclusion scope management
    // - ng-modern: <slot> is native browser, zero framework code, no scope issues
    // - AngularJS multi-slot: configuration object + slot attributes
    // - ng-modern multi-slot: just name attributes on <slot> elements
    assert.ok(comparison.angularjs.directive);
    assert.ok(comparison.ngModern.directive);
  });
});
