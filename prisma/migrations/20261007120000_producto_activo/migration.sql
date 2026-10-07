-- Baja logica de productos
ALTER TABLE "productos" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
