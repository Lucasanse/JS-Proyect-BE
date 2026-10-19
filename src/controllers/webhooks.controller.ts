import MercadoPagoConfig, { Payment } from "mercadopago";
import type { Request, Response } from "express";
import {
  procesarCompraAprobadaCarrito,
  procesarCompraAprobadaUnidad,
} from "./ventas.controller";

//Este es el accessToken del vendedor
const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function recibidorDeWebHookMP(req: Request, res: Response) {
  //Enviamos el res.status pq mp necesita el 200 ok urgente
  res.status(200).send("OK");
  const { type, data } = req.body;
  const infoMP =
    req.query.topic || req.query.type || req.body.topic || req.body.type;
  const idDelPago =
    req.query.id || req.query["data.id"] || req.body.data?.id || req.body.id;

  //ACa buscamos en la api de MP la informacion del pago
  if (infoMP === "payment" && idDelPago)
    try {
      const payment = new Payment(cliente);
      const infoPago = await payment.get({ id: idDelPago });
      if (infoPago.status === "approved") {
        //Recuperamos el id que nos manda el buen mercado pago, no lee metadata
        const referencia = infoPago.external_reference; // Ej: "UNIDAD_2_7_2" o "2"
        const idPagoMP = infoPago.id?.toString() || "Sin ID";

        //Aca diferenciamos si es de carrito o es compra unica
        if (referencia && referencia.startsWith("UNIDAD_")) {
          // Desarmamos el string (['UNIDAD', '2', '7', '2'])
          const partes = referencia.split("_");
          const idUsuario = Number(partes[1]);
          const idProducto = Number(partes[2]);
          const cantidad = Number(partes[3]);
          await procesarCompraAprobadaUnidad(
            idUsuario,
            idPagoMP,
            idProducto,
            cantidad,
          );
          console.log("Venta procesada para el user: ", idUsuario);
        }
        if (referencia && referencia.startsWith("CARRITO_")) {
          const partes = referencia.split("_");
          const idUsuario = Number(partes[1]);
          await procesarCompraAprobadaCarrito(idUsuario, idPagoMP);
          console.log("Venta procesada para el user: ", idUsuario);
        }
      }
    } catch (error) {
      console.error("error procesando webhook", error);
    }
}
