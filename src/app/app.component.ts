// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { NavbarService } from './shared/services/navbar.service';

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
export class AppComponent {
  constructor(public navbarService: NavbarService) {}
}