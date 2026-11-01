'use strict';
/* ===== EXPRESARME: decir las cosas claras y ordenadas ===== */

/* Caja de texto con micrófono (dictado). lang: 'es' | 'en' */
function voiceBox(container, { lang = 'es', placeholder = 'Escribe o toca 🎤 para hablar…', rows = 4 } = {}) {
  container.innerHTML = `<textarea rows="${rows}" placeholder="${placeholder}"></textarea>
  <div class="row" style="margin-top:6px"><button class="mic" type="button">🎤</button><span class="mut small grow vbst">Toca 🎤, habla y vuelve a tocar para terminar</span></div>`;
  const ta = $('textarea', container), mic = $('.mic', container), st = $('.vbst', container);
  let rec = null, base = '';
  mic.onclick = async () => {
    if (!rec) {
      base = ta.value ? ta.value.trim() + ' ' : '';
      rec = new Rec({ lang: lang === 'es' ? 'es-PE' : 'en-US', onText: t => ta.value = base + t, onLevel: () => { } });
      try { await rec.start(); mic.classList.add('rec'); mic.textContent = '⏹️'; st.textContent = 'Escuchando…'; }
      catch (e) { rec = null; toast('No pude usar el micrófono'); }
    } else {
      mic.disabled = true; st.innerHTML = '<span class="spin"></span> Pasando a texto…';
      const r = await rec.stop(); rec = null; mic.classList.remove('rec'); mic.textContent = '🎤';
      let t = null; if (hasAI()) t = await transcribe(r.blob, lang);
      ta.value = base + (t || r.liveText || '');
      mic.disabled = false; st.textContent = r.avgVol ? `Volumen: ${r.avgVol}` : 'Listo';
      container._last = r;
    }
  };
  container._cancel = () => rec && rec.cancel();
  return { get: () => ta.value.trim(), set: v => ta.value = v, ta, box: container };
}

