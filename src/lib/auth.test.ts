// Tests de login y sesion con usuarios deshabilitados. Usan la misma configuracion de Better Auth
// que la app, pero con la base en memoria (no hace falta Postgres).
// Correr con: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { memoryAdapter } from "better-auth/adapters/memory";
import { crearAuth } from "./auth";
import { crearRequireAuth } from "../middlewares/auth";
import { AppError } from "../utils/AppError";
import { CODIGO_USUARIO_DESHABILITADO, validarCambioHabilitado } from "../utils/usuarios.habilitacion";

const CREDENCIALES = { email: "cliente@test.com", password: "contraseña-segura" };

type Fila = Record<string, unknown>;

async function crearEntorno() {
  const db: Record<string, Fila[]> = { usuario: [], sesion: [], cuenta: [], verificacion: [] };
  const auth = crearAuth(memoryAdapter(db));
  await auth.api.signUpEmail({ body: { name: "Cliente de prueba", ...CREDENCIALES } });
  // El registro deja una sesion abierta; se arranca sin ninguna
  db.sesion.length = 0;
  const usuario = db.usuario[0];

  const setHabilitado = (habilitado: boolean) => {
    usuario.habilitado = habilitado;
  };
  const ingresar = () => auth.api.signInEmail({ body: CREDENCIALES, asResponse: true });

  return { db, auth, usuario, setHabilitado, ingresar };
}

// Cookie de sesion que devuelve el login, lista para mandar en el header "cookie"
const cookieDe = (res: Response | globalThis.Response) =>
  ((res as globalThis.Response).headers.get("set-cookie") ?? "").split(";")[0];

// Pasa una request con esa cookie por requireAuth y devuelve que contesto
async function pasarPorRequireAuth(auth: ReturnType<typeof crearAuth>, cookie: string) {
  const resultado: { status?: number; body?: { error?: string; code?: string }; paso: boolean } = { paso: false };
  const res = {
    status(codigo: number) {
      resultado.status = codigo;
      return this;
    },
    json(body: typeof resultado.body) {
      resultado.body = body;
      return this;
    },
  } as unknown as Response;
  const req = { headers: { cookie } } as Request;
  const next: NextFunction = () => {
    resultado.paso = true;
  };
  await crearRequireAuth(auth)(req, res, next);
  return resultado;
}

describe("login con usuario deshabilitado", () => {
  it("un usuario habilitado inicia sesion normalmente", async () => {
    const { ingresar } = await crearEntorno();
    const res = await ingresar();
    assert.equal(res.status, 200);
    assert.ok(cookieDe(res));
  });

  it("los usuarios nuevos quedan habilitados", async () => {
    const { usuario } = await crearEntorno();
    assert.equal(usuario.habilitado, true);
  });

  it("un usuario deshabilitado no puede iniciar sesion (403 con codigo)", async () => {
    const { db, setHabilitado, ingresar } = await crearEntorno();
    setHabilitado(false);

    const res = await ingresar();
    assert.equal(res.status, 403);
    const body = (await res.json()) as { code: string; message: string };
    assert.equal(body.code, CODIGO_USUARIO_DESHABILITADO);
    assert.match(body.message, /deshabilitada/);
    assert.equal(db.sesion.length, 0, "no se crea la sesion");
  });

  it("con la contraseña incorrecta sigue diciendo credenciales invalidas", async () => {
    const { auth, setHabilitado } = await crearEntorno();
    setHabilitado(false);

    const res = await auth.api.signInEmail({ body: { ...CREDENCIALES, password: "otra-cosa-123" }, asResponse: true });
    assert.equal(res.status, 401);
    assert.notEqual(((await res.json()) as { code: string }).code, CODIGO_USUARIO_DESHABILITADO);
  });

  it("al volver a habilitarlo recupera el acceso", async () => {
    const { setHabilitado, ingresar } = await crearEntorno();
    setHabilitado(false);
    assert.equal((await ingresar()).status, 403);

    setHabilitado(true);
    assert.equal((await ingresar()).status, 200);
  });
});

describe("sesion vigente de un usuario deshabilitado", () => {
  it("con la cuenta habilitada la sesion pasa por requireAuth", async () => {
    const { auth, ingresar } = await crearEntorno();
    const cookie = cookieDe(await ingresar());
    const r = await pasarPorRequireAuth(auth, cookie);
    assert.equal(r.paso, true);
  });

  it("si se deshabilita con la sesion abierta, requireAuth la rechaza con 403", async () => {
    const { auth, setHabilitado, ingresar } = await crearEntorno();
    const cookie = cookieDe(await ingresar());
    setHabilitado(false);

    const r = await pasarPorRequireAuth(auth, cookie);
    assert.equal(r.paso, false);
    assert.equal(r.status, 403);
    assert.equal(r.body?.code, CODIGO_USUARIO_DESHABILITADO);
  });

  it("al borrarle las sesiones (como hace el admin al deshabilitar) ya no hay sesion", async () => {
    const { db, auth, setHabilitado, ingresar } = await crearEntorno();
    const cookie = cookieDe(await ingresar());
    setHabilitado(false);
    db.sesion.length = 0;

    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
    const r = await pasarPorRequireAuth(auth, cookie);
    assert.equal(r.paso, false);
    assert.equal(r.status, 401);
  });

  it("al rehabilitarlo y volver a entrar, la sesion nueva funciona", async () => {
    const { auth, setHabilitado, ingresar } = await crearEntorno();
    setHabilitado(false);
    setHabilitado(true);
    const cookie = cookieDe(await ingresar());
    assert.equal((await pasarPorRequireAuth(auth, cookie)).paso, true);
  });
});

describe("cambio de habilitacion", () => {
  const esError409 = (e: unknown) => e instanceof AppError && e.statusCode === 409;

  const admin = { id: 1, rol: "ADMIN" };
  const otroAdmin = { id: 2, rol: "ADMIN" };
  const cliente = { id: 3, rol: "CLIENTE" };

  it("un admin no se puede deshabilitar a si mismo", () => {
    assert.throws(() => validarCambioHabilitado(admin.id, admin, false), esError409);
  });

  it("un admin no puede deshabilitar a otro admin", () => {
    assert.throws(() => validarCambioHabilitado(admin.id, otroAdmin, false), esError409);
  });

  it("un admin puede deshabilitar y habilitar a un cliente", () => {
    assert.doesNotThrow(() => validarCambioHabilitado(admin.id, cliente, false));
    assert.doesNotThrow(() => validarCambioHabilitado(admin.id, cliente, true));
  });

  it("a un admin deshabilitado (desde la base) se lo puede volver a habilitar", () => {
    assert.doesNotThrow(() => validarCambioHabilitado(admin.id, otroAdmin, true));
    assert.doesNotThrow(() => validarCambioHabilitado(admin.id, admin, true));
  });
});
