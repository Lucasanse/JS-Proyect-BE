import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { formatearNumero } from "./documentos";
import { enviarAUsuario, estaConectado } from "./notificaciones.tiempoReal";
import type {
  IdiomaNotificacion,
  NotificacionDTO,
  ReferenciaNotificacion,
  TipoReferencia,
} from "./notificaciones.types";

// Centro de notificaciones: alta (createNotification), formato para el FE y aviso en tiempo real.
// Crear una notificacion nunca corta el flujo que la dispara: si falla, solo se loguea.

export const includeNotificacion = {
  tipoNotificacion: true,
  venta: { select: { idVenta: true, total: true } },
  solicitud: { select: { idSolicitud: true } },
  documento: { select: { idDocumento: true, numero: true, idVenta: true, tipo: true } },
} satisfies Prisma.NotificacionInclude;

type NotificacionCompleta = Prisma.NotificacionGetPayload<{ include: typeof includeNotificacion }>;

export const esIdiomaNotificacion = (valor: unknown): valor is IdiomaNotificacion =>
  valor === "es" || valor === "en";

// Nombre de los estados (servicio tecnico y compras) para el mensaje (mismos textos que el FE)
const NOMBRES_ESTADO: Record<IdiomaNotificacion, Record<string, string>> = {
  es: {
    Pagado: "Pagado",
    "En preparacion": "En preparación",
    "Listo para entregar": "Listo para retirar",
    Retirado: "Retirado",
    Cancelado: "Cancelado",
    PENDIENTE: "Pendiente",
    ESPERANDO_EQUIPO: "Esperando el equipo",
    EN_REVISION: "En revisión",
    EN_REPARACION: "En reparación",
    RESUELTA: "Resuelta",
    RECHAZADA: "Rechazada",
    CERRADA: "Cerrada",
  },
  en: {
    Pagado: "Paid",
    "En preparacion": "Being prepared",
    "Listo para entregar": "Ready for pickup",
    Retirado: "Picked up",
    Cancelado: "Cancelled",
    PENDIENTE: "Pending",
    ESPERANDO_EQUIPO: "Waiting for device",
    EN_REVISION: "Under review",
    EN_REPARACION: "Being repaired",
    RESUELTA: "Resolved",
    RECHAZADA: "Rejected",
    CERRADA: "Closed",
  },
};

// Reemplaza {clave} por su valor; las claves que no estan quedan como estan
const completarPlantilla = (plantilla: string, valores: Record<string, string | undefined>) =>
  plantilla.replace(/\{(\w+)\}/g, (original, clave: string) => valores[clave] ?? original);

function referenciaDe(n: NotificacionCompleta): ReferenciaNotificacion | null {
  // Los presets no tienen FK en la notificacion: el id va en datos
  const idPreset = (n.datos as Record<string, unknown> | null)?.idPreset;
  if (typeof idPreset === "number") return { tipo: "PRESET", id: idPreset, enlace: "/presets" };
  if (n.idVenta) return { tipo: "VENTA", id: n.idVenta, enlace: `/misCompras#venta-${n.idVenta}` };
  if (n.idSolicitud) return { tipo: "SOLICITUD", id: n.idSolicitud, enlace: `/servicio-tecnico/${n.idSolicitud}` };
  if (n.documento) {
    const { idDocumento, tipo, idVenta } = n.documento;
    const enlace = tipo === "FACTURA" && idVenta ? `/misCompras#venta-${idVenta}` : "/mis-presupuestos";
    return { tipo: "DOCUMENTO", id: idDocumento, enlace };
  }
  return null;
}

export function formatearNotificacion(n: NotificacionCompleta, lang: IdiomaNotificacion): NotificacionDTO {
  const tipo = n.tipoNotificacion;
  const datos = (n.datos ?? {}) as Record<string, unknown>;
  const estado = typeof datos.estado === "string" ? datos.estado : undefined;

  const valores: Record<string, string | undefined> = {
    idVenta: String(n.venta?.idVenta ?? n.documento?.idVenta ?? ""),
    total: n.venta?.total.toString(),
    idSolicitud: n.solicitud ? String(n.solicitud.idSolicitud) : undefined,
    numero: n.documento ? formatearNumero(n.documento.numero) : undefined,
    nombre: typeof datos.nombre === "string" ? datos.nombre : undefined,
    estado: estado ? (NOMBRES_ESTADO[lang][estado] ?? estado) : undefined,
  };

  const plantillaMensaje = (lang === "en" && tipo.plantillaMensajeEN) || tipo.plantillaMensaje;
  const plantillaTitulo = (lang === "en" && tipo.plantillaTituloEN) || tipo.plantillaTitulo || "";

  return {
    id: n.idNotificacion,
    tipo: tipo.codigo,
    titulo: n.titulo ?? completarPlantilla(plantillaTitulo, valores),
    // Texto libre (novedades) o la plantilla del tipo completada
    mensaje: n.mensaje ?? completarPlantilla(plantillaMensaje, valores),
    leida: n.leida,
    fecha: n.fecha,
    referencia: referenciaDe(n),
    documento: n.documento
      ? {
          id: n.documento.idDocumento,
          tipo: n.documento.tipo,
          numero: formatearNumero(n.documento.numero),
          idVenta: n.documento.idVenta,
        }
      : null,
  };
}

export const contarNoLeidas = (idUsuario: number) =>
  prisma.notificacion.count({ where: { idUsuario, leida: false } });

// Avisa a las pestañas abiertas del usuario cuantas no leidas tiene
export async function emitirContador(idUsuario: number) {
  if (!estaConectado(idUsuario)) return;
  enviarAUsuario(idUsuario, "contador", { noLeidas: await contarNoLeidas(idUsuario) });
}

