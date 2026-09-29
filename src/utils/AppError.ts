// Error con codigo HTTP. Ejemplo en un service:
//   throw new AppError(404, 'Producto no encontrado');
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
