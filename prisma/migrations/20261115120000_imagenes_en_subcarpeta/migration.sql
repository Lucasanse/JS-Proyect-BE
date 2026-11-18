-- Las imagenes subidas pasan de uploads/ a uploads/imagenes/ (y los PDF a uploads/documentos/).
-- Solo se tocan las URLs de este servidor, con la forma http(s)://host/uploads/<archivo>;
-- las externas (por ejemplo .../wp-content/uploads/2025/03/foto.webp) no coinciden y quedan igual.
UPDATE "productos"
SET "imagen_url" = regexp_replace("imagen_url", '^(https?://[^/]+)/uploads/([^/]+)$', '\1/uploads/imagenes/\2')
WHERE "imagen_url" ~ '^https?://[^/]+/uploads/[^/]+$';
