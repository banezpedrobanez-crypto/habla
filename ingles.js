'use strict';
/* ===== INGLÉS: tutor por voz o texto, se adapta a tu nivel ===== */
const CEFR = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+'];
const cefr = () => CEFR[Math.min(S.english.level, 10) - 1];
const ESCENAS = { libre: '💬 Conversación libre', almacen: '📦 Trabajo en almacén', entrevista: '👔 Entrevista de trabajo', viaje: '✈️ Viaje / aeropuerto', tienda: '🛒 Comprar / restaurante', moto: '🏍️ Motos y hobbies', tech: '💻 Programación y tecnología' };
const FRASES = [
  [1, 'Hola, me llamo Pedro.', 'Hello, my name is Pedro.'], [1, 'Vivo en Lima.', 'I live in Lima.'], [1, 'Me gusta mi moto.', 'I like my motorcycle.'], [1, '¿Cómo estás?', 'How are you?'], [1, 'Trabajo en un almacén.', 'I work in a warehouse.'],
  [2, 'Estudio administración industrial.', 'I study industrial management.'], [2, '¿Dónde está el baño?', 'Where is the bathroom?'], [2, 'Necesito ayuda, por favor.', 'I need help, please.'], [2, 'Ayer trabajé hasta tarde.', 'Yesterday I worked until late.'], [2, 'Tengo veinte años.', 'I am twenty years old.'],
  [3, 'Controlo la entrada y salida de productos.', 'I control the input and output of products.'], [3, '¿Me puede repetir, por favor?', 'Can you repeat that, please?'], [3, 'Estoy aprendiendo inglés.', 'I am learning English.'], [3, 'El pedido llega mañana.', 'The order arrives tomorrow.'], [3, 'No entendí la pregunta.', 'I did not understand the question.'],
  [4, 'Me gustaría trabajar en logística.', 'I would like to work in logistics.'], [4, 'He trabajado con inventarios.', 'I have worked with inventories.'], [4, 'Si tuviera tiempo, viajaría más.', 'If I had time, I would travel more.'], [4, 'Debemos revisar el stock antes de despachar.', 'We must check the stock before shipping.'], [4, 'Llevo dos meses en esta empresa.', 'I have been at this company for two months.'],
  [5, 'Hubiera llegado temprano si no hubiera tráfico.', 'I would have arrived early if there had not been traffic.'], [5, 'El producto que pediste ya fue enviado.', 'The product you ordered has already been shipped.'], [5, 'Me considero una persona responsable y organizada.', 'I consider myself a responsible and organized person.']
];

let enMode = 'chat', enScene = 'libre', chatHist = [];
function VIEW_ingles(el) {
  const l = S.english.level, prog = S.english.msgs ? Math.round((1 - S.english.errs / S.english.msgs) * 100) : 0;
  el.innerHTML = `
  <h2>🇺🇸 Inglés</h2>
  <div class="card"><div class="row"><span class="lvl">Nivel ${cefr()}</span><span class="mut small grow">Tu nivel sube cuando cometes pocos errores</span></div>
  <div class="prog"><i style="width:${Math.min(100, S.english.msgs / 8 * 100)}%"></i></div><div class="mut small">${S.english.msgs}/8 mensajes para la próxima evaluación · aciertos: ${prog}%</div></div>
  <div class="chips">
    <button class="chip ${enMode === 'chat' ? 'on' : ''}" data-m="chat">🧑‍🏫 Tutor</button>
    <button class="chip ${enMode === 'frases' ? 'on' : ''}" data-m="frases">🔁 Frases</button>
    <button class="chip ${enMode === 'vocab' ? 'on' : ''}" data-m="vocab">📒 Mis palabras (${S.english.vocab.length})</button>
  </div><div id="enbox"></div>`;
  $$('.chip[data-m]', el).forEach(b => b.onclick = () => { enMode = b.dataset.m; VIEW_ingles(el); });
  const box = $('#enbox', el);
  if (enMode === 'chat') { if (!hasAI()) { box.innerHTML = `<div class="card"><p>El tutor necesita una clave de IA (Gemini o Groq, son gratis).</p><button class="btn" onclick="go('ajustes')">⚙️ Ir a Ajustes</button><p class="mut small" style="margin-top:10px">Mientras tanto puedes practicar en <b>🔁 Frases</b>, que funciona solo con el navegador.</p></div>`; return; } enChat(box); }
  else if (enMode === 'frases') enFrases(box);
  else enVocab(box);
}

