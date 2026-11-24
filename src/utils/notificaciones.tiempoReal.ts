import type { Response } from "express";
import type { IdiomaNotificacion } from "./notificaciones.types";

// Entrega en tiempo real por SSE (Server-Sent Events).
// Cada usuario puede tener varias conexiones abiertas (pestañas, dispositivos):
// se guardan en memoria por idUsuario. Si el BE corre en varias instancias,
// esto habria que pasarlo a Redis pub/sub o similar.

interface Conexion {
  res: Response;
  lang: IdiomaNotificacion;
}

const conexiones = new Map<number, Set<Conexion>>();

// Registra la conexion del usuario y devuelve la funcion para quitarla
export function suscribir(idUsuario: number, res: Response, lang: IdiomaNotificacion) {
  const conexion: Conexion = { res, lang };
  let delUsuario = conexiones.get(idUsuario);
  if (!delUsuario) {
    delUsuario = new Set();
    conexiones.set(idUsuario, delUsuario);
  }
  delUsuario.add(conexion);

  return () => {
    delUsuario.delete(conexion);
    if (delUsuario.size === 0) conexiones.delete(idUsuario);
  };
}

export const estaConectado = (idUsuario: number) => conexiones.has(idUsuario);

// Escribe un evento SSE: "event: <nombre>\ndata: <json>\n\n"
export function escribirEvento(res: Response, evento: string, datos: unknown) {
  res.write(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`);
}

// Envia un evento a todas las conexiones del usuario. "datos" puede depender del idioma
// de cada conexion (el mensaje de la notificacion se arma en es o en).
export function enviarAUsuario(
  idUsuario: number,
  evento: string,
  datos: unknown | ((lang: IdiomaNotificacion) => unknown),
) {
  const delUsuario = conexiones.get(idUsuario);
  if (!delUsuario) return;
  for (const { res, lang } of delUsuario) {
    try {
      escribirEvento(res, evento, typeof datos === "function" ? datos(lang) : datos);
    } catch (error) {
      console.error("No se pudo enviar el evento SSE:", error);
    }
  }
}
