export type IdiomaNotificacion = "es" | "en";

// A que entidad apunta la notificacion (para que el FE lleve a la compra o solicitud)
export type TipoReferencia = "VENTA" | "SOLICITUD" | "DOCUMENTO";
// PRESET no tiene FK: solo se expone en la respuesta (el id se guarda en datos)
export type TipoReferenciaRespuesta = TipoReferencia | "PRESET";

export interface ReferenciaNotificacion {
  tipo: TipoReferenciaRespuesta;
  id: number;
  // Ruta del FE a la que lleva la notificacion (ej. /servicio-tecnico/12)
  enlace: string;
}

export interface NotificacionDTO {
  id: number;
  tipo: string; // codigo del tipo: VENTA_CONFIRMADA, SOLICITUD_ESTADO, NOVEDAD...
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: Date;
  referencia: ReferenciaNotificacion | null;
  // Presupuesto o factura: el FE lo descarga directo desde la notificacion
  documento: {
    id: number;
    tipo: string; // PRESUPUESTO | FACTURA
    numero: string;
    idVenta: number | null;
  } | null;
}

export interface ListadoNotificaciones {
  items: NotificacionDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  noLeidas: number;
}
