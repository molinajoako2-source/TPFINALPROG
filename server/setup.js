// Crea la base bercell_db (si no existe), las tablas y los datos iniciales.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { hash } = require('./auth');

(async () => {
  const admin = new Client({ ...cfg.db, database: 'postgres' });
  await admin.connect();
  const ex = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [cfg.db.database]);
  if (!ex.rowCount) { await admin.query(`CREATE DATABASE "${cfg.db.database}"`); console.log('Base de datos creada.'); }
  await admin.end();
  const c = new Client(cfg.db);
  await c.connect();
  await c.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));
  const demo = { 'Joaquín Molina': 'joaquin@bercell.local', 'Esteban R.': 'esteban@bercell.local',
    'TecnoFix Gallegos': 'tecnofix@bercell.local', 'ElectroPC Service': 'electropc@bercell.local' };
  for (const [n, e] of Object.entries(demo))
    await c.query('UPDATE usuarios SET email=$2, password_hash=$3 WHERE nombre=$1 AND password_hash IS NULL', [n, e, hash('bercell123')]);
  await c.end();
  console.log('Esquema y datos iniciales listos.');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
