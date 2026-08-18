/**
 * Comparative Example: NgModelController vs Field
 *
 * Run with: node src/forms/comparison.js
 *
 * Same form: registration with email (async check), phone (formatted), age (number).
 *
 * @module forms/comparison
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Comparative Example: NgModelController vs Field');
console.log('  Scenario: Registration form — email, phone, age');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─── 1. AngularJS NgModelController ────────────────────────────────────────────

console.log('─── 1. AngularJS NgModelController ─────────────────────────────\n');
console.log(`
  // Template
  <form name="regForm">
    <input ng-model="user.email" name="email" required
           ng-model-options="{ debounce: 300 }">
    <span ng-message="required">Email required</span>
    <span ng-message="emailTaken">Already registered</span>

    <input ng-model="user.phone" name="phone">
    <input ng-model="user.age" name="age" type="number" min="18">
  </form>

  // Controller
  angular.module('app').controller('RegCtrl', function($scope) {
    // Phone: $parsers strip non-digits, $formatters add formatting
    var phoneInput = $scope.regForm.phone;
    phoneInput.$parsers.push(function(viewValue) {
      return viewValue.replace(/\\D/g, '');         // view → model: digits only
    });
    phoneInput.$formatters.push(function(modelValue) {
      if (!modelValue) return '';
      return '(' + modelValue.slice(0,3) + ') '    // model → view: formatted
           + modelValue.slice(3,6) + '-' + modelValue.slice(6,10);
    });

    // Email: async validator
    phoneInput = $scope.regForm.email;
    phoneInput.$asyncValidators.emailTaken = function(modelValue) {
      return $http.get('/api/check-email?email=' + modelValue)
        .then(function(res) {
          if (!res.data.available) return $q.reject('taken');
        });
    };
    // ⚠️ BUG: No cancellation! If user types fast, stale responses
    // can overwrite fresh validation results (race condition).
  });

  DATA FLOW:
  ┌────────┐  implicit  ┌──────────┐  implicit  ┌─────────┐
  │  DOM   │ ─────────► │ ngModel  │ ─────────► │ $scope  │
  │ input  │ ◄───────── │Controller│ ◄───────── │  model  │
  └────────┘  implicit  └──────────┘  implicit  └─────────┘
        Two-way: any mutation in either direction auto-propagates.
        "What changed this value?" — impossible to answer.
`);

// ─── 2. ng-modern Field ────────────────────────────────────────────────────────

console.log('─── 2. ng-modern Field ─────────────────────────────────────────\n');
console.log(`
  // Component
  import { Field } from 'ng-modern/forms/field';
  import { FormGroup } from 'ng-modern/forms/form-group';
  import { trim, lowercase, stripNonDigits, toNumber } from 'ng-modern/forms/parsers';
  import { phone as phoneFmt } from 'ng-modern/forms/formatters';
  import { required, min } from 'ng-modern/forms/validators';

  class RegForm extends NgElement {
    email = '';
    phone = '';
    age = null;

    onInit() {
      const form = this.shadowRoot.querySelector('form');

      // Email field — parsers + async validator with AbortController
      const emailField = new Field(this.shadowRoot.querySelector('#email'), {
        parsers: [trim, lowercase],
        validators: [required],
        asyncValidators: [
          async (value, signal) => {
            const res = await fetch('/api/check-email?email=' + value, { signal });
            const { available } = await res.json();
            return available ? null : 'emailTaken';
            // ✅ If user types again, previous request is ABORTED via signal.
            // No race condition possible.
          }
        ],
        debounce: 300,
        onChange: (modelValue) => { this.email = modelValue; }
      });

      // Phone field — parsers strip, formatters display
      const phoneField = new Field(this.shadowRoot.querySelector('#phone'), {
        parsers: [stripNonDigits],
        formatters: [phoneFmt],
        onChange: (modelValue) => { this.phone = modelValue; }
      });

      // Age field — parse to number, validate minimum
      const ageField = new Field(this.shadowRoot.querySelector('#age'), {
        parsers: [toNumber],
        validators: [required, min(18)],
        onChange: (modelValue) => { this.age = modelValue; }
      });

      this.formGroup = new FormGroup(form);
      this.formGroup.addField('email', emailField);
      this.formGroup.addField('phone', phoneField);
      this.formGroup.addField('age', ageField);
    }
  }

  DATA FLOW:
  ┌────────┐  event   ┌──────────┐ onChange  ┌─────────┐
  │  DOM   │ ────────►│  Field   │──────────►│  State  │
  │ input  │          │ pipeline │           │(explicit)│
  └────────┘          └──────────┘           └─────────┘
       ▲                                          │
       │            writeValue()                   │
       └──────────────────────────────────────────┘
        One-way: DOM → pipeline → explicit callback → state.
        State → DOM only via explicit writeValue().
        "What changed this value?" — always the onChange handler.
`);

// ─── Key Differences ───────────────────────────────────────────────────────────

console.log('─── Key Differences ────────────────────────────────────────────\n');
console.log(`
  ┌───────────────────────────┬─────────────────────────┬─────────────────────────┐
  │ Aspect                    │ NgModelController       │ Field                   │
  ├───────────────────────────┼─────────────────────────┼─────────────────────────┤
  │ Data flow                 │ Two-way (implicit)      │ One-way (explicit)      │
  │ $parsers / parsers        │ ✅ Array pipeline        │ ✅ Array pipeline        │
  │ $formatters / formatters  │ ✅ Array pipeline        │ ✅ via writeValue()      │
  │ $validators               │ ✅ Sync                  │ ✅ Sync                  │
  │ $asyncValidators          │ ✅ But NO cancellation   │ ✅ WITH AbortController  │
  │ Race condition on async   │ ❌ Possible (stale wins) │ ✅ Impossible (aborted)  │
  │ Debounce                  │ ng-model-options         │ Built-in option         │
  │ State tracking            │ $dirty, $touched, etc.  │ dirty, touched, etc.    │
  │ CSS classes               │ ng-valid, ng-dirty      │ ng-valid, ng-dirty      │
  │ "Who changed this?"       │ ❓ Unknown (two-way)     │ ✅ Always the onChange   │
  │ Testing                   │ $compile + $digest      │ new Field(mockInput)    │
  │ Framework coupling        │ AngularJS only          │ Zero — plain JS class   │
  └───────────────────────────┴─────────────────────────┴─────────────────────────┘

  THE RACE CONDITION NgModelController HAD:
  
  1. User types "alice@mail.com" → async validator fires HTTP request
  2. User quickly types "bob@mail.com" → second async validator fires
  3. Second request responds first: "bob" is available ✅
  4. First request responds later: "alice" is taken ❌
  5. NgModelController applies the STALE result → shows "taken" for "bob"!
  
  Field solves this with AbortController:
  - Step 2 aborts the request from step 1
  - The stale response is never processed
  - Only the latest validation result matters
`);

console.log('═══════════════════════════════════════════════════════════════');
