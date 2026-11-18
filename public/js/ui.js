// Funciones que generan el HTML de cada pantalla (sin lógica de negocio).
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ars = n => '$' + Number(n).toLocaleString('es-AR') + ' ARS';
const fecha = d => new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
const ini = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const ESTADOS = { pendiente: ['Pendiente', 'warn'], en_proceso: ['En proceso', 'info'], solucionada: ['Solucionada', 'ok'], no_solucionada: ['No solucionada', 'bad'], cancelada: ['Cancelada', 'muted'] };
const badge = e => `<span class="badge ${ESTADOS[e][1]}">${ESTADOS[e][0]}</span>`;
const err = (E, k) => E?.[k] ? `<small class="err">${esc(E[k])}</small>` : '';
const titulo = p => `${p.tipo_equipo} - ${p.descripcion.length > 45 ? p.descripcion.slice(0, 45) + '…' : p.descripcion}`;

export function toast(msg, tipo = '') {
  const t = Object.assign(document.createElement('div'), { className: 'toast ' + tipo, textContent: msg });
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}

export function layout(u, html) {
  const tec = u.rol === 'tecnico';
  const nav = tec
    ? '<a href="#/tecnico">Publicaciones</a><a href="#/tecnico/trabajos">Mis trabajos</a>'
    : '<a href="#/cliente/publicar">Publicar problema</a><a href="#/cliente/mis">Mis publicaciones</a>';
  return `<header class="top ${tec ? 'dark' : ''}"><b>Bercell</b>
    <span class="sub">${tec ? 'Panel técnico / Admin' : 'Portal del cliente · Soporte de computadoras'}</span>
    ${nav}<span>${esc(u.nombre)}</span><button data-a="salir">Salir</button></header><main>${html}</main>`;
}

export const error = m => `<div class="card"><h3>No se pudo cargar la pantalla</h3><p class="mu">${esc(m)}</p></div>`;

export function ingreso(modo = 'login', E = {}, d = {}) {
  const reg = modo === 'registro';
  const roles = [['cliente', 'Cliente: tengo un problema con mi computadora'], ['tecnico', 'Técnico: quiero ofrecer mis servicios']]
    .map(([v, t]) => `<option value="${v}" ${d.rol === v ? 'selected' : ''}>${t}</option>`).join('');
  return `<header class="top"><b>Bercell</b><span class="sub">Conectamos a quienes traen el problema con quienes pueden resolverlo</span></header>
  <main><form class="card" data-form="${reg ? 'registro' : 'login'}" novalidate style="max-width:440px;margin:40px auto">
    <h2>${reg ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
    ${reg ? `<label>Nombre *</label><input name="nombre" value="${esc(d.nombre)}" autocomplete="name">${err(E, 'nombre')}` : ''}
    <label>Email *</label><input type="email" name="email" value="${esc(d.email)}" autocomplete="email">${err(E, 'email')}
    <label>Contraseña *</label><input type="password" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}">${err(E, 'password')}
    ${reg ? `<label>Quiero usar Bercell como *</label><select name="rol"><option value="">Seleccionar…</option>${roles}</select>${err(E, 'rol')}
    <label>Ubicación</label><input name="ubicacion" value="${esc(d.ubicacion ?? 'Río Gallegos')}">` : ''}
    ${E.general ? `<div class="alert">${esc(E.general)}</div>` : ''}
    <div class="row end"><button class="btn p">${reg ? 'Crear cuenta' : 'Ingresar'}</button></div>
    <p class="mu" style="margin-top:16px">${reg ? '¿Ya tenés cuenta?' : '¿Todavía no tenés cuenta?'}
      <button type="button" class="link" data-a="modo" data-id="${reg ? 'login' : 'registro'}">${reg ? 'Iniciá sesión' : 'Registrate'}</button></p>
    ${reg ? '' : '<p class="mu">Cuentas de prueba (contraseña <b>bercell123</b>): joaquin@bercell.local, esteban@bercell.local (clientes); tecnofix@bercell.local, electropc@bercell.local (técnicos).</p>'}
  </form></main>`;
}

