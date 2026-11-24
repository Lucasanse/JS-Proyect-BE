import MercadoPagoConfig, { MerchantOrder, Payment } from "mercadopago";
import type { Request, Response } from "express";
import {
  procesarCompraAprobadaCarrito,
  procesarCompraAprobadaUnidad,
} from "./ventas.controller";

//Este es el accessToken del vendedor
const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

// Procesa un pago: lo busca en la API de Mercado Pago (no se confia en lo que llega en el aviso)
// y, si esta aprobado, registra la venta. Registrar la misma venta dos veces no pasa:
// procesarCompraAprobada* ignora un idPagoMp que ya existe.
async function procesarPago(idDelPago: string | number) {
  const payment = new Payment(cliente);
  const infoPago = await payment.get({ id: idDelPago });
  if (infoPago.status !== "approved") return;

  //Recuperamos el id que nos manda el buen mercado pago, no lee metadata
  const referencia = infoPago.external_reference; // Ej: "UNIDAD_2_7_2" o "CARRITO_2"
  const idPagoMP = infoPago.id?.toString() || "Sin ID";

  //Aca diferenciamos si es de carrito o es compra unica
  if (referencia && referencia.startsWith("UNIDAD_")) {
    // Desarmamos el string (['UNIDAD', '2', '7', '2'])
    const partes = referencia.split("_");
    const idUsuario = Number(partes[1]);
    const idProducto = Number(partes[2]);
    const cantidad = Number(partes[3]);
    await procesarCompraAprobadaUnidad(idUsuario, idPagoMP, idProducto, cantidad);
    console.log("Venta procesada para el user: ", idUsuario);
  }
  if (referencia && referencia.startsWith("CARRITO_")) {
    const partes = referencia.split("_");
    const idUsuario = Number(partes[1]);
    await procesarCompraAprobadaCarrito(idUsuario, idPagoMP);
    console.log("Venta procesada para el user: ", idUsuario);
  }
}

export async function recibidorDeWebHookMP(req: Request, res: Response) {
  //Enviamos el res.status pq mp necesita el 200 ok urgente
  res.status(200).send("OK");
  const infoMP =
    req.query.topic || req.query.type || req.body.topic || req.body.type;
  const idRecibido =
    req.query.id || req.query["data.id"] || req.body.data?.id || req.body.id;
  if (!idRecibido) return;

  try {
    //Aviso de pago: se procesa ese pago
    if (infoMP === "payment") {
      await procesarPago(String(idRecibido));
    }
    // Aviso de la orden: a veces Mercado Pago solo manda este (sin el de "payment"),
    // asi que se procesan los pagos aprobados que tenga la orden
    if (infoMP === "merchant_order" || infoMP === "topic_merchant_order_wh") {
      const orden = await new MerchantOrder(cliente).get({ merchantOrderId: String(idRecibido) });
      for (const pago of orden.payments ?? []) {
        if (pago.id && pago.status === "approved") await procesarPago(pago.id);
      }
    }
  } catch (error) {
    console.error("error procesando webhook", error);
  }
}
