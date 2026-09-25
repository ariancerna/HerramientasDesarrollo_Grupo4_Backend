/**
 * Error de negocio/HTTP controlado. Lánzalo desde cualquier capa
 * (service, repository) y el error.middleware.ts arma la respuesta.
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'No tienes permiso para esta acción') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static unprocessable(message: string, details?: unknown) {
    return new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
