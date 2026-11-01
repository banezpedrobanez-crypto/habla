'use strict';
/* ===== HABLAR EN PÚBLICO (retos que se adaptan a tu avance) ===== */
const TIPOS = ['personal', 'personal', 'opinión', 'opinión', 'explicar', 'explicar', 'convencer', 'convencer', 'improvisar', 'improvisar'];
const TIPO_TXT = { personal: 'Hablar de ti', 'opinión': 'Dar tu opinión', explicar: 'Explicar algo', convencer: 'Convencer', improvisar: 'Improvisar' };
const TEMAS = {
  personal: ['Cuéntame cómo es un día normal para ti', 'Habla de tu moto y por qué te gusta', 'Tu comida favorita y por qué', 'Un viaje que te gustaría hacer', 'Describe tu trabajo ideal', 'Una persona que admiras y por qué', 'Lo que más te gusta de programar', 'Qué aprendiste en tus prácticas', 'Tu mejor recuerdo del colegio', 'Qué harías con un día libre'],
  'opinión': ['¿Es mejor trabajar y estudiar a la vez?', '¿Las motos deberían tener más espacio en las pistas de Lima?', '¿La inteligencia artificial quitará trabajos?', '¿Es importante saber inglés para trabajar en Perú?', '¿Se debería usar el celular en el trabajo?', '¿Es mejor trabajar en una empresa grande o pequeña?', '¿Las prácticas deberían ser pagadas siempre?'],
  explicar: ['Explica cómo se hace un inventario en un almacén', 'Explica qué es el método FIFO con un ejemplo', 'Explica cómo funciona un extintor', 'Explica cómo ordenarías un almacén desordenado', 'Explica qué es un kardex', 'Explica cómo se despacha un pedido', 'Explica qué cuidados de seguridad hay en un almacén'],
  convencer: ['Convence a tu jefe de comprar un sistema para el almacén', 'Convence a un cliente de renovar sus extintores', 'Convence a un amigo de empezar a estudiar inglés', 'Véndeme un producto en 1 minuto', 'Convence a la empresa de contratarte', 'Convence a tus compañeros de ordenar el almacén los sábados'],
  improvisar: ['Te nombran jefe de almacén hoy: da tu primer discurso al equipo', 'Un cliente molesto reclama un pedido que no llegó: atiéndelo', 'Presenta tu proyecto de app ante un jurado', 'Da un brindis en un cumpleaños', 'Explica a tu jefe por qué faltan 10 productos en el inventario', 'Te piden presentarte ante 50 personas en una feria laboral']
};
const GUIA = { personal: ['Di de qué vas a hablar', 'Cuenta 2 detalles o un ejemplo', 'Cierra con una frase final'], 'opinión': ['Di tu opinión al inicio', 'Da 2 razones', 'Da un ejemplo', 'Repite tu opinión al final'], explicar: ['Di qué vas a explicar', 'Explica paso a paso (primero, luego, al final)', 'Da un ejemplo real', 'Resume en una frase'], convencer: ['Muestra el problema', 'Da tu solución', 'Di los beneficios', 'Pide una acción concreta'], improvisar: ['Respira antes de empezar', 'Empieza con una frase fuerte', 'Usa la estructura: idea - razón - ejemplo - idea', 'Termina con seguridad'] };

function speakTarget() {
  const l = S.speak.level;
  const t = {
    secs: Math.min(30 + (l - 1) * 30, 300),
    maxFpm: Math.max(1, +(8 - (l - 1) * 0.8).toFixed(1)),
    vol: Math.round(Math.min(S.settings.volTarget + (l - 1) * 1.5, 75)),
    publico: l >= 3,
    tipo: TIPOS[Math.min(l, 10) - 1],
    refuerzo: S.speak.refuerzo
  };
  if (l > 10) { t.tipo = pick(['opinión', 'explicar', 'convencer', 'improvisar']); }
  if (t.refuerzo) t.secs = Math.max(30, Math.round(t.secs * 0.7 / 10) * 10);
  return t;
}
const REF_TXT = { vol: '🔊 Reto de refuerzo: VOZ FUERTE. Solo cuenta que tu volumen llegue a la meta.', fill: '🚫 Reto de refuerzo: CERO MULETILLAS. Habla más lento y haz pausas en vez de decir "eh".', dur: '⏱️ Reto de refuerzo: AGUANTAR EL TIEMPO. Usa la guía para no quedarte sin ideas.' };

