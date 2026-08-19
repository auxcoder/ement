/**
 * ng-modern — AngularJS reimagined with modern browser APIs.
 *
 * Main entry point. Re-exports all public modules.
 */

// Core
export { reactive } from './core/reactive.js';
export { scheduleUpdate } from './core/scheduler.js';
export { ElElement } from './core/element.js';
export { bootstrap } from './core/bootstrap.js';

// Dependency Injection
export { ElContainer } from './di/container.js';
export { HttpToken, RouterToken, StorageToken, AuthToken } from './di/tokens.js';

// Router
export { ElRouter } from './router/router.js';
export { RouteOutlet } from './router/route-outlet.js';

// HTTP
export { ElHttp, HttpError } from './http/http.js';

// Forms
export { ElField } from './forms/field.js';
export { ElFormGroup } from './forms/form-group.js';
export * as parsers from './forms/parsers.js';
export * as formatters from './forms/formatters.js';
export * as validators from './forms/validators.js';

// Animation
export { animateIn, animateOut, stagger } from './animate/animate.js';

// Security
export { sanitizeHTML } from './security/sanitize.js';

// Filters / Formatting
export { formatCurrency, formatNumber, formatPercent, formatDate, formatRelative, formatList, formatPlural } from './filters/intl.js';
