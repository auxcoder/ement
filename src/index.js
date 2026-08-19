/**
 * Ement — Modern web framework built on Custom Elements and native browser APIs.
 *
 * Main entry point. Re-exports all public modules.
 */

// Core
export { reactive, toRaw, isReactive } from './core/reactive.js';
export { scheduleUpdate, flushUpdates, pendingCount } from './core/scheduler.js';
export { computed } from './core/computed.js';
export { ElElement } from './core/element.js';
export { bootstrap } from './core/bootstrap.js';

// Dependency Injection
export { ElContainer } from './di/container.js';
export { ElProvider, provideContainer, resolveContainer } from './di/provider.js';
export { HttpToken, RouterToken, StorageToken, AuthToken } from './di/tokens.js';

// Router
export { ElRouter } from './router/router.js';
export { RouteOutlet } from './router/route-outlet.js';
export { interceptLinks } from './router/links.js';

// HTTP
export { ElHttp, HttpError } from './http/http.js';

// Forms
export { ElField } from './forms/field.js';
export { ElFormGroup } from './forms/form-group.js';
export * as parsers from './forms/parsers.js';
export * as formatters from './forms/formatters.js';
export * as validators from './forms/validators.js';

// Animation
export { animateIn, animateOut, stagger, presets } from './animate/animate.js';

// Security
export { sanitizeHTML, escapeHTML } from './security/sanitize.js';

// Filters / Formatting
export { formatCurrency, formatNumber, formatPercent, formatDate, formatRelative, formatList, formatPlural } from './filters/intl.js';
