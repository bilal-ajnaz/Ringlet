/* Ringlet site. No dependencies. */
(() => {
  'use strict';

  // Set this once the app is live, e.g. 'https://apps.apple.com/app/id0000000000'.
  // Until then every App Store button points at the download section on this page.
  const APP_STORE_URL = '';

  if (APP_STORE_URL) {
    document.querySelectorAll('.js-store').forEach((a) => { a.href = APP_STORE_URL; a.rel = 'noopener'; });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Nav menu (phones) ---------- */
  const nav = document.querySelector('[data-nav]');
  const menuBtn = nav && nav.querySelector('.slab__menu');
  if (nav && menuBtn) {
    const setOpen = (open) => {
      nav.toggleAttribute('data-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? 'Close' : 'Menu';
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.hasAttribute('data-open')));
    nav.querySelectorAll('.slab__links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.hasAttribute('data-open')) { setOpen(false); menuBtn.focus(); } });
  }

  /* ---------- Device switcher ---------- */
  const tabs = Array.from(document.querySelectorAll('.seg [role="tab"]'));
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  if (tabs.length) {
    select(tabs[0], false);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          select(next, true);
        }
      });
    });
  }

  /* ---------- Pinned screen ---------- */
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const stageImgs = Array.from(document.querySelectorAll('[data-stage-img]'));
  if (panels.length && stageImgs.length && 'IntersectionObserver' in window) {
    const show = (idx) => {
      panels.forEach((p) => p.classList.toggle('is-current', p.dataset.panel === idx));
      stageImgs.forEach((im) => im.classList.toggle('is-on', im.dataset.stageImg === idx));
    };
    show('0');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target.dataset.panel); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    panels.forEach((p) => io.observe(p));
  }

  /* ---------- Starter tones: a port of BeatSynth from the app (Audio/Beat.swift) ---------- */
  const on = (idx) => Array.from({ length: 16 }, (_, i) => idx.includes(i));
  const SCALES = { sunny: [0, 2, 4, 7, 9, 12, 14, 16], dreamy: [0, 4, 6, 7, 11, 12, 14, 18], moody: [0, 3, 5, 7, 10, 12, 15, 17] };
  const CONTOUR = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 7, 3];
  const TONES = [
    { name: 'Sunday Drive', bpm: 100, mood: 'sunny', kick: on([0, 6, 8]), snare: on([4, 12]), hat: on([0, 2, 4, 6, 8, 10, 12, 14]), mel: on([0, 2, 4, 7, 8, 10, 12, 15]) },
    { name: 'Pop Tick', bpm: 120, mood: 'sunny', kick: on([0, 8]), snare: on([4, 12]), hat: on([0, 2, 4, 6, 8, 10, 12, 14]), mel: on([0, 2, 3, 6, 8, 10, 11, 14]) },
    { name: 'Low Tide', bpm: 84, mood: 'dreamy', kick: on([0, 10]), snare: on([]), hat: on([2, 6, 10, 14]), mel: on([0, 3, 6, 8, 11, 14]) },
    { name: 'Hum', bpm: 96, mood: 'moody', kick: on([0, 7, 8]), snare: on([4, 12]), hat: on([0, 2, 4, 6, 8, 10, 12, 14]), mel: on([0, 4, 8, 12]) },
    { name: 'Grain', bpm: 104, mood: 'sunny', kick: on([0, 7, 8, 11]), snare: on([4, 12]), hat: on([0, 2, 4, 6, 8, 10, 12, 14, 15]), mel: on([0, 3, 6, 10, 13]) },
  ];
  const INSTRUMENTS = ['kick', 'snare', 'hat', 'mel'];
  const SR = 44100;

  function voice(inst, step, mood) {
    let seed = (2463534242 + step * 977 + inst.length * 131) >>> 0;
    const noise = () => {
      seed = (seed ^ (seed << 13)) >>> 0;
      seed = (seed ^ (seed >>> 17)) >>> 0;
      seed = (seed ^ (seed << 5)) >>> 0;
      return seed / 4294967295 * 2 - 1;
    };
    const env = (t, peak, dur) => {
      const a = 0.004;
      if (t < a) return peak * t / a;
      const k = Math.log(peak / 0.0001) / Math.max(0.01, dur - a);
      return peak * Math.exp(-k * (t - a));
    };
    const tri = (x) => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;
    const highpass = (fc) => {
      const rc = 1 / (2 * Math.PI * fc), dt = 1 / SR, a = rc / (rc + dt);
      let y = 0, px = 0;
      return (x) => { y = a * (y + x - px); px = x; return y; };
    };
    let n, out;
    switch (inst) {
      case 'kick': {
        n = Math.floor(0.4 * SR); out = new Float32Array(n); let phase = 0;
        for (let i = 0; i < n; i++) {
          const t = i / SR;
          const f = 160 * Math.pow(42 / 160, Math.min(1, t / 0.14));
          phase += 2 * Math.PI * f / SR;
          out[i] = Math.sin(phase) * env(t, 1, 0.38);
        }
        return out;
      }
      case 'snare': {
        n = Math.floor(0.2 * SR); out = new Float32Array(n); const hp = highpass(1400);
        for (let i = 0; i < n; i++) { const t = i / SR; out[i] = hp(noise()) * env(t, 0.55, 0.18) + tri(200 * t) * env(t, 0.35, 0.1); }
        return out;
      }
      case 'hat': {
        n = Math.floor(0.06 * SR); out = new Float32Array(n); const hp = highpass(7000);
        for (let i = 0; i < n; i++) { const t = i / SR; out[i] = hp(noise()) * env(t, 0.22, 0.05); }
        return out;
      }
      default: {
        const note = SCALES[mood][CONTOUR[step % 16]];
        const f = 261.63 * Math.pow(2, note / 12);
        n = Math.floor(0.45 * SR); out = new Float32Array(n);
        for (let i = 0; i < n; i++) { const t = i / SR; out[i] = tri(f * t) * env(t, 0.22, 0.42) + Math.sin(2 * Math.PI * 2 * f * t) * env(t, 0.06, 0.25); }
        return out;
      }
    }
  }

  function renderBar(p) {
    const step = Math.floor(SR * 60 / p.bpm / 4);
    const n = step * 16;
    const out = new Float32Array(n);
    for (let i = 0; i < 16; i++) {
      for (const inst of INSTRUMENTS) {
        if (!p[inst][i]) continue;
        const v = voice(inst, i, p.mood);
        const at = i * step;
        for (let j = 0; j < v.length; j++) out[(at + j) % n] += v[j];
      }
    }
    for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * 0.85) * 0.92;
    return out;
  }

  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const playBtn = deck.querySelector('[data-play]');
  const heroBtn = document.querySelector('[data-play-hero]');
  const head = deck.querySelector('[data-head]');
  const timeEl = deck.querySelector('[data-time]');
  const nameEl = deck.querySelector('[data-tone-name]');
  const bpmEl = deck.querySelector('[data-tone-bpm]');
  const moodEl = deck.querySelector('[data-tone-mood]');
  const lanes = INSTRUMENTS.map((k) => Array.from(deck.querySelectorAll(`[data-lane="${k}"] .step`)));
  const firstSteps = deck.querySelector('.lane__steps');
  const radios = Array.from(document.querySelectorAll('[data-tones] input'));

  let current = 0;
  let ctx = null, src = null, gain = null, t0 = 0, raf = 0, origin = null, lastStep = -1;
  const buffers = new Map();

  const draw = () => {
    const p = TONES[current];
    INSTRUMENTS.forEach((k, li) => lanes[li].forEach((el, i) => el.classList.toggle('on', p[k][i])));
    nameEl.textContent = p.name;
    bpmEl.textContent = p.bpm;
    moodEl.textContent = p.mood;
    playBtn.setAttribute('aria-label', `${isPlaying() ? 'Pause' : 'Play'} ${p.name}`);
  };

  const isPlaying = () => !!src;

  const bufferFor = (i) => {
    if (!buffers.has(i)) {
      const data = renderBar(TONES[i]);
      const buf = ctx.createBuffer(2, data.length, SR);
      buf.copyToChannel(data, 0); buf.copyToChannel(data, 1);
      buffers.set(i, buf);
    }
    return buffers.get(i);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

  const tick = () => {
    if (!src) return;
    const elapsed = Math.max(0, ctx.currentTime - t0);
    const barDur = src.buffer.duration;
    const pos = (elapsed % barDur) / barDur;
    const step = Math.min(15, Math.floor(pos * 16));
    const width = firstSteps.getBoundingClientRect().width;
    if (!reduceMotion.matches) head.style.transform = `translateX(${(pos * width).toFixed(1)}px)`;
    if (step !== lastStep) {
      lanes.forEach((lane) => lane.forEach((el, i) => el.classList.toggle('is-hit', i === step && el.classList.contains('on'))));
      lastStep = step;
    }
    timeEl.textContent = fmt(elapsed);
    raf = requestAnimationFrame(tick);
  };

  const setUi = () => {
    const playing = isPlaying();
    deck.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-pressed', String(playing));
    if (heroBtn) {
      const heroOn = playing && origin === heroBtn;
      heroBtn.classList.toggle('is-playing', heroOn);
      heroBtn.querySelector('.cap-pill__title').textContent = heroOn ? 'Pause Sunday Drive' : 'Play Sunday Drive';
    }
    draw();
  };

  const stop = () => {
    if (src) { try { src.stop(); } catch (_) { /* already stopped */ } src.disconnect(); src = null; }
    cancelAnimationFrame(raf);
    lanes.forEach((lane) => lane.forEach((el) => el.classList.remove('is-hit')));
    head.style.transform = 'translateX(0)';
    lastStep = -1;
    origin = null;
    setUi();
  };

  const start = (from) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { playBtn.disabled = true; if (heroBtn) heroBtn.disabled = true; return; }
    if (!ctx) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0.7; gain.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    if (src) stop();
    src = ctx.createBufferSource();
    src.buffer = bufferFor(current);
    src.loop = true;
    src.connect(gain);
    t0 = ctx.currentTime + 0.03;
    src.start(t0);
    origin = from;
    setUi();
    raf = requestAnimationFrame(tick);
  };

  playBtn.addEventListener('click', () => (isPlaying() ? stop() : start(playBtn)));
  if (heroBtn) {
    heroBtn.addEventListener('click', () => {
      if (isPlaying() && origin === heroBtn) { stop(); return; }
      current = 0;
      radios[0].checked = true;
      start(heroBtn);
    });
  }
  radios.forEach((r) => r.addEventListener('change', () => {
    current = Number(r.value);
    const wasPlaying = isPlaying();
    if (wasPlaying) start(playBtn); else draw();
  }));

  // Settle the clips once, and stop the loop when its control leaves the screen.
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { deck.classList.add('is-in'); reveal.unobserve(e.target); }
    }), { rootMargin: '0px 0px -15% 0px' });
    reveal.observe(deck);

    const away = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting && origin && (origin === e.target || e.target.contains(origin))) stop();
    }));
    away.observe(deck);
    if (heroBtn) away.observe(heroBtn.closest('section'));
  } else {
    deck.classList.add('is-in');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && isPlaying()) stop(); });

  draw();
})();
