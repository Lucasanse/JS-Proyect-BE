const productosService = require('../services/productos.service');

async function listar(req, res, next) {
  try {
    const resultado = await productosService.listar(req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerPorId(req, res, next) {
  try {
    const producto = await productosService.obtenerPorId(req.params.id);
    res.status(200).json(producto);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const producto = await productosService.crear(req.body);
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const producto = await productosService.actualizar(req.params.id, req.body);
    res.status(200).json(producto);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await productosService.eliminar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listarComponentes(req, res, next) {
  try {
    const resultado = await productosService.listarComponentes(req.validatedQuery ?? {});
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function crearComponente(req, res, next) {
  try {
    const componente = await productosService.crearComponente(req.body);
    res.status(201).json(componente);
  } catch (err) {
    next(err);
  }
}

async function actualizarComponente(req, res, next) {
  try {
    const componente = await productosService.actualizarComponente(req.params.id, req.body);
    res.status(200).json(componente);
  } catch (err) {
    next(err);
  }
}

async function eliminarComponente(req, res, next) {
  try {
    await productosService.eliminarComponente(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listarTraducciones(req, res, next) {
  try {
    const traducciones = await productosService.listarTraducciones(req.params.id);
    res.status(200).json(traducciones);
  } catch (err) {
    next(err);
  }
}

async function crearTraduccion(req, res, next) {
  try {
    const traduccion = await productosService.crearTraduccion(req.params.id, req.body);
    res.status(201).json(traduccion);
  } catch (err) {
    next(err);
  }
}

async function actualizarTraduccion(req, res, next) {
  try {
    const traduccion = await productosService.actualizarTraduccion(req.params.idTraduccion, req.body);
    res.status(200).json(traduccion);
  } catch (err) {
    next(err);
  }
}

async function eliminarTraduccion(req, res, next) {
  try {
    await productosService.eliminarTraduccion(req.params.idTraduccion);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarComponentes,
  crearComponente,
  actualizarComponente,
  eliminarComponente,
  listarTraducciones,
  crearTraduccion,
  actualizarTraduccion,
  eliminarTraduccion,
};
