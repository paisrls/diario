/* Diario del giorno — PWA personale: cibo, allenamento, qualità della vita.
   Tutti i dati restano sul telefono (localStorage + IndexedDB per le foto). */
'use strict';

const STORAGE_KEY = 'diario-v1';
const MEALS = [
  { id: 'colazione', label: 'Colazione', ico: '☕', ph: 'Es. caffè, yogurt greco, avena…' },
  { id: 'pranzo', label: 'Pranzo', ico: '🍝', ph: 'Es. pasta al pomodoro, insalata…' },
  { id: 'merenda', label: 'Merenda', ico: '🍎', ph: 'Es. frutta, frutta secca…' },
  { id: 'cena', label: 'Cena', ico: '🍽️', ph: 'Es. petto di pollo, verdure, pane…' },
  { id: 'prenanna', label: 'Pre nanna', ico: '🌙', ph: 'Es. tisana, caseine…' },
];

// Recuperi: pesanti 2'30" (3' in fase 1), medi 90", isolamento 60"
const REST = {
  heavy: { label: 'Multiarticolare pesante', secs: (phase) => (phase === 1 ? 180 : 150) },
  medium: { label: 'Multiarticolare medio', secs: () => 90 },
  iso: { label: 'Isolamento', secs: () => 60 },
};

const DEFAULT_PROGRAM = [
  { id: 'ua', name: 'Upper A', exercises: [
    { id: 'panca', name: 'Panca piana', sets: 4, reps: '6-8', rest: 'heavy', img: 'Barbell_Bench_Press_-_Medium_Grip' },
    { id: 'rematore', name: 'Rematore bilanciere', sets: 4, reps: '8', rest: 'heavy', img: 'Bent_Over_Barbell_Row' },
    { id: 'lento', name: 'Lento avanti manubri', sets: 3, reps: '10', rest: 'heavy', img: 'Dumbbell_Shoulder_Press' },
    { id: 'lat-stretta', name: 'Lat machine presa stretta', sets: 3, reps: '10', rest: 'medium', img: 'Close-Grip_Front_Lat_Pulldown' },
    { id: 'curl', name: 'Curl bicipiti', sets: 3, reps: '12', rest: 'iso', img: 'Dumbbell_Bicep_Curl', superset: 'Superserie con push-down' },
    { id: 'pushdown', name: 'Push-down tricipiti', sets: 3, reps: '12', rest: 'iso', img: 'Triceps_Pushdown', superset: 'Superserie con curl' },
  ] },
  { id: 'la', name: 'Lower A', exercises: [
    { id: 'squat', name: 'Squat', sets: 4, reps: '6-8', rest: 'heavy', img: 'Barbell_Squat' },
    { id: 'rumeno', name: 'Stacco rumeno', sets: 3, reps: '8', rest: 'heavy', img: 'Romanian_Deadlift' },
    { id: 'leg-ext', name: 'Leg extension', sets: 3, reps: '12', rest: 'iso', img: 'Leg_Extensions' },
    { id: 'leg-curl', name: 'Leg curl', sets: 3, reps: '12', rest: 'iso', img: 'Lying_Leg_Curls' },
    { id: 'polpacci', name: 'Polpacci', sets: 4, reps: '12', rest: 'iso', img: 'Standing_Calf_Raises' },
  ] },
  { id: 'ub', name: 'Upper B', exercises: [
    { id: 'panca-incl', name: 'Panca inclinata manubri', sets: 4, reps: '8-10', rest: 'medium', img: 'Incline_Dumbbell_Press' },
    { id: 'trazioni', name: 'Trazioni o lat machine', sets: 4, reps: '8', rest: 'heavy', img: 'Pullups' },
    { id: 'pulley', name: 'Pulley basso', sets: 3, reps: '10', rest: 'medium', img: 'Seated_Cable_Rows' },
    { id: 'alzate', name: 'Alzate laterali', sets: 4, reps: '15', rest: 'iso', img: 'Side_Lateral_Raise' },
    { id: 'face-pull', name: 'Face pull', sets: 3, reps: '15', rest: 'iso', img: 'Face_Pull' },
  ] },
  { id: 'lb', name: 'Lower B', exercises: [
    { id: 'stacco', name: 'Stacco da terra', sets: 3, reps: '5', rest: 'heavy', img: 'Barbell_Deadlift' },
    { id: 'leg-press', name: 'Leg press', sets: 4, reps: '10', rest: 'medium', img: 'Leg_Press' },
    { id: 'bulgari', name: 'Affondi bulgari', sets: 3, reps: '10 per gamba', rest: 'medium', img: 'Split_Squat_with_Dumbbells' },
    { id: 'hip-thrust', name: 'Hip thrust', sets: 3, reps: '10', rest: 'medium', img: 'Barbell_Hip_Thrust' },
    { id: 'addome', name: 'Plank o crunch ai cavi', sets: 3, reps: '15', rest: 'iso', img: 'Cable_Crunch' },
  ] },
];

/* ================= Utilità ================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmt = (n, dec = 1) => (n == null ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec }));
const fmtSecs = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const fmtRest = (s) => (s % 60 === 0 ? `${s / 60}'` : s > 60 ? `${Math.floor(s / 60)}'${pad(s % 60)}"` : `${s}"`);
const DOW = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const fmtDate = (k) => { const d = parseKey(k); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtShort = (k) => { const d = parseKey(k); return `${d.getDate()}/${d.getMonth() + 1}`; };
const relDay = (k) => {
  const diff = daysBetween(k, dateKey());
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Ieri';
  if (diff === -1) return 'Domani';
  return fmtDate(k);
};

/* ================= Stato ================= */
function defaultState() {
  return {
    version: 1,
    days: {},
    weights: [],
    workouts: [],
    activeWorkout: null,
    program: structuredClone(DEFAULT_PROGRAM),
    settings: { phase: 1, phaseStart: dateKey(), lastBackup: null },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {
    console.error(e);
    return defaultState();
  }
}

let state = loadState();
let saveTimer = null;
function save(now = false) {
  clearTimeout(saveTimer);
  const doSave = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast('⚠️ Memoria piena: esporta un backup'); }
  };
  if (now) doSave(); else saveTimer = setTimeout(doSave, 250);
}
window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

function day(k) {
  if (!state.days[k]) state.days[k] = { meals: {}, water: 0, cig: 0, drinks: 0, sleep: null };
  return state.days[k];
}
const peekDay = (k) => state.days[k] || { meals: {}, water: 0, cig: 0, drinks: 0, sleep: null };

const ui = { tab: 'cibo', date: dateKey(), statsRange: 7, statsEx: null, workoutView: null };

