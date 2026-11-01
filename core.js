'use strict';
/* ===== Utilidades ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dstr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dstr(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dstr(d); };
const fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const pick = a => a[Math.floor(Math.random() * a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function toast(m, ms = 2600) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms); }
function h(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }

/* ===== Datos guardados ===== */
const DEF = {
  speak: { level: 1, pass: 0, fail: 0, refuerzo: null, recent: [] },
  express: { level: 1, pass: 0, recent: [] },
  english: { level: 1, msgs: 0, errs: 0, phraseOk: 0, vocab: [] },
  interview: { level: 1 },
  breath: { best: 0 },
  sessions: [],
  streak: { last: null, count: 0 },
  settings: {
    geminiKey: '', groqKey: '',
    geminiModel: 'gemini-flash-latest', groqModel: 'openai/gpt-oss-120b', whisperModel: 'whisper-large-v3-turbo',
    volTarget: 45, ttsRate: 0.95, dailyGoal: 10
  }
};
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; }
function load() { try { return merge(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem('habla') || '{}')); } catch (e) { return JSON.parse(JSON.stringify(DEF)); } }
let S = load();
function save() { try { localStorage.setItem('habla', JSON.stringify(S)); } catch (e) { } }

function streakNow() { return (S.streak.last === today() || S.streak.last === yesterday()) ? S.streak.count : 0; }
function renderStreak() { $('#streak').textContent = '🔥 ' + streakNow() + (streakNow() === 1 ? ' día' : ' días'); }
function addSession(o) {
  o.date = new Date().toISOString(); o.day = today();
  S.sessions.push(o); if (S.sessions.length > 1500) S.sessions.shift();
  if (S.streak.last !== today()) { S.streak.count = S.streak.last === yesterday() ? S.streak.count + 1 : 1; S.streak.last = today(); }
  save(); renderStreak();
}
function minutesToday() { return S.sessions.filter(s => s.day === today()).reduce((a, s) => a + (s.dur || 0), 0) / 60; }

/* ===== Base de datos de grabaciones (IndexedDB) ===== */
const DB = {
  db: null,
  open() { return new Promise((res, rej) => { if (this.db) return res(this.db); const r = indexedDB.open('habla', 1); r.onupgradeneeded = () => r.result.createObjectStore('rec', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); },
  async put(o) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('rec', 'readwrite'); t.objectStore('rec').put(o); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  async all() { const db = await this.open(); return new Promise((res, rej) => { const r = db.transaction('rec').objectStore('rec').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); }); },
  async del(id) { const db = await this.open(); return new Promise((res) => { const t = db.transaction('rec', 'readwrite'); t.objectStore('rec').delete(id); t.oncomplete = res; }); }
};

/* ===== IA: Gemini -> Groq (respaldo) ===== */
const hasAI = () => !!(S.settings.geminiKey || S.settings.groqKey);
const GEM_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.0-flash'];
async function geminiOnce(model, system, contents, json) {
  const body = { contents, generationConfig: { temperature: 0.8 } };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.response_mime_type = 'application/json';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': S.settings.geminiKey }, body: JSON.stringify(body)
  });
  if (!r.ok) { const e = new Error('Gemini ' + r.status + ' ' + (await r.text()).slice(0, 160)); e.status = r.status; throw e; }
  const d = await r.json();
  const t = d?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!t) throw new Error('Gemini sin respuesta');
  return t;
}
async function geminiCall(system, contents, json) {
  const list = [S.settings.geminiModel, ...GEM_MODELS.filter(m => m !== S.settings.geminiModel)];
  let last;
  for (const m of list) {
    try { const t = await geminiOnce(m, system, contents, json); if (m !== S.settings.geminiModel) { S.settings.geminiModel = m; save(); } return t; }
    catch (e) { last = e; if (e.status !== 404 && e.status !== 400) throw e; if (e.status === 400 && !/model/i.test(e.message)) throw e; }
  }
  throw last;
}
const GROQ_MODELS = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant'];
async function groqOnce(model, system, msgs, json) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system + (json ? '\nResponde SOLO con JSON válido.' : '') });
  msgs.forEach(m => messages.push({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text }));
  const body = { model, messages, temperature: 0.8 };
  if (json) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.settings.groqKey }, body: JSON.stringify(body)
  });
  if (!r.ok) { const e = new Error('Groq ' + r.status + ' ' + (await r.text()).slice(0, 160)); e.status = r.status; throw e; }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}
