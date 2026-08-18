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

export class Field {
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
    viewValue: '',
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
      input.addEventListener('input', (e) => {
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
      input.addEventListener('blur', () => this.#markTouched());
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
      this.#input.value = viewValue ?? '';
    }

    this.#validate(modelValue);
    this.#syncCssClasses();
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  /**
   * Run sync validators, then async if sync passes.
   * @private
   */
  #validate(modelValue) {
    this.#state.errors = {};

    for (const validator of this.#validators) {
      const result = validator(modelValue, this.#state.viewValue);
      if (result) {
        this.#state.errors[result] = true;
      }
    }

    this.#state.valid = Object.keys(this.#state.errors).length === 0;

    // Async validators only run if sync passes
    if (this.#state.valid && this.#asyncValidators.length > 0) {
      this.#runAsyncValidators(modelValue);
    }
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

    for (const validator of this.#asyncValidators) {
      const result = await validator(modelValue, signal);
      if (signal.aborted) return; // stale
      if (result) {
        this.#state.errors[result] = true;
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

    cl.toggle('ng-valid', this.#state.valid);
    cl.toggle('ng-invalid', !this.#state.valid);
    cl.toggle('ng-dirty', this.#state.dirty);
    cl.toggle('ng-pristine', !this.#state.dirty);
    cl.toggle('ng-touched', this.#state.touched);
    cl.toggle('ng-untouched', !this.#state.touched);
    cl.toggle('ng-pending', this.#state.pending);
  }

  // ─── Public Accessors (read-only state) ────────────────────────────────────

  get modelValue() { return this.#state.modelValue; }
  get viewValue() { return this.#state.viewValue; }
  get valid() { return this.#state.valid; }
  get dirty() { return this.#state.dirty; }
  get touched() { return this.#state.touched; }
  get pending() { return this.#state.pending; }
  get errors() { return { ...this.#state.errors }; }

  /** Snapshot of all state (for onChange callback). */
  get snapshot() {
    return { ...this.#state, errors: { ...this.#state.errors } };
  }

  // ─── Programmatic Controls ─────────────────────────────────────────────────

  markDirty() { this.#state.dirty = true; this.#syncCssClasses(); }
  markPristine() { this.#state.dirty = false; this.#syncCssClasses(); }
  markTouched() { this.#markTouched(); }

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