/* ================= Foto personalizzate (IndexedDB) ================= */
const photoDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('diario-foto', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('foto');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('foto', mode);
      const req = fn(t.objectStore('foto'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k)),
    all: async () => {
      const db = await open();
      return new Promise((res, rej) => {
        const out = {};
        const t = db.transaction('foto', 'readonly');
        const req = t.objectStore('foto').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } };
        t.oncomplete = () => res(out);
        t.onerror = () => rej(t.error);
      });
    },
    clear: () => tx('readwrite', (s) => s.clear()),
  };
})();
const photoCache = {};
async function loadPhotos() {
  try { Object.assign(photoCache, await photoDB.all()); } catch (e) { console.warn(e); }
}

function pickPhoto() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    };
    inp.click();
  });
}

async function changePhoto(exId) {
  const data = await pickPhoto();
  if (!data) return;
  photoCache[exId] = data;
  await photoDB.set(exId, data);
  toast('📸 Foto aggiornata');
  render();
}
async function resetPhoto(exId) {
  delete photoCache[exId];
  await photoDB.del(exId);
  render();
}

/* ================= Programma ================= */
const phase = () => state.settings.phase;
const findEx = (exId) => {
  for (const s of state.program) for (const e of s.exercises) if (e.id === exId) return e;
  return null;
};
const plannedSets = (ex) => (phase() === 1 ? Math.max(1, ex.sets - 1) : ex.sets);
const restSecs = (ex) => (REST[ex.rest] || REST.medium).secs(phase());

function exImageHTML(ex, { small = false } = {}) {
  const custom = photoCache[ex.id];
  if (small) {
    if (custom) return `<img src="${custom}" alt="">`;
    if (ex.img) return `<img src="img/esercizi/${ex.img}_0.jpg" alt="">`;
    return `<div class="ph">🏋️</div>`;
  }
  if (custom) return `<div class="ex-media custom"><img src="${custom}" alt="${esc(ex.name)}">${photoBtn(ex)}</div>`;
  if (ex.img) {
    return `<div class="ex-media">
      <img src="img/esercizi/${ex.img}_0.jpg" alt="${esc(ex.name)}" loading="lazy">
      <img class="b" src="img/esercizi/${ex.img}_1.jpg" alt="" loading="lazy">
      ${photoBtn(ex)}</div>`;
  }
  return `<div class="ex-media"><div class="ph-big">🏋️</div>${photoBtn(ex)}</div>`;
}
const photoBtn = (ex) => `<button class="photo-btn" data-act="photo" data-ex="${ex.id}">📷 Foto</button>`;

function thumbHTML(ex) {
  const custom = photoCache[ex.id];
  if (custom) return `<img class="thumb" src="${custom}" alt="">`;
  if (ex.img) return `<img class="thumb" src="img/esercizi/${ex.img}_0.jpg" alt="">`;
  return `<div class="thumb ph">🏋️</div>`;
}

function nextSessionId() {
  const done = state.workouts.filter((w) => w.finished);
  if (!done.length) return state.program[0]?.id;
  const last = done[done.length - 1];
  const i = state.program.findIndex((s) => s.id === last.sessionId);
  return state.program[(i + 1) % state.program.length]?.id;
}

function lastPerformance(exId, excludeId) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    if (!w.finished || w.id === excludeId) continue;
    const e = w.exercises.find((x) => x.exId === exId);
    if (e && e.sets.some((s) => s.done && s.kg != null)) return { date: w.date, sets: e.sets.filter((s) => s.done) };
  }
  return null;
}

function exerciseHistory(exId) {
  const out = [];
  for (const w of state.workouts) {
    if (!w.finished) continue;
    const e = w.exercises.find((x) => x.exId === exId);
    if (!e) continue;
    const done = e.sets.filter((s) => s.done && s.kg != null);
    if (!done.length) continue;
    const maxKg = Math.max(...done.map((s) => s.kg));
    const e1rm = Math.max(...done.map((s) => s.kg * (1 + (s.reps || 0) / 30)));
    const volume = done.reduce((a, s) => a + s.kg * (s.reps || 0), 0);
    out.push({ date: w.date, maxKg, e1rm, volume });
  }
  return out;
}

/* ================= Timer recupero ================= */
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* niente audio */ }
}
function beep() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.25, 0.5].forEach((dt, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + dt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0 + dt);
    o.stop(t0 + dt + 0.22);
  });
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

let rest = null; // { end, total, label, beeped }
let restInterval = null;
function startRest(secs, label) {
  rest = { end: Date.now() + secs * 1000, total: secs, label, beeped: false };
  renderRest();
  clearInterval(restInterval);
  restInterval = setInterval(renderRest, 250);
}
function stopRest() {
  rest = null;
  clearInterval(restInterval);
  renderRest();
}
function renderRest() {
  let bar = $('#rest-bar');
  if (!rest) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'rest-bar';
    bar.className = 'rest-bar';
    bar.innerHTML = `<div class="time"></div><div class="lbl"></div>
      <button class="btn small" data-rest="-15">−15</button>
      <button class="btn small" data-rest="15">+15</button>
      <button class="btn small primary" data-rest="stop">OK</button>
      <div class="progress"></div>`;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rest]');
      if (!b || !rest) return;
      const v = b.dataset.rest;
      if (v === 'stop') return stopRest();
      rest.end += Number(v) * 1000;
      rest.total = Math.max(1, rest.total + Number(v));
      if (rest.end > Date.now()) rest.beeped = false;
      renderRest();
    });
    document.body.appendChild(bar);
  }
  const left = (rest.end - Date.now()) / 1000;
  const over = left <= 0;
  if (over && !rest.beeped) { rest.beeped = true; beep(); }
  bar.classList.toggle('over', over);
  $('.time', bar).textContent = over ? `+${fmtSecs(-left)}` : fmtSecs(left);
  $('.lbl', bar).innerHTML = over ? '<b>Vai con la prossima serie!</b>' : `Recupero<br>${esc(rest.label)}`;
  $('.progress', bar).style.width = `${over ? 100 : (1 - left / rest.total) * 100}%`;
}

/* ================= Rendering ================= */
const TABS = [
  { id: 'cibo', label: 'Cibo', ico: '🍽️' },
  { id: 'allenamento', label: 'Allenamento', ico: '🏋️' },
  { id: 'vita', label: 'Vita', ico: '🌙' },
  { id: 'progressi', label: 'Progressi', ico: '📊' },
];

