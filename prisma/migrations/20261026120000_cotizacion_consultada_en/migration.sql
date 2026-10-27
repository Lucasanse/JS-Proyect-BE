-- Ultima consulta exitosa a DolarApi: con esto se decide si la cotizacion esta desactualizada
ALTER TABLE "cotizaciones" ADD COLUMN "consultada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