function tutorSystem() {
  const l = S.english.level;
  return `You are "Coach", a friendly and patient English tutor for Pedro, a 20-year-old Spanish speaker from Lima, Peru (studies Industrial Management, works in a warehouse, likes motorcycles and programming).
His current level: ${cefr()}. Scenario: ${ESCENAS[enScene]}.
Rules:
- Reply in English adapted to his level. A1-A2: very short, simple sentences, common words. B1: normal everyday English. B2+: natural English, some idioms and phrasal verbs.
- Keep each reply to 1-3 sentences and ALWAYS end with a question so the conversation continues.
- In "Trabajo en almacén" and "Entrevista" scenarios, play the role (boss, coworker, interviewer).
- Check Pedro's LAST message for grammar, vocabulary or word-order errors. Ignore missing punctuation and capital letters (he may be speaking through a microphone).
- If he writes in Spanish, help him say it in English.
Return ONLY JSON:
{"reply":"your English reply","reply_es":"traducción al español de tu respuesta","error":true or false,"correction":"his sentence corrected in English (empty if no error)","explanation_es":"explicación MUY corta y sencilla en español de su error (vacío si no hay)","new_word":{"en":"one useful word or phrase from your reply","es":"significado"}}`;
}

function enChat(box) {
  box.innerHTML = `
  <select id="sc">${Object.entries(ESCENAS).map(([k, v]) => `<option value="${k}" ${k === enScene ? 'selected' : ''}>${v}</option>`).join('')}</select>
  <div class="chat" id="chat" style="margin-top:12px"></div>
  <div class="inbar"><input id="tx" placeholder="Write in English…" autocomplete="off"><button class="mic" id="mc">🎤</button><button class="btn" id="sd">➤</button></div>
  <div class="row"><button class="btn sec grow" id="nw">🔄 Nueva conversación</button><label class="row small" style="margin:0"><input type="checkbox" id="auto" style="width:auto" ${S.settings.autoSpeak !== false ? 'checked' : ''}> Leer en voz alta</label></div>`;
  const chat = $('#chat', box), tx = $('#tx', box);
  const render = () => {
    chat.innerHTML = chatHist.map((m, i) => m.role === 'user'
      ? `<div class="msg me">${esc(m.text)}</div>${m.fix ? (m.fix.error ? `<div class="fix">✏️ <b>${esc(m.fix.correction)}</b><br><span class="small">${esc(m.fix.explanation_es)}</span></div>` : `<div class="fix okk small">✅ ¡Perfecto!</div>`) : ''}`
      : `<div class="msg ai">${esc(m.text)}${m.es ? `<div class="tr" hidden>${esc(m.es)}</div>` : ''}<div class="mini"><button data-say="${i}">🔊</button>${m.es ? `<button data-tr="${i}">🇪🇸 Traducir</button>` : ''}${m.word ? `<span class="small mut">📒 ${esc(m.word.en)} = ${esc(m.word.es)}</span>` : ''}</div></div>`).join('');
    $$('[data-say]', chat).forEach(b => b.onclick = () => say(chatHist[+b.dataset.say].text));
    $$('[data-tr]', chat).forEach(b => b.onclick = () => { const t = b.closest('.msg').querySelector('.tr'); t.hidden = !t.hidden; });
    window.scrollTo(0, document.body.scrollHeight);
  };
  const send = async (text) => {
    text = (text || '').trim(); if (!text) return;
    tx.value = '';
    const um = { role: 'user', text }; chatHist.push(um); render();
    chat.insertAdjacentHTML('beforeend', '<div class="msg ai" id="typing"><span class="spin"></span></div>');
    try {
      const msgs = chatHist.slice(-14).map(m => ({ role: m.role, text: m.text }));
      const j = await aiJSON(tutorSystem(), msgs);
      if (!j || !j.reply) throw new Error('respuesta vacía');
      um.fix = { error: !!j.error && !!j.correction, correction: j.correction, explanation_es: j.explanation_es };
      chatHist.push({ role: 'assistant', text: j.reply, es: j.reply_es, word: j.new_word && j.new_word.en ? j.new_word : null });
      if (j.new_word && j.new_word.en && !S.english.vocab.some(v => v.en.toLowerCase() === j.new_word.en.toLowerCase())) S.english.vocab.push({ en: j.new_word.en, es: j.new_word.es, d: today() });
      S.english.msgs++; if (um.fix.error) S.english.errs++;
      addSession({ type: 'ingles', dur: 30, err: um.fix.error ? 1 : 0, level: S.english.level });
      evalEnglish();
      render();
      if ($('#auto', box).checked) say(j.reply);
    } catch (e) { $('#typing')?.remove(); toast('No respondió la IA: ' + e.message.slice(0, 80), 4000); chatHist.pop(); render(); }
  };
  $('#sd', box).onclick = () => send(tx.value);
  tx.onkeydown = e => { if (e.key === 'Enter') send(tx.value); };
  $('#sc', box).onchange = e => { enScene = e.target.value; chatHist = []; start(); };
  $('#nw', box).onclick = () => { chatHist = []; start(); };
  $('#auto', box).onchange = e => { S.settings.autoSpeak = e.target.checked; save(); };
  let rec = null; const mc = $('#mc', box);
  mc.onclick = async () => {
    if (!rec) {
      rec = new Rec({ lang: 'en-US', onText: t => tx.value = t, onLevel: () => { } });
      try { speechSynthesis.cancel(); await rec.start(); mc.classList.add('rec'); mc.textContent = '⏹️'; tx.placeholder = 'Listening… speak in English'; } catch (e) { rec = null; toast('No pude usar el micrófono'); }
    } else {
      mc.disabled = true; tx.placeholder = 'Procesando…';
      const r = await rec.stop(); rec = null; mc.classList.remove('rec'); mc.textContent = '🎤';
      let t = null; if (hasAI()) t = await transcribe(r.blob, 'en');
      mc.disabled = false; tx.placeholder = 'Write in English…';
      send(t || r.liveText || tx.value);
    }
  };
  cleanup = () => rec && rec.cancel();
  const start = async () => {
    render();
    if (chatHist.length) return;
    chat.innerHTML = '<div class="msg ai"><span class="spin"></span></div>';
    try {
      const j = await aiJSON(tutorSystem(), [{ role: 'user', text: '(Start the conversation: greet Pedro and ask him a first question for this scenario. error=false.)' }]);
      chatHist.push({ role: 'assistant', text: j.reply, es: j.reply_es, word: j.new_word && j.new_word.en ? j.new_word : null });
      render(); if ($('#auto', box).checked) say(j.reply);
    } catch (e) { chat.innerHTML = `<div class="card">No pude conectar con la IA. Revisa tu clave en Ajustes.<br><span class="small mut">${esc(e.message.slice(0, 140))}</span></div>`; }
  };
  start();
}

