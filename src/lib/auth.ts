// src/auth.ts
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { PrismaClient } from "@prisma/client";
import { CODIGO_USUARIO_DESHABILITADO, MENSAJE_USUARIO_DESHABILITADO } from "../utils/usuarios.habilitacion";

export const prisma = new PrismaClient();

// La configuracion recibe la base por parametro para poder probarla con el adapter en memoria
// (ver auth.test.ts). La app usa la de Prisma (auth, abajo).
export const crearAuth = (database: BetterAuthOptions["database"]) =>
  betterAuth({
    trustedOrigins: ["http://localhost:5173"],
    database,

    // Esto es para dejar que no joda el autoincremental
    advanced: {
      database: {
        generateId: "serial",
      },
    },

    emailAndPassword: {
      enabled: true,
    },

    // Un usuario deshabilitado no puede iniciar sesion: se corta al crear la sesion,
    // despues de validar la contraseña (con datos incorrectos sigue saliendo "credenciales invalidas").
    // Las sesiones que ya tenia se borran al deshabilitarlo (adminUsuarios.controller.ts).
    databaseHooks: {
      session: {
        create: {
          before: async (session, ctx) => {
            if (!ctx) return;
            // findUserById no conoce los additionalFields en el tipo, pero los trae
            const usuario = (await ctx.context.internalAdapter.findUserById(String(session.userId))) as {
              habilitado?: boolean;
            } | null;
            if (usuario?.habilitado === false) {
              throw APIError.from("FORBIDDEN", {
                message: MENSAJE_USUARIO_DESHABILITADO,
                code: CODIGO_USUARIO_DESHABILITADO,
              });
            }
          },
        },
      },
    },

    // Mapeo al modelo Usuario
    user: {
      modelName: "usuario",
      fields: {
        name: "nombreCompleto",
        email: "correo",
        emailVerified: "correoVerificado",
        image: "imagen",
        createdAt: "creadoEn",
        updatedAt: "actualizadoEn",
      },
      additionalFields: {
        rol: { type: "string", defaultValue: "CLIENTE", input: false },
        idIdioma: { type: "number", defaultValue: 1 },
        cargo: { type: "string", required: false },
        direccion: { type: "string", required: false },
        telefono: { type: "string", required: false },
        // Solo lo cambia un admin (PATCH /api/admin/usuarios/:id/habilitado)
        habilitado: { type: "boolean", defaultValue: true, input: false },
      },
    },

    // Mapeo al modelo Sesion
    session: {
      modelName: "sesion",
      fields: {
        userId: "idUsuario",
        expiresAt: "expiraEn",
        createdAt: "creadoEn",
        updatedAt: "actualizadoEn",
      },
    },

    // Mapeo al modelo Cuenta
    account: {
      modelName: "cuenta",
      fields: {
        userId: "idUsuario",
        createdAt: "creadoEn",
        updatedAt: "actualizadoEn",
      },
    },

    // Mapeo al modelo Verificacion
    verification: {
      modelName: "verificacion",
      fields: {
        identifier: "identificador",
        value: "valor",
        expiresAt: "expiraEn",
        createdAt: "creadoEn",
        updatedAt: "actualizadoEn",
      },
    },
  });

export const auth = crearAuth(
  prismaAdapter(prisma, {
    provider: "postgresql",
  }),
);