/* ---------- Cliente ---------- */
export function formPublicar(d, E, foto) {
  const hay = E && Object.keys(E).length;
  const tipos = ['Notebook', 'PC de escritorio'].map(t => `<option ${d.tipo_equipo === t ? 'selected' : ''}>${t}</option>`).join('');
  return `<form class="card" data-form="publicar" novalidate><h2>Publicar problema en computadora</h2>
    <p class="mu">Registrá el equipo, la falla, la ubicación y fotos para recibir propuestas.</p>
    <label>Tipo de equipo / Categoría *</label><select name="tipo_equipo"><option value="">Seleccionar…</option>${tipos}</select>${err(E, 'tipo_equipo')}
    <label>Descripción de la falla (falta de encendido, pantalla azul…) *</label>
    <textarea name="descripcion" placeholder="Contá qué pasa, cuándo empezó y qué ocurrió antes">${esc(d.descripcion)}</textarea>${err(E, 'descripcion')}
    <label>Ubicación del servicio *</label><input name="ubicacion" value="${esc(d.ubicacion ?? 'Río Gallegos, Santa Cruz')}">${err(E, 'ubicacion')}
    <label>Fotos de la PC / falla (opcional)</label>
    <label class="dropzone"><input type="file" name="foto" accept="image/*"><span id="fotoNombre">${foto ? 'Imagen cargada ✔ (tocá para cambiarla)' : 'Cargar foto del equipo o componentes'}</span></label>
    ${hay ? '<div class="alert">⚠ Aviso de campos pendientes: completá todos los campos obligatorios (*) antes de publicar.</div>' : ''}
    <div class="row end"><a class="btn" href="#/cliente/mis">Cancelar</a><button class="btn p">PUBLICAR</button></div></form>`;
}

function tarjeta(p, base) {
  return `<a class="item" href="#/${base}/pub/${p.id}"><div class="row"><b>${esc(titulo(p))}</b>${badge(p.estado)}</div>
    <div class="mu">${base === 'tecnico' ? 'Cliente: ' + esc(p.cliente_nombre) + ' · ' : ''}Ubicación: ${esc(p.ubicacion)} · ${fecha(p.created_at)} · ${p.n_propuestas} propuesta(s)</div></a>`;
}
export const listaCliente = ps => `<div class="card"><h2>Mis publicaciones</h2>
  ${ps.map(p => tarjeta(p, 'cliente')).join('') || '<p class="mu">Todavía no publicaste ningún problema. <a href="#/cliente/publicar">Publicá el primero</a>.</p>'}</div>`;

const consultas = (p, u) => `<div class="card"><h3>Consultas</h3><div class="chat">
  ${p.consultas.map(c => `<p class="${c.autor_id === u.id ? 'me' : ''}"><b>${esc(c.autor_nombre)}</b> <span class="mu">${fecha(c.created_at)}</span><br>${esc(c.mensaje)}</p>`).join('') || '<p class="mu">Sin consultas todavía.</p>'}</div>
  ${['cancelada', 'solucionada', 'no_solucionada'].includes(p.estado) ? '' : `<form data-form="consulta" data-pub="${p.id}"><textarea name="mensaje" id="consultaTxt" placeholder="Escribí tu consulta…"></textarea>
  <div class="row end"><button class="btn p">Enviar consulta</button></div></form>`}</div>`;

const bitacora = (p, t = 'Diagnóstico y asistencia remota o presencial') => `<h3>${t}</h3><div class="tl">
  ${p.bitacora.map(b => `<p><span class="mu">${fecha(b.created_at)}</span> — ${esc(b.texto)}</p>`).join('') || '<p class="mu">Sin registros todavía.</p>'}</div>`;

