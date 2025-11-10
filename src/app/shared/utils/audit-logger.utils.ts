/**
 * Utilidades centralizadas para logging de auditoría
 *
 * Este módulo proporciona funciones compartidas para registrar acciones
 * administrativas en Firestore (colección 'admin_logs').
 *
 * @module audit-logger.utils
 */

import { getAuth } from 'firebase/auth';
import { getFirestore, collection } from 'firebase/firestore';
import { addDocWithLogging as addDoc } from './firebase-logger.utils';

/**
 * Datos de una acción de auditoría
 */
export interface AuditLogData {
  /** Tipo de acción realizada (ej: 'create_user', 'update_module', 'delete_role') */
  action: string;

  /** ID del recurso afectado (usuario, módulo, etc.) */
  targetId: string;

  /** Detalles adicionales de la acción (se serializará a JSON) */
  details: any;

  /** UID del usuario que realiza la acción (opcional, se obtiene automáticamente si no se provee) */
  performedBy?: string;

  /** Email del usuario que realiza la acción (opcional, se obtiene automáticamente si no se provee) */
  performedByEmail?: string;
}

/**
 * Resultado de la operación de logging
 */
export interface AuditLogResult {
  /** Indica si el log se registró exitosamente */
  success: boolean;

  /** ID del documento creado en Firestore (si success = true) */
  logId?: string;

  /** Mensaje de error (si success = false) */
  error?: string;
}

/**
 * Registra una acción de auditoría en Firestore
 *
 * Esta función centraliza el logging de todas las acciones administrativas,
 * asegurando un formato consistente y captura automática del usuario actual.
 *
 * @param logData - Datos de la acción a registrar
 * @returns Promise con el resultado de la operación
 *
 * @example
 * ```typescript
 * // Ejemplo 1: Log de creación de usuario
 * await logAuditAction({
 *   action: 'create_user',
 *   targetId: 'user_123',
 *   details: {
 *     email: 'nuevo@example.com',
 *     role: 'user',
 *     modules: ['clients', 'dashboard']
 *   }
 * });
 *
 * // Ejemplo 2: Log con performer personalizado
 * await logAuditAction({
 *   action: 'update_module',
 *   targetId: 'module_456',
 *   details: { label: 'Nuevo nombre' },
 *   performedBy: 'custom_uid',
 *   performedByEmail: 'custom@example.com'
 * });
 *
 * // Ejemplo 3: Capturar errores
 * const result = await logAuditAction({
 *   action: 'delete_role',
 *   targetId: 'role_789',
 *   details: { roleName: 'Editor' }
 * });
 *
 * if (!result.success) {
 *   console.error('No se pudo registrar el log:', result.error);
 * }
 * ```
 */
export async function logAuditAction(logData: AuditLogData): Promise<AuditLogResult> {
  try {
    const auth = getAuth();
    const db = getFirestore();

    // Obtener usuario actual si no se especificó
    const currentUser = auth.currentUser;
    const performedBy = logData.performedBy || currentUser?.uid || 'system';
    const performedByEmail = logData.performedByEmail || currentUser?.email || 'system';

    // Construir documento de log
    const logDocument = {
      action: logData.action,
      targetUserId: logData.targetId, // Mantener compatibilidad con schema existente
      performedBy,
      performedByEmail,
      timestamp: new Date(),
      details: typeof logData.details === 'string'
        ? logData.details
        : JSON.stringify(logData.details),
      ip: 'unknown' // TODO: Implementar detección de IP si es necesario
    };

    // Registrar en Firestore
    const docRef = await addDoc(
      collection(db, 'admin_logs'),
      logDocument
    );

    return {
      success: true,
      logId: docRef.id
    };

  } catch (error) {
    console.warn('⚠️ Error registrando acción de auditoría:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Registra múltiples acciones de auditoría en batch
 *
 * Útil para operaciones que afectan múltiples recursos a la vez.
 *
 * @param logDataArray - Array de datos de acciones a registrar
 * @returns Promise con array de resultados
 *
 * @example
 * ```typescript
 * const results = await logAuditActionBatch([
 *   { action: 'delete_user', targetId: 'user1', details: {} },
 *   { action: 'delete_user', targetId: 'user2', details: {} },
 *   { action: 'delete_user', targetId: 'user3', details: {} }
 * ]);
 *
 * const successCount = results.filter(r => r.success).length;
 * console.log(`${successCount}/${results.length} logs registrados`);
 * ```
 */
export async function logAuditActionBatch(
  logDataArray: AuditLogData[]
): Promise<AuditLogResult[]> {
  const results: AuditLogResult[] = [];

  for (const logData of logDataArray) {
    const result = await logAuditAction(logData);
    results.push(result);
  }

  return results;
}

/**
 * Crea un helper de logging vinculado a un módulo específico
 *
 * Retorna una función pre-configurada con el contexto del módulo,
 * reduciendo la repetición de código.
 *
 * @param modulePrefix - Prefijo para las acciones (ej: 'user', 'module', 'role')
 * @returns Función de logging configurada
 *
 * @example
 * ```typescript
 * // En un servicio:
 * export class UsersService {
 *   private log = createModuleLogger('user');
 *
 *   async createUser(data) {
 *     // ... lógica de creación
 *     await this.log('create', userId, { email, role });
 *   }
 *
 *   async updateUser(userId, data) {
 *     // ... lógica de actualización
 *     await this.log('update', userId, { updatedFields: Object.keys(data) });
 *   }
 * }
 * ```
 */
export function createModuleLogger(modulePrefix: string) {
  return async (
    action: string,
    targetId: string,
    details: any,
    performedBy?: string,
    performedByEmail?: string
  ): Promise<AuditLogResult> => {
    const fullAction = `${modulePrefix}_${action}`;

    return logAuditAction({
      action: fullAction,
      targetId,
      details,
      performedBy,
      performedByEmail
    });
  };
}

/**
 * Tipos de acciones comunes para mejor autocompletado
 *
 * @example
 * ```typescript
 * import { logAuditAction, AuditActionTypes } from './audit-logger.utils';
 *
 * await logAuditAction({
 *   action: AuditActionTypes.USER_CREATE,
 *   targetId: 'user_123',
 *   details: { ... }
 * });
 * ```
 */
export const AuditActionTypes = {
  // Usuarios
  USER_CREATE: 'create_user',
  USER_UPDATE: 'update_user',
  USER_DELETE: 'delete_user',
  USER_TOGGLE_STATUS: 'status_change',
  USER_PASSWORD_RESET: 'password_reset_sent',

  // Módulos
  MODULE_CREATE: 'create_module',
  MODULE_UPDATE: 'update_module',
  MODULE_DELETE: 'delete_module_permanent',
  MODULE_DEACTIVATE: 'deactivate_module',
  MODULE_REORDER: 'reorder_modules',

  // Roles
  ROLE_CREATE: 'create_role',
  ROLE_UPDATE: 'update_role',
  ROLE_DELETE: 'delete_role',

  // Sistema
  SYSTEM_CONFIG_UPDATE: 'update_system_config',
  SYSTEM_EXPORT: 'export_users',
  SYSTEM_IMPORT: 'import_users',

  // Logs
  LOGS_DELETE_ALL: 'delete_all_logs',
  LOGS_DELETE_OLD: 'delete_old_logs',
  LOGS_EXPORT: 'export_logs'
} as const;

/**
 * Type helper para actions con autocompletado
 */
export type AuditAction = typeof AuditActionTypes[keyof typeof AuditActionTypes] | string;
