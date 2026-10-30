-- Precio anclado en dolares: el precio en pesos se recalcula con la cotizacion
ALTER TABLE "productos" ADD COLUMN "precio_usd" DECIMAL(10,2);
