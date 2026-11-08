// Tipos de los presupuestos y facturas en PDF (modelo Documento).

export const TIPOS_DOCUMENTO = ["PRESUPUESTO", "FACTURA"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

// De donde salen los items: carrito, armado guardado, armado sin guardar o una venta (factura)
export type OrigenDocumento = "CARRITO" | "PRESET" | "ARMADO" | "VENTA";

// Copia de cada producto tal como estaba al emitir el documento (columna "items")
export interface ItemDocumento {
  idProducto: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

// Datos del cliente al emitir el documento (columna "cliente")
export interface ClienteDocumento {
  nombre: string;
  correo: string;
  direccion: string | null;
  telefono: string | null;
}

// Lo que necesita la plantilla para dibujar el PDF
export interface DatosPdf {
  tipo: TipoDocumento;
  numero: string; // ya formateado: 0001-00000012
  fecha: Date;
  cliente: ClienteDocumento;
  items: ItemDocumento[];
  total: number;
  referencia?: string; // ej. "Compra #12"
}

// Lo que se devuelve al FE (sin la ruta del archivo)
export interface DocumentoResumen {
  id: number;
  tipo: TipoDocumento;
  numero: string;
  fecha: string;
  origen: OrigenDocumento;
  idVenta: number | null;
  total: number;
  cantidadItems: number;
}
