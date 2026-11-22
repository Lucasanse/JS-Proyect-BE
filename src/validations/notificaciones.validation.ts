import { z } from "zod";

const lang = z.enum(["es", "en"]).catch("es");

// GET /api/notifications?page=&limit=&soloNoLeidas=&lang=
export const listarNotificacionesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(10),
  soloNoLeidas: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  lang,
});

// GET /api/notifications/stream?lang=
export const streamQuerySchema = z.object({ lang });

export const idNotificacionParamSchema = z.object({
  id: z.coerce.number({ error: "ID de notificación inválido" }).int().positive("ID de notificación inválido"),
});

// POST /api/admin/notifications  { titulo, mensaje, idUsuarios? }
// Sin idUsuarios se envia a todos los usuarios habilitados.
export const crearNovedadSchema = z.object({
  titulo: z.string({ error: "Completá el título" }).trim().min(1, "Completá el título").max(120, "Máximo 120 caracteres"),
  mensaje: z.string({ error: "Completá el mensaje" }).trim().min(1, "Completá el mensaje").max(1000, "Máximo 1000 caracteres"),
  idUsuarios: z.array(z.number().int().positive()).min(1).optional(),
});
