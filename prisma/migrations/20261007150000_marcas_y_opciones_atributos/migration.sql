-- Atributos tecnicos: si son numericos y sus valores tipicos (sugerencias para el admin)
ALTER TABLE "atributos_tecnicos" ADD COLUMN     "numerico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opciones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Tabla de marcas
CREATE TABLE "marcas" (
    "id_marca" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id_marca")
);

CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- Se pasan las marcas que ya tienen los productos (texto) a la tabla nueva
INSERT INTO "marcas" ("nombre")
SELECT DISTINCT TRIM("marca") FROM "productos" ORDER BY 1;

ALTER TABLE "productos" ADD COLUMN "id_marca" INTEGER;

UPDATE "productos" p
SET "id_marca" = m."id_marca"
FROM "marcas" m
WHERE m."nombre" = TRIM(p."marca");

ALTER TABLE "productos" ALTER COLUMN "id_marca" SET NOT NULL;
ALTER TABLE "productos" DROP COLUMN "marca";

ALTER TABLE "productos" ADD CONSTRAINT "productos_id_marca_fkey" FOREIGN KEY ("id_marca") REFERENCES "marcas"("id_marca") ON DELETE RESTRICT ON UPDATE CASCADE;
