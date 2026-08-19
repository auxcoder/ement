/**
 * Tests for di/container.js
 * Run with: node --test src/di/container.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Container } from "./container.js";

// Test tokens
const HttpToken = Symbol("Http");
const LoggerToken = Symbol("Logger");
const DbToken = Symbol("Db");
const AuthToken = Symbol("Auth");

describe("Container", () => {
  describe("register + resolve", () => {
    it("resolves a registered token", () => {
      const container = new Container();
      const mockHttp = { get: () => {} };
      container.register(HttpToken, () => mockHttp);

      const result = container.resolve(HttpToken);
      assert.strictEqual(result, mockHttp);
    });

    it("throws when resolving an unregistered token", () => {
      const container = new Container();

      assert.throws(
        () => container.resolve(HttpToken),
        /No provider registered for/,
      );
    });

    it("passes the container to the factory (for resolving dependencies)", () => {
      const container = new Container();
      container.register(LoggerToken, () => ({ log: () => {} }));
      container.register(HttpToken, (c) => {
        const logger = c.resolve(LoggerToken);
        return { logger, get: () => {} };
      });

      const http = container.resolve(HttpToken);
      assert.ok(http.logger);
      assert.ok(http.logger.log);
    });
  });

  describe("singleton lifetime", () => {
    it("returns the same instance on multiple resolves (default: singleton)", () => {
      const container = new Container();
      let callCount = 0;
      container.register(HttpToken, () => {
        callCount++;
        return { id: callCount };
      });

      const first = container.resolve(HttpToken);
      const second = container.resolve(HttpToken);

      assert.strictEqual(first, second);
      assert.equal(callCount, 1);
    });

    it("returns different instances when singleton: false (transient)", () => {
      const container = new Container();
      let callCount = 0;
      container.register(
        HttpToken,
        () => {
          callCount++;
          return { id: callCount };
        },
        { singleton: false },
      );

      const first = container.resolve(HttpToken);
      const second = container.resolve(HttpToken);

      assert.notStrictEqual(first, second);
      assert.equal(first.id, 1);
      assert.equal(second.id, 2);
      assert.equal(callCount, 2);
    });
  });

  describe("circular dependency detection", () => {
    it("throws on circular dependency", () => {
      const container = new Container();

      // A depends on B, B depends on A
      container.register(HttpToken, (c) => {
        return { db: c.resolve(DbToken) };
      });
      container.register(DbToken, (c) => {
        return { http: c.resolve(HttpToken) };
      });

      assert.throws(
        () => container.resolve(HttpToken),
        /Circular dependency detected/,
      );
    });
  });

  describe("container hierarchy", () => {
    it("child resolves from parent when not overridden", () => {
      const parent = new Container();
      const mockHttp = { get: () => "parent-http" };
      parent.register(HttpToken, () => mockHttp);

      const child = parent.createChild();

      assert.strictEqual(child.resolve(HttpToken), mockHttp);
    });

    it("child override shadows parent without affecting parent", () => {
      const parent = new Container();
      const parentHttp = { source: "parent" };
      const childHttp = { source: "child" };

      parent.register(HttpToken, () => parentHttp);
      const child = parent.createChild();
      child.register(HttpToken, () => childHttp);

      assert.strictEqual(child.resolve(HttpToken), childHttp);
      assert.strictEqual(parent.resolve(HttpToken), parentHttp);
    });

    it("resolution walks up the chain: child → parent → grandparent", () => {
      const grandparent = new Container();
      const logger = { log: () => {} };
      grandparent.register(LoggerToken, () => logger);

      const parent = grandparent.createChild();
      const child = parent.createChild();

      assert.strictEqual(child.resolve(LoggerToken), logger);
    });

    it("child throws when token is not in any ancestor", () => {
      const parent = new Container();
      const child = parent.createChild();

      assert.throws(
        () => child.resolve(AuthToken),
        /No provider registered for/,
      );
    });
  });

  describe("has()", () => {
    it("returns true for registered tokens", () => {
      const container = new Container();
      container.register(HttpToken, () => ({}));

      assert.equal(container.has(HttpToken), true);
      assert.equal(container.has(LoggerToken), false);
    });

    it("checks parent containers", () => {
      const parent = new Container();
      parent.register(HttpToken, () => ({}));
      const child = parent.createChild();

      assert.equal(child.has(HttpToken), true);
      assert.equal(child.has(LoggerToken), false);
    });
  });

  describe("re-registration", () => {
    it("replaces previous registration", () => {
      const container = new Container();
      container.register(HttpToken, () => ({ version: 1 }));
      const v1 = container.resolve(HttpToken);
      assert.equal(v1.version, 1);

      // Re-register clears singleton cache
      container.register(HttpToken, () => ({ version: 2 }));
      const v2 = container.resolve(HttpToken);
      assert.equal(v2.version, 2);
    });
  });
});
