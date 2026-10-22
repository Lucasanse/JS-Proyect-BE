import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import { validarCambioHabilitado } from "../utils/usuarios.habilitacion";
import type { EstadoSolicitud } from "../utils/servicioTecnico.estados";
import type { TipoEquipo, TipoServicio } from "../utils/servicioTecnico.catalogo";
import type { ListadoUsuariosAdmin, UsuarioAdminDetalle, UsuarioAdminResumen } from "../utils/usuarios.types";
import {
  cambiarHabilitadoSchema,
  idUsuarioParamSchema,
  listarUsuariosQuerySchema,
} from "../validations/adminUsuarios.validation";

// Todas estas rutas pasan por requireAuth + requireAdmin (ver routes/index.ts).

// Cuantas compras y solicitudes recientes se muestran en el detalle
const ULTIMAS = 5;

const selectResumen = {
  id: true,
  nombreCompleto: true,
  correo: true,
  rol: true,
  habilitado: true,
  creadoEn: true,
} satisfies Prisma.UsuarioSelect;

const mapearResumen = (u: Prisma.UsuarioGetPayload<{ select: typeof selectResumen }>): UsuarioAdminResumen => ({
  id: u.id,
  nombre: u.nombreCompleto,
  correo: u.correo,
  rol: u.rol,
  habilitado: u.habilitado,
  creadoEn: u.creadoEn,
});

async function buscarDetalle(id: number): Promise<UsuarioAdminDetalle> {
  const u = await prisma.usuario.findUnique({
    where: { id },
    select: {
      ...selectResumen,
      correoVerificado: true,
      telefono: true,
      direccion: true,
      cargo: true,
      actualizadoEn: true,
      idioma: { select: { codigo: true } },
      ventas: {
        select: { idVenta: true, fecha: true, total: true, estado: true, detalles: { select: { cantidad: true } } },
        orderBy: { fecha: "desc" },
        take: ULTIMAS,
      },
      solicitudesServicio: {
        select: { idSolicitud: true, fecha: true, estado: true, servicios: true, tipoEquipo: true },
        orderBy: { idSolicitud: "desc" },
        take: ULTIMAS,
      },
      _count: {
        select: {
          ventas: true,
          solicitudesServicio: true,
          sesiones: { where: { expiraEn: { gt: new Date() } } },
        },
      },
    },
  });
  if (!u) throw new AppError(404, "Usuario no encontrado");
  return {
    ...mapearResumen(u),
    correoVerificado: u.correoVerificado,
    telefono: u.telefono,
    direccion: u.direccion,
    cargo: u.cargo,
    idioma: u.idioma.codigo,
    actualizadoEn: u.actualizadoEn,
    cantidadCompras: u._count.ventas,
    cantidadSolicitudes: u._count.solicitudesServicio,
    sesionesActivas: u._count.sesiones,
    ultimasCompras: u.ventas.map((v) => ({
      id: v.idVenta,
      fecha: v.fecha,
      total: Number(v.total),
      estado: v.estado,
      cantidadProductos: v.detalles.reduce((suma, d) => suma + d.cantidad, 0),
    })),
    ultimasSolicitudes: u.solicitudesServicio.map((s) => ({
      id: s.idSolicitud,
      fecha: s.fecha,
      estado: s.estado as EstadoSolicitud,
      servicios: s.servicios as TipoServicio[],
      tipoEquipo: s.tipoEquipo as TipoEquipo | null,
    })),
  };
}

// GET /api/admin/usuarios?q=&habilitado=&page=&limit=
// Los registrados mas recientemente primero.
export async function listarUsuarios(req: Request, res: Response<ListadoUsuariosAdmin>) {
  const { page, limit, q, habilitado } = listarUsuariosQuerySchema.parse(req.query);

  const where: Prisma.UsuarioWhereInput = {
    habilitado,
    ...(q && {
      OR: [
        { nombreCompleto: { contains: q, mode: "insensitive" } },
        { correo: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [usuarios, total] = await prisma.$transaction([
    prisma.usuario.findMany({
      where,
      select: selectResumen,
      orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.usuario.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  res.json({
    data: usuarios.map(mapearResumen),
    paginacion: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
}

// GET /api/admin/usuarios/:id
export async function obtenerUsuario(req: Request, res: Response<UsuarioAdminDetalle>) {
  const { id } = idUsuarioParamSchema.parse(req.params);
  res.json(await buscarDetalle(id));
}

// PATCH /api/admin/usuarios/:id/habilitado  { habilitado }
// Al deshabilitar se borran sus sesiones, asi pierde el acceso al instante (Better Auth ya no
// las encuentra). Ademas no puede volver a entrar: ver databaseHooks en lib/auth.ts.
// Ningun admin se puede deshabilitar, ni a si mismo ni a otro (409).
export async function cambiarHabilitado(req: Request, res: Response<UsuarioAdminDetalle>) {
  const { id } = idUsuarioParamSchema.parse(req.params);
  const { habilitado } = cambiarHabilitadoSchema.parse(req.body);

  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { id: true, rol: true } });
  if (!usuario) throw new AppError(404, "Usuario no encontrado");
  validarCambioHabilitado(Number(req.usuario!.id), usuario, habilitado);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data: { habilitado } }),
    ...(habilitado ? [] : [prisma.sesion.deleteMany({ where: { idUsuario: id } })]),
  ]);

  res.json(await buscarDetalle(id));
}
