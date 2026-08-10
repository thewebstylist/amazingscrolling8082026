// Chapter rail — lights the active act and shows itself only while the hero
// is pinned. Driven by the events the hero dispatches.
export function initHud() {
  const rail = document.getElementById('rail');
  if (!rail) return;
  const items = [...rail.querySelectorAll('.rail__item')];
  const starts = [0, 0.3, 0.62, 0.9]; // chapter entry points in hero progress

  window.addEventListener('hero:active', (e) => {
    rail.classList.toggle('is-visible', !!e.detail.active);
  });

  window.addEventListener('hero:progress', (e) => {
    const p = e.detail.progress;
    let idx = 0;
    for (let i = 0; i < starts.length; i++) if (p >= starts[i]) idx = i;
    items.forEach((it, i) => it.classList.toggle('is-active', i === idx));
  });
}
