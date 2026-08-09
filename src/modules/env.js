// Environment flags that decide how heavy an experience each visitor gets.
export const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Coarse pointer OR narrow viewport → treat as mobile: no frame sequence download.
export const isMobile =
  window.matchMedia('(hover: none), (pointer: coarse)').matches ||
  window.innerWidth < 820;

// Only desktop, motion-friendly visitors get the full scrubbed frame sequence.
export const useFrameSequence = !prefersReducedMotion && !isMobile;
