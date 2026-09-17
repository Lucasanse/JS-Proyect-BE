const jwt = require('jsonwebtoken');
const { ApiError } = require('./error.middleware');

function getTokenFromRequest(req) {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next(new ApiError(401, 'No autenticado'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { idUsuario: payload.sub, correo: payload.correo, rol: payload.rol };
    next();
  } catch (err) {
    next(new ApiError(401, 'Token invalido o expirado'));
  }
}

// Igual que requireAuth pero no rechaza la request si no hay token
function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { idUsuario: payload.sub, correo: payload.correo, rol: payload.rol };
  } catch (err) {
    // Token invalido/expirado: seguimos como anonimo
  }
  next();
}

// Se usa despues de requireAuth. Ej: requireRole('ADMIN')
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) return next(new ApiError(401, 'No autenticado'));
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new ApiError(403, 'No tenes permisos para realizar esta accion'));
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole, getTokenFromRequest };
