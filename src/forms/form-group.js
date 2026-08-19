/**
 * FormGroup — aggregates multiple Field instances.
 * Provides form-level state (valid, dirty, touched) as a read-only aggregate.
 * Replaces AngularJS form controller.
 *
 * @module forms/form-group
 */

export class FormGroup {
  #fields = new Map();
  #formElement;

  /**
   * @param {HTMLFormElement} formElement - The form element to manage
   */
  constructor(formElement) {
    this.#formElement = formElement;

    if (formElement?.addEventListener) {
      formElement.addEventListener("submit", (e) => {
        if (!this.valid) {
          e.preventDefault();
          // Mark all fields touched to show errors
          for (const field of this.#fields.values()) {
            field.markTouched();
          }
        }
      });
    }
  }

  /**
   * Register a Field with a name.
   *
   * @param {string} name - Field identifier
   * @param {Field} field - The Field instance
   * @returns {FormGroup} this
   */
  addField(name, field) {
    this.#fields.set(name, field);
    return this;
  }

  /**
   * Remove a registered field.
   *
   * @param {string} name
   */
  removeField(name) {
    const field = this.#fields.get(name);
    if (field) {
      field.destroy();
      this.#fields.delete(name);
    }
  }

  /**
   * Get a field by name.
   *
   * @param {string} name
   * @returns {Field|undefined}
   */
  field(name) {
    return this.#fields.get(name);
  }

  // ─── Aggregate State (read-only) ──────────────────────────────────────────

  /** True only if ALL fields are valid. */
  get valid() {
    for (const field of this.#fields.values()) {
      if (!field.valid) return false;
    }
    return true;
  }

  /** True if ANY field is dirty. */
  get dirty() {
    for (const field of this.#fields.values()) {
      if (field.dirty) return true;
    }
    return false;
  }

  /** True if ANY field is touched. */
  get touched() {
    for (const field of this.#fields.values()) {
      if (field.touched) return true;
    }
    return false;
  }

  /** True if ANY field has pending async validation. */
  get pending() {
    for (const field of this.#fields.values()) {
      if (field.pending) return true;
    }
    return false;
  }

  /** All errors: { fieldName: { errorKey: true } } */
  get errors() {
    const all = {};
    for (const [name, field] of this.#fields) {
      const fieldErrors = field.errors;
      if (Object.keys(fieldErrors).length > 0) {
        all[name] = fieldErrors;
      }
    }
    return all;
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

  /**
   * Reset all fields with optional values map.
   *
   * @param {Object} [values={}] - { fieldName: resetValue }
   */
  reset(values = {}) {
    for (const [name, field] of this.#fields) {
      field.reset(values[name]);
    }
  }

  /**
   * Destroy all fields and clean up.
   */
  destroy() {
    for (const field of this.#fields.values()) {
      field.destroy();
    }
    this.#fields.clear();
  }
}