function render() {
  const tab = TABS.find((t) => t.id === ui.tab);
  const showDate = ui.tab === 'cibo' || ui.tab === 'vita';
  $('#header').innerHTML = `
    <div class="header-row">
      <h1 class="app-title">${ui.tab === 'cibo' ? 'Diario del giorno' : tab.label}</h1>
      <button class="icon-btn" data-act="settings" aria-label="Impostazioni">⚙️</button>
    </div>
    ${showDate ? dateNavHTML() : ''}`;
  $('#tabbar').innerHTML = TABS.map((t) => `
    <button class="tab ${t.id === ui.tab ? 'active' : ''}" data-tab="${t.id}">
      <span class="ico">${t.ico}</span>${t.label}
    </button>`).join('');
  const main = $('#main');
  if (ui.tab === 'cibo') main.innerHTML = renderCibo();
  else if (ui.tab === 'allenamento') main.innerHTML = renderAllenamento();
  else if (ui.tab === 'vita') main.innerHTML = renderVita();
  else main.innerHTML = renderProgressi();
  $$('textarea.meal').forEach(autosize);
  startElapsedTicker();
}

function dateNavHTML() {
  const isToday = ui.date === dateKey();
  return `<div class="datenav">
    <button class="icon-btn" data-act="day" data-d="-1" aria-label="Giorno prima">‹</button>
    <div class="label">${relDay(ui.date)}<small>${fmtDate(ui.date)}</small>
      <input type="date" value="${ui.date}" max="${dateKey()}" data-act="pickdate" aria-label="Scegli data">
    </div>
    <button class="icon-btn" data-act="day" data-d="1" ${isToday ? 'disabled style="opacity:.3"' : ''} aria-label="Giorno dopo">›</button>
  </div>
  ${isToday ? '' : '<button class="chip" data-act="today" style="display:block;margin:8px auto 0;color:var(--accent)">↺ Torna a oggi</button>'}`;
}

/* ---------- Cibo ---------- */
function renderCibo() {
  const d = peekDay(ui.date);
  const water = d.water || 0;
  const meals = MEALS.map((m) => `
    <div class="card">
      <h3><span>${m.ico}</span>${m.label}</h3>
      <textarea class="meal" rows="1" data-meal="${m.id}" placeholder="${m.ph}">${esc(d.meals?.[m.id] || '')}</textarea>
    </div>`).join('');
  return `${meals}
    <div class="card">
      <h3><span>💧</span>Acqua</h3>
      <div class="stepper">
        <button class="step-btn" data-act="water" data-v="-0.25">−</button>
        <div class="val">${fmt(water, 2)}<small>L</small></div>
        <button class="step-btn" data-act="water" data-v="0.25">+</button>
      </div>
      <div class="chip-row">
        <button class="chip" data-act="water" data-v="0.25">+ bicchiere (0,25 L)</button>
        <button class="chip" data-act="water" data-v="0.5">+ bottiglietta (0,5 L)</button>
        <button class="chip" data-act="water" data-v="1">+ 1 L</button>
      </div>
    </div>`;
}

function autosize(t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

/* ---------- Vita ---------- */
function renderVita() {
  const d = peekDay(ui.date);
  const lastW = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const since = lastW ? daysBetween(lastW.date, dateKey()) : null;
  const due = !lastW || since >= 30;
  const todayW = state.weights.find((w) => w.date === ui.date);

  const lifeStepper = (key, ico, title, unit, step, sub) => `
    <div class="card life-card">
      <div class="emoji">${ico}</div>
      <div class="info"><b>${title}</b><span class="muted">${sub}</span></div>
      <div class="stepper">
        <button class="step-btn" data-act="life" data-k="${key}" data-v="${-step}">−</button>
        <div class="val" style="min-width:56px;font-size:26px">${d[key] == null ? '—' : fmt(d[key])}${unit ? `<small>${unit}</small>` : ''}</div>
        <button class="step-btn" data-act="life" data-k="${key}" data-v="${step}">+</button>
      </div>
    </div>`;

  return `
    ${lifeStepper('sleep', '😴', 'Sonno', 'h', 0.5, 'ore dormite')}
    ${lifeStepper('cig', '🚬', 'Sigarette', '', 1, (d.cig || 0) === 0 ? 'nessuna 💪' : 'fumate oggi')}
    ${lifeStepper('drinks', '🍷', 'Drink', '', 1, (d.drinks || 0) === 0 ? 'nessuno 💪' : 'bevuti oggi')}

    <div class="section-title">Peso · 1 volta al mese</div>
    ${due ? `<div class="banner warn"><b>È ora di pesarti!</b> ${lastW ? `Ultima pesata ${since} giorni fa.` : 'Non hai ancora registrato il peso.'}</div>` : ''}
    <div class="card">
      <h3><span>⚖️</span>Peso del ${fmtShort(ui.date)}
        <span class="muted">${lastW ? `ultimo: ${fmt(lastW.kg)} kg (${fmtShort(lastW.date)})` : ''}</span></h3>
      <div class="row">
        <input class="field" id="weight-input" inputmode="decimal" placeholder="Es. 78,5" value="${todayW ? fmt(todayW.kg) : ''}" style="font-size:20px;font-weight:700">
        <span class="muted">kg</span>
        <button class="btn primary" data-act="save-weight">Salva</button>
      </div>
      ${todayW ? `<button class="btn small danger" style="margin-top:10px" data-act="del-weight">Elimina pesata di questo giorno</button>` : ''}
    </div>
    ${state.weights.length >= 2 ? `<div class="card"><h3>Andamento peso</h3>${lineChart(
      [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ x: fmtShort(w.date), y: w.kg })), { unit: 'kg' })}</div>` : ''}`;
}

