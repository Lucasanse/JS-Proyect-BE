const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const crearCategoriaSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'nombre es requerido'),
    tipo: z.string().min(1, 'tipo es requerido'),
  }),
});

const actualizarCategoriaSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      nombre: z.string().min(1).optional(),
      tipo: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

module.exports = { idParamSchema, crearCategoriaSchema, actualizarCategoriaSchema };
