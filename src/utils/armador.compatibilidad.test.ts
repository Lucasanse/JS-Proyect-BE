// Tests del armador de PC: cada regla de compatibilidad, faltantes y calculo de potencia.
// Correr con: npm test
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularPotencia,
  faltantesDe,
  incompatibilidadesDe,
  incompatibilidadesEntre,
  problemasAlmacenamiento,
  validarConfiguracion,
  type CodigoIncompatibilidad,
  type ComponenteArmado,
  type TipoArmador,
} from "./armador.compatibilidad";

let siguienteId = 1;
const comp = (
  tipo: TipoArmador,
  atributos: Record<string, string> = {},
  extra: Partial<ComponenteArmado> = {},
): ComponenteArmado => ({ id: siguienteId++, tipo, cantidad: 1, watts: 0, atributos, ...extra });

const codigos = (a: ComponenteArmado, b: ComponenteArmado): CodigoIncompatibilidad[] =>
  incompatibilidadesEntre(a, b).map((i) => i.codigo);

// Un armado AM5 compatible de punta a punta
const armadoAm5 = () => [
  comp("Motherboard", {
    Socket: "AM5",
    "Tipo de RAM": "DDR5",
    Formato: "mATX",
    "Slots de memoria": "4",
    "Memoria maxima": "192",
    "Ranuras M.2": "2",
    "Puertos SATA": "4",
  }, { watts: 50 }),
  comp("CPU", { Socket: "AM5", "Memoria soportada": "DDR5", "Graficos integrados": "Si" }, { watts: 65 }),
  comp("RAM", { Tipo: "DDR5", Capacidad: "16", Modulos: "1" }, { watts: 5, cantidad: 2 }),
  comp("Gabinete", {
    "Motherboards soportadas": "E-ATX / ATX / mATX / Mini-ITX",
    "Largo maximo de GPU": "392",
    "Fuentes soportadas": "ATX",
  }),
  comp("GPU", { Largo: "227", "Conectores de energia": "1x 8 pines" }, { watts: 115 }),
  comp("Almacenamiento", { Tipo: "NVMe", Formato: "M.2 2280" }, { watts: 7 }),
  comp("Fuente", { Potencia: "550", Formato: "ATX", "ATX 3.x (conector 12V-2x6)": "No" }),
];

describe("mother <-> procesador", () => {
  it("el socket tiene que coincidir", () => {
    const mother = comp("Motherboard", { Socket: "AM5" });
    assert.deepEqual(codigos(comp("CPU", { Socket: "AM5" }), mother), []);
    assert.deepEqual(codigos(comp("CPU", { Socket: "LGA1700" }), mother), ["SOCKET_CPU_MOTHER"]);
  });

  it("sin socket cargado, lo deduce del chipset", () => {
    const mother = comp("Motherboard", { Chipset: "B760" });
    assert.deepEqual(codigos(comp("CPU", { Socket: "LGA1700" }), mother), []);
    const [problema] = incompatibilidadesEntre(comp("CPU", { Socket: "AM5" }), mother);
    assert.equal(problema.codigo, "SOCKET_CPU_MOTHER");
    assert.deepEqual(problema.datos, { socketCpu: "AM5", socketMother: "LGA1700" });
  });

  it("el procesador tiene que soportar la memoria del mother", () => {
    const mother = comp("Motherboard", { "Tipo de RAM": "DDR4" });
    assert.deepEqual(codigos(comp("CPU", { "Memoria soportada": "DDR4 / DDR5" }), mother), []);
    assert.deepEqual(codigos(comp("CPU", { "Memoria soportada": "DDR5" }), mother), ["MEMORIA_CPU_MOTHER"]);
  });

  it("no importa el orden en que se pasan", () => {
    assert.deepEqual(codigos(comp("Motherboard", { Socket: "AM4" }), comp("CPU", { Socket: "AM5" })), [
      "SOCKET_CPU_MOTHER",
    ]);
  });
});

