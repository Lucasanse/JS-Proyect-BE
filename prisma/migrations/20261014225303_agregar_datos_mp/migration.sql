/*
  Warnings:

  - A unique constraint covering the columns `[id_pago_mp]` on the table `ventas` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "id_pago_mp" TEXT,
ADD COLUMN     "metodo_pago" TEXT NOT NULL DEFAULT 'MERCADO_PAGO';

-- CreateIndex
CREATE UNIQUE INDEX "ventas_id_pago_mp_key" ON "ventas"("id_pago_mp");
