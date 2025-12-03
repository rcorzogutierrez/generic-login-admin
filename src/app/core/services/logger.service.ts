// src/app/core/services/logger.service.ts
import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Servicio de logging centralizado
 *
 * Características:
 * - Logging condicional según nivel
 * - Suprime logs sensibles en producción
 * - Preparado para integración con servicios de monitoring (Sentry, LogRocket)
 * - Formateo consistente de mensajes
 *
 * @example
 * ```typescript
 * constructor(private logger: LoggerService) {}
 *
 * this.logger.debug('Usuario cargado', userData);
 * this.logger.info('Configuración inicializada');
 * this.logger.warn('Cache expirado');
 * this.logger.error('Error al cargar datos', error);
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    // Detectar si estamos en producción (hostname no es localhost)
    this.isProduction = !window.location.hostname.includes('localhost') &&
                        !window.location.hostname.includes('127.0.0.1');

    // En producción solo mostrar WARN y ERROR
    this.minLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  /**
   * Log de debug (solo en desarrollo)
   * Útil para debugging durante desarrollo
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`🔍 [DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log informativo
   * Eventos importantes pero no críticos
   */
  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`ℹ️ [INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log de advertencia
   * Situaciones que requieren atención pero no son errores
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`⚠️ [WARN] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log de error
   * Errores que requieren atención inmediata
   * En producción se envían a servicio de monitoring
   */
  error(message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`❌ [ERROR] ${message}`, error || '');

      if (this.isProduction) {
        this.sendToMonitoring(message, error);
      }
    }
  }

  /**
   * Verifica si debe loggear según el nivel configurado
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  /**
   * Envía errores a servicio de monitoring en producción
   *
   * TODO: Implementar integración con:
   * - Sentry: https://sentry.io
   * - LogRocket: https://logrocket.com
   * - Firebase Crashlytics
   *
   * @example
   * ```typescript
   * // Con Sentry
   * import * as Sentry from "@sentry/angular";
   * Sentry.captureException(error, {
   *   extra: { message },
   *   level: 'error'
   * });
   * ```
   */
  private sendToMonitoring(message: string, error: any): void {
    // Placeholder para integración futura con servicios de monitoring
    // Por ahora, solo registramos en console.error (ya hecho arriba)

    // Ejemplo de implementación futura:
    // if (window['Sentry']) {
    //   window['Sentry'].captureException(error, {
    //     extra: { message, timestamp: new Date().toISOString() }
    //   });
    // }
  }

  /**
   * Obtiene información del entorno actual
   */
  getEnvironmentInfo(): { isProduction: boolean; minLevel: string } {
    return {
      isProduction: this.isProduction,
      minLevel: LogLevel[this.minLevel]
    };
  }
}
