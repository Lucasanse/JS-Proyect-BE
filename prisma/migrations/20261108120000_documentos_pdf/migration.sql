-- Presupuestos y facturas en PDF (tabla documentos) y sus notificaciones.

-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "id_documento" INTEGER;

-- CreateTable
CREATE TABLE "documentos" (
    "id_documento" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_venta" INTEGER,
    "origen" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "items" JSONB NOT NULL,
    "cliente" JSONB NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "ruta_archivo" TEXT NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id_documento")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentos_id_venta_key" ON "documentos"("id_venta");

-- CreateIndex
CREATE INDEX "documentos_id_usuario_tipo_idx" ON "documentos"("id_usuario", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_tipo_numero_key" ON "documentos"("tipo", "numero");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "documentos"("id_documento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_id_venta_fkey" FOREIGN KEY ("id_venta") REFERENCES "ventas"("id_venta") ON DELETE CASCADE ON UPDATE CASCADE;


-- Una notificacion ahora puede venir de una venta, una solicitud o un documento (exactamente uno)
ALTER TABLE "notificaciones" DROP CONSTRAINT "notificaciones_un_origen_check";
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_un_origen_check"
  CHECK (num_nonnulls("id_venta", "id_solicitud", "id_documento") = 1);

-- Tipos de notificacion de "presupuesto/factura disponible" (tambien estan en el seed)
INSERT INTO "tipos_notificacion" ("codigo", "plantilla_mensaje") VALUES
  ('PRESUPUESTO_DISPONIBLE', 'Tu presupuesto N° {numero} está listo para descargar.'),
  ('FACTURA_DISPONIBLE', 'La factura N° {numero} de tu compra #{idVenta} está disponible.')
ON CONFLICT ("codigo") DO NOTHING;
