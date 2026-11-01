'use strict';
/* ===== INICIO ===== */
function VIEW_inicio(el) {
  const min = minutesToday(), goal = S.settings.dailyGoal, t = speakTarget();
  const hr = new Date().getHours(), saludo = hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
  const last = [...S.sessions].reverse().find(s => s.type === 'hablar');
  el.innerHTML = `
  <h2>${saludo}, Pedro 👋</h2>
  <div class="card">
    <div class="row"><b class="grow">Meta de hoy: ${goal} min</b><span>${Math.round(min)} / ${goal}</span></div>
    <div class="prog"><i style="width:${Math.min(100, min / goal * 100)}%"></i></div>
    <p class="mut small">${min >= goal ? '✅ ¡Meta cumplida! Sigue así.' : 'Practica un poco hoy para no perder tu racha 🔥'}</p>
  </div>
  <div class="grid3" style="margin-bottom:14px">
    <div class="stat"><b>${S.speak.level}</b><span>Hablar</span></div>
    <div class="stat"><b>${S.express.level}</b><span>Expresarme</span></div>
    <div class="stat"><b>${cefr()}</b><span>Inglés</span></div>
  </div>
  <div class="card hl"><p class="mut small">🎯 Tu reto de ahora</p>
    <h3>${t.refuerzo ? REF_TXT[t.refuerzo] : `Nivel ${S.speak.level}: ${TIPO_TXT[t.tipo]} por ${fmtT(t.secs)}`}</h3>
    <p class="mut small">Máx. ${t.maxFpm} muletillas/min · volumen ${t.vol}+ ${t.publico ? '· con público 👥' : ''}</p>
    <button class="btn big ok" onclick="go('hablar')">🎤 Ir al reto</button></div>
  <div class="grid2">
    <button class="tile" onclick="go('expresar')"><b>💬</b>Expresarme mejor</button>
    <button class="tile" onclick="go('ingles')"><b>🇺🇸</b>Tutor de inglés</button>
    <button class="tile" onclick="go('entrevista')"><b>👔</b>Modo entrevista</button>
    <button class="tile" onclick="go('respiracion')"><b>🌬️</b>Respiración y voz</button>
  </div>
  ${last ? `<div class="card" style="margin-top:14px"><p class="mut small">Última práctica</p><p>${last.passed ? '✅' : '🟡'} Volumen ${last.vol} · ${last.fpm != null ? last.fpm + ' muletillas/min' : ''}</p></div>` : ''}
  ${!hasAI() ? `<div class="card" style="margin-top:14px;border-color:var(--warn)"><b>⚙️ Falta un paso</b><p class="small">Pon tu clave gratis de Gemini o Groq para activar el tutor, la corrección y los retos con IA.</p><button class="btn" onclick="go('ajustes')">Configurar</button></div>` : ''}`;
}

/* ===== MÁS ===== */
function VIEW_mas(el) {
  el.innerHTML = `<h2>☰ Más</h2><div class="grid2">
  <button class="tile" onclick="go('entrevista')"><b>👔</b>Entrevista</button>
  <button class="tile" onclick="go('respiracion')"><b>🌬️</b>Respiración y voz</button>
  <button class="tile" onclick="go('grabaciones')"><b>🎧</b>Mis grabaciones</button>
  <button class="tile" onclick="go('estadisticas')"><b>📈</b>Estadísticas</button>
  <button class="tile" onclick="go('ajustes')"><b>⚙️</b>Ajustes</button>
  <button class="tile" onclick="go('instalar')"><b>📲</b>Instalar app</button></div>`;
}

