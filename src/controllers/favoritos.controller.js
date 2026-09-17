const favoritosService = require('../services/favoritos.service');

async function agregar(req, res, next) {
  try {
    const favorito = await favoritosService.agregar(req.usuario.idUsuario, req.body.idProducto);
    res.status(201).json(favorito);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await favoritosService.eliminar(req.usuario.idUsuario, req.params.idProducto);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const favoritos = await favoritosService.listar(req.usuario.idUsuario);
    res.status(200).json(favoritos);
  } catch (err) {
    next(err);
  }
}

module.exports = { agregar, eliminar, listar };
