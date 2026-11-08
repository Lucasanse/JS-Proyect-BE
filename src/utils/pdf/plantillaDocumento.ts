import fs from "node:fs";
import PDFDocument from "pdfkit";
import { addDays, format } from "date-fns";
import { COMERCIO } from "./comercio";
import type { DatosPdf } from "../documentos.types";

// Plantilla unica para presupuestos y facturas: membrete con logo y datos del comercio,
// datos del cliente, detalle de productos, total, leyenda y pie de pagina en cada hoja.
// Pensada para imprimir en blanco y negro: sin fondos de color, todo con bordes y lineas.
// Los datos y colores del comercio se cambian en comercio.ts (misma carpeta).

type Doc = InstanceType<typeof PDFDocument>;
interface Fuentes {
  normal: string;
  negrita: string;
}

const MARGEN = 40;
const ALTO_PIE = 40;
const { colores: C } = COMERCIO;

// Columnas de la tabla de productos (suman el ancho util de una hoja A4: 515)
const COLUMNAS = [
  { titulo: "Producto", ancho: 275, alinear: "left" },
  { titulo: "Cant.", ancho: 50, alinear: "center" },
  { titulo: "Precio unit.", ancho: 95, alinear: "right" },
  { titulo: "Subtotal", ancho: 95, alinear: "right" },
] as const;
const PADDING = 6;
const ALTO_FILA_MIN = 22;

const formatoArs = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
// Los espacios especiales de Intl se pasan a espacios comunes para que la fuente estandar los dibuje
const pesos = (valor: number) => formatoArs.format(valor).replace(/[  ]/g, " ");
const fecha = (valor: Date) => format(valor, "dd/MM/yyyy");
// "30123456789" -> "30-12345678-9" (si ya viene con guiones, queda igual)
const cuit = (valor: string) => (/^\d{11}$/.test(valor) ? `${valor.slice(0, 2)}-${valor.slice(2, 10)}-${valor.slice(10)}` : valor);

const TITULOS = { PRESUPUESTO: "Presupuesto", FACTURA: "Factura" } as const;

// Genera el PDF en memoria
export function renderizarDocumento(datos: DatosPdf): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGEN, left: MARGEN, right: MARGEN, bottom: MARGEN + ALTO_PIE },
    bufferPages: true, // para escribir "Pagina X de Y" al final
    info: {
      Title: `${TITULOS[datos.tipo]} ${datos.numero}`,
      Author: COMERCIO.razonSocial,
    },
  });

  const partes: Buffer[] = [];
  const listo = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (parte: Buffer) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  const f = registrarFuentes(doc);
  let y = encabezado(doc, f, datos);
  y = bloqueCliente(doc, f, datos, y);
  y = tablaItems(doc, f, datos, y);
  y = bloqueTotal(doc, f, datos, y);
  leyenda(doc, f, datos, y);
  pieDePagina(doc, f);

  doc.end();
  return listo;
}

// Fuente de marca si esta configurada; si no, Helvetica
function registrarFuentes(doc: Doc): Fuentes {
  const usar = (ruta: string | undefined, nombre: string, respaldo: string) => {
    if (ruta && fs.existsSync(ruta)) {
      doc.registerFont(nombre, ruta);
      return nombre;
    }
    return respaldo;
  };
  return {
    normal: usar(COMERCIO.fuentes.normal, "Marca", "Helvetica"),
    negrita: usar(COMERCIO.fuentes.negrita, "Marca-Negrita", "Helvetica-Bold"),
  };
}

const anchoUtil = (doc: Doc) => doc.page.width - MARGEN * 2;
const limiteInferior = (doc: Doc) => doc.page.height - doc.page.margins.bottom;

function linea(doc: Doc, y: number, grosor: number, color: string) {
  doc.moveTo(MARGEN, y).lineTo(MARGEN + anchoUtil(doc), y).lineWidth(grosor).strokeColor(color).stroke();
}

// Si lo que sigue no entra en la hoja, pasa a una nueva y devuelve el y donde seguir
function asegurarEspacio(doc: Doc, y: number, alto: number) {
  if (y + alto <= limiteInferior(doc)) return y;
  doc.addPage();
  return MARGEN;
}

