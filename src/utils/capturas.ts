import crypto from "node:crypto";
import type { FotoIA } from "../lib/ia";

// Sesiones de captura: el admin genera un QR y desde el celular se suben fotos con ese token.
// Se guardan en memoria (no en la base) porque duran unos minutos y las fotos solo se usan
// para el analisis. Si se reinicia el servidor, se pierden y hay que generar otro QR.

export const MINUTOS_CAPTURA = 10;
// Desde el celular se pueden mandar mas fotos de las que se analizan (MAX_FOTOS_IA),
// asi se puede repetir alguna; en la PC se eligen cuales mandar a la IA.
export const MAX_FOTOS_CAPTURA = 10;

interface Captura {
  idUsuario: string; // admin que la creo: solo el puede ver y analizar las fotos
  expiraEn: number;
  fotos: FotoIA[];
  // true cuando el admin ya mandó el lote a analizar: el celular no puede subir más fotos,
  // pero las que hay se conservan hasta que se cierre el formulario
  cerrada: boolean;
}

const capturas = new Map<string, Captura>();

// Cada minuto se borran las vencidas, asi las fotos no quedan ocupando memoria
setInterval(() => {
  const ahora = Date.now();
  for (const [token, captura] of capturas) if (captura.expiraEn <= ahora) capturas.delete(token);
}, 60_000).unref();

// Cada admin tiene una sola captura activa: al crear una nueva se descarta la anterior
export function crearCaptura(idUsuario: string) {
  for (const [token, captura] of capturas) if (captura.idUsuario === idUsuario) capturas.delete(token);

  const token = crypto.randomBytes(24).toString("base64url"); // 32 caracteres, imposible de adivinar
  const captura: Captura = { idUsuario, expiraEn: Date.now() + MINUTOS_CAPTURA * 60_000, fotos: [], cerrada: false };
  capturas.set(token, captura);
  return { token, captura };
}

// null si el token no existe o ya vencio
export function buscarCaptura(token: string): Captura | null {
  const captura = capturas.get(token);
  if (!captura) return null;
  if (captura.expiraEn <= Date.now()) {
    capturas.delete(token);
    return null;
  }
  return captura;
}

export function borrarCaptura(token: string) {
  capturas.delete(token);
}
