# ElHttp

`fetch`-based HTTP client with interceptors, timeout, and automatic retry. Replaces AngularJS's `$http`.

**Module:** `http/http`
**Exports:** `ElHttp`, `HttpError`

## Constructor

```javascript
new ElHttp(options?)
```

| Option         | Type     | Default | Description                                        |
| -------------- | -------- | ------- | -------------------------------------------------- |
| `baseUrl`      | `string` | `''`    | Prepended to every request URL                     |
| `interceptors` | `Array`  | `[]`    | Request/response interceptor objects               |
| `headers`      | `Object` | `{}`    | Default headers sent with every request            |
| `timeout`      | `number` | `0`     | Default timeout in ms (`0` = none)                 |
| `retries`      | `number` | `0`     | Default retry count on failure                     |
| `retryDelay`   | `number` | `1000`  | Base delay for exponential backoff between retries |

## HTTP methods

All methods return parsed JSON by default. They throw `HttpError` on non-2xx responses.

```javascript
const http = new ElHttp({ baseUrl: "/api" });

const users = await http.get("/users");
const user = await http.post("/users", { name: "Alice", email: "a@b.com" });
const saved = await http.put("/users/1", updatedUser);
const patched = await http.patch("/users/1", { name: "Bob" });
await http.delete("/users/1");
```

### Body serialization

`post`, `put`, `patch` auto-serialize the body:

| Body type                                                  | Behavior                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| Plain object / array                                       | `JSON.stringify` + `Content-Type: application/json`           |
| `string`                                                   | Sent as-is + `Content-Type: application/json`                 |
| `FormData`                                                 | Sent as-is (browser sets `multipart/form-data` with boundary) |
| `Blob`, `ArrayBuffer`, `ReadableStream`, `URLSearchParams` | Sent as-is, no `Content-Type` override                        |

### `request(url, options?)`

Low-level method for full control. Returns a `Response` object (not parsed JSON).

```javascript
const response = await http.request("/users", {
  method: "GET",
  signal: abortController.signal,
  timeout: 5000,
  retries: 2,
});
const data = await response.json();
```

Per-request `timeout` and `retries` override the instance defaults.

## Interceptors

An interceptor is a plain object with optional `request`, `requestError`, `response`, and `responseError` hooks:

```javascript
const authInterceptor = {
  request: (config) => {
    config.headers["Authorization"] = `Bearer ${getToken()}`;
    return config;
  },
  response: (response) => {
    // Can transform the response before it reaches the caller
    return response;
  },
  responseError: async (error, config) => {
    // Can recover: return a new response to suppress the error
    if (error.status === 401) {
      await refreshToken();
      return fetch(config.url, config); // retry
    }
    // Otherwise re-throw by returning nothing
  },
};

const http = new ElHttp({ interceptors: [authInterceptor] });
```

## Cancellation

```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 2000);

const data = await http.get("/slow-endpoint", { signal: controller.signal });
```

### `http.cancelAll()`

Abort all in-flight requests at once. Useful in component `disconnectedCallback`:

```javascript
disconnectedCallback() {
  this.http.cancelAll();
}
```

## `HttpError`

Thrown on non-2xx responses.

| Property         | Description                    |
| ---------------- | ------------------------------ |
| `error.status`   | HTTP status code               |
| `error.response` | The original `Response` object |
| `error.message`  | `"HTTP 404: Not Found"`        |

```javascript
try {
  await http.get("/users/999");
} catch (e) {
  if (e instanceof HttpError && e.status === 404) {
    // handle not found
  }
}
```

## AngularJS comparison

| AngularJS `$http`                             | Ement `ElHttp`                               |
| --------------------------------------------- | -------------------------------------------- |
| `$http.get('/api/users')`                     | `http.get('/users')`                         |
| Interceptors via `$httpProvider.interceptors` | `new ElHttp({ interceptors: [...] })`        |
| Returns `{ data, status, headers }`           | Returns parsed JSON directly                 |
| `$http.defaults.headers`                      | `new ElHttp({ headers: {...} })`             |
| No built-in timeout per request               | `timeout` option per instance or per request |
| No retry                                      | `retries` + exponential backoff              |
