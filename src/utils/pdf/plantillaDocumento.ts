import fs from "node:fs";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { COMERCIO } from "./comercio";
import { ALICUOTA_GENERAL, ivaContenido } from "../iva";
import type { DatosPdf } from "../documentos.types";

// Plantilla unica para presupuestos y facturas, con el formato de una Factura B electronica:
// encabezado partido con la letra del comprobante en el medio, datos fiscales del comercio
// (CUIT, Ingresos Brutos, inicio de actividades), datos del receptor con su condicion frente al IVA,
// detalle con alicuota de IVA, IVA contenido (Ley 27.743), total, leyenda y pie en cada hoja.
// Todavia no se pide el CAE a ARCA: por eso la factura aclara que no es valida como factura fiscal.
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
  { titulo: "Cant.", ancho: 40, alinear: "center" },
  { titulo: "Descripción", ancho: 212, alinear: "left" },
  { titulo: "Precio unitario", ancho: 95, alinear: "right" },
  { titulo: "Alícuota IVA", ancho: 78, alinear: "center" },
  { titulo: "Importe", ancho: 90, alinear: "right" },
] as const;
const COL_DESCRIPCION = 1;
const COL_IMPORTE = 4;
const PADDING = 6;
const ALTO_FILA_MIN = 22;

const formatoArs = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
// Los espacios especiales de Intl se pasan a espacios comunes para que la fuente estandar los dibuje
const pesos = (valor: number) => formatoArs.format(valor).replace(/[  ]/g, " ");
const fechaHora = (valor: Date) => format(valor, "dd/MM/yyyy HH:mm");
const porcentaje = (valor: number) => valor.toFixed(2).replace(".", ",");

// Factura B: los precios ya incluyen IVA. IVA contenido = total - total / (1 + alicuota)
// Los documentos viejos no guardaban la alicuota de cada item: eran todos al 21%
const alicuotaDe = (item: { alicuotaIva?: number }) => item.alicuotaIva ?? ALICUOTA_GENERAL;

// IVA contenido de los items, separado por alicuota (de mayor a menor)
function ivaPorAlicuota(items: DatosPdf["items"]) {
  const porAlicuota = new Map<number, number>();
  for (const item of items) {
    const a = alicuotaDe(item);
    if (a === 0) continue; // sin IVA (servicios)
    porAlicuota.set(a, (porAlicuota.get(a) ?? 0) + item.subtotal);
  }
  return [...porAlicuota.entries()].sort((x, y) => y[0] - x[0]).map(([a, total]) => [a, ivaContenido(total, a)] as const);
}
// "30123456789" -> "30-12345678-9" (si ya viene con guiones, queda igual)
const cuit = (valor: string) => (/^\d{11}$/.test(valor) ? `${valor.slice(0, 2)}-${valor.slice(2, 10)}-${valor.slice(10)}` : valor);

const TITULOS = { PRESUPUESTO: "Presupuesto", FACTURA: "Factura" } as const;
// Letra de la factura: B (consumidor final), con su codigo de ARCA (06 = Factura B).
// El presupuesto no lleva letra: tiene su propio encabezado (encabezadoPresupuesto).
const LETRA = "B";
const CODIGO_ARCA = "06";

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
  // El presupuesto tiene un formato propio, mas liviano: no se parece a una factura
  const esPresupuesto = datos.tipo === "PRESUPUESTO";
  let y = esPresupuesto ? encabezadoPresupuesto(doc, f, datos) : encabezado(doc, f, datos);
  y = esPresupuesto ? clientePresupuesto(doc, f, datos, y) : bloqueCliente(doc, f, datos, y);
  y = tablaItems(doc, f, datos, y);
  y = esPresupuesto ? totalPresupuesto(doc, f, datos, y) : bloqueTotal(doc, f, datos, y);
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

