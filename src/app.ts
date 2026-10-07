import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { apiRouter } from "./routes";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import { CARPETA_UPLOADS } from "./middlewares/subirImagen";

// La app se arma aca y server.ts solo la pone a escuchar,
// asi los tests pueden usarla con supertest sin levantar el puerto.
export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

// Muestra cada request en consola: "GET /health"
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== "test") console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Imagenes de productos subidas por el admin: http://localhost:3000/uploads/xxx.webp
app.use("/uploads", express.static(CARPETA_UPLOADS, { maxAge: "7d" }));

app.use("/api", apiRouter);

app.use(errorHandler);
