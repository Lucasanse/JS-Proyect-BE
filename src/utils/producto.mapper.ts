import type { Prisma } from '@prisma/client';
import type { ProductoDetalle, ProductoResumen } from './catalogo.types';

// ─── Includes de Prisma ───────────────────────────────────────────────
// Se definen con "satisfies" para que Prisma infiera el tipo exacto del resultado
// (ProductoGetPayload) y los mappers no tengan que usar "any" ni casteos.

export const includeResumen = {
  categoria: true,
  componentePC: { select: { tipoComponente: { select: { nombre: true } } } },
} satisfies Prisma.ProductoInclude;

export const includeDetalle = {
  categoria: true,
  componentePC: {
    include: {
      tipoComponente: true,
      valoresAtributo: { include: { atributo: true }, orderBy: { idAtributo: 'asc' } },
    },
  },
} satisfies Prisma.ProductoInclude;

type ProductoConResumen = Prisma.ProductoGetPayload<{ include: typeof includeResumen }>;
type ProductoConDetalle = Prisma.ProductoGetPayload<{ include: typeof includeDetalle }>;

// ─── Mappers: modelo de Prisma -> DTO de respuesta ───────────────────

function mapearCamposComunes(p: ProductoConResumen | ProductoConDetalle) {
  return {
    id: p.idProducto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: p.marca,
    precio: p.precio.toNumber(),
    stock: p.stock,
    disponible: p.stock > 0,
    categoria: { id: p.categoria.idCategoria, nombre: p.categoria.nombre },
  };
}

export function mapearResumen(p: ProductoConResumen): ProductoResumen {
  const comunes = mapearCamposComunes(p);
  return p.componentePC
    ? { ...comunes, esComponentePC: true, tipoComponente: p.componentePC.tipoComponente.nombre }
    : { ...comunes, esComponentePC: false, tipoComponente: null };
}

export function mapearDetalle(p: ProductoConDetalle): ProductoDetalle {
  const comunes = mapearCamposComunes(p);
  if (!p.componentePC) return { ...comunes, esComponentePC: false, componentePC: null };

  return {
    ...comunes,
    esComponentePC: true,
    componentePC: {
      tipo: p.componentePC.tipoComponente.nombre,
      wattsRequeridos: p.componentePC.wattsRequeridos,
      atributos: p.componentePC.valoresAtributo.map((v) => ({
        nombre: v.atributo.nombre,
        valor: v.valor,
        unidad: v.atributo.unidad,
      })),
    },
  };
}