/* ---------- Allenamento ---------- */
function renderAllenamento() {
  const aw = state.activeWorkout;
  if (aw) return renderActiveWorkout(aw);
  if (ui.workoutView) {
    const w = state.workouts.find((x) => x.id === ui.workoutView);
    if (w) return renderWorkoutDetail(w);
  }
  const nextId = nextSessionId();
  const weeks = Math.floor(daysBetween(state.settings.phaseStart, dateKey()) / 7) + 1;
  const banner = phase() === 1
    ? `<div class="${weeks > 4 ? 'banner warn' : 'banner'}"><b>Fase 1 · Riatletizzazione</b> · settimana ${Math.min(weeks, 99)} di 4<br>
       Carichi al 60–70% · RIR 3 (3 ripetizioni di margine) · una serie in meno per esercizio · recuperi lunghi.
       ${weeks > 4 ? '<br><b>Sono passate 4 settimane:</b> puoi passare alla Fase 2 dalle ⚙️ Impostazioni.' : ''}</div>`
    : `<div class="banner"><b>Fase 2 · Programma completo</b> · serie piene e recuperi standard.</div>`;

  const sessions = state.program.map((s) => `
    <div class="card session-card ${s.id === nextId ? 'next' : ''}">
      <div class="info">
        ${s.id === nextId ? '<span class="tag">Prossimo</span> ' : ''}<b>${esc(s.name)}</b>
        <div class="muted">${s.exercises.length} esercizi · ${esc(s.exercises.map((e) => e.name).slice(0, 3).join(', '))}${s.exercises.length > 3 ? '…' : ''}</div>
        <div class="thumbs" style="margin-top:8px">${s.exercises.map((e) => exImageHTML(e, { small: true })).join('')}</div>
      </div>
      <button class="btn ${s.id === nextId ? 'primary' : ''}" data-act="start" data-s="${s.id}">Inizia</button>
    </div>`).join('');

  const hist = state.workouts.filter((w) => w.finished).slice(-10).reverse();
  return `${banner}${sessions}
    <button class="btn block" data-act="edit-program" style="margin-top:4px">✏️ Modifica scheda</button>
    <div class="section-title">Ultimi allenamenti</div>
    ${hist.length ? `<div class="card">${hist.map((w) => {
      const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
      const vol = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + (s.kg || 0) * (s.reps || 0), 0), 0);
      return `<button class="list-item" style="width:100%;text-align:left" data-act="view-workout" data-w="${w.id}">
        <div class="spacer"><b>${esc(w.sessionName)}</b><div class="muted">${relDay(w.date)} · ${sets} serie · ${fmt(vol, 0)} kg sollevati</div></div>
        <span class="muted">›</span></button>`;
    }).join('')}</div>` : '<div class="empty">Ancora nessun allenamento registrato.<br>Premi “Inizia” su una sessione 💪</div>'}`;
}

function renderActiveWorkout(w) {
  const cards = w.exercises.map((we, i) => {
    const ex = findEx(we.exId) || { id: we.exId, name: we.name, reps: we.reps, rest: 'medium' };
    const prev = lastPerformance(we.exId, w.id);
    const rows = we.sets.map((s, j) => {
      const prevSet = prev?.sets[j] || prev?.sets[prev.sets.length - 1];
      return `<div class="set-row ${s.done ? 'done' : ''}">
        <div class="n">${j + 1}</div>
        <div class="unit"><input class="field" inputmode="decimal" data-set="kg" data-i="${i}" data-j="${j}" value="${s.kg ?? ''}" placeholder="${prevSet?.kg ?? '–'}"><span>kg</span></div>
        <div class="unit"><input class="field" inputmode="numeric" data-set="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ''}" placeholder="${prevSet?.reps ?? String(we.reps).split(/\D/)[0] ?? ''}"><span>rip</span></div>
        <button class="check" data-act="toggle-set" data-i="${i}" data-j="${j}" aria-label="Serie fatta">✓</button>
      </div>`;
    }).join('');
    return `<div class="card ex-card">
      ${exImageHTML(ex)}
      <div class="ex-body">
        <h3 class="ex-name">${esc(we.name)}</h3>
        ${ex.superset ? `<div class="superset">⇄ ${esc(ex.superset)}</div>` : ''}
        <div class="ex-meta">
          <span class="pill acc">${we.sets.length} × ${esc(we.reps)}</span>
          <span class="pill">⏱ ${fmtRest(restSecs(ex))}</span>
          ${phase() === 1 ? '<span class="pill">RIR 3</span>' : ''}
        </div>
        <div class="prev">${prev ? `Ultima volta (${fmtShort(prev.date)}): <b>${prev.sets.map((s) => `${fmt(s.kg)}×${s.reps ?? '?'}`).join(' · ')}</b>` : 'Prima volta: parti leggero e annota il carico.'}</div>
        <div class="sets">${rows}</div>
        <div class="set-actions">
          <button class="btn small" data-act="add-set" data-i="${i}">+ Serie</button>
          ${we.sets.length > 1 ? `<button class="btn small" data-act="rm-set" data-i="${i}">− Serie</button>` : ''}
          <span class="spacer"></span>
          <button class="btn small" data-act="rest-now" data-i="${i}">⏱ Recupero</button>
        </div>
      </div>
    </div>`;
  }).join('');
  return `<div class="workout-top">
      <div class="spacer"><h2>${esc(w.sessionName)}</h2><span class="elapsed" id="elapsed"></span></div>
      <button class="btn small danger" data-act="cancel-workout">Annulla</button>
    </div>
    ${cards}
    <div class="card"><h3>📝 Note</h3>
      <textarea class="meal" data-wnote placeholder="Come ti sei sentito? Dolori, sensazioni…">${esc(w.note || '')}</textarea></div>
    <button class="btn primary block" data-act="finish-workout" style="padding:16px">✅ Termina allenamento</button>`;
}

function renderWorkoutDetail(w) {
  return `<div class="workout-top">
      <button class="icon-btn" data-act="back-workouts">‹</button>
      <div class="spacer"><h2>${esc(w.sessionName)}</h2><span class="muted">${fmtDate(w.date)}${w.durationMin ? ` · ${w.durationMin} min` : ''}</span></div>
    </div>
    ${w.exercises.map((e) => {
      const done = e.sets.filter((s) => s.done);
      return `<div class="card"><h3>${esc(e.name)}</h3>
        <div class="muted">${done.length ? done.map((s, j) => `Serie ${j + 1}: <b style="color:var(--text)">${fmt(s.kg)} kg × ${s.reps ?? '?'}</b>`).join('<br>') : 'Non eseguito'}</div></div>`;
    }).join('')}
    ${w.note ? `<div class="card"><h3>📝 Note</h3><div class="muted">${esc(w.note)}</div></div>` : ''}
    <button class="btn danger block" data-act="delete-workout" data-w="${w.id}">Elimina questo allenamento</button>`;
}

let elapsedTimer = null;
function startElapsedTicker() {
  clearInterval(elapsedTimer);
  const w = state.activeWorkout;
  if (!w || ui.tab !== 'allenamento') return;
  const tick = () => {
    const el = $('#elapsed');
    if (el) el.textContent = `⏱ ${fmtSecs((Date.now() - w.startedAt) / 1000)}`;
  };
  tick();
  elapsedTimer = setInterval(tick, 1000);
}

function startWorkout(sessionId) {
  const s = state.program.find((x) => x.id === sessionId);
  if (!s) return;
  state.activeWorkout = {
    id: uid(),
    date: dateKey(),
    startedAt: Date.now(),
    sessionId: s.id,
    sessionName: s.name,
    note: '',
    exercises: s.exercises.map((ex) => ({
      exId: ex.id,
      name: ex.name,
      reps: ex.reps,
      sets: Array.from({ length: plannedSets(ex) }, () => ({ kg: null, reps: null, done: false })),
    })),
  };
  save(true);
  render();
  window.scrollTo(0, 0);
}

