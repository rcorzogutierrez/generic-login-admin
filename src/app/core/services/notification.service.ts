// src/app/core/services/notification.service.ts
import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  type: NotificationType;
  message: string;
}

/**
 * Servicio centralizado de notificaciones
 *
 * Características:
 * - Snackbars consistentes en toda la aplicación
 * - Tipos predefinidos (success, error, warning, info)
 * - Configuración centralizada de duración y posición
 * - Clases CSS personalizables
 *
 * @example
 * ```typescript
 * constructor(private notificationService: NotificationService) {}
 *
 * // Mostrar mensaje de éxito
 * this.notificationService.success('¡Datos guardados correctamente!');
 *
 * // Mostrar mensaje de error
 * this.notificationService.error('Error al guardar los datos');
 *
 * // Mostrar mensaje de advertencia
 * this.notificationService.warning('Los cambios no se han guardado');
 *
 * // Mostrar mensaje informativo
 * this.notificationService.info('Nueva actualización disponible');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  /**
   * Configuración por defecto para todos los snackbars
   */
  private readonly defaultConfig: Partial<MatSnackBarConfig> = {
    horizontalPosition: 'end',
    verticalPosition: 'top',
  };

  /**
   * Muestra un mensaje de éxito
   * Color verde, duración 5 segundos
   *
   * @param message Mensaje a mostrar
   * @param duration Duración en milisegundos (default: 5000)
   */
  success(message: string, duration: number = 5000): void {
    this.show(message, {
      ...this.defaultConfig,
      duration,
      panelClass: ['success-snackbar'],
    });
  }

  /**
   * Muestra un mensaje de error
   * Color rojo, duración 8 segundos (más tiempo para leer el error)
   *
   * @param message Mensaje a mostrar
   * @param duration Duración en milisegundos (default: 8000)
   */
  error(message: string, duration: number = 8000): void {
    this.show(message, {
      ...this.defaultConfig,
      duration,
      panelClass: ['error-snackbar'],
    });
  }

  /**
   * Muestra un mensaje de advertencia
   * Color naranja/amarillo, duración 6 segundos
   *
   * @param message Mensaje a mostrar
   * @param duration Duración en milisegundos (default: 6000)
   */
  warning(message: string, duration: number = 6000): void {
    this.show(message, {
      ...this.defaultConfig,
      duration,
      panelClass: ['warning-snackbar'],
    });
  }

  /**
   * Muestra un mensaje informativo
   * Color azul, duración 5 segundos
   *
   * @param message Mensaje a mostrar
   * @param duration Duración en milisegundos (default: 5000)
   */
  info(message: string, duration: number = 5000): void {
    this.show(message, {
      ...this.defaultConfig,
      duration,
      panelClass: ['info-snackbar'],
    });
  }

  /**
   * Muestra un snackbar genérico con configuración personalizada
   *
   * @param message Mensaje a mostrar
   * @param config Configuración del snackbar
   * @param action Texto del botón de acción (default: 'Cerrar')
   */
  show(message: string, config?: MatSnackBarConfig, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, config);
  }

  /**
   * Cierra todos los snackbars activos
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
