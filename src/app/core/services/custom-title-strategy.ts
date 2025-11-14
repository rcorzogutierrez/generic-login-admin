// src/app/core/services/custom-title-strategy.ts
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BusinessInfoService } from '../../admin/services/business-info.service';

/**
 * Estrategia personalizada para títulos de página
 *
 * Obtiene el nombre de la aplicación dinámicamente desde Firebase
 * y lo agrega antes de cada título de ruta
 * Formato: "[Nombre de Empresa] | [Título de la Ruta]"
 *
 * @example
 * Si businessName = "Mi Empresa"
 * Ruta con title: 'Dashboard' → Se muestra: "Mi Empresa | Dashboard"
 * Ruta con title: 'Mi Empresa' → Se muestra: "Mi Empresa | Mi Empresa"
 *
 * Si no hay nombre en Firebase, usa el fallback "MiApp"
 */
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly businessInfoService = inject(BusinessInfoService);
  private readonly fallbackName = 'MiApp';

  /**
   * Actualiza el título de la página con el formato personalizado
   */
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);

    // Obtener el nombre de la empresa desde el signal
    const businessInfo = this.businessInfoService.businessInfo();
    const appName = businessInfo?.businessName || this.fallbackName;

    if (routeTitle) {
      this.title.setTitle(`${appName} | ${routeTitle}`);
    } else {
      this.title.setTitle(appName);
    }
  }
}
