-- Habilitacion de cuentas: un admin puede deshabilitar usuarios
ALTER TABLE "usuarios" ADD COLUMN "habilitado" BOOLEAN NOT NULL DEFAULT true;