let curTopic = null, curTarget = null;
async function newTopic(el) {
  curTarget = speakTarget();
  const tipo = curTarget.tipo;
  const local = () => { const opts = TEMAS[tipo].filter(x => !S.speak.recent.includes(x)); return { tema: pick(opts.length ? opts : TEMAS[tipo]), guia: GUIA[tipo] }; };
  curTopic = local();
  if (hasAI()) {
    try {
      const j = await aiJSON('Eres un coach de oratoria peruano, amable y práctico.', `Crea UN tema para que Pedro practique hablar en público. Pedro: 20 años, estudiante de Administración Industrial en SENATI (Lima), practicante en una empresa de extintores, encargado de almacén; le gustan las motos y programar; su voz es baja y quiere ganar seguridad.
Tipo de reto: ${TIPO_TXT[tipo]}. Nivel ${S.speak.level} (de 1 fácil a 10 muy difícil). Debe hablar ${curTarget.secs} segundos.
No repitas estos temas: ${S.speak.recent.slice(-8).join(' | ') || 'ninguno'}.
Responde JSON: {"tema":"el tema en una frase","guia":["3 o 4 pasos cortos para ordenar lo que va a decir"]}. Español peruano sencillo.`);
      if (j && j.tema) curTopic = { tema: j.tema, guia: Array.isArray(j.guia) && j.guia.length ? j.guia : GUIA[tipo] };
    } catch (e) { }
  }
  S.speak.recent.push(curTopic.tema); S.speak.recent = S.speak.recent.slice(-15); save();
  if (el) renderSpeakIdle(el);
}

function VIEW_hablar(el) {
  el.innerHTML = `<h2>🎤 Hablar en público</h2><div class="card"><span class="spin"></span> Preparando tu reto…</div>`;
  if (curTopic && curTarget && curTarget.secs === speakTarget().secs && curTarget.refuerzo === S.speak.refuerzo) renderSpeakIdle(el); else newTopic(el);
}

let publicOn = false;
function renderSpeakIdle(el) {
  const t = curTarget, l = S.speak.level;
  if (t.publico) publicOn = true;
  el.innerHTML = `
  <h2>🎤 Hablar en público</h2>
  <div class="card hl">
    <div class="row"><span class="lvl">Nivel ${l}</span><span class="mut">${TIPO_TXT[t.tipo]}</span></div>
    <div class="prog"><i style="width:${S.speak.pass * 50}%"></i></div>
    <div class="mut small">Supera ${2 - S.speak.pass} reto(s) más para subir de nivel</div>
    ${t.refuerzo ? `<p class="warnc"><b>${REF_TXT[t.refuerzo]}</b></p>` : ''}
    <h3 style="margin-top:12px;font-size:20px">"${esc(curTopic.tema)}"</h3>
    <ol class="clean">${curTopic.guia.map(g => `<li>${esc(g)}</li>`).join('')}</ol>
  </div>
  <div class="card">
    <h3>🎯 Metas de este reto</h3>
    <div class="chk"><span>⏱️ Hablar al menos</span><b>${fmtT(t.secs)}</b></div>
    <div class="chk"><span>🚫 Muletillas por minuto</span><b>máx. ${t.maxFpm}</b></div>
    <div class="chk"><span>🔊 Volumen de voz</span><b>${t.vol} o más</b></div>
  </div>
  <div class="card">
    <div class="row"><div class="grow"><b>👥 Modo público</b><div class="mut small">${t.publico ? 'Obligatorio desde el nivel 3' : 'Gente mirándote mientras hablas'}</div></div>
    <button class="chip ${publicOn ? 'on' : ''}" id="pub" ${t.publico ? 'disabled' : ''}>${publicOn ? 'Encendido' : 'Apagado'}</button></div>
  </div>
  <button class="btn big ok" id="go">▶️ Empezar a hablar</button>
  <div class="row" style="margin-top:10px"><button class="btn sec grow" id="other">🔄 Otro tema</button><button class="btn sec grow" id="warm">🌬️ Calentar voz</button></div>
  ${!hasAI() ? `<p class="mut small" style="margin-top:12px">💡 Sin clave de IA, el navegador escucha y cuenta las muletillas, pero es menos exacto. Pon tu clave de Gemini o Groq en <a href="#ajustes" style="color:var(--acc)">Ajustes</a>.</p>` : ''}`;
  $('#pub', el).onclick = () => { publicOn = !publicOn; renderSpeakIdle(el); };
  $('#other', el).onclick = () => { el.innerHTML = `<h2>🎤 Hablar en público</h2><div class="card"><span class="spin"></span> Buscando otro tema…</div>`; newTopic(el); };
  $('#warm', el).onclick = () => go('respiracion');
  $('#go', el).onclick = () => startSpeak(el);
}