// Encabezado de comprobante: un recuadro partido al medio con la letra (B) arriba al centro.
// Izquierda: logo, nombre y datos del comercio. Derecha: tipo, numero, fecha y datos fiscales.
function encabezado(doc: Doc, f: Fuentes, datos: DatosPdf) {
  const top = MARGEN;
  const ancho = anchoUtil(doc);
  const medio = MARGEN + ancho / 2;
  const ladoLetra = 46;
  const pad = 12;

  // ── Izquierda: comercio ──
  const anchoIzq = ancho / 2 - ladoLetra / 2 - pad * 2;
  let yIzq = top + pad;
  let xTexto = MARGEN + pad;
  if (fs.existsSync(COMERCIO.logo)) {
    doc.image(COMERCIO.logo, xTexto, yIzq, { fit: [48, 48] });
    doc.font(f.negrita).fontSize(16).fillColor(C.texto).text(COMERCIO.nombre, xTexto + 56, yIzq + 14, {
      width: anchoIzq - 56,
    });
    yIzq += 58;
  } else {
    doc.font(f.negrita).fontSize(16).fillColor(C.texto).text(COMERCIO.nombre, xTexto, yIzq, { width: anchoIzq });
    yIzq += 24;
  }
  doc.font(f.negrita).fontSize(9).fillColor(C.texto).text(COMERCIO.razonSocial, xTexto, yIzq, { width: anchoIzq });
  yIzq += 12;
  doc.font(f.normal).fontSize(8.5).fillColor(C.secundario);
  for (const texto of [COMERCIO.direccion, `Tel. ${COMERCIO.telefono}`, COMERCIO.email, COMERCIO.web]) {
    doc.text(texto, xTexto, yIzq, { width: anchoIzq, lineBreak: false, ellipsis: true });
    yIzq += 11;
  }
  doc.font(f.negrita).fontSize(8.5).fillColor(C.texto).text(COMERCIO.condicionIva, xTexto, yIzq + 2, { width: anchoIzq });
  yIzq += 16;

  // ── Derecha: comprobante ──
  const xDer = medio + ladoLetra / 2 + pad;
  const anchoDer = MARGEN + ancho - pad - xDer;
  const [puntoVenta, nroComprobante] = datos.numero.split("-");
  let yDer = top + pad;
  doc
    .font(f.negrita)
    .fontSize(18)
    .fillColor(C.texto)
    .text(TITULOS[datos.tipo].toUpperCase(), xDer, yDer, { width: anchoDer, characterSpacing: 1 });
  yDer += 26;
  const filas: [string, string][] = [
    ["Punto de venta:", puntoVenta],
    ["Comp. Nro:", nroComprobante],
    ["Fecha de emisión:", fechaHora(datos.fecha)],
    ["CUIT:", cuit(COMERCIO.cuit)],
    ["Ingresos Brutos:", COMERCIO.ingresosBrutos],
    ["Inicio de actividades:", COMERCIO.inicioActividades],
  ];
  if (datos.referencia) filas.push(["Referencia:", datos.referencia]);
  for (const [etiqueta, valor] of filas) {
    doc.font(f.normal).fontSize(8.5).fillColor(C.secundario).text(etiqueta, xDer, yDer, { width: 100 });
    doc.font(f.negrita).fontSize(8.5).fillColor(C.texto).text(valor, xDer + 100, yDer, { width: anchoDer - 100 });
    yDer += 12;
  }

  // ── Recuadro, division y letra ──
  const alto = Math.max(yIzq, yDer) - top + pad - 4;
  doc.rect(MARGEN, top, ancho, alto).lineWidth(1.5).strokeColor(C.borde).stroke();
  doc
    .moveTo(medio, top + ladoLetra)
    .lineTo(medio, top + alto)
    .lineWidth(0.75)
    .strokeColor(C.borde)
    .stroke();
  const xLetra = medio - ladoLetra / 2;
  doc.rect(xLetra, top, ladoLetra, ladoLetra).lineWidth(1.5).strokeColor(C.borde).stroke();
  doc.font(f.negrita).fontSize(26).fillColor(C.texto).text(LETRA, xLetra, top + 6, { width: ladoLetra, align: "center" });
  // El codigo de ARCA solo en la factura: el presupuesto no es un comprobante fiscal
  if (datos.tipo === "FACTURA") {
    doc
      .font(f.normal)
      .fontSize(6.5)
      .fillColor(C.texto)
      .text(`COD. ${CODIGO_ARCA}`, xLetra, top + ladoLetra - 10, { width: ladoLetra, align: "center" });
  }

  return top + alto + 10;
}

// ─── Presupuesto: formato propio, sin datos fiscales ───

