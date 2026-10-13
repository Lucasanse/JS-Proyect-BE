import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { AppError } from "../utils/AppError";

// Las imagenes se guardan en disco, en <raiz del proyecto>/uploads,
// y app.ts las sirve como estaticos en /uploads.
// (process.cwd() y no __dirname para que sea la misma carpeta con tsx y con el build en dist/)
export const CARPETA_UPLOADS = path.resolve(process.cwd(), "uploads");

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
      fs.mkdir(CARPETA_UPLOADS, { recursive: true }, (err) => cb(err, CARPETA_UPLOADS)),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_MB_IMAGEN * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONES[file.mimetype]) cb(null, true);
    else cb(new AppError(400, "Formato de imagen no permitido. Usá JPG, PNG, WEBP, GIF o AVIF"));
  },
}).single("imagen");

// Si la URL apunta a una imagen subida a este servidor, devuelve la ruta del archivo.
// Las URLs externas (pegadas a mano por el admin) devuelven null.
function archivoLocalDe(url: string | null | undefined): string | null {
  if (!url) return null;
  const marca = "/uploads/";
  const i = url.indexOf(marca);
  if (i === -1) return null;
  const nombre = path.basename(url.slice(i + marca.length));
  return path.join(CARPETA_UPLOADS, nombre);
}

// Borra del disco una imagen subida. No falla si ya no existe.
export async function borrarImagenLocal(url: string | null | undefined) {
  const archivo = archivoLocalDe(url);
  if (archivo) await fs.promises.rm(archivo, { force: true });
}
