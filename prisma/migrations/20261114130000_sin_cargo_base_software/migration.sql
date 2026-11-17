-- Instalacion de software no tiene precio propio: se cobra cada programa (grupo SOFTWARE),
-- y el admin puede agregar programas nuevos. Se quita el "cargo base".
DELETE FROM "servicios" WHERE "codigo" = 'INSTALACION_SOFTWARE';
