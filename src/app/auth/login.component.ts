// src/app/auth/login.component.ts
import { Component, OnInit, computed, signal, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/services/auth.service';
import { AppConfigService } from '../core/services/app-config.service';
import { NotificationService } from '../core/services/notification.service';
import { LoggerService } from '../core/services/logger.service';
import { NavigationService } from '../core/services/navigation.service';

/**
 * Componente de Login - Implementación optimizada con Angular 20
 *
 * Características:
 * - Standalone component con signal-based state
 * - Inject function pattern para DI
 * - Computed signals para estados derivados
 * - Servicios centralizados (Auth, Navigation, Notification, Logger)
 * - Integración con Firebase Auth (Google provider)
 * - Skeleton loaders para mejor UX
 *
 * @example
 * ```typescript
 * // Uso en rutas
 * { path: 'login', component: LoginComponent, canActivate: [loginGuard] }
 * ```
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  // ========================================
  // SERVICIOS (Inject pattern - Angular 20)
  // ========================================
  readonly authService = inject(AuthService);
  readonly appConfigService = inject(AppConfigService);
  private notificationService = inject(NotificationService);
  private logger = inject(LoggerService);
  private navigationService = inject(NavigationService);

  // ========================================
  // SIGNALS - Estado del componente
  // ========================================

  /** Indica si el proceso de login está en curso */
  private _isLoggingIn = signal(false);

  /** Mensaje de resultado del login (éxito o error) */
  private _loginMessage = signal<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  /** Indica si hay un redirect de OAuth pendiente */
  private _isRedirectPending = signal(false);

  // Readonly signals expuestos al template
  readonly isLoggingIn = this._isLoggingIn.asReadonly();
  readonly loginMessage = this._loginMessage.asReadonly();
  readonly isRedirectPending = this._isRedirectPending.asReadonly();

  // ========================================
  // COMPUTED SIGNALS - Estados derivados
  // ========================================

  /**
   * Indica si se debe mostrar el formulario de login
   * (usuario no autenticado y no está cargando)
   */
  readonly showLoginForm = computed(() =>
    !this.authService.loading() &&
    !this.authService.isAuthenticated()
  );

  /**
   * Indica si se debe mostrar el estado de redirección
   * (usuario autenticado y autorizado)
   */
  readonly showRedirecting = computed(() =>
    !this.authService.loading() &&
    this.authService.isAuthenticated() &&
    this.authService.isAuthorized()
  );

  // ========================================
  // APP CONFIG SIGNALS (delegados del servicio)
  // ========================================
  readonly appName = this.appConfigService.appName;
  readonly appDescription = this.appConfigService.appDescription;
  readonly logoUrl = this.appConfigService.logoUrl;
  readonly logoBackgroundColor = this.appConfigService.logoBackgroundColor;
  readonly adminContactEmail = this.appConfigService.adminContactEmail;

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  /**
   * Inicialización del componente
   * Carga la configuración de la app desde Firestore
   * Detecta si hay un redirect de OAuth pendiente
   */
  async ngOnInit(): Promise<void> {
    // Detectar si hay un redirect pendiente (popup bloqueado)
    const redirectPending = localStorage.getItem('auth_redirect_pending') === 'true';
    if (redirectPending) {
      this._isRedirectPending.set(true);
      this._loginMessage.set({
        type: 'info',
        message: 'Procesando autenticación, por favor espera...'
      });
      this.logger.info('Redirect de OAuth detectado, procesando...');
    }

    // Inicializar configuración (nombre, logo, etc.)
    await this.appConfigService.initialize();

    // Debug: log de configuración cargada (solo en desarrollo)
    this.logger.debug('LoginComponent - Configuración cargada', {
      appName: this.appName(),
      appDescription: this.appDescription(),
      logoUrl: this.logoUrl(),
      adminContactEmail: this.adminContactEmail()
    });

    // Limpiar mensajes previos si no hay redirect pendiente
    if (!redirectPending) {
      this._loginMessage.set(null);
    }
  }

  // ========================================
  // MÉTODOS PÚBLICOS
  // ========================================

  /**
   * Inicia el proceso de login con Google OAuth
   *
   * Flujo:
   * 1. Abre popup de Google Auth
   * 2. Verifica autorización en Firestore (users collection)
   * 3. Actualiza lastLogin si es exitoso
   * 4. Redirige automáticamente vía NavigationService
   *
   * @returns Promise<void>
   */
  async loginWithGoogle(): Promise<void> {
    // Prevenir múltiples clicks
    if (this._isLoggingIn()) return;

    this._isLoggingIn.set(true);
    this._loginMessage.set(null);

    try {
      const result = await this.authService.loginWithGoogle();

      if (result.success) {
        // ✅ Login exitoso
        this._loginMessage.set({
          type: 'success',
          message: '¡Bienvenido! Redirigiendo...',
        });

        this.logger.info('Login exitoso con Google');
        // Nota: La redirección se maneja automáticamente vía NavigationService

      } else {
        // ❌ Login fallido (usuario no autorizado)
        this._loginMessage.set({
          type: 'error',
          message: result.message,
        });

        // Mostrar notificación de error
        this.notificationService.error(result.message);
        this.logger.warn('Login fallido', { message: result.message });
      }
    } catch (error) {
      // ✅ Tipado mejorado de errores
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error inesperado al iniciar sesión. Por favor, intenta nuevamente.';

      this._loginMessage.set({
        type: 'error',
        message: errorMessage,
      });

      // Logging y notificación de error
      this.logger.error('Error en loginWithGoogle', error);
      this.notificationService.error(errorMessage);
    } finally {
      this._isLoggingIn.set(false);
    }
  }
}