async function finishWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  if (!doneSets && !(await ask('Non hai segnato nessuna serie come fatta. Terminare comunque?', { ok: 'Termina' }))) return;
  w.finished = true;
  w.durationMin = Math.round((Date.now() - w.startedAt) / 60000);
  state.workouts.push(w);
  state.activeWorkout = null;
  stopRest();
  save(true);
  toast(`💪 Allenamento salvato (${doneSets} serie)`);
  render();
  window.scrollTo(0, 0);
}

/* ---------- Progressi ---------- */
function renderProgressi() {
  const r = ui.statsRange;
  const today = dateKey();
  const keys = Array.from({ length: r }, (_, i) => addDays(today, i - r + 1));
  const prevKeys = keys.map((k) => addDays(k, -r));
  const summarize = (ks) => {
    const ds = ks.map((k) => state.days[k]).filter(Boolean);
    const sleepVals = ds.map((d) => d.sleep).filter((v) => v != null);
    const waterVals = ds.map((d) => d.water).filter((v) => v > 0);
    return {
      sleep: sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null,
      cig: ds.reduce((a, d) => a + (d.cig || 0), 0),
      smokeFree: ks.filter((k) => state.days[k] && !(state.days[k].cig > 0)).length,
      drinks: ds.reduce((a, d) => a + (d.drinks || 0), 0),
      water: waterVals.length ? waterVals.reduce((a, b) => a + b, 0) / waterVals.length : null,
      workouts: state.workouts.filter((w) => w.finished && ks.includes(w.date)).length,
    };
  };
  const cur = summarize(keys);
  const prv = summarize(prevKeys);
  const delta = (a, b, lowerIsBetter, dec = 1) => {
    if (a == null || b == null || a === b) return '<div class="d muted">&nbsp;</div>';
    const better = lowerIsBetter ? a < b : a > b;
    return `<div class="d ${better ? 'good' : 'bad'}">${a > b ? '▲' : '▼'} ${fmt(Math.abs(a - b), dec)} vs prima</div>`;
  };

  const backupDays = state.settings.lastBackup ? daysBetween(state.settings.lastBackup, today) : null;
  const backupBanner = (backupDays == null || backupDays >= 14) && (state.workouts.length || Object.keys(state.days).length)
    ? `<div class="banner warn"><b>Fai un backup</b> · ${backupDays == null ? 'non hai mai salvato una copia dei dati.' : `ultimo backup ${backupDays} giorni fa.`}
       <div style="margin-top:8px"><button class="btn small primary" data-act="export">💾 Esporta ora</button></div></div>` : '';

  const labelsShort = keys.map((k) => (r <= 7 ? DOW[parseKey(k).getDay()] : fmtShort(k)));
  const series = (fn) => keys.map((k, i) => ({ x: labelsShort[i], y: state.days[k] ? fn(state.days[k]) : null }));

  // esercizi con storico
  const exList = [];
  for (const s of state.program) for (const e of s.exercises) exList.push(e);
  if (!ui.statsEx || !findEx(ui.statsEx)) ui.statsEx = exList[0]?.id;
  const hist = ui.statsEx ? exerciseHistory(ui.statsEx) : [];
  const pr = hist.length ? hist.reduce((a, h) => (h.maxKg > a.maxKg ? h : a)) : null;
  const pr1rm = hist.length ? Math.max(...hist.map((h) => h.e1rm)) : null;

  return `${backupBanner}
    <div class="seg" style="margin-bottom:12px">
      ${[7, 30].map((n) => `<button class="${r === n ? 'on' : ''}" data-act="range" data-v="${n}">Ultimi ${n} giorni</button>`).join('')}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="k">😴 Sonno medio</div><div class="v">${fmt(cur.sleep)}<small> h</small></div>${delta(cur.sleep, prv.sleep, false)}</div>
      <div class="stat"><div class="k">🏋️ Allenamenti</div><div class="v">${cur.workouts}</div>${delta(cur.workouts, prv.workouts, false, 0)}</div>
      <div class="stat"><div class="k">🚬 Sigarette</div><div class="v">${cur.cig}</div>${delta(cur.cig, prv.cig, true, 0)}</div>
      <div class="stat"><div class="k">🍷 Drink</div><div class="v">${cur.drinks}</div>${delta(cur.drinks, prv.drinks, true, 0)}</div>
      <div class="stat"><div class="k">💧 Acqua media</div><div class="v">${fmt(cur.water, 2)}<small> L</small></div>${delta(cur.water, prv.water, false, 2)}</div>
      <div class="stat"><div class="k">🌿 Giorni senza fumo</div><div class="v">${cur.smokeFree}<small> / ${keys.filter((k) => state.days[k]).length}</small></div><div class="d muted">giorni registrati</div></div>
    </div>

    <div class="section-title">Andamento</div>
    <div class="card"><h3>😴 Sonno <span class="muted">ore</span></h3>${barChart(series((d) => d.sleep), { color: 'var(--violet)', ref: 8 })}</div>
    <div class="card"><h3>🚬 Sigarette</h3>${barChart(series((d) => d.cig || 0), { color: 'var(--orange)' })}</div>
    <div class="card"><h3>🍷 Drink</h3>${barChart(series((d) => d.drinks || 0), { color: 'var(--red)' })}</div>
    <div class="card"><h3>💧 Acqua <span class="muted">litri</span></h3>${barChart(series((d) => d.water || 0), { color: 'var(--blue)', ref: 2 })}</div>

    <div class="section-title">Progressi carichi</div>
    <div class="card">
      <select class="field" data-act="stats-ex">
        ${state.program.map((s) => `<optgroup label="${esc(s.name)}">${s.exercises.map((e) => `<option value="${e.id}" ${e.id === ui.statsEx ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</optgroup>`).join('')}
      </select>
      ${hist.length ? `
        <div class="stat-grid" style="margin:12px 0">
          <div class="stat"><div class="k">🏆 Record carico</div><div class="v">${fmt(pr.maxKg)}<small> kg</small></div><div class="d muted">${fmtShort(pr.date)}</div></div>
          <div class="stat"><div class="k">💥 Massimale stimato</div><div class="v">${fmt(pr1rm, 0)}<small> kg</small></div><div class="d muted">1RM (formula Epley)</div></div>
        </div>
        <div class="muted" style="margin-bottom:4px">Carico massimo per allenamento</div>
        ${lineChart(hist.map((h) => ({ x: fmtShort(h.date), y: h.maxKg })), { unit: 'kg' })}`
        : '<div class="empty">Nessun dato ancora per questo esercizio.</div>'}
    </div>`;
}

/* ---------- Grafici SVG ---------- */
function barChart(points, { color = 'var(--accent)', ref = null } = {}) {
  const W = 320, H = 120, P = { l: 22, r: 6, t: 8, b: 18 };
  const vals = points.map((p) => p.y).filter((v) => v != null);
  if (!vals.length) return '<div class="empty" style="padding:12px">Nessun dato nel periodo.</div>';
  const max = Math.max(1, ref || 0, ...vals) * 1.1;
  const bw = (W - P.l - P.r) / points.length;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - v / max);
  const every = Math.ceil(points.length / 8);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">`;
  s += `<text x="${P.l - 4}" y="${y(max / 1.1) + 3}" text-anchor="end">${fmt(max / 1.1)}</text><text x="${P.l - 4}" y="${H - P.b}" text-anchor="end">0</text>`;
  s += `<line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" stroke="var(--line)"/>`;
  if (ref) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(ref)}" y2="${y(ref)}" stroke="var(--muted)" stroke-dasharray="3 3" opacity=".5"/>`;
  points.forEach((p, i) => {
    const x = P.l + i * bw;
    if (p.y != null && p.y > 0) {
      const h = H - P.b - y(p.y);
      s += `<rect x="${x + bw * 0.18}" y="${y(p.y)}" width="${bw * 0.64}" height="${Math.max(h, 1)}" rx="${Math.min(4, bw * 0.2)}" fill="${color}"/>`;
    }
    if (i % every === 0) s += `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${esc(p.x)}</text>`;
  });
  return s + '</svg>';
}

