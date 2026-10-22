import { prisma } from "./prisma";
import { AppError } from "./AppError";

// Cotizacion del dolar de DolarApi.com. Es solo informativa: el cobro siempre es en pesos.
const TIPO = (process.env.COTIZACION_TIPO || "oficial").toLowerCase(); // oficial | blue | bolsa (MEP) | ...
const INTERVALO_MIN = Number(process.env.COTIZACION_INTERVALO_MIN) || 30;
// Pasado este tiempo sin poder actualizar, se avisa que la cotizacion esta desactualizada
const MAX_ANTIGUEDAD_MS = (Number(process.env.COTIZACION_MAX_HORAS) || 2) * 60 * 60 * 1000;
const URL_DOLARAPI = `https://dolarapi.com/v1/dolares/${TIPO}`;

export interface CotizacionRespuesta {
  valor: number | null;
  tipo: string;
  fechaActualizacion: string | null;
  desactualizada: boolean;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

// Consulta DolarApi y guarda el valor de venta. Si falla conserva la ultima cotizacion y registra el error.
export async function actualizarCotizacion(): Promise<boolean> {
  try {
    const resp = await fetch(URL_DOLARAPI, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) throw new Error(`DolarApi respondio ${resp.status}`);
    const datos = (await resp.json()) as { venta?: unknown; fechaActualizacion?: string };
    const venta = Number(datos.venta);
    if (!Number.isFinite(venta) || venta <= 0) throw new Error("DolarApi devolvio un valor invalido");

    const fechaFuente = datos.fechaActualizacion ? new Date(datos.fechaActualizacion) : new Date();
    const fecha = Number.isNaN(fechaFuente.getTime()) ? new Date() : fechaFuente;
    const valor = redondear(venta);
    await prisma.cotizacion.upsert({
      where: { id: 1 },
      create: { id: 1, valor, tipo: TIPO, fechaActualizacion: fecha },
      update: { valor, tipo: TIPO, fechaActualizacion: fecha },
    });
    await recalcularPreciosUsd(valor);
    return true;
  } catch (error) {
    console.error("No se pudo actualizar la cotizacion del dolar:", error);
    return false;
  }
}

const MAX_PRECIO_ARS = 99_999_999.99;

// Convierte un precio en dolares a pesos con la ultima cotizacion guardada
export async function usdAPesos(usd: number): Promise<number> {
  const c = await prisma.cotizacion.findUnique({ where: { id: 1 } });
  if (!c) throw new AppError(409, "No hay cotización del dólar disponible para convertir el precio. Probá de nuevo en unos minutos o cargalo en pesos.");
  const pesos = redondear(usd * Number(c.valor));
  if (pesos > MAX_PRECIO_ARS) throw new AppError(400, "El precio es demasiado alto");
  return pesos;
}

// Los productos fijados en dolares siguen la cotizacion: su precio en pesos se actualiza con ella
async function recalcularPreciosUsd(cotizacion: number) {
  await prisma.$executeRaw`UPDATE "productos" SET "precio" = ROUND("precio_usd" * ${cotizacion}, 2) WHERE "moneda_base" = 'USD' AND "precio_usd" IS NOT NULL AND "precio_usd" * ${cotizacion} <= ${MAX_PRECIO_ARS}`;
}

export async function obtenerCotizacion(): Promise<CotizacionRespuesta> {
  const c = await prisma.cotizacion.findUnique({ where: { id: 1 } });
  if (!c) return { valor: null, tipo: TIPO, fechaActualizacion: null, desactualizada: true };
  return {
    valor: redondear(Number(c.valor)),
    tipo: c.tipo,
    fechaActualizacion: c.fechaActualizacion.toISOString(),
    desactualizada: Date.now() - c.fechaActualizacion.getTime() > MAX_ANTIGUEDAD_MS,
  };
}

// Cotizacion para guardar en una venta (null si todavia no hay ninguna)
export async function cotizacionParaVenta() {
  const c = await prisma.cotizacion.findUnique({ where: { id: 1 } });
  return c ? { cotizacionUsd: c.valor, cotizacionFecha: c.fechaActualizacion } : {};
}

// Actualiza al arrancar y despues cada INTERVALO_MIN minutos
export function iniciarCronCotizacion() {
  void actualizarCotizacion();
  setInterval(() => void actualizarCotizacion(), INTERVALO_MIN * 60 * 1000).unref();
}
