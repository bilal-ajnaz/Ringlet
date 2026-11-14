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
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();

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
          select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
        }
      });
    });
  }

  /* ---------- How it works: pinned screen and colour field ---------- */
  const how = document.querySelector('.how');
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const stageImgs = Array.from(document.querySelectorAll('[data-stage-img]'));
  if (how && panels.length && 'IntersectionObserver' in window) {
    const show = (idx) => {
      how.dataset.field = idx;
      panels.forEach((p) => p.classList.toggle('is-current', p.dataset.panel === idx));
      stageImgs.forEach((im) => im.classList.toggle('is-on', im.dataset.stageImg === idx));
    };
    show('0');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target.dataset.panel); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    panels.forEach((p) => io.observe(p));
  }

  /* ---------- Records: the app's RecordFace recipe (Design/Record.swift) on a canvas ---------- */
  const VINYLS = ['black', 'smoke', 'cream', 'ocean', 'clay'];
  const LABELS = ['signal', 'lime', 'sky', 'blush', 'butter', 'paper'];
  const vinyl = (v) => ({
    face: token(`--vinyl-${v}`), lip: token(`--vinyl-${v}-lip`),
    edge: token(`--vinyl-${v}-edge`), edgeHi: token(`--vinyl-${v}-edge-hi`), light: v === 'cream',
  });
  const plainWave = (f) => { const x = f * 60; return Math.abs(Math.sin(x * 0.5) * 0.6 + Math.sin(x * 0.18 + 1) * 0.4); };
  const BARS = 72;

  function drawRecord(ctx, s, d, angle, amps) {
    const R = s / 2, v = vinyl(d.vinyl), label = token(`--label-${d.label}`), ink = token('--record-ink');
    const circle = (r) => { ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, Math.PI * 2); };
    ctx.clearRect(0, 0, s, s);
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(angle);

    circle(R); ctx.fillStyle = v.face; ctx.fill();
    const lipW = s * 0.04;
    circle(R - lipW / 2); ctx.lineWidth = lipW; ctx.strokeStyle = v.lip; ctx.stroke();
    const rim = v.light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    circle(R - s * 0.002); ctx.lineWidth = s * 0.004; ctx.strokeStyle = rim; ctx.stroke();
    circle(R - lipW); ctx.lineWidth = s * 0.002; ctx.strokeStyle = v.light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'; ctx.stroke();

    const r0 = R * 0.52, maxH = R * 0.32, floor = 0.12;
    const litStart = d.litStart ?? 0.55, litWidth = d.litWidth ?? 0.6;
    const inSel = (f) => { let x = f - litStart; x -= Math.floor(x); return x < litWidth; };

    if (d.groove === 'rings') {
      ctx.lineWidth = Math.max(1, s * 0.002);
      ctx.strokeStyle = v.light ? 'rgba(18,18,18,0.12)' : 'rgba(255,255,255,0.07)';
      for (let r = R - lipW - s * 0.012; r > s * 0.2; r -= s * 0.012) { circle(r); ctx.stroke(); }
      const level = amps ? amps.reduce((a, b) => a + b, 0) / amps.length : 0;
      ctx.beginPath();
      const a0 = litStart * Math.PI * 2 - Math.PI / 2, a1 = a0 + litWidth * Math.PI * 2;
      ctx.arc(0, 0, r0 + maxH * 0.9, a0, a1);
      ctx.arc(0, 0, r0, a1, a0, true);
      ctx.closePath();
      ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, level * 1.6);
      ctx.fillStyle = label; ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      const w = d.groove === 'dots' ? Math.max(3.5, s * 0.014) : Math.max(2, s * 0.0085);
      const dim = v.light ? 'rgba(18,18,18,0.18)' : 'rgba(255,255,255,0.16)';
      for (let i = 0; i < BARS; i++) {
        const f = i / BARS;
        const amp = amps ? amps[i] : plainWave(f);
        const h = maxH * (floor + (1 - floor) * amp);
        ctx.save();
        ctx.rotate(f * Math.PI * 2);
        ctx.fillStyle = inSel(f) ? label : dim;
        ctx.beginPath();
        if (d.groove === 'lines') ctx.roundRect(-w / 2, -(r0 + h), w, h, w / 2);
        else ctx.arc(0, -(r0 + h) + w / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const lr = s * 0.18;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = s * 0.03;
    circle(lr * 0.98); ctx.fillStyle = label; ctx.fill();
    ctx.restore();
    circle(lr); ctx.fillStyle = label; ctx.fill();
    circle(lr - s * 0.002); ctx.lineWidth = s * 0.003; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    circle(s * 0.117); ctx.lineWidth = s * 0.003; ctx.strokeStyle = 'rgba(18,18,18,0.14)'; ctx.stroke();
    ctx.fillStyle = ink; ctx.globalAlpha = 0.85;
    ctx.font = `700 ${Math.round(s * 0.085)}px Ranade, ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.mono || 'R', 0, -s * 0.1);
    ctx.globalAlpha = 1;
    circle(s * 0.02); ctx.fillStyle = token('--record-spindle'); ctx.fill();
    ctx.restore();
  }

  function sizeCanvas(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(canvas.clientWidth * dpr);
    if (px > 0 && canvas.width !== px) { canvas.width = px; canvas.height = px; return true; }
    return false;
  }

  class Turntable {
    constructor(root, design) {
      this.root = root;
      this.canvas = root.querySelector('.disc__face');
      this.ctx = this.canvas.getContext('2d');
      this.design = { ...design };
      this.angle = -0.35;
      this.vel = 0;
      this.playing = false;
      this.amps = null;
      this.applyLook();
      if ('ResizeObserver' in window) new ResizeObserver(() => { if (sizeCanvas(this.canvas)) this.draw(); }).observe(this.canvas);
      sizeCanvas(this.canvas);
      this.draw();
    }
    set(patch) { Object.assign(this.design, patch); this.applyLook(); this.draw(); }
    applyLook() {
      const v = vinyl(this.design.vinyl);
      this.root.style.setProperty('--wall-lo', v.edge);
      this.root.style.setProperty('--wall-hi', v.edgeHi);
      this.root.style.setProperty('--sheen', { matte: 0.35, gloss: 1, holo: 0.8 }[this.design.finish] ?? 1);
      this.root.style.setProperty('--holo', this.design.finish === 'holo' ? 0.2 : 0);
    }
    setPlaying(on) { this.playing = on; this.root.classList.toggle('is-playing', on); if (!on) { this.amps = null; this.draw(); } }
    draw() { if (this.canvas.width) drawRecord(this.ctx, this.canvas.width, this.design, this.angle, this.amps); }
    step(dt) {
      const target = this.playing && !reduceMotion.matches ? (200 * Math.PI) / 180 : 0; // 33 1/3 rpm
      this.vel += (target - this.vel) * Math.min(1, dt * 2.5);
      if (Math.abs(this.vel) < 0.002 && !this.playing) { this.vel = 0; return false; }
      this.angle += this.vel * dt;
      this.draw();
      return true;
    }
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
          phase += 2 * Math.PI * (160 * Math.pow(42 / 160, Math.min(1, t / 0.14))) / SR;
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
        const f = 261.63 * Math.pow(2, SCALES[mood][CONTOUR[step % 16]] / 12);
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

  /* ---------- Audio: one tone at a time, with an analyser so the bars follow the sound ---------- */
  const audio = { ctx: null, gain: null, analyser: null, bins: null, src: null, t0: 0, owner: null, buffers: new Map(), smooth: new Float32Array(BARS) };

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!audio.ctx) {
      audio.ctx = new AC();
      audio.gain = audio.ctx.createGain(); audio.gain.gain.value = 0.7;
      audio.analyser = audio.ctx.createAnalyser(); audio.analyser.fftSize = 256; audio.analyser.smoothingTimeConstant = 0.72;
      audio.bins = new Uint8Array(audio.analyser.frequencyBinCount);
      audio.analyser.connect(audio.gain); audio.gain.connect(audio.ctx.destination);
    }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return true;
  }

  function bufferFor(i) {
    if (!audio.buffers.has(i)) {
      const data = renderBar(TONES[i]);
      const buf = audio.ctx.createBuffer(2, data.length, SR);
      buf.copyToChannel(data, 0); buf.copyToChannel(data, 1);
      audio.buffers.set(i, buf);
    }
    return audio.buffers.get(i);
  }

  function levels() {
    audio.analyser.getByteFrequencyData(audio.bins);
    const out = audio.smooth;
    for (let i = 0; i < BARS; i++) {
      const m = i < BARS / 2 ? i : BARS - 1 - i;           // mirror, so the ring is symmetric
      const bin = 1 + Math.floor(m * 0.85);
      const level = audio.bins[bin] / 255;
      const target = Math.min(1, plainWave(i / BARS) * 0.18 + level * 1.05);
      out[i] = out[i] * 0.55 + target * 0.45;
    }
    return out;
  }

  /* ---------- Wiring ---------- */
  const tables = {};
  const heroRoot = document.querySelector('[data-turntable="hero"]');
  const pressRoot = document.querySelector('[data-turntable="press"]');
  if (heroRoot) tables.hero = new Turntable(heroRoot, { vinyl: 'black', label: 'signal', groove: 'lines', finish: 'gloss', mono: 'S' });

  const controls = document.querySelector('[data-controls]');
  const value = (name) => { const el = controls && controls.querySelector(`input[name="${name}"]:checked`); return el ? el.value : null; };
  const nameInput = document.getElementById('ring-name');
  const monoOf = (s) => { const m = (s || '').trim().match(/\p{L}|\p{N}/u); return m ? m[0].toUpperCase() : 'R'; };
  const pressDesign = () => ({ vinyl: value('vinyl') || 'black', label: value('label') || 'sky', groove: value('groove') || 'dots', finish: value('finish') || 'gloss', mono: monoOf(nameInput && nameInput.value), litStart: 0.05, litWidth: 0.7 });
  if (pressRoot) tables.press = new Turntable(pressRoot, pressDesign());

  const heroBtn = document.querySelector('[data-play-for="hero"]');
  const pressBtn = document.querySelector('[data-play-for="press"]');
  const pressName = document.querySelector('[data-press-name]');
  const pressSub = document.querySelector('[data-press-sub]');
  const pressTime = document.querySelector('[data-press-time]');
  const toneIndex = () => Number(value('tone') || 0);

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

  function syncButtons() {
    const heroOn = audio.owner === 'hero', pressOn = audio.owner === 'press';
    if (heroBtn) {
      heroBtn.setAttribute('aria-pressed', String(heroOn));
      heroBtn.querySelector('[data-play-label]').textContent = heroOn ? 'Pause Sunday Drive' : 'Play Sunday Drive';
    }
    if (pressBtn) {
      pressBtn.setAttribute('aria-pressed', String(pressOn));
      pressBtn.setAttribute('aria-label', pressOn ? 'Pause your record' : 'Play your record');
    }
  }

  function stop() {
    if (audio.src) { try { audio.src.stop(); } catch (_) { /* already stopped */ } audio.src.disconnect(); audio.src = null; }
    if (audio.owner && tables[audio.owner]) tables[audio.owner].setPlaying(false);
    audio.owner = null;
    if (pressTime) pressTime.textContent = fmt(0);
    syncButtons();
    kick();
  }

  function play(owner, tone) {
    if (!ensureAudio()) { [heroBtn, pressBtn].forEach((b) => b && (b.disabled = true)); return; }
    if (audio.src) stop();
    audio.src = audio.ctx.createBufferSource();
    audio.src.buffer = bufferFor(tone);
    audio.src.loop = true;
    audio.src.connect(audio.analyser);
    audio.t0 = audio.ctx.currentTime + 0.03;
    audio.src.start(audio.t0);
    audio.owner = owner;
    tables[owner].setPlaying(true);
    syncButtons();
    kick();
  }

  if (heroBtn) heroBtn.addEventListener('click', () => (audio.owner === 'hero' ? stop() : play('hero', 0)));
  if (pressBtn) pressBtn.addEventListener('click', () => (audio.owner === 'press' ? stop() : play('press', toneIndex())));

  const refreshPress = () => {
    if (!tables.press) return;
    tables.press.set(pressDesign());
    const t = TONES[toneIndex()];
    if (pressName) pressName.textContent = (nameInput && nameInput.value.trim()) || 'Untitled ring';
    if (pressSub) pressSub.textContent = `${t.name}, ${t.bpm} bpm`;
  };
  if (controls) {
    controls.addEventListener('change', (e) => {
      refreshPress();
      if (e.target.name === 'tone' && audio.owner === 'press') play('press', toneIndex());
    });
    if (nameInput) nameInput.addEventListener('input', refreshPress);
  }
  const shuffleBtn = document.querySelector('[data-shuffle]');
  if (shuffleBtn && controls) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    shuffleBtn.addEventListener('click', () => {
      [['vinyl', VINYLS], ['label', LABELS], ['groove', ['lines', 'dots', 'rings']], ['finish', ['matte', 'gloss', 'holo']]].forEach(([name, opts]) => {
        const el = controls.querySelector(`input[name="${name}"][value="${pick(opts)}"]`);
        if (el) el.checked = true;
      });
      refreshPress();
    });
  }
  refreshPress();

  /* one animation loop, running only while something moves */
  let raf = 0, last = 0;
  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    let busy = false;
    for (const [name, t] of Object.entries(tables)) {
      if (audio.owner === name && audio.analyser) t.amps = reduceMotion.matches ? null : levels();
      if (t.step(dt)) busy = true;
      else if (audio.owner === name) { t.draw(); busy = true; }
    }
    if (audio.owner === 'press' && pressTime && audio.ctx) pressTime.textContent = fmt(Math.max(0, audio.ctx.currentTime - audio.t0));
    if (busy || audio.owner) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // Stop the loop when its record leaves the screen, or the tab is hidden.
  if ('IntersectionObserver' in window) {
    const away = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting && audio.owner && e.target === tables[audio.owner].root) stop();
    }));
    Object.values(tables).forEach((t) => away.observe(t.root));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && audio.owner) stop(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => Object.values(tables).forEach((t) => t.draw()));

  /* ---------- The promise ring: turns as you scroll ---------- */
  const ring = document.querySelector('[data-ring]');
  if (ring) {
    const mini = ring.querySelector('[data-mini-record]');
    const svg = ring.querySelector('svg');
    const paintMini = () => { if (mini && sizeCanvas(mini)) drawRecord(mini.getContext('2d'), mini.width, { vinyl: 'cream', label: 'signal', groove: 'rings', mono: 'R', litStart: 0.1, litWidth: 0.35 }, 0, null); };
    paintMini();
    if ('ResizeObserver' in window && mini) new ResizeObserver(paintMini).observe(mini);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mini) { mini.width = 0; paintMini(); } });
    let ticking = false;
    const turn = () => {
      ticking = false;
      if (reduceMotion.matches) return;
      const r = ring.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2);
      svg.style.transform = `rotate(${(-offset * 0.12).toFixed(2)}deg)`;
      if (mini) mini.style.transform = `rotate(${(-offset * 0.3).toFixed(2)}deg)`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(turn); } }, { passive: true });
    turn();
  }
})();
