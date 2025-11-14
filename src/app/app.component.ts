// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { NavbarService } from './shared/services/navbar.service';
import { BusinessInfoService } from './admin/services/business-info.service';
import { AppConfigService } from './core/services/app-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    @if (navbarService.showNavbar()) {
      <app-navbar />
    }
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  public navbarService = inject(NavbarService);
  private businessInfoService = inject(BusinessInfoService);
  private appConfigService = inject(AppConfigService);

  /**
   * Carga la configuración inicial al iniciar la aplicación
   * Esto incluye:
   * - Configuración del sistema (appName, logos, etc.)
   * - Información de la empresa (businessName, contacto, etc.)
   *
   * Ambos se usan para el título dinámico de la página con fallback en cascada
   */
  async ngOnInit() {
    // Cargar configuración del sistema
    await this.appConfigService.initialize();

    // Cargar información de la empresa
    await this.businessInfoService.getBusinessInfo();
  }
}