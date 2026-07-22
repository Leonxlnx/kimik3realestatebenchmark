// Shared journey state.
export const state = {
  progress: 0, // raw scroll 0..1
  smooth: 0, // eased scroll used by the camera
  night: 0, // 0 = dusk, 1 = night
  pointer: { x: 0, y: 0, sx: 0, sy: 0 }, // normalized -1..1 + smoothed
  quality: 2, // 2 = full, 1 = reduced, 0 = minimal
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  webgl: false,
};

export const ACTS = [
  { id: 'act-overture', at: 0.02 },
  { id: 'act-story', at: 0.16 },
  { id: 'act-services', at: 0.28 },
  { id: 'act-portfolio', at: 0.44 },
  { id: 'act-process', at: 0.55 },
  { id: 'act-voices', at: 0.72 },
  { id: 'act-contact', at: 0.96 },
];
