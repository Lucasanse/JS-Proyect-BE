// Tests de las solicitudes de servicio tecnico: transiciones de estado, historial y validacion.
// Correr con: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AppError } from "./AppError";
import {
  ESTADOS_FINALES,
  ESTADOS_SOLICITUD,
  TRANSICIONES,
  aceptaRespuestas,
  esEstadoSolicitud,
  puedeTransicionar,
  transicionesDesde,
  validarTransicion,
} from "./servicioTecnico.estados";
import { armarHistorial } from "./servicioTecnico.mapper";
import { cambiarEstadoSchema, crearSolicitudSchema } from "../validations/servicioTecnico.validation";

const esError409 = (e: unknown) => e instanceof AppError && e.statusCode === 409;

describe("transiciones de estado", () => {
  it("se puede pasar de cualquier estado a cualquier otro, sin orden", () => {
    for (const desde of ESTADOS_SOLICITUD) {
      for (const hacia of ESTADOS_SOLICITUD.filter((e) => e !== desde)) {
        assert.doesNotThrow(() => validarTransicion(desde, hacia), `${desde} -> ${hacia}`);
      }
    }
  });

  it("se puede saltear pasos, volver atras y reabrir", () => {
    assert.ok(puedeTransicionar("PENDIENTE", "RESUELTA"));
    assert.ok(puedeTransicionar("RESUELTA", "PENDIENTE"));
    assert.ok(puedeTransicionar("CERRADA", "EN_REVISION"));
    assert.ok(puedeTransicionar("RECHAZADA", "PENDIENTE"));
  });

  it("pasar al mismo estado es un error", () => {
    for (const estado of ESTADOS_SOLICITUD) {
      assert.throws(() => validarTransicion(estado, estado), esError409);
      assert.equal(transicionesDesde(estado).includes(estado), false, estado);
    }
  });

  it("un estado desconocido en la base se puede corregir pasandolo a cualquiera valido", () => {
    assert.equal(esEstadoSolicitud("ENVIADA"), false);
    assert.deepEqual(transicionesDesde("ENVIADA"), ESTADOS_SOLICITUD);
    assert.doesNotThrow(() => validarTransicion("ENVIADA", "PENDIENTE"));
  });

  it("todas las transiciones apuntan a estados validos", () => {
    for (const destinos of Object.values(TRANSICIONES)) {
      for (const hacia of destinos) assert.ok(esEstadoSolicitud(hacia));
    }
  });

  it("solo las rechazadas y las cerradas dejan de aceptar respuestas", () => {
    for (const estado of ESTADOS_SOLICITUD) {
      assert.equal(aceptaRespuestas(estado), !ESTADOS_FINALES.includes(estado), estado);
    }
  });
});

describe("cambio de estado", () => {
  const valida = (body: unknown) => cambiarEstadoSchema.safeParse(body).success;

  it("para rechazar hay que escribir el motivo", () => {
    assert.equal(valida({ estado: "RECHAZADA" }), false);
    assert.equal(valida({ estado: "RECHAZADA", mensaje: "   " }), false);
    assert.equal(valida({ estado: "RECHAZADA", mensaje: "No" }), false);
    assert.deepEqual(cambiarEstadoSchema.parse({ estado: "RECHAZADA", mensaje: "  No hay repuestos para ese modelo " }), {
      estado: "RECHAZADA",
      mensaje: "No hay repuestos para ese modelo",
    });
  });

  it("en los demas estados el mensaje no hace falta y se ignora", () => {
    assert.deepEqual(cambiarEstadoSchema.parse({ estado: "EN_REVISION" }), { estado: "EN_REVISION", mensaje: null });
    assert.deepEqual(cambiarEstadoSchema.parse({ estado: "CERRADA", mensaje: "chau" }), { estado: "CERRADA", mensaje: null });
  });
});

describe("historial", () => {
  const admin = { nombreCompleto: "Admin", rol: "ADMIN" };
  const cliente = { nombreCompleto: "Cliente", rol: "CLIENTE" };
  const fecha = (min: number) => new Date(Date.UTC(2026, 9, 17, 12, min));

  it("junta estados y respuestas en orden cronologico", () => {
    const historial = armarHistorial({
      historial: [
        { idHistorial: 2, idSolicitud: 1, idUsuario: 1, estadoAnterior: "PENDIENTE", estadoNuevo: "EN_REVISION", fecha: fecha(10), usuario: admin },
        { idHistorial: 1, idSolicitud: 1, idUsuario: 2, estadoAnterior: null, estadoNuevo: "PENDIENTE", fecha: fecha(0), usuario: cliente },
      ],
      respuestas: [
        { idRespuesta: 2, idSolicitud: 1, idUsuario: 1, mensaje: "Ya lo estamos revisando", fecha: fecha(20), usuario: admin },
        { idRespuesta: 1, idSolicitud: 1, idUsuario: 1, mensaje: "Recibido", fecha: fecha(5), usuario: admin },
      ],
    });

    assert.deepEqual(
      historial.map((e) => `${e.tipo}:${e.id}`),
      ["estado:1", "respuesta:1", "estado:2", "respuesta:2"],
    );
    assert.deepEqual(historial[0].autor, { nombre: "Cliente", esAdmin: false });
    assert.deepEqual(historial[1].autor, { nombre: "Admin", esAdmin: true });
  });

  it("con la misma fecha, el cambio de estado va antes que la respuesta", () => {
    const historial = armarHistorial({
      historial: [{ idHistorial: 1, idSolicitud: 1, idUsuario: 1, estadoAnterior: null, estadoNuevo: "PENDIENTE", fecha: fecha(0), usuario: cliente }],
      respuestas: [{ idRespuesta: 1, idSolicitud: 1, idUsuario: 1, mensaje: "Hola", fecha: fecha(0), usuario: admin }],
    });
    assert.deepEqual(historial.map((e) => e.tipo), ["estado", "respuesta"]);
  });
});

