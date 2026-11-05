-- Los armados (presets) pueden incluir perifericos (monitor, mouse, teclado...),
-- que no son componentes de PC: el producto pasa a referenciar "productos".
-- Los datos existentes siguen siendo validos (id_producto de componentes_pc es el de productos).

-- DropForeignKey
ALTER TABLE "componentes_preset" DROP CONSTRAINT "componentes_preset_id_producto_fkey";

-- AddForeignKey
ALTER TABLE "componentes_preset" ADD CONSTRAINT "componentes_preset_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "productos"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;
