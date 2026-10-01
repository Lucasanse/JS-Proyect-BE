import type { Prisma } from '@prisma/client';
import type { ProductoResumen } from './catalogo.types';

// ─── Include de Prisma ────────────────────────────────────────────────
// Se define con "satisfies" para que Prisma infiera el tipo exacto del resultado
// (ProductoGetPayload) y el mapper no tenga que usar "any" ni casteos.

export const includeResumen = {
  categoria: true,
  componentePC: { select: { tipoComponente: { select: { nombre: true } } } },
} satisfies Prisma.ProductoInclude;

type ProductoConResumen = Prisma.ProductoGetPayload<{ include: typeof includeResumen }>;

// ─── Mapper: modelo de Prisma -> DTO de respuesta ────────────────────

export function mapearResumen(p: ProductoConResumen): ProductoResumen {
  const comunes = {
    id: p.idProducto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: p.marca,
    precio: p.precio.toNumber(),
    stock: p.stock,
    imagenUrl: p.imagenUrl,
    disponible: p.stock > 0,
    categoria: { id: p.categoria.idCategoria, nombre: p.categoria.nombre },
  };
  return p.componentePC
    ? { ...comunes, esComponentePC: true, tipoComponente: p.componentePC.tipoComponente.nombre }
    : { ...comunes, esComponentePC: false, tipoComponente: null };
}
