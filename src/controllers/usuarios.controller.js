const usuariosService = require('../services/usuarios.service');

async function obtenerPropio(req, res, next) {
  try {
    const usuario = await usuariosService.obtenerPropio(req.usuario.idUsuario);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function actualizarPropio(req, res, next) {
  try {
    const usuario = await usuariosService.actualizarPropio(req.usuario.idUsuario, req.body);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const resultado = await usuariosService.listar(req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const usuario = await usuariosService.obtenerPorId(req.params.id);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function actualizarPorAdmin(req, res, next) {
  try {
    const usuario = await usuariosService.actualizarPorAdmin(req.params.id, req.body);
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await usuariosService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerPropio, actualizarPropio, listar, obtenerPorId, actualizarPorAdmin, eliminar };