function lineChart(points, { unit = '' } = {}) {
  const W = 320, H = 140, P = { l: 30, r: 10, t: 12, b: 18 };
  if (!points.length) return '';
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad_ = (max - min) * 0.15;
  min -= pad_; max += pad_;
  const x = (i) => (points.length === 1 ? (W + P.l - P.r) / 2 : P.l + (i * (W - P.l - P.r)) / (points.length - 1));
  const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`;
  const every = Math.ceil(points.length / 6);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <text x="${P.l - 4}" y="${y(max - pad_) + 3}" text-anchor="end">${fmt(max - pad_)}</text>
    <text x="${P.l - 4}" y="${y(min + pad_) + 3}" text-anchor="end">${fmt(min + pad_)}</text>
    <path d="${area}" fill="url(#lg)"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  points.forEach((p, i) => {
    s += `<circle cx="${x(i)}" cy="${y(p.y)}" r="3.5" fill="var(--bg)" stroke="var(--accent)" stroke-width="2"><title>${esc(p.x)}: ${fmt(p.y)} ${unit}</title></circle>`;
    if (i % every === 0 || i === points.length - 1) s += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${esc(p.x)}</text>`;
  });
  const last = points[points.length - 1];
  s += `<text x="${x(points.length - 1)}" y="${y(last.y) - 8}" text-anchor="end" style="fill:var(--accent);font-weight:700">${fmt(last.y)} ${unit}</text>`;
  return s + '</svg>';
}

/* ================= Sheet: impostazioni & modifica scheda ================= */
function openSheet(html, onMount) {
  closeSheet();
  const bd = document.createElement('div');
  bd.className = 'sheet-backdrop';
  bd.id = 'sheet';
  bd.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  bd.addEventListener('click', (e) => { if (e.target === bd) closeSheet(); });
  document.body.appendChild(bd);
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(bd);
}
function closeSheet() {
  const s = $('#sheet');
  if (s) s.remove();
  document.body.style.overflow = '';
}

function openSettings() {
  const st = state.settings;
  openSheet(`
    <h2>⚙️ Impostazioni</h2>
    <div class="section-title" style="margin-top:0">Fase di allenamento</div>
    <div class="seg">
      <button class="${st.phase === 1 ? 'on' : ''}" data-set-phase="1">Fase 1 · Riatletizzazione</button>
      <button class="${st.phase === 2 ? 'on' : ''}" data-set-phase="2">Fase 2 · Completa</button>
    </div>
    <p class="muted">In fase 1 l'app toglie automaticamente una serie da ogni esercizio e allunga a 3' il recupero dei multiarticolari pesanti. Inizio fase: ${fmtDate(st.phaseStart)}.</p>

    <div class="section-title">Backup dei dati</div>
    <p class="muted">I dati sono salvati solo su questo iPhone. Esporta un backup ogni tanto (es. su File/iCloud Drive) per non perderli.
      ${st.lastBackup ? `<br>Ultimo backup: <b>${fmtDate(st.lastBackup)}</b>` : ''}</p>
    <div class="row">
      <button class="btn primary" style="flex:1" data-sheet="export">💾 Esporta backup</button>
      <button class="btn" style="flex:1" data-sheet="import">📂 Importa</button>
    </div>

    <div class="section-title">Zona pericolosa</div>
    <button class="btn danger block" data-sheet="reset-program">Ripristina la scheda originale</button>
    <div style="height:8px"></div>
    <button class="btn danger block" data-sheet="wipe">Cancella tutti i dati</button>
    <p class="muted" style="text-align:center;margin-top:20px">Diario del giorno · v1<br>Immagini esercizi: free-exercise-db (pubblico dominio)</p>
  `, (root) => {
    root.addEventListener('click', async (e) => {
      const ph = e.target.closest('[data-set-phase]');
      if (ph) {
        const p = Number(ph.dataset.setPhase);
        if (p !== st.phase) { st.phase = p; st.phaseStart = dateKey(); save(true); render(); openSettings(); }
        return;
      }
      const b = e.target.closest('[data-sheet]');
      if (!b) return;
      const a = b.dataset.sheet;
      if (a === 'export') exportBackup();
      if (a === 'import') importBackup();
      if (a === 'reset-program' && await ask('Ripristinare la scheda originale? Lo storico degli allenamenti resta.', { ok: 'Ripristina', danger: true })) {
        state.program = structuredClone(DEFAULT_PROGRAM); save(true); closeSheet(); render(); toast('Scheda ripristinata');
      }
      if (a === 'wipe' && await ask('Cancellare TUTTI i dati? Operazione irreversibile.', { ok: 'Continua', danger: true }) && await ask('Sei sicuro? Esporta prima un backup se ti serve.', { ok: 'Cancella tutto', danger: true })) {
        state = defaultState(); save(true); await photoDB.clear(); for (const k in photoCache) delete photoCache[k];
        closeSheet(); render(); toast('Dati cancellati');
      }
    });
  });
}

