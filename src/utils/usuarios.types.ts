import type { Paginado } from "./catalogo.types";
import type { EstadoSolicitud } from "./servicioTecnico.estados";
import type { TipoEquipo, TipoServicio } from "./servicioTecnico.catalogo";

// Listado: GET /api/admin/usuarios
export interface UsuarioAdminResumen {
  id: number;
  nombre: string;
  correo: string;
  rol: string; // "ADMIN" | "CLIENTE"
  habilitado: boolean;
  creadoEn: Date; // fecha de alta
}

// Detalle: GET /api/admin/usuarios/:id y respuesta de PATCH /api/admin/usuarios/:id/habilitado
export interface UsuarioAdminDetalle extends UsuarioAdminResumen {
  correoVerificado: boolean;
  telefono: string | null;
  direccion: string | null;
  cargo: string | null;
  idioma: string; // codigo: "es", "en"
  actualizadoEn: Date;
  cantidadCompras: number;
  cantidadSolicitudes: number;
  sesionesActivas: number;
  // Las ultimas (mas nuevas primero); el total esta en cantidadCompras / cantidadSolicitudes
  ultimasCompras: CompraDeUsuario[];
  ultimasSolicitudes: SolicitudDeUsuario[];
}

export interface CompraDeUsuario {
  id: number;
  fecha: Date;
  total: number;
  estado: string;
  cantidadProductos: number; // suma de unidades
}

export interface SolicitudDeUsuario {
  id: number;
  fecha: Date;
  estado: EstadoSolicitud;
  servicios: TipoServicio[];
  tipoEquipo: TipoEquipo | null;
}

export type ListadoUsuariosAdmin = Paginado<UsuarioAdminResumen>;
