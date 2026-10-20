import { z } from "zod";
import { ESTADOS_SOLICITUD } from "../utils/servicioTecnico.estados";
import {
  SISTEMAS_OPERATIVOS,
  SOFTWARE,
  TIPOS_EQUIPO,
  TIPOS_SERVICIO,
  type TipoServicio,
} from "../utils/servicioTecnico.catalogo";

const texto = (campo: string, min: number, max: number) =>
  z
    .string({ error: `Completá ${campo}` })
    .trim()
    .min(min, min === 1 ? `Completá ${campo}` : `Escribí al menos ${min} caracteres`)
    .max(max, `Máximo ${max} caracteres`);

const MIN_DESCRIPCION = 10;
const MAX_DESCRIPCION = 2000;

const softwareSchema = z
  .array(z.enum(SOFTWARE, { error: `Software no válido. Valores: ${SOFTWARE.join(", ")}` }), {
    error: "Elegí qué programas instalar",
  })
  .refine((lista) => new Set(lista).size === lista.length, { message: "Hay programas repetidos" })
  .refine((lista) => lista.filter((s) => SISTEMAS_OPERATIVOS.includes(s)).length <= 1, {
    message: "Elegí un solo sistema operativo (Windows 10 o Windows 11)",
  });

// POST /api/servicio-tecnico
// El cliente puede pedir varios servicios juntos (ej. limpieza + formateo + instalacion).
// Segun lo que elija se piden mas datos:
// - REPARACION: que equipo es (PC fija, notebook o impresora) y que le sucede (obligatorio)
// - LIMPIEZA (externa): si quiere que ademas se cambie la pasta termica
// - FORMATEO: si quiere un backup de sus archivos antes de formatear
// - OPTIMIZACION: si quiere que se cambie el disco duro por un SSD
// - INSTALACION_SOFTWARE: que programas instalar (al menos uno, un solo Windows)
// - OTRO: que necesita (obligatorio)
// La descripcion es opcional si no hay REPARACION ni OTRO.
// Lo que no corresponde a los servicios elegidos se descarta (null / [] / false).
export const crearSolicitudSchema = z
  .object({
    servicios: z
      .array(z.enum(TIPOS_SERVICIO, { error: `Servicio no válido. Valores: ${TIPOS_SERVICIO.join(", ")}` }), {
        error: "Elegí qué servicio necesitás",
      })
      .min(1, "Elegí al menos un servicio")
      .refine((lista) => new Set(lista).size === lista.length, { message: "Hay servicios repetidos" }),
    tipoEquipo: z.enum(TIPOS_EQUIPO, { error: "Elegí qué equipo hay que reparar" }).nullish(),
    software: softwareSchema.default([]),
    conBackup: z.boolean({ error: "conBackup debe ser true o false" }).default(false),
    conPastaTermica: z.boolean({ error: "conPastaTermica debe ser true o false" }).default(false),
    conSSD: z.boolean({ error: "conSSD debe ser true o false" }).default(false),
    descripcion: z.string().trim().max(MAX_DESCRIPCION, `Máximo ${MAX_DESCRIPCION} caracteres`).nullish(),
  })
  .superRefine((d, ctx) => {
    const pide = (s: TipoServicio) => d.servicios.includes(s);
    if (pide("REPARACION") && !d.tipoEquipo) {
      ctx.addIssue({ code: "custom", path: ["tipoEquipo"], message: "Elegí qué equipo hay que reparar" });
    }
    if (pide("INSTALACION_SOFTWARE") && d.software.length === 0) {
      ctx.addIssue({ code: "custom", path: ["software"], message: "Elegí al menos un programa para instalar" });
    }
    if (pide("REPARACION") || pide("OTRO")) {
      const largo = d.descripcion?.length ?? 0;
      if (largo < MIN_DESCRIPCION) {
        ctx.addIssue({
          code: "custom",
          path: ["descripcion"],
          message:
            largo === 0
              ? pide("REPARACION")
                ? "Contanos qué le sucede al equipo"
                : "Contanos qué servicio necesitás"
              : `Escribí al menos ${MIN_DESCRIPCION} caracteres`,
        });
      }
    }
  })
  .transform((d) => ({
    // Siempre en el mismo orden, sin importar como se eligieron
    servicios: TIPOS_SERVICIO.filter((s) => d.servicios.includes(s)),
    tipoEquipo: d.servicios.includes("REPARACION") ? (d.tipoEquipo ?? null) : null,
    software: d.servicios.includes("INSTALACION_SOFTWARE") ? d.software : [],
    conBackup: d.servicios.includes("FORMATEO") && d.conBackup,
    conPastaTermica: d.servicios.includes("LIMPIEZA") && d.conPastaTermica,
    conSSD: d.servicios.includes("OPTIMIZACION") && d.conSSD,
    descripcion: d.descripcion || null,
  }));

export type SolicitudInput = z.infer<typeof crearSolicitudSchema>;

// POST /api/admin/servicio-tecnico/:id/respuestas
export const respuestaSchema = z.object({
  mensaje: texto("la respuesta", 1, 2000),
});

const estadoSchema = z.enum(ESTADOS_SOLICITUD, { error: `Estado no válido. Valores: ${ESTADOS_SOLICITUD.join(", ")}` });

// PATCH /api/admin/servicio-tecnico/:id/estado  { estado, mensaje? }
// Para RECHAZADA el mensaje es obligatorio: es el motivo que le llega al cliente.
// En los demas estados el mensaje se ignora.
export const cambiarEstadoSchema = z
  .object({
    estado: estadoSchema,
    mensaje: z.string().trim().max(2000, "Máximo 2000 caracteres").nullish(),
  })
  .superRefine((d, ctx) => {
    if (d.estado !== "RECHAZADA") return;
    const largo = d.mensaje?.length ?? 0;
    if (largo < MIN_DESCRIPCION) {
      ctx.addIssue({
        code: "custom",
        path: ["mensaje"],
        message:
          largo === 0
            ? "Escribí el motivo del rechazo para el cliente"
            : `Escribí al menos ${MIN_DESCRIPCION} caracteres`,
      });
    }
  })
  .transform((d) => ({ estado: d.estado, mensaje: d.estado === "RECHAZADA" ? d.mensaje! : null }));

// GET /api/admin/servicio-tecnico?estado=&q=&page=&limit=
export const listarSolicitudesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: estadoSchema.optional(),
  // Busca por número de solicitud, descripción o nombre/correo del cliente
  q: z.string().trim().min(1).max(100).optional(),
});

export const idSolicitudParamSchema = z.object({
  id: z.coerce.number().int().positive("Id no válido"),
});
