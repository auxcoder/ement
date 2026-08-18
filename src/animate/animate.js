/**
 * Web Animations API helpers.
 * Replaces AngularJS ngAnimate.
 *
 * @module animate/animate
 */

// TODO: Phase 7, Tasks 7.1 - 7.3

/**
 * Animate an element in (enter animation).
 */
export function animateIn(element, keyframes, options = {}) {
  const defaults = { duration: 300, easing: 'ease-in-out', fill: 'forwards' };
  return element.animate(keyframes, { ...defaults, ...options });
}

/**
 * Animate an element out and remove it from DOM after completion.
 */
export function animateOut(element, keyframes, options = {}) {
  const animation = animateIn(element, keyframes, options);
  animation.onfinish = () => element.remove();
  return animation;
}

/**
 * Stagger animations across a list of elements.
 */
export function stagger(elements, keyframes, { delay = 50, ...options } = {}) {
  return Array.from(elements).map((el, i) =>
    el.animate(keyframes, { ...options, delay: i * delay }),
  );
}
