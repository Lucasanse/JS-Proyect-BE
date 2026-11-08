import path from "node:path";

// Datos y formato visual del comercio para los PDF (presupuestos y facturas).
// Se usan en el membrete, el encabezado y el pie de pagina de plantillaDocumento.ts (misma carpeta).
export const COMERCIO = {
  nombre: "JS Computación",
  razonSocial: "JS Computación S.R.L.",
  cuit: "30123456789",
  condicionIva: "IVA Responsable Inscripto",
  direccion: "R Sáenz Peña, 97 Allen, Rio Negro",
  telefono: "+54 2984 123-5678",
  email: "ventas@jscomputacion.com",
  web: "www.jscomputacion.com.ar",
  // Punto de venta que precede al numero del comprobante: 0001-00000012
  puntoVenta: 1,

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

  validezPresupuestoDias: 7,
  leyendaPresupuesto:
    "Este presupuesto no constituye una factura ni reserva stock. Los precios están expresados en pesos argentinos y pueden variar según disponibilidad.",
  // Para emitir facturas fiscales hace falta el CAE de ARCA (ex AFIP); mientras tanto se aclara en el PDF.
  leyendaFactura: "Comprobante no válido como factura fiscal.",
};
