import type { Prisma } from "@prisma/client";
import { aceptaRespuestas, transicionesDesde, type EstadoSolicitud } from "./servicioTecnico.estados";
import type { Software, TipoEquipo, TipoServicio } from "./servicioTecnico.catalogo";
import type { EventoHistorial, SolicitudDetalle, SolicitudResumen } from "./servicioTecnico.types";

const selectCliente = { id: true, nombreCompleto: true, correo: true, telefono: true } satisfies Prisma.UsuarioSelect;
const selectAutor = { nombreCompleto: true, rol: true } satisfies Prisma.UsuarioSelect;

export const includeResumenSolicitud = {
  usuario: { select: selectCliente },
  _count: { select: { respuestas: true } },
} satisfies Prisma.SolicitudServicioInclude;

export const includeDetalleSolicitud = {
  ...includeResumenSolicitud,
  respuestas: { include: { usuario: { select: selectAutor } } },
  historial: { include: { usuario: { select: selectAutor } } },
} satisfies Prisma.SolicitudServicioInclude;

type SolicitudConResumen = Prisma.SolicitudServicioGetPayload<{ include: typeof includeResumenSolicitud }>;
type SolicitudConDetalle = Prisma.SolicitudServicioGetPayload<{ include: typeof includeDetalleSolicitud }>;

const autor = (u: { nombreCompleto: string; rol: string }) => ({ nombre: u.nombreCompleto, esAdmin: u.rol === "ADMIN" });

export function mapearResumenSolicitud(s: SolicitudConResumen): SolicitudResumen {
  return {
    id: s.idSolicitud,
    servicios: s.servicios as TipoServicio[],
    tipoEquipo: s.tipoEquipo as TipoEquipo | null,
    software: s.software as Software[],
    conBackup: s.conBackup,
    conPastaTermica: s.conPastaTermica,
    descripcion: s.descripcion,
    estado: s.estado as EstadoSolicitud,
    fecha: s.fecha,
    actualizadoEn: s.actualizadoEn,
    cantidadRespuestas: s._count.respuestas,
    cliente: {
      id: s.usuario.id,
      nombre: s.usuario.nombreCompleto,
      correo: s.usuario.correo,
      telefono: s.usuario.telefono,
    },
  };
}

// Junta cambios de estado y respuestas en una sola linea de tiempo (del mas viejo al mas nuevo).
// Si coinciden en fecha, primero va el cambio de estado.
export function armarHistorial(s: Pick<SolicitudConDetalle, "historial" | "respuestas">): EventoHistorial[] {
  const eventos: EventoHistorial[] = [
    ...s.historial.map((h) => ({
      tipo: "estado" as const,
      id: h.idHistorial,
      fecha: h.fecha,
      estadoAnterior: h.estadoAnterior as EstadoSolicitud | null,
      estadoNuevo: h.estadoNuevo as EstadoSolicitud,
      autor: autor(h.usuario),
    })),
    ...s.respuestas.map((r) => ({
      tipo: "respuesta" as const,
      id: r.idRespuesta,
      fecha: r.fecha,
      mensaje: r.mensaje,
      autor: autor(r.usuario),
    })),
  ];
  const orden = (e: EventoHistorial) => (e.tipo === "estado" ? 0 : 1);
  return eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || orden(a) - orden(b) || a.id - b.id);
}

export function mapearDetalleSolicitud(s: SolicitudConDetalle, paraAdmin: boolean): SolicitudDetalle {
  return {
    ...mapearResumenSolicitud(s),
    historial: armarHistorial(s),
    aceptaRespuestas: aceptaRespuestas(s.estado),
    ...(paraAdmin && { transicionesPosibles: [...transicionesDesde(s.estado)] }),
  };
}
