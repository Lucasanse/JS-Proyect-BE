import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";

// ─── Mocks ───────────────────────────────────────────────────────────
// Prisma se reemplaza por una base en memoria muy simple, y la sesion de
// Better Auth por un mock, asi los tests corren sin PostgreSQL.

type ProductoFake = {
  idProducto: number;
  nombre: string;
  descripcion: string;
  idMarca: number;
  precio: Prisma.Decimal;
  stock: number;
  imagenUrl: string | null;
  activo: boolean;
  idCategoria: number;
};

const { db, prismaMock, getSession } = vi.hoisted(() => {
  const db = {
    productos: new Map<number, ProductoFake>(),
    ventasPorProducto: new Map<number, number>(),
  };

  const conRelaciones = (p: ProductoFake) => ({
    ...p,
    categoria: { idCategoria: p.idCategoria, nombre: "Placas de video" },
    marca: { idMarca: p.idMarca, nombre: "NVIDIA" },
    traducciones: [],
    componentePC: null,
  });

  // Tipo de componente "CPU" con un atributo de texto (Socket) y uno numerico (Nucleos)
  const tipoCpu = {
    idTipoComponente: 1,
    nombre: "CPU",
    atributos: [
      { idAtributo: 10, idTipoComponente: 1, nombre: "Socket", unidad: null, numerico: false, opciones: ["AM5"] },
      { idAtributo: 11, idTipoComponente: 1, nombre: "Nucleos", unidad: null, numerico: true, opciones: [] },
    ],
  };

  const prismaMock = {
    producto: {
      findUnique: vi.fn(async ({ where }: { where: { idProducto: number } }) => {
        const p = db.productos.get(where.idProducto);
        return p ? conRelaciones(p) : null;
      }),
      delete: vi.fn(async ({ where }: { where: { idProducto: number } }) => {
        const p = db.productos.get(where.idProducto);
        if (!p) throw new Error("No existe");
        db.productos.delete(where.idProducto);
        return p;
      }),
      update: vi.fn(async ({ where, data }: { where: { idProducto: number }; data: Partial<ProductoFake> }) => {
        const p = { ...db.productos.get(where.idProducto)!, ...data };
        // Prisma devuelve el precio como Decimal
        if (typeof data.precio === "number") {
          const n = data.precio;
          p.precio = { toNumber: () => n } as Prisma.Decimal;
        }
        db.productos.set(where.idProducto, p);
        return p;
      }),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    detalleVenta: {
      count: vi.fn(async ({ where }: { where: { idProducto: number } }) => db.ventasPorProducto.get(where.idProducto) ?? 0),
    },
    componentePreset: { count: vi.fn(async () => 0) },
    categoria: { findUnique: vi.fn(async () => ({ idCategoria: 1, nombre: "Placas de video" })) },
    idioma: { findUnique: vi.fn(async () => null) }, // sin ingles: un PUT sin traduccion no hace nada
    marca: {
      findUnique: vi.fn(async () => ({ idMarca: 1, nombre: "NVIDIA" })),
      findFirst: vi.fn(async (): Promise<unknown> => null),
      create: vi.fn(async ({ data }: { data: { nombre: string } }) => ({ idMarca: 99, ...data })),
    },
    tipoComponente: {
      findUnique: vi.fn(async ({ where }: { where: { idTipoComponente: number } }) =>
        where.idTipoComponente === 1 ? tipoCpu : null,
      ),
    },
    componentePC: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})), delete: vi.fn() },
    valorAtributo: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 0 })) },
    itemCarrito: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    // Soporta las dos formas: array de operaciones o callback interactivo
    $transaction: vi.fn(async (arg: unknown): Promise<unknown> =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  };

  return { db, prismaMock, getSession: vi.fn() };
});

vi.mock("../src/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/auth", () => ({ auth: { api: { getSession }, handler: vi.fn() } }));

import { app } from "../src/app";

// ─── Helpers ─────────────────────────────────────────────────────────

