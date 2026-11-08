import { z } from "zod";

// POST /api/quotes: de donde salen los productos del presupuesto
//   { origen: "carrito" }
//   { origen: "preset", idPreset }               armado guardado del usuario
//   { origen: "armado", seleccion: [...] }       armado en curso, sin guardar (incluye los servicios)
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
      .min(1, "El armado no tiene componentes")
      .max(50)
      .refine((s) => new Set(s.map((c) => c.idProducto)).size === s.length, {
        message: "Hay productos repetidos en la selección",
      }),
  }),
]);

// :id en la URL (presupuesto o pedido)
export const idDocumentoParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
