// src/app/core/services/custom-title-strategy.ts
import { Injectable, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AppConfigService } from './app-config.service';

/**
 * Estrategia personalizada para títulos de página
 *
 * Obtiene el nombre de la aplicación dinámicamente desde Firebase con fallback:
 * 1. appConfig.appName (nombre de la aplicación)
 * 2. "Mi Aplicación" (fallback final)
 *
 * Formato: "[Nombre App] | [Título de la Ruta]"
 *
 * @example
 * Si appName = "Generic Admin Login"
 * Ruta con title: 'Dashboard' → Se muestra: "Generic Admin Login | Dashboard"
 *
 * Si no hay appName configurado:
 * Ruta con title: 'Dashboard' → Se muestra: "Mi Aplicación | Dashboard"
 *
 * El título se actualiza automáticamente cuando cambia la configuración
 */
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly appConfigService = inject(AppConfigService);
  private readonly fallbackName = 'Mi Aplicación';
  private currentRouteTitle: string | undefined;

  constructor() {
    super();

    // Efecto reactivo: actualiza el título cuando cambia appConfig
    effect(() => {
      const appConfig = this.appConfigService.appName();

      // Usar appName de la configuración o fallback
      const appName = appConfig || this.fallbackName;

      // Actualizar título con el nombre dinámico
      if (this.currentRouteTitle) {
        this.title.setTitle(`${appName} | ${this.currentRouteTitle}`);
      } else {
        this.title.setTitle(appName);
      }
    });
  }

  /**
   * Actualiza el título de la página con el formato personalizado
   */
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.currentRouteTitle = routeTitle;

    // Obtener el nombre de la aplicación con fallback
    const appConfig = this.appConfigService.appName();
    const appName = appConfig || this.fallbackName;

    if (routeTitle) {
      this.title.setTitle(`${appName} | ${routeTitle}`);
    } else {
      this.title.setTitle(appName);
    }
  }
}