function personSVG(serious) {
  const skin = pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#d9a066', '#b07a4a']);
  const hair = pick(['#1b120c', '#000', '#3b2416', '#5a3a22', '#222', '#6b4b2e']);
  const shirt = pick(['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899', '#0ea5e9', '#f8fafc', '#1f2937']);
  const mouth = serious ? pick(['M41 67 L59 67', 'M41 69 Q50 64 59 69']) : pick(['M40 64 Q50 72 60 64', 'M41 66 L59 66', 'M42 65 Q50 70 58 65']);
  const longHair = Math.random() < 0.45;
  return `<svg viewBox="0 0 100 120"><rect x="14" y="82" width="72" height="40" rx="22" fill="${shirt}"/>
  <g class="head">${longHair ? `<path d="M20 50 Q18 90 30 92 L70 92 Q82 90 80 50Z" fill="${hair}"/>` : ''}
  <circle cx="50" cy="50" r="27" fill="${skin}"/>
  <path d="M22 46 Q24 18 50 20 Q76 18 78 46 Q72 30 50 30 Q30 30 22 46Z" fill="${hair}"/>
  <g class="eyes"><circle cx="40" cy="52" r="3.3" fill="#111"/><circle cx="60" cy="52" r="3.3" fill="#111"/></g>
  ${serious ? '<path d="M35 44 L45 46 M55 46 L65 44" stroke="#111" stroke-width="2"/>' : ''}
  <path d="${mouth}" stroke="#5a2d1a" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
  <rect class="ph" x="40" y="88" width="18" height="26" rx="3" fill="#111" stroke="#666"/></svg>`;
}
function audience(lvl) {
  const n = 16, seriousP = Math.min(0.15 + lvl * 0.07, 0.75);
  let html = '';
  for (let i = 0; i < n; i++) html += `<div class="p" style="--d:${(3 + Math.random() * 4).toFixed(1)}s;--b:${(3 + Math.random() * 4).toFixed(1)}s">${personSVG(Math.random() < seriousP)}</div>`;
  return html;
}

let speakRec = null;
async function startSpeak(el) {
  const t = curTarget;
  let fillLive = 0;
  const panel = `
    <div class="timer" id="tm">0:00</div>
    <div class="mut small" style="text-align:center">Meta: ${fmtT(t.secs)} · "${esc(curTopic.tema)}"</div>
    <div style="margin:12px 0">${meterHTML(t.vol)}</div>
    ${!hasAI() ? `<div class="live" id="lv">Habla… aquí aparece lo que dices</div><p class="mut small">Muletillas detectadas: <b id="fc">0</b></p>` : `<p class="mut small" style="text-align:center">Al terminar, la IA revisa tu audio y cuenta tus muletillas.</p>`}
    <button class="btn big bad" id="stop" style="margin-top:10px">⏹️ Terminar</button>
    <button class="btn sec" id="cancel" style="width:100%;margin-top:8px">Cancelar</button>`;
  let root, timers = [];
  if (publicOn) {
    const ov = $('#overlay'); ov.hidden = false;
    ov.innerHTML = `<div class="stage">${audience(S.speak.level)}</div><div class="stagebar">${panel}</div>`;
    root = ov;
    const distract = Math.min(0.05 + S.speak.level * 0.03, 0.35);
    timers.push(setInterval(() => {
      $$('.p', ov).forEach(p => { p.classList.remove('phone', 'look'); const r = Math.random(); if (r < distract) p.classList.add('phone'); else if (r < distract * 2) p.classList.add('look'); });
      if (S.speak.level >= 2 && Math.random() < 0.08 + S.speak.level * 0.02) cough();
    }, 3500));
  } else {
    el.innerHTML = `<h2>🎤 Hablando…</h2><div class="card">${panel}</div>`; root = el;
  }
  const stopUI = () => { timers.forEach(clearInterval); const ov = $('#overlay'); ov.hidden = true; ov.innerHTML = ''; };
  speakRec = new Rec({
    lang: 'es-PE',
    onLevel: (l, sec) => { updMeter(root, l, t.vol); const tm = $('#tm', root); if (tm) { tm.textContent = fmtT(sec); tm.style.color = sec >= t.secs ? 'var(--ok)' : ''; } },
    onText: txt => { const lv = $('#lv', root); if (lv) { lv.innerHTML = markFillers(txt) || '…'; lv.scrollTop = 1e6; } fillLive = countFillers(txt).total; const fc = $('#fc', root); if (fc) fc.textContent = fillLive; }
  });
  try { await speakRec.start(); }
  catch (e) { stopUI(); toast('No pude usar el micrófono. Dale permiso en el navegador.'); renderSpeakIdle(el); return; }
  cleanup = () => { speakRec && speakRec.cancel(); stopUI(); };
  $('#cancel', root).onclick = () => { speakRec.cancel(); speakRec = null; stopUI(); cleanup = null; renderSpeakIdle(el); };
  $('#stop', root).onclick = async () => {
    $('#stop', root).disabled = true;
    const res = await speakRec.stop(); speakRec = null; stopUI(); cleanup = null;
    finishSpeak(el, res);
  };
}