/* ===== ENTREVISTA ===== */
const PUESTOS = ['Asistente de almacén', 'Practicante de logística', 'Auxiliar de despacho y transporte', 'Asistente de inventarios'];
const PREG = {
  es: ['Cuéntame sobre ti.', '¿Por qué quieres trabajar en almacén y logística?', '¿Qué experiencia tienes con inventarios?', '¿Cómo harías para que no falte stock de un producto?', '¿Qué es el método FIFO y cuándo se usa?', 'Cuéntame de una vez que resolviste un problema en el trabajo.', '¿Cómo trabajas bajo presión?', '¿Qué sabes de seguridad en un almacén?', '¿Dónde te ves en 3 años?', '¿Por qué deberíamos contratarte?'],
  en: ['Tell me about yourself.', 'Why do you want to work in logistics?', 'What experience do you have with inventory?', 'How would you avoid running out of stock?', 'What is FIFO and when do you use it?', 'Tell me about a time you solved a problem at work.', 'How do you work under pressure?', 'What do you know about warehouse safety?', 'Where do you see yourself in three years?', 'Why should we hire you?']
};
let ivLang = 'es', ivPuesto = PUESTOS[0];
function VIEW_entrevista(el) {
  el.innerHTML = `<h2>👔 Modo entrevista</h2>
  <div class="card"><span class="lvl">Nivel ${S.interview.level}</span><p class="mut small">Mientras más alto, más difíciles y exigentes son las preguntas.</p>
  <label>Idioma</label><div class="chips"><button class="chip ${ivLang === 'es' ? 'on' : ''}" data-l="es">🇵🇪 Español</button><button class="chip ${ivLang === 'en' ? 'on' : ''}" data-l="en">🇺🇸 English</button></div>
  <label>Puesto</label><select id="pu">${PUESTOS.map(p => `<option ${p === ivPuesto ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
  <div class="card"><p class="small">📌 Te haré 5 preguntas. Respóndelas en voz alta, como en una entrevista real. Al final te doy tu puntaje y cómo mejorar cada respuesta.</p></div>
  <button class="btn big ok" id="st">▶️ Empezar entrevista</button>`;
  $$('[data-l]', el).forEach(b => b.onclick = () => { ivLang = b.dataset.l; VIEW_entrevista(el); });
  $('#pu', el).onchange = e => ivPuesto = e.target.value;
  $('#st', el).onclick = () => runInterview(el);
}
async function runInterview(el) {
  const N = 5, lang = ivLang, qa = [], L = S.interview.level;
  const sys = `Eres un entrevistador de RR.HH. de una empresa peruana de logística. Puesto: ${ivPuesto}. Candidato: Pedro, 20 años, estudiante de Administración Industrial en SENATI (4to ciclo), practicante encargado de almacén en una empresa de extintores; antes trabajó en atención al cliente (grifo, hotel). Dificultad ${L}/10 (alto = preguntas situacionales, técnicas y repreguntas incómodas). Habla en ${lang === 'es' ? 'español' : 'inglés sencillo (nivel ' + cefr() + ')'}.`;
  const bank = [...PREG[lang]].sort(() => Math.random() - .5);
  for (let i = 0; i < N; i++) {
    let q = bank[i];
    if (i === 0) q = PREG[lang][0];
    else if (hasAI()) {
      try { const j = await aiJSON(sys, `Historial:\n${qa.map((x, k) => `P${k + 1}: ${x.q}\nR: ${x.a}`).join('\n')}\nHaz la siguiente pregunta (${i + 1} de ${N}). Puede ser una repregunta sobre algo que dijo. JSON {"question":"..."}`); if (j && j.question) q = j.question; } catch (e) { }
    }
    const ans = await askOne(el, q, i, N, lang);
    if (ans === null) { VIEW_entrevista(el); return; }
    qa.push({ q, ...ans });
  }
  el.innerHTML = `<h2>👔 Resultado</h2><div class="card"><span class="spin"></span> Evaluando tu entrevista…</div>`;
  const totDur = qa.reduce((a, x) => a + x.dur, 0), totF = qa.reduce((a, x) => a + x.f, 0), avgVol = Math.round(qa.reduce((a, x) => a + x.vol, 0) / qa.length);
  let j = null;
  if (hasAI()) { try { j = await aiJSON(sys, `Evalúa la entrevista completa. Responde en español sencillo aunque la entrevista sea en inglés.\n${qa.map((x, k) => `P${k + 1}: ${x.q}\nR: ${x.a}`).join('\n')}\nMuletillas totales: ${totF}. Volumen promedio: ${avgVol}/100.\nJSON {"puntaje":0-100,"resumen":"2 frases","preguntas":[{"bien":"...","mejorar":"...","respuesta_modelo":"cómo responder mejor (${lang === 'es' ? 'español' : 'inglés'}), 2-3 frases, con sus datos reales"}]}`); } catch (e) { } }
  const score = j ? +j.puntaje || 0 : Math.max(20, 85 - totF * 2 - (avgVol < S.settings.volTarget ? 15 : 0));
  let msg = '';
  if (score >= 75) { S.interview.level++; msg = `🎉 ¡Subiste al nivel ${S.interview.level}! La próxima será más exigente.`; save(); }
  addSession({ type: 'entrevista', dur: totDur, score, fillers: totF, vol: avgVol });
  el.innerHTML = `<h2>👔 Resultado</h2>
  <div class="card hl"><h3>Puntaje: ${score}/100</h3>${j ? `<p>${esc(j.resumen)}</p>` : ''}${msg ? `<p><b>${msg}</b></p>` : ''}
  <div class="chk"><span>🚫 Muletillas</span><b>${totF}</b></div><div class="chk"><span>🔊 Volumen promedio</span><b class="${avgVol >= S.settings.volTarget ? 'good' : 'badc'}">${avgVol}</b></div></div>
  ${qa.map((x, k) => { const p = j?.preguntas?.[k]; return `<div class="card"><p class="mut small">Pregunta ${k + 1}</p><h3>${esc(x.q)}</h3><details><summary>Tu respuesta</summary><p class="small">${markFillers(x.a, lang) || '<i>(sin texto)</i>'}</p></details>
    ${p ? `<p class="good small">👍 ${esc(p.bien)}</p><p class="warnc small">🔧 ${esc(p.mejorar)}</p><p class="small"><b>✨ Mejor así:</b> ${esc(p.respuesta_modelo)}</p>` : ''}</div>`; }).join('')}
  <button class="btn big ok" id="ag">🔁 Otra entrevista</button>`;
  $('#ag', el).onclick = () => VIEW_entrevista(el);
}
function askOne(el, q, i, N, lang) {
  return new Promise(resolve => {
    el.innerHTML = `<h2>👔 Pregunta ${i + 1} de ${N}</h2>
    <div class="card hl"><h3 style="font-size:20px">${esc(q)}</h3><button class="btn sec" id="rp">🔊 Repetir pregunta</button></div>
    <div class="card"><div class="timer" id="tm">0:00</div>${meterHTML(S.settings.volTarget)}<div class="live" id="lv" style="margin-top:10px">Toca "Responder" y habla</div></div>
    <button class="btn big ok" id="rc">🎤 Responder</button>
    <button class="btn sec" id="ex" style="width:100%;margin-top:8px">Salir</button>`;
    say(q, lang === 'es' ? 'es-US' : 'en-US');
    $('#rp', el).onclick = () => say(q, lang === 'es' ? 'es-US' : 'en-US');
    let rec = null;
    $('#ex', el).onclick = () => { rec && rec.cancel(); cleanup = null; resolve(null); };
    $('#rc', el).onclick = async () => {
      const b = $('#rc', el);
      if (!rec) {
        speechSynthesis.cancel();
        rec = new Rec({ lang: lang === 'es' ? 'es-PE' : 'en-US', onLevel: (l, s) => { updMeter(el, l, S.settings.volTarget); $('#tm', el).textContent = fmtT(s); }, onText: t => { $('#lv', el).innerHTML = markFillers(t, lang); } });
        try { await rec.start(); } catch (e) { rec = null; toast('No pude usar el micrófono'); return; }
        cleanup = () => rec && rec.cancel();
        b.textContent = '⏹️ Terminé mi respuesta'; b.classList.replace('ok', 'bad');
        $('#lv', el).textContent = hasAI() ? 'Escuchando… (la IA transcribe al terminar)' : 'Escuchando…';
      } else {
        b.disabled = true; b.innerHTML = '<span class="spin"></span> Procesando…';
        const r = await rec.stop(); rec = null; cleanup = null;
        let t = null; if (hasAI()) t = await transcribe(r.blob, lang);
        t = t || r.liveText || '';
        resolve({ a: t, dur: r.dur, vol: r.avgVol, f: countFillers(t, lang).total });
      }
    };
  });
}

/* ===== RESPIRACIÓN Y VOZ ===== */
const EJ = {
  cuadrada: { n: '⬜ Cuadrada (calma antes de hablar)', f: [['Inhala', 4, 1.6], ['Sostén', 4, 1.6], ['Exhala', 4, 1], ['Sostén', 4, 1]], rounds: 5 },
  calma: { n: '😌 4-7-8 (nervios)', f: [['Inhala', 4, 1.6], ['Sostén', 7, 1.6], ['Exhala', 8, 1]], rounds: 4 },
  diafragma: { n: '💪 Diafragma (voz más fuerte)', f: [['Inhala por la nariz, infla la barriga', 4, 1.7], ['Saca el aire diciendo "sss" fuerte', 8, 1]], rounds: 6 }
};
function VIEW_respiracion(el) {
  el.innerHTML = `<h2>🌬️ Respiración y voz</h2>
  <div class="card"><p class="small">Haz esto 2-3 minutos antes de hablar. Calma los nervios y hace que tu voz salga más fuerte.</p></div>
  ${Object.entries(EJ).map(([k, v]) => `<button class="btn sec opt" data-e="${k}">${v.n}</button>`).join('')}
  <button class="btn pur opt" id="proy">📣 Proyección de voz (sostener "Aaaa" fuerte)</button>
  <div class="card" style="margin-top:12px"><h3>🗣️ Calentamiento rápido</h3><ul class="clean small">
  <li>Bosteza 3 veces con la boca bien abierta.</li><li>Haz vibrar los labios "brrrr" 20 segundos.</li><li>Di lento y exagerando: "PA - TA - KA" 10 veces.</li><li>Trabalenguas: "Tres tristes tigres tragaban trigo en un trigal".</li><li>Lee un párrafo en voz alta como si le hablaras a alguien a 5 metros.</li></ul></div>`;
  $$('[data-e]', el).forEach(b => b.onclick = () => runBreath(el, EJ[b.dataset.e]));
  $('#proy', el).onclick = () => runProy(el);
}
function runBreath(el, ex) {
  el.innerHTML = `<h2>${ex.n}</h2><div class="bwrap"><div class="bcircle" id="bc">Prepárate</div></div><p class="timer" id="cnt" style="font-size:40px"></p><p class="mut" style="text-align:center" id="rd"></p><button class="btn sec" id="bk" style="width:100%">⬅️ Terminar</button>`;
  let stop = false; const bc = $('#bc', el); const t0 = Date.now();
  $('#bk', el).onclick = () => { stop = true; VIEW_respiracion(el); };
  cleanup = () => stop = true;
  (async () => {
    await sleep(1200);
    for (let r = 0; r < ex.rounds && !stop; r++) {
      $('#rd', el).textContent = `Ronda ${r + 1} de ${ex.rounds}`;
      for (const [name, secs, scale] of ex.f) {
        if (stop) return;
        bc.style.transition = `transform ${secs}s ease-in-out`; bc.style.transform = `scale(${scale})`; bc.textContent = name;
        for (let s = secs; s > 0 && !stop; s--) { $('#cnt', el).textContent = s; await sleep(1000); }
      }
    }
    if (!stop) { bc.textContent = '¡Listo! 🎉'; $('#cnt', el).textContent = ''; addSession({ type: 'respiracion', dur: (Date.now() - t0) / 1000 }); cleanup = null; }
  })();
}
async function runProy(el) {
  const tgt = S.settings.volTarget;
  el.innerHTML = `<h2>📣 Proyección de voz</h2><div class="card"><p class="small">Respira hondo y di "Aaaaa" <b>fuerte y parejo</b> el mayor tiempo posible. Solo cuenta mientras pasas la línea blanca.</p>
  <div class="timer" id="tm">0.0 s</div>${meterHTML(tgt)}<p class="mut" style="text-align:center">Tu récord: <b>${S.breath.best.toFixed(1)} s</b></p></div>
  <button class="btn big ok" id="go">🎤 Empezar</button><button class="btn sec" id="bk" style="width:100%;margin-top:8px">⬅️ Volver</button>`;
  let rec = null, held = 0, best = 0, last = 0;
  $('#bk', el).onclick = () => { rec && rec.cancel(); VIEW_respiracion(el); };
  $('#go', el).onclick = async () => {
    const b = $('#go', el);
    if (!rec) {
      held = 0; best = 0;
      rec = new Rec({ record: false, live: false, onLevel: (l) => { const now = performance.now(); if (l >= tgt) { held += (now - (last || now)) / 1000; best = Math.max(best, held); } else if (l < 22) held = 0; last = now; updMeter(el, l, tgt); $('#tm', el).textContent = held.toFixed(1) + ' s'; } });
      try { await rec.start(); } catch (e) { rec = null; toast('No pude usar el micrófono'); return; }
      cleanup = () => rec && rec.cancel();
      b.textContent = '⏹️ Parar'; b.classList.replace('ok', 'bad');
    } else {
      const r = await rec.stop(); rec = null; cleanup = null;
      const nuevo = best > S.breath.best; if (nuevo) S.breath.best = best;
      addSession({ type: 'respiracion', dur: r.dur, proy: best });
      toast(nuevo ? `🏆 ¡Nuevo récord: ${best.toFixed(1)} s!` : `Lograste ${best.toFixed(1)} s`);
      runProy(el);
    }
  };
}

/* ===== GRABACIONES ===== */
async function VIEW_grabaciones(el) {
  el.innerHTML = `<h2>🎧 Mis grabaciones</h2><div class="card"><span class="spin"></span></div>`;
  let all = []; try { all = (await DB.all()).sort((a, b) => b.date.localeCompare(a.date)); } catch (e) { }
  const speak = all.filter(r => r.type === 'hablar');
  el.innerHTML = `<h2>🎧 Mis grabaciones</h2>
  ${speak.length >= 2 ? `<div class="card hl"><h3>⚖️ Compara tu avance</h3><p class="mut small">Tu primera grabación vs. la última</p>
   <p class="small">Primera (${new Date(speak[speak.length - 1].date).toLocaleDateString()}) · vol ${speak[speak.length - 1].vol} · ${speak[speak.length - 1].fpm} mul/min</p><audio controls style="width:100%" id="a1"></audio>
   <p class="small">Última (${new Date(speak[0].date).toLocaleDateString()}) · vol ${speak[0].vol} · ${speak[0].fpm} mul/min</p><audio controls style="width:100%" id="a2"></audio></div>` : ''}
  ${all.length ? all.map(r => `<div class="card" data-id="${r.id}"><div class="row"><b class="grow">${esc(r.tema || 'Práctica')}</b><span class="mut small">${new Date(r.date).toLocaleString()}</span></div>
   <p class="small mut">${r.passed ? '✅' : '🟡'} Nivel ${r.level} · ${fmtT(r.dur)} · volumen ${r.vol} · ${r.fillers} muletillas</p>
   <div class="row"><button class="btn sec grow" data-p="${r.id}">▶️ Escuchar</button><button class="btn sec" data-d="${r.id}">🗑️</button></div><div class="pl"></div></div>`).join('') : '<div class="card"><p>Todavía no tienes grabaciones. ¡Haz tu primer reto!</p><button class="btn" onclick="go(\'hablar\')">🎤 Ir a Hablar</button></div>'}`;
  if (speak.length >= 2) { $('#a1', el).src = URL.createObjectURL(speak[speak.length - 1].blob); $('#a2', el).src = URL.createObjectURL(speak[0].blob); }
  $$('[data-p]', el).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.p); const pl = b.closest('.card').querySelector('.pl'); pl.innerHTML = `<audio controls autoplay style="width:100%;margin-top:8px"></audio>`; pl.firstChild.src = URL.createObjectURL(r.blob); });
  $$('[data-d]', el).forEach(b => b.onclick = async () => { if (!confirm('¿Borrar esta grabación?')) return; await DB.del(b.dataset.d); VIEW_grabaciones(el); });
}

/* ===== ESTADÍSTICAS ===== */
function VIEW_estadisticas(el) {
  const ss = S.sessions, days = new Set(ss.map(s => s.day)).size, mins = Math.round(ss.reduce((a, s) => a + (s.dur || 0), 0) / 60);
  const sp = ss.filter(s => s.type === 'hablar').slice(-30);
  const en = ss.filter(s => s.type === 'ingles');
  const enByDay = {}; en.forEach(s => { enByDay[s.day] = enByDay[s.day] || [0, 0]; enByDay[s.day][0]++; enByDay[s.day][1] += s.err || 0; });
  const enAcc = Object.values(enByDay).slice(-20).map(([n, e]) => Math.round((1 - e / n) * 100));
  const ex = ss.filter(s => s.type === 'expresar' && s.score != null).slice(-30);
  const week = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = dstr(d); return [d.toLocaleDateString('es', { weekday: 'short' }), ss.filter(s => s.day === k).reduce((a, s) => a + (s.dur || 0), 0) / 60]; });
  el.innerHTML = `<h2>📈 Estadísticas</h2>
  <div class="grid2" style="margin-bottom:14px"><div class="stat"><b>${streakNow()}🔥</b><span>Racha</span></div><div class="stat"><b>${days}</b><span>Días practicados</span></div><div class="stat"><b>${mins}</b><span>Minutos totales</span></div><div class="stat"><b>${ss.length}</b><span>Prácticas</span></div></div>
  <div class="card"><h3>📅 Últimos 7 días (minutos)</h3><div class="row" style="align-items:flex-end;height:110px;gap:6px">${week.map(([d, m]) => `<div style="flex:1;text-align:center"><div style="height:${Math.min(80, m / Math.max(S.settings.dailyGoal, 1) * 80)}px;background:${m >= S.settings.dailyGoal ? 'var(--ok)' : 'var(--acc)'};border-radius:6px 6px 0 0;min-height:3px"></div><div class="small mut">${d}</div></div>`).join('')}</div></div>
  <div class="card"><h3>🚫 Muletillas por minuto</h3><p class="mut small">Mientras más bajo, mejor</p><canvas id="c1"></canvas></div>
  <div class="card"><h3>🔊 Volumen de tu voz</h3><p class="mut small">Mientras más alto, mejor. Línea verde = tu meta</p><canvas id="c2"></canvas></div>
  <div class="card"><h3>🎤 Nivel de Hablar</h3><canvas id="c3"></canvas></div>
  <div class="card"><h3>🇺🇸 Aciertos en inglés por día (%)</h3><canvas id="c4"></canvas></div>
  <div class="card"><h3>💬 Claridad al expresarte</h3><canvas id="c5"></canvas></div>
  <div class="card"><h3>📣 Récord de voz sostenida</h3><p style="font-size:24px"><b>${S.breath.best.toFixed(1)} s</b></p></div>`;
  requestAnimationFrame(() => {
    lineChart($('#c1', el), sp.filter(s => s.fpm != null).map(s => s.fpm), { color: '#f59e0b', min: 0 });
    lineChart($('#c2', el), sp.map(s => s.vol), { color: '#22c55e', target: S.settings.volTarget, min: 0, max: 100 });
    lineChart($('#c3', el), sp.map(s => s.level), { color: '#a78bfa', min: 0 });
    lineChart($('#c4', el), enAcc, { color: '#38bdf8', min: 0, max: 100 });
    lineChart($('#c5', el), ex.map(s => s.score), { color: '#ec4899', min: 0, max: 100 });
  });
}

/* ===== AJUSTES ===== */
function VIEW_ajustes(el) {
  const st = S.settings;
  el.innerHTML = `<h2>⚙️ Ajustes</h2>
  <div class="card"><h3>🤖 Inteligencia artificial</h3>
  <p class="small mut">La app usa Gemini primero; si falla, usa Groq; y si no hay internet o claves, usa el navegador. Las claves se guardan solo en tu celular.</p>
  <label>Clave de Gemini (gratis en aistudio.google.com → Get API key)</label><input id="gk" type="password" value="${esc(st.geminiKey)}" placeholder="AIza…">
  <label>Clave de Groq (gratis en console.groq.com → API Keys)</label><input id="qk" type="password" value="${esc(st.groqKey)}" placeholder="gsk_…">
  <details style="margin-top:10px"><summary>Opciones avanzadas</summary>
   <label>Modelo de Gemini</label><input id="gm" value="${esc(st.geminiModel)}">
   <label>Modelo de Groq</label><input id="qm" value="${esc(st.groqModel)}">
   <label>Modelo de voz a texto (Groq)</label><input id="wm" value="${esc(st.whisperModel)}"></details>
  <div class="row" style="margin-top:12px"><button class="btn grow" id="sv">💾 Guardar</button><button class="btn sec grow" id="ts">🧪 Probar IA</button></div><p id="tr" class="small"></p></div>
  <div class="card"><h3>🔊 Tu volumen</h3><p class="small mut">Lee algo en voz alta con tu voz normal por 5 segundos. La app calcula tu meta de volumen.</p>
  ${meterHTML(st.volTarget)}<p>Meta actual: <b id="vt">${st.volTarget}</b></p>
  <input type="range" min="25" max="75" value="${st.volTarget}" id="vr"><button class="btn sec" id="cal" style="width:100%;margin-top:8px">🎤 Calibrar con mi voz</button></div>
  <div class="card"><h3>🎯 Meta diaria</h3><select id="dg">${[5, 10, 15, 20, 30].map(m => `<option ${m === st.dailyGoal ? 'selected' : ''} value="${m}">${m} minutos</option>`).join('')}</select>
  <label>Velocidad de la voz en inglés</label><select id="tt">${[[0.75, 'Lenta'], [0.95, 'Normal'], [1.1, 'Rápida']].map(([v, n]) => `<option value="${v}" ${v === st.ttsRate ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
  <div class="card"><h3>💾 Copia de seguridad</h3><div class="row"><button class="btn sec grow" id="exp">⬇️ Exportar</button><button class="btn sec grow" id="imp">⬆️ Importar</button></div><input type="file" id="fi" accept=".json" hidden>
  <button class="btn bad" id="rs" style="width:100%;margin-top:10px">Reiniciar niveles</button></div>`;
  const read = () => { st.geminiKey = $('#gk', el).value.trim(); st.groqKey = $('#qk', el).value.trim(); st.geminiModel = $('#gm', el).value.trim() || DEF.settings.geminiModel; st.groqModel = $('#qm', el).value.trim() || DEF.settings.groqModel; st.whisperModel = $('#wm', el).value.trim() || DEF.settings.whisperModel; save(); };
  $('#sv', el).onclick = () => { read(); toast('✅ Guardado'); };
  $('#ts', el).onclick = async () => {
    read(); const tr = $('#tr', el); tr.innerHTML = '<span class="spin"></span>';
    const out = [];
    if (st.geminiKey) { try { await geminiCall('', [{ role: 'user', parts: [{ text: 'Di solo: ok' }] }]); out.push('✅ Gemini funciona'); } catch (e) { out.push('❌ Gemini: ' + esc(e.message.slice(0, 120))); } }
    if (st.groqKey) { try { await groqCall('', [{ role: 'user', text: 'Di solo: ok' }]); out.push('✅ Groq funciona'); } catch (e) { out.push('❌ Groq: ' + esc(e.message.slice(0, 120))); } }
    tr.innerHTML = out.join('<br>') || 'Pon al menos una clave.';
  };
  $('#vr', el).oninput = e => { st.volTarget = +e.target.value; $('#vt', el).textContent = st.volTarget; $('.meter u', el).style.left = st.volTarget + '%'; save(); };
  $('#cal', el).onclick = async () => {
    const b = $('#cal', el); const r = new Rec({ record: false, live: false, onLevel: l => updMeter(el, l, st.volTarget) });
    try { await r.start(); } catch (e) { toast('No pude usar el micrófono'); return; }
    cleanup = () => r.cancel();
    for (let s = 5; s > 0; s--) { b.textContent = `🗣️ Habla normal… ${s}`; await sleep(1000); }
    const res = await r.stop(); cleanup = null;
    const meta = Math.max(30, Math.min(75, res.avgVol + 8));
    st.volTarget = meta; save(); toast(`Tu voz normal: ${res.avgVol}. Nueva meta: ${meta} (un poco más fuerte)`, 4500); VIEW_ajustes(el);
  };
  $('#dg', el).onchange = e => { st.dailyGoal = +e.target.value; save(); };
  $('#tt', el).onchange = e => { st.ttsRate = +e.target.value; save(); };
  $('#exp', el).onclick = () => { const c = JSON.parse(JSON.stringify(S)); c.settings.geminiKey = ''; c.settings.groqKey = ''; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(c)], { type: 'application/json' })); a.download = 'habla-respaldo-' + today() + '.json'; a.click(); };
  $('#imp', el).onclick = () => $('#fi', el).click();
  $('#fi', el).onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); const keys = { g: st.geminiKey, q: st.groqKey }; S = merge(JSON.parse(JSON.stringify(DEF)), d); S.settings.geminiKey = keys.g; S.settings.groqKey = keys.q; save(); toast('✅ Datos importados'); go('inicio'); } catch (er) { toast('Archivo no válido'); } };
  $('#rs', el).onclick = () => { if (!confirm('¿Reiniciar todos los niveles? (las grabaciones y claves se mantienen)')) return; const keep = S.settings; S = JSON.parse(JSON.stringify(DEF)); S.settings = keep; save(); toast('Niveles reiniciados'); go('inicio'); };
}

