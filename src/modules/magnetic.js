// Magnetic button — pulls toward the cursor, spring return on leave.
import { gsap } from 'gsap';
import { isMobile } from './env.js';

export function initMagnetic() {
  if (isMobile) return;

  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const label = el.querySelector('.btn-magnetic__label') || el;
    const strength = 0.4;
    const labelStrength = 0.22;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    const lxTo = gsap.quickTo(label, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    const lyTo = gsap.quickTo(label, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.5)' });

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      xTo(mx * strength);
      yTo(my * strength);
      lxTo(mx * labelStrength);
      lyTo(my * labelStrength);
    });

    el.addEventListener('mouseleave', () => {
      xTo(0); yTo(0); lxTo(0); lyTo(0);
    });
  });
}
