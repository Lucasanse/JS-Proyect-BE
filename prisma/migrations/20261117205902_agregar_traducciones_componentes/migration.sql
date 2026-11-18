/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `categorias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombreEN]` on the table `tipos_componente` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "atributos_tecnicos" ADD COLUMN     "nombreEN" TEXT;

-- AlterTable
ALTER TABLE "categorias" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "tipos_componente" ADD COLUMN     "nombreEN" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "categorias_name_key" ON "categorias"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_componente_nombreEN_key" ON "tipos_componente"("nombreEN");