// Logo y nombre del comercio; a la derecha "PRESUPUESTO" con numero y fecha. Una linea abajo.
function encabezadoPresupuesto(doc: Doc, f: Fuentes, datos: DatosPdf) {
  const top = MARGEN;
  const ancho = anchoUtil(doc);
  let x = MARGEN;
  if (fs.existsSync(COMERCIO.logo)) {
    doc.image(COMERCIO.logo, x, top, { fit: [44, 44] });
    x += 54;
  }
  doc.font(f.negrita).fontSize(18).fillColor(C.texto).text(COMERCIO.nombre, x, top + 4, { width: ancho / 2 });
  doc
    .font(f.normal)
    .fontSize(8.5)
    .fillColor(C.secundario)
    .text(`${COMERCIO.web}  ·  ${COMERCIO.telefono}`, x, top + 27, { width: ancho / 2, lineBreak: false, ellipsis: true });

  const anchoDer = 200;
  const xDer = MARGEN + ancho - anchoDer;
  doc
    .font(f.negrita)
    .fontSize(20)
    .fillColor(C.texto)
    .text("PRESUPUESTO", xDer, top, { width: anchoDer, align: "right", characterSpacing: 2 });
  doc
    .font(f.normal)
    .fontSize(9)
    .fillColor(C.secundario)
    .text(`N° ${datos.numero}  ·  ${fechaHora(datos.fecha).slice(0, 10)}`, xDer, top + 27, { width: anchoDer, align: "right" });

  const y = top + 54;
  linea(doc, y, 2, C.borde);
  return y + 16;
}

// Para quien es, en una sola linea
function clientePresupuesto(doc: Doc, f: Fuentes, datos: DatosPdf, y: number) {
  const { cliente } = datos;
  const extra = [cliente.correo, cliente.telefono].filter(Boolean).join("  ·  ");
  doc.font(f.normal).fontSize(9.5).fillColor(C.secundario).text("Preparado para: ", MARGEN, y, { continued: true });
  doc.font(f.negrita).fillColor(C.texto).text(cliente.nombre, { continued: !!extra });
  if (extra) doc.font(f.normal).fillColor(C.secundario).text(`  ·  ${extra}`);
  return y + 24;
}

// Como en el carrito: subtotal sin IVA, IVA y total
function totalPresupuesto(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  const y = asegurarEspacio(doc, yInicial, 90);
  const anchoCaja = 240;
  const x = MARGEN + anchoUtil(doc) - anchoCaja;
  const iva = Math.round(datos.items.reduce((acc, i) => acc + ivaContenido(i.subtotal, alicuotaDe(i)), 0) * 100) / 100;
  const neto = Math.round((datos.total - iva) * 100) / 100;

  const fila = (etiqueta: string, valor: string, yFila: number) => {
    doc.font(f.normal).fontSize(9.5).fillColor(C.secundario).text(etiqueta, x, yFila, { width: anchoCaja - 110 });
    doc.font(f.negrita).fontSize(9.5).fillColor(C.texto).text(valor, x + anchoCaja - 120, yFila, { width: 120, align: "right" });
  };
  fila("Subtotal (sin IVA)", pesos(neto), y);
  fila("IVA", pesos(iva), y + 15);

  const yCaja = y + 34;
  const altoCaja = 36;
  doc.rect(x, yCaja, anchoCaja, altoCaja).lineWidth(2).strokeColor(C.borde).stroke();
  doc.font(f.negrita).fontSize(10).fillColor(C.texto).text("TOTAL", x + 14, yCaja + 13, { width: 90 });
  doc
    .font(f.negrita)
    .fontSize(15)
    .fillColor(C.texto)
    .text(pesos(datos.total), x + 100, yCaja + 10, { width: anchoCaja - 114, align: "right" });
  return yCaja + altoCaja + 24;
}

// ─── Factura ───

