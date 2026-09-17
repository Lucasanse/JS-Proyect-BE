const categoriasService = require('../services/categorias.service');

async function listar(req, res, next) {
  try {
    const categorias = await categoriasService.listar();
    res.status(200).json(categorias);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const categoria = await categoriasService.obtenerPorId(req.params.id);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const categoria = await categoriasService.crear(req.body);
    res.status(201).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await categoriasService.actualizar(req.params.id, req.body);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await categoriasService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