// Membrete: logo, datos del comercio y recuadro con tipo, numero y fecha
function encabezado(doc: Doc, f: Fuentes, datos: DatosPdf) {
  const top = MARGEN;
  let xTexto = MARGEN;
  if (fs.existsSync(COMERCIO.logo)) {
    doc.image(COMERCIO.logo, MARGEN, top, { fit: [60, 60] });
    xTexto += 72;
  }

  const anchoCaja = 180;
  const xCaja = MARGEN + anchoUtil(doc) - anchoCaja;
  const anchoDatos = xCaja - xTexto - 12;

  doc.font(f.negrita).fontSize(17).fillColor(C.texto).text(COMERCIO.nombre, xTexto, top, { width: anchoDatos });
  doc.font(f.normal).fontSize(9).fillColor(C.secundario);
  const lineas = [
    COMERCIO.razonSocial,
    `CUIT ${cuit(COMERCIO.cuit)} - ${COMERCIO.condicionIva}`,
    COMERCIO.direccion,
    `Tel. ${COMERCIO.telefono}`,
    `${COMERCIO.email} - ${COMERCIO.web}`,
  ];
  let yDatos = top + 23;
  for (const texto of lineas) {
    doc.text(texto, xTexto, yDatos, { width: anchoDatos, lineBreak: false, ellipsis: true });
    yDatos += 11.5;
  }

  // Recuadro con borde (sin relleno) para el tipo de comprobante
  const detalles: [string, string][] = [
    ["N°", datos.numero],
    ["Fecha", fecha(datos.fecha)],
  ];
  if (datos.tipo === "PRESUPUESTO") {
    detalles.push(["Válido hasta", fecha(addDays(datos.fecha, COMERCIO.validezPresupuestoDias))]);
  }
  if (datos.referencia) detalles.push(["Referencia", datos.referencia]);

  const altoTitulo = 28;
  const altoCaja = altoTitulo + 8 + detalles.length * 13;
  doc.rect(xCaja, top, anchoCaja, altoCaja).lineWidth(1.5).strokeColor(C.borde).stroke();
  doc
    .moveTo(xCaja, top + altoTitulo)
    .lineTo(xCaja + anchoCaja, top + altoTitulo)
    .lineWidth(1)
    .strokeColor(C.borde)
    .stroke();
  doc
    .font(f.negrita)
    .fontSize(15)
    .fillColor(C.texto)
    .text(TITULOS[datos.tipo].toUpperCase(), xCaja, top + 8, { width: anchoCaja, align: "center", characterSpacing: 1.5 });

  let yDetalle = top + altoTitulo + 6;
  for (const [etiqueta, valor] of detalles) {
    doc.font(f.normal).fontSize(9).fillColor(C.secundario).text(etiqueta, xCaja + 10, yDetalle, { width: 70 });
    doc
      .font(f.negrita)
      .fontSize(9)
      .fillColor(C.texto)
      .text(valor, xCaja + 80, yDetalle, { width: anchoCaja - 90, align: "right" });
    yDetalle += 13;
  }

  const y = Math.max(yDatos, top + altoCaja) + 12;
  linea(doc, y, 1.5, C.borde);
  return y + 14;
}

// Datos del cliente en un recuadro de borde fino, en dos columnas
function bloqueCliente(doc: Doc, f: Fuentes, datos: DatosPdf, y: number) {
  const { cliente } = datos;
  const ancho = anchoUtil(doc);
  const campos: [string, string | null][] = [
    ["Nombre", cliente.nombre],
    ["Email", cliente.correo],
    ["Dirección", cliente.direccion],
    ["Teléfono", cliente.telefono],
  ];
  const visibles = campos.filter((c): c is [string, string] => !!c[1]);
  const filas = Math.ceil(visibles.length / 2);
  const alto = 24 + filas * 14;

  doc.rect(MARGEN, y, ancho, alto).lineWidth(0.75).strokeColor(C.borde).stroke();
  doc.font(f.negrita).fontSize(9).fillColor(C.texto).text("CLIENTE", MARGEN + 10, y + 8, { characterSpacing: 1 });

  const anchoColumna = (ancho - 20) / 2;
  visibles.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + 10 + (i % 2) * anchoColumna;
    const yCampo = y + 22 + Math.floor(i / 2) * 14;
    doc.font(f.normal).fontSize(9).fillColor(C.secundario).text(`${etiqueta}:`, x, yCampo, { continued: true });
    doc.font(f.negrita).fillColor(C.texto).text(` ${valor}`, { width: anchoColumna - 10, lineBreak: false, ellipsis: true });
  });
  return y + alto + 18;
}

// Titulos de la tabla: texto en negrita entre dos lineas negras (sin fondo)
function filaTitulos(doc: Doc, f: Fuentes, y: number) {
  linea(doc, y, 1.5, C.borde);
  doc.font(f.negrita).fontSize(9).fillColor(C.texto);
  let x = MARGEN;
  for (const col of COLUMNAS) {
    doc.text(col.titulo.toUpperCase(), x + PADDING, y + 7, { width: col.ancho - PADDING * 2, align: col.alinear });
    x += col.ancho;
  }
  linea(doc, y + ALTO_FILA_MIN, 1, C.borde);
  return y + ALTO_FILA_MIN;
}

