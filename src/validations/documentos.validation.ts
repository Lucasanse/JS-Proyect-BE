import { z } from "zod";
import { serviciosSchema } from "./armador.validation";

// POST /api/quotes: de donde salen los productos del presupuesto
//   { origen: "carrito" }
//   { origen: "preset", idPreset }               armado guardado del usuario
//   { origen: "armado", seleccion: [...], servicios: [ids] }  armado en curso, sin guardar, con los servicios elegidos
export const generarPresupuestoSchema = z.discriminatedUnion("origen", [
  z.object({ origen: z.literal("carrito") }),
  z.object({ origen: z.literal("preset"), idPreset: z.coerce.number().int().min(1) }),
  z.object({
    origen: z.literal("armado"),
    seleccion: z
      .array(
        z.object({
          idProducto: z.coerce.number().int().min(1),
          cantidad: z.coerce.number().int().min(1).max(99).default(1),
        }),
      )
      .max(50)
      .refine((s) => new Set(s.map((c) => c.idProducto)).size === s.length, {
        message: "Hay productos repetidos en la selección",
      }),
    servicios: serviciosSchema,
  }).refine((d) => d.seleccion.length + d.servicios.length > 0, { message: "El armado no tiene componentes" }),
]);

// :id en la URL (presupuesto o pedido)
export const idDocumentoParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
