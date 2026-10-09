import { z } from "zod";

// campo: "el nombre", "la descripcion"... -> "Completa el nombre"
const texto = (campo: string, max: number) =>
  z
    .string({ error: `Completá ${campo}` })
    .trim()
    .min(1, `Completá ${campo}`)
    .max(max, `Máximo ${max} caracteres`);

// Nombre y descripcion en ingles. null = el producto no tiene traduccion (se borra si existia).
const traduccionSchema = z.object({
  nombre: texto("el nombre en inglés", 200),
  descripcion: texto("la descripción en inglés", 5000),
});

// "" se toma como "sin imagen". Solo se aceptan URLs http/https.
const imagenUrlSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.url({ protocol: /^https?$/, error: "La URL de la imagen no es válida" }).max(1000).nullable(),
);

// Datos de componente de PC. null = el producto no es un componente (se borran si existian).
// Los atributos sin valor no se mandan; que pertenezcan al tipo y que los numericos
// sean numeros se valida en el controller, porque depende de lo que hay en la base.
const componenteSchema = z.object({
  idTipoComponente: z.coerce.number({ error: "Elegí el tipo de componente" }).int().positive("Elegí el tipo de componente"),
  wattsRequeridos: z.coerce
    .number({ error: "El consumo debe ser un número" })
    .int("El consumo debe ser un número entero")
    .min(0, "El consumo no puede ser negativo")
    .max(2000, "El consumo es demasiado alto"),
  atributos: z
    .array(
      z.object({
        idAtributo: z.coerce.number().int().positive(),
        valor: z.string().trim().min(1, "Completá el valor").max(100, "Máximo 100 caracteres"),
      }),
    )
    .max(50)
    .refine((lista) => new Set(lista.map((a) => a.idAtributo)).size === lista.length, {
      message: "Hay atributos repetidos",
    })
    .default([]),
});

// POST /api/admin/productos y PUT /api/admin/productos/:id
export const productoSchema = z.object({
  nombre: texto("el nombre", 200),
  descripcion: texto("la descripción", 5000),
  idMarca: z.coerce.number({ error: "Elegí una marca" }).int().positive("Elegí una marca"),
  idCategoria: z.coerce.number({ error: "Elegí una categoría" }).int().positive("Elegí una categoría"),
  // Decimal(10, 2) en la base
  precio: z.coerce
    .number({ error: "El precio debe ser un número" })
    .positive("El precio debe ser mayor a 0")
    .max(99_999_999.99, "El precio es demasiado alto")
    .transform((p) => Math.round(p * 100) / 100),
  stock: z.coerce
    .number({ error: "El stock debe ser un número" })
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .max(1_000_000, "El stock es demasiado alto"),
  imagenUrl: imagenUrlSchema.default(null),
  traduccionEn: traduccionSchema.nullable().default(null),
  componente: componenteSchema.nullable().default(null),
});

// PATCH /api/admin/productos/:id  (solo los campos que se quieren cambiar)
export const productoParcialSchema = z
  .object({
    ...productoSchema.shape,
    imagenUrl: imagenUrlSchema,
    traduccionEn: traduccionSchema.nullable(),
    componente: componenteSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "No se envió ningún campo para modificar" });

export type ProductoInput = z.infer<typeof productoSchema>;
export type ProductoParcialInput = z.infer<typeof productoParcialSchema>;

// POST /api/admin/marcas
export const marcaSchema = z.object({
  nombre: texto("el nombre de la marca", 100),
});

// PATCH /api/admin/productos/:id/estado
export const estadoSchema = z.object({
  activo: z.boolean({ error: "activo debe ser true o false" }),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});

// GET /api/admin/productos?q=&estado=&categoria=&page=&limit=
export const listarAdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(100).optional(),
  categoria: z.coerce.number().int().min(1).optional(),
  estado: z.enum(["todos", "activos", "inactivos"]).default("todos"),
});
