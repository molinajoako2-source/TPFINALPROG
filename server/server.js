const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cfg = require('./config');
const { hash, check, token } = require('./auth');

const pool = new Pool(cfg.db);
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const q = (t, p) => pool.query(t, p).then(r => r.rows);
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  if (e.code === '23505') return bad(res, 'Ya enviaste una propuesta para esta publicación.', 409);
  console.error(e); bad(res, e.message, 500);
});

const pub = u => ({ id: u.id, nombre: u.nombre, rol: u.rol, ubicacion: u.ubicacion, valoracion: u.valoracion, email: u.email });
const abrirSesion = async u => {
  const t = token();
  await q('INSERT INTO sesiones(token,usuario_id) VALUES($1,$2)', [t, u.id]);
  return { token: t, usuario: pub(u) };
};

// --- Autenticación (rutas públicas) ---
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [u] = await q('SELECT * FROM usuarios WHERE lower(email)=lower($1)', [email || '']);
  if (!u || !u.password_hash || !check(password || '', u.password_hash)) return bad(res, 'Email o contraseña incorrectos.', 401);
  res.json(await abrirSesion(u));
}));

app.post('/api/auth/registro', wrap(async (req, res) => {
  const { nombre, email, password, rol, ubicacion } = req.body;
  if (!nombre?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 6 || !['cliente', 'tecnico'].includes(rol))
    return bad(res, 'Datos de registro inválidos.');
  if ((await q('SELECT 1 FROM usuarios WHERE lower(email)=lower($1)', [email])).length) return bad(res, 'Ya existe una cuenta con ese email.', 409);
  const [u] = await q('INSERT INTO usuarios(nombre,rol,ubicacion,email,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [nombre.trim(), rol, ubicacion?.trim() || null, email.trim(), hash(password)]);
  res.status(201).json(await abrirSesion(u));
}));

// --- Todo lo que sigue requiere sesión ---
app.use('/api', async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    const [u] = t ? await q('SELECT u.* FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token=$1', [t]) : [];
    if (!u) return bad(res, 'Sesión no válida. Iniciá sesión nuevamente.', 401);
    req.user = u; req.token = t; next();
  } catch (e) { bad(res, e.message, 500); }
});
const rol = r => (req, res, next) => req.user.rol === r ? next() : bad(res, 'No tenés permiso para esta acción.', 403);

app.post('/api/auth/logout', wrap(async (req, res) => { await q('DELETE FROM sesiones WHERE token=$1', [req.token]); res.json({ ok: true }); }));

const COLS = `p.id,p.cliente_id,p.tipo_equipo,p.descripcion,p.ubicacion,p.estado,p.created_at,
  (p.foto IS NOT NULL) AS tiene_foto, u.nombre AS cliente_nombre,
  (SELECT count(*)::int FROM propuestas x WHERE x.publicacion_id=p.id) AS n_propuestas`;

app.get('/api/publicaciones', wrap(async (req, res) => {
  const { estado, tipo, ubicacion } = req.query;
  const cliente_id = req.user.rol === 'cliente' ? req.user.id : null;
  const tecnico_id = req.user.rol === 'tecnico' ? req.user.id : null;
  const w = [], p = [];
  const add = (c, v) => { p.push(v); w.push(c.replace('?', '$' + p.length)); };
  if (cliente_id) add('p.cliente_id=?', cliente_id);
  if (estado) add('p.estado=?', estado);
  if (tipo) add('p.tipo_equipo=?', tipo);
  if (ubicacion) add('p.ubicacion ILIKE ?', '%' + ubicacion + '%');
  if (tecnico_id) add('NOT EXISTS (SELECT 1 FROM descartes d WHERE d.publicacion_id=p.id AND d.tecnico_id=?)', tecnico_id);
  res.json(await q(`SELECT ${COLS} FROM publicaciones p JOIN usuarios u ON u.id=p.cliente_id
    ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY p.created_at DESC`, p));
}));

app.get('/api/trabajos', rol('tecnico'), wrap(async (req, res) =>
  res.json(await q(`SELECT ${COLS} FROM publicaciones p JOIN usuarios u ON u.id=p.cliente_id
    JOIN propuestas pr ON pr.publicacion_id=p.id AND pr.estado='aceptada' AND pr.tecnico_id=$1
    ORDER BY p.created_at DESC`, [req.user.id]))));

app.get('/api/publicaciones/:id', wrap(async (req, res) => {
  const [p] = await q(`SELECT p.*,u.nombre AS cliente_nombre FROM publicaciones p
    JOIN usuarios u ON u.id=p.cliente_id WHERE p.id=$1`, [req.params.id]);
  if (!p) return bad(res, 'La publicación no existe.', 404);
  if (req.user.rol === 'cliente' && p.cliente_id !== req.user.id) return bad(res, 'No tenés acceso a esta publicación.', 403);
  p.propuestas = await q(`SELECT pr.*,t.nombre AS tecnico_nombre,t.valoracion FROM propuestas pr
    JOIN usuarios t ON t.id=pr.tecnico_id WHERE publicacion_id=$1 ORDER BY pr.created_at`, [p.id]);
  p.consultas = await q(`SELECT c.*,u.nombre AS autor_nombre,u.rol FROM consultas c
    JOIN usuarios u ON u.id=c.autor_id WHERE publicacion_id=$1 ORDER BY c.created_at`, [p.id]);
  p.bitacora = await q('SELECT * FROM bitacora WHERE publicacion_id=$1 ORDER BY created_at', [p.id]);
  res.json(p);
}));