const SITUACIONES = [
  // [nivel, situación, ejemplo de buena respuesta]
  [1, 'Pide permiso a tu jefe para salir 1 hora antes el viernes.', 'Buenos días, señor. Quería pedirle permiso para salir una hora antes este viernes, porque tengo un trámite en SENATI. Dejo todo avanzado y mañana llego temprano para cubrir esa hora. ¿Le parece bien?'],
  [1, 'Explícale a un compañero dónde está un producto en el almacén.', 'Está en el segundo estante de la izquierda, en la parte de arriba. Es la caja azul que dice "válvulas". Si no la ves, avísame y voy contigo.'],
  [1, 'Preséntate en 3 frases a alguien nuevo en el trabajo.', 'Hola, soy Pedro, el encargado del almacén. Estudio Administración Industrial en SENATI. Cualquier cosa que necesites del almacén, me avisas y te ayudo.'],
  [2, 'Avisa a tu jefe que un cliente reclamó porque su pedido llegó incompleto.', 'Señor, le aviso que el cliente llamó porque su pedido llegó incompleto: faltaron 2 extintores. Ya revisé y el error fue en el despacho. Propongo enviarlos hoy en la tarde. ¿Le parece?'],
  [2, 'Dile a un amigo que no puedes ir a su reunión, sin quedar mal.', 'Oye, gracias por invitarme, de verdad. Esta vez no voy a poder porque tengo clases hasta tarde. ¿Qué tal si nos vemos el domingo y me cuentas cómo estuvo?'],
  [2, 'Explica por qué llegaste tarde, sin poner muchas excusas.', 'Disculpe la demora. Hubo un choque en la avenida y el tráfico estuvo parado. Ya estoy aquí y recupero el tiempo al final del día.'],
  [3, 'Propón a tu jefe una mejora para el almacén.', 'Señor, tengo una propuesta. Hoy perdemos tiempo buscando productos porque no están rotulados. Si ponemos etiquetas con códigos en cada estante, encontraríamos todo en segundos. Puedo hacerlo yo el sábado. ¿Me da su visto bueno?'],
  [3, 'Responde a un cliente que pregunta por qué subió el precio.', 'Entiendo su pregunta. El precio subió porque el insumo para recargar los extintores aumentó este mes. Igual mantenemos la garantía y la entrega a domicilio. Si gusta, le preparo una cotización detallada.'],
  [3, 'Explica a alguien que no sabe nada qué haces en tus prácticas.', 'Trabajo en una empresa que vende y recarga extintores. Yo me encargo del almacén: controlo lo que entra y sale, llevo el inventario y a veces salgo a entregar o revisar extintores donde los clientes.'],
  [4, 'Di "no" a un trabajo extra que te piden, con respeto.', 'Gracias por pensar en mí. Hoy no puedo tomarlo porque tengo que terminar el inventario que vence mañana. Si quiere, lo veo a primera hora del lunes.'],
  [4, 'Defiende tu idea en una reunión cuando alguien no está de acuerdo.', 'Entiendo tu punto. Igual creo que conviene probarlo, porque el mes pasado perdimos dos ventas por no tener stock. Hagamos una prueba de dos semanas y vemos los números.'],
  [5, 'Da una mala noticia a tu jefe: se rompieron 3 productos.', 'Señor, le tengo que avisar algo. Se rompieron 3 manómetros al mover una caja. Fue un descuido y ya separé lo dañado. Para que no vuelva a pasar, propongo poner esas cajas en el estante bajo.']
];
const PREP_TEMAS = ['¿Por qué es importante el orden en un almacén?', '¿Conviene estudiar inglés aunque trabajes en Perú?', '¿Por qué deberían contratarte?', '¿Es mejor ir en moto o en carro en Lima?', '¿La tecnología ayuda o complica el trabajo?', '¿Qué es más importante: experiencia o estudios?'];
const PALABRAS = [
  ['Esa cosa del almacén se malogró.', ['El montacargas del almacén se malogró.', 'Eso de allá se malogró.', 'La cosa esa ya no funciona.'], 0, 'Di el nombre exacto de la cosa. "Cosa" no dice nada.'],
  ['O sea, es que, bueno, no sé, el pedido no llegó.', ['O sea, el pedido, bueno, no llegó.', 'El pedido no llegó.', 'Es que no sé, el pedido.'], 1, 'Ve directo al punto. Sin rodeos se entiende mejor.'],
  ['Hay hartos productos que están mal.', ['Hay muchos productos mal.', 'Hay 12 productos vencidos en el estante 3.', 'Hay varios productos raros.'], 1, 'Da números y detalles: así te creen más.'],
  ['Hice varias cosas hoy.', ['Hice cosas importantes hoy.', 'Hoy hice muchas cosas.', 'Hoy ordené 2 estantes y registré 40 entradas.'], 2, 'Cuenta qué hiciste exactamente.'],
  ['Me parece que tal vez de repente podríamos cambiar el horario.', ['Propongo cambiar el horario a las 8.', 'De repente se podría cambiar.', 'No sé, tal vez cambiar el horario.'], 0, 'Muchos "tal vez" suenan inseguros. Di tu propuesta con seguridad.'],
  ['El cliente está como que medio molesto.', ['El cliente está como molesto.', 'El cliente está molesto porque esperó 2 horas.', 'El cliente está medio raro.'], 1, 'Di cómo está y POR QUÉ.'],
  ['Arreglé el tema ese.', ['Arreglé el tema.', 'Ya está arreglado eso.', 'Corregí el error del inventario de válvulas.'], 2, '"El tema ese" no dice qué fue. Nómbralo.'],
  ['No es que no quiera, sino que no puedo, ¿me entiendes?', ['No puedo porque tengo clases.', 'No es que no quiera, ¿ya?', 'Es que no puedo, ¿sabes?'], 0, 'Di la razón real en pocas palabras.'],
  ['Eso está bien bonito.', ['Eso está bonito.', 'El diseño es claro y fácil de usar.', 'Está bien chévere.'], 1, 'Explica qué tiene de bueno.'],
  ['Hay que ver lo de la reunión.', ['Hay que ver la reunión.', 'Lo de la reunión, hay que verlo.', 'Hay que confirmar la hora de la reunión del lunes.'], 2, 'Di qué acción concreta hay que hacer.']
];

