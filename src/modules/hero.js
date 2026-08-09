// Pinned hero. A preloaded WebP frame sequence drawn to a canvas and scrubbed
// to scroll position. Starts in an idle self-playing state; the first scroll
// input eases control over to the scroll. Scroll velocity feeds a clamped skew.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { drawCover } from './frames.js';
import { getVelocity } from './scroll.js';
import { useFrameSequence, prefersReducedMotion } from './env.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * @param {HTMLImageElement[]|null} images  preloaded frames (desktop) or null
 */
export function initHero(images) {
  const section = document.getElementById('hero');
  const canvas = document.getElementById('hero-canvas');
  const poster = document.getElementById('hero-poster');

  // Mobile / reduced-motion: no scrub — hold the poster frame, scroll normally.
  if (!useFrameSequence || !images || images.length === 0) {
    if (canvas) canvas.style.display = 'none';
    if (poster) poster.style.display = 'block';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  const count = images.length;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let cw = 0, ch = 0;
  function resize() {
    cw = section.clientWidth;
    ch = section.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(true);
  }

  // ---- frame state ----
  let mode = 'idle';                 // 'idle' | 'handover' | 'scroll'
  let idleFrame = 0;
  const idleSpeed = count / 42;      // full slow rotation ~42s
  let scrollProgress = 0;            // 0..1 from ScrollTrigger
  let handoverDelta = 0;
  let handoverT = 0;
  const HANDOVER_DUR = 0.85;

  let drawnFrame = -1;
  let skew = 0;
  let last = performance.now();

  const scrollFrame = () => scrollProgress * (count - 1);
  const wrap = (f) => ((f % count) + count) % count;

  function render(force) {
    let frame;
    if (mode === 'idle') {
      frame = wrap(idleFrame);
    } else if (mode === 'handover') {
      const eased = 1 - Math.pow(1 - clamp(handoverT / HANDOVER_DUR, 0, 1), 3);
      frame = wrap(scrollFrame() + handoverDelta * (1 - eased));
    } else {
      frame = clamp(scrollFrame(), 0, count - 1);
    }

    const idx = Math.round(frame);
    if (force || idx !== drawnFrame || skew !== 0) {
      ctx.clearRect(0, 0, cw, ch);
      drawCover(ctx, images[idx], cw, ch);
      drawnFrame = idx;
    }
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (mode === 'idle') {
      idleFrame += idleSpeed * dt;
    } else if (mode === 'handover') {
      handoverT += dt;
      if (handoverT >= HANDOVER_DUR) mode = 'scroll';
    }

    // clamped skew from scroll velocity
    const targetSkew = clamp(getVelocity() * 0.05, -5, 5);
    skew = lerp(skew, targetSkew, 0.12);
    canvas.style.transform = `scale(1.06) skewY(${skew.toFixed(3)}deg)`;

    render(false);
    requestAnimationFrame(tick);
  }

  function handover() {
    if (mode !== 'idle') return;
    mode = 'handover';
    handoverT = 0;
    handoverDelta = wrap(idleFrame) - scrollFrame();
  }

  // first scroll input hands control to the scroll
  const onFirstInput = () => handover();
  window.addEventListener('wheel', onFirstInput, { once: true, passive: true });
  window.addEventListener('touchmove', onFirstInput, { once: true, passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) handover();
  }, { once: true });

  // pin + scrub
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + window.innerHeight * 5,
    pin: true,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      // if the visitor jumped straight to scrolling (e.g. scrollbar drag)
      if (mode === 'idle' && self.progress > 0.001) handover();
    }
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
}

// Under reduced motion CSS already swaps to the poster; nothing to init here.
export const heroReducedMotion = prefersReducedMotion;
