-- IVA de cada servicio (como en productos): alicuota (21, 10.5 o 0 = exento) y si el precio cargado lo incluye.
-- Los servicios existentes quedan al 21% sumado al precio cargado.

-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "alicuota_iva" DECIMAL(4,2) NOT NULL DEFAULT 21,
ADD COLUMN     "iva_incluido" BOOLEAN NOT NULL DEFAULT false;

