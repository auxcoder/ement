/**
 * Field — modern equivalent of NgModelController.
 * Manages viewValue ↔ modelValue transform pipeline and validation.
 * Explicit onChange propagation instead of implicit two-way binding.
 *
 * Pipeline: input event → parsers → validators → onChange(modelValue, state)
 * Reverse:  writeValue(model) → formatters → input.value
 *
 * @module forms/field
 */

export class ElField {
  #input;
  #parsers;
  #formatters;
  #validators;
  #asyncValidators;
  #onChange;
  #debounceMs;
  #debounceTimeout;
  #abortController;
  #state = {
    viewValue: "",
    modelValue: undefined,
    valid: true,
    dirty: false,
    touched: false,
    errors: {},
    pending: false,
  };

  /**
   * @param {HTMLElement} input - The input element to bind
   * @param {Object} [options]
   * @param {Function[]} [options.parsers=[]] - view → model transform chain
   * @param {Function[]} [options.formatters=[]] - model → view transform chain
   * @param {Function[]} [options.validators=[]] - sync validators: (modelValue, viewValue) => errorKey|null
   * @param {Function[]} [options.asyncValidators=[]] - async validators: (modelValue, signal) => errorKey|null
   * @param {Function} [options.onChange] - called with (modelValue, state) after pipeline
   * @param {number} [options.debounce=0] - debounce input events (ms)
   */
  constructor(input, options = {}) {
    const {
      parsers = [],
      formatters = [],
      validators = [],
      asyncValidators = [],
      onChange,
      debounce = 0,
    } = options;

    this.#input = input;
    this.#parsers = parsers;
    this.#formatters = formatters;
    this.#validators = validators;
    this.#asyncValidators = asyncValidators;
    this.#onChange = onChange;
    this.#debounceMs = debounce;

    // Bind DOM events
    if (input.addEventListener) {
      input.addEventListener("input", (e) => {
        if (this.#debounceMs > 0) {
          clearTimeout(this.#debounceTimeout);
          this.#debounceTimeout = setTimeout(
            () => this.#handleInput(e.target.value),
            this.#debounceMs,
          );
        } else {
          this.#handleInput(e.target.value);
        }
      });
      input.addEventListener("blur", () => this.#markTouched());
    }
  }

  // ─── Pipeline ──────────────────────────────────────────────────────────────

  /**
   * Core pipeline: viewValue → parsers → validators → onChange
   * @private
   */
  #handleInput(rawValue) {
    this.#state.viewValue = rawValue;
    this.#state.dirty = true;

    // Run parsers (view → model)
    let modelValue = rawValue;
    for (const parser of this.#parsers) {
      modelValue = parser(modelValue);
      if (modelValue === undefined) break; // parser rejected
    }
    this.#state.modelValue = modelValue;

    // Run sync validators
    this.#validate(modelValue);

    // Propagate
    if (this.#onChange) {
      this.#onChange(modelValue, this.snapshot);
    }

    this.#syncCssClasses();
  }

  /**
   * Write model → view (formatters pipeline).
   * Called when application state changes and the input must reflect it.
   *
   * @param {*} modelValue
   */
  writeValue(modelValue) {
    this.#state.modelValue = modelValue;

    // Run formatters (model → view)
    let viewValue = modelValue;
    for (const formatter of this.#formatters) {
      viewValue = formatter(viewValue);
    }
    this.#state.viewValue = viewValue;

    if (this.#input.value !== undefined) {
      this.#input.value = viewValue ?? "";
    }

    this.#validate(modelValue);
    this.#syncCssClasses();
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Run sync validators, then async if sync passes.
   *
   * Supports two validator formats:
   * 1. Object (AngularJS-compatible): { key: (modelValue, viewValue) => boolean }
   *    true = valid, false = invalid. Key becomes the error name.
   * 2. Array (ement): [(modelValue, viewValue) => errorKey | null]
   *    Returns null if valid, or an error key string if invalid.
   *
   * @private
   */
  #validate(modelValue) {
    this.#state.errors = {};

    if (Array.isArray(this.#validators)) {
      // Array format: each fn returns errorKey or null
      for (const validator of this.#validators) {
        const result = validator(modelValue, this.#state.viewValue);
        if (result) {
          this.#state.errors[result] = true;
        }
      }
    } else if (this.#validators && typeof this.#validators === 'object') {
      // Object format (AngularJS-compatible): { key: fn returning boolean }
      for (const [key, validator] of Object.entries(this.#validators)) {
        const isValid = validator(modelValue, this.#state.viewValue);
        if (!isValid) {
          this.#state.errors[key] = true;
        }
      }
    }

    this.#state.valid = Object.keys(this.#state.errors).length === 0;

    // Async validators only run if sync passes
    if (this.#state.valid && this.#hasAsyncValidators()) {
      this.#runAsyncValidators(modelValue);
    }
  }

  /** @private */
  #hasAsyncValidators() {
    if (Array.isArray(this.#asyncValidators)) return this.#asyncValidators.length > 0;
    if (this.#asyncValidators && typeof this.#asyncValidators === 'object') return Object.keys(this.#asyncValidators).length > 0;
    return false;
  }

  /**
   * @private
   */
  async #runAsyncValidators(modelValue) {
    // Cancel previous
    this.#abortController?.abort();
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    this.#state.pending = true;
    this.#syncCssClasses();

    if (Array.isArray(this.#asyncValidators)) {
      // Array format: fn returns errorKey or null
      for (const validator of this.#asyncValidators) {
        const result = await validator(modelValue, signal);
        if (signal.aborted) return;
        if (result) {
          this.#state.errors[result] = true;
        }
      }
    } else if (this.#asyncValidators && typeof this.#asyncValidators === 'object') {
      // Object format (AngularJS-compatible): { key: async fn returning boolean }
      for (const [key, validator] of Object.entries(this.#asyncValidators)) {
        const isValid = await validator(modelValue, signal);
        if (signal.aborted) return;
        if (!isValid) {
          this.#state.errors[key] = true;
        }
      }
    }

    this.#state.pending = false;
    this.#state.valid = Object.keys(this.#state.errors).length === 0;
    this.#syncCssClasses();

    // Re-notify after async completes
    if (this.#onChange) {
      this.#onChange(this.#state.modelValue, this.snapshot);
    }
  }

  // ─── State Tracking ────────────────────────────────────────────────────────

  /** @private */
  #markTouched() {
    this.#state.touched = true;
    this.#syncCssClasses();
  }

  /** @private */
  #syncCssClasses() {
    const cl = this.#input.classList;
    if (!cl) return;

    cl.toggle("el-valid", this.#state.valid);
    cl.toggle("el-invalid", !this.#state.valid);
    cl.toggle("el-dirty", this.#state.dirty);
    cl.toggle("el-pristine", !this.#state.dirty);
    cl.toggle("el-touched", this.#state.touched);
    cl.toggle("el-untouched", !this.#state.touched);
    cl.toggle("el-pending", this.#state.pending);
  }

  // ─── Public Accessors (read-only state) ────────────────────────────────────

  get modelValue() {
    return this.#state.modelValue;
  }
  get viewValue() {
    return this.#state.viewValue;
  }
  get valid() {
    return this.#state.valid;
  }
  get dirty() {
    return this.#state.dirty;
  }
  get touched() {
    return this.#state.touched;
  }
  get pending() {
    return this.#state.pending;
  }
  get errors() {
    return { ...this.#state.errors };
  }

  /** Snapshot of all state (for onChange callback). */
  get snapshot() {
    return { ...this.#state, errors: { ...this.#state.errors } };
  }

  // ─── Programmatic Controls ─────────────────────────────────────────────────

  markDirty() {
    this.#state.dirty = true;
    this.#syncCssClasses();
  }
  markPristine() {
    this.#state.dirty = false;
    this.#syncCssClasses();
  }
  markTouched() {
    this.#markTouched();
  }

  reset(modelValue) {
    this.#state.dirty = false;
    this.#state.touched = false;
    this.#state.errors = {};
    this.writeValue(modelValue);
  }

  destroy() {
    this.#abortController?.abort();
    clearTimeout(this.#debounceTimeout);
  }
}
