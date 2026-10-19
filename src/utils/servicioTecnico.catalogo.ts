// Que puede pedir el cliente en una solicitud de servicio tecnico.
// Se guardan como String en la base; los valores validos son estos.

// Se pueden pedir varios en la misma solicitud. El backup no es un servicio aparte:
// se pide como opcion del formateo (conBackup). Lo mismo el SSD con OPTIMIZACION (conSSD).
// LIMPIEZA es la limpieza externa del equipo. OPTIMIZACION: que la computadora ande mas rapido.
export const TIPOS_SERVICIO = [
  "REPARACION",
  "LIMPIEZA",
  "FORMATEO",
  "OPTIMIZACION",
  "INSTALACION_SOFTWARE",
  "OTRO",
] as const;
export type TipoServicio = (typeof TIPOS_SERVICIO)[number];

// Solo para REPARACION: que equipo hay que reparar
export const TIPOS_EQUIPO = ["PC_FIJA", "NOTEBOOK", "IMPRESORA"] as const;
export type TipoEquipo = (typeof TIPOS_EQUIPO)[number];

// Solo para INSTALACION_SOFTWARE: lo que se puede instalar
export const SOFTWARE = ["WIN10", "WIN11", "OFFICE", "WINRAR", "VLC"] as const;
export type Software = (typeof SOFTWARE)[number];

// Se instala un solo sistema operativo por equipo
export const SISTEMAS_OPERATIVOS: readonly Software[] = ["WIN10", "WIN11"];
