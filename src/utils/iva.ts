import type { Prisma } from "@prisma/client";

// IVA de los precios. Todo se cobra con IVA (Factura B: el IVA va incluido en lo cobrado).
// - Productos: el admin carga el precio con o sin IVA (ivaIncluido) y elige la alicuota (21 o 10,5).
// - Servicios (armador y servicio tecnico): igual que los productos, y ademas pueden ser exentos (alicuota 0).

export const ALICUOTAS_IVA = [21, 10.5] as const;
export const ALICUOTA_GENERAL = 21;
export const ALICUOTAS_SERVICIOS = [21, 10.5, 0] as const; // 0 = exento

const redondear = (n: number) => Math.round(n * 100) / 100;
const numero = (v: Prisma.Decimal | number) => Number(v);

export interface PreciosIva {
  neto: number; // sin IVA
  final: number; // con IVA: lo que se cobra
  alicuotaIva: number;
}

// El valor cargado se respeta tal cual (si se cargo con IVA, el final es exactamente ese)
export function conIva(precio: Prisma.Decimal | number, ivaIncluido: boolean, alicuota: Prisma.Decimal | number): PreciosIva {
  const base = numero(precio);
  const a = numero(alicuota);
  const factor = 1 + a / 100;
  return ivaIncluido
    ? { neto: redondear(base / factor), final: base, alicuotaIva: a }
    : { neto: base, final: redondear(base * factor), alicuotaIva: a };
}

export const preciosProducto = (p: { precio: Prisma.Decimal | number; ivaIncluido: boolean; alicuotaIva: Prisma.Decimal | number }) =>
  conIva(p.precio, p.ivaIncluido, p.alicuotaIva);

export const preciosServicio = (s: {
  precio: Prisma.Decimal | number | null;
  ivaIncluido: boolean;
  alicuotaIva: Prisma.Decimal | number;
}) => conIva(s.precio ?? 0, s.ivaIncluido, s.alicuotaIva);

// IVA incluido en un importe con IVA
export const ivaContenido = (final: number, alicuota: number) => redondear(final - final / (1 + alicuota / 100));
