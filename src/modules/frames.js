// Hero frame sequence: manifest, preloader (bounded concurrency), canvas draw.

let manifest = null;

export async function loadManifest(path = '/frames/manifest.json') {
  if (manifest) return manifest;
  const res = await fetch(path);
  manifest = await res.json();
  return manifest;
}

export function frameUrl(m, i) {
  const n = String(m.first + i).padStart(m.pad, '0');
  const dir = m.dir || '/frames';
  return `${dir}/${m.prefix}${n}.${m.ext}`;
}

/**
 * Preload the whole sequence with bounded concurrency.
 * onProgress(loaded, total) fires as each image resolves.
 * Returns HTMLImageElement[] in frame order.
 */
export async function preloadFrames(m, onProgress, concurrency = 10) {
  const total = m.count;
  const images = new Array(total);
  let loaded = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < total) {
      const i = cursor++;
      await new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = img.onerror = () => {
          images[i] = img;
          loaded++;
          onProgress?.(loaded, total);
          resolve();
        };
        img.src = frameUrl(m, i);
      });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, worker)
  );
  return images;
}

// Cover-fit draw (like object-fit: cover) onto a DPR-scaled canvas.
export function drawCover(ctx, img, cw, ch) {
  if (!img || !img.width) return;
  const ir = img.width / img.height;
  const cr = cw / ch;
  let dw, dh, dx, dy;
  if (ir > cr) {
    dh = ch;
    dw = ch * ir;
    dx = (cw - dw) / 2;
    dy = 0;
  } else {
    dw = cw;
    dh = cw / ir;
    dx = 0;
    dy = (ch - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}
