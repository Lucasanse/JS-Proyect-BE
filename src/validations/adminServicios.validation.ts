import { z } from "zod";

// POST /api/admin/servicios/programas  { nombre, precio }
export const crearProgramaSchema = z.object({
  nombre: z.string({ error: "Escribí el nombre del programa" }).trim().min(2, "Escribí el nombre del programa").max(60),
  precio: z.coerce
    .number({ error: "El precio debe ser un número" })
    .min(0, "El precio no puede ser negativo")
    .max(99_999_999.99, "El precio es demasiado alto"),
});

export const idServicioParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});

// PATCH /api/admin/servicios/:id  { precio?, activo? }  (al menos uno)
export const actualizarServicioSchema = z
  .object({
    precio: z.coerce
      .number({ error: "El precio debe ser un número" })
      .min(0, "El precio no puede ser negativo")
      .max(99_999_999.99, "El precio es demasiado alto")
      .optional(),
    activo: z.boolean({ error: "activo debe ser true o false" }).optional(),
  })
  .refine((d) => d.precio !== undefined || d.activo !== undefined, { message: "No hay nada para cambiar" });
