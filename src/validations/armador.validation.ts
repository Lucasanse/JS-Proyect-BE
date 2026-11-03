import { z } from "zod";
import { PASO_PERIFERICOS, TIPOS_ARMADOR } from "../utils/armador.compatibilidad";

// Un componente por paso, varios discos y, en el paso opcional, varios perifericos
const MAXIMO_PRODUCTOS = TIPOS_ARMADOR.length + 20;

// Lo que el usuario eligio hasta ahora: un producto por paso del armador (varios en almacenamiento), mas los perifericos.
// cantidad sirve para la memoria (ej. 2 modulos), el almacenamiento y los perifericos (ej. 2 monitores).
const seleccionSchema = z
  .array(
    z.object({
      idProducto: z.coerce.number().int().min(1),
      cantidad: z.coerce.number().int().min(1).max(8).default(1),
    }),
  )
  .max(MAXIMO_PRODUCTOS)
  .refine((s) => new Set(s.map((c) => c.idProducto)).size === s.length, {
    message: "Hay productos repetidos en la selección",
  });

// ?lang= para traer los nombres traducidos (igual que /api/productos)
export const langQuerySchema = z.object({
  lang: z.string().trim().toLowerCase().default("es"),
});

// POST /api/armador/compatibles
export const compatiblesSchema = z.object({
  seleccion: seleccionSchema.default([]),
  tipo: z.enum([...TIPOS_ARMADOR, PASO_PERIFERICOS]),
});

// POST /api/armador/validar, /fuente-sugerida y /carrito
export const seleccionBodySchema = z.object({
  seleccion: seleccionSchema,
});

// POST /api/armador/presets
export const guardarPresetSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  seleccion: seleccionSchema.refine((s) => s.length > 0, { message: "El armado no tiene componentes" }),
});

// :id en la URL
export const idPresetParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