let exMode = 'dilo';
function VIEW_expresar(el) {
  const l = S.express.level;
  el.innerHTML = `
  <h2>💬 Expresarme mejor</h2>
  <div class="card"><div class="row"><span class="lvl">Nivel ${l}</span><span class="mut small">Supera ${3 - S.express.pass} práctica(s) bien para subir</span></div>
  <div class="prog"><i style="width:${S.express.pass / 3 * 100}%"></i></div></div>
  <div class="chips">
    <button class="chip ${exMode === 'dilo' ? 'on' : ''}" data-m="dilo">🗣️ Dilo mejor</button>
    <button class="chip ${exMode === 'prep' ? 'on' : ''}" data-m="prep">🧩 Ordena tus ideas</button>
    <button class="chip ${exMode === 'palabra' ? 'on' : ''}" data-m="palabra">🎯 Palabra exacta</button>
  </div>
  <div id="exbox"></div>`;
  $$('.chip[data-m]', el).forEach(b => b.onclick = () => { exMode = b.dataset.m; VIEW_expresar(el); });
  const box = $('#exbox', el);
  ({ dilo: exDilo, prep: exPrep, palabra: exPalabra })[exMode](box);
}
function exScore(score) {
  if (score >= 75) { S.express.pass++; if (S.express.pass >= 3) { S.express.level++; S.express.pass = 0; save(); return `🎉 ¡Subiste al nivel ${S.express.level} en Expresarme!`; } }
  save(); return '';
}

/* --- 1. Dilo mejor --- */
async function exDilo(box) {
  const l = S.express.level;
  let sit = null;
  box.innerHTML = `<div class="card"><span class="spin"></span> Preparando una situación…</div>`;
  const pool = SITUACIONES.filter(s => s[0] <= Math.min(l, 5) && s[0] >= Math.min(l, 5) - 2);
  const loc = pick(pool.length ? pool : SITUACIONES);
  sit = { texto: loc[1], ejemplo: loc[2] };
  if (hasAI()) {
    try {
      const j = await aiJSON('Eres un coach de comunicación peruano.', `Crea UNA situación de la vida real (trabajo en almacén/empresa de extintores, estudios en SENATI, amigos, familia o clientes) para que Pedro practique expresarse con claridad. Nivel ${l} de 10 (más alto = situación más delicada o difícil: dar malas noticias, negociar, reclamar, defender una idea). Evita: ${S.express.recent.slice(-6).join(' | ') || 'nada'}. JSON: {"situacion":"qué tiene que decir y a quién, en una frase","ejemplo":"una respuesta modelo clara, natural, peruana, de 2 a 4 frases"}`);
      if (j && j.situacion) sit = { texto: j.situacion, ejemplo: j.ejemplo || '' };
    } catch (e) { }
  }
  S.express.recent.push(sit.texto); S.express.recent = S.express.recent.slice(-15); save();
  box.innerHTML = `
  <div class="card hl"><p class="mut small">Situación</p><h3 style="font-size:19px">${esc(sit.texto)}</h3>
  <p class="mut small">Dilo como lo dirías de verdad. Luego te muestro cómo decirlo más claro.</p></div>
  <div class="card"><div id="vb"></div></div>
  <button class="btn big" id="check">✨ Revisar cómo lo dije</button>
  <button class="btn sec" id="skip" style="width:100%;margin-top:8px">🔄 Otra situación</button>
  <div id="out" style="margin-top:14px"></div>`;
  const vb = voiceBox($('#vb', box), { placeholder: 'Escribe o toca 🎤 y dilo con tus palabras…' });
  cleanup = () => vb.box._cancel && vb.box._cancel();
  $('#skip', box).onclick = () => exDilo(box);
  $('#check', box).onclick = async () => {
    const said = vb.get(); if (!said) { toast('Primero di o escribe tu respuesta'); return; }
    const out = $('#out', box); out.innerHTML = `<div class="card"><span class="spin"></span> Revisando…</div>`;
    let html = '', score = 0;
    if (hasAI()) {
      try {
        const j = await aiJSON('Eres un coach de comunicación peruano, amable y directo. Español sencillo.', `Situación: "${sit.texto}". Pedro dijo: "${said}".
Evalúa si se entiende, si va al punto, si está ordenado y si suena seguro y respetuoso. Nivel de exigencia ${l}/10.
JSON: {"claridad":0-100,"bien":"qué hizo bien (1 frase)","mejorar":["2 o 3 cosas concretas"],"version_mejor":"cómo decirlo mejor, con SUS ideas, natural y peruano, 2-4 frases","estructura":"la estructura que usa la versión mejor, ej: saludo → problema → solución → pregunta"}`);
        if (j) {
          score = +j.claridad || 0;
          html = `<div class="card"><h3>Claridad: <span class="${score >= 75 ? 'good' : score >= 50 ? 'warnc' : 'badc'}">${score}/100</span></h3>
          ${j.bien ? `<p class="good">👍 ${esc(j.bien)}</p>` : ''}
          <ul class="clean">${(j.mejorar || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="card hl"><h3>✨ Dilo así</h3><p style="font-size:17px">${esc(j.version_mejor)}</p>
          ${j.estructura ? `<p class="mut small">📐 Estructura: ${esc(j.estructura)}</p>` : ''}
          <button class="btn sec" id="hear">🔊 Escuchar</button></div>`;
          var better = j.version_mejor;
        }
      } catch (e) { }
    }
    if (!html) {
      const f = countFillers(said).total, w = countWords(said);
      score = Math.max(30, 90 - f * 10 - (w > 80 ? 15 : 0) - (w < 8 ? 25 : 0));
      better = sit.ejemplo;
      html = `<div class="card"><h3>Revisión rápida</h3><ul class="clean">
        ${f ? `<li>Usaste ${f} muletilla(s). Quítalas.</li>` : '<li class="good">Sin muletillas 👍</li>'}
        ${w > 80 ? '<li>Muy largo. Ve más al punto.</li>' : ''}${w < 8 ? '<li>Muy corto. Explica un poco más.</li>' : ''}
        <li>Revisa: ¿dijiste QUÉ pasa, POR QUÉ y QUÉ propones?</li></ul></div>
        ${better ? `<div class="card hl"><h3>✨ Un ejemplo claro</h3><p style="font-size:17px">${esc(better)}</p><button class="btn sec" id="hear">🔊 Escuchar</button></div>` : ''}`;
    }
    const msg = exScore(score);
    addSession({ type: 'expresar', dur: 60, score });
    out.innerHTML = html + (msg ? `<div class="card hl"><b>${msg}</b></div>` : '') + `<p class="mut small">🔁 Ahora repítelo en voz alta con la versión mejorada, sin leer. Así se te queda.</p><button class="btn big ok" id="again">➡️ Siguiente situación</button>`;
    const hb = $('#hear', out); if (hb) hb.onclick = () => say(better, 'es-US');
    $('#again', out).onclick = () => exDilo(box);
  };
}

