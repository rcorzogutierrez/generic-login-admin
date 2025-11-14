// src/app/core/services/custom-title-strategy.ts
import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Estrategia personalizada para títulos de página
 *
 * Agrega el nombre de la aplicación antes de cada título de ruta
 * Formato: "MiApp | [Título de la Ruta]"
 *
 * @example
 * Ruta con title: 'Dashboard' → Se muestra: "MiApp | Dashboard"
 * Ruta con title: 'Mi Empresa' → Se muestra: "MiApp | Mi Empresa"
 */
@Injectable({ providedIn: 'root' })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly appName = 'MiApp';

  constructor(private readonly title: Title) {
    super();
  }

  /**
   * Actualiza el título de la página con el formato personalizado
   */
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);

    if (routeTitle) {
      this.title.setTitle(`${this.appName} | ${routeTitle}`);
    } else {
      this.title.setTitle(this.appName);
    }
  }
}
