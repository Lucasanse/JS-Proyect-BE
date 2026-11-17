import { z } from "zod";

// 21, 10,5 o 0 (exento)
const alicuotaIva = z.coerce
  .number({ error: "Elegí la alícuota de IVA" })
  .refine((a) => a === 21 || a === 10.5 || a === 0, { message: "La alícuota de IVA tiene que ser 21, 10,5 o 0 (exento)" });

// POST /api/admin/servicios/programas  { nombre, precio }
export const crearProgramaSchema = z.object({
  nombre: z.string({ error: "Escribí el nombre del programa" }).trim().min(2, "Escribí el nombre del programa").max(60),
  precio: z.coerce
    .number({ error: "El precio debe ser un número" })
    .min(0, "El precio no puede ser negativo")
    .max(99_999_999.99, "El precio es demasiado alto"),
  ivaIncluido: z.boolean({ error: "ivaIncluido debe ser true o false" }).default(false),
  alicuotaIva: alicuotaIva.default(21),
});

export const idServicioParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});

// PATCH /api/admin/servicios/:id  { precio?, activo?, ivaIncluido?, alicuotaIva? }  (al menos uno)
export const actualizarServicioSchema = z
  .object({
    precio: z.coerce
      .number({ error: "El precio debe ser un número" })
      .min(0, "El precio no puede ser negativo")
      .max(99_999_999.99, "El precio es demasiado alto")
      .optional(),
    activo: z.boolean({ error: "activo debe ser true o false" }).optional(),
    ivaIncluido: z.boolean({ error: "ivaIncluido debe ser true o false" }).optional(),
    alicuotaIva: alicuotaIva.optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No hay nada para cambiar" });
