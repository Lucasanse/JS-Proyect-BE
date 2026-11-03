-- Cotizacion del dolar (informativa) y copia de la vigente en cada venta
CREATE TABLE "cotizaciones" (
    "id_cotizacion" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id_cotizacion")
);

ALTER TABLE "ventas" ADD COLUMN "cotizacion_usd" DECIMAL(12,2),
ADD COLUMN "cotizacion_fecha" TIMESTAMP(3);
