# Stillwater House — Halcyon Estates

A cinematic, scroll-driven 3D website for a premium real-estate house.
The page is a single continuous camera journey — an architectural film,
not a landing page: across a mountain lake at dusk, through the forest to a
cantilevered glass-and-timber villa, around the pool, through the interior,
and out into a star-field finale where the contact details hang as a
constellation.

## Run it

```bash
npm install
npm run dev        # development server
# or
npm run build      # production bundle in dist/
npx vite preview   # serve the production build
```

Open the printed local URL and scroll. The journey is ~14 viewport-heights
long; the top navigation jumps to any act. Keyboard (arrows / PageUp /
PageDown / Home / End) works natively, pointer movement adds a subtle
parallax in the opening.

- `prefers-reduced-motion` → the WebGL journey is replaced by the full
  semantic editorial page (same content).
- No WebGL → same fallback.
- All essential content exists as accessible semantic HTML regardless of
  mode (`#content`), hidden visually while the film plays.

## The seven in-world text reveals

| Act | Content | Mechanism |
| --- | --- | --- |
| Overture | Brand title | Set high over the lake; the camera reads the sky, then it dissolves |
| Story | The brief | Thrown onto a boulder by a gobo spotlight (sun projection) |
| Services | What we do | Engraved into the entry monolith (carved shadow + highlight) |
| Portfolio | Selected residences | Typography on dark steles at the pool, read together with the water |
| Process | How we work | Blades of light sweep the interior wall, lighting each word in turn |
| Results | The record | A framed typeset artwork on the timber wall |
| Voices | Testimonials | Written on the glass facade, read at the glancing angle |
| Contact + footer | Begin the conversation | A constellation in the night sky; legal line engraved in the balustrade |

## Assets & licenses

Every model, PBR material and HDR environment is from **Poly Haven (CC0)**;
fonts are **Fraunces** and **Space Grotesk** (SIL OFL). Full manifest with
per-asset links in [ASSETS.md](ASSETS.md). No license-clean scanned villa
exists in CC0 libraries, so the architectural shell is authored geometry
clad exclusively in Poly Haven PBR material sets — disclosed in the manifest.

Raw glTF downloads (~844 MB) were optimized to ~69 MB of web-ready GLBs
(`public/assets/models-opt/`) via gltf-transform + meshopt simplification,
1024px JPEG textures and quantized attributes (`tools/optimize-assets.mjs`).

## Tech

Vite + three.js (WebGL2, ACES tone mapping, PMREM image-based lighting,
planar `Reflector` pool, instanced vegetation, adaptive quality ladder).
Canvas-typeset typography on in-world planes (Fraunces / Space Grotesk via
FontFace). Post: restrained UnrealBloom + OutputPass.

## Dev tooling

- `tools/download-assets.mjs` — fetch raw assets from Poly Haven / Google Fonts
- `tools/optimize-assets.mjs` — compress models to web-ready GLBs
- `tools/shoot.mjs [url] [fractions]` — headless screenshot pass over the journey
- `tools/snap.mjs <p> <name> [cam…] [night]` — deterministic single-frame capture
- `tools/accept.mjs` — acceptance pass: real scroll, nav jump, keyboard, fallback
