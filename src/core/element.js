/**
 * NgElement — Custom Element base class.
 * Replaces AngularJS directives + $compile.
 *
 * Features:
 * - Shadow DOM encapsulation
 * - External template/styles resolution (fetch + cache or build-time inline)
 * - Reactive property binding ({{ prop }})
 * - Lifecycle hooks: onInit(), onDestroy()
 * - DI container access via DOM traversal
 *
 * @module core/element
 */

import { reactive } from './reactive.js';
import { scheduleUpdate } from './scheduler.js';

export class NgElement extends HTMLElement {
  // TODO: Phase 3, Tasks 3.1 - 3.8
  // - Shadow DOM attachment
  // - Template resolution (templateUrl → fetch + cache, or template string)
  // - Styles resolution (stylesUrl → fetch + cache, or styles string)
  // - Reactive state via Proxy
  // - Template binding ({{ prop }} interpolation)
  // - Attribute → property reflection
  // - Lifecycle management
  // - DI container access
}