const resumen = p => `<h2>${esc(p.tipo_equipo)} - ${esc(p.descripcion.slice(0, 50))}</h2>
  <div class="mu">Ubicación: ${esc(p.ubicacion)} · Cliente: ${esc(p.cliente_nombre)} · Publicada ${fecha(p.created_at)}</div>
  <p>${esc(p.descripcion)}</p>${p.foto ? `<img class="photo" src="${p.foto}" alt="Foto del equipo">` : ''}`;

export function detalleCliente(p, u) {
  let cuerpo;
  if (p.estado === 'pendiente') {
    cuerpo = `<h3 style="margin-top:16px">Revisá las propuestas recibidas (${p.propuestas.length})</h3>` +
      (p.propuestas.map(x => `<div class="prop"><div class="who"><div class="av">${ini(x.tecnico_nombre)}</div>
        <div><b>${esc(x.tecnico_nombre)}</b> <span class="mu">★ ${x.valoracion ?? '-'}</span></div></div>
        <div class="price">Presupuesto: ${ars(x.presupuesto)} | Plazo estimado: ${x.plazo_hs} hs</div>
        <div class="mu">${esc(x.detalle)}</div>
        <div class="row" style="margin-top:10px"><button class="btn" data-a="foco-consulta">Enviar consulta</button>
        <button class="btn p" data-a="aceptar" data-id="${x.id}">ACEPTAR PROPUESTA</button></div></div>`).join('')
        || '<p class="mu">Aún no recibiste propuestas. Podés cancelar la publicación si ya no la necesitás.</p>');
  } else if (p.estado === 'cancelada') {
    cuerpo = '<p class="mu">Esta publicación fue cancelada.</p>';
  } else {
    const a = p.propuestas.find(x => x.estado === 'aceptada');
    cuerpo = `${a ? `<div class="price">Propuesta aceptada: ${esc(a.tecnico_nombre)} — ${ars(a.presupuesto)} · ${a.plazo_hs} hs</div>` : ''}${bitacora(p)}
      ${p.estado === 'en_proceso' ? `<div class="card" style="margin:16px 0 0;background:#f8fafc"><h3>¿Se resolvió el problema?</h3>
        <p class="mu">Marcá cómo terminó el servicio para cerrar la publicación.</p><div class="row">
        <button class="btn ok big" data-a="cerrar" data-id="${p.id}" data-r="solucionada">✔ Marcar como solucionada</button>
        <button class="btn out big" data-a="cerrar" data-id="${p.id}" data-r="no_solucionada">✖ Marcar como no solucionada</button></div></div>` : ''}`;
  }
  return `<div class="card"><div class="row">${badge(p.estado)}
    ${p.estado === 'pendiente' ? `<button class="btn out" data-a="cancelar" data-id="${p.id}">✖ Cancelar publicación</button>` : ''}</div>
    ${resumen(p)}${cuerpo}</div>${consultas(p, u)}`;
}

/* ---------- Técnico ---------- */
export function panelTecnico(ps, f = {}) {
  const t = ['Notebook', 'PC de escritorio'].map(x => `<option ${f.tipo === x ? 'selected' : ''}>${x}</option>`).join('');
  return `<form class="card" data-form="filtros"><div class="grid2"><div><label>Tipo de equipo</label><select name="tipo"><option value="">Todos</option>${t}</select></div>
    <div><label>Ubicación</label><input name="ubicacion" value="${esc(f.ubicacion)}" placeholder="Ej: Río Gallegos"></div></div>
    <div class="row end"><button class="btn t">Filtrar</button></div></form>
    <div class="card dark-h"><h2>Publicaciones activas</h2>${ps.map(p => `<div class="item"><div class="row"><b>${esc(titulo(p))}</b>${badge(p.estado)}</div>
    <div class="mu">Cliente: ${esc(p.cliente_nombre)} · Ubicación: ${esc(p.ubicacion)} · ${fecha(p.created_at)}</div>
    <p>“${esc(p.descripcion.slice(0, 90))}${p.descripcion.length > 90 ? '…' : ''}”</p>
    <div class="row"><a class="btn" href="#/tecnico/pub/${p.id}">Abrir detalle de publicación</a><a class="btn t" href="#/tecnico/pub/${p.id}">ENVIAR PROPUESTA</a></div></div>`).join('')
    || '<p class="mu">No hay publicaciones que coincidan con los filtros.</p>'}</div>`;
}

