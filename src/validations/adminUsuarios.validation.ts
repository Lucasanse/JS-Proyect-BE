import { z } from "zod";

// GET /api/admin/usuarios?q=&habilitado=&page=&limit=
export const listarUsuariosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Busca por nombre o correo
  q: z.string().trim().min(1).max(100).optional(),
  // Sin el parametro vienen todos
  habilitado: z
    .enum(["true", "false"], { error: "habilitado debe ser true o false" })
    .transform((v) => v === "true")
    .optional(),
});

export const idUsuarioParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});

// PATCH /api/admin/usuarios/:id/habilitado  { habilitado }
export const cambiarHabilitadoSchema = z.object({
  habilitado: z.boolean({ error: "habilitado debe ser true o false" }),
});
