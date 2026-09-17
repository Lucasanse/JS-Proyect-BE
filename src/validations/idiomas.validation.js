const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const crearIdiomaSchema = z.object({
  body: z.object({
    codigo: z.string().min(1, 'codigo es requerido'),
    nombre: z.string().min(1, 'nombre es requerido'),
  }),
});

const actualizarIdiomaSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      codigo: z.string().min(1).optional(),
      nombre: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

module.exports = { idParamSchema, crearIdiomaSchema, actualizarIdiomaSchema };
