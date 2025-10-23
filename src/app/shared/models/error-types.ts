/**
 * Tipos de error estandarizados para toda la aplicación
 */

export enum ErrorCode {
  // Errores de autenticación
  AUTH_PERMISSION_DENIED = 'permission-denied',
  AUTH_UNAUTHORIZED = 'unauthorized',

  // Errores de Firebase/Firestore
  FIRESTORE_UNAVAILABLE = 'unavailable',
  FIRESTORE_NOT_FOUND = 'not-found',
  FIRESTORE_ALREADY_EXISTS = 'already-exists',

  // Errores de validación
  VALIDATION_ERROR = 'validation-error',
  VALIDATION_EMAIL_INVALID = 'email-invalid',
  VALIDATION_REQUIRED_FIELD = 'required-field',

  // Errores de red
  NETWORK_ERROR = 'network-error',
  NETWORK_TIMEOUT = 'network-timeout',

  // Errores desconocidos
  UNKNOWN_ERROR = 'unknown-error'
}

export interface AppError {
  code: ErrorCode | string;
  message: string;
  originalError?: any;
  context?: Record<string, any>;
}

export interface OperationResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: AppError;
}
