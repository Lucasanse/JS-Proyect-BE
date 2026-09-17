const authService = require('../services/auth.service');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

async function registro(req, res, next) {
  try {
    const { usuario, token } = await authService.registrarCliente(req.body);
    res.cookie('token', token, cookieOptions);
    res.status(201).json({ usuario, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { usuario, token } = await authService.login(req.body);
    res.cookie('token', token, cookieOptions);
    res.status(200).json({ usuario, token });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie('token', cookieOptions);
    res.status(200).json({ mensaje: 'Sesion cerrada' });
  } catch (err) {
    next(err);
  }
}

async function olvidePassword(req, res, next) {
  try {
    const token = await authService.solicitarReseteoPassword(req.body.correo);
    // En un entorno real este token se enviaria por email en vez de devolverlo en la respuesta.
    res.status(200).json({
      mensaje: 'Si el correo existe, se genero un token de reseteo',
      resetToken: token ?? undefined,
    });
  } catch (err) {
    next(err);
  }
}

async function resetearPassword(req, res, next) {
  try {
    await authService.resetearPassword(req.body);
    res.status(200).json({ mensaje: 'Contrasena actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { registro, login, logout, olvidePassword, resetearPassword };
