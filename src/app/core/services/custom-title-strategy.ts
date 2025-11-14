// src/app/core/services/custom-title-strategy.ts
import { Injectable, inject, effect } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BusinessInfoService } from '../../admin/services/business-info.service';
import { AppConfigService } from './app-config.service';

/**
 * Estrategia personalizada para títulos de página
 *
 * Obtiene el nombre dinámicamente desde Firebase con fallback en cascada:
 * 1. businessInfo.businessName (nombre de la empresa)
 * 2. appConfig.appName (nombre de la aplicación)
 * 3. "MiApp" (fallback final)
 *
 * Formato: "[Nombre] | [Título de la Ruta]"
 *
 * @example
 * Si businessName = "Acme Corp"
 * Ruta con title: 'Dashboard' → Se muestra: "Acme Corp | Dashboard"
 *
 * Si no hay businessName pero appName = "Generic Admin Login"
 * Ruta con title: 'Dashboard' → Se muestra: "Generic Admin Login | Dashboard"
 *
 * El título se actualiza automáticamente cuando cambian los datos
 */
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly businessInfoService = inject(BusinessInfoService);
  private readonly appConfigService = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly fallbackName = 'MiApp';
  private currentRouteTitle: string | undefined;

  constructor() {
    super();

    // Efecto reactivo: actualiza el título cuando cambia businessInfo o appConfig
    effect(() => {
      const businessInfo = this.businessInfoService.businessInfo();
      const appConfig = this.appConfigService.appName();

      // Cascada de fallbacks: businessName → appName → fallback
      const appName = businessInfo?.businessName || appConfig || this.fallbackName;

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

    // Obtener el nombre con cascada de fallbacks
    const businessInfo = this.businessInfoService.businessInfo();
    const appConfig = this.appConfigService.appName();
    const appName = businessInfo?.businessName || appConfig || this.fallbackName;

    if (routeTitle) {
      this.title.setTitle(`${appName} | ${routeTitle}`);
    } else {
      this.title.setTitle(appName);
    }
  }
}
