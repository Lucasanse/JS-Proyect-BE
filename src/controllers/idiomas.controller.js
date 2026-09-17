const idiomasService = require('../services/idiomas.service');

async function listar(req, res, next) {
  try {
    const idiomas = await idiomasService.listar();
    res.status(200).json(idiomas);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const idioma = await idiomasService.crear(req.body);
    res.status(201).json(idioma);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const idioma = await idiomasService.actualizar(req.params.id, req.body);
    res.status(200).json(idioma);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await idiomasService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, actualizar, eliminar };