function openProgramEditor() {
  const html = () => `
    <h2>✏️ Modifica scheda</h2>
    <p class="muted" style="margin-top:-6px">Le modifiche valgono per i prossimi allenamenti. Le serie indicate sono quelle della fase completa (in fase 1 l'app ne toglie una).</p>
    ${state.program.map((s, si) => `
      <div class="section-title"><input class="field" style="font-weight:800;text-transform:none;letter-spacing:0;font-size:16px" data-ed="sname" data-si="${si}" value="${esc(s.name)}"></div>
      <div class="card" style="padding:0 14px">
        ${s.exercises.map((e, ei) => `
          <div class="edit-ex">
            <button data-ed-act="photo" data-ex="${e.id}">${thumbHTML(e)}</button>
            <div>
              <input class="field" data-ed="name" data-si="${si}" data-ei="${ei}" value="${esc(e.name)}" style="font-weight:700">
              <div class="edit-grid">
                <div><label>Serie</label><input class="field" inputmode="numeric" data-ed="sets" data-si="${si}" data-ei="${ei}" value="${e.sets}"></div>
                <div><label>Ripetizioni</label><input class="field" data-ed="reps" data-si="${si}" data-ei="${ei}" value="${esc(e.reps)}"></div>
              </div>
              <div style="margin-top:6px"><label class="muted" style="font-size:11px">Recupero</label>
                <select class="field" data-ed="rest" data-si="${si}" data-ei="${ei}">
                  ${Object.entries(REST).map(([k, v]) => `<option value="${k}" ${e.rest === k ? 'selected' : ''}>${v.label} · ${fmtRest(v.secs(phase()))}</option>`).join('')}
                </select></div>
              <div class="edit-tools">
                <button class="btn small" data-ed-act="up" data-si="${si}" data-ei="${ei}" ${ei === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
                <button class="btn small" data-ed-act="down" data-si="${si}" data-ei="${ei}" ${ei === s.exercises.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
                <button class="btn small" data-ed-act="photo" data-ex="${e.id}">📷 Foto</button>
                ${photoCache[e.id] ? `<button class="btn small" data-ed-act="reset-photo" data-ex="${e.id}">↺ Immagine</button>` : ''}
                <span class="spacer"></span>
                <button class="btn small danger" data-ed-act="del" data-si="${si}" data-ei="${ei}">🗑</button>
              </div>
            </div>
          </div>`).join('')}
        <div style="padding:12px 0"><button class="btn small block" data-ed-act="add" data-si="${si}">+ Aggiungi esercizio</button></div>
      </div>`).join('')}
    <button class="btn primary block" data-ed-act="close" style="margin-top:16px">Fatto</button>`;

  const refresh = () => { const y = $('#sheet .sheet').scrollTop; $('#sheet .sheet').innerHTML = `<div class="grab"></div>${html()}`; $('#sheet .sheet').scrollTop = y; };
  openSheet(html(), (root) => {
    root.addEventListener('input', (e) => {
      const t = e.target.closest('[data-ed]');
      if (!t) return;
      const s = state.program[t.dataset.si];
      if (t.dataset.ed === 'sname') { s.name = t.value; save(); return; }
      const ex = s.exercises[t.dataset.ei];
      if (t.dataset.ed === 'sets') { const n = parseInt(t.value, 10); if (n > 0 && n < 20) ex.sets = n; }
      else ex[t.dataset.ed] = t.value;
      save();
    });
    root.addEventListener('change', (e) => { if (e.target.closest('[data-ed]')) render(); });
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ed-act]');
      if (!b) return;
      const a = b.dataset.edAct;
      const s = state.program[b.dataset.si];
      const ei = Number(b.dataset.ei);
      if (a === 'close') { closeSheet(); render(); return; }
      if (a === 'photo') { await changePhoto(b.dataset.ex); refresh(); return; }
      if (a === 'reset-photo') { await resetPhoto(b.dataset.ex); refresh(); return; }
      if (a === 'up' && ei > 0) [s.exercises[ei - 1], s.exercises[ei]] = [s.exercises[ei], s.exercises[ei - 1]];
      if (a === 'down' && ei < s.exercises.length - 1) [s.exercises[ei + 1], s.exercises[ei]] = [s.exercises[ei], s.exercises[ei + 1]];
      if (a === 'del' && await ask(`Togliere “${s.exercises[ei].name}” dalla scheda?`, { ok: 'Togli', danger: true })) s.exercises.splice(ei, 1);
      if (a === 'add') {
        const name = await ask('Nome del nuovo esercizio:', { input: 'Es. Dip alle parallele', ok: 'Aggiungi' });
        if (!name) return;
        s.exercises.push({ id: `ex-${uid()}`, name: name.trim(), sets: 3, reps: '10', rest: 'medium', img: null });
      }
      save(true);
      refresh();
      render();
    });
  });
}

/* ================= Backup ================= */
async function exportBackup() {
  const photos = await photoDB.all().catch(() => ({}));
  const payload = { app: 'diario-del-giorno', exportedAt: new Date().toISOString(), state, photos };
  const json = JSON.stringify(payload);
  const name = `diario-backup-${dateKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  let ok = false;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup Diario del giorno' });
      ok = true;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  if (!ok) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  state.settings.lastBackup = dateKey();
  save(true);
  toast('💾 Backup esportato');
  render();
}

function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'diario-del-giorno' || !data.state) throw new Error('formato');
      if (!(await ask(`Importare il backup del ${new Date(data.exportedAt).toLocaleDateString('it-IT')}? I dati attuali verranno sostituiti.`, { ok: 'Importa' }))) return;
      state = { ...defaultState(), ...data.state };
      save(true);
      await photoDB.clear();
      for (const k in photoCache) delete photoCache[k];
      for (const [k, v] of Object.entries(data.photos || {})) { await photoDB.set(k, v); photoCache[k] = v; }
      closeSheet();
      render();
      toast('✅ Backup importato');
    } catch (e) {
      ask('Questo file non è un backup valido di Diario del giorno.', { ok: 'OK', cancel: false });
    }
  };
  inp.click();
}

/* ================= Finestra di conferma ================= */
// Sostituisce confirm/prompt/alert con una finestra interna all'app.
function ask(message, { ok = 'OK', cancel = 'Annulla', danger = false, input = null } = {}) {
  return new Promise((resolve) => {
    const bd = document.createElement('div');
    bd.className = 'dialog-backdrop';
    bd.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">
      <p>${esc(message)}</p>
      ${input != null ? `<input class="field" id="ask-input" placeholder="${esc(input)}" autocomplete="off">` : ''}
      <div class="dialog-actions">
        ${cancel ? `<button class="btn" data-ans="no">${esc(cancel)}</button>` : ''}
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ans="yes">${esc(ok)}</button>
      </div></div>`;
    const done = (v) => { bd.remove(); resolve(v); };
    bd.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ans]');
      if (b) {
        if (b.dataset.ans === 'no') return done(input != null ? null : false);
        return done(input != null ? ($('#ask-input', bd).value.trim() || null) : true);
      }
      if (e.target === bd && cancel) done(input != null ? null : false);
    });
    bd.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input != null) $('[data-ans="yes"]', bd).click(); });
    document.body.appendChild(bd);
    if (input != null) $('#ask-input', bd).focus();
  });
}

