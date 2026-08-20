# sanitize

HTML sanitization and escaping. Replaces AngularJS's `$sce` + `$sanitize`.

**Module:** `security/sanitize`
**Exports:** `sanitizeHTML`, `escapeHTML`

## API

### `sanitizeHTML(html, options?)`

Parse and clean an untrusted HTML string. Disallowed tags are unwrapped (children kept); disallowed attributes and event handlers are stripped.

| Param                  | Type       | Description                                                                                                       |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `html`                 | `string`   | Untrusted HTML                                                                                                    |
| `options.allowedTags`  | `string[]` | Tags to preserve. Default covers common content tags.                                                             |
| `options.allowedAttrs` | `string[]` | Attributes to preserve on allowed tags. Default: `href`, `src`, `alt`, `title`, `class`, `id`, `width`, `height`. |

Returns a sanitized HTML string.

```javascript
import { sanitizeHTML } from "ement/security/sanitize";

sanitizeHTML('<p onclick="evil()">Hello <script>bad</script></p>');
// → '<p>Hello </p>'

sanitizeHTML('<b>Bold</b> and <iframe src="x"></iframe> text');
// → '<b>Bold</b> and  text'  — <iframe> unwrapped, content kept
```

#### Default allowed tags

`p`, `br`, `b`, `i`, `em`, `strong`, `a`, `ul`, `ol`, `li`,
`h1`–`h6`, `blockquote`, `code`, `pre`, `span`, `div`, `img`,
`table`, `thead`, `tbody`, `tr`, `td`, `th`

#### Custom allowed tags

```javascript
sanitizeHTML(userContent, {
  allowedTags: ["p", "br", "b", "i", "a"],
  allowedAttrs: ["href"],
});
```

### `escapeHTML(text)`

Escape a plain text string for safe insertion into HTML. Replaces `&`, `<`, `>`, `"`, `'` with HTML entities.

```javascript
import { escapeHTML } from "ement/security/sanitize";

escapeHTML('<script>alert("xss")</script>');
// → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
```

Use this when inserting user-provided plain text into HTML (not rich content). For rich content, use `sanitizeHTML`.

## What is always stripped

Regardless of `allowedAttrs`:

- All `on*` event handler attributes (`onclick`, `onload`, `onerror`, etc.)
- `javascript:` URIs in `href` or `src`
- `data:` URIs in `href` or `src` (except `data:image/` which is allowed)
- HTML comment nodes

## AngularJS comparison

| AngularJS                               | Ement                                               |
| --------------------------------------- | --------------------------------------------------- |
| `$sce.trustAsHtml(html)`                | Not needed — use `sanitizeHTML` to clean, then bind |
| `ngSanitize` module + `$sanitize(html)` | `sanitizeHTML(html)` — no module, no DI             |
| Allowed tag list in `$sanitizeProvider` | `options.allowedTags` per call                      |
