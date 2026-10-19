import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import { apiRouter } from "./routes";
import { auth } from "./lib/auth";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { CARPETA_UPLOADS } from "./middlewares/subirImagen";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

// Muestra cada request en consola: "GET /health"
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Solo desarrollo: MP vuelve por ngrok (que llega a este BE) y, si FRONTEND_URL esta definida en el .env
// (ej. http://localhost:5173), se reenvia al FE conservando la query. Sin la variable no hace nada.
if (process.env.FRONTEND_URL) {
  const frontend = process.env.FRONTEND_URL.replace(/\/$/, "");
  app.get("/checkout/:estado", (req, res) => {
    res.redirect(`${frontend}${req.originalUrl}`);
  });
}

// Imagenes de productos subidas por el admin: http://localhost:3000/uploads/xxx.webp
app.use("/uploads", express.static(CARPETA_UPLOADS, { maxAge: "7d" }));

app.use("/api", apiRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
