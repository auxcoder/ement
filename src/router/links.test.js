/**
 * Tests for router/links.js
 * Run with: node --test src/router/links.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { interceptLinks } from "./links.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeRouter() {
  const navigated = [];
  return {
    navigate(path) {
      navigated.push(path);
    },
    navigated,
  };
}

function makeEvent(anchor, opts = {}) {
  let defaultPrevented = false;
  return {
    button: opts.button ?? 0,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    target: {
      closest(selector) {
        if (selector === "a[href]") return anchor;
        return null;
      },
    },
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
  };
}

function makeAnchor(href, attrs = {}) {
  const pathname = href.startsWith("/") ? href : "/" + href;
  return {
    getAttribute(name) {
      if (name === "href") return href;
      if (name === "target") return attrs.target || null;
      return null;
    },
    hasAttribute(name) {
      return name in attrs;
    },
    pathname,
    search: "",
    origin: "http://localhost",
  };
}

// Shim location
globalThis.location = { origin: "http://localhost" };

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("interceptLinks", () => {
  it("intercepts same-origin link clicks and calls router.navigate", () => {
    const router = makeRouter();
    const listeners = {};
    const root = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      removeEventListener() {},
    };

    interceptLinks(router, root);

    const anchor = makeAnchor("/about");
    const event = makeEvent(anchor);
    listeners.click(event);

    assert.equal(router.navigated.length, 1);
    assert.equal(router.navigated[0], "/about");
    assert.equal(event.defaultPrevented, true);
  });

  it("does not intercept links with data-external attribute", () => {
    const router = makeRouter();
    const listeners = {};
    const root = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      removeEventListener() {},
    };

    interceptLinks(router, root);

    const anchor = makeAnchor("/external", { "data-external": "" });
    const event = makeEvent(anchor);
    listeners.click(event);

    assert.equal(router.navigated.length, 0);
    assert.equal(event.defaultPrevented, false);
  });

  it("does not intercept middle-clicks or modified clicks", () => {
    const router = makeRouter();
    const listeners = {};
    const root = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      removeEventListener() {},
    };

    interceptLinks(router, root);

    const anchor = makeAnchor("/page");

    // Middle click
    listeners.click(makeEvent(anchor, { button: 1 }));
    assert.equal(router.navigated.length, 0);

    // Ctrl+click
    listeners.click(makeEvent(anchor, { ctrlKey: true }));
    assert.equal(router.navigated.length, 0);

    // Meta+click (Cmd on Mac)
    listeners.click(makeEvent(anchor, { metaKey: true }));
    assert.equal(router.navigated.length, 0);
  });

  it("does not intercept links with target attribute", () => {
    const router = makeRouter();
    const listeners = {};
    const root = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      removeEventListener() {},
    };

    interceptLinks(router, root);

    const anchor = makeAnchor("/new-tab", { target: "_blank" });
    anchor.getAttribute = (name) => {
      if (name === "href") return "/new-tab";
      if (name === "target") return "_blank";
      return null;
    };
    const event = makeEvent(anchor);
    listeners.click(event);

    assert.equal(router.navigated.length, 0);
  });

  it("does not intercept non-http links", () => {
    const router = makeRouter();
    const listeners = {};
    const root = {
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      removeEventListener() {},
    };

    interceptLinks(router, root);

    const mailAnchor = makeAnchor("mailto:test@test.com");
    mailAnchor.getAttribute = (name) =>
      name === "href" ? "mailto:test@test.com" : null;
    listeners.click(makeEvent(mailAnchor));

    assert.equal(router.navigated.length, 0);
  });

  it("returns a cleanup function that removes the listener", () => {
    const router = makeRouter();
    let removedType = null;
    const root = {
      addEventListener() {},
      removeEventListener(type) {
        removedType = type;
      },
    };

    const cleanup = interceptLinks(router, root);
    cleanup();

    assert.equal(removedType, "click");
  });
});
