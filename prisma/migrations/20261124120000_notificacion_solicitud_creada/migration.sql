-- Tipo de notificacion: confirmacion al usuario cuando crea una solicitud de servicio tecnico.
-- Tambien esta en el seed.
INSERT INTO "tipos_notificacion" ("codigo", "plantilla_mensaje", "plantilla_mensajeEN", "plantilla_titulo", "plantilla_tituloEN") VALUES
  ('SOLICITUD_CREADA', 'Recibimos tu solicitud de servicio técnico #{idSolicitud}. Te avisaremos cuando avance.', 'We received your service request #{idSolicitud}. We will let you know as it progresses.', 'Recibimos tu solicitud', 'We received your request')
ON CONFLICT ("codigo") DO NOTHING;