// Datos del receptor: condicion frente al IVA (consumidor final) y sus datos de contacto
function bloqueCliente(doc: Doc, f: Fuentes, datos: DatosPdf, y: number) {
  const { cliente } = datos;
  const ancho = anchoUtil(doc);
  const campos: [string, string | null][] = [
    ["Apellido y nombre", cliente.nombre],
    ["Condición frente al IVA", COMERCIO.condicionIvaCliente],
    ["Domicilio", cliente.direccion],
    ["Email", cliente.correo],
    ["Teléfono", cliente.telefono],
    ["Condición de venta", datos.tipo === "FACTURA" ? "Contado - Mercado Pago" : "A convenir"],
  ];
  const visibles = campos.filter((c): c is [string, string] => !!c[1]);
  const filas = Math.ceil(visibles.length / 2);
  const alto = 10 + filas * 14;

  doc.rect(MARGEN, y, ancho, alto).lineWidth(0.75).strokeColor(C.borde).stroke();
  const anchoColumna = (ancho - 20) / 2;
  visibles.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + 10 + (i % 2) * anchoColumna;
    const yCampo = y + 7 + Math.floor(i / 2) * 14;
    doc.font(f.normal).fontSize(8.5).fillColor(C.secundario).text(`${etiqueta}:`, x, yCampo, { continued: true });
    doc.font(f.negrita).fillColor(C.texto).text(` ${valor}`, { width: anchoColumna - 10, lineBreak: false, ellipsis: true });
  });
  return y + alto + 14;
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
    const celdas = [
      String(item.cantidad),
      item.nombre,
      pesos(item.precioUnitario),
      // Sin IVA (servicios): se deja la alicuota vacia
      alicuotaDe(item) > 0 ? `${porcentaje(alicuotaDe(item))} %` : "—",
      pesos(item.subtotal),
    ];
    doc.font(f.normal).fontSize(9.5);
    const altoNombre = doc.heightOfString(item.nombre, { width: COLUMNAS[COL_DESCRIPCION].ancho - PADDING * 2 });
    const alto = Math.max(ALTO_FILA_MIN, altoNombre + 12);

    const yAntes = y;
    y = asegurarEspacio(doc, y, alto);
    if (y !== yAntes) y = filaTitulos(doc, f, y);

    let x = MARGEN;
    COLUMNAS.forEach((col, c) => {
      doc
        .font(c === COL_IMPORTE ? f.negrita : f.normal)
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

// Totales de Factura B: subtotal, IVA contenido (Regimen de Transparencia Fiscal al Consumidor,
// Ley 27.743) y el total en un recuadro de borde doble (se distingue bien en cualquier impresora)
function bloqueTotal(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  const y = asegurarEspacio(doc, yInicial, 120);
  const ancho = anchoUtil(doc);
  const anchoCaja = 240;
  const x = MARGEN + ancho - anchoCaja;
  const unidades = datos.items.reduce((acc, i) => acc + i.cantidad, 0);

  const fila = (etiqueta: string, valor: string, yFila: number) => {
    doc.font(f.normal).fontSize(9).fillColor(C.secundario).text(etiqueta, x, yFila, { width: anchoCaja - 100 });
    doc.font(f.negrita).fontSize(9).fillColor(C.texto).text(valor, x + anchoCaja - 110, yFila, { width: 110, align: "right" });
  };
  fila(`Subtotal (${unidades} ${unidades === 1 ? "unidad" : "unidades"})`, pesos(datos.total), y);
  fila("Importe otros tributos", pesos(0), y + 13);

  const yCaja = y + 30;
  const altoCaja = 36;
  doc.rect(x, yCaja, anchoCaja, altoCaja).lineWidth(2).strokeColor(C.borde).stroke();
  doc.rect(x + 3, yCaja + 3, anchoCaja - 6, altoCaja - 6).lineWidth(0.5).strokeColor(C.borde).stroke();
  doc.font(f.negrita).fontSize(10).fillColor(C.texto).text("IMPORTE TOTAL", x + 14, yCaja + 13, { width: 100 });
  doc
    .font(f.negrita)
    .fontSize(15)
    .fillColor(C.texto)
    .text(pesos(datos.total), x + 110, yCaja + 10, { width: anchoCaja - 124, align: "right" });

  // Regimen de Transparencia Fiscal al Consumidor: a la izquierda de los totales
  const anchoTransp = ancho - anchoCaja - 20;
  const yTransp = y;
  const ivas = ivaPorAlicuota(datos.items);
  const altoTransp = 30 + (ivas.length + 1) * 14;
  doc.rect(MARGEN, yTransp, anchoTransp, altoTransp).lineWidth(0.75).strokeColor(C.borde).stroke();
  doc
    .font(f.negrita)
    .fontSize(8)
    .fillColor(C.texto)
    .text("Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)", MARGEN + 8, yTransp + 7, { width: anchoTransp - 16 });
  const filaTransp = (etiqueta: string, valor: string, yFila: number) => {
    doc.font(f.normal).fontSize(8.5).fillColor(C.secundario).text(etiqueta, MARGEN + 8, yFila, { width: anchoTransp - 110 });
    doc.font(f.negrita).fontSize(8.5).fillColor(C.texto).text(valor, MARGEN + anchoTransp - 108, yFila, { width: 100, align: "right" });
  };
  ivas.forEach(([a, iva], i) => filaTransp(`IVA contenido (${porcentaje(a)}%)`, pesos(iva), yTransp + 24 + i * 14));
  filaTransp("Otros impuestos nacionales indirectos", pesos(0), yTransp + 24 + ivas.length * 14);

  return Math.max(yCaja + altoCaja, yTransp + altoTransp) + 18;
}

function leyenda(doc: Doc, f: Fuentes, datos: DatosPdf, yInicial: number) {
  const texto = datos.tipo === "PRESUPUESTO" ? COMERCIO.leyendaPresupuesto : COMERCIO.leyendaFactura;
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
