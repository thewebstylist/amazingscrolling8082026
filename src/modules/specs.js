// Specs numbers count up as each enters the viewport.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';
import { EASE_ENTRANCE } from './eases.js';

function format(value, decimals, suffix) {
  return value.toFixed(decimals) + (suffix || '');
}

export function initSpecs() {
  document.querySelectorAll('.spec__num').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';

    if (prefersReducedMotion) {
      el.textContent = format(target, decimals, suffix);
      return;
    }

    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: target,
          duration: 2,
          ease: EASE_ENTRANCE,
          onUpdate: () => {
            el.textContent = format(obj.v, decimals, suffix);
          }
        });
      }
    });
  });
}