export const listaTrabajos = ps => `<div class="card dark-h"><h2>Mis trabajos</h2>
  ${ps.map(p => tarjeta(p, 'tecnico')).join('') || '<p class="mu">Todavía no tenés propuestas aceptadas.</p>'}</div>`;

export function detalleTecnico(p, u, E = {}) {
  const mia = p.propuestas.find(x => x.tecnico_id === u.id);
  let cuerpo;
  if (!mia && p.estado === 'pendiente') {
    cuerpo = `<form data-form="propuesta" data-pub="${p.id}" novalidate><h3 style="margin-top:16px">Enviar propuesta</h3>
      <div class="grid2"><div><label>Presupuesto (ARS) *</label><input type="number" name="presupuesto" min="1" placeholder="35000">${err(E, 'presupuesto')}</div>
      <div><label>Plazo estimado (hs) *</label><input type="number" name="plazo_hs" min="1" placeholder="24">${err(E, 'plazo_hs')}</div></div>
      <label>Descripción del trabajo / repuestos *</label><textarea name="detalle" placeholder="Qué vas a reparar, repuestos y garantía">${esc(E._detalle)}</textarea>${err(E, 'detalle')}
      <div class="hint"><b>¿Necesitás más datos para cotizar?</b><br><span class="mu">Enviá una consulta previa al cliente (abajo) o descartá la publicación.</span></div>
      <div class="row end"><button type="button" class="btn out" data-a="descartar" data-id="${p.id}">Descartar</button><button class="btn t">ENVIAR PROPUESTA</button></div></form>`;
  } else if (!mia) {
    cuerpo = '<p class="mu">Esta publicación ya no está disponible para nuevas propuestas.</p>';
  } else {
    cuerpo = `<div class="prop"><b>Tu propuesta</b> <span class="badge ${mia.estado === 'aceptada' ? 'ok' : mia.estado === 'rechazada' ? 'bad' : 'warn'}">${mia.estado}</span>
      <div class="price">${ars(mia.presupuesto)} | Plazo estimado: ${mia.plazo_hs} hs</div><div class="mu">${esc(mia.detalle)}</div></div>`;
    if (mia.estado === 'aceptada') {
      cuerpo += `<div style="margin-top:16px">${bitacora(p, 'Ejecución de asistencia (coordinación de cita / presencial o remoto)')}
        ${p.estado === 'en_proceso' ? `<form data-form="avance" data-pub="${p.id}"><label>Registrar avance o evidencia</label>
        <textarea name="texto" placeholder="Ej: Se repara componente MOSFET y se aprueban pruebas de banco."></textarea>
        <div class="row end"><button class="btn t">Guardar registro</button></div></form>
        <div class="card" style="margin:16px 0 0;background:#f8fafc"><h3>Cierre del servicio técnico</h3><div class="row">
        <button class="btn ok big" data-a="cerrar" data-id="${p.id}" data-r="solucionada">✔ Trabajo concretado con éxito</button>
        <button class="btn bad big" data-a="cerrar" data-id="${p.id}" data-r="no_solucionada">✖ Se registra sin resolución</button></div></div>` : ''}</div>`;
    }
  }
  return `<div class="card dark-h"><div class="row">${badge(p.estado)}<a class="btn" href="#/tecnico">← Volver al listado</a></div>${resumen(p)}${cuerpo}</div>${consultas(p, u)}`;
}
