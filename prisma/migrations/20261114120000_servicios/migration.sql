-- Servicios con tabla propia (servicios + traducciones_servicio).
-- Los servicios del armador (antes productos de la categoria "Servicios") pasan a esta tabla,
-- junto con los de servicio tecnico. El carrito y las ventas aceptan un producto o un servicio.

-- AlterTable
ALTER TABLE "items_carrito" ADD COLUMN     "id_servicio" INTEGER,
ALTER COLUMN "id_producto" DROP NOT NULL;

-- AlterTable
ALTER TABLE "detalles_venta" ADD COLUMN     "id_servicio" INTEGER,
ALTER COLUMN "id_producto" DROP NOT NULL;

-- AlterTable
ALTER TABLE "solicitudes_servicio" ADD COLUMN     "precio_estimado" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "precios" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "servicios" (
    "id_servicio" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "precio" DECIMAL(10,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateTable
CREATE TABLE "traducciones_servicio" (
    "id_servicio" INTEGER NOT NULL,
    "id_idioma" INTEGER NOT NULL,
    "nombre_traducido" TEXT NOT NULL,
    "descripcion_traducida" TEXT NOT NULL,

    CONSTRAINT "traducciones_servicio_pkey" PRIMARY KEY ("id_servicio","id_idioma")
);

-- CreateIndex
CREATE UNIQUE INDEX "servicios_codigo_key" ON "servicios"("codigo");

-- CreateIndex
CREATE INDEX "servicios_grupo_idx" ON "servicios"("grupo");

-- CreateIndex
CREATE UNIQUE INDEX "items_carrito_id_carrito_id_servicio_key" ON "items_carrito"("id_carrito", "id_servicio");

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traducciones_servicio" ADD CONSTRAINT "traducciones_servicio_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios"("id_servicio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traducciones_servicio" ADD CONSTRAINT "traducciones_servicio_id_idioma_fkey" FOREIGN KEY ("id_idioma") REFERENCES "idiomas"("id_idioma") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Exactamente uno: producto o servicio
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_producto_o_servicio_check"
  CHECK (num_nonnulls("id_producto", "id_servicio") = 1);
ALTER TABLE "detalles_venta" ADD CONSTRAINT "detalles_venta_producto_o_servicio_check"
  CHECK (num_nonnulls("id_producto", "id_servicio") = 1);

-- ─── Datos: servicios del armador (desde productos de la categoria "Servicios") ───
ALTER TABLE "servicios" ADD COLUMN "id_producto_anterior" INTEGER;

INSERT INTO "servicios" ("codigo", "grupo", "nombre", "descripcion", "precio", "activo", "orden", "id_producto_anterior")
SELECT
  CASE
    WHEN p."nombre" ILIKE 'Armado de PC%' THEN 'ARMADO_PC'
    WHEN p."nombre" ILIKE '%Windows%' THEN 'INSTALACION_WINDOWS'
    WHEN p."nombre" ILIKE '%Office%' THEN 'INSTALACION_OFFICE'
    ELSE 'ARMADOR_' || p."id_producto"
  END,
  'ARMADOR', p."nombre", p."descripcion", p."precio", p."activo",
  ROW_NUMBER() OVER (ORDER BY p."id_producto"),
  p."id_producto"
FROM "productos" p
JOIN "categorias" c ON c."id_categoria" = p."id_categoria"
WHERE c."nombre" = 'Servicios';

INSERT INTO "traducciones_servicio" ("id_servicio", "id_idioma", "nombre_traducido", "descripcion_traducida")
SELECT s."id_servicio", t."id_idioma", t."nombre_traducido", t."descripcion_traducida"
FROM "traducciones_producto" t
JOIN "servicios" s ON s."id_producto_anterior" = t."id_producto";

-- Carritos y ventas pasan a apuntar al servicio
UPDATE "items_carrito" i SET "id_servicio" = s."id_servicio", "id_producto" = NULL
FROM "servicios" s WHERE s."id_producto_anterior" = i."id_producto";

UPDATE "detalles_venta" d SET "id_servicio" = s."id_servicio", "id_producto" = NULL
FROM "servicios" s WHERE s."id_producto_anterior" = d."id_producto";

-- Los armados guardados no llevan servicios (se eligen al comprar)
DELETE FROM "componentes_preset" cp USING "servicios" s WHERE s."id_producto_anterior" = cp."id_producto";

-- Ya no son productos: se borran (traducciones y favoritos se borran en cascada)
DELETE FROM "productos" p USING "servicios" s WHERE s."id_producto_anterior" = p."id_producto";
DELETE FROM "categorias" c WHERE c."nombre" = 'Servicios'
  AND NOT EXISTS (SELECT 1 FROM "productos" p WHERE p."id_categoria" = c."id_categoria");
DELETE FROM "marcas" m WHERE m."nombre" = 'Servicio'
  AND NOT EXISTS (SELECT 1 FROM "productos" p WHERE p."id_marca" = m."id_marca");

ALTER TABLE "servicios" DROP COLUMN "id_producto_anterior";

-- ─── Datos: servicios de servicio tecnico ───
-- Precios iniciales de ejemplo: el admin los ajusta en /admin/servicios.
-- REPARACION y OTRO no tienen precio fijo (se presupuestan al ver el equipo).
INSERT INTO "servicios" ("codigo", "grupo", "nombre", "precio", "orden") VALUES
  ('REPARACION', 'TIPO', 'Reparación', NULL, 1),
  ('LIMPIEZA', 'TIPO', 'Limpieza', 15000, 2),
  ('FORMATEO', 'TIPO', 'Formateo', 20000, 3),
  ('OPTIMIZACION', 'TIPO', 'Optimización', 18000, 4),
  ('INSTALACION_SOFTWARE', 'TIPO', 'Instalación de software (cargo base)', 0, 5),
  ('OTRO', 'TIPO', 'Otro', NULL, 6),
  ('EXTRA_PASTA_TERMICA', 'EXTRA', 'Cambio de pasta térmica', 10000, 1),
  ('EXTRA_BACKUP', 'EXTRA', 'Backup de archivos', 8000, 2),
  ('EXTRA_SSD', 'EXTRA', 'Cambio de disco por SSD (mano de obra)', 15000, 3),
  ('SOFTWARE_WIN10', 'SOFTWARE', 'Windows 10', 10000, 1),
  ('SOFTWARE_WIN11', 'SOFTWARE', 'Windows 11', 10000, 2),
  ('SOFTWARE_OFFICE', 'SOFTWARE', 'Office', 8000, 3),
  ('SOFTWARE_WINRAR', 'SOFTWARE', 'WinRAR', 2000, 4),
  ('SOFTWARE_VLC', 'SOFTWARE', 'VLC', 2000, 5)
ON CONFLICT ("codigo") DO NOTHING;
