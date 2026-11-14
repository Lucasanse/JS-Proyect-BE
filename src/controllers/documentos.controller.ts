import type { Request, Response } from "express";
import type { Documento } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import {
  armarItem,
  emitirFactura,
  emitirPresupuesto,
  leerPdf,
  nombreArchivo,
  resumenDocumento,
} from "../utils/documentos";
import type { DocumentoResumen, ItemDocumento, OrigenDocumento } from "../utils/documentos.types";
import { cargarServiciosArmador } from "../utils/servicios";
import { generarPresupuestoSchema, idDocumentoParamSchema } from "../validations/documentos.validation";

// Todas las rutas pasan por requireAuth. Cada usuario solo ve y descarga sus propios documentos:
// todas las consultas filtran por su id (si no es suyo, responde 404 como si no existiera).
const idUsuarioDe = (req: Request) => Number(req.usuario!.id);

// Items del presupuesto segun el origen, con los precios actuales
async function itemsPresupuesto(
  idUsuario: number,
  body: ReturnType<typeof generarPresupuestoSchema.parse>,
): Promise<{ origen: OrigenDocumento; items: ItemDocumento[] }> {
  if (body.origen === "carrito") {
    const carrito = await prisma.carrito.findUnique({
      where: { idUsuario },
      include: { items: { include: { producto: true, servicio: true }, orderBy: { idItemCarrito: "asc" } } },
    });
    // Productos y servicios del armador; los dados de baja quedan afuera
    const items = (carrito?.items ?? []).flatMap((i) => {
      if (i.producto) return i.producto.activo ? [armarItem(i, i.producto.nombre, i.cantidad, i.producto.precio)] : [];
      if (i.servicio?.activo && i.servicio.precio) return [armarItem(i, i.servicio.nombre, i.cantidad, i.servicio.precio)];
      return [];
    });
    if (items.length === 0) throw new AppError(400, "El carrito está vacío");
    return { origen: "CARRITO", items };
  }

  if (body.origen === "preset") {
    const preset = await prisma.preset.findFirst({
      where: { idPreset: body.idPreset, idUsuario },
      include: { componentes: { include: { producto: true } } },
    });
    if (!preset) throw new AppError(404, "Armado no encontrado");
    // Los productos dados de baja ya no se venden: quedan fuera del presupuesto
    const items = preset.componentes
      .filter((c) => c.producto.activo)
      .map((c) => armarItem(c, c.producto.nombre, c.cantidad, c.producto.precio));
    if (items.length === 0) throw new AppError(400, "El armado no tiene productos disponibles");
    return { origen: "PRESET", items };
  }

  const ids = body.seleccion.map((s) => s.idProducto);
  const productos = await prisma.producto.findMany({ where: { idProducto: { in: ids }, activo: true } });
  if (productos.length !== ids.length) throw new AppError(400, "Algún producto del armado ya no está disponible");
  const porId = new Map(productos.map((p) => [p.idProducto, p]));
  const items = body.seleccion.map(({ idProducto, cantidad }) => {
    const p = porId.get(idProducto)!;
    return armarItem({ idProducto }, p.nombre, cantidad, p.precio);
  });
  // Servicios elegidos (armado de PC, instalacion de Windows...), en espanol como el resto del PDF
  const servicios = await cargarServiciosArmador(body.servicios);
  items.push(...servicios.map((s) => armarItem({ idServicio: s.id }, s.nombre, 1, s.precio)));
  return { origen: "ARMADO", items };
}

function enviarPdf(res: Response, doc: Documento, pdf: Buffer) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo(doc)}"`);
  res.setHeader("Content-Length", pdf.length);
  res.send(pdf);
}

// POST /api/quotes  { origen: "carrito" | "preset" | "armado", ... }
// Genera el presupuesto sin comprar ni tocar el stock.
export async function generarPresupuesto(req: Request, res: Response<DocumentoResumen>) {
  const body = generarPresupuestoSchema.parse(req.body);
  const idUsuario = idUsuarioDe(req);
  const { origen, items } = await itemsPresupuesto(idUsuario, body);
  const documento = await emitirPresupuesto(idUsuario, origen, items);
  res.status(201).json(resumenDocumento(documento));
}

// GET /api/quotes  (presupuestos del usuario, los mas nuevos primero)
export async function listarPresupuestos(req: Request, res: Response<DocumentoResumen[]>) {
  const documentos = await prisma.documento.findMany({
    where: { idUsuario: idUsuarioDe(req), tipo: "PRESUPUESTO" },
    orderBy: { fecha: "desc" },
  });
  res.json(documentos.map(resumenDocumento));
}

// GET /api/quotes/:id/download
export async function descargarPresupuesto(req: Request, res: Response) {
  const { id } = idDocumentoParamSchema.parse(req.params);
  const documento = await prisma.documento.findFirst({
    where: { idDocumento: id, idUsuario: idUsuarioDe(req), tipo: "PRESUPUESTO" },
  });
  if (!documento) throw new AppError(404, "Presupuesto no encontrado");
  enviarPdf(res, documento, await leerPdf(documento));
}

// GET /api/orders/:id/invoice  (id = id de la venta)
// La factura se genera al acreditarse el pago; si en ese momento fallo, se genera ahora.
export async function descargarFactura(req: Request, res: Response) {
  const { id } = idDocumentoParamSchema.parse(req.params);
  const venta = await prisma.venta.findFirst({ where: { idVenta: id, idUsuario: idUsuarioDe(req) } });
  if (!venta) throw new AppError(404, "Pedido no encontrado");
  const documento = await emitirFactura(venta.idVenta);
  enviarPdf(res, documento, await leerPdf(documento));
}
