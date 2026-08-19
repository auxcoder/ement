/**
 * Tests for http/http.js
 * Run with: node --test src/http/http.test.js
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ElHttp, HttpError } from "./http.js";

// ─── Mock fetch ────────────────────────────────────────────────────────────────

let lastFetchUrl;
let lastFetchOptions;
let mockResponse;

globalThis.fetch = async (url, options) => {
  lastFetchUrl = url;
  lastFetchOptions = options;
  return mockResponse;
};

function setMockResponse(
  body,
  { status = 200, statusText = "OK", headers = {} } = {},
) {
  mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: { get: (key) => headers[key] || null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("Http", () => {
  beforeEach(() => {
    lastFetchUrl = null;
    lastFetchOptions = null;
    setMockResponse({ success: true });
  });

  describe("basic requests", () => {
    it("GET returns parsed JSON", async () => {
      setMockResponse({ users: [{ name: "Alice" }] });
      const http = new ElHttp({ baseUrl: "http://api.test" });

      const result = await http.get("/users");

      assert.equal(lastFetchUrl, "http://api.test/users");
      assert.equal(lastFetchOptions.method, "GET");
      assert.deepEqual(result, { users: [{ name: "Alice" }] });
    });

    it("POST sends JSON body", async () => {
      setMockResponse({ id: 1 });
      const http = new ElHttp({ baseUrl: "http://api.test" });

      const result = await http.post("/users", { name: "Bob" });

      assert.equal(lastFetchOptions.method, "POST");
      assert.equal(lastFetchOptions.body, '{"name":"Bob"}');
      assert.equal(
        lastFetchOptions.headers["Content-Type"],
        "application/json",
      );
      assert.deepEqual(result, { id: 1 });
    });

    it("PUT sends JSON body", async () => {
      setMockResponse({ updated: true });
      const http = new ElHttp();

      await http.put("/items/1", { name: "Updated" });

      assert.equal(lastFetchOptions.method, "PUT");
      assert.equal(lastFetchOptions.body, '{"name":"Updated"}');
    });

    it("PATCH sends JSON body", async () => {
      setMockResponse({ patched: true });
      const http = new ElHttp();

      await http.patch("/items/1", { status: "done" });

      assert.equal(lastFetchOptions.method, "PATCH");
      assert.equal(lastFetchOptions.body, '{"status":"done"}');
    });

    it("DELETE sends request", async () => {
      setMockResponse(null, { headers: { "content-length": "0" } });
      const http = new ElHttp();

      const result = await http.delete("/items/1");

      assert.equal(lastFetchOptions.method, "DELETE");
      assert.equal(result, null);
    });
  });

  describe("baseUrl and headers", () => {
    it("prepends baseUrl to all requests", async () => {
      setMockResponse({});
      const http = new ElHttp({ baseUrl: "https://api.example.com/v2" });

      await http.get("/users");

      assert.equal(lastFetchUrl, "https://api.example.com/v2/users");
    });

    it("sends default headers on all requests", async () => {
      setMockResponse({});
      const http = new ElHttp({ headers: { "X-App": "my-app" } });

      await http.get("/data");

      assert.equal(lastFetchOptions.headers["X-App"], "my-app");
    });
  });

  describe("error handling", () => {
    it("throws HttpError on non-ok response", async () => {
      setMockResponse(
        { error: "Not Found" },
        { status: 404, statusText: "Not Found" },
      );
      const http = new ElHttp();

      await assert.rejects(
        () => http.get("/missing"),
        (err) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 404);
          assert.equal(err.message, "HTTP 404: Not Found");
          return true;
        },
      );
    });
  });

  describe("interceptors", () => {
    it("request interceptor can add auth headers", async () => {
      setMockResponse({ data: "secret" });
      const http = new ElHttp({
        interceptors: [
          {
            request: async (config) => {
              config.headers["Authorization"] = "Bearer token123";
              return config;
            },
          },
        ],
      });

      await http.get("/protected");

      assert.equal(
        lastFetchOptions.headers["Authorization"],
        "Bearer token123",
      );
    });

    it("response interceptor can transform response", async () => {
      setMockResponse({ wrapped: { users: ["A"] } });
      const http = new ElHttp({
        interceptors: [
          {
            response: async (response) => {
              // Wrap json to unwrap .wrapped
              const original = response.json;
              response.json = async () => {
                const data = await original();
                return data.wrapped;
              };
              return response;
            },
          },
        ],
      });

      const result = await http.get("/users");

      assert.deepEqual(result, { users: ["A"] });
    });
  });

  describe("request cancellation", () => {
    it("cancels request via AbortSignal", async () => {
      // Make fetch that respects signal
      globalThis.fetch = (url, options) => {
        return new Promise((resolve, reject) => {
          if (options.signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      };

      const http = new ElHttp();
      const controller = new AbortController();

      const promise = http.get("/slow", { signal: controller.signal });

      // Abort after starting
      controller.abort();

      await assert.rejects(
        () => promise,
        (err) => {
          assert.equal(err.name, "AbortError");
          return true;
        },
      );

      // Restore
      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });

    it("cancelAll() aborts all in-flight requests", async () => {
      let abortedCount = 0;
      globalThis.fetch = (url, options) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener("abort", () => {
            abortedCount++;
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      };

      const http = new ElHttp({ baseUrl: "http://test" });

      // Fire off requests (don't await)
      http.get("/a").catch(() => {});
      http.get("/b").catch(() => {});

      assert.equal(http.pendingCount, 2);

      http.cancelAll();
      await new Promise((r) => setTimeout(r, 5));

      assert.equal(abortedCount, 2);
      assert.equal(http.pendingCount, 0);

      // Restore
      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });

    it("pendingCount tracks active requests", async () => {
      setMockResponse({ ok: true });
      const http = new ElHttp();

      assert.equal(http.pendingCount, 0);
      await http.get("/fast");
      assert.equal(http.pendingCount, 0); // completed
    });
  });

  describe("timeout", () => {
    it("throws TimeoutError when request exceeds timeout", async () => {
      // Fetch that hangs but respects abort signal
      globalThis.fetch = (url, options) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });

      const http = new ElHttp({ timeout: 50 });

      await assert.rejects(
        () => http.get("/slow"),
        (err) => {
          assert.equal(err.name, "TimeoutError");
          assert.ok(err.message.includes("50ms"));
          return true;
        },
      );

      // Restore
      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });

    it("per-request timeout overrides default", async () => {
      globalThis.fetch = (url, options) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });

      const http = new ElHttp({ timeout: 5000 }); // high default

      await assert.rejects(
        () => http.get("/slow", { timeout: 30 }), // low override
        (err) => {
          assert.equal(err.name, "TimeoutError");
          return true;
        },
      );

      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });
  });

  describe("retry", () => {
    it("retries on server error up to configured max", async () => {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 500,
          statusText: "Server Error",
          headers: { get: () => null },
          json: async () => ({}),
        };
      };

      const http = new ElHttp({ retries: 2, retryDelay: 10 });

      await assert.rejects(
        () => http.get("/failing"),
        (err) => err.status === 500,
      );

      // 1 initial + 2 retries = 3 attempts
      assert.equal(attempts, 3);

      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });

    it("does not retry on 4xx client errors", async () => {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts++;
        return {
          ok: false,
          status: 422,
          statusText: "Unprocessable",
          headers: { get: () => null },
          json: async () => ({}),
        };
      };

      const http = new ElHttp({ retries: 3, retryDelay: 10 });

      await assert.rejects(
        () => http.post("/bad-data", {}),
        (err) => err.status === 422,
      );

      assert.equal(attempts, 1); // no retries

      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });

    it("succeeds if retry recovers", async () => {
      let attempts = 0;
      globalThis.fetch = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Network error");
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ({ recovered: true }),
        };
      };

      const http = new ElHttp({ retries: 3, retryDelay: 10 });
      const result = await http.get("/flaky");

      assert.equal(attempts, 3);
      assert.deepEqual(result, { recovered: true });

      globalThis.fetch = async (url, options) => {
        lastFetchUrl = url;
        lastFetchOptions = options;
        return mockResponse;
      };
    });
  });
});
