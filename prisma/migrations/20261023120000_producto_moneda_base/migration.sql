-- Moneda en la que queda fijo el precio de cada producto (USD o ARS). Los existentes siguen como estaban.
ALTER TABLE "productos" ADD COLUMN "moneda_base" TEXT NOT NULL DEFAULT 'ARS';
UPDATE "productos" SET "moneda_base" = 'USD' WHERE "precio_usd" IS NOT NULL;
