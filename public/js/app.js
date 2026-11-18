// Punto de entrada: enrutado por hash, estado y manejo de eventos.
import { api, sesion } from './storage.js';
import * as V from './validators.js';
import * as UI from './ui.js';

const $app = document.getElementById('app');
let user = sesion.get();
let draft = {}, foto = null, errores = {}, filtros = {};
let modo = 'login', authErr = {}, authDraft = {};

const ruta = () => location.hash.replace(/^#\/?/, '').split('/');
const inicio = () => '#/' + (user.rol === 'cliente' ? 'cliente/publicar' : 'tecnico');

async function render() {
  try {
    if (!user) { $app.innerHTML = UI.ingreso(modo, authErr, authDraft); return; }
    const [r0, r1, r2] = ruta();
    if (r0 !== user.rol) { location.hash = inicio(); return; }
    let html;
    if (user.rol === 'cliente') {
      if (r1 === 'mis') html = UI.listaCliente(await api.publicaciones({ cliente_id: user.id }));
      else if (r1 === 'pub') html = UI.detalleCliente(await api.publicacion(r2), user);
      else html = UI.formPublicar(draft, errores, foto);
    } else {
      if (r1 === 'trabajos') html = UI.listaTrabajos(await api.trabajos(user.id));
      else if (r1 === 'pub') html = UI.detalleTecnico(await api.publicacion(r2), user, errores);
      else html = UI.panelTecnico(await api.publicaciones({ estado: 'pendiente', tecnico_id: user.id, ...filtros }), filtros);
    }
    $app.innerHTML = UI.layout(user, html);
  } catch (e) {
    $app.innerHTML = user ? UI.layout(user, UI.error(e.message)) : UI.error(e.message + ' — ¿está iniciado el servidor y la base de datos?');
  }
}

// Ejecuta una acción de la API mostrando el resultado y refrescando la pantalla.
async function accion(fn, ok) {
  try { await fn(); if (ok) UI.toast(ok); errores = {}; await render(); }
  catch (e) { UI.toast(e.message, 'error'); }
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const { a, id, r } = b.dataset;
  if (a === 'salir') { await api.logout().catch(() => {}); sesion.clear(); user = null; modo = 'login'; location.hash = ''; render(); }
  else if (a === 'modo') { modo = id; authErr = {}; render(); }
  else if (a === 'cancelar') { if (confirm('¿Cancelar la publicación?')) accion(() => api.cancelar(id), 'Publicación cancelada'); }
  else if (a === 'aceptar') { if (confirm('¿Aceptar esta propuesta?')) accion(() => api.aceptarPropuesta(id), 'Propuesta aceptada'); }
  else if (a === 'descartar') { await accion(() => api.descartar(id, user.id), 'Publicación descartada'); location.hash = '#/tecnico'; }
  else if (a === 'cerrar') { if (confirm('¿Confirmar el cierre del servicio?')) accion(() => api.cerrar(id, r, user.nombre), 'Servicio cerrado'); }
  else if (a === 'foco-consulta') document.getElementById('consultaTxt')?.focus();
});

document.addEventListener('change', e => {
  if (e.target.name !== 'foto') return;
  const file = e.target.files[0], msg = V.validarFoto(file);
  if (msg) { UI.toast(msg, 'error'); e.target.value = ''; return; }
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => { foto = fr.result; document.getElementById('fotoNombre').textContent = file.name + ' ✔'; };
  fr.readAsDataURL(file);
});

document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, k = f.dataset.form, pub = f.dataset.pub;
  const d = Object.fromEntries([...new FormData(f)].filter(([n]) => n !== 'foto'));
  if (k === 'login' || k === 'registro') {
    authDraft = { ...d, password: '' };
    authErr = k === 'login' ? V.validarLogin(d) : V.validarRegistro(d);
    if (Object.keys(authErr).length) return render();
    try {
      const s = await (k === 'login' ? api.login(d) : api.registro(d));
      sesion.set(s); user = s.usuario; authErr = {}; authDraft = {}; location.hash = inicio(); render();
    } catch (err) { authErr = { general: err.message }; render(); }
    return;
  }
  if (k === 'publicar') {
    draft = d; errores = V.validarPublicacion(d);
    if (Object.keys(errores).length) return render();
    await accion(async () => {
      const { id } = await api.crearPublicacion({ ...d, foto, cliente_id: user.id });
      draft = {}; foto = null; errores = {}; location.hash = `#/cliente/pub/${id}`;
    }, 'Publicado');
  } else if (k === 'filtros') { filtros = d; render(); }
  else if (k === 'consulta') {
    const E = V.validarMensaje(d.mensaje);
    if (E.mensaje) return UI.toast(E.mensaje, 'error');
    accion(() => api.enviarConsulta(pub, { autor_id: user.id, mensaje: d.mensaje }), 'Consulta enviada');
  } else if (k === 'propuesta') {
    errores = V.validarPropuesta(d);
    if (Object.keys(errores).length) { errores._detalle = d.detalle; return render(); }
    accion(() => api.enviarPropuesta(pub, { ...d, tecnico_id: user.id }), 'Propuesta enviada');
  } else if (k === 'avance') {
    const E = V.validarMensaje(d.texto, 5);
    if (E.mensaje) return UI.toast(E.mensaje, 'error');
    accion(() => api.registrarAvance(pub, d.texto), 'Avance registrado');
  }
});

window.addEventListener('hashchange', () => { errores = {}; render(); });
render();
