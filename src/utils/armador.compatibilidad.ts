// Reglas del armador de PC: compatibilidad entre componentes, componentes obligatorios
// y calculo de potencia. Son funciones puras (sin base de datos) para poder testearlas;
// el controller arma los ComponenteArmado con los atributos tecnicos de cada producto.
//
// Si a un producto le falta un dato que usa una regla (ej. el largo de la GPU), esa regla
// no lo marca como incompatible: no se puede bloquear una compra por un dato sin cargar.

// Pasos del armador, en orden. Son los nombres de TipoComponente.
export const TIPOS_ARMADOR = ["Motherboard", "CPU", "RAM", "Gabinete", "GPU", "Almacenamiento", "Fuente"] as const;
export type TipoArmador = (typeof TIPOS_ARMADOR)[number];

export const esTipoArmador = (tipo: string): tipo is TipoArmador =>
  (TIPOS_ARMADOR as readonly string[]).includes(tipo);

// Paso opcional del final: perifericos (monitor, mouse, teclado...). No son componentes de PC,
// no tienen reglas de compatibilidad ni consumo, y se puede elegir mas de uno.
export const PASO_PERIFERICOS = "Perifericos";
export type PasoArmador = TipoArmador | typeof PASO_PERIFERICOS;
export const CATEGORIAS_PERIFERICOS = ["Monitores", "Teclados", "Mouse", "Auriculares", "Perifericos"];

// En estos pasos se pueden elegir varios productos distintos (ej. un NVMe y un disco rigido),
// mientras entren en las conexiones del motherboard
export const TIPOS_MULTIPLES: readonly TipoArmador[] = ["Almacenamiento"];
export const permiteVarios = (tipo: TipoArmador) => TIPOS_MULTIPLES.includes(tipo);

// La GPU no esta: solo es obligatoria si el procesador no tiene graficos integrados.
export const TIPOS_OBLIGATORIOS: readonly TipoArmador[] = [
  "Motherboard",
  "CPU",
  "RAM",
  "Gabinete",
  "Almacenamiento",
  "Fuente",
];

// Margen de seguridad sobre el consumo total para recomendar la fuente
export const MARGEN_POTENCIA_PORCENTAJE = 20;

// Socket de cada chipset: se usa si el motherboard no tiene cargado el socket
export const SOCKET_POR_CHIPSET: Record<string, string> = {
  A320: "AM4", B450: "AM4", X470: "AM4", A520: "AM4", B550: "AM4", X570: "AM4",
  A620: "AM5", B650: "AM5", B650E: "AM5", X670: "AM5", X670E: "AM5", B850: "AM5", X870: "AM5", X870E: "AM5",
  H410: "LGA1200", B460: "LGA1200", H470: "LGA1200", Z490: "LGA1200",
  H510: "LGA1200", B560: "LGA1200", H570: "LGA1200", Z590: "LGA1200",
  H610: "LGA1700", B660: "LGA1700", H670: "LGA1700", Z690: "LGA1700", B760: "LGA1700", H770: "LGA1700", Z790: "LGA1700",
  H810: "LGA1851", B860: "LGA1851", Z890: "LGA1851",
};

export interface ComponenteArmado {
  id: number;
  tipo: TipoArmador;
  cantidad: number;
  watts: number; // consumo de una unidad
  atributos: Record<string, string>; // valor de cada atributo tecnico por nombre (ej. { Socket: "AM5" })
}

export const CODIGOS_INCOMPATIBILIDAD = [
  "SOCKET_CPU_MOTHER",
  "MEMORIA_CPU_MOTHER",
  "TIPO_RAM_MOTHER",
  "TIPO_RAM_CPU",
  "SLOTS_RAM",
  "CAPACIDAD_RAM",
  "FORMATO_MOTHER_GABINETE",
  "LARGO_GPU_GABINETE",
  "FORMATO_FUENTE_GABINETE",
  "LARGO_FUENTE_GABINETE",
  "CONECTOR_GPU_FUENTE",
  "CONEXION_ALMACENAMIENTO",
  "POTENCIA_FUENTE",
] as const;
export type CodigoIncompatibilidad = (typeof CODIGOS_INCOMPATIBILIDAD)[number];

