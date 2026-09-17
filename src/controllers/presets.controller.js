const presetsService = require('../services/presets.service');

async function crear(req, res, next) {
  try {
    const preset = await presetsService.crear(req.usuario.idUsuario, req.body);
    res.status(201).json(preset);
  } catch (err) {
    next(err);
  }
}

async function listarPropios(req, res, next) {
  try {
    const presets = await presetsService.listarPropios(req.usuario.idUsuario);
    res.status(200).json(presets);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const preset = await presetsService.obtenerPropioPorId(req.usuario.idUsuario, req.params.id);
    res.status(200).json(preset);
  } catch (err) {
    next(err);
  }
}

async function agregarComponente(req, res, next) {
  try {
    const preset = await presetsService.agregarComponente(req.usuario.idUsuario, req.params.id, req.body.idProducto);
    res.status(201).json(preset);
  } catch (err) {
    next(err);
  }
}

async function eliminarComponente(req, res, next) {
  try {
    const preset = await presetsService.eliminarComponente(
      req.usuario.idUsuario,
      req.params.id,
      req.params.idComponente
    );
    res.status(200).json(preset);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await presetsService.eliminar(req.usuario.idUsuario, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listarPropios, obtenerPorId, agregarComponente, eliminarComponente, eliminar };
