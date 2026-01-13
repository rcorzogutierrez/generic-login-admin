// src/app/core/layout/layout.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { SidebarService } from './services/sidebar.service';
import { AppConfigService } from '../services/app-config.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent
  ],
  template: `
    <!-- Sidebar -->
    <app-sidebar />

    <!-- Main Content Area -->
    <div
      class="main-wrapper"
      [class.sidebar-collapsed]="sidebarService.isCollapsed() && !sidebarService.isMobile()"
      [class.sidebar-mobile]="sidebarService.isMobile()">

      <!-- Header -->
      <app-header />

      <!-- Page Content -->
      <main class="main-content">
        <router-outlet />
      </main>

      <!-- Footer -->
      <footer class="main-footer print:hidden" [style.background-color]="appConfigService.footerColor()">
        <div class="footer-content">
          <p class="footer-text" [style.color]="appConfigService.footerTextColor()">
            {{ appConfigService.footerText() }}
          </p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f8fafc;
    }

    /* ============================================
       MAIN WRAPPER
       ============================================ */
    .main-wrapper {
      margin-left: 260px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .main-wrapper.sidebar-collapsed {
      margin-left: 72px;
    }

    .main-wrapper.sidebar-mobile {
      margin-left: 0;
    }

    /* ============================================
       MAIN CONTENT
       ============================================ */
    .main-content {
      flex: 1;
      padding: 1.5rem;
      max-width: 100%;
      overflow-x: hidden;
    }

    @media (min-width: 1400px) {
      .main-content {
        padding: 2rem;
      }
    }

    @media (max-width: 640px) {
      .main-content {
        padding: 1rem;
      }
    }

    /* ============================================
       FOOTER
       ============================================ */
    .main-footer {
      /* background dinámico desde appConfigService.footerColor() */
      padding: 1.5rem;
      margin-top: auto;
      border-top: 1px solid #334155;
    }

    .footer-content {
      max-width: 1400px;
      margin: 0 auto;
      text-align: center;
    }

    .footer-text {
      font-size: 0.875rem;
      margin: 0;
    }

    /* ============================================
       ESTILOS DE IMPRESIÓN
       ============================================ */
    @media print {
      :host {
        display: block !important;
        background: white !important;
      }

      .main-wrapper,
      .main-wrapper.sidebar-collapsed,
      .main-wrapper.sidebar-mobile {
        margin-left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        display: block !important;
        position: relative !important;
        left: 0 !important;
        right: 0 !important;
        transform: none !important;
      }

      .main-content {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .main-footer {
        display: none !important;
      }
    }
  `]
})
export class LayoutComponent {
  public sidebarService = inject(SidebarService);
  public appConfigService = inject(AppConfigService);
}