async function finishSpeak(el, res) {
  const t = curTarget, topic = curTopic;
  el.innerHTML = `<h2>📊 Resultado</h2><div class="card"><span class="spin"></span> Revisando tu práctica…</div>`;
  if (res.dur < 5) { toast('Muy corto. Inténtalo otra vez.'); renderSpeakIdle(el); return; }
  let text = null, measured = true;
  if (hasAI()) text = await transcribe(res.blob, 'es');
  if (!text) text = res.liveText;
  if (!text) measured = false;
  const f = countFillers(text, 'es'), mins = res.dur / 60;
  const fpm = +(f.total / Math.max(mins, 0.25)).toFixed(1);
  const wpm = Math.round(countWords(text) / Math.max(mins, 0.1));
  const ok = { dur: res.dur >= t.secs * 0.95, fill: !measured || fpm <= t.maxFpm, vol: res.avgVol >= t.vol };
  const passed = t.refuerzo ? ok[t.refuerzo] : (ok.dur && ok.fill && ok.vol);
  // Ajuste de nivel según tu avance
  let lvMsg = '';
  if (passed) {
    S.speak.fail = 0;
    if (t.refuerzo) { S.speak.refuerzo = null; lvMsg = '💪 ¡Superaste el refuerzo! Vuelves a los retos normales.'; }
    else { S.speak.pass++; if (S.speak.pass >= 2) { S.speak.level++; S.speak.pass = 0; lvMsg = `🎉 ¡Subiste al NIVEL ${S.speak.level}! Los retos ahora son más difíciles.`; } else lvMsg = '✅ ¡Reto superado! Uno más y subes de nivel.'; }
    if (publicOn) applause(2.5);
  } else {
    S.speak.pass = 0; S.speak.fail++;
    const weak = !ok.vol ? 'vol' : !ok.fill ? 'fill' : 'dur';
    if (S.speak.fail >= 3 && !t.refuerzo) { S.speak.refuerzo = weak; S.speak.fail = 0; lvMsg = '🔁 Te preparé un reto de refuerzo para lo que más te cuesta.'; }
    else lvMsg = 'Casi. Vuelve a intentarlo, cada práctica cuenta.';
  }
  const id = 'r' + Date.now();
  const rec = { id, type: 'hablar', date: new Date().toISOString(), tema: topic.tema, dur: res.dur, fillers: f.total, fpm, vol: res.avgVol, wpm, text, level: S.speak.level, passed, blob: res.blob };
  try { if (res.blob) await DB.put(rec); } catch (e) { }
  addSession({ type: 'hablar', dur: res.dur, fpm: measured ? fpm : null, vol: res.avgVol, wpm, level: S.speak.level, passed });
  curTopic = null;
  const fillList = Object.entries(f.by).map(([k, v]) => `"${k}" ×${v}`).join(', ');
  el.innerHTML = `
  <h2>📊 Resultado</h2>
  <div class="card ${passed ? 'hl' : ''}"><h3 class="${passed ? 'good' : 'warnc'}">${passed ? '¡Lo lograste!' : 'Todavía no'}</h3><p>${lvMsg}</p></div>
  <div class="card">
    <div class="chk"><span>⏱️ Tiempo</span><b class="${ok.dur ? 'good' : 'badc'}">${fmtT(res.dur)} / ${fmtT(t.secs)} ${ok.dur ? '✓' : '✗'}</b></div>
    <div class="chk"><span>🚫 Muletillas</span><b class="${ok.fill ? 'good' : 'badc'}">${measured ? `${f.total} (${fpm}/min) ${ok.fill ? '✓' : '✗'}` : 'no medido'}</b></div>
    <div class="chk"><span>🔊 Volumen</span><b class="${ok.vol ? 'good' : 'badc'}">${res.avgVol} / ${t.vol} ${ok.vol ? '✓' : '✗'}</b></div>
    <div class="chk"><span>🗣️ Velocidad</span><b>${measured ? wpm + ' palabras/min' : '—'}</b></div>
    ${fillList ? `<p class="mut small">Tus muletillas: ${fillList}</p>` : ''}
    ${measured && wpm > 170 ? '<p class="warnc small">Hablas rápido. Intenta ir más despacio y hacer pausas.</p>' : ''}
    ${measured && wpm && wpm < 90 ? '<p class="warnc small">Hablas lento o con muchas pausas largas. Usa la guía para tener ideas listas.</p>' : ''}
  </div>
  <div class="card" id="fb"><h3>🧑‍🏫 Consejos</h3>${hasAI() && measured ? '<span class="spin"></span> La IA está revisando…' : localTips(ok)}</div>
  ${measured ? `<div class="card"><details><summary>📝 Lo que dijiste</summary><p class="small">${markFillers(text)}</p></details></div>` : ''}
  <div class="card"><h3>🎧 Escúchate</h3><audio controls style="width:100%" id="au"></audio></div>
  <div class="row"><button class="btn big ok" id="next">➡️ Siguiente reto</button></div>`;
  if (res.blob) $('#au', el).src = URL.createObjectURL(res.blob);
  $('#next', el).onclick = () => VIEW_hablar(el);
  if (hasAI() && measured) {
    try {
      const j = await aiJSON('Eres un coach de oratoria peruano, amable, directo y concreto. Hablas en español sencillo.', `Analiza esta práctica de hablar en público de Pedro.
Tema: "${topic.tema}"
Transcripción: "${text}"
Métricas: duración ${Math.round(res.dur)} s (meta ${t.secs}), muletillas ${f.total} (${fpm}/min, meta máx ${t.maxFpm}), volumen ${res.avgVol}/100 (meta ${t.vol}), ${wpm} palabras por minuto.
Revisa también si sus ideas fueron claras y ordenadas.
Responde JSON: {"puntaje":0-100,"bien":["2 cosas que hizo bien"],"mejorar":["2 cosas concretas a mejorar"],"mejor_frase":"una frase suya reescrita para que suene más clara y segura","consejo":"un ejercicio corto para la próxima"}`);
      if (j) $('#fb', el).innerHTML = `<h3>🧑‍🏫 Consejos ${j.puntaje != null ? `<span class="lvl">${j.puntaje}/100</span>` : ''}</h3>
        <p class="good"><b>Bien:</b></p><ul class="clean">${(j.bien || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <p class="warnc"><b>Mejorar:</b></p><ul class="clean">${(j.mejorar || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${j.mejor_frase ? `<p><b>✨ Dilo así:</b> ${esc(j.mejor_frase)}</p>` : ''}
        ${j.consejo ? `<p><b>🏋️ Ejercicio:</b> ${esc(j.consejo)}</p>` : ''}`;
      else $('#fb', el).innerHTML = '<h3>🧑‍🏫 Consejos</h3>' + localTips(ok);
    } catch (e) { $('#fb', el).innerHTML = '<h3>🧑‍🏫 Consejos</h3>' + localTips(ok); }
  }
}
function localTips(ok) {
  const tips = [];
  if (!ok.vol) tips.push('Habla desde el estómago: respira hondo y saca el aire al hablar. Imagina que le hablas a alguien al fondo del salón.');
  if (!ok.fill) tips.push('Cuando sientas que vas a decir "eh" o "este", cállate un segundo. Una pausa se ve más seguro que una muletilla.');
  if (!ok.dur) tips.push('Usa la guía: si te quedas sin ideas, pasa al siguiente punto o da un ejemplo de tu vida.');
  if (!tips.length) tips.push('¡Muy bien! Para la próxima mira al frente (o al público) y usa las manos para acompañar lo que dices.');
  return `<ul class="clean">${tips.map(x => `<li>${x}</li>`).join('')}</ul>`;
}
