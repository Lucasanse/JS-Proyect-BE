import { z } from "zod";

export const idServicioParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});

// PATCH /api/admin/servicios/:id  { precio?, activo? }  (al menos uno)
export const actualizarServicioSchema = z
  .object({
    precio: z.coerce
      .number({ error: "El precio debe ser un número" })
      .positive("El precio debe ser mayor a 0")
      .max(99_999_999.99, "El precio es demasiado alto")
      .optional(),
    activo: z.boolean({ error: "activo debe ser true o false" }).optional(),
  })
  .refine((d) => d.precio !== undefined || d.activo !== undefined, { message: "No hay nada para cambiar" });
