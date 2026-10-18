import { AppError } from "./AppError";

// Estados de una solicitud de servicio tecnico, en el orden en que avanza el proceso.
// Se guardan como String en la base (igual que Venta.estado); los valores validos son estos.
// ESPERANDO_EQUIPO: el admin ya vio la solicitud y espera que el cliente traiga el equipo.
// RECHAZADA: el comercio no va a hacer el trabajo; el admin tiene que explicarle el motivo al cliente.
export const ESTADOS_SOLICITUD = [
  "PENDIENTE",
  "ESPERANDO_EQUIPO",
  "EN_REVISION",
  "EN_REPARACION",
  "RESUELTA",
  "RECHAZADA",
  "CERRADA",
] as const;

export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

// A que estados se puede pasar desde cada uno.
// - Se puede cerrar en cualquier momento (ej. el cliente desiste).
// - Cuando llega el equipo se revisa, o se repara directo si el problema ya estaba claro.
// - Desde EN_REVISION se puede pedir el equipo si se empezo a revisar a distancia.
// - Desde EN_REPARACION se puede volver a EN_REVISION si hace falta otro diagnostico.
// - Una RESUELTA se puede reabrir (EN_REPARACION) si el equipo vuelve a fallar.
// - Se puede rechazar mientras el trabajo no este terminado (hasta EN_REPARACION).
// - RECHAZADA y CERRADA son finales.
export const TRANSICIONES: Record<EstadoSolicitud, readonly EstadoSolicitud[]> = {
  PENDIENTE: ["ESPERANDO_EQUIPO", "EN_REVISION", "RECHAZADA", "CERRADA"],
  ESPERANDO_EQUIPO: ["EN_REVISION", "EN_REPARACION", "RECHAZADA", "CERRADA"],
  EN_REVISION: ["ESPERANDO_EQUIPO", "EN_REPARACION", "RESUELTA", "RECHAZADA", "CERRADA"],
  EN_REPARACION: ["EN_REVISION", "RESUELTA", "RECHAZADA", "CERRADA"],
  RESUELTA: ["EN_REPARACION", "CERRADA"],
  RECHAZADA: [],
  CERRADA: [],
};

// Estados que ya no cambian ni aceptan respuestas
export const ESTADOS_FINALES: readonly EstadoSolicitud[] = ["RECHAZADA", "CERRADA"];

export const ESTADO_INICIAL: EstadoSolicitud = "PENDIENTE";

export const esEstadoSolicitud = (valor: string): valor is EstadoSolicitud =>
  (ESTADOS_SOLICITUD as readonly string[]).includes(valor);

// Estados a los que se puede pasar desde "actual" (vacio si es final o desconocido)
export const transicionesDesde = (actual: string): readonly EstadoSolicitud[] =>
  esEstadoSolicitud(actual) ? TRANSICIONES[actual] : [];

export const puedeTransicionar = (desde: string, hacia: string) =>
  (transicionesDesde(desde) as readonly string[]).includes(hacia);

// Las solicitudes rechazadas o cerradas ya no se pueden responder
export const aceptaRespuestas = (estado: string) => !(ESTADOS_FINALES as readonly string[]).includes(estado);

// Lanza 409 si el cambio de estado no esta permitido
export function validarTransicion(desde: string, hacia: EstadoSolicitud) {
  if (desde === hacia) throw new AppError(409, "La solicitud ya está en ese estado");
  if (!puedeTransicionar(desde, hacia)) {
    const posibles = transicionesDesde(desde);
    throw new AppError(
      409,
      posibles.length === 0
        ? `La solicitud está ${desde} y ya no se puede cambiar de estado`
        : `No se puede pasar de ${desde} a ${hacia}. Estados posibles: ${posibles.join(", ")}`,
    );
  }
}
