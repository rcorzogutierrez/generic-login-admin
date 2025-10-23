/**
 * Utilidades centralizadas para manejo de errores
 */

import { ErrorCode, AppError, OperationResult } from '../models/error-types';

/**
 * Mapea códigos de error de Firebase/Firestore a mensajes legibles
 */
export function getFirebaseErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'permission-denied': 'No tienes permisos para realizar esta acción',
    'unavailable': 'Servicio temporalmente no disponible, intenta más tarde',
    'not-found': 'El recurso solicitado no fue encontrado',
    'already-exists': 'El recurso ya existe en el sistema',
    'unauthenticated': 'Debes iniciar sesión para continuar',
    'invalid-argument': 'Los datos proporcionados son inválidos',
    'deadline-exceeded': 'La operación tardó demasiado tiempo',
    'resource-exhausted': 'Se excedió el límite de recursos'
  };

  return errorMessages[errorCode] || 'Error desconocido';
}

/**
 * Crea un objeto AppError estandarizado
 */
export function createAppError(
  code: ErrorCode | string,
  message: string,
  originalError?: any,
  context?: Record<string, any>
): AppError {
  return {
    code,
    message,
    originalError,
    context
  };
}

/**
 * Convierte un error nativo de JavaScript/Firebase a AppError
 */
export function normalizeError(error: any): AppError {
  if (!error) {
    return createAppError(ErrorCode.UNKNOWN_ERROR, 'Error desconocido');
  }

  // Error de Firebase
  if (error.code) {
    const message = getFirebaseErrorMessage(error.code);
    return createAppError(error.code, message, error);
  }

  // Error estándar de JavaScript
  if (error instanceof Error) {
    return createAppError(ErrorCode.UNKNOWN_ERROR, error.message, error);
  }

  // Error de tipo string
  if (typeof error === 'string') {
    return createAppError(ErrorCode.UNKNOWN_ERROR, error);
  }

  return createAppError(ErrorCode.UNKNOWN_ERROR, 'Error desconocido', error);
}

/**
 * Crea un resultado de operación exitoso
 */
export function createSuccessResult<T = any>(
  message: string,
  data?: T
): OperationResult<T> {
  return {
    success: true,
    message,
    data
  };
}

/**
 * Crea un resultado de operación fallida
 */
export function createErrorResult(
  message: string,
  error?: AppError
): OperationResult {
  return {
    success: false,
    message,
    error
  };
}

/**
 * Maneja un error y devuelve un OperationResult
 */
export function handleError(
  error: any,
  defaultMessage: string = 'Ocurrió un error'
): OperationResult {
  const appError = normalizeError(error);
  console.error('❌ Error:', appError);

  return createErrorResult(appError.message || defaultMessage, appError);
}

/**
 * Valida si un objeto tiene el formato de OperationResult
 */
export function isOperationResult(obj: any): obj is OperationResult {
  return (
    obj &&
    typeof obj === 'object' &&
    'success' in obj &&
    'message' in obj &&
    typeof obj.success === 'boolean' &&
    typeof obj.message === 'string'
  );
}
