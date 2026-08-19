/**
  JSON.stringify is the default
  FormData is for:
  - File uploads (multipart/form-data)
  - Traditional HTML form submissions
  - Sending binary data mixed with text
  FormData can't represent nested objects, arrays, or typed values cleanly:
  { user: { name: 'Alice', roles: ['admin', 'editor'] } }
  As FormData: user[name]=Alice&user[roles][0]=admin... ugly, non-standard
*/

/**
 * HTTP client wrapping fetch() with interceptor pipeline.
 * Replaces AngularJS's $http service.
 *
 * @module http/http
 */

export class Http {
  #baseUrl;
  #interceptors;
  #defaultHeaders;
  #activeRequests = new Set();
  #timeout;
  #retries;
  #retryDelay;

  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl=''] - Base URL prepended to all requests
   * @param {Array} [options.interceptors=[]] - Request/response interceptor objects
   * @param {Object} [options.headers={}] - Default headers for all requests
   * @param {number} [options.timeout=0] - Default timeout in ms (0 = no timeout)
   * @param {number} [options.retries=0] - Default retry count on failure
   * @param {number} [options.retryDelay=1000] - Base delay between retries (exponential backoff)
   */
  constructor({
    baseUrl = "",
    interceptors = [],
    headers = {},
    timeout = 0,
    retries = 0,
    retryDelay = 1000,
  } = {}) {
    this.#baseUrl = baseUrl;
    this.#interceptors = interceptors;
    this.#defaultHeaders = headers;
    this.#timeout = timeout;
    this.#retries = retries;
    this.#retryDelay = retryDelay;
  }

  /**
   * Make an HTTP request.
   *
   * @param {string} url - URL path (appended to baseUrl)
   * @param {Object} [options] - fetch options
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation
   * @param {number} [options.timeout] - Timeout in ms (overrides default)
   * @param {number} [options.retries] - Retry count (overrides default)
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    const maxRetries = options.retries ?? this.#retries;
    const timeout = options.timeout ?? this.#timeout;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.#doRequest(url, options, timeout);
      } catch (error) {
        lastError = error;

        // Don't retry on abort or client errors (4xx)
        if (error.name === "AbortError") throw error;
        if (error.name === "TimeoutError") throw error;
        if (
          error instanceof HttpError &&
          error.status >= 400 &&
          error.status < 500
        )
          throw error;

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = this.#retryDelay * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Internal — single request attempt (no retry logic).
   * @private
   */
  async #doRequest(url, options, timeout) {
    // Create an internal AbortController that we can cancel from cancelAll()
    const internalController = new AbortController();
    this.#activeRequests.add(internalController);

    // If caller provided a signal, link it to our internal one
    if (options.signal) {
      if (options.signal.aborted) {
        this.#activeRequests.delete(internalController);
        throw new DOMException("Aborted", "AbortError");
      }
      options.signal.addEventListener("abort", () =>
        internalController.abort(),
      );
    }

    // Timeout: abort after N ms
    let timeoutId;
    if (timeout > 0) {
      timeoutId = setTimeout(() => internalController.abort(), timeout);
    }

    let config = {
      url: this.#baseUrl + url,
      headers: { ...this.#defaultHeaders, ...options.headers },
      ...options,
      signal: internalController.signal,
    };

    // Run request interceptors
    for (const interceptor of this.#interceptors) {
      if (interceptor.request) {
        config = await interceptor.request(config);
      }
    }

    const { url: finalUrl, ...fetchOptions } = config;
    let response;

    try {
      response = await fetch(finalUrl, fetchOptions);
    } catch (error) {
      // Network error — run error interceptors
      clearTimeout(timeoutId);
      this.#activeRequests.delete(internalController);

      // Convert abort due to timeout into a TimeoutError
      if (
        timeout > 0 &&
        error.name === "AbortError" &&
        !options.signal?.aborted
      ) {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
      }

      for (const interceptor of this.#interceptors) {
        if (interceptor.requestError) {
          await interceptor.requestError(error, config);
        }
      }
      throw error;
    }

    // Run response interceptors
    for (const interceptor of this.#interceptors) {
      if (interceptor.response) {
        response = await interceptor.response(response, config);
      }
    }

    if (!response.ok) {
      clearTimeout(timeoutId);
      this.#activeRequests.delete(internalController);
      const error = new HttpError(
        response.status,
        response.statusText,
        response,
      );

      for (const interceptor of this.#interceptors) {
        if (interceptor.responseError) {
          const result = await interceptor.responseError(error, config);
          if (result) return result; // interceptor handled it (e.g., retry)
        }
      }

      throw error;
    }

    clearTimeout(timeoutId);
    this.#activeRequests.delete(internalController);
    return response;
  }

  /**
   * Cancel all in-flight requests.
   * Useful when a component disconnects and pending requests should be aborted.
   */
  cancelAll() {
    for (const controller of this.#activeRequests) {
      controller.abort();
    }
    this.#activeRequests.clear();
  }

  /**
   * Number of currently in-flight requests.
   * @returns {number}
   */
  get pendingCount() {
    return this.#activeRequests.size;
  }

  /**
   * GET request. Returns parsed JSON by default.
   */
  async get(url, options = {}) {
    const response = await this.request(url, { ...options, method: "GET" });
    return response.json();
  }

  /**
   * POST request with JSON body.
   */
  /**
   * POST request. Auto-serializes plain objects as JSON.
   * FormData, Blob, string, and other body types are sent as-is.
   */
  async post(url, body, options = {}) {
    const { serialized, headers } = this.#prepareBody(body);
    const response = await this.request(url, {
      ...options,
      method: "POST",
      body: serialized,
      headers: { ...headers, ...options.headers },
    });
    return response.json();
  }

  /**
   * PUT request. Auto-serializes plain objects as JSON.
   */
  async put(url, body, options = {}) {
    const { serialized, headers } = this.#prepareBody(body);
    const response = await this.request(url, {
      ...options,
      method: "PUT",
      body: serialized,
      headers: { ...headers, ...options.headers },
    });
    return response.json();
  }

  /**
   * PATCH request. Auto-serializes plain objects as JSON.
   */
  async patch(url, body, options = {}) {
    const { serialized, headers } = this.#prepareBody(body);
    const response = await this.request(url, {
      ...options,
      method: "PATCH",
      body: serialized,
      headers: { ...headers, ...options.headers },
    });
    return response.json();
  }

  /**
   * DELETE request.
   */
  async delete(url, options = {}) {
    const response = await this.request(url, { ...options, method: "DELETE" });
    if (response.headers?.get?.("content-length") === "0") return null;
    return response.json().catch(() => null);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  /**
   * Detect body type and prepare for fetch.
   * - Plain objects → JSON.stringify + Content-Type: application/json
   * - FormData, Blob, string, ArrayBuffer, etc. → sent as-is (no Content-Type override)
   * @private
   */
  #prepareBody(body) {
    // null/undefined — no body
    if (body == null) return { serialized: null, headers: {} };

    // Already a string — send as-is with JSON content type (assume JSON string)
    if (typeof body === "string") {
      return {
        serialized: body,
        headers: { "Content-Type": "application/json" },
      };
    }

    // FormData — let browser set Content-Type (includes boundary)
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      return { serialized: body, headers: {} };
    }

    // Blob / ArrayBuffer / ReadableStream / URLSearchParams — send as-is
    if (
      (typeof Blob !== "undefined" && body instanceof Blob) ||
      (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) ||
      (typeof ReadableStream !== "undefined" &&
        body instanceof ReadableStream) ||
      (typeof URLSearchParams !== "undefined" &&
        body instanceof URLSearchParams)
    ) {
      return { serialized: body, headers: {} };
    }

    // Plain object or array → JSON
    return {
      serialized: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    };
  }
}

/**
 * HTTP error with status code and response.
 */
export class HttpError extends Error {
  constructor(status, statusText, response) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.response = response;
  }
}
