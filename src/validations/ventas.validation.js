const { z } = require('zod');

const ESTADOS_VENTA = ['PENDIENTE', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA'];

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const listarVentasSchema = z.object({
  query: z.object({
    estado: z.enum(ESTADOS_VENTA).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const actualizarEstadoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    estado: z.enum(ESTADOS_VENTA),
  }),
});

module.exports = { ESTADOS_VENTA, idParamSchema, listarVentasSchema, actualizarEstadoSchema };
