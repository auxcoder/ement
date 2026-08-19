/**
 * ng-modern — AngularJS reimagined with modern browser APIs.
 *
 * Main entry point. Re-exports all public modules.
 */

// Core
export { reactive } from "./core/reactive.js";
export { scheduleUpdate } from "./core/scheduler.js";
export { NgElement } from "./core/element.js";
export { bootstrap } from "./core/bootstrap.js";

// Dependency Injection
export { Container } from "./di/container.js";
export {
  HttpToken,
  RouterToken,
  StorageToken,
  AuthToken,
} from "./di/tokens.js";

// Router
export { Router } from "./router/router.js";
export { RouteOutlet } from "./router/route-outlet.js";

// HTTP
export { Http, HttpError } from "./http/http.js";

// Forms
export { Field } from "./forms/field.js";
export { FormGroup } from "./forms/form-group.js";
export * as parsers from "./forms/parsers.js";
export * as formatters from "./forms/formatters.js";
export * as validators from "./forms/validators.js";

// Animation
export { animateIn, animateOut, stagger } from "./animate/animate.js";

// Security
export { sanitizeHTML } from "./security/sanitize.js";

// Filters / Formatting
export {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatRelative,
} from "./filters/intl.js";
