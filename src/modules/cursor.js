// Spring-based custom cursor. Grows + inverts (via mix-blend-mode) over links.
import { gsap } from 'gsap';
import { isMobile } from './env.js';

export function initCursor() {
  if (isMobile) return;
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;

  document.documentElement.style.cursor = 'none';

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });

  let visible = false;
  window.addEventListener('mousemove', (e) => {
    if (!visible) {
      visible = true;
      cursor.classList.remove('is-hidden');
    }
    xTo(e.clientX);
    yTo(e.clientY);
  });

  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

  // Grow/invert over anything interactive.
  const hoverTargets = 'a, button, [data-magnetic], [data-link]';
  document.querySelectorAll(hoverTargets).forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}
