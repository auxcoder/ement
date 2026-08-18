/**
 * Tests for animate/animate.js
 * Run with: node --test src/animate/animate.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { animateIn, animateOut, stagger, presets } from './animate.js';

// ─── Mock element with .animate() ──────────────────────────────────────────────

function makeElement() {
  let removed = false;
  return {
    removed: false,
    lastAnimation: null,
    animate(keyframes, options) {
      const animation = { keyframes, options, onfinish: null };
      this.lastAnimation = animation;
      return animation;
    },
    remove() { this.removed = true; },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('animateIn()', () => {
  it('calls element.animate with keyframes and defaults', () => {
    const el = makeElement();
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];

    const anim = animateIn(el, keyframes);

    assert.deepEqual(anim.keyframes, keyframes);
    assert.equal(anim.options.duration, 300);
    assert.equal(anim.options.easing, 'ease-in-out');
    assert.equal(anim.options.fill, 'forwards');
  });

  it('allows custom options', () => {
    const el = makeElement();
    const anim = animateIn(el, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 500,
      easing: 'linear',
    });

    assert.equal(anim.options.duration, 500);
    assert.equal(anim.options.easing, 'linear');
  });
});

describe('animateOut()', () => {
  it('removes element after animation finishes', () => {
    const el = makeElement();
    const anim = animateOut(el, [{ opacity: 1 }, { opacity: 0 }]);

    assert.equal(el.removed, false);

    // Simulate animation completion
    anim.onfinish();
    assert.equal(el.removed, true);
  });
});

describe('stagger()', () => {
  it('animates each element with incremental delay', () => {
    const elements = [makeElement(), makeElement(), makeElement()];
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];

    const animations = stagger(elements, keyframes, { delay: 100 });

    assert.equal(animations.length, 3);
    assert.equal(animations[0].options.delay, 0);
    assert.equal(animations[1].options.delay, 100);
    assert.equal(animations[2].options.delay, 200);
  });

  it('uses default 50ms delay', () => {
    const elements = [makeElement(), makeElement()];
    const animations = stagger(elements, [{ opacity: 0 }, { opacity: 1 }]);

    assert.equal(animations[0].options.delay, 0);
    assert.equal(animations[1].options.delay, 50);
  });
});

describe('presets', () => {
  it('has standard animation presets', () => {
    assert.ok(presets.fadeIn);
    assert.ok(presets.fadeOut);
    assert.ok(presets.slideInDown);
    assert.ok(presets.slideOutUp);
    assert.ok(presets.slideInLeft);
    assert.ok(presets.scaleIn);

    // Each preset is a keyframe array
    assert.equal(presets.fadeIn.length, 2);
    assert.equal(presets.fadeIn[0].opacity, 0);
    assert.equal(presets.fadeIn[1].opacity, 1);
  });
});
