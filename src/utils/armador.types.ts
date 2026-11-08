import type { ProductoResumen } from "./catalogo.types";
import type {
  Faltante,
  Incompatibilidad,
  PasoArmador,
  PotenciaCalculada,
} from "./armador.compatibilidad";

// Producto que se puede elegir en un paso del armador, con los datos que
// sirven para explicar por que es (o no) compatible.
// paso: el tipo de componente, o "Perifericos" (monitor, mouse...: sin consumo ni especificaciones)
export type ProductoArmador = ProductoResumen & {
  paso: PasoArmador;
  watts: number;
  especificaciones: { nombre: string; valor: string; unidad: string | null }[];
};

// POST /api/armador/compatibles
export interface CompatiblesRespuesta {
  tipo: PasoArmador;
  productos: ProductoArmador[]; // compatibles con lo elegido, ordenados por precio
  incompatibles: { producto: ProductoArmador; motivos: Incompatibilidad[] }[];
}

// POST /api/armador/validar
export interface ValidacionArmado {
  valida: boolean; // sin incompatibilidades
  completa: boolean; // sin componentes obligatorios faltantes
  incompatibilidades: Incompatibilidad[];
  faltantes: Faltante[];
  potencia: PotenciaCalculada;
  total: number; // precio total en pesos
}

// POST /api/armador/fuente-sugerida
export interface FuenteSugeridaRespuesta {
  potencia: PotenciaCalculada;
  // Con stock, compatibles y con potencia >= la recomendada, de la mas barata a la mas cara
  fuentes: ProductoArmador[];
}

// GET /api/armador/presets
export interface PresetArmado {
  id: number;
  nombre: string;
  potenciaWatts: number; // consumo estimado al guardarlo
  componentes: { producto: ProductoArmador; cantidad: number }[];
}
