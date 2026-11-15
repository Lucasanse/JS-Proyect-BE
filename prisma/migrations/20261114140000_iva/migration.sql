-- IVA: cada producto guarda si su precio incluye IVA y su alicuota; cada detalle de venta, la alicuota
-- incluida en lo cobrado. Los precios cargados hasta ahora quedan como netos (se les suma el IVA).

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "alicuota_iva" DECIMAL(4,2) NOT NULL DEFAULT 21,
ADD COLUMN     "iva_incluido" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "detalles_venta" ADD COLUMN     "alicuota_iva" DECIMAL(4,2) NOT NULL DEFAULT 21;

