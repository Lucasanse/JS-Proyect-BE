-- Centro de notificaciones: titulo por tipo, texto libre (novedades generales),
-- datos para la plantilla y notificaciones sin origen.

-- AlterTable
ALTER TABLE "tipos_notificacion" ADD COLUMN     "plantilla_titulo" TEXT,
ADD COLUMN     "plantilla_tituloEN" TEXT;

-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "datos" JSONB,
ADD COLUMN     "mensaje" TEXT,
ADD COLUMN     "titulo" TEXT;

-- CreateIndex
CREATE INDEX "notificaciones_id_usuario_leida_idx" ON "notificaciones"("id_usuario", "leida");

-- CreateIndex
CREATE INDEX "notificaciones_id_usuario_fecha_idx" ON "notificaciones"("id_usuario", "fecha");

-- Ahora una notificacion puede no tener origen (novedades generales): como mucho uno
ALTER TABLE "notificaciones" DROP CONSTRAINT "notificaciones_un_origen_check";
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_un_origen_check"
  CHECK (num_nonnulls("id_venta", "id_solicitud", "id_documento") <= 1);

-- Tipos nuevos (tambien estan en el seed, que ademas carga los titulos)
INSERT INTO "tipos_notificacion" ("codigo", "plantilla_mensaje", "plantilla_mensajeEN", "plantilla_titulo", "plantilla_tituloEN") VALUES
  ('SOLICITUD_ESTADO', 'Tu solicitud de servicio técnico #{idSolicitud} pasó a "{estado}".', 'Your service request #{idSolicitud} is now "{estado}".', 'Servicio técnico actualizado', 'Service request updated'),
  ('NOVEDAD', '{mensaje}', '{mensaje}', 'Novedades', 'News')
ON CONFLICT ("codigo") DO NOTHING;
