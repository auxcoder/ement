/**
 * Comparative Example: ngAnimate vs Web Animations API
 *
 * Run with: node src/animate/comparison.js
 *
 * @module animate/comparison
 */

console.log("═════════════════════════════════════════════════════════════");
console.log("  Comparative Example: ngAnimate vs Web Animations API");
console.log("═════════════════════════════════════════════════════════════\n");

console.log("─── 1. AngularJS ngAnimate ──────────────────────────────────\n");
console.log(`
  // CSS-class-based animations:
  .my-item.ng-enter {
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  }
  .my-item.ng-enter-active {
    opacity: 1;
    transform: translateY(0);
  }
  .my-item.ng-leave {
    opacity: 1;
    transition: all 0.3s ease;
  }
  .my-item.ng-leave-active {
    opacity: 0;
  }

  // Stagger:
  .my-item.ng-enter-stagger {
    transition-delay: 0.05s;
    transition-duration: 0s; /* hack required */
  }

  // JavaScript animation (for complex sequences):
  angular.module('app').animation('.my-item', function() {
    return {
      enter: function(element, done) {
        jQuery(element).css({ opacity: 0 });
        jQuery(element).animate({ opacity: 1 }, 300, done);
        return function(cancelled) {
          if (cancelled) jQuery(element).stop();
        };
      },
      leave: function(element, done) {
        jQuery(element).animate({ opacity: 0 }, 300, done);
      }
    };
  });

  ❌ PAIN POINTS:
  • CSS class dance (ng-enter, ng-enter-active, ng-enter-stagger)
  • Stagger requires transition-duration: 0s hack
  • JS animations often need jQuery
  • No programmatic control (pause, reverse, playback rate)
  • Animation tied to directive lifecycle (ng-repeat, ng-if, ng-show)
  • Hard to coordinate sequences
`);

console.log("─── 2. ement (Web Animations API) ───────────────────────\n");
console.log(`
  import { animateIn, animateOut, stagger, presets } from 'ement/animate';

  // Enter animation — one line:
  animateIn(element, presets.fadeIn, { duration: 300 });

  // Leave animation — removes element after:
  animateOut(element, presets.fadeOut, { duration: 300 });

  // Stagger — no CSS hack needed:
  stagger(listItems, presets.slideInLeft, { delay: 80, duration: 200 });

  // Lifecycle hooks on component class:
  class TodoItem extends NgElement {
    static enterAnimation = { keyframes: presets.slideInDown, options: { duration: 200 } };
    static leaveAnimation = { keyframes: presets.slideOutUp, options: { duration: 150 } };
  }

  // Programmatic control (pause, reverse, speed):
  const anim = animateIn(el, presets.scaleIn, { duration: 500 });
  anim.pause();
  anim.playbackRate = 2;  // 2x speed
  anim.reverse();

  // Coordinated sequences:
  const a1 = animateIn(header, presets.fadeIn, { duration: 200 });
  a1.onfinish = () => {
    stagger(items, presets.slideInLeft, { delay: 50 });
  };

  ✅ ADVANTAGES:
  • No CSS class dance — direct keyframe definition
  • Stagger is a function call, not a CSS hack
  • Full programmatic control (pause, reverse, playbackRate)
  • Hardware accelerated (compositor thread)
  • Promise-based (animation.finished is a Promise)
  • Works with any element, not tied to framework directives
  • No jQuery dependency
`);

console.log("─── Summary ──────────────────────────────────────────────────\n");
console.log(`
  ┌──────────────────────┬─────────────────────────┬─────────────────────────┐
  │ Feature              │ ngAnimate               │ WAAPI (ement)           │
  ├──────────────────────┼─────────────────────────┼─────────────────────────┤
  │ Enter/leave          │ CSS classes             │ animateIn/animateOut    │
  │ Stagger              │ CSS hack                │ stagger() function      │
  │ JS control           │ jQuery .animate()       │ Native .animate()       │
  │ Pause/resume         │ ❌                       │ ✅ anim.pause/play     │
  │ Reverse              │ ❌                       │ ✅ anim.reverse()      │
  │ Playback speed       │ ❌                       │ ✅ anim.playbackRate   │
  │ Sequencing           │ Manual callbacks        │ onfinish / .finished    │
  │ Hardware accelerated │ CSS transitions only    │ ✅ All animations       │
  │ Framework coupling   │ AngularJS only          │ None (standard API)     │
  │ Bundle size          │ ngAnimate module        │ ~0.5KB (thin wrapper)   │
  └──────────────────────┴─────────────────────────┴─────────────────────────┘
`);

console.log("═════════════════════════════════════════════════════════════");
