import path from "node:path";

// Datos y formato visual del comercio para los PDF (presupuestos y facturas).
// Se usan en el membrete, el encabezado y el pie de pagina de plantillaDocumento.ts (misma carpeta).
export const COMERCIO = {
  nombre: "JS Computación",
  razonSocial: "JS Computación S.R.L.",
  cuit: "20172395210",
  condicionIva: "IVA Responsable Inscripto",
  direccion: "R Sáenz Peña, 97 Allen, Rio Negro",
  telefono: "+54 9 298 495-7572",
  email: "ventas@jscomputacion.com",
  web: "www.jscomputacion.com.ar",
  // Punto de venta que precede al numero del comprobante: 0001-00000012
  puntoVenta: 1,

  // Datos fiscales del encabezado, con formato de Factura B (los de la factura en papel del local).
  // Verificarlos con el contador: se tomaron de una foto.
  ingresosBrutos: "2001766/9",
  inicioActividades: "15/09/1994",
  // Por ahora se vende a consumidor final (Factura B: el IVA va incluido en lo cobrado).
  // La alicuota de IVA es de cada producto (ver src/utils/iva.ts).
  condicionIvaCliente: "Consumidor Final",

  // PNG o JPG (PDFKit no lee SVG ni WebP)
  logo: path.resolve(process.cwd(), "assets", "logo.png"),

  // Pensado para imprimir en blanco y negro: sin fondos de color (ahorra tinta) y con grises
  // oscuros para que el texto secundario no salga borroso en impresoras laser o de chorro.
  colores: {
    texto: "#000000",
    secundario: "#404040", // datos del comercio, leyendas, pie
    borde: "#000000", // recuadros y lineas principales
    lineaSuave: "#9a9a9a", // separadores entre filas de la tabla
  },

  // Tipografia: rutas a archivos TTF/OTF de la fuente de marca. Si no se cargan (o no existen),
  // se usa Helvetica, que viene incluida en PDFKit.
  fuentes: {
    normal: undefined as string | undefined,
    negrita: undefined as string | undefined,
  },

  leyendaPresupuesto:
    "Este presupuesto no constituye una factura ni reserva stock. Los precios están expresados en pesos argentinos y pueden variar según disponibilidad, si finaliza una oferta o si hay aumentos de precio.",
  // Para emitir facturas fiscales hace falta el CAE de ARCA (ex AFIP); mientras tanto se aclara en el PDF.
  leyendaFactura: "Comprobante no válido como factura fiscal.",
};
