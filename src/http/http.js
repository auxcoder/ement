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
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    let config = {
      url: this.#baseUrl + url,
      headers: { ...this.#defaultHeaders, ...options.headers },
      ...options,
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
      const error = new HttpError(response.status, response.statusText, response);

      for (const interceptor of this.#interceptors) {
        if (interceptor.responseError) {
          const result = await interceptor.responseError(error, config);
          if (result) return result; // interceptor handled it (e.g., retry)
        }
      }

      throw error;
    }

    return response;
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
