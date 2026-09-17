const { z } = require('zod');

const registroSchema = z.object({
  body: z.object({
    nombreCompleto: z.string().min(1, 'nombreCompleto es requerido'),
    correo: z.string().email('correo invalido'),
    password: z.string().min(6, 'password debe tener al menos 6 caracteres'),
    idIdioma: z.coerce.number().int().positive(),
    direccion: z.string().min(1).optional(),
    telefono: z.string().min(1).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    correo: z.string().email('correo invalido'),
    password: z.string().min(1, 'password es requerido'),
  }),
});

const olvidePasswordSchema = z.object({
  body: z.object({
    correo: z.string().email('correo invalido'),
  }),
});

const resetearPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'token es requerido'),
    nuevaPassword: z.string().min(6, 'nuevaPassword debe tener al menos 6 caracteres'),
  }),
});

module.exports = { registroSchema, loginSchema, olvidePasswordSchema, resetearPasswordSchema };
