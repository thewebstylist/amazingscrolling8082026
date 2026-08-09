// Text reveals: per-line clip-path masks that rise on a stagger, + a one-shot
// character scramble on the display. No opacity-only fades anywhere.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';
import { EASE_ENTRANCE } from './eases.js';

const HIDDEN = { yPercent: 118, clipPath: 'inset(0% 0% 100% 0%)' };
const SHOWN = { yPercent: 0, clipPath: 'inset(0% 0% -12% 0%)' };

// Put every line into its hidden state before first paint so nothing flashes.
export function prepLines() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('[data-lines] .line').forEach((line) => {
    gsap.set(line, HIDDEN);
  });
}

export function revealLines(container, delay = 0) {
  const lines = container.querySelectorAll('.line');
  if (prefersReducedMotion) {
    gsap.set(lines, { clearProps: 'all' });
    return;
  }
  gsap.to(lines, {
    ...SHOWN,
    duration: 1.1,
    ease: EASE_ENTRANCE,
    stagger: 0.09,
    delay
  });
}

// Reveal any [data-lines] block (outside the hero) as it scrolls into view.
export function initScrollReveals() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('[data-lines]').forEach((block) => {
    if (block.closest('.hero')) return; // hero is revealed by the loader handoff
    ScrollTrigger.create({
      trigger: block,
      start: 'top 85%',
      once: true,
      onEnter: () => revealLines(block)
    });
  });
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>*#';

// One-shot scramble that settles to the element's real text.
export function scramble(el, { duration = 0.9, delay = 0 } = {}) {
  const finalText = el.getAttribute('aria-label') || el.textContent;
  if (prefersReducedMotion) {
    el.textContent = finalText;
    return;
  }
  const len = finalText.length;
  const start = performance.now() + delay * 1000;
  const total = duration * 1000;

  function tick(now) {
    const t = (now - start) / total;
    if (t < 0) {
      el.textContent = randomStr(len);
      requestAnimationFrame(tick);
      return;
    }
    if (t >= 1) {
      el.textContent = finalText;
      return;
    }
    // reveal left-to-right; unsettled characters keep scrambling
    const settled = Math.floor(t * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      const ch = finalText[i];
      if (ch === ' ') { out += ' '; continue; }
      out += i < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function randomStr(len) {
  let s = '';
  for (let i = 0; i < len; i++) s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
  return s;
}

// Reveal the display element itself (rise) — used with scramble on load.
export function revealDisplay(el, delay = 0) {
  if (prefersReducedMotion) return;
  gsap.fromTo(
    el,
    { yPercent: 12 },
    { yPercent: 0, duration: 1.2, ease: EASE_ENTRANCE, delay }
  );
}
