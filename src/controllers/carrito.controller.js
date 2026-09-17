const carritoService = require('../services/carrito.service');

async function obtener(req, res, next) {
  try {
    const carrito = await carritoService.obtenerOCrearCarrito(req.usuario.idUsuario);
    res.status(200).json(carrito);
  } catch (err) {
    next(err);
  }
}

async function agregarItem(req, res, next) {
  try {
    const carrito = await carritoService.agregarItem(req.usuario.idUsuario, req.body);
    res.status(201).json(carrito);
  } catch (err) {
    next(err);
  }
}

async function actualizarItem(req, res, next) {
  try {
    const carrito = await carritoService.actualizarItem(req.usuario.idUsuario, req.params.idItem, req.body.cantidad);
    res.status(200).json(carrito);
  } catch (err) {
    next(err);
  }
}

async function eliminarItem(req, res, next) {
  try {
    const carrito = await carritoService.eliminarItem(req.usuario.idUsuario, req.params.idItem);
    res.status(200).json(carrito);
  } catch (err) {
    next(err);
  }
}

async function vaciar(req, res, next) {
  try {
    const carrito = await carritoService.vaciarCarrito(req.usuario.idUsuario);
    res.status(200).json(carrito);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtener, agregarItem, actualizarItem, eliminarItem, vaciar };
