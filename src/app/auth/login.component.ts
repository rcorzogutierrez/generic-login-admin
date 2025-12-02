// src/app/auth/login.component.ts
import { Component, OnInit, computed, signal, Signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AppConfigService } from '../core/services/app-config.service';

/**
 * Componente de Login - Implementación optimizada con Angular 20
 *
 * Características:
 * - Standalone component con signal-based state
 * - Inject function pattern para DI
 * - Computed signals para estados derivados
 * - Auth state management vía AuthService
 * - Integración con Firebase Auth (Google provider)
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
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  // ✅ Inject pattern (Angular 20 best practice)
  readonly authService = inject(AuthService);
  readonly appConfigService = inject(AppConfigService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  // ========================================
  // SIGNALS - Estado del componente
  // ========================================

  /** Indica si el proceso de login está en curso */
  private _isLoggingIn = signal(false);

  /** Mensaje de resultado del login (éxito o error) */
  private _loginMessage = signal<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Readonly signals expuestos al template
  readonly isLoggingIn = this._isLoggingIn.asReadonly();
  readonly loginMessage = this._loginMessage.asReadonly();

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
  // APP CONFIG SIGNALS
  // ========================================

  /** Nombre de la aplicación (configurable desde Firestore) */
  readonly appName: Signal<string | null> = this.appConfigService.appName;

  /** Descripción de la aplicación */
  readonly appDescription: Signal<string | null> = this.appConfigService.appDescription;

  /** URL del logo personalizado */
  readonly logoUrl: Signal<string | null> = this.appConfigService.logoUrl;

  /** Color de fondo del contenedor del logo */
  readonly logoBackgroundColor = this.appConfigService.logoBackgroundColor;

  /** Email de contacto del administrador */
  readonly adminContactEmail: Signal<string | null> = this.appConfigService.adminContactEmail;

  /** Información de la aplicación */
  readonly appInfo = this.authService.getAppInfo();

  /** Versión de Angular utilizada */
  readonly angularVersion = '20';

  // ========================================
  // CONSTRUCTOR - Effect para auto-redirect
  // ========================================

  constructor() {
    /**
     * ✅ OPTIMIZACIÓN: Effect para redirección automática
     * Elimina la necesidad de setInterval (polling cada 200ms)
     * Se ejecuta automáticamente cuando cambia el estado de auth
     */
    effect(() => {
      const isLoading = this.authService.loading();
      const isAuth = this.authService.isAuthenticated();
      const isAuthorized = this.authService.isAuthorized();

      // Solo redirigir cuando está completamente autorizado
      if (!isLoading && isAuth && isAuthorized) {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      }
    });
  }

  // ========================================
  // LIFECYCLE HOOKS
  // ========================================

  /**
   * Inicialización del componente
   * Carga la configuración de la app desde Firestore
   */
  async ngOnInit(): Promise<void> {
    // Inicializar configuración (nombre, logo, etc.)
    await this.appConfigService.initialize();

    // Debug: log de configuración cargada
    console.log('🔍 LoginComponent - Configuración cargada:', {
      appName: this.appName(),
      appDescription: this.appDescription(),
      logoUrl: this.logoUrl(),
      adminContactEmail: this.adminContactEmail()
    });

    // Limpiar mensajes previos
    this._loginMessage.set(null);
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
   * 4. Redirige automáticamente vía effect
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

        // Nota: La redirección se maneja automáticamente vía effect

      } else {
        // ❌ Login fallido (usuario no autorizado)
        this._loginMessage.set({
          type: 'error',
          message: result.message,
        });

        // Mostrar snackbar adicional para errores
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 8000,
          panelClass: ['error-snackbar'],
        });
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

      console.error('❌ Error en loginWithGoogle:', error);
    } finally {
      this._isLoggingIn.set(false);
    }
  }
}