import MercadoPagoConfig, { Payment } from "mercadopago";
import type { Request, Response } from "express";
import { procesarCompraAprobadaCarrito } from "./ventas.controller";

//Este es el accessToken del vendedor
const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function recibidorDeWebHookMP(req: Request, res: Response) {
  //Enviamos el res.status pq mp necesita el 200 ok urgente
  res.status(200).send("OK");
  const { type, data } = req.body;
  const infoMP = req.query.topic || type;
  //ACa buscamos en la api de MP la informacion del pago
  if (infoMP === "payment" && data && data.id)
    try {
      const payment = new Payment(cliente);
      const infoPago = await payment.get({ id: data.id });

      if (infoPago.status === "approved") {
        //Recuperamos el id que nos manda el buen mercado pago
        const idUsuario = Number(infoPago.external_reference);
        const idPagoMP = infoPago.id?.toString() || "Sin ID";
        await procesarCompraAprobadaCarrito(idUsuario, idPagoMP);
        console.log("Venta procesada para el user: ", idUsuario);
      }
    } catch (error) {
      console.error("error procesando webhook", error);
    }
}
