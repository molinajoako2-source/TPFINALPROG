-- Bercell: esquema y datos iniciales (idempotente)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  rol VARCHAR(10) NOT NULL CHECK (rol IN ('cliente','tecnico')),
  ubicacion VARCHAR(80),
  valoracion NUMERIC(2,1)
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (lower(email));
CREATE TABLE IF NOT EXISTS sesiones (
  token VARCHAR(64) PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS publicaciones (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES usuarios(id),
  tipo_equipo VARCHAR(30) NOT NULL CHECK (tipo_equipo IN ('Notebook','PC de escritorio')),
  descripcion TEXT NOT NULL,
  ubicacion VARCHAR(100) NOT NULL,
  foto TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_proceso','solucionada','no_solucionada','cancelada')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS propuestas (
  id SERIAL PRIMARY KEY,
  publicacion_id INT NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  tecnico_id INT NOT NULL REFERENCES usuarios(id),
  presupuesto NUMERIC(12,2) NOT NULL CHECK (presupuesto > 0),
  plazo_hs INT NOT NULL CHECK (plazo_hs > 0),
  detalle TEXT NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'enviada' CHECK (estado IN ('enviada','aceptada','rechazada')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (publicacion_id, tecnico_id)
);
CREATE TABLE IF NOT EXISTS consultas (
  id SERIAL PRIMARY KEY,
  publicacion_id INT NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  autor_id INT NOT NULL REFERENCES usuarios(id),
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS descartes (
  publicacion_id INT NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  tecnico_id INT NOT NULL REFERENCES usuarios(id),
  PRIMARY KEY (publicacion_id, tecnico_id)
);
CREATE TABLE IF NOT EXISTS bitacora (
  id SERIAL PRIMARY KEY,
  publicacion_id INT NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO usuarios (nombre, rol, ubicacion, valoracion)
SELECT * FROM (VALUES
  ('Joaquín Molina','cliente','Río Gallegos',NULL::numeric),
  ('Esteban R.','cliente','Centro',NULL),
  ('TecnoFix Gallegos','tecnico','Río Gallegos',4.9),
  ('ElectroPC Service','tecnico','Río Gallegos',4.6)
) v WHERE NOT EXISTS (SELECT 1 FROM usuarios);

INSERT INTO publicaciones (cliente_id, tipo_equipo, descripcion, ubicacion)
SELECT (SELECT id FROM usuarios WHERE nombre = v.n), v.t, v.d, v.u
FROM (VALUES
  ('Joaquín Molina','Notebook','La computadora no enciende al presionar power. El LED parpadea. Se apagó de repente hace dos días.','Río Gallegos'),
  ('Esteban R.','PC de escritorio','Al iniciar Windows aparece la pantalla azul con el error WHEA_UNCORRECTABLE_ERROR.','Centro')
) AS v(n,t,d,u) WHERE NOT EXISTS (SELECT 1 FROM publicaciones);