const sesionDe = (rol: "ADMIN" | "CLIENTE") => ({ user: { id: "1", rol }, session: { id: "1" } });

function crearProducto(idProducto: number, ventas = 0) {
  db.productos.set(idProducto, {
    idProducto,
    nombre: `Producto ${idProducto}`,
    descripcion: "Descripcion",
    idMarca: 1,
    precio: new Prisma.Decimal(1000),
    stock: 5,
    imagenUrl: null,
    activo: true,
    idCategoria: 1,
  });
  if (ventas > 0) db.ventasPorProducto.set(idProducto, ventas);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.productos.clear();
  db.ventasPorProducto.clear();
  getSession.mockResolvedValue(sesionDe("ADMIN"));
});

// ─── Tests ───────────────────────────────────────────────────────────

describe("DELETE /api/admin/productos/:id", () => {
  it("elimina un producto sin ventas", async () => {
    crearProducto(1);

    const res = await request(app).delete("/api/admin/productos/1");

    expect(res.status).toBe(204);
    expect(prismaMock.producto.delete).toHaveBeenCalledWith({ where: { idProducto: 1 } });
    // Antes de borrarlo se saca de los carritos (la FK no tiene cascade)
    expect(prismaMock.itemCarrito.deleteMany).toHaveBeenCalledWith({ where: { idProducto: 1 } });
    expect(db.productos.has(1)).toBe(false);

    const despues = await request(app).get("/api/admin/productos/1");
    expect(despues.status).toBe(404);
  });

  it("devuelve 409 si el producto tiene ventas y el producto sigue existiendo", async () => {
    crearProducto(2, 3);

    const res = await request(app).delete("/api/admin/productos/2");

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ventas asociadas/i);
    expect(res.body.error).toMatch(/desactiv/i);
    expect(prismaMock.producto.delete).not.toHaveBeenCalled();
    expect(db.productos.has(2)).toBe(true);

    const despues = await request(app).get("/api/admin/productos/2");
    expect(despues.status).toBe(200);
    expect(despues.body.nombre).toBe("Producto 2");
  });

  it("un producto con ventas se puede desactivar en lugar de eliminarse", async () => {
    crearProducto(3, 1);

    expect((await request(app).delete("/api/admin/productos/3")).status).toBe(409);
    const res = await request(app).patch("/api/admin/productos/3/estado").send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
    expect(db.productos.get(3)?.activo).toBe(false);
  });

  it("devuelve 409 si se registra una venta justo antes de borrar (FK)", async () => {
    crearProducto(4);
    prismaMock.producto.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003", clientVersion: "test" }),
    );

    const res = await request(app).delete("/api/admin/productos/4");

    expect(res.status).toBe(409);
    expect(db.productos.has(4)).toBe(true);
  });

  it("devuelve 404 si el producto no existe", async () => {
    const res = await request(app).delete("/api/admin/productos/999");
    expect(res.status).toBe(404);
  });
});

describe("Permisos de /api/admin", () => {
  it("un usuario no admin recibe 403 y no se borra nada", async () => {
    crearProducto(1);
    getSession.mockResolvedValue(sesionDe("CLIENTE"));

    const res = await request(app).delete("/api/admin/productos/1");

    expect(res.status).toBe(403);
    expect(prismaMock.producto.delete).not.toHaveBeenCalled();
    expect(db.productos.has(1)).toBe(true);
  });

  it("sin sesion devuelve 401", async () => {
    getSession.mockResolvedValue(null);
    const res = await request(app).get("/api/admin/productos");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/productos (validaciones)", () => {
  const valido = { nombre: "RTX 5070", descripcion: "Placa de video", idMarca: 1, idCategoria: 1, precio: 100, stock: 0 };

  it.each([
    ["precio 0", { precio: 0 }, "precio"],
    ["precio negativo", { precio: -5 }, "precio"],
    ["stock negativo", { stock: -1 }, "stock"],
    ["stock con decimales", { stock: 1.5 }, "stock"],
    ["nombre vacio", { nombre: "  " }, "nombre"],
  ])("rechaza %s con 400", async (_caso, cambio, campo) => {
    const res = await request(app).post("/api/admin/productos").send({ ...valido, ...cambio });
    expect(res.status).toBe(400);
    expect(res.body.detalles.map((d: { path: string[] }) => d.path[0])).toContain(campo);
  });
});

describe("Catalogo publico", () => {
  it("GET /api/productos solo pide productos activos", async () => {
    await request(app).get("/api/productos");
    expect(prismaMock.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ activo: true }) }),
    );
  });

  it("GET /api/productoDetalle/:id devuelve 404 para un producto desactivado", async () => {
    crearProducto(5);
    db.productos.get(5)!.activo = false;

    const res = await request(app).get("/api/productoDetalle/5");
    expect(res.status).toBe(404);
  });
});

