-- Tipos de notificacion: cambio de estado de una compra y armado (preset) guardado.
-- Tambien estan en el seed.
INSERT INTO "tipos_notificacion" ("codigo", "plantilla_mensaje", "plantilla_mensajeEN", "plantilla_titulo", "plantilla_tituloEN") VALUES
  ('VENTA_ESTADO', 'Tu compra #{idVenta} pasó a "{estado}".', 'Your purchase #{idVenta} is now "{estado}".', 'Tu compra se actualizó', 'Order updated'),
  ('PRESET_CREADO', 'Guardaste el armado "{nombre}". Lo encontrás en Mis armados PC.', 'You saved the build "{nombre}". You can find it in My PC builds.', 'Armado guardado', 'Build saved')
ON CONFLICT ("codigo") DO NOTHING;
