-- Seguimiento de solicitudes de servicio tecnico: servicios pedidos, respuestas del admin e historial de estados

-- AlterTable
ALTER TABLE "solicitudes_servicio" ADD COLUMN     "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "con_backup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "con_pasta_termica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servicios" TEXT[],
ADD COLUMN     "software" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tipo_equipo" TEXT,
ALTER COLUMN "descripcion" DROP NOT NULL;

-- Las solicitudes que ya existian no tenian servicios elegidos: quedan como "OTRO"
UPDATE "solicitudes_servicio" SET "servicios" = ARRAY['OTRO'] WHERE "servicios" IS NULL;

-- CreateTable
CREATE TABLE "respuestas_solicitud" (
    "id_respuesta" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_solicitud_pkey" PRIMARY KEY ("id_respuesta")
);

-- CreateTable
CREATE TABLE "historial_estados_solicitud" (
    "id_historial" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_solicitud_pkey" PRIMARY KEY ("id_historial")
);

-- CreateIndex
CREATE INDEX "respuestas_solicitud_id_solicitud_idx" ON "respuestas_solicitud"("id_solicitud");

-- CreateIndex
CREATE INDEX "historial_estados_solicitud_id_solicitud_idx" ON "historial_estados_solicitud"("id_solicitud");

-- CreateIndex
CREATE INDEX "solicitudes_servicio_estado_idx" ON "solicitudes_servicio"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_servicio_id_usuario_idx" ON "solicitudes_servicio"("id_usuario");

-- AddForeignKey
ALTER TABLE "respuestas_solicitud" ADD CONSTRAINT "respuestas_solicitud_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitudes_servicio"("id_solicitud") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_solicitud" ADD CONSTRAINT "respuestas_solicitud_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_solicitud" ADD CONSTRAINT "historial_estados_solicitud_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "solicitudes_servicio"("id_solicitud") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_solicitud" ADD CONSTRAINT "historial_estados_solicitud_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Las solicitudes que ya existian arrancan su historial con el estado que tienen hoy
INSERT INTO "historial_estados_solicitud" ("id_solicitud", "id_usuario", "estado_anterior", "estado_nuevo", "fecha")
SELECT "id_solicitud", "id_usuario", NULL, "estado", "fecha" FROM "solicitudes_servicio";