/* --- 2. Ordena tus ideas (método PREP) --- */
async function exPrep(box) {
  let tema = pick(PREP_TEMAS);
  if (hasAI()) { try { const j = await aiJSON('', `Da UNA pregunta de opinión sencilla para que un joven peruano de 20 años practique dar su punto de vista (nivel ${S.express.level}/10). JSON {"tema":"..."}`); if (j && j.tema) tema = j.tema; } catch (e) { } }
  const pasos = [['P', 'Punto', 'Di tu idea principal en UNA frase.', 'Ej: "Creo que el orden en el almacén es clave."'], ['R', 'Razón', '¿Por qué piensas eso?', 'Ej: "Porque ahorra tiempo y evita pérdidas."'], ['E', 'Ejemplo', 'Da un ejemplo real o de tu vida.', 'Ej: "En mis prácticas, cuando rotulamos los estantes…"'], ['P', 'Punto final', 'Repite tu idea con otras palabras para cerrar.', 'Ej: "Por eso, un almacén ordenado trabaja mejor."']];
  const vals = ['', '', '', '']; let i = 0;
  const draw = () => {
    if (i < 4) {
      const [L, n, q, ej] = pasos[i];
      box.innerHTML = `<div class="card hl"><p class="mut small">Tema</p><h3>${esc(tema)}</h3>
        <p class="mut small">Método PREP: Punto → Razón → Ejemplo → Punto. Sirve para responder cualquier pregunta sin enredarte.</p></div>
        <div class="card"><div class="row"><span class="lvl">${i + 1}/4 · ${L}</span><b>${n}</b></div><p>${q}</p><p class="mut small">${ej}</p><div id="vb"></div></div>
        <div class="row"><button class="btn sec grow" id="back" ${i ? '' : 'disabled'}>⬅️ Atrás</button><button class="btn grow" id="nx">${i < 3 ? 'Siguiente ➡️' : 'Terminar ✅'}</button></div>`;
      const vb = voiceBox($('#vb', box), { rows: 3 }); vb.set(vals[i]);
      cleanup = () => vb.box._cancel && vb.box._cancel();
      $('#back', box).onclick = () => { vals[i] = vb.get(); i--; draw(); };
      $('#nx', box).onclick = () => { const v = vb.get(); if (!v) { toast('Escribe o di algo'); return; } vals[i] = v; i++; draw(); };
    } else finish();
  };
  const finish = async () => {
    const full = vals.join(' ');
    box.innerHTML = `<div class="card"><h3>Tu respuesta completa</h3><p>${esc(full)}</p></div><div id="fb" class="card"><span class="spin"></span> Revisando…</div>`;
    let score = 70, html = '';
    if (hasAI()) {
      try {
        const j = await aiJSON('Eres un coach de comunicación peruano. Español sencillo.', `Pregunta: "${tema}". Pedro respondió con método PREP: Punto: "${vals[0]}" Razón: "${vals[1]}" Ejemplo: "${vals[2]}" Cierre: "${vals[3]}". JSON {"claridad":0-100,"comentario":"2 frases de feedback concreto","version_mejor":"su misma respuesta pulida, natural, 4-5 frases"}`);
        if (j) { score = +j.claridad || 70; html = `<h3>Claridad: ${score}/100</h3><p>${esc(j.comentario)}</p><div class="card hl" style="margin-top:10px"><b>✨ Versión pulida</b><p>${esc(j.version_mejor)}</p></div>`; }
      } catch (e) { }
    }
    if (!html) html = `<h3>¡Bien!</h3><p>Ya tienes una respuesta ordenada. Ahora léela en voz alta 2 veces y luego dila sin mirar.</p>`;
    const msg = exScore(score); addSession({ type: 'expresar', dur: 120, score });
    $('#fb', box).innerHTML = html + (msg ? `<p><b>${msg}</b></p>` : '') + `<p class="mut small">🎤 Reto: dila completa en voz alta sin leer.</p><button class="btn big ok" id="again" style="margin-top:8px">➡️ Otro tema</button>`;
    $('#again', box).onclick = () => exPrep(box);
  };
  draw();
}

