// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BusinessInfoService } from './admin/services/business-info.service';
import { AppConfigService } from './core/services/app-config.service';

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
