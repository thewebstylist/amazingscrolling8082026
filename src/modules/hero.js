// Pinned hero. A preloaded WebP frame sequence drawn to a canvas and scrubbed
// to scroll position. Starts idle (self-playing), hands over to scroll on the
// first input. Scroll velocity feeds a clamped skew. On touch devices you can
// also DRAG to spin the car (with inertia) and TILT the phone to move the
// magenta/cyan light + parallax. A scrubbed timeline passes Act statements
// through, and a live rotation readout + chapter events drive the HUD.
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
  let idleActive = true;
  let idleFrame = 0;
  const idleSpeed = count / 42;
  let scrollProgress = 0;
  let handoverDelta = 0;
  let handoverT = 0;
  const HANDOVER_DUR = 0.85;

  // manual spin (touch turntable) layered on top of everything
  let spinOffset = 0;
  let spinVel = 0;

  // tilt (gyro) → light + parallax
  let tiltX = 0, tiltY = 0, tiltTX = 0, tiltTY = 0;
  let lightX = 50, lightY = 45, lightTX = 50, lightTY = 45;
  let tiltEngaged = false;

  let drawnFrame = -1;
  let skew = 0;
  let last = performance.now();

  const scrollFrame = () => scrollProgress * (count - 1);
  const wrap = (f) => ((f % count) + count) % count;

  function baseFrame() {
    if (mode === 'idle') return idleFrame;
    if (mode === 'handover') {
      const eased = 1 - Math.pow(1 - clamp(handoverT / HANDOVER_DUR, 0, 1), 3);
      return scrollFrame() + handoverDelta * (1 - eased);
    }
    return scrollFrame();
  }

  function currentFrame() {
    return wrap(baseFrame() + spinOffset);
  }

  function render(force) {
    const frame = currentFrame();
    const idx = Math.round(frame);
    if (force || idx !== drawnFrame) {
      ctx.clearRect(0, 0, cw, ch);
      drawCover(ctx, images[idx], cw, ch);
      drawnFrame = idx;
    }
  }

  function updateReadout(frame) {
    const deg = Math.round((frame / count) * 360) % 360;
    if (readoutDeg) readoutDeg.textContent = pad3(deg) + '°';
    if (readoutFrame) readoutFrame.textContent =
      'FRAME ' + pad3(Math.round(frame) + 1) + ' / ' + count;
  }

  function revealReadout() {
    hint?.classList.add('is-gone');
    readout?.classList.add('is-visible');
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (mode === 'idle' && idleActive) idleFrame += idleSpeed * dt;
    else if (mode === 'handover') {
      handoverT += dt;
      if (handoverT >= HANDOVER_DUR) mode = 'scroll';
    }

    // spin inertia when not actively dragging
    if (!dragging && spinVel !== 0) {
      spinOffset += spinVel * dt;
      spinVel *= 0.90;
      if (Math.abs(spinVel) < 0.02) spinVel = 0;
    }

    // velocity skew (desktop scroll) + tilt parallax
    const targetSkew = clamp(getVelocity() * 0.05, -5, 5);
    skew = lerp(skew, targetSkew, 0.12);
    tiltX = lerp(tiltX, tiltTX, 0.08);
    tiltY = lerp(tiltY, tiltTY, 0.08);
    canvas.style.transform =
      `translate(${tiltX.toFixed(2)}px, ${tiltY.toFixed(2)}px) scale(1.06) skewY(${skew.toFixed(3)}deg)`;

    // tilt light
    if (tiltEngaged) {
      lightX = lerp(lightX, lightTX, 0.1);
      lightY = lerp(lightY, lightTY, 0.1);
      section.style.setProperty('--mx', lightX.toFixed(1) + '%');
      section.style.setProperty('--my', lightY.toFixed(1) + '%');
    }

    render(false);
    updateReadout(currentFrame());
    requestAnimationFrame(tick);
  }

  function handover() {
    if (mode !== 'idle') return;
    mode = 'handover';
    handoverT = 0;
    handoverDelta = idleFrame - scrollFrame();
    idleActive = false;
    revealReadout();
  }

  const onFirstInput = () => handover();
  window.addEventListener('wheel', onFirstInput, { once: true, passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) handover();
  }, { once: true });

  // ---------- touch: drag-to-spin + motion permission ----------
  let dragging = false;
  let startX = 0, startY = 0, lastX = 0, lastMoveT = 0, axis = null;

  section.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = lastX = t.clientX;
    startY = t.clientY;
    axis = null;
    lastMoveT = performance.now();
    spinVel = 0;
    enableMotion(); // first user gesture → request iOS motion permission
  }, { passive: true });

  section.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (axis === 'x') {
      e.preventDefault();           // horizontal = spin, don't scroll
      dragging = true;
      idleActive = false;           // freeze idle drift
      revealReadout();
      const now = performance.now();
      const ddx = t.clientX - lastX;
      const dFrames = -(ddx / section.clientWidth) * 150;
      spinOffset += dFrames;
      const dtt = Math.max(0.001, (now - lastMoveT) / 1000);
      spinVel = dFrames / dtt;       // for release inertia
      lastX = t.clientX;
      lastMoveT = now;
    } else if (axis === 'y') {
      handover();                    // vertical = hand over to scroll
    }
  }, { passive: false });

  section.addEventListener('touchend', () => { dragging = false; }, { passive: true });

  // ---------- tilt-to-light + parallax (gyro) ----------
  let motionRequested = false;
  function onOrientation(e) {
    if (e.gamma == null && e.beta == null) return;
    tiltEngaged = true;
    section.classList.add('is-lit');
    const g = clamp(e.gamma || 0, -45, 45);   // left/right
    const b = clamp((e.beta || 45) - 45, -35, 35); // front/back around a held angle
    lightTX = 50 + (g / 45) * 42;
    lightTY = 45 + (b / 35) * 26;
    tiltTX = (g / 45) * 16;
    tiltTY = (b / 35) * 10;
  }
  function enableMotion() {
    if (motionRequested || !isMobile) return;
    motionRequested = true;
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((state) => {
        if (state === 'granted') window.addEventListener('deviceorientation', onOrientation);
      }).catch(() => {});
    } else if (DOE) {
      window.addEventListener('deviceorientation', onOrientation);
    }
  }

  // ---- Act statements timeline (scrubbed by the pin) ----
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
  heroTL.to(spacer, { v: 1, duration: 0.0001 }, 1);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (isMobile ? 5 : 7),
    pin: true,
    scrub: 1,
    animation: heroTL,
    invalidateOnRefresh: true,
    onToggle: (self) =>
      window.dispatchEvent(new CustomEvent('hero:active', { detail: { active: self.isActive } })),
    onUpdate: (self) => {
      scrollProgress = self.progress;
      if (mode === 'idle' && self.progress > 0.001) handover();
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
