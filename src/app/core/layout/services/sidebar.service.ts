// src/app/core/layout/services/sidebar.service.ts
import { Injectable, signal, effect } from '@angular/core';

export type SidebarState = 'expanded' | 'collapsed' | 'mobile-open' | 'mobile-closed';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'sidebar_collapsed';
  private readonly MOBILE_BREAKPOINT = 1024;

  // Estado principal del sidebar
  private _isCollapsed = signal(this.loadCollapsedState());
  private _isMobileOpen = signal(false);
  private _isMobile = signal(this.checkIsMobile());

  // Señales públicas de solo lectura
  readonly isCollapsed = this._isCollapsed.asReadonly();
  readonly isMobileOpen = this._isMobileOpen.asReadonly();
  readonly isMobile = this._isMobile.asReadonly();

  // Ancho del sidebar según estado
  readonly sidebarWidth = () => {
    if (this._isMobile()) return 0;
    return this._isCollapsed() ? 72 : 260;
  };

  constructor() {
    // Escuchar cambios de tamaño de ventana
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.handleResize());
    }

    // Persistir estado en localStorage
    effect(() => {
      if (!this._isMobile()) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._isCollapsed()));
      }
    });
  }

  /**
   * Toggle entre expandido y colapsado (desktop)
   */
  toggle(): void {
    if (this._isMobile()) {
      this._isMobileOpen.update(v => !v);
    } else {
      this._isCollapsed.update(v => !v);
    }
  }

  /**
   * Expandir el sidebar
   */
  expand(): void {
    if (this._isMobile()) {
      this._isMobileOpen.set(true);
    } else {
      this._isCollapsed.set(false);
    }
  }

  /**
   * Colapsar el sidebar
   */
  collapse(): void {
    if (this._isMobile()) {
      this._isMobileOpen.set(false);
    } else {
      this._isCollapsed.set(true);
    }
  }

  /**
   * Abrir sidebar en móvil
   */
  openMobile(): void {
    this._isMobileOpen.set(true);
  }

  /**
   * Cerrar sidebar en móvil
   */
  closeMobile(): void {
    this._isMobileOpen.set(false);
  }

  /**
   * Obtener el estado actual del sidebar
   */
  getState(): SidebarState {
    if (this._isMobile()) {
      return this._isMobileOpen() ? 'mobile-open' : 'mobile-closed';
    }
    return this._isCollapsed() ? 'collapsed' : 'expanded';
  }

  private loadCollapsedState(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  }

  private checkIsMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < this.MOBILE_BREAKPOINT;
  }

  private handleResize(): void {
    const wasMobile = this._isMobile();
    const isMobile = this.checkIsMobile();

    this._isMobile.set(isMobile);

    // Si pasamos de mobile a desktop, cerrar el drawer móvil
    if (wasMobile && !isMobile) {
      this._isMobileOpen.set(false);
    }
  }
}