function evalEnglish() {
  if (S.english.msgs < 8) { save(); return; }
  const rate = S.english.errs / S.english.msgs;
  if (rate <= 0.25 && S.english.level < 10) { S.english.level++; toast(`🎉 ¡Subiste a ${cefr()} en inglés! El tutor hablará un poco más difícil.`, 4500); }
  else if (rate >= 0.7 && S.english.level > 1) { S.english.level--; toast(`Bajamos a ${cefr()} un momento para reforzar. ¡Tú puedes!`, 4500); }
  S.english.msgs = 0; S.english.errs = 0; save();
}

/* --- Frases: funciona sin IA (navegador) --- */
function similarity(a, b) {
  const n = s => s.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  const A = n(a), B = n(b); if (!B.length) return 0;
  let hit = 0; const used = new Set();
  B.forEach(w => { const i = A.findIndex((x, k) => x === w && !used.has(k)); if (i >= 0) { hit++; used.add(i); } });
  return hit / Math.max(B.length, A.length);
}
async function enFrases(box) {
  const lv = Math.min(5, Math.ceil(S.english.level / 2));
  let q = null;
  if (hasAI()) { try { const j = await aiJSON('', `Give one Spanish sentence (Peruvian everyday or work/warehouse context) for a learner at CEFR ${cefr()} to translate into English. JSON {"es":"...","en":"the most natural English translation"}`); if (j && j.es && j.en) q = [lv, j.es, j.en]; } catch (e) { } }
  if (!q) { const pool = FRASES.filter(f => f[0] <= lv && f[0] >= lv - 1); q = pick(pool.length ? pool : FRASES); }
  const [, es, en] = q;
  box.innerHTML = `<div class="card hl"><p class="mut small">Dilo en inglés:</p><h3 style="font-size:20px">${esc(es)}</h3></div>
  <div class="card"><div id="vb"></div></div>
  <div class="row"><button class="btn grow" id="ck">✅ Revisar</button><button class="btn sec" id="hint">💡 Pista</button></div><div id="res" style="margin-top:12px"></div>`;
  const vb = voiceBox($('#vb', box), { lang: 'en', rows: 2, placeholder: 'Escribe o toca 🎤 y habla en inglés' });
  cleanup = () => vb.box._cancel && vb.box._cancel();
  $('#hint', box).onclick = () => toast('Empieza así: ' + en.split(' ').slice(0, 2).join(' ') + '…');
  $('#ck', box).onclick = () => {
    const said = vb.get(); if (!said) { toast('Di o escribe la frase'); return; }
    const s = similarity(said, en), good = s >= 0.8;
    if (good) { S.english.phraseOk++; if (S.english.phraseOk >= 10) { S.english.phraseOk = 0; if (S.english.level < 10) { S.english.level++; toast(`🎉 ¡Subiste a ${cefr()}!`, 4000); } } }
    S.english.msgs++; if (!good) S.english.errs++; evalEnglish();
    addSession({ type: 'ingles', dur: 30, err: good ? 0 : 1, level: S.english.level });
    $('#res', box).innerHTML = `<div class="card"><h3 class="${good ? 'good' : 'warnc'}">${good ? '✅ ¡Muy bien!' : '🟡 Casi'} (${Math.round(s * 100)}%)</h3><p>Forma correcta: <b>${esc(en)}</b></p><button class="btn sec" id="hr">🔊 Escuchar</button></div><button class="btn big ok" id="nx">➡️ Siguiente</button>`;
    say(en);
    $('#hr', box).onclick = () => say(en);
    $('#nx', box).onclick = () => enFrases(box);
  };
}

