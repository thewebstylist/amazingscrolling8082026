// Environment flags that decide how heavy an experience each visitor gets.
export const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Coarse pointer OR narrow viewport → phone/tablet. Still gets the scrub, but
// from a lighter frame set.
export const isMobile =
  window.matchMedia('(hover: none), (pointer: coarse)').matches ||
  window.innerWidth < 820;

// Everyone who hasn't asked for reduced motion gets the scrubbed hero.
// Mobile just pulls a smaller, decimated sequence.
export const useFrameSequence = !prefersReducedMotion;

// Which manifest to load for the hero scrub.
export const manifestPath = isMobile
  ? '/frames-m/manifest.json'
  : '/frames/manifest.json';
