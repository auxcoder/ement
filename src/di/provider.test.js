/**
 * Tests for di/provider.js
 * Run with: node --test src/di/provider.test.js
 *
 * Note: Uses a minimal DOM shim since Node doesn't have DOM APIs.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Container } from "./container.js";
import { provideContainer, resolveContainer } from "./provider.js";

// ─── Minimal DOM shim for testing ──────────────────────────────────────────────
// We only need parentElement traversal — not a full DOM implementation.

function createElement(tag) {
  return {
    tagName: tag,
    parentElement: null,
    children: [],
    getRootNode() {
      return this;
    },
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

const HttpToken = Symbol("Http");
const LoggerToken = Symbol("Logger");

describe("provideContainer + resolveContainer", () => {
  it("resolves container from the element itself", () => {
    const el = createElement("div");
    const container = new Container();
    container.register(HttpToken, () => ({ get: () => {} }));

    provideContainer(el, container);

    const resolved = resolveContainer(el);
    assert.strictEqual(resolved, container);
  });

  it("walks up to parent to find container", () => {
    const parent = createElement("div");
    const child = createElement("span");
    parent.appendChild(child);

    const container = new Container();
    container.register(HttpToken, () => "http-service");
    provideContainer(parent, container);

    const resolved = resolveContainer(child);
    assert.strictEqual(resolved, container);
    assert.equal(resolved.resolve(HttpToken), "http-service");
  });

  it("walks up multiple levels", () => {
    const grandparent = createElement("div");
    const parent = createElement("div");
    const child = createElement("span");
    grandparent.appendChild(parent);
    parent.appendChild(child);

    const container = new Container();
    provideContainer(grandparent, container);

    const resolved = resolveContainer(child);
    assert.strictEqual(resolved, container);
  });

  it("finds the nearest container (closest ancestor wins)", () => {
    const grandparent = createElement("div");
    const parent = createElement("div");
    const child = createElement("span");
    grandparent.appendChild(parent);
    parent.appendChild(child);

    const gpContainer = new Container();
    gpContainer.register(HttpToken, () => "grandparent-http");

    const parentContainer = new Container();
    parentContainer.register(HttpToken, () => "parent-http");

    provideContainer(grandparent, gpContainer);
    provideContainer(parent, parentContainer);

    const resolved = resolveContainer(child);
    assert.strictEqual(resolved, parentContainer);
    assert.equal(resolved.resolve(HttpToken), "parent-http");
  });

  it("throws when no container found", () => {
    const el = createElement("div");

    assert.throws(() => resolveContainer(el), /No DI container found/);
  });

  it("works with container hierarchy (child container on nested element)", () => {
    const root = createElement("div");
    const section = createElement("section");
    const component = createElement("my-comp");
    root.appendChild(section);
    section.appendChild(component);

    // Root has the app container
    const appContainer = new Container();
    appContainer.register(HttpToken, () => "real-http");
    appContainer.register(LoggerToken, () => "real-logger");
    provideContainer(root, appContainer);

    // Section has a child container (overrides Http for testing)
    const testContainer = appContainer.createChild();
    testContainer.register(HttpToken, () => "mock-http");
    provideContainer(section, testContainer);

    // Component resolves from nearest (section's test container)
    const container = resolveContainer(component);
    assert.equal(container.resolve(HttpToken), "mock-http");
    // Logger falls through to parent container
    assert.equal(container.resolve(LoggerToken), "real-logger");
  });
});
