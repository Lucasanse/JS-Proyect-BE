import type { Request, Response } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { obtenerOCrearCarrito, detalleCarrito } from "./carrito.controller";
import { prisma } from "../utils/prisma";

const cliente = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function crearOrdenPorUnidad(req: Request, res: Response) {
  //Acá tambien hay que sacar el body
  const idUsuario = Number(req.usuario!.id);
  const idProducto = Number(req.body.producto!.idProducto);
  const cantidad = Number(req.body.cantidad) || 1;
  //CUIDADO ACA CUANDO IMPLEMENTOS LO DEL CAMBIO DEL LENGUAJE DEL PRODUCTO
  try {
    const producto = await prisma.producto.findUnique({
      where: { idProducto: idProducto },
    });
    if (!producto) {
      return res.status(404).json({ error: "El producto no existe" });
    }

    const productoFormateadoParaMp = [
      {
        id: producto.idProducto.toString(),
        title: producto.nombre,
        quantity: cantidad,
        unit_price: Number(producto.precio),
        currency_id: "ARS",
      },
    ];
    const preference = new Preference(cliente);
    const respuesta = await preference.create({
      body: {
        items: productoFormateadoParaMp,
        back_urls: {
          //Acá despues tendriamos que poner los links posta. Ahora en test dejemoslo asi pq MP no redirecciona a un localhost
          success: "https://agency-amino-angelic.ngrok-free.dev/checkout/exito",
          failure: "https://agency-amino-angelic.ngrok-free.dev/checkout/error",
          pending:
            "https://agency-amino-angelic.ngrok-free.dev/checkout/pendiente",
        },
        auto_return: "approved",
        notification_url:
          "https://agency-amino-angelic.ngrok-free.dev/api/webhooks/mercadopago",
        external_reference: `UNIDAD_${idUsuario}_${idProducto}_${cantidad}`,
        metadata: {
          tipoCompra: "unidad",
          idProducto: idProducto,
          cantidad: cantidad,
        },
      },
    });
    res.json({ urlPago: respuesta.init_point });
  } catch (error) {
    console.error("Error al crear la preferencia en MP:", error);
    res.status(500).json({ error: "Ocurrió un error al procesar el pago" });
  }
}
export async function crearOrdenCarrito(req: Request, res: Response) {
  //Acá tambien cuando salgamos del entorno de pruebas hay que sacar ese req.body... Tendria que quedar solo req.usuario.id
  //Esto es pq para la prueba estamos sacando el auth que es lo que crear el objeto usuario :=0
  try {
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
          //Acá despues tendriamos que poner los links posta. Ahora en test dejemoslo asi pq MP no redirecciona a un localhost
          success: "https://agency-amino-angelic.ngrok-free.dev/checkout/exito",
          failure: "https://agency-amino-angelic.ngrok-free.dev/checkout/error",
          pending:
            "https://agency-amino-angelic.ngrok-free.dev/checkout/pendiente",
        },
        auto_return: "approved",
        notification_url:
          "https://agency-amino-angelic.ngrok-free.dev/api/webhooks/mercadopago",
        external_reference: `CARRITO_${idUsuario}`,
      },
    });
    res.json({ urlPago: respuesta.init_point });
  } catch (error) {
    console.error("Error al crear la preferencia en MP:", error);
    res.status(500).json({ error: "Ocurrió un error al procesar el pago" });
  }
}
