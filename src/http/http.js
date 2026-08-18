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

  /**
   * @param {Object} [options]
   * @param {string} [options.baseUrl=''] - Base URL prepended to all requests
   * @param {Array} [options.interceptors=[]] - Request/response interceptor objects
   * @param {Object} [options.headers={}] - Default headers for all requests
   */
  constructor({ baseUrl = '', interceptors = [], headers = {} } = {}) {
    this.#baseUrl = baseUrl;
    this.#interceptors = interceptors;
    this.#defaultHeaders = headers;
  }

  /**
   * Make an HTTP request.
   *
   * @param {string} url - URL path (appended to baseUrl)
   * @param {Object} [options] - fetch options
   * @param {AbortSignal} [options.signal] - Optional abort signal for cancellation
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    // Create an internal AbortController that we can cancel from cancelAll()
    const internalController = new AbortController();
    this.#activeRequests.add(internalController);

    // If caller provided a signal, link it to our internal one
    if (options.signal) {
      options.signal.addEventListener('abort', () => internalController.abort());
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
      this.#activeRequests.delete(internalController);
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
      this.#activeRequests.delete(internalController);
      const error = new HttpError(response.status, response.statusText, response);

      for (const interceptor of this.#interceptors) {
        if (interceptor.responseError) {
          const result = await interceptor.responseError(error, config);
          if (result) return result; // interceptor handled it (e.g., retry)
        }
      }

      throw error;
    }

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
    const response = await this.request(url, { ...options, method: 'GET' });
    return response.json();
  }

  /**
   * POST request with JSON body.
   */
  async post(url, body, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.json();
  }

  /**
   * PUT request with JSON body.
   */
  async put(url, body, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.json();
  }

  /**
   * PATCH request with JSON body.
   */
  async patch(url, body, options = {}) {
    const response = await this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    return response.json();
  }

  /**
   * DELETE request.
   */
  async delete(url, options = {}) {
    const response = await this.request(url, { ...options, method: 'DELETE' });
    if (response.headers?.get?.('content-length') === '0') return null;
    return response.json().catch(() => null);
  }
}

/**
 * HTTP error with status code and response.
 */
export class HttpError extends Error {
  constructor(status, statusText, response) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
  }
}
