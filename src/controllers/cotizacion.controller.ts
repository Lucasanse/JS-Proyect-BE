import type { Request, Response } from "express";
import { obtenerCotizacion } from "../utils/cotizacion";

// GET /api/cotizacion -> { valor, tipo, fechaActualizacion, desactualizada } (valor null si aun no hay cotizacion)
export async function obtenerCotizacionActual(_req: Request, res: Response) {
  res.json(await obtenerCotizacion());
}
