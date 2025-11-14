// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { NavbarService } from './shared/services/navbar.service';
import { BusinessInfoService } from './admin/services/business-info.service';

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

  /**
   * Carga la información de la empresa al iniciar la aplicación
   * Esto permite que el título de la página use el nombre dinámico
   */
  async ngOnInit() {
    // Cargar información de la empresa para el título dinámico
    await this.businessInfoService.getBusinessInfo();
  }
}