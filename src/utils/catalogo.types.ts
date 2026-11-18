import type { ServicioResumen } from "./servicios";

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginado<T> {
  data: T[];
  paginacion: Paginacion;
}

export interface CategoriaResumen {
  id: number;
  nombre: string;
}

interface ProductoComun {
  id: number;
  nombre: string;
  descripcion: string;
  marca: string;
  precio: number; // en pesos, sin IVA
  precioFinal: number; // en pesos, con IVA (lo que se cobra)
  alicuotaIva: number; // 21 o 10.5
  stock: number;
  imagenUrl: string | null;
  categoria: CategoriaResumen;
}

export interface AtributoComponente {
  nombre: string;
  valor: string;
  unidad: string | null;
}

export type ProductoDetalle = ProductoComun &
  (
    | {
        esComponentePC: true;
        tipoComponente: string;
        wattsRequeridos: number;
        atributos: AtributoComponente[];
      }
    | {
        esComponentePC: false;
        tipoComponente: null;
        wattsRequeridos: null;
        atributos: [];
      }
  );

export type ProductoResumen = ProductoComun &
  (
    | { esComponentePC: true; tipoComponente: string }
    | { esComponentePC: false; tipoComponente: null }
  );

// /api/admin/productos: incluye los inactivos y la traduccion al ingles para editarla
export interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  marca: { id: number; nombre: string };
  precio: number; // en pesos
  monedaBase: "USD" | "ARS"; // moneda en la que queda fijo el precio
  precioUsd: number | null; // valor fijo en dolares (solo con monedaBase USD)
  ivaIncluido: boolean; // si "precio" y "precioUsd" incluyen el IVA
  alicuotaIva: number; // 21 o 10.5
  stock: number;
  imagenUrl: string | null;
  activo: boolean;
  categoria: CategoriaResumen;
  traduccionEn: { nombre: string; descripcion: string } | null;
  // null = no es un componente de PC
  componente: {
    idTipoComponente: number;
    tipo: string;
    wattsRequeridos: number;
    atributos: { idAtributo: number; valor: string }[];
  } | null;
}

// GET /api/admin/marcas. categorias = ids de las categorias donde la marca tiene productos
export interface MarcaAdmin {
  id: number;
  nombre: string;
  categorias: number[];
}

// GET /api/admin/tipos-componente
export interface TipoComponenteAdmin {
  id: number;
  nombre: string;
  // Categorias donde ya hay componentes de este tipo (para sugerir el tipo al elegir la categoria)
  categorias: number[];
  atributos: {
    id: number;
    nombre: string;
    unidad: string | null;
    numerico: boolean;
    opciones: string[]; // las del seed + los valores que ya se cargaron
  }[];
}

// GET /api/carrito
// Un item del carrito es un producto o un servicio del armador (armado de PC, instalacion de Windows...).
// Los servicios van una sola vez y no tienen stock.
// subtotal: sin IVA; subtotalFinal: con IVA
export type ItemCarritoDetalle =
  | { tipo: "PRODUCTO"; producto: ProductoResumen; servicio: null; cantidad: number; subtotal: number; subtotalFinal: number }
  | { tipo: "SERVICIO"; producto: null; servicio: ServicioResumen; cantidad: number; subtotal: number; subtotalFinal: number };

// subtotal (sin IVA) + iva = total (lo que se paga)
export interface CarritoDetalle {
  items: ItemCarritoDetalle[];
  cantidadTotal: number;
  subtotal: number;
  iva: number;
  total: number;
}
