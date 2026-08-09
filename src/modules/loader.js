// Loader. The macro clip is the only asset that gates it: load the clip first,
// start the loader the instant it can play, and spend the loader's runtime
// preloading the hero frame sequence. On completion the magenta line expands,
// the screen splits along it, the halves slide away and the hero pushes in —
// one continuous movement, under 2.5s.
import { gsap } from 'gsap';
import { EASE_ENTRANCE, EASE_EXIT } from './eases.js';
import { useFrameSequence } from './env.js';

const LOADER_MIN_MS = 900;   // don't let the loader flash by
const VIDEO_GATE_MS = 1600;  // if the clip can't load, proceed anyway

function ready(video) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
    setTimeout(finish, VIDEO_GATE_MS);
    // point the element at the macro clip; empty/missing is handled by the timeout
    video.src = '/loader.mp4';
    video.load();
  });
}

/**
 * @param {(onProgress:(l:number,t:number)=>void)=>Promise<any[]|null>} preload
 * @returns {Promise<any[]|null>} the preloaded frames (or null)
 */
export async function runLoader(preload) {
  const loader = document.getElementById('loader');
  const video = document.getElementById('loader-video');
  const bar = document.getElementById('loader-bar');
  const started = performance.now();

  await ready(video);
  video.play().catch(() => {});

  // Preload the hero frames while the loader is up (desktop only).
  let images = null;
  if (useFrameSequence) {
    images = await preload((loaded, total) => {
      bar.style.width = Math.round((loaded / total) * 100) + '%';
    });
  } else {
    // Mobile / reduced-motion: nothing heavy to fetch — run a short progress.
    await new Promise((resolve) => {
      gsap.to(bar, { width: '100%', duration: 1.1, ease: EASE_ENTRANCE, onComplete: resolve });
    });
  }
  bar.style.width = '100%';

  const elapsed = performance.now() - started;
  if (elapsed < LOADER_MIN_MS) {
    await new Promise((r) => setTimeout(r, LOADER_MIN_MS - elapsed));
  }

  await splitReveal(loader);
  return images;
}

function splitReveal(loader) {
  const top = loader.querySelector('.loader__split--top');
  const bottom = loader.querySelector('.loader__split--bottom');
  const inner = loader.querySelector('.loader__inner');
  const video = loader.querySelector('.loader__video');
  const progress = loader.querySelector('.loader__progress');
  const stage = document.querySelector('.hero__stage');

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: () => { loader.style.display = 'none'; resolve(); } });

    // panels take over the screen (black on black — invisible swap)
    tl.set([top, bottom], { display: 'block' });
    tl.set(stage, { scale: 1.14, transformOrigin: '50% 50%' });

    // the seam widens to full width, chrome drops behind the panels
    tl.to(progress, { width: '100vw', duration: 0.32, ease: EASE_ENTRANCE }, 0);
    tl.to([inner, video], { autoAlpha: 0, duration: 0.25, ease: EASE_EXIT }, 0.06);

    // halves slide away, seam blooms and fades
    tl.to(top, { yPercent: -100, duration: 0.8, ease: EASE_EXIT }, 0.3);
    tl.to(bottom, { yPercent: 100, duration: 0.8, ease: EASE_EXIT }, 0.3);
    tl.to(progress, { autoAlpha: 0, duration: 0.5, ease: EASE_EXIT }, 0.42);

    // hero pushes in to meet the split
    tl.to(stage, { scale: 1, duration: 0.9, ease: EASE_ENTRANCE }, 0.3);
  });
}
