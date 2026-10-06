import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";

const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

const actualizarIdiomaSchema = z.object({
  codigoIdioma: z.string().trim().toLowerCase().min(2).max(5),
});

// GET /api/usuario/idioma
export async function obtenerIdiomaUsuario(req: Request, res: Response) {
  const id = idUsuarioDe(req);

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { idioma: true },
  });

  res.json({
    codigoIdioma: usuario?.idioma?.codigo ?? "es",
  });
}

// PATCH /api/usuario/idioma  { codigoIdioma: "es" | "en" }
export async function actualizarIdiomaUsuario(req: Request, res: Response) {
  const id = idUsuarioDe(req);
  const { codigoIdioma } = actualizarIdiomaSchema.parse(req.body);

  const idioma = await prisma.idioma.findFirst({
    where: { codigo: codigoIdioma, activo: true },
  });

  if (!idioma) {
    throw new AppError(400, "Idioma no válido o inactivo");
  }

  await prisma.usuario.update({
    where: { id },
    data: { idIdioma: idioma.idIdioma },
  });

  res.json({ codigoIdioma: idioma.codigo });
}
