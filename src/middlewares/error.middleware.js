class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor unico', details: err.meta?.target });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Operacion invalida: la referencia indicada no existe, o el registro esta en uso por otros datos y no se puede eliminar',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Error interno del servidor' : err.message;

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message, ...(err.details ? { details: err.details } : {}) });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