describe("mother <-> memoria", () => {
  const mother = comp("Motherboard", { "Tipo de RAM": "DDR5", "Slots de memoria": "2", "Memoria maxima": "64" });

  it("el tipo de memoria tiene que coincidir", () => {
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR5" }), mother), []);
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR4" }), mother), ["TIPO_RAM_MOTHER"]);
  });

  it("los modulos no pueden superar los slots", () => {
    assert.deepEqual(codigos(comp("RAM", { Modulos: "1" }, { cantidad: 2 }), mother), []);
    assert.deepEqual(codigos(comp("RAM", { Modulos: "2" }, { cantidad: 2 }), mother), ["SLOTS_RAM"]);
    // Sin el dato "Modulos", cada unidad cuenta como un modulo
    assert.deepEqual(codigos(comp("RAM", {}, { cantidad: 3 }), mother), ["SLOTS_RAM"]);
  });

  it("la capacidad total no puede superar la maxima del mother", () => {
    assert.deepEqual(codigos(comp("RAM", { Capacidad: "32", Modulos: "1" }, { cantidad: 2 }), mother), []);
    const [problema] = incompatibilidadesEntre(comp("RAM", { Capacidad: "48", Modulos: "1" }, { cantidad: 2 }), mother);
    assert.equal(problema.codigo, "CAPACIDAD_RAM");
    assert.deepEqual(problema.datos, { capacidad: 96, maxima: 64 });
  });
});

describe("memoria <-> procesador", () => {
  it("el procesador tiene que soportar el tipo de memoria", () => {
    const cpu = comp("CPU", { "Memoria soportada": "DDR5" });
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR5" }), cpu), []);
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR4" }), cpu), ["TIPO_RAM_CPU"]);
  });
});

describe("gabinete", () => {
  const gabinete = comp("Gabinete", {
    "Motherboards soportadas": "mATX / Mini-ITX",
    "Largo maximo de GPU": "300",
    "Fuentes soportadas": "SFX / SFX-L",
  });

  it("tiene que admitir el formato del mother", () => {
    assert.deepEqual(codigos(comp("Motherboard", { Formato: "mATX" }), gabinete), []);
    assert.deepEqual(codigos(comp("Motherboard", { Formato: "ATX" }), gabinete), ["FORMATO_MOTHER_GABINETE"]);
    // "ATX" no tiene que coincidir con "E-ATX" por contener el texto
    const atxGrande = comp("Gabinete", { "Motherboards soportadas": "E-ATX" });
    assert.deepEqual(codigos(comp("Motherboard", { Formato: "ATX" }), atxGrande), ["FORMATO_MOTHER_GABINETE"]);
  });

  it("la GPU tiene que entrar a lo largo", () => {
    assert.deepEqual(codigos(comp("GPU", { Largo: "300" }), gabinete), []);
    assert.deepEqual(codigos(comp("GPU", { Largo: "336" }), gabinete), ["LARGO_GPU_GABINETE"]);
  });

  it("la fuente tiene que entrar a lo largo", () => {
    const chico = comp("Gabinete", { "Largo maximo de fuente": "130" });
    assert.deepEqual(codigos(comp("Fuente", { Largo: "100" }), chico), []);
    const [problema] = incompatibilidadesEntre(comp("Fuente", { Largo: "160" }), chico);
    assert.equal(problema.codigo, "LARGO_FUENTE_GABINETE");
    assert.deepEqual(problema.datos, { largo: 160, maximo: 130 });
  });

  it("tiene que admitir el formato de la fuente", () => {
    assert.deepEqual(codigos(comp("Fuente", { Formato: "SFX-L" }), gabinete), []);
    assert.deepEqual(codigos(comp("Fuente", { Formato: "ATX" }), gabinete), ["FORMATO_FUENTE_GABINETE"]);
  });
});

