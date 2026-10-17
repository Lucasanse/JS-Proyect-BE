import { ApiError, GoogleGenAI } from "@google/genai";
import { AppError } from "../utils/AppError";

// Proveedor de IA que analiza las fotos de un producto. Se elige con IA_PROVEEDOR en el .env:
//  - "gemini": Google Gemini (tiene plan gratis). Necesita IA_API_KEY.
//  - "mock":   no llama a ninguna IA, devuelve siempre el mismo producto de ejemplo.
//              Sirve para probar el formulario sin key y sin gastar.
// La respuesta de cualquier proveedor se valida despues contra la base (ver utils/analisisProducto.ts).

export interface FotoIA {
  buffer: Buffer;
  mimetype: string;
}

export type ProveedorIA = "gemini" | "mock";

const MODELO_GEMINI_POR_DEFECTO = "gemini-3.5-flash-lite";
// En el plan gratis los modelos se saturan seguido (error 503): en ese caso se reintenta
// una vez con este otro modelo, que tambien es gratis y acepta imagenes.
const MODELO_GEMINI_RESPALDO = "gemini-3.1-flash-lite";
const TIMEOUT_MS = 45_000;

export function proveedorIA(): ProveedorIA {
  const proveedor = (process.env.IA_PROVEEDOR || "mock").trim().toLowerCase();
  if (proveedor === "gemini" || proveedor === "mock") return proveedor;
  throw new AppError(500, `IA_PROVEEDOR="${proveedor}" no es válido. Usá "gemini" o "mock" en el .env del back`);
}

// Manda las fotos con las instrucciones y devuelve el JSON que respondio la IA (sin validar).
export async function consultarIA(fotos: FotoIA[], instrucciones: string, esquema: object): Promise<unknown> {
  return proveedorIA() === "gemini" ? consultarGemini(fotos, instrucciones, esquema) : respuestaMock();
}

let clienteGemini: { apiKey: string; cliente: GoogleGenAI } | null = null;

function gemini(): GoogleGenAI {
  const apiKey = process.env.IA_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(503, "Falta configurar IA_API_KEY en el .env del back (o usá IA_PROVEEDOR=mock para probar sin IA)");
  }
  if (clienteGemini?.apiKey !== apiKey) clienteGemini = { apiKey, cliente: new GoogleGenAI({ apiKey }) };
  return clienteGemini.cliente;
}

// Modelo saturado, error interno de Google o sin respuesta a tiempo: vale la pena probar con otro modelo
const esSaturacion = (e: unknown) =>
  (e instanceof ApiError && (e.status === 503 || e.status === 500)) || (e instanceof Error && e.name === "AbortError");

async function consultarGemini(fotos: FotoIA[], instrucciones: string, esquema: object): Promise<unknown> {
  const principal = process.env.IA_MODELO?.trim() || MODELO_GEMINI_POR_DEFECTO;
  const respaldo = process.env.IA_MODELO_RESPALDO?.trim() || MODELO_GEMINI_RESPALDO;
  const modelos = [...new Set([principal, respaldo])];

  let texto: string | undefined;
  for (const [i, modelo] of modelos.entries()) {
    try {
      const respuesta = await gemini().models.generateContent({
        model: modelo,
        contents: [
          {
            role: "user",
            parts: [
              ...fotos.map((f) => ({ inlineData: { mimeType: f.mimetype, data: f.buffer.toString("base64") } })),
              { text: "Analizá estas fotos de un mismo producto y completá sus datos." },
            ],
          },
        ],
        config: {
          systemInstruction: instrucciones,
          responseMimeType: "application/json",
          responseJsonSchema: esquema,
          httpOptions: { timeout: TIMEOUT_MS },
        },
      });
      texto = respuesta.text;
      break;
    } catch (e) {
      const quedanModelos = i < modelos.length - 1;
      if (!quedanModelos || !esSaturacion(e)) throw errorDeGemini(e, modelo);
      console.warn(`Gemini: "${modelo}" no respondió (saturado o sin respuesta), se prueba con "${modelos[i + 1]}"`);
    }
  }

  if (!texto) throw new AppError(502, "La IA no devolvió ninguna respuesta. Probá con otras fotos");
  try {
    return JSON.parse(texto);
  } catch {
    throw new AppError(502, "La IA devolvió una respuesta que no se pudo leer. Probá de nuevo");
  }
}

// Pasa los errores de la API de Google a mensajes que el admin pueda entender
function errorDeGemini(e: unknown, modelo: string): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof ApiError) {
    if (e.status === 429) return new AppError(429, "Se alcanzó el límite de uso de la IA, probá en un minuto");
    if (e.status === 401 || e.status === 403 || /api key/i.test(e.message)) {
      return new AppError(502, "La API key de Gemini no es válida. Revisá IA_API_KEY en el .env del back");
    }
    if (e.status === 404) return new AppError(502, `El modelo "${modelo}" no existe. Revisá IA_MODELO en el .env del back`);
    if (e.status === 503 || e.status === 500) {
      return new AppError(503, "La IA está saturada en este momento. Probá de nuevo en unos segundos");
    }
  }
  if (e instanceof Error && e.name === "AbortError") {
    return new AppError(504, "La IA tardó demasiado en responder. Probá de nuevo");
  }
  console.error("Error de Gemini:", e);
  return new AppError(502, "No se pudieron analizar las fotos con la IA. Probá de nuevo");
}

// Producto de ejemplo con el mismo formato que responde la IA. Pasa por la misma
// validacion, asi que los nombres que no existan en la base se descartan igual.
async function respuestaMock(): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 800)); // para ver el "Analizando..." en el FE
  return {
    nombre: "Procesador AMD Ryzen 5 5600",
    descripcion:
      "Procesador AMD Ryzen 5 5600 de 6 núcleos y 12 hilos para socket AM4. Ideal para PCs gamer de gama media. (Datos de ejemplo: IA en modo mock)",
    nombreEn: "AMD Ryzen 5 5600 Processor",
    descripcionEn:
      "AMD Ryzen 5 5600 processor with 6 cores and 12 threads for the AM4 socket. Great for mid-range gaming PCs. (Sample data: AI in mock mode)",
    categoria: "Procesadores",
    marca: "AMD",
    tipoComponente: "CPU",
    wattsRequeridos: 65,
    atributos: [
      { nombre: "Socket", valor: "AM4" },
      { nombre: "Nucleos", valor: "6" },
      { nombre: "Hilos", valor: "12" },
      { nombre: "Frecuencia", valor: "3.5" },
      { nombre: "Frecuencia turbo", valor: "4.4" },
      { nombre: "Cache L3", valor: "32" },
      { nombre: "TDP", valor: "65" },
      { nombre: "Graficos integrados", valor: "No" },
      { nombre: "Memoria soportada", valor: "DDR4" },
      { nombre: "Cooler incluido", valor: "Si" },
      { nombre: "Litografia", valor: "7" },
    ],
  };
}
