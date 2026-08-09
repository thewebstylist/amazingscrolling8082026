# HELION AXIS

A single-page launch film for a fictional performance car — **HELION AXIS**.
Pure black, bone-white type, every trace of colour coming from the footage.

The whole page is driven by one 30-second Seedance shot of the car orbiting in a
black void as magenta and cyan powder bursts spill coloured light across the
paint. That shot is extracted to a WebP frame sequence and **scrubbed on a
canvas against scroll position** — never by seeking a `<video>`.

## Stack

- **Vite** + vanilla JavaScript (no framework)
- **GSAP** (ScrollTrigger + CustomEase) for animation
- **Lenis** for smooth scroll
- Fonts: **Archivo** (variable, driven to its widest/heaviest for the display)
  and **Martian Mono** (labels), from Google Fonts

## How the hero works

- `public/frames/frame_0001.webp … frame_0451.webp` — the hero shot at 15fps,
  1470px wide, described by `public/frames/manifest.json`.
- The loader preloads every frame; the hero section is pinned and the correct
  frame is drawn to a canvas from scroll progress.
- It lands in an **idle** state (the clip plays slowly on its own) and eases
  control over to the scroll on the visitor's first scroll input.
- Scroll velocity (from Lenis) feeds a small clamped skew on the canvas.
- **Mobile:** the frame sequence is never downloaded — a poster frame is shown.
- **`prefers-reduced-motion`:** the hero holds one frame and the page scrolls
  normally.

## Assets

Footage was generated with Seedance 2.5 (via Higgsfield):

- **Hero** — 30s, 21:9, the orbiting car / powder bursts / moving light.
- **Loader** — 5s macro surface pass, referenced to the hero for a paint match.
  Lives at `public/loader.mp4` and plays (muted) behind the wordmark. If it is
  absent the loader falls back to the poster frame.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deploy

Static Vite build. On Vercel it is auto-detected (`vercel.json` pins
`framework: vite`, output `dist/`). Push the repo and import it, or run
`vercel` / `vercel --prod` from the project root.

---

*HELION AXIS is fiction. It is not a real car, brand, or company.*