app.post('/api/publicaciones', rol('cliente'), wrap(async (req, res) => {
  const { tipo_equipo, descripcion, ubicacion, foto } = req.body;
  const cliente_id = req.user.id;
  if (!cliente_id || !tipo_equipo || !descripcion?.trim() || !ubicacion?.trim()) return bad(res, 'Faltan campos obligatorios.');
  const [r] = await q(`INSERT INTO publicaciones(cliente_id,tipo_equipo,descripcion,ubicacion,foto)
    VALUES($1,$2,$3,$4,$5) RETURNING id`, [cliente_id, tipo_equipo, descripcion.trim(), ubicacion.trim(), foto || null]);
  res.status(201).json(r);
}));

app.post('/api/publicaciones/:id/cancelar', wrap(async (req, res) => {
  const r = await pool.query("UPDATE publicaciones SET estado='cancelada' WHERE id=$1 AND estado='pendiente' AND cliente_id=$2", [req.params.id, req.user.id]);
  if (!r.rowCount) return bad(res, 'Solo se pueden cancelar publicaciones pendientes.');
  res.json({ ok: true });
}));

app.post('/api/publicaciones/:id/propuestas', rol('tecnico'), wrap(async (req, res) => {
  const { presupuesto, plazo_hs, detalle } = req.body;
  const tecnico_id = req.user.id;
  if (!(presupuesto > 0) || !(plazo_hs > 0) || !detalle?.trim()) return bad(res, 'Datos de propuesta inválidos.');
  const [p] = await q('SELECT estado FROM publicaciones WHERE id=$1', [req.params.id]);
  if (p?.estado !== 'pendiente') return bad(res, 'La publicación ya no admite propuestas.');
  await q('INSERT INTO propuestas(publicacion_id,tecnico_id,presupuesto,plazo_hs,detalle) VALUES($1,$2,$3,$4,$5)',
    [req.params.id, tecnico_id, presupuesto, plazo_hs, detalle.trim()]);
  res.status(201).json({ ok: true });
}));

app.post('/api/publicaciones/:id/consultas', wrap(async (req, res) => {
  if (!req.body.mensaje?.trim()) return bad(res, 'Escriba un mensaje.');
  await q('INSERT INTO consultas(publicacion_id,autor_id,mensaje) VALUES($1,$2,$3)',
    [req.params.id, req.user.id, req.body.mensaje.trim()]);
  res.status(201).json({ ok: true });
}));

app.post('/api/publicaciones/:id/descartar', rol('tecnico'), wrap(async (req, res) => {
  await q('INSERT INTO descartes(publicacion_id,tecnico_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.post('/api/propuestas/:id/aceptar', rol('cliente'), wrap(async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const { rows: [pr] } = await c.query('SELECT * FROM propuestas WHERE id=$1', [req.params.id]);
    const { rows: [p] } = await c.query('SELECT estado,cliente_id FROM publicaciones WHERE id=$1 FOR UPDATE', [pr.publicacion_id]);
    if (p.cliente_id !== req.user.id) throw new Error('Esta publicación no es tuya.');
    if (p.estado !== 'pendiente') throw new Error('La publicación ya no está pendiente.');
    await c.query("UPDATE propuestas SET estado=CASE WHEN id=$1 THEN 'aceptada' ELSE 'rechazada' END WHERE publicacion_id=$2", [pr.id, pr.publicacion_id]);
    await c.query("UPDATE publicaciones SET estado='en_proceso' WHERE id=$1", [pr.publicacion_id]);
    await c.query("INSERT INTO bitacora(publicacion_id,texto) VALUES($1,'Propuesta aceptada. El servicio pasa a En proceso.')", [pr.publicacion_id]);
    await c.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

app.post('/api/publicaciones/:id/bitacora', rol('tecnico'), wrap(async (req, res) => {
  if (!(await q("SELECT 1 FROM propuestas WHERE publicacion_id=$1 AND tecnico_id=$2 AND estado='aceptada'", [req.params.id, req.user.id])).length)
    return bad(res, 'Solo el técnico del servicio puede registrar avances.', 403);
  if (!req.body.texto?.trim()) return bad(res, 'Escriba el avance a registrar.');
  await q('INSERT INTO bitacora(publicacion_id,texto) VALUES($1,$2)', [req.params.id, req.body.texto.trim()]);
  res.status(201).json({ ok: true });
}));

app.post('/api/publicaciones/:id/cerrar', wrap(async (req, res) => {
  const { resultado } = req.body;
  const por = req.user.nombre;
  if (!['solucionada', 'no_solucionada'].includes(resultado)) return bad(res, 'Resultado inválido.');
  const [ok] = await q(`SELECT 1 FROM publicaciones p WHERE p.id=$1 AND (p.cliente_id=$2 OR EXISTS
    (SELECT 1 FROM propuestas x WHERE x.publicacion_id=p.id AND x.estado='aceptada' AND x.tecnico_id=$2))`, [req.params.id, req.user.id]);
  if (!ok) return bad(res, 'No participás de este servicio.', 403);
  const r = await pool.query("UPDATE publicaciones SET estado=$1 WHERE id=$2 AND estado='en_proceso'", [resultado, req.params.id]);
  if (!r.rowCount) return bad(res, 'Solo se pueden cerrar servicios en proceso.');
  await q('INSERT INTO bitacora(publicacion_id,texto) VALUES($1,$2)',
    [req.params.id, `Cierre registrado por ${por}: ${resultado === 'solucionada' ? 'Solucionada' : 'No solucionada'}.`]);
  res.json({ ok: true });
}));

app.listen(cfg.port, () => console.log(`Bercell disponible en http://localhost:${cfg.port}`));
