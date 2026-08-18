/**
 * Field — modern equivalent of NgModelController.
 * Manages viewValue ↔ modelValue transform pipeline and validation.
 * Explicit onChange propagation instead of implicit two-way binding.
 *
 * @module forms/field
 */

export class Field {
  // TODO: Phase 6, Tasks 6.1 - 6.6
  // - viewValue / modelValue dual representation
  // - Parsers pipeline (view → model)
  // - Formatters pipeline (model → view via writeValue)
  // - Sync validators
  // - Async validators with AbortController
  // - State tracking (dirty, touched, valid, pending)
  // - CSS classes (ng-valid, ng-dirty, ng-touched, ng-pending)
  // - Debounce option
  // - onChange callback (explicit propagation)
}
