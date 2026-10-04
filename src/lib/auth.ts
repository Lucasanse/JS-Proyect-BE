// src/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Esto es para dejar que no joda el autoincremental
  advanced: {
    database: {
      generateId: "serial",
    },
  },

  emailAndPassword: {
    enabled: true,
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
