// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { NavbarService } from './shared/services/navbar.service';
import { BusinessInfoService } from './admin/services/business-info.service';
import { AppConfigService } from './core/services/app-config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    @if (navbarService.showNavbar()) {
      <app-navbar />
    }
    <router-outlet />
    @if (navbarService.showNavbar()) {
      <footer class="bg-slate-800 p-6 mt-8 border-t border-slate-700">
        <div class="max-w-[1400px] mx-auto text-center">
          <p class="text-sm text-slate-300 font-medium">
            {{ appConfigService.footerText() }}
          </p>
        </div>
      </footer>
    }
  `,
})
export class AppComponent implements OnInit {
  public navbarService = inject(NavbarService);
  public appConfigService = inject(AppConfigService);
  private businessInfoService = inject(BusinessInfoService);

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