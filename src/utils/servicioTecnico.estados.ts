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

// El admin puede pasar la solicitud al estado que quiera, sin seguir un orden
// (ej. reabrir una cerrada o volver a pendiente). Lo unico que no se puede es "pasar" al mismo estado.
export const TRANSICIONES = {} as Record<EstadoSolicitud, readonly EstadoSolicitud[]>;
for (const desde of ESTADOS_SOLICITUD) {
  TRANSICIONES[desde] = ESTADOS_SOLICITUD.filter((hacia) => hacia !== desde);
}

// Estados que terminan la solicitud: mientras este en uno de estos no acepta respuestas
// (para responder hay que reabrirla cambiandole el estado).
export const ESTADOS_FINALES: readonly EstadoSolicitud[] = ["RECHAZADA", "CERRADA"];

export const ESTADO_INICIAL: EstadoSolicitud = "PENDIENTE";

export const esEstadoSolicitud = (valor: string): valor is EstadoSolicitud =>
  (ESTADOS_SOLICITUD as readonly string[]).includes(valor);

// Estados a los que se puede pasar desde "actual". Si en la base quedo un estado que ya no existe,
// se puede pasar a cualquiera de los validos para corregirlo.
export const transicionesDesde = (actual: string): readonly EstadoSolicitud[] =>
  esEstadoSolicitud(actual) ? TRANSICIONES[actual] : ESTADOS_SOLICITUD;

export const puedeTransicionar = (desde: string, hacia: string) =>
  (transicionesDesde(desde) as readonly string[]).includes(hacia);

// Las solicitudes rechazadas o cerradas no se pueden responder
export const aceptaRespuestas = (estado: string) => !(ESTADOS_FINALES as readonly string[]).includes(estado);

// Lanza 409 si el cambio de estado no esta permitido (solo pasa si ya esta en ese estado)
export function validarTransicion(desde: string, hacia: EstadoSolicitud) {
  if (!puedeTransicionar(desde, hacia)) throw new AppError(409, "La solicitud ya está en ese estado");
}
