// src/app/app.component.ts
import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BusinessInfoService } from './admin/services/business-info.service';
import { AppConfigService } from './core/services/app-config.service';
import { InactivityService } from './core/services/inactivity.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `<router-outlet />`,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit {
  private appConfigService = inject(AppConfigService);
  private businessInfoService = inject(BusinessInfoService);
  private inactivityService = inject(InactivityService);
  private authService = inject(AuthService);

  constructor() {
    // Monitorear estado de autenticación para controlar inactividad
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();

      if (isAuthenticated) {
        // Usuario autenticado: iniciar monitoreo de inactividad
        this.inactivityService.startMonitoring();
      } else {
        // Usuario no autenticado: detener monitoreo
        this.inactivityService.stopMonitoring();
      }
    });
  }

  /**
   * Carga la configuración inicial al iniciar la aplicación
   * Esto incluye:
   * - Configuración del sistema (appName, logos, etc.)
   * - Información de la empresa (businessName, contacto, etc.)
   */
  async ngOnInit() {
    // Cargar configuración del sistema
    await this.appConfigService.initialize();

    // Cargar información de la empresa
    await this.businessInfoService.getBusinessInfo();
  }
}