describe("otras reglas", () => {
  it("una GPU con conector 12V-2x6 necesita una fuente ATX 3.x", () => {
    const gpu = comp("GPU", { "Conectores de energia": "1x 16 pines (12V-2x6)" });
    assert.deepEqual(codigos(gpu, comp("Fuente", { "ATX 3.x (conector 12V-2x6)": "Si" })), []);
    assert.deepEqual(codigos(gpu, comp("Fuente", { "ATX 3.x (conector 12V-2x6)": "No" })), ["CONECTOR_GPU_FUENTE"]);
    const gpu8Pines = comp("GPU", { "Conectores de energia": "2x 8 pines" });
    assert.deepEqual(codigos(gpu8Pines, comp("Fuente", { "ATX 3.x (conector 12V-2x6)": "No" })), []);
  });

  it("el mother tiene que tener donde conectar los discos", () => {
    const mother = comp("Motherboard", { "Ranuras M.2": "0", "Puertos SATA": "2" });
    const nvme = comp("Almacenamiento", { Tipo: "NVMe", Formato: "M.2 2280" });
    const [problema] = problemasAlmacenamiento([nvme], mother);
    assert.equal(problema.codigo, "CONEXION_ALMACENAMIENTO");
    assert.equal(problema.datos.conexion, "M.2");

    assert.deepEqual(problemasAlmacenamiento([comp("Almacenamiento", { Tipo: "HDD" }, { cantidad: 2 })], mother), []);
    const sata = problemasAlmacenamiento([comp("Almacenamiento", { Tipo: "SSD SATA" }, { cantidad: 3 })], mother);
    assert.deepEqual(sata.map((p) => p.codigo), ["CONEXION_ALMACENAMIENTO"]);
  });

  it("si falta un dato, la regla no marca incompatibilidad", () => {
    assert.deepEqual(codigos(comp("CPU", {}), comp("Motherboard", { Socket: "AM5" })), []);
    assert.deepEqual(codigos(comp("GPU", { Largo: "400" }), comp("Gabinete", {})), []);
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR4" }), comp("Motherboard", {})), []);
  });

  it("los tipos sin reglas entre si son compatibles", () => {
    assert.deepEqual(codigos(comp("RAM", { Tipo: "DDR4" }), comp("GPU", { Largo: "400" })), []);
  });
});

describe("varios discos", () => {
  const mother = () => comp("Motherboard", { "Ranuras M.2": "2", "Puertos SATA": "1" });
  const nvme = () => comp("Almacenamiento", { Tipo: "NVMe", Formato: "M.2 2280" });
  const hdd = () => comp("Almacenamiento", { Tipo: "HDD", Formato: '3.5"' });

  it("se pueden elegir distintos mientras entren en las conexiones del motherboard", () => {
    const m = mother();
    assert.deepEqual(validarConfiguracion([m, nvme(), nvme(), hdd()]).incompatibilidades, []);

    const [problema, ...otros] = validarConfiguracion([m, nvme(), nvme(), nvme(), hdd()]).incompatibilidades;
    assert.equal(otros.length, 0);
    assert.equal(problema.codigo, "CONEXION_ALMACENAMIENTO");
    assert.deepEqual(problema.datos, { conexion: "M.2", cantidad: 3, disponibles: 2 });
    assert.equal(problema.productos[0], m.id);
  });

  it("un disco nuevo se suma a los ya elegidos en vez de reemplazarlos", () => {
    const m = mother();
    const elegidos = [m, nvme(), hdd()];
    assert.deepEqual(incompatibilidadesDe(nvme(), elegidos), []);
    // El SATA ya esta ocupado por el disco rigido
    assert.deepEqual(incompatibilidadesDe(hdd(), elegidos).map((i) => i.codigo), ["CONEXION_ALMACENAMIENTO"]);
    // El mismo producto elegido otra vez cuenta una sola vez (por ejemplo al cambiar su cantidad)
    assert.deepEqual(incompatibilidadesDe(elegidos[1], elegidos), []);
  });

  it("un motherboard con menos conexiones es incompatible con los discos ya elegidos", () => {
    const chico = comp("Motherboard", { "Ranuras M.2": "1", "Puertos SATA": "4" });
    assert.deepEqual(incompatibilidadesDe(chico, [mother(), nvme(), nvme()]).map((i) => i.codigo), [
      "CONEXION_ALMACENAMIENTO",
    ]);
  });
});

