// src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { CODIGO_USUARIO_DESHABILITADO, MENSAJE_USUARIO_DESHABILITADO } from "../utils/usuarios.habilitacion";

// Extraemos automáticamente los tipos exactos de tu configuración de Better Auth
type SessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

declare global {
  namespace Express {
    interface Request {
      usuario?: SessionData["user"];
      sesion?: SessionData["session"];
    }
  }
}

/**
 * 1. Guardia de Autenticación (Cualquier usuario logueado: CLIENTE o ADMIN)
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Better Auth lee las cookies/headers de la petición y busca en PostgreSQL
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({
        error:
          "No autenticado. Debes iniciar sesión para realizar esta acción.",
      });
      return;
    }

    // Al deshabilitar la cuenta se borran sus sesiones; esto cubre una que se haya
    // creado justo mientras tanto
    if (session.user.habilitado === false) {
      res.status(403).json({ error: MENSAJE_USUARIO_DESHABILITADO, code: CODIGO_USUARIO_DESHABILITADO });
      return;
    }

    req.usuario = session.user;
    req.sesion = session.session;

    // Dejamos pasar la petición al siguiente paso
    next();
  } catch (error) {
    res.status(500).json({ error: "Error al verificar la sesión" });
  }
};

// Guardia de Rol Administrador (Se usa DESPUÉS de requireAuth)

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.usuario) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  if (req.usuario.rol !== "ADMIN") {
    res.status(403).json({
      error: "Acceso denegado. Se requieren permisos de Administrador.",
    });
    return;
  }

  next();
};
