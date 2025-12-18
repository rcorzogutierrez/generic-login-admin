import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { TreasuryService } from '../../services/treasury.service';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '../../models';

@Component({
  selector: 'app-treasury-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatIconModule
  ],
  template: `
    <div class="treasury-dashboard">
      <!-- Header Compacto -->
      <header class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <div class="header-icon-box teal">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <div>
              <h1 class="text-lg font-bold text-slate-800 m-0">Tesorería</h1>
              <p class="text-xs text-slate-500 m-0">Gestión de cobros y pagos</p>
            </div>
          </div>
        </div>
      </header>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-container">
          <div class="spinner teal"></div>
          <p>Cargando datos...</p>
        </div>
      } @else {
        <!-- Stats Cards -->
        <div class="stats-grid">
          <!-- Total Cobros -->
          <div class="stat-card cobros">
            <div class="stat-icon">
              <mat-icon>arrow_downward</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Total Cobros</span>
              <span class="stat-value">{{ stats().sumaCobros | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="stat-count">{{ stats().totalCobros }} registros</span>
            </div>
          </div>

          <!-- Total Pagos -->
          <div class="stat-card pagos">
            <div class="stat-icon">
              <mat-icon>arrow_upward</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Total Pagos</span>
              <span class="stat-value">{{ stats().sumaPagos | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="stat-count">{{ stats().totalPagos }} registros</span>
            </div>
          </div>

          <!-- Balance -->
          <div class="stat-card balance" [class.positive]="stats().balance >= 0" [class.negative]="stats().balance < 0">
            <div class="stat-icon">
              <mat-icon>{{ stats().balance >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Balance</span>
              <span class="stat-value">{{ stats().balance | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="stat-count">Cobros - Pagos</span>
            </div>
          </div>

          <!-- Este Mes -->
          <div class="stat-card month">
            <div class="stat-icon">
              <mat-icon>calendar_month</mat-icon>
            </div>
            <div class="stat-content">
              <span class="stat-label">Este Mes</span>
              <span class="stat-value positive-text">+{{ stats().cobrosEsteMes | currency:'USD':'symbol':'1.2-2' }}</span>
              <span class="stat-value negative-text">-{{ stats().pagosEsteMes | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="sections-grid">
          <!-- Cobros Section -->
          <div class="section-card cobros-section">
            <div class="section-header">
              <div class="section-title">
                <div class="section-icon-box emerald">
                  <mat-icon>savings</mat-icon>
                </div>
                <h2>Cobros</h2>
              </div>
              <button class="btn-primary emerald" (click)="goToCobros()">
                <mat-icon>visibility</mat-icon>
                Ver todos
              </button>
            </div>
            <div class="divider"></div>
            <div class="section-content">
              <p class="section-description">
                Registra los pagos recibidos de clientes por proyectos completados.
              </p>
              <div class="action-buttons">
                <button class="btn-outline emerald" (click)="goToCobros('new')">
                  <mat-icon>add</mat-icon>
                  Registrar Cobro
                </button>
              </div>
            </div>

            <!-- Recent Cobros -->
            @if (recentCobros().length > 0) {
              <div class="divider"></div>
              <div class="recent-list">
                <h3>Últimos cobros</h3>
                @for (cobro of recentCobros(); track cobro.id) {
                  <div class="recent-item">
                    <div class="item-icon cobros">
                      <mat-icon>{{ getPaymentIcon(cobro.paymentMethod) }}</mat-icon>
                    </div>
                    <div class="item-details">
                      <span class="item-title">{{ cobro.clientName }}</span>
                      <span class="item-subtitle">{{ cobro.proposalNumber }}</span>
                    </div>
                    <span class="item-amount positive">
                      +{{ cobro.amount | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Pagos Section -->
          <div class="section-card pagos-section">
            <div class="section-header">
              <div class="section-title">
                <div class="section-icon-box red">
                  <mat-icon>payments</mat-icon>
                </div>
                <h2>Pagos</h2>
              </div>
              <button class="btn-primary red" (click)="goToPagos()">
                <mat-icon>visibility</mat-icon>
                Ver todos
              </button>
            </div>
            <div class="divider"></div>
            <div class="section-content">
              <p class="section-description">
                Registra los pagos realizados a trabajadores por proyectos completados.
              </p>
              <div class="action-buttons">
                <button class="btn-outline red" (click)="goToPagos('new')">
                  <mat-icon>add</mat-icon>
                  Registrar Pago
                </button>
              </div>
            </div>

            <!-- Recent Pagos -->
            @if (recentPagos().length > 0) {
              <div class="divider"></div>
              <div class="recent-list">
                <h3>Últimos pagos</h3>
                @for (pago of recentPagos(); track pago.id) {
                  <div class="recent-item">
                    <div class="item-icon pagos">
                      <mat-icon>{{ getPaymentIcon(pago.paymentMethod) }}</mat-icon>
                    </div>
                    <div class="item-details">
                      <span class="item-title">{{ pago.workerName }}</span>
                      <span class="item-subtitle">{{ pago.proposalNumbers.join(', ') }}</span>
                    </div>
                    <span class="item-amount negative">
                      -{{ pago.amount | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .treasury-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header Icon Box */
    .header-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-icon-box mat-icon {
      color: white;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .header-icon-box.teal {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
    }

    /* Loading Spinner */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1rem;
      color: #64748b;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner.teal {
      border-top-color: #14b8a6;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Section Icon Box */
    .section-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .section-icon-box mat-icon {
      color: white;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .section-icon-box.emerald {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .section-icon-box.red {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    /* Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      color: white;
      transition: all 0.15s ease;
    }

    .btn-primary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-primary.emerald {
      background: #10b981;
    }

    .btn-primary.emerald:hover {
      background: #059669;
    }

    .btn-primary.red {
      background: #ef4444;
    }

    .btn-primary.red:hover {
      background: #dc2626;
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      transition: all 0.15s ease;
    }

    .btn-outline mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-outline.emerald {
      border: 1px solid #10b981;
      color: #10b981;
    }

    .btn-outline.emerald:hover {
      background: #ecfdf5;
    }

    .btn-outline.red {
      border: 1px solid #ef4444;
      color: #ef4444;
    }

    .btn-outline.red:hover {
      background: #fef2f2;
    }

    /* Divider */
    .divider {
      height: 1px;
      background: #e2e8f0;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stat-card.cobros .stat-icon {
      background: #dcfce7;
      color: #16a34a;
    }

    .stat-card.pagos .stat-icon {
      background: #fee2e2;
      color: #dc2626;
    }

    .stat-card.balance .stat-icon {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .stat-card.balance.positive .stat-icon {
      background: #dcfce7;
      color: #16a34a;
    }

    .stat-card.balance.negative .stat-icon {
      background: #fee2e2;
      color: #dc2626;
    }

    .stat-card.month .stat-icon {
      background: #fef3c7;
      color: #d97706;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
    }

    .stat-count {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .positive-text {
      color: #16a34a !important;
      font-size: 1rem !important;
    }

    .negative-text {
      color: #dc2626 !important;
      font-size: 1rem !important;
    }

    /* Sections Grid */
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .section-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .section-title h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
    }

    .section-content {
      padding: 1.5rem;
    }

    .section-description {
      color: #64748b;
      margin: 0 0 1.25rem;
      line-height: 1.6;
    }

    .action-buttons {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    /* Recent List */
    .recent-list {
      padding: 1rem 1.5rem 1.5rem;
    }

    .recent-list h3 {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .recent-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .recent-item:last-child {
      border-bottom: none;
    }

    .item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item-icon mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .item-icon.cobros {
      background: #dcfce7;
      color: #16a34a;
    }

    .item-icon.pagos {
      background: #fee2e2;
      color: #dc2626;
    }

    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-weight: 500;
      color: #1e293b;
    }

    .item-subtitle {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .item-amount {
      font-weight: 600;
    }

    .item-amount.positive {
      color: #16a34a;
    }

    .item-amount.negative {
      color: #dc2626;
    }

    @media (max-width: 768px) {
      .treasury-dashboard {
        padding: 1rem;
      }

      .sections-grid {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .stat-value {
        font-size: 1.25rem;
      }
    }
  `]
})
export class TreasuryDashboardComponent implements OnInit {
  private treasuryService = inject(TreasuryService);
  private router = inject(Router);

  isLoading = this.treasuryService.isLoading;
  stats = this.treasuryService.stats;
  cobros = this.treasuryService.activeCobros;
  pagos = this.treasuryService.activePagos;

  // Recent items (last 5)
  recentCobros = computed(() => this.cobros().slice(0, 5));
  recentPagos = computed(() => this.pagos().slice(0, 5));

  paymentMethodLabels = PAYMENT_METHOD_LABELS;
  paymentMethodIcons = PAYMENT_METHOD_ICONS;

  async ngOnInit(): Promise<void> {
    await this.treasuryService.initialize();
  }

  getPaymentIcon(method: string): string {
    return this.paymentMethodIcons[method as keyof typeof this.paymentMethodIcons] || 'payment';
  }

  goToCobros(action?: string): void {
    if (action === 'new') {
      this.router.navigate(['/modules/treasury/cobros'], { queryParams: { action: 'new' } });
    } else {
      this.router.navigate(['/modules/treasury/cobros']);
    }
  }

  goToPagos(action?: string): void {
    if (action === 'new') {
      this.router.navigate(['/modules/treasury/pagos'], { queryParams: { action: 'new' } });
    } else {
      this.router.navigate(['/modules/treasury/pagos']);
    }
  }
}
