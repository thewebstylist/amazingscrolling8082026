// Sound design. A seamless ambient bed (mp3 loop) plus synthesized UI ticks.
// Off by default (browsers block autoplay); the nav toggle turns it on.
import { gsap } from 'gsap';

export function initAudio() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;

  let enabled = false;
  let ctx = null;
  let ambient = null;
  let lastTick = 0;

  function ensure() {
    if (!ambient) {
      ambient = new Audio('/audio/ambient.mp3');
      ambient.loop = true;
      ambient.preload = 'auto';
      ambient.volume = 0;
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
  }

  // short synthesized click through Web Audio (no asset needed)
  function tick(freq = 1080, dur = 0.045, gain = 0.02) {
    if (!enabled || !ctx) return;
    const now = performance.now();
    if (now - lastTick < 40) return; // rate-limit
    lastTick = now;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  async function toggle() {
    ensure();
    if (ctx && ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
    enabled = !enabled;
    btn.classList.toggle('is-playing', enabled);
    btn.setAttribute('aria-pressed', String(enabled));
    if (enabled) {
      ambient.play().catch(() => {});
      gsap.to(ambient, { volume: 0.55, duration: 1.3, ease: 'power2.out' });
      tick(760, 0.06, 0.03);
    } else {
      gsap.to(ambient, { volume: 0, duration: 0.5, ease: 'power2.in',
        onComplete: () => ambient && ambient.pause() });
    }
  }

  btn.addEventListener('click', toggle);

  // UI ticks on interactive hovers / clicks (only audible when enabled)
  document.querySelectorAll('.nav__links a, [data-magnetic], .nav__mark').forEach((el) => {
    el.addEventListener('pointerenter', () => tick(1120, 0.04, 0.018));
  });
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('click', () => tick(680, 0.07, 0.03));
  });
}