describe("potencia", () => {
  it("suma los consumos por cantidad y agrega 20% de margen", () => {
    const potencia = calcularPotencia(armadoAm5());
    // 50 + 65 + 5 * 2 + 115 + 7 = 247 W -> 247 * 1.2 = 296.4 -> 297 W
    assert.deepEqual(potencia, { consumo: 247, margenPorcentaje: 20, recomendada: 297 });
  });

  it("no cuenta la fuente y redondea sin errores de coma flotante", () => {
    const potencia = calcularPotencia([
      comp("CPU", {}, { watts: 250 }),
      comp("Fuente", { Potencia: "750" }, { watts: 10 }),
    ]);
    assert.deepEqual(potencia, { consumo: 250, margenPorcentaje: 20, recomendada: 300 });
  });

  it("sin componentes es cero", () => {
    assert.equal(calcularPotencia([]).recomendada, 0);
  });

  it("una fuente con menos potencia que la recomendada es incompatible", () => {
    const resto = [comp("CPU", {}, { watts: 125 }), comp("GPU", {}, { watts: 300 })]; // 425 W -> 510 W
    assert.deepEqual(incompatibilidadesDe(comp("Fuente", { Potencia: "550" }), resto), []);
    const [problema] = incompatibilidadesDe(comp("Fuente", { Potencia: "500" }), resto);
    assert.equal(problema.codigo, "POTENCIA_FUENTE");
    assert.deepEqual(problema.datos, { potencia: 500, recomendada: 510 });
  });
});

describe("armado completo", () => {
  it("un armado compatible y completo no tiene problemas", () => {
    const resultado = validarConfiguracion(armadoAm5());
    assert.deepEqual(resultado.incompatibilidades, []);
    assert.deepEqual(resultado.faltantes, []);
  });

  it("detecta cada incompatibilidad con los productos involucrados", () => {
    const armado = armadoAm5();
    const cpu = comp("CPU", { Socket: "LGA1700", "Memoria soportada": "DDR4 / DDR5" });
    armado[1] = cpu;
    const { incompatibilidades } = validarConfiguracion(armado);
    assert.deepEqual(
      incompatibilidades.map((i) => i.codigo),
      ["SOCKET_CPU_MOTHER"],
    );
    assert.ok(incompatibilidades[0].productos.includes(cpu.id));
    assert.ok(incompatibilidades[0].motivo.length > 0);
  });

  it("valida la potencia de la fuente elegida", () => {
    const armado = armadoAm5();
    armado[6] = comp("Fuente", { Potencia: "250" });
    assert.deepEqual(
      validarConfiguracion(armado).incompatibilidades.map((i) => i.codigo),
      ["POTENCIA_FUENTE"],
    );
  });

  it("lista los componentes obligatorios que faltan, en el orden de los pasos", () => {
    assert.deepEqual(
      faltantesDe([comp("CPU", { "Graficos integrados": "Si" })]).map((f) => f.tipo),
      ["Motherboard", "RAM", "Gabinete", "Almacenamiento", "Fuente"],
    );
  });

  it("la GPU es obligatoria si el procesador no tiene graficos integrados", () => {
    const sinGpu = armadoAm5().filter((c) => c.tipo !== "GPU");
    assert.deepEqual(faltantesDe(sinGpu), []);

    sinGpu[1] = comp("CPU", { Socket: "AM5", "Graficos integrados": "No" });
    assert.deepEqual(faltantesDe(sinGpu), [{ tipo: "GPU", codigo: "SIN_GRAFICOS_INTEGRADOS" }]);
  });

  it("un candidato reemplaza al elegido del mismo tipo", () => {
    const armado = armadoAm5();
    // Una RAM DDR4 ya elegida no cuenta contra otra RAM candidata
    armado[2] = comp("RAM", { Tipo: "DDR4" });
    assert.deepEqual(incompatibilidadesDe(comp("RAM", { Tipo: "DDR5" }), armado), []);
  });
});
