const { z } = require('zod');

const idItemParamSchema = z.object({
  params: z.object({
    idItem: z.coerce.number().int().positive(),
  }),
});

const agregarItemSchema = z.object({
  body: z.object({
    idProducto: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive('cantidad debe ser mayor a 0'),
  }),
});

const actualizarItemSchema = z.object({
  params: z.object({
    idItem: z.coerce.number().int().positive(),
  }),
  body: z.object({
    cantidad: z.coerce.number().int().positive('cantidad debe ser mayor a 0'),
  }),
});

module.exports = { idItemParamSchema, agregarItemSchema, actualizarItemSchema };
