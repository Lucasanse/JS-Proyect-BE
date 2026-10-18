import type { EstadoSolicitud } from "./servicioTecnico.estados";
import type { Paginado } from "./catalogo.types";
import type { Software, TipoEquipo, TipoServicio } from "./servicioTecnico.catalogo";

export interface ClienteSolicitud {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
}

// Listados: GET /api/servicio-tecnico y GET /api/admin/servicio-tecnico
export interface SolicitudResumen {
  id: number;
  servicios: TipoServicio[]; // uno o varios
  tipoEquipo: TipoEquipo | null; // solo con REPARACION
  software: Software[]; // solo con INSTALACION_SOFTWARE
  conBackup: boolean; // solo con FORMATEO
  conPastaTermica: boolean; // solo con LIMPIEZA
  descripcion: string | null;
  estado: EstadoSolicitud;
  fecha: Date;
  actualizadoEn: Date;
  cantidadRespuestas: number;
  cliente: ClienteSolicitud;
}

export interface AutorEvento {
  nombre: string;
  esAdmin: boolean;
}

// Un cambio de estado o una respuesta del admin. El historial se devuelve
// ordenado del mas viejo al mas nuevo.
export type EventoHistorial =
  | {
      tipo: "estado";
      id: number;
      fecha: Date;
      estadoAnterior: EstadoSolicitud | null; // null = creacion de la solicitud
      estadoNuevo: EstadoSolicitud;
      autor: AutorEvento;
    }
  | {
      tipo: "respuesta";
      id: number;
      fecha: Date;
      mensaje: string;
      autor: AutorEvento;
    };

// Detalle: GET /api/servicio-tecnico/:id y GET /api/admin/servicio-tecnico/:id
export interface SolicitudDetalle extends SolicitudResumen {
  historial: EventoHistorial[];
  aceptaRespuestas: boolean;
  // Solo en el detalle del admin: estados a los que se puede pasar desde el actual
  transicionesPosibles?: EstadoSolicitud[];
}

// GET /api/admin/servicio-tecnico: ademas de la pagina, cuantas hay en cada estado
// (sin aplicar el filtro de estado, para mostrar los contadores en los filtros)
export interface ListadoSolicitudesAdmin extends Paginado<SolicitudResumen> {
  conteoPorEstado: Record<EstadoSolicitud, number>;
}
