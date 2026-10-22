import { AppError } from "./AppError";

// Cuando un admin deshabilita una cuenta, el usuario no puede iniciar sesion ni seguir usando
// la que tenia abierta. El FE usa este codigo para mostrar el aviso en el login.
export const CODIGO_USUARIO_DESHABILITADO = "USUARIO_DESHABILITADO";
export const MENSAJE_USUARIO_DESHABILITADO =
  "Tu cuenta está deshabilitada. Si creés que es un error, comunicate con el comercio.";

// Desde el panel solo se deshabilitan clientes: ningun admin puede deshabilitarse a si mismo
// (se quedaria afuera del panel) ni a otro admin (todos tienen los mismos permisos).
// Habilitar si se puede siempre, por si un admin quedo deshabilitado desde la base.
export function validarCambioHabilitado(
  idAdmin: number,
  usuario: { id: number; rol: string },
  habilitado: boolean,
) {
  if (habilitado) return;
  if (idAdmin === usuario.id) throw new AppError(409, "No podés deshabilitar tu propia cuenta");
  if (usuario.rol === "ADMIN") throw new AppError(409, "No se puede deshabilitar a otro administrador");
}
