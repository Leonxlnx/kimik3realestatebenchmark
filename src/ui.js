import { state, ACTS } from './state.js';

export function initUI() {
  // scroll runway — the journey is ~14 viewport-heights long
  const runway = document.createElement('div');
  runway.id = 'runway';
  runway.style.height = '1400vh';
  document.body.appendChild(runway);

  const hint = document.getElementById('scroll-hint');
  const fill = document.getElementById('progress-fill');
  const navLinks = [...document.querySelectorAll('#journey-nav a')];

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const m = maxScroll();
      state.progress = m > 0 ? Math.min(1, Math.max(0, window.scrollY / m)) : 0;
      fill.style.width = `${(state.smooth * 100).toFixed(2)}%`;
      hint.classList.toggle('gone', state.progress > 0.015);
      const p = state.smooth;
      let active = 0;
      ACTS.forEach((a, i) => {
        if (p >= a.at - 0.04) active = i;
      });
      navLinks.forEach((l, i) => l.classList.toggle('active', i === active));
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // nav jumps
  for (const link of document.querySelectorAll('[data-jump]')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const p = parseFloat(link.dataset.jump);
      window.scrollTo({ top: p * maxScroll(), behavior: 'smooth' });
      link.blur();
    });
  }

  // pointer parallax (fine pointers only)
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        state.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        state.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true },
    );
  }

  return {
    tick(dt) {
      // ease the pointer toward its target — buttery, never twitchy
      state.pointer.sx += (state.pointer.x - state.pointer.sx) * (1 - Math.exp(-dt * 4));
      state.pointer.sy += (state.pointer.y - state.pointer.sy) * (1 - Math.exp(-dt * 4));
      fill.style.width = `${(state.smooth * 100).toFixed(2)}%`;
    },
  };
}

export function setLoader(done, total, note) {
  const fillEl = document.getElementById('loader-fill');
  const noteEl = document.getElementById('loader-note');
  const f = total ? done / total : 0;
  fillEl.style.width = `${Math.round(f * 100)}%`;
  if (note && noteEl) noteEl.textContent = note;
}

export function finishLoader() {
  document.getElementById('loader').classList.add('done');
}

export function fallbackMode(reason) {
  // No WebGL journey: the semantic content page is the experience.
  console.info('[stillwater] fallback mode:', reason);
  document.body.classList.remove('webgl');
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('done');
  const hint = document.getElementById('scroll-hint');
  if (hint) hint.remove();
}
