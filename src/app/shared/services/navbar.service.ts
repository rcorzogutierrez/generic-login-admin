// src/app/shared/services/navbar.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavbarService {
  private _showNavbar = signal(false);
  
  readonly showNavbar = this._showNavbar.asReadonly();

  /**
   * Muestra el navbar
   */
  show() {
    this._showNavbar.set(true);
  }

  /**
   * Oculta el navbar
   */
  hide() {
    this._showNavbar.set(false);
  }

  /**
   * Toggle del navbar
   */
  toggle() {
    this._showNavbar.set(!this._showNavbar());
  }
}