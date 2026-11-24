import type { CategoriaResumen } from "./catalogo.types";

export interface FavoritoProducto {
  id: number;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  imagenUrl: string | null;
  disponible: boolean;
  categoria: CategoriaResumen;
}

export interface FavoritoItem {
  idFavorito: number;
  idProducto: number;
  fechaAgregado: Date;
  producto: FavoritoProducto;
}

export interface FavoritoAccionResponse {
  mensaje: string;
  idProducto: number;
  esFavorito: boolean;
}

// Inpusss

export interface FavoritoQuery {
  lang?: string;
}

export interface FavoritoBody {
  idProducto: number;
}

export interface FavoritoParams {
  idProducto: string;
}