/* --- 3. Palabra exacta --- */
async function exPalabra(box) {
  let q = null;
  if (hasAI() && Math.random() < 0.6) {
    try {
      const j = await aiJSON('', `Crea un ejercicio para que un joven peruano aprenda a expresarse con precisión (nivel ${S.express.level}/10). Da una frase vaga o enredada típica del habla diaria (trabajo de almacén, estudios, amigos) y 3 opciones para decirla mejor, donde solo una es clara, concreta y natural. JSON {"frase":"...","opciones":["a","b","c"],"correcta":0-2,"por_que":"explicación corta"}`);
      if (j && j.frase && Array.isArray(j.opciones) && j.opciones.length === 3) q = [j.frase, j.opciones, +j.correcta, j.por_que];
    } catch (e) { }
  }
  if (!q) q = pick(PALABRAS);
  const [frase, ops, ok, why] = q;
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  box.innerHTML = `<div class="card hl"><p class="mut small">Esta frase no es clara:</p><h3 style="font-size:19px">"${esc(frase)}"</h3><p class="mut small">¿Cuál es la mejor forma de decirlo?</p>
  ${order.map(k => `<button class="btn sec opt" data-k="${k}">${esc(ops[k])}</button>`).join('')}</div><div id="res"></div>`;
  $$('.opt', box).forEach(b => b.onclick = () => {
    const k = +b.dataset.k, good = k === ok;
    $$('.opt', box).forEach(x => { x.disabled = true; if (+x.dataset.k === ok) x.style.borderColor = 'var(--ok)'; });
    if (!good) b.style.borderColor = 'var(--bad)';
    const msg = exScore(good ? 80 : 0);
    addSession({ type: 'expresar', dur: 20, score: good ? 100 : 0 });
    $('#res', box).innerHTML = `<div class="card"><h3 class="${good ? 'good' : 'badc'}">${good ? '✅ ¡Correcto!' : '❌ No era esa'}</h3><p>${esc(why)}</p>${msg ? `<p><b>${msg}</b></p>` : ''}</div><button class="btn big ok" id="nx">➡️ Siguiente</button>`;
    $('#nx', box).onclick = () => exPalabra(box);
  });
}