describe("Componente de PC (PUT /api/admin/productos/:id)", () => {
  const datos = { nombre: "Ryzen 5 7600", descripcion: "CPU", idMarca: 1, idCategoria: 1, precio: 100, stock: 1 };

  it("guarda el tipo, el consumo y los valores de los atributos", async () => {
    crearProducto(1);

    const res = await request(app)
      .put("/api/admin/productos/1")
      .send({
        ...datos,
        componente: {
          idTipoComponente: 1,
          wattsRequeridos: 65,
          atributos: [
            { idAtributo: 10, valor: "AM5" },
            { idAtributo: 11, valor: "6.0" },
          ],
        },
      });

    expect(res.status).toBe(200);
    expect(prismaMock.componentePC.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { idTipoComponente: 1, wattsRequeridos: 65 } }),
    );
    // Los numeros se guardan normalizados ("6.0" -> "6")
    expect(prismaMock.valorAtributo.createMany).toHaveBeenCalledWith({
      data: [
        { idProducto: 1, idAtributo: 10, valor: "AM5" },
        { idProducto: 1, idAtributo: 11, valor: "6" },
      ],
    });
  });

  it("rechaza un atributo que no es del tipo elegido", async () => {
    crearProducto(1);
    const res = await request(app)
      .put("/api/admin/productos/1")
      .send({ ...datos, componente: { idTipoComponente: 1, wattsRequeridos: 65, atributos: [{ idAtributo: 99, valor: "x" }] } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no corresponden/);
    expect(prismaMock.valorAtributo.createMany).not.toHaveBeenCalled();
  });

  it("rechaza texto en un atributo numerico", async () => {
    crearProducto(1);
    const res = await request(app)
      .put("/api/admin/productos/1")
      .send({ ...datos, componente: { idTipoComponente: 1, wattsRequeridos: 65, atributos: [{ idAtributo: 11, valor: "seis" }] } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nucleos/);
  });

  it("no deja quitar el componente si el producto esta en PCs armadas", async () => {
    crearProducto(1);
    prismaMock.componentePC.findUnique.mockResolvedValueOnce({ idProducto: 1 } as never);
    prismaMock.componentePreset.count.mockResolvedValueOnce(2);

    const res = await request(app).put("/api/admin/productos/1").send({ ...datos, componente: null });

    expect(res.status).toBe(409);
    expect(prismaMock.componentePC.delete).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/marcas", () => {
  it("crea una marca nueva", async () => {
    const res = await request(app).post("/api/admin/marcas").send({ nombre: "  Lian Li " });
    expect(res.status).toBe(201);
    expect(prismaMock.marca.create).toHaveBeenCalledWith({ data: { nombre: "Lian Li" } });
  });

  it("si ya existe con otras mayusculas devuelve la existente y no la duplica", async () => {
    prismaMock.marca.findFirst.mockResolvedValueOnce({ idMarca: 3, nombre: "Logitech", productos: [{ idCategoria: 9 }] });

    const res = await request(app).post("/api/admin/marcas").send({ nombre: "logitech" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 3, nombre: "Logitech", categorias: [9] });
    expect(prismaMock.marca.create).not.toHaveBeenCalled();
  });
});