describe("datos de la solicitud segun los servicios elegidos", () => {
  const valida = (body: unknown) => crearSolicitudSchema.safeParse(body).success;

  it("se pueden pedir varios servicios juntos", () => {
    const ok = crearSolicitudSchema.parse({
      servicios: ["INSTALACION_SOFTWARE", "LIMPIEZA", "FORMATEO"],
      software: ["WIN11", "OFFICE"],
      conBackup: true,
      conPastaTermica: true,
      descripcion: "",
    });
    assert.deepEqual(ok, {
      servicios: ["LIMPIEZA", "FORMATEO", "INSTALACION_SOFTWARE"], // siempre en el mismo orden
      tipoEquipo: null,
      software: ["WIN11", "OFFICE"],
      conBackup: true,
      conPastaTermica: true,
      conSSD: false,
      descripcion: null,
    });
  });

  it("optimizacion: se puede pedir el cambio a SSD, que va solo con ese servicio", () => {
    assert.equal(crearSolicitudSchema.parse({ servicios: ["OPTIMIZACION"] }).conSSD, false);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["OPTIMIZACION"], conSSD: true }).conSSD, true);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["LIMPIEZA"], conSSD: true }).conSSD, false);
    assert.deepEqual(crearSolicitudSchema.parse({ servicios: ["OPTIMIZACION", "LIMPIEZA"] }).servicios, [
      "LIMPIEZA",
      "OPTIMIZACION",
    ]);
  });

  it("pide al menos un servicio, sin repetidos ni desconocidos", () => {
    assert.equal(valida({ servicios: [] }), false);
    assert.equal(valida({}), false);
    assert.equal(valida({ servicios: ["LIMPIEZA", "LIMPIEZA"] }), false);
    assert.equal(valida({ servicios: ["BACKUP"] }), false); // el backup va con el formateo
    assert.equal(valida({ servicios: ["LIMPIEZA"] }), true);
  });

  it("reparacion: pide el tipo de equipo y que le sucede", () => {
    const ok = crearSolicitudSchema.parse({
      servicios: ["REPARACION"],
      tipoEquipo: "NOTEBOOK",
      descripcion: "  No enciende desde ayer  ",
      software: ["VLC"], // no pidio instalacion: se descarta
      conBackup: true, // no pidio formateo: se descarta
      conPastaTermica: true, // no pidio limpieza: se descarta
      conSSD: true, // no pidio optimizacion: se descarta
    });
    assert.deepEqual(ok, {
      servicios: ["REPARACION"],
      tipoEquipo: "NOTEBOOK",
      software: [],
      conBackup: false,
      conPastaTermica: false,
      conSSD: false,
      descripcion: "No enciende desde ayer",
    });
    assert.equal(valida({ servicios: ["REPARACION"], descripcion: "No enciende desde ayer" }), false);
    assert.equal(valida({ servicios: ["REPARACION"], tipoEquipo: "CELULAR", descripcion: "No enciende desde ayer" }), false);
    assert.equal(valida({ servicios: ["REPARACION", "LIMPIEZA"], tipoEquipo: "IMPRESORA" }), false);
  });

  it("instalacion: al menos un programa y un solo sistema operativo", () => {
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"], software: [] }), false);
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"] }), false);
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"], software: ["WIN10", "WIN11"] }), false);
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"], software: ["PHOTOSHOP"] }), false);
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"], software: ["VLC", "VLC"] }), false);
    assert.equal(valida({ servicios: ["INSTALACION_SOFTWARE"], software: ["WINRAR", "VLC"] }), true);
  });

  it("limpieza y formateo: los comentarios son opcionales y la pasta termica / el backup van con su servicio", () => {
    assert.equal(crearSolicitudSchema.parse({ servicios: ["LIMPIEZA"] }).conPastaTermica, false);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["LIMPIEZA"], conPastaTermica: true }).conPastaTermica, true);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["LIMPIEZA"] }).descripcion, null);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["FORMATEO"] }).conBackup, false);
    assert.equal(crearSolicitudSchema.parse({ servicios: ["FORMATEO"], conBackup: true }).conBackup, true);
  });

  it("otro: pide describir que necesita", () => {
    assert.equal(valida({ servicios: ["OTRO"] }), false);
    assert.equal(valida({ servicios: ["OTRO", "LIMPIEZA"], descripcion: "corto" }), false);
    assert.equal(valida({ servicios: ["OTRO"], descripcion: "Configurar una red wifi en casa" }), true);
  });
});