/* ===== INSTALAR ===== */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function VIEW_instalar(el) {
  const inst = window.matchMedia('(display-mode: standalone)').matches;
  el.innerHTML = `<h2>📲 Instalar app</h2>
  ${inst ? '<div class="card hl"><h3>✅ Ya está instalada</h3></div>' : ''}
  <div class="card"><button class="btn big ok" id="ib" ${deferredPrompt ? '' : 'hidden'}>📲 Instalar ahora</button>
  <h3 style="margin-top:10px">En tu celular (Chrome)</h3><ol class="clean"><li>Abre esta página en Chrome.</li><li>Toca los <b>3 puntitos ⋮</b> arriba a la derecha.</li><li>Elige <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.</li><li>Listo: te aparece el ícono <b>Habla</b> como cualquier app.</li></ol>
  <p class="mut small">La primera vez que practiques, acepta el permiso del micrófono.</p></div>`;
  const ib = $('#ib', el); ib.onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; ib.hidden = true; };
}

/* ===== Navegación ===== */
const VIEWS = { inicio: VIEW_inicio, hablar: VIEW_hablar, expresar: VIEW_expresar, ingles: VIEW_ingles, entrevista: VIEW_entrevista, mas: VIEW_mas, respiracion: VIEW_respiracion, grabaciones: VIEW_grabaciones, estadisticas: VIEW_estadisticas, ajustes: VIEW_ajustes, instalar: VIEW_instalar };
const SUB_MAS = ['entrevista', 'respiracion', 'grabaciones', 'estadisticas', 'ajustes', 'instalar', 'mas'];
let cleanup = null;
function go(v) {
  if (!VIEWS[v]) v = 'inicio';
  if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
  try { speechSynthesis.cancel(); } catch (e) { }
  const ov = $('#overlay'); ov.hidden = true; ov.innerHTML = '';
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v || (b.dataset.v === 'mas' && SUB_MAS.includes(v))));
  const el = $('#view'); el.innerHTML = ''; window.scrollTo(0, 0);
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  VIEWS[v](el);
}
$$('#nav button').forEach(b => b.onclick = () => go(b.dataset.v));
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS[v]) go(v); });
renderStreak();
go(location.hash.slice(1) || 'inicio');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
