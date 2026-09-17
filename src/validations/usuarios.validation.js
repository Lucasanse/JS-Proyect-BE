const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const actualizarPerfilSchema = z.object({
  body: z
    .object({
      nombreCompleto: z.string().min(1).optional(),
      direccion: z.string().min(1).optional(),
      telefono: z.string().min(1).optional(),
      idIdioma: z.coerce.number().int().positive().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

const listarUsuariosSchema = z.object({
  query: z.object({
    rol: z.enum(['ADMIN', 'CLIENTE']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const actualizarUsuarioAdminSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      nombreCompleto: z.string().min(1).optional(),
      correo: z.string().email().optional(),
      rol: z.enum(['ADMIN', 'CLIENTE']).optional(),
      cargo: z.string().min(1).nullable().optional(),
      direccion: z.string().min(1).nullable().optional(),
      telefono: z.string().min(1).nullable().optional(),
      idIdioma: z.coerce.number().int().positive().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

module.exports = { idParamSchema, actualizarPerfilSchema, listarUsuariosSchema, actualizarUsuarioAdminSchema };
