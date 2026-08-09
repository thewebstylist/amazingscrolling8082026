import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useFrameSequence } from './modules/env.js';
import './modules/eases.js';
import { initScroll, stopScroll, startScroll } from './modules/scroll.js';
import { loadManifest, preloadFrames } from './modules/frames.js';
import { runLoader } from './modules/loader.js';
import { initHero } from './modules/hero.js';
import { initCursor } from './modules/cursor.js';
import { initMagnetic } from './modules/magnetic.js';
import {
  prepLines,
  revealLines,
  revealDisplay,
  scramble,
  initScrollReveals
} from './modules/reveal.js';
import { initSpecs } from './modules/specs.js';

// Hide lines before first paint so nothing flashes ahead of its reveal.
prepLines();

function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  if (locked) stopScroll();
  else startScroll();
}

async function boot() {
  initScroll();
  lockScroll(true);

  // interactive bits can be live immediately (they sit over the loader too)
  initCursor();
  initMagnetic();

  // The frame preloader handed to the loader (desktop only).
  const preload = async (onProgress) => {
    if (!useFrameSequence) return null;
    const manifest = await loadManifest();
    return preloadFrames(manifest, onProgress, 10);
  };

  const images = await runLoader(preload);

  // Hero is now interactive.
  initHero(images);
  ScrollTrigger.refresh();

  lockScroll(false);
  revealHero();

  initScrollReveals();
  initSpecs();
}

function revealHero() {
  const display = document.querySelector('.display[data-scramble]');
  if (display) {
    scramble(display, { duration: 0.95 });
    revealDisplay(display, 0);
  }
  document.querySelectorAll('.hero [data-lines]').forEach((block, i) => {
    revealLines(block, 0.35 + i * 0.1);
  });
}

// Kick off once fonts are settling — keeps the display metrics stable for the
// scramble/measure, but never blocks longer than a beat.
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(boot);
} else {
  boot();
}
