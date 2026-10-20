// Error con codigo HTTP. Ejemplo en un service:
//   throw new AppError(404, 'Producto no encontrado');
// reintentarEnSegundos: en un 429, cuanto conviene esperar antes de volver a intentar.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public reintentarEnSegundos?: number,
  ) {
    super(message);
  }
}