/* ================= Toast ================= */
let toastTimer = null;
function toast(msg) {
  $$('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2200);
}

/* ================= Eventi ================= */
document.addEventListener('click', async (e) => {
  unlockAudio();
  const tabBtn = e.target.closest('[data-tab]');
  if (tabBtn) {
    ui.tab = tabBtn.dataset.tab;
    if (ui.tab !== 'allenamento') ui.workoutView = null;
    render();
    window.scrollTo(0, 0);
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b || b.closest('#sheet')) return;
  const act = b.dataset.act;
  const aw = state.activeWorkout;

  switch (act) {
    case 'settings': openSettings(); break;
    case 'today': ui.date = dateKey(); render(); break;
    case 'day': {
      const n = addDays(ui.date, Number(b.dataset.d));
      if (n <= dateKey()) { ui.date = n; render(); }
      break;
    }
    case 'water': {
      const d = day(ui.date);
      d.water = Math.max(0, Math.round(((d.water || 0) + Number(b.dataset.v)) * 100) / 100);
      save(); render();
      break;
    }
    case 'life': {
      const d = day(ui.date);
      const k = b.dataset.k;
      const v = Number(b.dataset.v);
      if (k === 'sleep') d.sleep = d.sleep == null ? 7 : Math.min(24, Math.max(0, d.sleep + v));
      else d[k] = Math.max(0, (d[k] || 0) + v);
      save(); render();
      break;
    }
    case 'save-weight': {
      const kg = num($('#weight-input').value);
      if (kg == null || kg < 20 || kg > 400) { toast('Inserisci un peso valido'); break; }
      state.weights = state.weights.filter((w) => w.date !== ui.date);
      state.weights.push({ date: ui.date, kg });
      save(true); toast('⚖️ Peso salvato'); render();
      break;
    }
    case 'del-weight':
      state.weights = state.weights.filter((w) => w.date !== ui.date);
      save(true); render();
      break;
    case 'start':
      if (aw) { toast('Hai già un allenamento in corso'); break; }
      startWorkout(b.dataset.s);
      break;
    case 'toggle-set': {
      const we = aw.exercises[b.dataset.i];
      const s = we.sets[b.dataset.j];
      const row = b.closest('.set-row');
      // se vuoti, usa i valori suggeriti (placeholder = ultima volta)
      if (!s.done) {
        const kgIn = $('[data-set="kg"]', row), repIn = $('[data-set="reps"]', row);
        if (s.kg == null && num(kgIn.placeholder) != null) s.kg = num(kgIn.placeholder);
        if (s.reps == null && num(repIn.placeholder) != null) s.reps = num(repIn.placeholder);
      }
      s.done = !s.done;
      save(true);
      if (s.done) {
        const ex = findEx(we.exId);
        const isLast = we.sets.every((x) => x.done);
        if (ex) startRest(restSecs(ex), `${we.name}${isLast ? ' · esercizio completato ✓' : ''}`);
      }
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
      break;
    }
    case 'add-set': {
      const we = aw.exercises[b.dataset.i];
      const last = we.sets[we.sets.length - 1];
      we.sets.push({ kg: last?.kg ?? null, reps: null, done: false });
      save(true); { const y = window.scrollY; render(); window.scrollTo(0, y); }
      break;
    }
    case 'rm-set': {
      const we = aw.exercises[b.dataset.i];
      if (we.sets.length > 1) we.sets.pop();
      save(true); { const y = window.scrollY; render(); window.scrollTo(0, y); }
      break;
    }
    case 'rest-now': {
      const we = aw.exercises[b.dataset.i];
      const ex = findEx(we.exId);
      startRest(ex ? restSecs(ex) : 90, we.name);
      break;
    }
    case 'cancel-workout':
      if (await ask('Annullare l\'allenamento in corso? I dati di questa sessione andranno persi.', { ok: 'Annulla allenamento', cancel: 'Continua', danger: true })) {
        state.activeWorkout = null; stopRest(); save(true); render();
      }
      break;
    case 'finish-workout': finishWorkout(); break;
    case 'view-workout': ui.workoutView = b.dataset.w; render(); window.scrollTo(0, 0); break;
    case 'back-workouts': ui.workoutView = null; render(); break;
    case 'delete-workout':
      if (await ask('Eliminare questo allenamento dallo storico?', { ok: 'Elimina', danger: true })) {
        state.workouts = state.workouts.filter((w) => w.id !== b.dataset.w);
        ui.workoutView = null; save(true); render();
      }
      break;
    case 'photo': changePhoto(b.dataset.ex); break;
    case 'edit-program': openProgramEditor(); break;
    case 'range': ui.statsRange = Number(b.dataset.v); render(); break;
    case 'export': exportBackup(); break;
    default: break;
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.closest('#sheet')) return;
  if (t.matches('textarea.meal[data-meal]')) {
    const d = day(ui.date);
    d.meals = d.meals || {};
    d.meals[t.dataset.meal] = t.value;
    autosize(t);
    save();
  } else if (t.matches('[data-wnote]')) {
    state.activeWorkout.note = t.value;
    autosize(t);
    save();
  } else if (t.matches('[data-set]')) {
    const s = state.activeWorkout.exercises[t.dataset.i].sets[t.dataset.j];
    s[t.dataset.set] = num(t.value);
    save();
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.closest('#sheet')) return;
  if (t.matches('[data-act="pickdate"]') && t.value) {
    ui.date = t.value > dateKey() ? dateKey() : t.value;
    render();
  } else if (t.matches('[data-act="stats-ex"]')) {
    ui.statsEx = t.value;
    render();
  }
});

// Se l'app resta aperta oltre la mezzanotte, aggiorna "oggi".
let lastToday = dateKey();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && dateKey() !== lastToday) {
    if (ui.date === lastToday) ui.date = dateKey();
    lastToday = dateKey();
    render();
  }
});

/* ================= Avvio ================= */
(async function init() {
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  await loadPhotos();
  if (state.activeWorkout) ui.tab = 'allenamento';
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
