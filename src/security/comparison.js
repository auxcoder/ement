/**
 * Comparative Example: $sce/$sanitize vs Trusted Types/DOMParser
 *
 * Run with: node src/security/comparison.js
 *
 * @module security/comparison
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Comparative Example: AngularJS Security vs ng-modern');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('─── 1. AngularJS ($sce + $sanitize) ───────────────────────────\n');
console.log(`
  // Rendering HTML in templates requires explicit trust:
  <div ng-bind-html="trustedHtml"></div>

  // Controller:
  $scope.trustedHtml = $sce.trustAsHtml(userContent);
  // OR with ngSanitize module:
  $scope.trustedHtml = $sanitize(userContent);

  // $sce contexts:
  $sce.trustAsHtml(val)         // trust for HTML insertion
  $sce.trustAsUrl(val)          // trust for URL binding
  $sce.trustAsResourceUrl(val)  // trust for template/iframe URLs

  // Configuration:
  $sceDelegateProvider.trustedResourceUrlList(['self', 'https://cdn.example.com/**']);
  $sceDelegateProvider.bannedResourceUrlList(['**']);

  ❌ ISSUES:
  • $sce.trustAsHtml() is essentially "I trust this, skip sanitization"
    → developers use it to bypass security when $sanitize is too strict
  • $sanitize uses its own HTML parser (not the browser's)
    → parser differentials can be exploited (mXSS)
  • Template expressions use eval()-like compilation (new Function)
    → incompatible with strict CSP (Content-Security-Policy)
  • No integration with browser's Trusted Types API
`);

console.log('─── 2. ng-modern (DOMParser + CSP-safe) ───────────────────────\n');
console.log(`
  import { sanitizeHTML, escapeHTML } from 'ng-modern/security/sanitize';

  // Sanitize untrusted HTML (DOMParser-based):
  const clean = sanitizeHTML(userContent, {
    allowedTags: ['p', 'b', 'i', 'a', 'ul', 'li'],
    allowedAttrs: ['href', 'class']
  });

  // In a component — safe HTML rendering:
  class MyComp extends NgElement {
    renderContent(html) {
      const clean = sanitizeHTML(html);
      this.shadowRoot.querySelector('.content').innerHTML = clean;
    }
  }

  // Escape for text insertion (no HTML parsing needed):
  element.textContent = escapeHTML(userInput);
  // OR just use textContent directly (already safe):
  element.textContent = userInput;

  // CSP Compatibility:
  // • No eval() or new Function() anywhere in the framework
  // • Template {{ prop }} resolves to direct property access, not expression parsing
  // • Works with: Content-Security-Policy: script-src 'self'
  // • No 'unsafe-eval' required (unlike AngularJS!)

  ✅ ADVANTAGES:
  • Uses browser's own DOMParser — no parser differential exploits
  • No eval/Function — fully CSP-compatible out of the box
  • Shadow DOM provides additional isolation layer
  • Configurable allowlists per call (not global config)
  • escapeHTML() for when you just need safe text
  • No "trust" escape hatch — sanitize or escape, always
`);

console.log('─── CSP Comparison ─────────────────────────────────────────────\n');
console.log(`
  Content-Security-Policy: script-src 'self'; style-src 'self' 'unsafe-inline'

  AngularJS:
  ❌ FAILS — requires 'unsafe-eval' for template expression compilation
  ❌ $parse service uses new Function() internally
  ❌ Workaround: use angular-csp.js (limited functionality)

  ng-modern:
  ✅ WORKS — no eval, no new Function, no dynamic code generation
  ✅ Template bindings resolve via property lookup, not expression parsing
  ✅ Shadow DOM styles use <style> in shadow root (no external CSS issues)
`);

console.log('─── Summary ────────────────────────────────────────────────────\n');
console.log(`
  ┌──────────────────────┬─────────────────────────┬─────────────────────────┐
  │ Feature              │ AngularJS               │ ng-modern               │
  ├──────────────────────┼─────────────────────────┼─────────────────────────┤
  │ HTML sanitization    │ $sanitize (custom parser)│ DOMParser (browser)    │
  │ Trust mechanism      │ $sce.trustAsHtml()      │ None (always sanitize)  │
  │ XSS via parser diff  │ ⚠️ Possible (mXSS)      │ ✅ Not possible         │
  │ CSP compatible       │ ❌ Needs unsafe-eval     │ ✅ Fully compatible     │
  │ Template expressions │ Eval-based ($parse)     │ Property lookup only    │
  │ Style isolation      │ ❌ Global CSS            │ ✅ Shadow DOM           │
  │ Trusted Types        │ ❌ Not supported         │ ✅ Can integrate        │
  │ Escape utility       │ ❌ (use ng-bind)         │ ✅ escapeHTML()         │
  └──────────────────────┴─────────────────────────┴─────────────────────────┘
`);

console.log('═══════════════════════════════════════════════════════════════');
