import MercadoPagoConfig, { Payment } from "mercadopago";
import type { Request, Response } from "express";

const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function recibidorDeWebHookMP(req: Request, res: Response) {
  res.status(200).send("OK");
  const { type, data } = req.body;
  //ACa buscamos en la api de MP la informacion del pago
  const payment = new Payment(cliente);
  const infoPago = await payment.get({ id: data.id });

  if (infoPago.status === "approved") {
    //Recuperamos el id que nos manda el buen mercado pago
    const idUsuario = Number(infoPago.external_reference);
  }
}
