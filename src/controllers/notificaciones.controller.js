const notificacionesService = require('../services/notificaciones.service');

async function listarPropias(req, res, next) {
  try {
    const resultado = await notificacionesService.listarPropias(req.usuario.idUsuario, req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function marcarComoLeida(req, res, next) {
  try {
    const notificacion = await notificacionesService.marcarComoLeida(req.usuario.idUsuario, req.params.id);
    res.status(200).json(notificacion);
  } catch (err) {
    next(err);
  }
}

async function marcarTodasComoLeidas(req, res, next) {
  try {
    await notificacionesService.marcarTodasComoLeidas(req.usuario.idUsuario);
    res.status(200).json({ mensaje: 'Notificaciones marcadas como leidas' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listarPropias, marcarComoLeida, marcarTodasComoLeidas };
