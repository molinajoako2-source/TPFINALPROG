// Validaciones de formularios. Cada función devuelve un objeto {campo: mensaje}; vacío = válido.
export const TIPOS = ['Notebook', 'PC de escritorio'];

export function validarPublicacion(d) {
  const e = {};
  if (!TIPOS.includes(d.tipo_equipo)) e.tipo_equipo = 'Seleccione el tipo de equipo.';
  if (!d.descripcion || d.descripcion.trim().length < 15) e.descripcion = 'Describa la falla con al menos 15 caracteres.';
  if (!d.ubicacion || !d.ubicacion.trim()) e.ubicacion = 'Indique la ubicación del servicio.';
  return e;
}

export function validarPropuesta(d) {
  const e = {};
  const precio = Number(d.presupuesto), plazo = Number(d.plazo_hs);
  if (!(precio > 0)) e.presupuesto = 'Ingrese un presupuesto mayor a 0.';
  if (!Number.isInteger(plazo) || plazo <= 0) e.plazo_hs = 'Ingrese un plazo en horas (número entero).';
  if (!d.detalle || d.detalle.trim().length < 10) e.detalle = 'Detalle el trabajo y los repuestos (mínimo 10 caracteres).';
  return e;
}

export function validarMensaje(texto, min = 3) {
  return texto && texto.trim().length >= min ? {} : { mensaje: `Escriba al menos ${min} caracteres.` };
}

export function validarFoto(file) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) return 'El archivo debe ser una imagen.';
  if (file.size > 3 * 1024 * 1024) return 'La imagen no puede superar los 3 MB.';
  return null;
}

const EMAIL = /^\S+@\S+\.\S+$/;
export function validarLogin(d) {
  const e = {};
  if (!EMAIL.test(d.email || '')) e.email = 'Ingrese un email válido.';
  if (!d.password) e.password = 'Ingrese su contraseña.';
  return e;
}
export function validarRegistro(d) {
  const e = validarLogin(d);
  if (!d.nombre || d.nombre.trim().length < 2) e.nombre = 'Ingrese su nombre.';
  if (!d.password || d.password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
  if (!['cliente', 'tecnico'].includes(d.rol)) e.rol = 'Elija cómo va a usar Bercell.';
  return e;
}
