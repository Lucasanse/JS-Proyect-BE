const { z } = require('zod');

const ESTADOS_SOLICITUD = ['PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA'];

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const crearSolicitudSchema = z.object({
  body: z.object({
    descripcion: z.string().min(1, 'descripcion es requerida'),
    diagnosticoIA: z.string().min(1).optional(),
  }),
});

const listarSolicitudesSchema = z.object({
  query: z.object({
    estado: z.enum(ESTADOS_SOLICITUD).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const actualizarEstadoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    estado: z.enum(ESTADOS_SOLICITUD),
    diagnosticoIA: z.string().min(1).optional(),
  }),
});

module.exports = { ESTADOS_SOLICITUD, idParamSchema, crearSolicitudSchema, listarSolicitudesSchema, actualizarEstadoSchema };
