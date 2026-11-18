// Hash de contraseñas con scrypt (módulo crypto de Node, sin dependencias extra).
const crypto = require('crypto');
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const check = (pw, stored) => {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(h, 'hex'), b = crypto.scryptSync(pw, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
module.exports = { hash, check, token: () => crypto.randomBytes(32).toString('hex') };