async function groqCall(system, msgs, json) {
  const list = [S.settings.groqModel, ...GROQ_MODELS.filter(m => m !== S.settings.groqModel)];
  let last;
  for (const m of list) {
    try { const t = await groqOnce(m, system, msgs, json); if (m !== S.settings.groqModel) { S.settings.groqModel = m; save(); } return t; }
    catch (e) { last = e; if (!(e.status === 404 || (e.status === 400 && /model|decommission/i.test(e.message)))) throw e; }
  }
  throw last;
}
/** msgs: [{role:'user'|'assistant', text}] */
async function ai(system, msgs, json = false) {
  if (typeof msgs === 'string') msgs = [{ role: 'user', text: msgs }];
  const errs = [];
  if (S.settings.geminiKey) {
    try { return await geminiCall(system, msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })), json); }
    catch (e) { errs.push(e.message); console.warn(e); }
  }
  if (S.settings.groqKey) {
    try { return await groqCall(system, msgs, json); }
    catch (e) { errs.push(e.message); console.warn(e); }
  }
  throw new Error(errs.join(' | ') || 'Sin IA configurada');
}
function parseJSON(t) {
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) { }
  const m = String(t).match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch (e) { } }
  return null;
}
async function aiJSON(system, msgs) { return parseJSON(await ai(system, msgs, true)); }

function blobToB64(b) { return new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(b); }); }
/** Transcribe audio: Groq Whisper -> Gemini -> null (se usa el texto del navegador) */
async function transcribe(blob, lang) {
  if (!blob || blob.size < 2000) return null;
  if (S.settings.groqKey) {
    try {
      const fd = new FormData();
      const ext = (blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm');
      fd.append('file', blob, 'audio.' + ext);
      fd.append('model', S.settings.whisperModel);
      fd.append('language', lang);
      fd.append('prompt', lang === 'es' ? 'Ehh, este... mmm, o sea, bueno, pues, entonces, digamos, eh, este...' : 'Um, uh, like, you know, so, um...');
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + S.settings.groqKey }, body: fd });
      if (!r.ok) throw new Error('Whisper ' + r.status);
      const t = (await r.json()).text; if (t && t.trim()) return t.trim();
    } catch (e) { console.warn(e); }
  }
  if (S.settings.geminiKey) {
    try {
      const b64 = await blobToB64(blob);
      const t = await geminiCall('', [{ role: 'user', parts: [{ inline_data: { mime_type: (blob.type || 'audio/webm').split(';')[0], data: b64 } }, { text: `Transcribe exactamente este audio en ${lang === 'es' ? 'español' : 'inglés'}, palabra por palabra, INCLUYENDO muletillas y sonidos de duda (eh, este, mmm, o sea, um, uh). Devuelve solo la transcripción, sin comentarios.` }] }], false);
      if (t && t.trim()) return t.trim();
    } catch (e) { console.warn(e); }
  }
  return null;
}

/* ===== Voz (texto a voz) ===== */
function say(text, lang = 'en-US', rate) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate || S.settings.ttsRate;
    const vs = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
    const best = vs.find(v => v.lang.replace('_', '-') === lang && /google|natural|neural/i.test(v.name)) || vs.find(v => v.lang.replace('_', '-') === lang) || vs[0];
    if (best) u.voice = best;
    speechSynthesis.speak(u);
  } catch (e) { }
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { };

