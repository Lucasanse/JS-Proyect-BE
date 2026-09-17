const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const idComponenteParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    idComponente: z.coerce.number().int().positive(),
  }),
});

const crearPresetSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'nombre es requerido'),
    potenciaWatts: z.coerce.number().int().positive('potenciaWatts debe ser mayor a 0'),
  }),
});

const agregarComponenteSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    idProducto: z.coerce.number().int().positive(),
  }),
});

module.exports = { idParamSchema, idComponenteParamSchema, crearPresetSchema, agregarComponenteSchema };
