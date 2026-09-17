const { z } = require('zod');

const idProductoParamSchema = z.object({
  params: z.object({
    idProducto: z.coerce.number().int().positive(),
  }),
});

const agregarFavoritoSchema = z.object({
  body: z.object({
    idProducto: z.coerce.number().int().positive(),
  }),
});

module.exports = { idProductoParamSchema, agregarFavoritoSchema };
