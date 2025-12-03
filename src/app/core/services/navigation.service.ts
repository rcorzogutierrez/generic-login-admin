// src/app/core/services/navigation.service.ts
import { Injectable, inject, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

/**
 * Servicio centralizado de navegación
 *
 * Características:
 * - Auto-redirección después de autenticación
 * - Manejo de returnUrl para navegación contextual
 * - Navegación segura con manejo de errores
 * - Logging de navegación para debugging
 *
 * @example
 * ```typescript
 * constructor(private navigationService: NavigationService) {}
 *
 * // Redirigir después de login
 * this.navigationService.redirectAfterLogin();
 *
 * // Navegar al login con URL de retorno
 * this.navigationService.navigateToLogin('/dashboard/clients');
 *
 * // Navegar a una ruta específica
 * this.navigationService.navigateTo('/dashboard');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private router = inject(Router);
  private authService = inject(AuthService);
  private logger = inject(LoggerService);

  // Variable para almacenar el returnUrl temporalmente
  private pendingReturnUrl: string | null = null;

  constructor() {
    this.setupAutoRedirectOnAuth();
  }

  /**
   * Configura la redirección automática cuando el usuario se autentica
   *
   * Utiliza un effect que reacciona a los cambios en el estado de autenticación.
   * Cuando el usuario está completamente autenticado y autorizado,
   * redirige automáticamente al dashboard o a la URL de retorno.
   */
  private setupAutoRedirectOnAuth(): void {
    effect(() => {
      const isLoading = this.authService.loading();
      const isAuth = this.authService.isAuthenticated();
      const isAuthorized = this.authService.isAuthorized();

      // Solo redirigir cuando está completamente autorizado y no está cargando
      if (!isLoading && isAuth && isAuthorized) {
        this.logger.debug('Usuario autenticado, iniciando redirección automática');
        this.redirectAfterLogin();
      }
    }, {
      allowSignalWrites: false // Best practice: effects de side-effects puros
    });
  }

  /**
   * Redirige después de login exitoso
   *
   * Orden de prioridad para la URL de destino:
   * 1. returnUrl pasado como parámetro
   * 2. returnUrl almacenado temporalmente
   * 3. returnUrl en query params de la URL actual
   * 4. Dashboard por defecto
   *
   * @param returnUrl URL opcional a la que redirigir
   */
  redirectAfterLogin(returnUrl?: string): void {
    try {
      const url = returnUrl ||
                  this.pendingReturnUrl ||
                  this.getReturnUrlFromParams() ||
                  '/dashboard';

      this.logger.info('Redirigiendo después de login', { url });

      // Limpiar returnUrl temporal después de usarlo
      this.pendingReturnUrl = null;

      this.router.navigate([url]);
    } catch (error) {
      this.logger.error('Error en redirección post-login', error);
      // Fallback seguro en caso de error
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Navega al login guardando la URL actual como returnUrl
   *
   * @param returnUrl URL a la que volver después del login (opcional)
   */
  navigateToLogin(returnUrl?: string): void {
    try {
      const url = returnUrl || this.router.url;

      // No guardar /login como returnUrl (evita loops)
      const shouldSaveReturnUrl = url !== '/login' && !url.startsWith('/login');

      if (shouldSaveReturnUrl) {
        this.logger.debug('Navegando a login con returnUrl', { returnUrl: url });
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: url }
        });
      } else {
        this.logger.debug('Navegando a login sin returnUrl');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      this.logger.error('Error navegando a login', error);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Navega a una ruta específica
   *
   * @param path Ruta a la que navegar
   * @param extras Opciones adicionales de navegación
   */
  navigateTo(path: string, extras?: any): void {
    try {
      this.logger.debug('Navegando a', { path, extras });
      this.router.navigate([path], extras);
    } catch (error) {
      this.logger.error('Error en navegación', error);
    }
  }

  /**
   * Almacena temporalmente un returnUrl para uso posterior
   * Útil cuando se necesita guardar la URL antes de una operación asíncrona
   *
   * @param url URL a almacenar
   */
  setPendingReturnUrl(url: string): void {
    this.pendingReturnUrl = url;
    this.logger.debug('ReturnUrl almacenado temporalmente', { url });
  }

  /**
   * Obtiene la URL de retorno desde los query params de la URL actual
   *
   * @returns URL de retorno o null si no existe
   */
  private getReturnUrlFromParams(): string | null {
    try {
      const urlTree = this.router.parseUrl(this.router.url);
      const returnUrl = urlTree.queryParams['returnUrl'];

      if (returnUrl) {
        this.logger.debug('ReturnUrl encontrado en query params', { returnUrl });
        return returnUrl;
      }

      return null;
    } catch (error) {
      this.logger.warn('Error obteniendo returnUrl de params', error);
      return null;
    }
  }

  /**
   * Obtiene la URL actual sin query params
   */
  getCurrentPath(): string {
    const urlTree = this.router.parseUrl(this.router.url);
    return urlTree.root.children['primary']?.segments.map(s => s.path).join('/') || '';
  }

  /**
   * Verifica si la ruta actual es una ruta específica
   *
   * @param path Ruta a verificar
   * @returns true si la ruta actual coincide
   */
  isCurrentRoute(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(`${path}?`);
  }
}
