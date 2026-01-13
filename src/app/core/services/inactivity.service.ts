// src/app/core/services/inactivity.service.ts

import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Subject, fromEvent, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private authService = inject(AuthService);

  // Configuración de tiempos (en milisegundos)
  private readonly INACTIVITY_TIME = 10 * 60 * 1000; // 10 minutos
  private readonly WARNING_TIME = 1 * 60 * 1000; // 1 minuto adicional

  // Clave de localStorage
  private readonly LAST_ACTIVITY_KEY = 'lastActivity';

  // Timers
  private inactivityTimer: any = null;
  private warningTimer: any = null;

  // Estado
  private isWarningOpen = false;
  private isActive = false;

  // Subject para actividad del usuario
  private userActivity$ = new Subject<void>();

  constructor() {
    // Escuchar actividad del usuario con debounce
    this.userActivity$
      .pipe(debounceTime(1000)) // Evitar demasiadas actualizaciones
      .subscribe(() => {
        this.resetTimers();
        this.updateLastActivity();
      });
  }

  /**
   * Verificar sesión al iniciar la aplicación
   * Retorna true si la sesión es válida, false si expiró
   */
  checkSessionOnStartup(): boolean {
    const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);

    if (!lastActivity) {
      // Primera vez o no hay registro previo
      this.updateLastActivity();
      return true;
    }

    const elapsed = Date.now() - Number(lastActivity);

    if (elapsed > this.INACTIVITY_TIME) {
      console.log('[InactivityService] Sesión expirada por inactividad (pestaña cerrada)');
      console.log(`[InactivityService] Tiempo transcurrido: ${Math.floor(elapsed / 1000 / 60)} minutos`);
      // Sesión expirada, hacer logout
      this.logout();
      return false;
    }

    // Sesión válida, actualizar timestamp
    this.updateLastActivity();
    return true;
  }

  /**
   * Actualizar timestamp de última actividad en localStorage
   */
  private updateLastActivity() {
    localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
  }

  /**
   * Limpiar timestamp de última actividad
   */
  private clearLastActivity() {
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
  }

  /**
   * Iniciar monitoreo de inactividad
   */
  startMonitoring() {
    if (this.isActive) {
      return; // Ya está activo
    }

    // Verificar sesión antes de iniciar monitoreo
    const isValid = this.checkSessionOnStartup();
    if (!isValid) {
      return; // Sesión expirada, no iniciar monitoreo
    }

    this.isActive = true;
    this.setupActivityListeners();
    this.startInactivityTimer();

    console.log('[InactivityService] Monitoreo iniciado');
  }

  /**
   * Detener monitoreo de inactividad
   */
  stopMonitoring() {
    this.isActive = false;
    this.clearTimers();
    this.removeActivityListeners();
    this.clearLastActivity();

    console.log('[InactivityService] Monitoreo detenido');
  }

  /**
   * Configurar listeners de actividad del usuario
   */
  private setupActivityListeners() {
    // Eventos que indican actividad del usuario
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, this.onUserActivity, true);
    });
  }

  /**
   * Remover listeners de actividad
   */
  private removeActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.removeEventListener(event, this.onUserActivity, true);
    });
  }

  /**
   * Handler de actividad del usuario
   */
  private onUserActivity = () => {
    if (this.isActive && !this.isWarningOpen) {
      this.userActivity$.next();
    }
  }

  /**
   * Iniciar timer de inactividad (10 minutos)
   */
  private startInactivityTimer() {
    this.clearTimers();
    this.updateLastActivity();

    this.inactivityTimer = setTimeout(() => {
      this.showWarning();
    }, this.INACTIVITY_TIME);
  }

  /**
   * Mostrar modal de advertencia
   */
  private async showWarning() {
    if (this.isWarningOpen) {
      return; // Ya está abierto
    }

    this.isWarningOpen = true;
    console.log('[InactivityService] Mostrando advertencia de inactividad');

    // Importar dinámicamente el componente del diálogo
    const { InactivityWarningDialogComponent } = await import(
      '../../shared/components/inactivity-warning-dialog/inactivity-warning-dialog.component'
    );

    const dialogRef = this.dialog.open(InactivityWarningDialogComponent, {
      width: '450px',
      disableClose: true, // No se puede cerrar clickeando fuera
      data: {
        warningSeconds: this.WARNING_TIME / 1000
      }
    });

    // Iniciar timer de logout automático
    this.startWarningTimer();

    // Escuchar respuesta del usuario
    dialogRef.afterClosed().subscribe((continueSession: boolean) => {
      this.isWarningOpen = false;
      this.clearWarningTimer();

      if (continueSession) {
        // Usuario quiere continuar
        console.log('[InactivityService] Usuario continúa sesión');
        this.resetTimers();
        this.updateLastActivity();
      } else {
        // Usuario cerró sesión o timeout
        console.log('[InactivityService] Cerrando sesión por inactividad');
        this.logout();
      }
    });
  }

  /**
   * Iniciar timer de advertencia (1 minuto)
   */
  private startWarningTimer() {
    this.warningTimer = setTimeout(() => {
      // Timeout alcanzado, cerrar dialog y hacer logout
      this.dialog.closeAll();
      this.logout();
    }, this.WARNING_TIME);
  }

  /**
   * Resetear timers
   */
  private resetTimers() {
    if (!this.isActive) {
      return;
    }

    this.clearTimers();
    this.startInactivityTimer();
  }

  /**
   * Limpiar todos los timers
   */
  private clearTimers() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.clearWarningTimer();
  }

  /**
   * Limpiar timer de advertencia
   */
  private clearWarningTimer() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Hacer logout
   */
  private async logout() {
    this.stopMonitoring();
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
