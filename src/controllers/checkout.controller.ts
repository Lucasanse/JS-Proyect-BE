import type { Request, Response } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { obtenerOCrearCarrito, detalleCarrito } from "./carrito.controller";
import type { CarritoDetalle } from "../utils/catalogo.types";

const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});
export async function crearOrdenCarrito(req: Request, res: Response) {
  const idUsuario = Number(req.body.usuario!.id);
  const Idcarrito = await obtenerOCrearCarrito(idUsuario);
  const carrito = await detalleCarrito(Idcarrito.idCarrito);

  const productos = carrito.items.map((item) => ({
    id: item.producto.id.toString(),
    title: item.producto.nombre,
    unit_price: item.producto.precio,
    quantity: item.cantidad,
    currency_id: "ARS",
  }));

  const preference = new Preference(cliente);
  const respuesta = await preference.create({
    body: {
      items: productos,
      back_urls: {
        success: "https://agency-amino-angelic.ngrok-free.dev/checkout/exito",
        failure: "https://agency-amino-angelic.ngrok-free.dev/checkout/error",
        pending:
          "https://agency-amino-angelic.ngrok-free.dev/checkout/pendiente",
      },
      auto_return: "approved",
      notification_url:
        "https://agency-amino-angelic.ngrok-free.dev/api/webhooks/mercadopago",
      external_reference: idUsuario.toString(),
    },
  });
  res.json({ urlPago: respuesta.init_point });
}
