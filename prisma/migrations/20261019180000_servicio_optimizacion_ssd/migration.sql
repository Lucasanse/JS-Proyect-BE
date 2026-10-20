-- Servicio tecnico: opcion de cambiar el disco duro por un SSD (servicio OPTIMIZACION)

-- AlterTable
ALTER TABLE "solicitudes_servicio" ADD COLUMN     "con_ssd" BOOLEAN NOT NULL DEFAULT false;

