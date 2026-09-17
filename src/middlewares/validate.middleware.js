const { ApiError } = require('./error.middleware');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ApiError(400, 'Datos invalidos', details));
    }

    if (result.data.body) req.body = result.data.body;
    // req.query es de solo lectura en Express 5, no se puede reasignar directamente
    if (result.data.query) req.validatedQuery = result.data.query;
    if (result.data.params) req.params = result.data.params;

    next();
  };
}

module.exports = { validate };
