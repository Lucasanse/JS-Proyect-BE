const solicitudesService = require('../services/solicitudes.service');

async function crear(req, res, next) {
  try {
    const solicitud = await solicitudesService.crear(req.usuario.idUsuario, req.body);
    res.status(201).json(solicitud);
  } catch (err) {
    next(err);
  }
}

async function listarPropias(req, res, next) {
  try {
    const resultado = await solicitudesService.listarPropias(req.usuario.idUsuario, req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const resultado = await solicitudesService.listar(req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const solicitud = await solicitudesService.obtenerPorId(req.params.id, req.usuario);
    res.status(200).json(solicitud);
  } catch (err) {
    next(err);
  }
}

async function actualizarEstado(req, res, next) {
  try {
    const solicitud = await solicitudesService.actualizarEstado(req.params.id, req.body);
    res.status(200).json(solicitud);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listarPropias, listar, obtenerPorId, actualizarEstado };
