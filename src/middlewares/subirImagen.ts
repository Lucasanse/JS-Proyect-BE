import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { AppError } from "../utils/AppError";

// Todo lo que sube o genera el BE va en <raiz del proyecto>/uploads, separado por carpetas:
//   uploads/imagenes   imagenes de productos: server.ts las sirve como estaticos en /uploads/imagenes
//   uploads/documentos PDF de presupuestos y facturas: NO son publicos, se descargan con sesion
// (process.cwd() y no __dirname para que sea la misma carpeta con tsx y con el build en dist/)
export const CARPETA_UPLOADS = path.resolve(process.cwd(), "uploads");
export const CARPETA_IMAGENES = path.join(CARPETA_UPLOADS, "imagenes");
export const CARPETA_DOCUMENTOS = path.join(CARPETA_UPLOADS, "documentos");
// Parte de la URL publica de una imagen: <servidor>/uploads/imagenes/<archivo>
export const RUTA_PUBLICA_IMAGENES = "/uploads/imagenes/";

export const MAX_MB_IMAGEN = 5;

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

// Campo "imagen" de un form multipart. El nombre del archivo es aleatorio
// para que no se pisen dos imagenes con el mismo nombre original.
export const subirImagen = multer({
  storage: multer.diskStorage({
    // Se crea la carpeta si no existe (por ejemplo, en un clon nuevo del repo)
    destination: (_req, _file, cb) =>
      fs.mkdir(CARPETA_IMAGENES, { recursive: true }, (err) => cb(err, CARPETA_IMAGENES)),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_MB_IMAGEN * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONES[file.mimetype]) cb(null, true);
    else cb(new AppError(400, "Formato de imagen no permitido. Usá JPG, PNG, WEBP, GIF o AVIF"));
  },
}).single("imagen");

// Fotos para analizar con IA (campo "fotos", hasta MAX_FOTOS_IA). Quedan en memoria y no
// se guardan en disco: solo se usan para el análisis. Son los formatos que acepta Gemini.
export const MAX_FOTOS_IA = 5;

const FORMATOS_IA = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const subirFotosIA = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB_IMAGEN * 1024 * 1024, files: MAX_FOTOS_IA },
  fileFilter: (_req, file, cb) => {
    if (FORMATOS_IA.has(file.mimetype)) cb(null, true);
    else cb(new AppError(400, "Formato de foto no permitido. Usá JPG, PNG, WEBP o HEIC"));
  },
}).array("fotos", MAX_FOTOS_IA);

// Si la URL apunta a una imagen subida a este servidor, devuelve la ruta del archivo.
// Las URLs externas (pegadas a mano por el admin) devuelven null.
function archivoLocalDe(url: string | null | undefined): string | null {
  if (!url) return null;
  const i = url.indexOf(RUTA_PUBLICA_IMAGENES);
  if (i === -1) return null;
  const nombre = path.basename(url.slice(i + RUTA_PUBLICA_IMAGENES.length));
  return path.join(CARPETA_IMAGENES, nombre);
}

// Borra del disco una imagen subida. No falla si ya no existe.
export async function borrarImagenLocal(url: string | null | undefined) {
  const archivo = archivoLocalDe(url);
  if (archivo) await fs.promises.rm(archivo, { force: true });
}
