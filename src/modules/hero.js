// Pinned hero. A preloaded WebP frame sequence drawn to a canvas and scrubbed
// to scroll position. Starts in an idle self-playing state; the first scroll
// input eases control over to the scroll. Scroll velocity feeds a clamped skew.
// A scrubbed timeline passes Act statements through as the car turns, and a
// live rotation readout + chapter events drive the HUD.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { drawCover } from './frames.js';
import { getVelocity } from './scroll.js';
import { useFrameSequence, isMobile } from './env.js';
import { EASE_ENTRANCE, EASE_EXIT } from './eases.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pad3 = (n) => String(n).padStart(3, '0');

export function initHero(images) {
  const section = document.getElementById('hero');
  const canvas = document.getElementById('hero-canvas');
  const poster = document.getElementById('hero-poster');
  const hint = document.getElementById('hero-hint');
  const readout = document.getElementById('readout');
  const readoutDeg = document.getElementById('readout-deg');
  const readoutFrame = document.getElementById('readout-frame');

  // Mobile / reduced-motion with no frames: hold the poster, scroll normally.
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
  let mode = 'idle';
  let idleFrame = 0;
  const idleSpeed = count / 42;
  let scrollProgress = 0;
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
    if (mode === 'idle') frame = wrap(idleFrame);
    else if (mode === 'handover') {
      const eased = 1 - Math.pow(1 - clamp(handoverT / HANDOVER_DUR, 0, 1), 3);
      frame = wrap(scrollFrame() + handoverDelta * (1 - eased));
    } else frame = clamp(scrollFrame(), 0, count - 1);

    const idx = Math.round(frame);
    if (force || idx !== drawnFrame) {
      ctx.clearRect(0, 0, cw, ch);
      drawCover(ctx, images[idx], cw, ch);
      drawnFrame = idx;
    }
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (mode === 'idle') idleFrame += idleSpeed * dt;
    else if (mode === 'handover') {
      handoverT += dt;
      if (handoverT >= HANDOVER_DUR) mode = 'scroll';
    }

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
    hint?.classList.add('is-gone');
    readout?.classList.add('is-visible');
  }

  const onFirstInput = () => handover();
  window.addEventListener('wheel', onFirstInput, { once: true, passive: true });
  window.addEventListener('touchmove', onFirstInput, { once: true, passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) handover();
  }, { once: true });

  // ---- Act statements: a timeline scrubbed by the same pin ----
  const act1 = section.querySelector('[data-act-block="1"]');
  const act2 = [...section.querySelectorAll('[data-act-block="2"] > *')];
  const act3 = [...section.querySelectorAll('[data-act-block="3"] > *')];
  const heroTL = gsap.timeline({ paused: true });
  if (act1) heroTL.to(act1, { yPercent: -16, autoAlpha: 0, ease: EASE_EXIT, duration: 0.14 }, 0.06);
  if (act2.length) {
    heroTL.fromTo(act2, { yPercent: 36, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, ease: EASE_ENTRANCE, duration: 0.12, stagger: 0.03 }, 0.30);
    heroTL.to(act2, { yPercent: -28, autoAlpha: 0, ease: EASE_EXIT, duration: 0.10, stagger: 0.02 }, 0.52);
  }
  if (act3.length) {
    heroTL.fromTo(act3, { yPercent: 36, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, ease: EASE_ENTRANCE, duration: 0.12, stagger: 0.03 }, 0.66);
    heroTL.to(act3, { yPercent: -28, autoAlpha: 0, ease: EASE_EXIT, duration: 0.10, stagger: 0.02 }, 0.86);
  }
  const spacer = {};
  heroTL.to(spacer, { v: 1, duration: 0.0001 }, 1); // pad timeline to full progress

  // pin + scrub
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (isMobile ? 5 : 7),
    pin: true,
    scrub: 1,
    animation: heroTL,
    invalidateOnRefresh: true,
    onToggle: (self) => {
      window.dispatchEvent(new CustomEvent('hero:active', { detail: { active: self.isActive } }));
    },
    onUpdate: (self) => {
      scrollProgress = self.progress;
      if (mode === 'idle' && self.progress > 0.001) handover();

      const deg = Math.round(self.progress * 360) % 360;
      if (readoutDeg) readoutDeg.textContent = pad3(deg) + '°';
      if (readoutFrame) readoutFrame.textContent =
        'FRAME ' + pad3(Math.round(self.progress * (count - 1)) + 1) + ' / ' + count;

      window.dispatchEvent(new CustomEvent('hero:progress', { detail: { progress: self.progress } }));
    }
  });

  // ---- pointer-reactive light (desktop) ----
  if (!isMobile) {
    section.addEventListener('pointermove', (e) => {
      const r = section.getBoundingClientRect();
      section.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      section.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      section.classList.add('is-lit');
    });
    section.addEventListener('pointerleave', () => section.classList.remove('is-lit'));
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);
}
