import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { consultarIA, type FotoIA } from "../lib/ia";
import {
  cargarCatalogoIA,
  esquemaRespuestaIA,
  instruccionesIA,
  sanearSugerencia,
  type SugerenciaProducto,
} from "../utils/analisisProducto";
import { MAX_FOTOS_CAPTURA, borrarCaptura, buscarCaptura, crearCaptura } from "../utils/capturas";
import { ipLocal } from "../utils/redLocal";

// Analisis de fotos de productos con IA y captura de fotos desde el celular por QR.
// La IA no guarda nada en la base: devuelve un borrador que el admin revisa en el formulario.

// Gemini acepta hasta 20 MB por pedido y las fotos viajan en base64 (un 33% mas pesadas)
const MAX_MB_TOTAL = 14;

function fotosDe(req: Request): FotoIA[] {
  const archivos = Array.isArray(req.files) ? req.files : [];
  return archivos.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype }));
}

async function analizar(fotos: FotoIA[]): Promise<SugerenciaProducto> {
  if (fotos.length === 0) throw new AppError(400, "Mandá al menos una foto del producto");
  const totalMb = fotos.reduce((suma, f) => suma + f.buffer.length, 0) / (1024 * 1024);
  if (totalMb > MAX_MB_TOTAL) {
    throw new AppError(400, `Las fotos pesan demasiado en total (máximo ${MAX_MB_TOTAL} MB). Mandá menos fotos o más livianas`);
  }

  const catalogo = await cargarCatalogoIA();
  const respuesta = await consultarIA(fotos, instruccionesIA(catalogo), esquemaRespuestaIA(catalogo));
  const sugerencia = sanearSugerencia(respuesta, catalogo);
  if (!sugerencia) throw new AppError(502, "La IA devolvió una respuesta inválida. Probá de nuevo");
  return sugerencia;
}

// Token con formato valido y captura vigente; si no, 404 (no se distingue cual de los dos fallo)
function capturaVigente(req: Request) {
  const token = String(req.params.token ?? "");
  const captura = /^[\w-]{32}$/.test(token) ? buscarCaptura(token) : null;
  if (!captura) throw new AppError(404, "El enlace no es válido o ya venció. Generá un QR nuevo desde la computadora");
  return { token, captura };
}

// Igual que capturaVigente, pero ademas tiene que ser del admin que hace el pedido
function capturaDelAdmin(req: Request) {
  const resultado = capturaVigente(req);
  if (resultado.captura.idUsuario !== String(req.usuario!.id)) {
    throw new AppError(404, "El enlace no es válido o ya venció. Generá un QR nuevo desde la computadora");
  }
  return resultado;
}

const estado = (captura: { fotos: FotoIA[]; expiraEn: number }) => ({
  fotos: captura.fotos.length,
  maxFotos: MAX_FOTOS_CAPTURA,
  expiraEn: new Date(captura.expiraEn).toISOString(),
});

// ── Admin ──────────────────────────────────────────────

// POST /api/admin/productos/analizar  (multipart/form-data, campo "fotos", hasta 5)
export async function analizarFotosProducto(req: Request, res: Response<SugerenciaProducto>) {
  res.json(await analizar(fotosDe(req)));
}

// POST /api/admin/captura
// Crea la sesion para el QR. ipLocal es la IP de esta PC en la red (null si no se encontro):
// el FE la usa para armar la URL que abre el celular.
export function crearCapturaFotos(req: Request, res: Response) {
  const { token, captura } = crearCaptura(String(req.usuario!.id));
  res.status(201).json({ token, ipLocal: ipLocal(), ...estado(captura) });
}

// GET /api/admin/captura/:token  -> cuantas fotos llegaron (el FE lo consulta cada 2 segundos)
export function estadoCaptura(req: Request, res: Response) {
  res.json(estado(capturaDelAdmin(req).captura));
}

// GET /api/admin/captura/:token/fotos/:indice
// Devuelve una foto que llegó del celular. La PC las descarga para mostrarlas, elegir
// cuáles analizar (con POST /productos/analizar) y cuál usar como imagen del producto.
export function fotoCaptura(req: Request, res: Response) {
  const { captura } = capturaDelAdmin(req);
  const indice = Number(req.params.indice);
  const foto = Number.isInteger(indice) && indice >= 0 ? captura.fotos[indice] : undefined;
  if (!foto) throw new AppError(404, "La foto no existe");
  res.type(foto.mimetype).set("Cache-Control", "no-store").send(foto.buffer);
}

// DELETE /api/admin/captura/:token  (al cerrar el formulario)
export function cancelarCaptura(req: Request, res: Response) {
  borrarCaptura(capturaDelAdmin(req).token);
  res.status(204).end();
}

// ── Celular (sin sesion: el token del QR hace de permiso) ──

// GET /api/captura/:token
export function infoCaptura(req: Request, res: Response) {
  res.json(estado(capturaVigente(req).captura));
}

// POST /api/captura/:token/fotos  (multipart/form-data, campo "fotos")
export function subirFotosCaptura(req: Request, res: Response) {
  const { captura } = capturaVigente(req);
  const fotos = fotosDe(req);
  if (fotos.length === 0) throw new AppError(400, "No se envió ninguna foto");

  const quedan = MAX_FOTOS_CAPTURA - captura.fotos.length;
  if (fotos.length > quedan) {
    throw new AppError(
      400,
      quedan === 0
        ? `Ya se enviaron las ${MAX_FOTOS_CAPTURA} fotos permitidas`
        : `Solo podés enviar ${quedan} foto${quedan === 1 ? "" : "s"} más (máximo ${MAX_FOTOS_CAPTURA} en total)`,
    );
  }
  captura.fotos.push(...fotos);
  res.status(201).json(estado(captura));
}
