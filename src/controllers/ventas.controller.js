const ventasService = require('../services/ventas.service');

async function crear(req, res, next) {
  try {
    const venta = await ventasService.crearDesdeCarrito(req.usuario.idUsuario);
    res.status(201).json(venta);
  } catch (err) {
    next(err);
  }
}

async function listarPropias(req, res, next) {
  try {
    const resultado = await ventasService.listarPropias(req.usuario.idUsuario, req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const resultado = await ventasService.listar(req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const venta = await ventasService.obtenerPorId(req.params.id, req.usuario);
    res.status(200).json(venta);
  } catch (err) {
    next(err);
  }
}

async function actualizarEstado(req, res, next) {
  try {
    const venta = await ventasService.actualizarEstado(req.params.id, req.body.estado);
    res.status(200).json(venta);
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listarPropias, listar, obtenerPorId, actualizarEstado };
