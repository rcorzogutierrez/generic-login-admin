/**
 * Utilidades compartidas para formateo de fechas y tiempos
 *
 * Este módulo proporciona funciones reutilizables para formatear fechas,
 * calcular tiempos relativos y manejar timestamps de manera consistente.
 *
 * @module date-time.utils
 */

/**
 * Formatea una fecha en formato legible para el usuario
 *
 * Muestra tiempo relativo para fechas recientes y formato corto para fechas antiguas.
 *
 * @param date - Fecha a formatear
 * @returns String formateado con el tiempo relativo o fecha
 *
 * @example
 * ```typescript
 * formatDate(new Date());                    // 'Hace pocos minutos'
 * formatDate(new Date(Date.now() - 3600000)); // 'Hace 1h'
 * formatDate(new Date('2024-01-15'));        // '15 Ene'
 * formatDate(null);                          // 'Nunca'
 * ```
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Nunca';

  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now.getTime() - dateObj.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Hace pocos minutos';
  } else if (diffHours < 24) {
    return `Hace ${diffHours}h`;
  } else {
    const days = Math.floor(diffHours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days}d`;
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  }
}

/**
 * Obtiene el tiempo relativo en formato compacto
 *
 * Útil para mostrar timestamps en listas o tablas donde el espacio es limitado.
 *
 * @param date - Fecha para calcular tiempo relativo
 * @returns String con tiempo relativo en formato compacto
 *
 * @example
 * ```typescript
 * getRelativeTime(new Date());                    // 'Ahora'
 * getRelativeTime(new Date(Date.now() - 300000));  // '5m'
 * getRelativeTime(new Date(Date.now() - 7200000)); // '2h'
 * getRelativeTime(new Date(Date.now() - 86400000)); // '1d'
 * getRelativeTime(null);                          // ''
 * ```
 */
export function getRelativeTime(date: Date | null | undefined): string {
  if (!date) return '';

  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 5) return 'Ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
  return `${Math.floor(diffMinutes / 1440)}d`;
}

/**
 * Formatea fecha y hora en formato completo
 *
 * Muestra fecha con hora en formato locale español.
 *
 * @param date - Fecha a formatear
 * @returns String con fecha y hora formateadas
 *
 * @example
 * ```typescript
 * formatDateTime(new Date('2024-11-12T15:30:00')); // '12 Nov, 15:30'
 * formatDateTime(null);                            // 'Desconocida'
 * ```
 */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return 'Desconocida';

  const dateObj = new Date(date);

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Formatea fecha en formato largo (día completo)
 *
 * @param date - Fecha a formatear
 * @returns Fecha en formato largo
 *
 * @example
 * ```typescript
 * formatDateLong(new Date('2024-11-12')); // 'martes, 12 de noviembre de 2024'
 * ```
 */
export function formatDateLong(date: Date | null | undefined): string {
  if (!date) return 'Fecha no disponible';

  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formatea fecha en formato corto (DD/MM/YYYY)
 *
 * @param date - Fecha a formatear
 * @returns Fecha en formato DD/MM/YYYY
 *
 * @example
 * ```typescript
 * formatDateShort(new Date('2024-11-12')); // '12/11/2024'
 * ```
 */
export function formatDateShort(date: Date | null | undefined): string {
  if (!date) return '';

  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea solo la hora (HH:MM)
 *
 * @param date - Fecha para extraer hora
 * @returns Hora en formato HH:MM
 *
 * @example
 * ```typescript
 * formatTime(new Date('2024-11-12T15:30:00')); // '15:30'
 * ```
 */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return '';

  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula diferencia en días entre dos fechas
 *
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha (por defecto: ahora)
 * @returns Número de días de diferencia
 *
 * @example
 * ```typescript
 * const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
 * getDaysDifference(lastWeek); // 7
 * ```
 */
export function getDaysDifference(
  date1: Date,
  date2: Date = new Date()
): number {
  const diffMs = Math.abs(new Date(date2).getTime() - new Date(date1).getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Verifica si una fecha fue hoy
 *
 * @param date - Fecha a verificar
 * @returns true si la fecha fue hoy
 *
 * @example
 * ```typescript
 * isToday(new Date()); // true
 * isToday(new Date('2024-01-01')); // false
 * ```
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  const compareDate = new Date(date);

  return (
    compareDate.getDate() === today.getDate() &&
    compareDate.getMonth() === today.getMonth() &&
    compareDate.getFullYear() === today.getFullYear()
  );
}

/**
 * Verifica si una fecha fue ayer
 *
 * @param date - Fecha a verificar
 * @returns true si la fecha fue ayer
 *
 * @example
 * ```typescript
 * const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
 * isYesterday(yesterday); // true
 * ```
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = new Date(date);

  return (
    compareDate.getDate() === yesterday.getDate() &&
    compareDate.getMonth() === yesterday.getMonth() &&
    compareDate.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Obtiene rango de fechas para filtros comunes
 *
 * @param range - Tipo de rango ('today', 'week', 'month', 'year')
 * @returns Objeto con startDate y endDate
 *
 * @example
 * ```typescript
 * const { startDate, endDate } = getDateRange('week');
 * console.log(startDate); // Inicio de la semana
 * console.log(endDate);   // Ahora
 * ```
 */
export function getDateRange(range: 'today' | 'week' | 'month' | 'year'): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  return { startDate, endDate };
}

/**
 * Convierte timestamp de Firestore a Date
 *
 * @param timestamp - Timestamp de Firestore con método toDate()
 * @returns Date o null si no es válido
 *
 * @example
 * ```typescript
 * const firestoreTimestamp = { toDate: () => new Date() };
 * const date = fromFirestoreTimestamp(firestoreTimestamp); // Date
 * ```
 */
export function fromFirestoreTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return null;
}