// Detalle de productos. Si no entra en una hoja, sigue en la proxima repitiendo los titulos.
function tablaItems(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  let y = filaTitulos(doc, f, asegurarEspacio(doc, yInicial, ALTO_FILA_MIN * 2));

  datos.items.forEach((item, i) => {
    const celdas = [item.nombre, String(item.cantidad), pesos(item.precioUnitario), pesos(item.subtotal)];
    doc.font(f.normal).fontSize(9.5);
    const altoNombre = doc.heightOfString(item.nombre, { width: COLUMNAS[0].ancho - PADDING * 2 });
    const alto = Math.max(ALTO_FILA_MIN, altoNombre + 12);

    const yAntes = y;
    y = asegurarEspacio(doc, y, alto);
    if (y !== yAntes) y = filaTitulos(doc, f, y);

    let x = MARGEN;
    COLUMNAS.forEach((col, c) => {
      doc
        .font(c === 3 ? f.negrita : f.normal)
        .fontSize(9.5)
        .fillColor(C.texto)
        .text(celdas[c], x + PADDING, y + 6, { width: col.ancho - PADDING * 2, align: col.alinear });
      x += col.ancho;
    });
    // Separador punteado entre filas; la ultima cierra con linea negra
    const ultima = i === datos.items.length - 1;
    if (ultima) {
      linea(doc, y + alto, 1, C.borde);
    } else {
      doc.dash(1.5, { space: 2 });
      linea(doc, y + alto, 0.5, C.lineaSuave);
      doc.undash();
    }
    y += alto;
  });

  return y + 12;
}

// Total en un recuadro de borde doble (se distingue bien en cualquier impresora)
function bloqueTotal(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  const y = asegurarEspacio(doc, yInicial, 64);
  const anchoCaja = 240;
  const x = MARGEN + anchoUtil(doc) - anchoCaja;
  const unidades = datos.items.reduce((acc, i) => acc + i.cantidad, 0);

  doc
    .font(f.normal)
    .fontSize(9)
    .fillColor(C.secundario)
    .text(`Cantidad de productos: ${unidades}`, x, y, { width: anchoCaja, align: "right" });

  const yCaja = y + 16;
  const altoCaja = 36;
  doc.rect(x, yCaja, anchoCaja, altoCaja).lineWidth(2).strokeColor(C.borde).stroke();
  doc.rect(x + 3, yCaja + 3, anchoCaja - 6, altoCaja - 6).lineWidth(0.5).strokeColor(C.borde).stroke();
  doc.font(f.negrita).fontSize(10).fillColor(C.texto).text("TOTAL (ARS)", x + 14, yCaja + 13, { width: 90 });
  doc
    .font(f.negrita)
    .fontSize(15)
    .fillColor(C.texto)
    .text(pesos(datos.total), x + 100, yCaja + 10, { width: anchoCaja - 114, align: "right" });
  return yCaja + altoCaja + 24;
}

function leyenda(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  const texto =
    datos.tipo === "PRESUPUESTO"
      ? `${COMERCIO.leyendaPresupuesto} Válido por ${COMERCIO.validezPresupuestoDias} días desde su emisión.`
      : COMERCIO.leyendaFactura;
  const opciones = { width: anchoUtil(doc) };
  doc.font(f.normal).fontSize(8.5);
  const y = asegurarEspacio(doc, yInicial, doc.heightOfString(texto, opciones));
  doc.fillColor(C.secundario).text(texto, MARGEN, y, opciones);
}

// Pie en todas las hojas: datos del comercio y numero de pagina
function pieDePagina(doc: Doc, f: Fuentes) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    // Se escribe debajo del margen inferior: sin esto PDFKit agregaria una hoja nueva
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const y = doc.page.height - MARGEN - 10;
    const ancho = anchoUtil(doc);
    linea(doc, y, 0.75, C.borde);
    doc.font(f.normal).fontSize(8).fillColor(C.secundario);
    doc.text(`${COMERCIO.razonSocial} - CUIT ${cuit(COMERCIO.cuit)} - ${COMERCIO.web}`, MARGEN, y + 8, {
      width: ancho - 80,
      lineBreak: false,
    });
    doc.text(`Página ${i - start + 1} de ${count}`, MARGEN + ancho - 80, y + 8, { width: 80, align: "right", lineBreak: false });

    doc.page.margins.bottom = margenInferior;
  }
}
