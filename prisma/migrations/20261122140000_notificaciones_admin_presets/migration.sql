-- Tipos de notificacion: respuesta del servicio tecnico, avisos para administradores
-- y armados con productos sin stock o dados de baja. Tambien estan en el seed.
INSERT INTO "tipos_notificacion" ("codigo", "plantilla_mensaje", "plantilla_mensajeEN", "plantilla_titulo", "plantilla_tituloEN") VALUES
  ('SOLICITUD_RESPUESTA', 'Te respondimos en tu solicitud #{idSolicitud}: "{respuesta}"', 'We replied to your request #{idSolicitud}: "{respuesta}"', 'Nueva respuesta del servicio técnico', 'New reply from technical support'),
  ('ADMIN_VENTA_NUEVA', 'Se acreditó la compra #{idVenta} por {total}.', 'Order #{idVenta} was paid ({total}).', 'Nueva compra', 'New order'),
  ('ADMIN_SOLICITUD_NUEVA', '{cliente} envió la solicitud #{idSolicitud}.', '{cliente} sent service request #{idSolicitud}.', 'Nueva solicitud de servicio técnico', 'New service request'),
  ('PRESET_SIN_STOCK', '"{producto}" de tu armado "{nombre}" se quedó sin stock.', '"{producto}" in your build "{nombre}" is out of stock.', 'Producto sin stock en tu armado', 'Out of stock item in your build'),
  ('PRESET_PRODUCTO_BAJA', '"{producto}" de tu armado "{nombre}" ya no está disponible.', '"{producto}" in your build "{nombre}" is no longer available.', 'Producto no disponible en tu armado', 'Unavailable item in your build')
ON CONFLICT ("codigo") DO NOTHING;