/* ===== Grabadora con medidor de volumen ===== */
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
class Rec {
  constructor({ lang = 'es-PE', onLevel, onText, record = true, live } = {}) {
    this.lang = lang; this.onLevel = onLevel; this.onText = onText; this.record = record;
    this.useSR = live ?? !hasAI(); // si no hay IA, el navegador escucha en vivo
    this.liveText = ''; this.final = '';
  }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 1024; src.connect(this.an);
    this.buf = new Float32Array(this.an.fftSize); this.vols = []; this.frames = 0; this.speakFrames = 0;
    this.chunks = [];
    if (this.record && window.MediaRecorder) {
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported(m)) || '';
      this.mr = new MediaRecorder(this.stream, mime ? { mimeType: mime } : {});
      this.mr.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.mr.start(1000);
    }
    this.t0 = Date.now(); this.running = true; this.loop();
    if (this.useSR) this.startSR();
    try { this.wake = await navigator.wakeLock?.request('screen'); } catch (e) { }
  }
  level() {
    this.an.getFloatTimeDomainData(this.buf);
    let s = 0; for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i];
    const db = 20 * Math.log10(Math.sqrt(s / this.buf.length) + 1e-8);
    return Math.max(0, Math.min(100, (db + 60) * 100 / 55));
  }
  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this.loop());
    const l = this.level(); this.frames++;
    if (l > 22) { this.speakFrames++; this.vols.push(l); }
    this.onLevel && this.onLevel(l, (Date.now() - this.t0) / 1000);
  }
  startSR() {
    if (!SRClass) return;
    try {
      this.sr = new SRClass(); this.sr.lang = this.lang; this.sr.continuous = true; this.sr.interimResults = true;
      this.sr.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) this.final += r[0].transcript + ' '; else interim += r[0].transcript; }
        this.liveText = this.final + interim; this.onText && this.onText(this.liveText);
      };
      this.sr.onerror = () => { };
      this.sr.onend = () => { if (this.srOn) { try { this.sr.start(); } catch (e) { } } };
      this.srOn = true; this.sr.start();
    } catch (e) { }
  }
  async stop() {
    this.running = false; cancelAnimationFrame(this.raf);
    this.srOn = false; try { this.sr && this.sr.stop(); } catch (e) { }
    let blob = null;
    if (this.mr && this.mr.state !== 'inactive') {
      const done = new Promise(r => this.mr.onstop = r); this.mr.stop(); await done;
      blob = new Blob(this.chunks, { type: this.mr.mimeType || 'audio/webm' });
    }
    await sleep(250);
    this.stream.getTracks().forEach(t => t.stop());
    try { this.ctx.close(); } catch (e) { }
    try { this.wake && this.wake.release(); } catch (e) { }
    const dur = (Date.now() - this.t0) / 1000;
    const avgVol = this.vols.length ? Math.round(this.vols.reduce((a, b) => a + b, 0) / this.vols.length) : 0;
    return { blob, dur, avgVol, speakRatio: this.speakFrames / Math.max(1, this.frames), liveText: (this.liveText || this.final).trim() };
  }
  cancel() { try { this.running = false; this.srOn = false; this.sr && this.sr.abort(); this.mr && this.mr.state !== 'inactive' && this.mr.stop(); this.stream && this.stream.getTracks().forEach(t => t.stop()); this.ctx && this.ctx.close(); this.wake && this.wake.release(); } catch (e) { } }
}

/* ===== Muletillas ===== */
const FILLERS_ES = [
  ['eh', /(^|[\s,.¿¡])(e+h+|e{2,})(?=[\s,.?!]|$)/gi],
  ['mmm', /(^|[\s,.¿¡])(m{2,}|e+m+|u+m+|a+m+)(?=[\s,.?!]|$)/gi],
  ['este', /(^|[\s,.¿¡])(este)(?=[\s,.?!]|$)(?!\s+(es|año|mes|lunes|martes|tema|lugar|libro|trabajo|día|caso|producto|almacén|proyecto|momento|sábado)\b)/gi],
  ['o sea', /(^|[\s,.¿¡])(o sea|osea)(?=[\s,.?!]|$)/gi],
  ['bueno', /(^|[\s,.¿¡])(bueno)(?=[\s,.?!]|$)/gi],
  ['pues', /(^|[\s,.¿¡])(pues)(?=[\s,.?!]|$)/gi],
  ['digamos', /(^|[\s,.¿¡])(digamos)(?=[\s,.?!]|$)/gi],
  ['tipo', /(^|[\s,.¿¡])(tipo)(?=[\s,.?!]|$)/gi],
  ['como que', /(^|[\s,.¿¡])(como que)(?=[\s,.?!]|$)/gi],
  ['¿no?', /(^|[\s,.¿¡])(no\?)/gi],
  ['entonces', /(^|[\s,.¿¡])(entonces)(?=[\s,.?!]|$)/gi]
];
const FILLERS_EN = [
  ['um', /(^|[\s,.])(u+m+|e+r+m*|a+h+)(?=[\s,.?!]|$)/gi],
  ['uh', /(^|[\s,.])(u+h+)(?=[\s,.?!]|$)/gi],
  ['like', /(^|[\s,.])(like)(?=,|\s+(you|i|um|uh)\b)/gi],
  ['you know', /(^|[\s,.])(you know)(?=[\s,.?!]|$)/gi],
  ['basically', /(^|[\s,.])(basically)(?=[\s,.?!]|$)/gi],
  ['actually', /(^|[\s,.])(actually)(?=[\s,.?!]|$)/gi]
];
function countFillers(text, lang = 'es') {
  const by = {}; let total = 0;
  for (const [name, re] of (lang === 'es' ? FILLERS_ES : FILLERS_EN)) {
    const m = (text || '').match(re); if (m && m.length) { by[name] = m.length; total += m.length; }
  }
  return { total, by };
}
function markFillers(text, lang = 'es') {
  let out = esc(text || '');
  for (const [, re] of (lang === 'es' ? FILLERS_ES : FILLERS_EN)) out = out.replace(new RegExp(re.source, 'gi'), (m, a, b) => a + '<mark>' + b + '</mark>');
  return out;
}
const countWords = t => (t || '').trim().split(/\s+/).filter(Boolean).length;

