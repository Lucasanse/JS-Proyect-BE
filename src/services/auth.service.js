const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const { ApiError } = require('../middlewares/error.middleware');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function firmarToken(usuario) {
  return jwt.sign(
    { sub: usuario.idUsuario, correo: usuario.correo, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function sinPassword(usuario) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}

async function registrarCliente({ nombreCompleto, correo, password, idIdioma, direccion, telefono }) {
  const idioma = await prisma.idioma.findUnique({ where: { idIdioma } });
  if (!idioma) throw new ApiError(400, 'El idioma indicado no existe');

  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) throw new ApiError(409, 'Ya existe un usuario con ese correo');

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombreCompleto,
      correo,
      passwordHash,
      rol: 'CLIENTE',
      idIdioma,
      direccion: direccion ?? null,
      telefono: telefono ?? null,
    },
  });

  const token = firmarToken(usuario);
  return { usuario: sinPassword(usuario), token };
}

async function login({ correo, password }) {
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (!usuario) throw new ApiError(401, 'Credenciales invalidas');

  const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValido) throw new ApiError(401, 'Credenciales invalidas');

  const token = firmarToken(usuario);
  return { usuario: sinPassword(usuario), token };
}

// No lanza error si el correo no existe, para no revelar que correos estan registrados.
// Devuelve el token en texto plano solo si el usuario existe (para poder testear sin envio de mail).
async function solicitarReseteoPassword(correo) {
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (!usuario) return null;

  const tokenPlano = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      idUsuario: usuario.idUsuario,
      tokenHash,
      expiraEn: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return tokenPlano;
}

async function resetearPassword({ token, nuevaPassword }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const registro = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!registro || registro.usado || registro.expiraEn < new Date()) {
    throw new ApiError(400, 'El token es invalido o expiro');
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.$transaction([
    prisma.usuario.update({ where: { idUsuario: registro.idUsuario }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { idToken: registro.idToken }, data: { usado: true } }),
  ]);
}

module.exports = { registrarCliente, login, solicitarReseteoPassword, resetearPassword, sinPassword };