export interface Incompatibilidad {
  codigo: CodigoIncompatibilidad;
  motivo: string; // en espanol; el FE lo traduce con el codigo y los datos
  productos: number[]; // ids de los productos involucrados
  datos: Record<string, string | number>;
}

export interface Faltante {
  tipo: TipoArmador;
  // OBLIGATORIO: todo armado lo necesita. SIN_GRAFICOS_INTEGRADOS: la GPU, porque el procesador no tiene video.
  codigo: "OBLIGATORIO" | "SIN_GRAFICOS_INTEGRADOS";
}

export interface PotenciaCalculada {
  consumo: number; // suma de los consumos (W)
  margenPorcentaje: number;
  recomendada: number; // consumo + margen, redondeado para arriba (W)
}

// ─── Lectura de atributos ─────────────────────────────────────────────

const texto = (c: ComponenteArmado, atributo: string) => c.atributos[atributo]?.trim() || null;

const numero = (c: ComponenteArmado, atributo: string) => {
  const valor = texto(c, atributo);
  if (valor === null) return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// "E-ATX / ATX / mATX" -> ["e-atx", "atx", "matx"]
const lista = (valor: string) =>
  valor
    .split("/")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const mismoValor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const incluye = (valores: string, valor: string) => lista(valores).includes(valor.trim().toLowerCase());

function socketDeMother(mother: ComponenteArmado) {
  const chipset = texto(mother, "Chipset")?.toUpperCase();
  return texto(mother, "Socket") ?? (chipset ? SOCKET_POR_CHIPSET[chipset] : undefined) ?? null;
}

const usaConector12V2x6 = (conectores: string) => /12v-?2x6|12vhpwr|16 pines/i.test(conectores);

// ─── Reglas entre dos componentes ─────────────────────────────────────

type Problema = { motivo: string; datos: Record<string, string | number> } | null;

interface Regla {
  codigo: CodigoIncompatibilidad;
  tipos: [TipoArmador, TipoArmador];
  // Recibe los componentes en el orden de "tipos". null = compatibles (o falta un dato para saberlo).
  evaluar: (a: ComponenteArmado, b: ComponenteArmado) => Problema;
}

export const REGLAS: Regla[] = [
  {
    codigo: "SOCKET_CPU_MOTHER",
    tipos: ["CPU", "Motherboard"],
    evaluar: (cpu, mother) => {
      const socketCpu = texto(cpu, "Socket");
      const socketMother = socketDeMother(mother);
      if (!socketCpu || !socketMother || mismoValor(socketCpu, socketMother)) return null;
      return {
        motivo: `El procesador usa socket ${socketCpu} y el motherboard es para ${socketMother}`,
        datos: { socketCpu, socketMother },
      };
    },
  },
  {
    codigo: "MEMORIA_CPU_MOTHER",
    tipos: ["CPU", "Motherboard"],
    evaluar: (cpu, mother) => {
      const soportada = texto(cpu, "Memoria soportada");
      const tipoMother = texto(mother, "Tipo de RAM");
      if (!soportada || !tipoMother || incluye(soportada, tipoMother)) return null;
      return {
        motivo: `El motherboard usa memoria ${tipoMother} y el procesador solo soporta ${soportada}`,
        datos: { tipoMother, soportada },
      };
    },
  },
  {
    codigo: "TIPO_RAM_MOTHER",
    tipos: ["RAM", "Motherboard"],
    evaluar: (ram, mother) => {
      const tipoRam = texto(ram, "Tipo");
      const tipoMother = texto(mother, "Tipo de RAM");
      if (!tipoRam || !tipoMother || mismoValor(tipoRam, tipoMother)) return null;
      return {
        motivo: `La memoria es ${tipoRam} y el motherboard usa ${tipoMother}`,
        datos: { tipoRam, tipoMother },
      };
    },
  },
  {
    codigo: "TIPO_RAM_CPU",
    tipos: ["RAM", "CPU"],
    evaluar: (ram, cpu) => {
      const tipoRam = texto(ram, "Tipo");
      const soportada = texto(cpu, "Memoria soportada");
      if (!tipoRam || !soportada || incluye(soportada, tipoRam)) return null;
      return {
        motivo: `La memoria es ${tipoRam} y el procesador solo soporta ${soportada}`,
        datos: { tipoRam, soportada },
      };
    },
  },
  {
    codigo: "SLOTS_RAM",
    tipos: ["RAM", "Motherboard"],
    evaluar: (ram, mother) => {
      const slots = numero(mother, "Slots de memoria");
      // Sin el dato, cada unidad cuenta como un modulo
      const modulos = (numero(ram, "Modulos") ?? 1) * ram.cantidad;
      if (slots === null || modulos <= slots) return null;
      return {
        motivo: `Son ${modulos} modulos de memoria y el motherboard tiene ${slots} slots`,
        datos: { modulos, slots },
      };
    },
  },
  {
    codigo: "CAPACIDAD_RAM",
    tipos: ["RAM", "Motherboard"],
    evaluar: (ram, mother) => {
      const maxima = numero(mother, "Memoria maxima");
      const capacidad = numero(ram, "Capacidad");
      if (maxima === null || capacidad === null || capacidad * ram.cantidad <= maxima) return null;
      return {
        motivo: `Son ${capacidad * ram.cantidad} GB de memoria y el motherboard soporta hasta ${maxima} GB`,
        datos: { capacidad: capacidad * ram.cantidad, maxima },
      };
    },
  },
  {
    codigo: "FORMATO_MOTHER_GABINETE",
    tipos: ["Motherboard", "Gabinete"],
    evaluar: (mother, gabinete) => {
      const formato = texto(mother, "Formato");
      const soportados = texto(gabinete, "Motherboards soportadas");
      if (!formato || !soportados || incluye(soportados, formato)) return null;
      return {
        motivo: `El motherboard es ${formato} y el gabinete solo admite ${soportados}`,
        datos: { formato, soportados },
      };
    },
  },
  {
    codigo: "LARGO_GPU_GABINETE",
    tipos: ["GPU", "Gabinete"],
    evaluar: (gpu, gabinete) => {
      const largo = numero(gpu, "Largo");
      const maximo = numero(gabinete, "Largo maximo de GPU");
      if (largo === null || maximo === null || largo <= maximo) return null;
      return {
        motivo: `La placa de video mide ${largo} mm y en el gabinete entran hasta ${maximo} mm`,
        datos: { largo, maximo },
      };
    },
  },
  {
    codigo: "FORMATO_FUENTE_GABINETE",
    tipos: ["Fuente", "Gabinete"],
    evaluar: (fuente, gabinete) => {
      const formato = texto(fuente, "Formato");
      const soportados = texto(gabinete, "Fuentes soportadas");
      if (!formato || !soportados || incluye(soportados, formato)) return null;
      return {
        motivo: `La fuente es ${formato} y el gabinete solo admite ${soportados}`,
        datos: { formato, soportados },
      };
    },
  },
  {
    codigo: "LARGO_FUENTE_GABINETE",
    tipos: ["Fuente", "Gabinete"],
    evaluar: (fuente, gabinete) => {
      const largo = numero(fuente, "Largo");
      const maximo = numero(gabinete, "Largo maximo de fuente");
      if (largo === null || maximo === null || largo <= maximo) return null;
      return {
        motivo: `La fuente mide ${largo} mm de largo y en el gabinete entran hasta ${maximo} mm`,
        datos: { largo, maximo },
      };
    },
  },
  {
    codigo: "CONECTOR_GPU_FUENTE",
    tipos: ["GPU", "Fuente"],
    evaluar: (gpu, fuente) => {
      const conectores = texto(gpu, "Conectores de energia");
      const atx3 = texto(fuente, "ATX 3.x (conector 12V-2x6)");
      if (!conectores || !atx3 || !usaConector12V2x6(conectores) || !mismoValor(atx3, "No")) return null;
      return {
        motivo: `La placa de video necesita un conector 12V-2x6 (16 pines) y la fuente no lo tiene`,
        datos: { conectores },
      };
    },
  },
];

// Todas las incompatibilidades entre dos componentes (en cualquier orden)
export function incompatibilidadesEntre(x: ComponenteArmado, y: ComponenteArmado): Incompatibilidad[] {
  const resultado: Incompatibilidad[] = [];
  for (const regla of REGLAS) {
    const [tipoA, tipoB] = regla.tipos;
    const par = x.tipo === tipoA && y.tipo === tipoB ? [x, y] : y.tipo === tipoA && x.tipo === tipoB ? [y, x] : null;
    if (!par) continue;
    const problema = regla.evaluar(par[0], par[1]);
    if (problema) resultado.push({ codigo: regla.codigo, productos: [par[0].id, par[1].id], ...problema });
  }
  return resultado;
}

// ─── Almacenamiento ───────────────────────────────────────────────────

// Por donde se conecta un disco al motherboard (null = falta el dato)
function conexionDe(disco: ComponenteArmado): "M.2" | "SATA" | null {
  const formato = texto(disco, "Formato") ?? "";
  const tipo = texto(disco, "Tipo") ?? "";
  if (/m\.2/i.test(formato) || mismoValor(tipo, "NVMe")) return "M.2";
  if (/sata|hdd/i.test(tipo) || /sata/i.test(texto(disco, "Interfaz") ?? "")) return "SATA";
  return null;
}

// Todos los discos juntos tienen que entrar en las ranuras M.2 y los puertos SATA del motherboard
export function problemasAlmacenamiento(discos: ComponenteArmado[], mother: ComponenteArmado): Incompatibilidad[] {
  return (["M.2", "SATA"] as const).flatMap((conexion) => {
    const usan = discos.filter((d) => conexionDe(d) === conexion);
    const cantidad = usan.reduce((total, d) => total + d.cantidad, 0);
    const disponibles = numero(mother, conexion === "M.2" ? "Ranuras M.2" : "Puertos SATA");
    if (cantidad === 0 || disponibles === null || cantidad <= disponibles) return [];
    return [
      {
        codigo: "CONEXION_ALMACENAMIENTO" as const,
        motivo:
          disponibles === 0
            ? `El disco se conecta por ${conexion} y el motherboard no tiene conexiones ${conexion}`
            : `Son ${cantidad} discos ${conexion} y el motherboard tiene ${disponibles} conexiones ${conexion}`,
        productos: [mother.id, ...usan.map((d) => d.id)],
        datos: { conexion, cantidad, disponibles },
      },
    ];
  });
}

// ─── Potencia ─────────────────────────────────────────────────────────

export function calcularPotencia(componentes: ComponenteArmado[]): PotenciaCalculada {
  const consumo = componentes
    .filter((c) => c.tipo !== "Fuente")
    .reduce((total, c) => total + c.watts * c.cantidad, 0);
  return {
    consumo,
    margenPorcentaje: MARGEN_POTENCIA_PORCENTAJE,
    // En enteros para evitar errores de coma flotante (ej. 250 * 1.2)
    recomendada: Math.ceil((consumo * (100 + MARGEN_POTENCIA_PORCENTAJE)) / 100),
  };
}

// La fuente tiene que cubrir la potencia recomendada del resto de los componentes
export function problemaPotencia(fuente: ComponenteArmado, resto: ComponenteArmado[]): Incompatibilidad | null {
  const potencia = numero(fuente, "Potencia");
  const { recomendada } = calcularPotencia(resto);
  if (potencia === null || potencia >= recomendada) return null;
  return {
    codigo: "POTENCIA_FUENTE",
    motivo: `La fuente es de ${potencia} W y el equipo necesita al menos ${recomendada} W`,
    productos: [fuente.id],
    datos: { potencia, recomendada },
  };
}

// ─── Armado completo ──────────────────────────────────────────────────

// Incompatibilidades de un producto candidato con lo que ya se eligio.
// Se ignora el componente del mismo tipo que ya este elegido, porque el candidato lo reemplaza;
// en los pasos con varios productos (almacenamiento) el candidato se suma a los demas.
export function incompatibilidadesDe(candidato: ComponenteArmado, seleccion: ComponenteArmado[]): Incompatibilidad[] {
  const resto = seleccion.filter((c) =>
    permiteVarios(candidato.tipo) ? c.id !== candidato.id : c.tipo !== candidato.tipo,
  );
  const resultado = resto.flatMap((c) => incompatibilidadesEntre(candidato, c));
  const discos = resto.filter((c) => c.tipo === "Almacenamiento");
  if (candidato.tipo === "Motherboard") resultado.push(...problemasAlmacenamiento(discos, candidato));
  if (candidato.tipo === "Almacenamiento") {
    const mother = resto.find((c) => c.tipo === "Motherboard");
    // Solo lo que afecta al candidato (ej. ya no quedan ranuras M.2 para otro NVMe)
    const problemas = mother ? problemasAlmacenamiento([...discos, candidato], mother) : [];
    resultado.push(...problemas.filter((p) => p.productos.includes(candidato.id)));
  }
  if (candidato.tipo === "Fuente") {
    const potencia = problemaPotencia(candidato, resto);
    if (potencia) resultado.push(potencia);
  }
  return resultado;
}

export function faltantesDe(seleccion: ComponenteArmado[]): Faltante[] {
  const elegidos = new Set(seleccion.map((c) => c.tipo));
  const faltantes: Faltante[] = TIPOS_OBLIGATORIOS.filter((t) => !elegidos.has(t)).map((tipo) => ({
    tipo,
    codigo: "OBLIGATORIO",
  }));

  const cpu = seleccion.find((c) => c.tipo === "CPU");
  const graficos = cpu ? texto(cpu, "Graficos integrados") : null;
  if (!elegidos.has("GPU") && graficos && mismoValor(graficos, "No")) {
    faltantes.push({ tipo: "GPU", codigo: "SIN_GRAFICOS_INTEGRADOS" });
  }
  // En el orden de los pasos del armador
  return faltantes.sort((a, b) => TIPOS_ARMADOR.indexOf(a.tipo) - TIPOS_ARMADOR.indexOf(b.tipo));
}

// Valida el armado completo: cada par de componentes, la potencia de la fuente y los que faltan
export function validarConfiguracion(seleccion: ComponenteArmado[]) {
  const incompatibilidades: Incompatibilidad[] = [];
  for (let i = 0; i < seleccion.length; i++) {
    for (let j = i + 1; j < seleccion.length; j++) {
      incompatibilidades.push(...incompatibilidadesEntre(seleccion[i], seleccion[j]));
    }
  }

  const mother = seleccion.find((c) => c.tipo === "Motherboard");
  if (mother) {
    incompatibilidades.push(...problemasAlmacenamiento(seleccion.filter((c) => c.tipo === "Almacenamiento"), mother));
  }

  const fuente = seleccion.find((c) => c.tipo === "Fuente");
  const potenciaFuente = fuente && problemaPotencia(fuente, seleccion);
  if (potenciaFuente) incompatibilidades.push(potenciaFuente);

  return {
    incompatibilidades,
    faltantes: faltantesDe(seleccion),
    potencia: calcularPotencia(seleccion),
  };
}
