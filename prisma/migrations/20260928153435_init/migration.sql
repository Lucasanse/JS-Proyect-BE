/*
  Warnings:

  - You are about to drop the column `tipo` on the `categorias` table. All the data in the column will be lost.
  - You are about to drop the column `socket` on the `componentes_pc` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_componente` on the `componentes_pc` table. All the data in the column will be lost.
  - The primary key for the `componentes_preset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_componente_preset` on the `componentes_preset` table. All the data in the column will be lost.
  - You are about to drop the column `id_origen` on the `notificaciones` table. All the data in the column will be lost.
  - You are about to drop the column `mensaje` on the `notificaciones` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_origen` on the `notificaciones` table. All the data in the column will be lost.
  - The primary key for the `traducciones_producto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_traduccion` on the `traducciones_producto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nombre]` on the table `categorias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[codigo]` on the table `idiomas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id_tipo_componente` to the `componentes_pc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_tipo_notificacion` to the `notificaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcion` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "componentes_preset_id_preset_id_producto_key";

-- DropIndex
DROP INDEX "traducciones_producto_id_producto_id_idioma_key";

-- AlterTable
ALTER TABLE "categorias" DROP COLUMN "tipo";

-- AlterTable
ALTER TABLE "componentes_pc" DROP COLUMN "socket",
DROP COLUMN "tipo_componente",
ADD COLUMN     "id_tipo_componente" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "componentes_preset" DROP CONSTRAINT "componentes_preset_pkey",
DROP COLUMN "id_componente_preset",
ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1,
ADD CONSTRAINT "componentes_preset_pkey" PRIMARY KEY ("id_preset", "id_producto");

-- AlterTable
ALTER TABLE "idiomas" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "notificaciones" DROP COLUMN "id_origen",
DROP COLUMN "mensaje",
DROP COLUMN "tipo_origen",
ADD COLUMN     "id_solicitud" INTEGER,
ADD COLUMN     "id_tipo_notificacion" INTEGER NOT NULL,
ADD COLUMN     "id_venta" INTEGER;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "descripcion" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "traducciones_producto" DROP CONSTRAINT "traducciones_producto_pkey",
DROP COLUMN "id_traduccion",
ADD CONSTRAINT "traducciones_producto_pkey" PRIMARY KEY ("id_producto", "id_idioma");

-- CreateTable
CREATE TABLE "tipos_componente" (
    "id_tipo_componente" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipos_componente_pkey" PRIMARY KEY ("id_tipo_componente")
);

-- CreateTable
CREATE TABLE "atributos_tecnicos" (
    "id_atributo" SERIAL NOT NULL,
    "id_tipo_componente" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,

    CONSTRAINT "atributos_tecnicos_pkey" PRIMARY KEY ("id_atributo")
);

-- CreateTable
CREATE TABLE "valores_atributo" (
    "id_producto" INTEGER NOT NULL,
    "id_atributo" INTEGER NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "valores_atributo_pkey" PRIMARY KEY ("id_producto","id_atributo")
);

-- CreateTable
CREATE TABLE "tipos_notificacion" (
    "id_tipo_notificacion" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "plantilla_mensaje" TEXT NOT NULL,

    CONSTRAINT "tipos_notificacion_pkey" PRIMARY KEY ("id_tipo_notificacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_componente_nombre_key" ON "tipos_componente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "atributos_tecnicos_id_tipo_componente_nombre_key" ON "atributos_tecnicos"("id_tipo_componente", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_notificacion_codigo_key" ON "tipos_notificacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "idiomas_codigo_key" ON "idiomas"("codigo");

-- AddForeignKey
ALTER TABLE "componentes_pc" ADD CONSTRAINT "componentes_pc_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos_tecnicos" ADD CONSTRAINT "atributos_tecnicos_id_tipo_componente_fkey" FOREIGN KEY ("id_tipo_componente") REFERENCES "tipos_componente"("id_tipo_componente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_atributo" ADD CONSTRAINT "valores_atributo_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "componentes_pc"("id_producto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_atributo" ADD CONSTRAINT "valores_atributo_id_atributo_fkey" FOREIGN KEY ("id_atributo") REFERENCES "atributos_tecnicos"("id_atributo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_tipo_notificacion_fkey" FOREIGN KEY ("id_tipo_notificacion") REFERENCES "tipos_notificacion"("id_tipo_notificacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitudes_servicio"("id_solicitud") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_un_origen_check"
  CHECK (num_nonnulls("id_venta", "id_solicitud") = 1);
