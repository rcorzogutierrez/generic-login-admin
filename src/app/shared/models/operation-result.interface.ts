/**
 * Interfaz estándar para resultados de operaciones CRUD
 * Proporciona un formato consistente para success/error en todos los módulos
 */
export interface OperationResult<T = any> {
  /** Indica si la operación fue exitosa */
  success: boolean;

  /** Mensaje descriptivo del resultado */
  message: string;

  /** Datos opcionales retornados por la operación (ej: ID del documento creado) */
  data?: T;

  /** Lista opcional de errores de validación o ejecución */
  errors?: string[];
}

/**
 * Helper para crear un resultado exitoso
 */
export function createSuccessResult<T = any>(message: string, data?: T): OperationResult<T> {
  return {
    success: true,
    message,
    data
  };
}

/**
 * Helper para crear un resultado fallido
 */
export function createErrorResult(message: string, errors?: string[]): OperationResult {
  return {
    success: false,
    message,
    errors
  };
}
