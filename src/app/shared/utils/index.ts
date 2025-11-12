/**
 * Exportación centralizada de todas las utilidades compartidas
 *
 * Este archivo facilita la importación de utilidades desde un solo punto.
 *
 * @example
 * ```typescript
 * // Antes (múltiples imports)
 * import { normalizeEmail } from './utils/string.utils';
 * import { logAuditAction } from './utils/audit-logger.utils';
 * import { formatDate } from './utils/date-time.utils';
 * import { handleError } from './utils/error-handler.utils';
 *
 * // Después (un solo import)
 * import { normalizeEmail, logAuditAction, formatDate, handleError } from './utils';
 * ```
 */

// Audit Logger
export * from './audit-logger.utils';

// String utilities
export * from './string.utils';

// Date and time utilities
export * from './date-time.utils';

// Error handling
export * from './error-handler.utils';

// Confirmation dialogs
export * from './confirmation.utils';

// Firebase logging wrappers
export * from './firebase-logger.utils';

// User display helpers
export * from './user-display.utils';

// Icon utilities
export * from './icon.utils';
