/**
 * Web Animations API helpers.
 * Replaces AngularJS ngAnimate.
 *
 * @module animate/animate
 */

/**
 * Animate an element in (enter animation).
 *
 * @param {HTMLElement} element - Element to animate
 * @param {Keyframe[]} keyframes - Animation keyframes
 * @param {Object} [options] - KeyframeAnimationOptions
 * @returns {Animation} The running animation
 *
 * @example
 * animateIn(el, [
 *   { opacity: 0, transform: 'translateY(-10px)' },
 *   { opacity: 1, transform: 'translateY(0)' }
 * ]);
 */
export function animateIn(element, keyframes, options = {}) {
  const defaults = { duration: 300, easing: 'ease-in-out', fill: 'forwards' };
  return element.animate(keyframes, { ...defaults, ...options });
}

/**
 * Animate an element out, then remove it from the DOM.
 *
 * @param {HTMLElement} element - Element to animate and remove
 * @param {Keyframe[]} keyframes - Animation keyframes
 * @param {Object} [options] - KeyframeAnimationOptions
 * @returns {Animation} The running animation
 *
 * @example
 * animateOut(el, [
 *   { opacity: 1 },
 *   { opacity: 0 }
 * ]);
 * // Element is removed after animation completes
 */
export function animateOut(element, keyframes, options = {}) {
  const defaults = { duration: 300, easing: 'ease-in-out', fill: 'forwards' };
  const animation = element.animate(keyframes, { ...defaults, ...options });
  animation.onfinish = () => element.remove();
  return animation;
}

/**
 * Stagger animations across a list of elements.
 * Each element starts its animation after a delay offset.
 *
 * @param {HTMLElement[]|NodeList} elements - Elements to animate
 * @param {Keyframe[]} keyframes - Animation keyframes
 * @param {Object} [options] - Options with additional `delay` between items
 * @param {number} [options.delay=50] - Delay between each element's start (ms)
 * @returns {Animation[]} Array of running animations
 *
 * @example
 * stagger(listItems, [
 *   { opacity: 0, transform: 'translateX(-20px)' },
 *   { opacity: 1, transform: 'translateX(0)' }
 * ], { delay: 80, duration: 200 });
 */
export function stagger(elements, keyframes, { delay = 50, ...options } = {}) {
  const defaults = { duration: 300, easing: 'ease-in-out', fill: 'forwards' };
  return Array.from(elements).map((el, i) =>
    el.animate(keyframes, { ...defaults, ...options, delay: i * delay }),
  );
}

/**
 * Predefined animation presets.
 */
export const presets = {
  fadeIn: [{ opacity: 0 }, { opacity: 1 }],
  fadeOut: [{ opacity: 1 }, { opacity: 0 }],
  slideInDown: [
    { opacity: 0, transform: 'translateY(-20px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  slideOutUp: [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(-20px)' },
  ],
  slideInLeft: [
    { opacity: 0, transform: 'translateX(-20px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  scaleIn: [
    { opacity: 0, transform: 'scale(0.9)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
};
