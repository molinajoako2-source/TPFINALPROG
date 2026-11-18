# Bercell

Aplicación web local que conecta usuarios con problemas en su computadora con técnicos que pueden resolverlos.

## Requisitos
- Node.js 18 o superior
- PostgreSQL en ejecución (localhost:5432) con usuario `postgres` / contraseña `123456`

## Puesta en marcha
```bash
npm install
npm run setup   # crea bercell_db, las tablas y datos de ejemplo
npm start       # abre http://localhost:3000
```
Los datos de conexión están en `server/config.js` (también se pueden cambiar con variables PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE).

## Cuentas de prueba (contraseña `bercell123`)
- Clientes: joaquin@bercell.local, esteban@bercell.local
- Técnicos: tecnofix@bercell.local, electropc@bercell.local

También se puede crear una cuenta nueva desde la pantalla de ingreso. Si ya habías ejecutado `npm run setup` antes, volvé a ejecutarlo: agrega las columnas de login sin borrar datos.

## Estructura
- `database/schema.sql`: tablas y datos iniciales
- `server/`: API (Express + pg), `auth.js` (hash de contraseñas), configuración y script de setup
- `public/index.html`, `public/css/styles.css`
- `public/js/app.js` (rutas y eventos), `ui.js` (pantallas), `storage.js` (API y sesión), `validators.js` (validaciones)
