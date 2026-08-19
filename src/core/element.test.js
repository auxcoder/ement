/**
 * Tests for core/element.js
 * Run with: node --test src/core/element.test.js
 *
 * Uses a minimal DOM shim since ElElement relies on browser APIs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Minimal DOM Shim ──────────────────────────────────────────────────────────

class MockTextNode {
  constructor(text) {
    this.textContent = text;
    this.nodeType = 3;
  }
}

class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.childNodes = [];
    this.parentElement = null;
    this.textContent = "";
  }
  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }
}

class MockDocumentFragment {
  constructor() {
    this.childNodes = [];
    this.nodeType = 11;
  }
  appendChild(child) {
    this.childNodes.push(child);
    return child;
  }
  cloneNode() {
    return this;
  }
}

class MockShadowRoot {
  constructor() {
    this.children = [];
    this.childNodes = [];
  }
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
  getElementById() {
    return null;
  }
  querySelector(selector) {
    // Simple class-based lookup for tests
    const className = selector.startsWith(".") ? selector.slice(1) : null;
    if (className) {
      return this.children.find((c) => c.className === className) || null;
    }
    return null;
  }
}

class MockHTMLElement {
  constructor() {
    this.parentElement = null;
    this._events = [];
  }
  attachShadow() {
    return new MockShadowRoot();
  }
  dispatchEvent(event) {
    this._events.push(event);
    return !event.defaultPrevented;
  }
}

class MockTemplateElement {
  constructor() {
    this._innerHTML = "";
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
    if (this.content.childNodes.length === 0 && val.includes("{{")) {
      this.content.childNodes.push(new MockTextNode(val));
    }
  }
  get innerHTML() {
    return this._innerHTML;
  }
}

// TreeWalker shim — walks text nodes
class MockTreeWalker {
  constructor(root) {
    this.nodes = [];
    this._index = -1;
    this._collectTextNodes(root);
  }
  _collectTextNodes(node) {
    if (node.nodeType === 3) {
      this.nodes.push(node);
      return;
    }
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
    if (tag === "template") return new MockTemplateElement();
    if (tag === "style") return { textContent: "" };
    return new MockElement(tag);
  },
  createTreeWalker(root) {
    return new MockTreeWalker(root);
  },
};
globalThis.fetch = async (url) => ({
  text: async () => `<div>fetched from ${url}</div>`,
});

globalThis.CustomEvent = class CustomEvent {
  constructor(name, options = {}) {
    this.type = name;
    this.detail = options.detail ?? null;
    this.bubbles = options.bubbles ?? false;
    this.composed = options.composed ?? false;
    this.cancelable = options.cancelable ?? false;
    this.defaultPrevented = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
};

// Import after shims
const { ElElement } = await import("./element.js");

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("ElElement", () => {
  describe("template resolution", () => {
    it("uses inline template string when available", async () => {
      class InlineComp extends ElElement {
        static template = "<p>Hello inline</p>";
      }
      await InlineComp._ensureResources();
      assert.equal(InlineComp._resolvedTemplate, "<p>Hello inline</p>");
    });

    it("fetches templateUrl and caches at class level", async () => {
      class FetchComp extends ElElement {
        static templateUrl = "http://example.com/comp.html";
      }
      await FetchComp._ensureResources();
      assert.equal(
        FetchComp._resolvedTemplate,
        "<div>fetched from http://example.com/comp.html</div>",
      );

      // Second call uses cache
      globalThis.fetch = async () => {
        throw new Error("should not fetch again");
      };
      await FetchComp._ensureResources();
      globalThis.fetch = async (url) => ({
        text: async () => `<div>fetched from ${url}</div>`,
      });
    });

    it("each subclass has its own cache", async () => {
      class CompA extends ElElement {
        static template = "<p>A</p>";
      }
      class CompB extends ElElement {
        static template = "<p>B</p>";
      }
      await CompA._ensureResources();
      await CompB._ensureResources();
      assert.equal(CompA._resolvedTemplate, "<p>A</p>");
      assert.equal(CompB._resolvedTemplate, "<p>B</p>");
    });
  });

  describe("template bindings ({{ prop }})", () => {
    it("parses and renders {{ prop }} from template", async () => {
      class BindComp extends ElElement {
        static template = "{{ greeting }}";
        greeting = "Hello World";
      }
      const comp = new BindComp();
      await comp.connectedCallback();

      // The template text node is appended to shadow root via the fragment
      const shadow = comp.shadowRoot;
      // Fragment's childNodes were appended to shadow
      const textNode = shadow.children.find(
        (c) => c.textContent !== undefined && c.textContent !== "",
      );
      assert.ok(textNode, "Should have a text node in shadow DOM");
      assert.equal(textNode.textContent, "Hello World");
    });

    it("updates binding automatically when property is set", async () => {
      class UpdateComp extends ElElement {
        static template = "{{ name }}";
        name = "Alice";
      }
      const comp = new UpdateComp();
      await comp.connectedCallback();

      const shadow = comp.shadowRoot;
      const boundNode = shadow.children.find((c) => c.textContent === "Alice");
      assert.ok(boundNode, 'Initial binding should render "Alice"');

      // Set property — should auto-update (no _notifyChange needed)
      comp.name = "Bob";

      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.equal(boundNode.textContent, "Bob");
    });

    it("handles multiple bindings to same property", async () => {
      class MultiComp extends ElElement {
        static template = "{{ x }} and {{ x }}";
        x = "hi";
      }
      const comp = new MultiComp();
      await comp.connectedCallback();

      const shadow = comp.shadowRoot;
      const textNode = shadow.children.find((c) =>
        c.textContent?.includes("hi"),
      );
      assert.ok(textNode, 'Should find text node with "hi"');
      assert.equal(textNode.textContent, "hi and hi");
    });
  });

  describe("attributeChangedCallback", () => {
    it("converts kebab-case to camelCase", () => {
      class AttrComp extends ElElement {
        static observedAttributes = ["user-name"];
      }
      const comp = new AttrComp();
      comp.attributeChangedCallback("user-name", null, "Alice");
      assert.equal(comp.userName, "Alice");
    });

    it("does not update if value unchanged", () => {
      class NoChangeComp extends ElElement {}
      const comp = new NoChangeComp();
      comp.userName = "Original";
      comp.attributeChangedCallback("user-name", "same", "same");
      assert.equal(comp.userName, "Original");
    });

    it("coerces Boolean attributes (presence = true)", () => {
      class BoolComp extends ElElement {
        static observedAttributes = ["is-active"];
        static propTypes = { isActive: Boolean };
      }
      const comp = new BoolComp();

      // Attribute present with empty value → true
      comp.attributeChangedCallback("is-active", null, "");
      assert.equal(comp.isActive, true);

      // Attribute with "false" string → false
      comp.attributeChangedCallback("is-active", "", "false");
      assert.equal(comp.isActive, false);

      // Attribute removed (null) → false
      comp.attributeChangedCallback("is-active", "false", null);
      assert.equal(comp.isActive, false);
    });

    it("coerces Number attributes", () => {
      class NumComp extends ElElement {
        static observedAttributes = ["count", "ratio"];
        static propTypes = { count: Number, ratio: Number };
      }
      const comp = new NumComp();

      comp.attributeChangedCallback("count", null, "42");
      assert.equal(comp.count, 42);

      comp.attributeChangedCallback("ratio", null, "3.14");
      assert.equal(comp.ratio, 3.14);

      // Invalid number → null
      comp.attributeChangedCallback("count", "42", "abc");
      assert.equal(comp.count, null);

      // Empty string → null
      comp.attributeChangedCallback("ratio", "3.14", "");
      assert.equal(comp.ratio, null);
    });

    it("leaves string attributes unchanged when no propTypes", () => {
      class StrComp extends ElElement {
        static observedAttributes = ["label"];
      }
      const comp = new StrComp();
      comp.attributeChangedCallback("label", null, "42");
      assert.equal(comp.label, "42"); // string, not number
    });

    it("attribute change auto-updates template binding (end-to-end)", async () => {
      class AttrBindComp extends ElElement {
        static template = "{{ userName }}";
        static observedAttributes = ["user-name"];
        userName = "Initial";
      }
      const comp = new AttrBindComp();
      await comp.connectedCallback();

      const shadow = comp.shadowRoot;
      const node = shadow.children.find((c) => c.textContent === "Initial");
      assert.ok(node, "Initial render should show 'Initial'");

      // Simulate attribute change (as if DOM setAttribute was called)
      comp.attributeChangedCallback("user-name", "Initial", "Updated");

      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.equal(node.textContent, "Updated");
    });
  });

  describe("lifecycle", () => {
    it("calls onInit after connectedCallback", async () => {
      let initCalled = false;
      class LifecycleComp extends ElElement {
        static template = "<p>hi</p>";
        onInit() {
          initCalled = true;
        }
      }
      const comp = new LifecycleComp();
      await comp.connectedCallback();
      assert.equal(initCalled, true);
    });

    it("calls onDestroy on disconnectedCallback", () => {
      let destroyed = false;
      class DestroyComp extends ElElement {
        static template = "";
        onDestroy() {
          destroyed = true;
        }
      }
      const comp = new DestroyComp();
      comp.disconnectedCallback();
      assert.equal(destroyed, true);
    });
  });

  describe("emit() — event emission", () => {
    it("dispatches a CustomEvent with detail", () => {
      class EmitComp extends ElElement {
        static template = "";
      }
      const comp = new EmitComp();
      comp.emit("item-selected", { id: 42 });

      const event = comp._events[0];
      assert.equal(event.type, "item-selected");
      assert.deepEqual(event.detail, { id: 42 });
    });

    it("sets bubbles and composed to true (crosses Shadow DOM)", () => {
      class BubbleComp extends ElElement {
        static template = "";
      }
      const comp = new BubbleComp();
      comp.emit("change", { value: "x" });

      const event = comp._events[0];
      assert.equal(event.bubbles, true);
      assert.equal(event.composed, true);
    });

    it("returns true if event was not cancelled", () => {
      class OkComp extends ElElement {
        static template = "";
      }
      const comp = new OkComp();
      const result = comp.emit("action");
      assert.equal(result, true);
    });

    it("supports cancelable events", () => {
      class CancelComp extends ElElement {
        static template = "";
      }
      const comp = new CancelComp();
      comp.emit("navigate", { path: "/home" }, { cancelable: true });

      const event = comp._events[0];
      assert.equal(event.cancelable, true);
    });
  });

  describe("show() — conditional display", () => {
    it("hides an element when condition is false", async () => {
      class ShowComp extends ElElement {
        static template = "<div>visible</div>";
      }
      const comp = new ShowComp();
      await comp.connectedCallback();

      // Add an element with className to shadow for querySelector
      const el = { className: "loading", style: { display: "" } };
      comp.shadowRoot.children.push(el);

      comp.show(".loading", false);
      assert.equal(el.style.display, "none");
    });

    it("shows an element when condition is true", async () => {
      class ShowComp2 extends ElElement {
        static template = "<div>visible</div>";
      }
      const comp = new ShowComp2();
      await comp.connectedCallback();

      const el = { className: "content", style: { display: "none" } };
      comp.shadowRoot.children.push(el);

      comp.show(".content", true);
      assert.equal(el.style.display, "");
    });
  });

  describe("when() — conditional rendering", () => {
    it("creates content when condition is true", async () => {
      class WhenComp extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new WhenComp();
      await comp.connectedCallback();

      const container = {
        className: "target",
        children: [],
        appendChild(c) {
          this.children.push(c);
          return c;
        },
      };
      comp.shadowRoot.children.push(container);

      const node = { textContent: "Created!" };
      comp.when(".target", true, () => node);

      assert.equal(container.children[0], node);
    });

    it("removes content when condition is false", async () => {
      class WhenComp2 extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new WhenComp2();
      await comp.connectedCallback();

      let removed = false;
      const node = {
        textContent: "Temp",
        remove() {
          removed = true;
        },
      };
      const container = {
        className: "box",
        children: [],
        appendChild(c) {
          this.children.push(c);
          return c;
        },
      };
      comp.shadowRoot.children.push(container);

      // Create first
      comp.when(".box", true, () => node);
      assert.equal(container.children.length, 1);

      // Remove
      comp.when(".box", false, () => node);
      assert.equal(removed, true);
    });

    it("does not re-create if already present", async () => {
      class WhenComp3 extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new WhenComp3();
      await comp.connectedCallback();

      let createCount = 0;
      const container = {
        className: "slot",
        children: [],
        appendChild(c) {
          this.children.push(c);
          return c;
        },
      };
      comp.shadowRoot.children.push(container);

      comp.when(".slot", true, () => {
        createCount++;
        return { text: "hi" };
      });
      comp.when(".slot", true, () => {
        createCount++;
        return { text: "hi" };
      });

      assert.equal(createCount, 1);
    });
  });

  describe("repeat() — list rendering", () => {
    function makeContainer() {
      return {
        className: "list",
        childNodes: [],
        innerHTML: "",
        appendChild(c) {
          this.childNodes.push(c);
          return c;
        },
      };
    }

    it("renders a list of items", async () => {
      class ListComp extends ElElement {
        static template = "<ul>x</ul>";
      }
      const comp = new ListComp();
      await comp.connectedCallback();

      const container = makeContainer();
      comp.shadowRoot.children.push(container);

      const items = ["Apple", "Banana", "Cherry"];
      comp.repeat(".list", items, (item) => ({ textContent: item }));

      assert.equal(container.childNodes.length, 3);
      assert.equal(container.childNodes[0].textContent, "Apple");
      assert.equal(container.childNodes[1].textContent, "Banana");
      assert.equal(container.childNodes[2].textContent, "Cherry");
    });

    it("reuses existing nodes by key", async () => {
      class KeyComp extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new KeyComp();
      await comp.connectedCallback();

      const container = makeContainer();
      comp.shadowRoot.children.push(container);

      const items = [
        { id: 1, text: "A" },
        { id: 2, text: "B" },
      ];
      comp.repeat(
        ".list",
        items,
        (item) => ({ textContent: item.text, id: item.id }),
        (item) => item.id,
      );

      const firstNode = container.childNodes[0];
      const secondNode = container.childNodes[1];

      // Re-render with same keys — nodes should be reused
      comp.repeat(
        ".list",
        items,
        (item) => ({ textContent: item.text, id: item.id }),
        (item) => item.id,
      );

      assert.strictEqual(container.childNodes[0], firstNode);
      assert.strictEqual(container.childNodes[1], secondNode);
    });

    it("removes nodes for items no longer in list", async () => {
      class RemoveComp extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new RemoveComp();
      await comp.connectedCallback();

      const container = makeContainer();
      comp.shadowRoot.children.push(container);

      let removedKeys = [];
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      comp.repeat(
        ".list",
        items,
        (item) => ({
          textContent: item.id,
          __ngKey: item.id,
          remove() {
            removedKeys.push(item.id);
          },
        }),
        (item) => item.id,
      );

      assert.equal(container.childNodes.length, 3);

      // Remove middle item
      comp.repeat(
        ".list",
        [{ id: 1 }, { id: 3 }],
        (item) => ({
          textContent: item.id,
          remove() {
            removedKeys.push(item.id);
          },
        }),
        (item) => item.id,
      );

      assert.equal(container.childNodes.length, 2);
      assert.ok(removedKeys.includes(2));
    });

    it("adds new nodes for new items", async () => {
      class AddComp extends ElElement {
        static template = "<div>x</div>";
      }
      const comp = new AddComp();
      await comp.connectedCallback();

      const container = makeContainer();
      comp.shadowRoot.children.push(container);

      comp.repeat(
        ".list",
        [{ id: 1 }],
        (item) => ({ textContent: item.id }),
        (item) => item.id,
      );
      assert.equal(container.childNodes.length, 1);

      comp.repeat(
        ".list",
        [{ id: 1 }, { id: 2 }],
        (item) => ({ textContent: item.id }),
        (item) => item.id,
      );
      assert.equal(container.childNodes.length, 2);
    });
  });

  describe("onChanges lifecycle hook", () => {
    it("fires with correct previous/current values", async () => {
      let receivedChanges;
      class ChangesComp extends ElElement {
        static template = "{{ name }}";
        name = "Alice";
        onChanges(changes) { receivedChanges = changes; }
      }
      const comp = new ChangesComp();
      await comp.connectedCallback();

      comp.name = "Bob";
      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.ok(receivedChanges);
      assert.equal(receivedChanges.name.previous, "Alice");
      assert.equal(receivedChanges.name.current, "Bob");
    });

    it("batches multiple changes in same tick into one call", async () => {
      let callCount = 0;
      let receivedChanges;
      class BatchComp extends ElElement {
        static template = "{{ first }} {{ last }}";
        first = "A";
        last = "B";
        onChanges(changes) { callCount++; receivedChanges = changes; }
      }
      const comp = new BatchComp();
      await comp.connectedCallback();

      comp.first = "X";
      comp.last = "Y";
      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.equal(callCount, 1); // one call, not two
      assert.ok(receivedChanges.first);
      assert.ok(receivedChanges.last);
      assert.equal(receivedChanges.first.current, "X");
      assert.equal(receivedChanges.last.current, "Y");
    });

    it("firstChange is true when previous was undefined", async () => {
      let receivedChanges;
      class FirstComp extends ElElement {
        static template = "{{ score }}";
        score = undefined;
        onChanges(changes) { receivedChanges = changes; }
      }
      const comp = new FirstComp();
      await comp.connectedCallback();

      comp.score = 100;
      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.equal(receivedChanges.score.firstChange, true);
      assert.equal(receivedChanges.score.current, 100);
    });

    it("does not fire if value is the same (Object.is)", async () => {
      let callCount = 0;
      class SameComp extends ElElement {
        static template = "{{ count }}";
        count = 5;
        onChanges() { callCount++; }
      }
      const comp = new SameComp();
      await comp.connectedCallback();

      comp.count = 5; // same value
      const { flushUpdates } = await import("./scheduler.js");
      flushUpdates();

      assert.equal(callCount, 0);
    });

    it("does not fire during initial setup (before onInit completes)", async () => {
      let callCount = 0;
      class InitComp extends ElElement {
        static template = "{{ value }}";
        value = "initial";
        onChanges() { callCount++; }
      }
      const comp = new InitComp();
      await comp.connectedCallback();

      // onChanges should NOT have fired during setup
      assert.equal(callCount, 0);
    });
  });
});
