const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const listarProductosSchema = z.object({
  query: z.object({
    idCategoria: z.coerce.number().int().positive().optional(),
    marca: z.string().min(1).optional(),
    search: z.string().min(1).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const crearProductoSchema = z.object({
  body: z.object({
    idCategoria: z.coerce.number().int().positive(),
    nombre: z.string().min(1, 'nombre es requerido'),
    marca: z.string().min(1, 'marca es requerida'),
    precio: z.coerce.number().positive('precio debe ser mayor a 0'),
    stock: z.coerce.number().int().min(0, 'stock no puede ser negativo'),
  }),
});

const actualizarProductoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      idCategoria: z.coerce.number().int().positive().optional(),
      nombre: z.string().min(1).optional(),
      marca: z.string().min(1).optional(),
      precio: z.coerce.number().positive().optional(),
      stock: z.coerce.number().int().min(0).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

const listarComponentesSchema = z.object({
  query: z.object({
    tipoComponente: z.string().min(1).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const crearComponenteSchema = z.object({
  body: z.object({
    idCategoria: z.coerce.number().int().positive(),
    nombre: z.string().min(1, 'nombre es requerido'),
    marca: z.string().min(1, 'marca es requerida'),
    precio: z.coerce.number().positive('precio debe ser mayor a 0'),
    stock: z.coerce.number().int().min(0, 'stock no puede ser negativo'),
    tipoComponente: z.string().min(1, 'tipoComponente es requerido'),
    socket: z.string().min(1, 'socket es requerido'),
    wattsRequeridos: z.coerce.number().int().positive('wattsRequeridos debe ser mayor a 0'),
  }),
});

const actualizarComponenteSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      idCategoria: z.coerce.number().int().positive().optional(),
      nombre: z.string().min(1).optional(),
      marca: z.string().min(1).optional(),
      precio: z.coerce.number().positive().optional(),
      stock: z.coerce.number().int().min(0).optional(),
      tipoComponente: z.string().min(1).optional(),
      socket: z.string().min(1).optional(),
      wattsRequeridos: z.coerce.number().int().positive().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

const crearTraduccionSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    idIdioma: z.coerce.number().int().positive(),
    nombreTraducido: z.string().min(1, 'nombreTraducido es requerido'),
    descripcionTraducida: z.string().min(1, 'descripcionTraducida es requerido'),
  }),
});

const actualizarTraduccionSchema = z.object({
  params: z.object({
    idTraduccion: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      nombreTraducido: z.string().min(1).optional(),
      descripcionTraducida: z.string().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'Debe enviar al menos un campo' }),
});

const idTraduccionParamSchema = z.object({
  params: z.object({
    idTraduccion: z.coerce.number().int().positive(),
  }),
});

module.exports = {
  idParamSchema,
  listarProductosSchema,
  crearProductoSchema,
  actualizarProductoSchema,
  listarComponentesSchema,
  crearComponenteSchema,
  actualizarComponenteSchema,
  crearTraduccionSchema,
  actualizarTraduccionSchema,
  idTraduccionParamSchema,
};