/* ===== Sonidos (público) ===== */
let _actx;
function noise(dur = 0.25, freq = 900, vol = 0.25, when = 0) {
  try {
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
    const c = _actx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + when);
  } catch (e) { }
}
const cough = () => { noise(0.18, 600, 0.5); noise(0.22, 500, 0.4, 0.25); };
function applause(sec = 2.5) { for (let i = 0; i < sec * 25; i++) noise(0.05, 1500 + Math.random() * 1500, 0.12 + Math.random() * 0.1, Math.random() * sec); }

/* ===== Gráfico simple ===== */
function lineChart(cv, vals, { color = '#38bdf8', target = null, min = null, max = null, label = '' } = {}) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 300, H = cv.clientHeight || 170;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  g.clearRect(0, 0, W, H); g.font = '12px system-ui'; g.fillStyle = '#94a3b8';
  if (!vals.length) { g.fillText('Aún no hay datos', 10, H / 2); return; }
  const lo = min ?? Math.min(...vals, target ?? Infinity), hi = max ?? Math.max(...vals, target ?? -Infinity);
  const P = 26, rng = (hi - lo) || 1, X = i => P + (vals.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (vals.length - 1)), Y = v => H - P - (v - lo) * (H - 2 * P) / rng;
  g.strokeStyle = '#334155'; g.beginPath(); g.moveTo(P, H - P); g.lineTo(W - P, H - P); g.stroke();
  g.fillText(String(Math.round(hi * 10) / 10), 2, P); g.fillText(String(Math.round(lo * 10) / 10), 2, H - P);
  if (target != null) { g.setLineDash([5, 4]); g.strokeStyle = '#22c55e'; g.beginPath(); g.moveTo(P, Y(target)); g.lineTo(W - P, Y(target)); g.stroke(); g.setLineDash([]); g.fillStyle = '#22c55e'; g.fillText('meta', W - P - 26, Y(target) - 4); }
  g.strokeStyle = color; g.lineWidth = 2.5; g.beginPath(); vals.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
  g.fillStyle = color; vals.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 3, 0, 7); g.fill(); });
}

/* ===== Medidor reutilizable ===== */
function meterHTML(target) { return `<div class="meter"><i></i><u style="left:${target}%"></u></div><div class="loud mut"></div>`; }
function updMeter(root, l, target) {
  const i = root.querySelector('.meter i'); if (i) i.style.width = l + '%';
  const t = root.querySelector('.loud'); if (!t) return;
  const now = Date.now(); if (l > 22) root._lastSpeak = now;
  if (l > 22 && l < target) { t.textContent = '🔈 ¡Más fuerte!'; t.className = 'loud warnc'; }
  else if (l >= target) { t.textContent = '🔊 ¡Bien, así!'; t.className = 'loud good'; }
  else if (root._lastSpeak && now - root._lastSpeak > 4000) { t.textContent = '…sigue hablando'; t.className = 'loud mut'; }
}
