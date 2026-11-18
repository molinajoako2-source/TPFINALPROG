// Acceso a datos: API REST (PostgreSQL vía servidor local) y sesión del navegador.
async function http(method, url, body) {
  const t = sesion.token();
  const r = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && t) { sesion.clear(); location.hash = ''; location.reload(); }  // sesión vencida
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}
const qs = o => {
  const s = new URLSearchParams(Object.entries(o || {}).filter(([, v]) => v)).toString();
  return s ? '?' + s : '';
};

export const api = {
  login: d => http('POST', '/auth/login', { email: d.email, password: d.password }),
  registro: d => http('POST', '/auth/registro', d),
  logout: () => http('POST', '/auth/logout'),
  publicaciones: f => http('GET', '/publicaciones' + qs(f)),
  trabajos: () => http('GET', '/trabajos'),
  publicacion: id => http('GET', `/publicaciones/${id}`),
  crearPublicacion: d => http('POST', '/publicaciones', d),
  cancelar: id => http('POST', `/publicaciones/${id}/cancelar`),
  enviarPropuesta: (id, d) => http('POST', `/publicaciones/${id}/propuestas`, d),
  aceptarPropuesta: id => http('POST', `/propuestas/${id}/aceptar`),
  enviarConsulta: (id, d) => http('POST', `/publicaciones/${id}/consultas`, d),
  descartar: id => http('POST', `/publicaciones/${id}/descartar`),
  registrarAvance: (id, texto) => http('POST', `/publicaciones/${id}/bitacora`, { texto }),
  cerrar: (id, resultado) => http('POST', `/publicaciones/${id}/cerrar`, { resultado })
};

export const sesion = {
  token: () => localStorage.getItem('bercell_token'),
  get() { try { return JSON.parse(localStorage.getItem('bercell_usuario')); } catch { return null; } },
  set({ token, usuario }) { localStorage.setItem('bercell_token', token); localStorage.setItem('bercell_usuario', JSON.stringify(usuario)); },
  clear() { localStorage.removeItem('bercell_token'); localStorage.removeItem('bercell_usuario'); }
};