async function emitirNueva(idNotificacion: number, idUsuario: number) {
  if (!estaConectado(idUsuario)) return;
  const completa = await prisma.notificacion.findUnique({
    where: { idNotificacion },
    include: includeNotificacion,
  });
  if (!completa) return;
  enviarAUsuario(idUsuario, "notificacion", (lang: IdiomaNotificacion) => formatearNotificacion(completa, lang));
  await emitirContador(idUsuario);
}

const COLUMNA_REFERENCIA: Record<TipoReferencia, "idVenta" | "idSolicitud" | "idDocumento"> = {
  VENTA: "idVenta",
  SOLICITUD: "idSolicitud",
  DOCUMENTO: "idDocumento",
};

export interface NuevaNotificacion {
  idUsuario: number;
  codigo: string; // codigo del TipoNotificacion (ver seed)
  referencia?: { tipo: TipoReferencia; id: number };
  // Texto libre; si no se pasan se usan las plantillas del tipo
  titulo?: string;
  mensaje?: string;
  // Valores extra para la plantilla (ej. { estado: "EN_REPARACION" })
  datos?: Record<string, string | number>;
  // No la crea si ya hay una del mismo tipo para la misma referencia
  // (Mercado Pago avisa varias veces el mismo pago)
  unaPorReferencia?: boolean;
}

// Servicio interno reutilizable: crea la notificacion y la envia en tiempo real.
// Devuelve la notificacion creada, o null si no se creo. Nunca lanza.
export async function createNotification(nueva: NuevaNotificacion) {
  try {
    const tipo = await prisma.tipoNotificacion.findUnique({ where: { codigo: nueva.codigo } });
    if (!tipo) {
      console.error(`No se generó la notificación: falta el tipo '${nueva.codigo}' en la BD.`);
      return null;
    }

    const referencia = nueva.referencia
      ? { [COLUMNA_REFERENCIA[nueva.referencia.tipo]]: nueva.referencia.id }
      : {};

    if (nueva.unaPorReferencia) {
      const existente = await prisma.notificacion.findFirst({
        where: { idUsuario: nueva.idUsuario, idTipoNotificacion: tipo.idTipoNotificacion, ...referencia },
        select: { idNotificacion: true },
      });
      if (existente) return null;
    }

    const notificacion = await prisma.notificacion.create({
      data: {
        idUsuario: nueva.idUsuario,
        idTipoNotificacion: tipo.idTipoNotificacion,
        ...referencia,
        titulo: nueva.titulo,
        mensaje: nueva.mensaje,
        datos: nueva.datos,
      },
    });

    await emitirNueva(notificacion.idNotificacion, nueva.idUsuario);
    return notificacion;
  } catch (error) {
    console.error(`Error al guardar la notificación '${nueva.codigo}':`, error);
    return null;
  }
}

// --- Disparadores ---

// Pago acreditado (webhook de Mercado Pago)
export const crearNotificacionCompra = (idUsuario: number, idVenta: number) =>
  createNotification({
    idUsuario,
    codigo: "VENTA_CONFIRMADA",
    referencia: { tipo: "VENTA", id: idVenta },
    unaPorReferencia: true,
  });

// Presupuesto o factura disponible
export const crearNotificacionDocumento = (documento: { idDocumento: number; idUsuario: number; tipo: string }) =>
  createNotification({
    idUsuario: documento.idUsuario,
    codigo: documento.tipo === "FACTURA" ? "FACTURA_DISPONIBLE" : "PRESUPUESTO_DISPONIBLE",
    referencia: { tipo: "DOCUMENTO", id: documento.idDocumento },
  });

// Cambio de estado de una solicitud de servicio tecnico
export const crearNotificacionEstadoSolicitud = (idUsuario: number, idSolicitud: number, estado: string) =>
  createNotification({
    idUsuario,
    codigo: "SOLICITUD_ESTADO",
    referencia: { tipo: "SOLICITUD", id: idSolicitud },
    datos: { estado },
  });

// El admin cambia el estado de una compra (en preparacion, listo para retirar...)
export const crearNotificacionEstadoVenta = (idUsuario: number, idVenta: number, estado: string) =>
  createNotification({
    idUsuario,
    codigo: "VENTA_ESTADO",
    referencia: { tipo: "VENTA", id: idVenta },
    datos: { estado },
  });

// El usuario guarda un armado (preset) del armador de PC
export const crearNotificacionPreset = (idUsuario: number, idPreset: number, nombre: string) =>
  createNotification({ idUsuario, codigo: "PRESET_CREADO", datos: { idPreset, nombre } });

// Novedades generales: a los usuarios indicados o, si no se indican, a todos los habilitados.
// Devuelve cuantas se crearon.
export async function crearNovedad(titulo: string, mensaje: string, idUsuarios?: number[]) {
  const tipo = await prisma.tipoNotificacion.findUnique({ where: { codigo: "NOVEDAD" } });
  if (!tipo) throw new Error("Falta el tipo de notificación 'NOVEDAD' en la BD.");

  const destinatarios = await prisma.usuario.findMany({
    where: { habilitado: true, ...(idUsuarios ? { id: { in: idUsuarios } } : {}) },
    select: { id: true },
  });

  const creadas = await prisma.notificacion.createManyAndReturn({
    data: destinatarios.map(({ id }) => ({
      idUsuario: id,
      idTipoNotificacion: tipo.idTipoNotificacion,
      titulo,
      mensaje,
    })),
    select: { idNotificacion: true, idUsuario: true },
  });

  // Solo a los que estan conectados ahora; el resto la ve al entrar
  for (const { idNotificacion, idUsuario } of creadas) {
    emitirNueva(idNotificacion, idUsuario).catch((error) =>
      console.error("No se pudo enviar la novedad en tiempo real:", error),
    );
  }
  return creadas.length;
}
