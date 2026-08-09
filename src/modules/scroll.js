// Lenis smooth scroll wired into the GSAP ticker + ScrollTrigger.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

export function initScroll() {
  // Under reduced motion we leave native scrolling untouched.
  if (prefersReducedMotion) {
    ScrollTrigger.normalizeScroll(false);
    return null;
  }

  lenis = new Lenis({
    duration: 1.2,
    // Exponential ease-out — never linear.
    easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

// Clamped scroll velocity (used to feed the hero skew).
export function getVelocity() {
  return lenis ? lenis.velocity : 0;
}

export function stopScroll() {
  lenis?.stop();
}
export function startScroll() {
  lenis?.start();
}
