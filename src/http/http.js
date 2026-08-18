/**
 * HTTP client wrapping fetch() with interceptor pipeline.
 * Replaces AngularJS's $http service.
 *
 * @module http/http
 */

export class Http {
  // TODO: Phase 5, Tasks 5.1 - 5.4
  // - get, post, put, delete, patch methods
  // - Request/response interceptor pipeline
  // - AbortController integration (request cancellation)
  // - Retry with exponential backoff
  // - Timeout via AbortSignal.timeout()
}

export class HttpError extends Error {
  constructor(status, statusText, response) {
    super(`HTTP ${status}: ${statusText}`);
    this.status = status;
    this.response = response;
  }
}
