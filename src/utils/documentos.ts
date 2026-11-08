import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, type Documento } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError } from "./AppError";
import { COMERCIO } from "./pdf/comercio";
import { renderizarDocumento } from "./pdf/plantillaDocumento";
import { crearNotificacionDocumento } from "./notificaciones";
import type {
  ClienteDocumento,
  DocumentoResumen,
  ItemDocumento,
  OrigenDocumento,
  TipoDocumento,
} from "./documentos.types";

// Presupuestos y facturas en PDF: numeracion, guardado del archivo y notificacion.
// Los PDF quedan en la carpeta "documentos" del BE (no es publica: se descargan con sesion).
export const CARPETA_DOCUMENTOS = path.resolve(process.cwd(), "documentos");
const SUBCARPETAS: Record<TipoDocumento, string> = { PRESUPUESTO: "presupuestos", FACTURA: "facturas" };

// Una venta tiene el pago acreditado si MP la aprobo (las ventas se crean recien ahi) y no se cancelo
export const pagoAcreditado = (venta: { idPagoMp: string | null; estado: string }) =>
  !!venta.idPagoMp && venta.estado.toLowerCase() !== "cancelado";

// 12 -> "0001-00000012"
export const formatearNumero = (numero: number) =>
  `${String(COMERCIO.puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;

export const nombreArchivo = (doc: Pick<Documento, "tipo" | "numero">) =>
  `${doc.tipo === "FACTURA" ? "factura" : "presupuesto"}-${formatearNumero(doc.numero)}.pdf`;

const redondear = (valor: number) => Math.round(valor * 100) / 100;

export function armarItem(idProducto: number, nombre: string, cantidad: number, precio: Prisma.Decimal | number): ItemDocumento {
  const precioUnitario = Number(precio);
  return { idProducto, nombre, cantidad, precioUnitario, subtotal: redondear(precioUnitario * cantidad) };
}

export async function clienteDe(idUsuario: number): Promise<ClienteDocumento> {
  const usuario = await prisma.usuario.findUnique({ where: { id: idUsuario } });
  if (!usuario) throw new AppError(404, "Usuario no encontrado");
  return {
    nombre: usuario.nombreCompleto,
    correo: usuario.correo,
    direccion: usuario.direccion,
    telefono: usuario.telefono,
  };
}

export function resumenDocumento(doc: Documento): DocumentoResumen {
  const items = doc.items as unknown as ItemDocumento[];
  return {
    id: doc.idDocumento,
    tipo: doc.tipo as TipoDocumento,
    numero: formatearNumero(doc.numero),
    fecha: doc.fecha.toISOString(),
    origen: doc.origen as OrigenDocumento,
    idVenta: doc.idVenta,
    total: Number(doc.total),
    cantidadItems: items.reduce((acc, i) => acc + i.cantidad, 0),
  };
}

interface NuevoDocumento {
  tipo: TipoDocumento;
  idUsuario: number;
  origen: OrigenDocumento;
  items: ItemDocumento[];
  cliente: ClienteDocumento;
  idVenta?: number;
  total?: number; // si no viene, la suma de los subtotales
}

// Guarda el documento con el proximo numero de su tipo, genera el PDF y avisa al usuario
async function emitirDocumento(datos: NuevoDocumento) {
  const total = datos.total ?? redondear(datos.items.reduce((acc, i) => acc + i.subtotal, 0));

  const documento = await prisma.$transaction(async (tx) => {
    // Bloqueo por tipo mientras dura la transaccion: dos emisiones a la vez no toman el mismo numero
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`documentos_${datos.tipo}`}))`;
    const ultimo = await tx.documento.aggregate({ where: { tipo: datos.tipo }, _max: { numero: true } });
    const numero = (ultimo._max.numero ?? 0) + 1;

    return tx.documento.create({
      data: {
        tipo: datos.tipo,
        idUsuario: datos.idUsuario,
        idVenta: datos.idVenta,
        origen: datos.origen,
        numero,
        items: datos.items as unknown as Prisma.InputJsonValue,
        cliente: datos.cliente as unknown as Prisma.InputJsonValue,
        total,
        rutaArchivo: `${SUBCARPETAS[datos.tipo]}/${nombreArchivo({ tipo: datos.tipo, numero })}`,
      },
    });
  });

  await guardarPdf(documento);
  crearNotificacionDocumento(documento);
  return documento;
}

// Dibuja el PDF con los datos guardados del documento y lo escribe en disco
async function guardarPdf(doc: Documento) {
  const pdf = await renderizarDocumento({
    tipo: doc.tipo as TipoDocumento,
    numero: formatearNumero(doc.numero),
    fecha: doc.fecha,
    cliente: doc.cliente as unknown as ClienteDocumento,
    items: doc.items as unknown as ItemDocumento[],
    total: Number(doc.total),
    referencia: doc.idVenta ? `Compra #${doc.idVenta}` : undefined,
  });
  const ruta = path.join(CARPETA_DOCUMENTOS, doc.rutaArchivo);
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  await fs.writeFile(ruta, pdf);
  return pdf;
}

// Contenido del PDF. Si el archivo se perdio (o fallo al guardarlo), se vuelve a generar igual.
export async function leerPdf(doc: Documento) {
  try {
    return await fs.readFile(path.join(CARPETA_DOCUMENTOS, doc.rutaArchivo));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return guardarPdf(doc);
  }
}

export async function emitirPresupuesto(idUsuario: number, origen: OrigenDocumento, items: ItemDocumento[]) {
  if (items.length === 0) throw new AppError(400, "No hay productos para presupuestar");
  return emitirDocumento({ tipo: "PRESUPUESTO", idUsuario, origen, items, cliente: await clienteDe(idUsuario) });
}

// Factura de una venta. Solo con el pago acreditado y una sola vez por venta:
// si ya existe la devuelve (MP puede avisar el mismo pago varias veces).
export async function emitirFactura(idVenta: number) {
  const existente = await prisma.documento.findUnique({ where: { idVenta } });
  if (existente) return existente;

  const venta = await prisma.venta.findUnique({
    where: { idVenta },
    include: { detalles: { include: { producto: { select: { nombre: true } } }, orderBy: { idDetalleVenta: "asc" } } },
  });
  if (!venta) throw new AppError(404, "Pedido no encontrado");
  if (!pagoAcreditado(venta)) {
    throw new AppError(409, "La factura estará disponible cuando se acredite el pago");
  }

  try {
    return await emitirDocumento({
      tipo: "FACTURA",
      idUsuario: venta.idUsuario,
      idVenta,
      origen: "VENTA",
      items: venta.detalles.map((d) => armarItem(d.idProducto, d.producto.nombre, d.cantidad, d.precioUnitario)),
      cliente: await clienteDe(venta.idUsuario),
      total: Number(venta.total),
    });
  } catch (error) {
    // Otra emision de la misma venta gano la carrera (id_venta es unico): se usa esa
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const otra = await prisma.documento.findUnique({ where: { idVenta } });
      if (otra) return otra;
    }
    throw error;
  }
}

// Para el webhook de pago: no corta el flujo si falla (se puede volver a pedir desde el pedido)
export async function emitirFacturaSinFallar(idVenta: number) {
  try {
    await emitirFactura(idVenta);
  } catch (error) {
    console.error(`No se pudo generar la factura de la venta ${idVenta}:`, error);
  }
}