function enVocab(box) {
  const v = [...S.english.vocab].reverse();
  box.innerHTML = v.length ? `<div class="card">${v.map((w, i) => `<div class="chk"><span><b>${esc(w.en)}</b><br><span class="mut small">${esc(w.es)}</span></span><span><button class="btn sec" data-s="${esc(w.en)}">🔊</button></span></div>`).join('')}</div>
  <button class="btn sec" id="qz" style="width:100%">🧠 Repasar con tarjetas</button>` : `<div class="card"><p>Aquí se guardan las palabras nuevas que te enseña el tutor.</p></div>`;
  $$('[data-s]', box).forEach(b => b.onclick = () => say(b.dataset.s));
  const qz = $('#qz', box); if (qz) qz.onclick = () => {
    const w = pick(S.english.vocab);
    box.innerHTML = `<div class="card hl" style="text-align:center"><p class="mut">¿Qué significa?</p><h2>${esc(w.en)}</h2><button class="btn" id="sh">Ver respuesta</button><p id="an" hidden style="font-size:20px;margin-top:12px">${esc(w.es)}</p></div><button class="btn big sec" id="nx">➡️ Otra</button><button class="btn sec" id="bk" style="width:100%;margin-top:8px">⬅️ Volver a la lista</button>`;
    say(w.en);
    $('#sh', box).onclick = () => $('#an', box).hidden = false;
    $('#nx', box).onclick = () => qz.onclick();
    $('#bk', box).onclick = () => enVocab(box);
  };
}
