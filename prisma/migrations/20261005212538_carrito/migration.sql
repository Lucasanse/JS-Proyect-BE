/*
  Warnings:

  - You are about to drop the column `password_hash` on the `usuarios` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "usuarios" DROP COLUMN "password_hash",
ADD COLUMN     "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "correo_verificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imagen" TEXT,
ALTER COLUMN "rol" SET DEFAULT 'CLIENTE',
ALTER COLUMN "id_idioma" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "sesiones" (
    "id_sesion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id_cuenta" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id_cuenta")
);

-- CreateTable
CREATE TABLE "verificaciones" (
    "id_verificacion" SERIAL NOT NULL,
    "identificador" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3),

    CONSTRAINT "verificaciones_pkey" PRIMARY KEY ("id_verificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_token_key" ON "sesiones"("token");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
