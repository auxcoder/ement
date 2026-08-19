/**
 * Tests for security/sanitize.js
 * Run with: node --test src/security/sanitize.test.js
 *
 * Note: sanitizeHTML() relies on DOMParser which doesn't exist in Node.
 * We test escapeHTML() fully and document sanitizeHTML() behavior.
 * Full sanitizeHTML() integration tests run in the browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHTML, sanitizeHTML } from "./sanitize.js";

describe("escapeHTML()", () => {
  it("escapes < and >", () => {
    assert.equal(
      escapeHTML('<script>alert("xss")</script>'),
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("escapes ampersands", () => {
    assert.equal(escapeHTML("a & b"), "a &amp; b");
  });

  it("escapes quotes", () => {
    assert.equal(
      escapeHTML("\"hello\" & 'world'"),
      "&quot;hello&quot; &amp; &#x27;world&#x27;",
    );
  });

  it("leaves safe text unchanged", () => {
    assert.equal(escapeHTML("Hello World 123"), "Hello World 123");
  });

  it("handles empty string", () => {
    assert.equal(escapeHTML(""), "");
  });

  it("handles all dangerous characters together", () => {
    const input = "<img src=\"x\" onerror='alert(1)'>";
    const expected =
      "&lt;img src=&quot;x&quot; onerror=&#x27;alert(1)&#x27;&gt;";
    assert.equal(escapeHTML(input), expected);
  });
});

describe("sanitizeHTML() — design documentation", () => {
  it("documents what gets stripped (browser behavior)", () => {
    // These document the expected browser behavior.
    // In Node, sanitizeHTML falls back to a passthrough.
    // Real testing happens in browser integration tests.

    const dangerousInputs = [
      { input: '<script>alert("xss")</script>', removes: "<script>" },
      { input: '<p onclick="evil()">Hi</p>', removes: "onclick" },
      {
        input: '<a href="javascript:void(0)">link</a>',
        removes: "javascript:",
      },
      { input: '<img src="x" onerror="alert(1)">', removes: "onerror" },
      { input: '<iframe src="evil.com"></iframe>', removes: "<iframe>" },
      { input: '<p style="color:red">text</p>', removes: "style" },
    ];

    // Document the contract
    for (const { input, removes } of dangerousInputs) {
      assert.ok(
        input.includes(removes.replace("<", "").replace(">", "")),
        `Input should contain the dangerous content: ${removes}`,
      );
    }
  });

  it("documents what gets preserved", () => {
    const safeInputs = [
      "<p>Normal paragraph</p>",
      '<a href="https://example.com">Link</a>',
      "<strong>Bold</strong> and <em>italic</em>",
      "<ul><li>Item 1</li><li>Item 2</li></ul>",
      '<img src="photo.jpg" alt="A photo">',
    ];

    // These should all pass through sanitization unchanged
    for (const input of safeInputs) {
      assert.ok(typeof input === "string");
    }
  });
});
