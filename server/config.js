module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.PGHOST || 'localhost',
    port: +(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '123456',
    database: process.env.PGDATABASE || 'bercell_db'
  }
};
