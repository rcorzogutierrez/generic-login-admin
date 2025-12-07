import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { TreasuryService } from '../../services/treasury.service';
import { Cobro, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS, PaymentMethod } from '../../models';
import { CobroFormDialogComponent } from '../cobro-form-dialog/cobro-form-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cobros-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="cobros-list-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" matTooltip="Volver">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <div class="icon-container">
              <mat-icon>savings</mat-icon>
            </div>
            <div>
              <h1>Cobros</h1>
              <p class="subtitle">{{ filteredCobros().length }} registros</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openFormDialog()">
            <mat-icon>add</mat-icon>
            Nuevo Cobro
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchTerm" placeholder="Cliente, factura, número de cheque...">
          @if (searchTerm()) {
            <button matSuffix mat-icon-button (click)="searchTerm.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Método de pago</mat-label>
          <mat-select [(ngModel)]="filterMethod">
            <mat-option value="all">Todos</mat-option>
            @for (method of paymentMethods; track method.value) {
              <mat-option [value]="method.value">{{ method.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Stats Summary -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="summary-label">Total:</span>
          <span class="summary-value">{{ totalAmount() | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Registros:</span>
          <span class="summary-value">{{ filteredCobros().length }}</span>
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (filteredCobros().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <mat-icon>savings</mat-icon>
          <h3>No hay cobros registrados</h3>
          <p>Registra tu primer cobro haciendo clic en el botón "Nuevo Cobro"</p>
          <button mat-raised-button color="primary" (click)="openFormDialog()">
            <mat-icon>add</mat-icon>
            Registrar Cobro
          </button>
        </div>
      } @else {
        <!-- List -->
        <div class="cobros-grid">
          @for (cobro of paginatedCobros(); track cobro.id) {
            <div class="cobro-card">
              <div class="card-header">
                <div class="payment-type">
                  <div class="type-icon">
                    <mat-icon>{{ getPaymentIcon(cobro.paymentMethod) }}</mat-icon>
                  </div>
                  <mat-chip class="method-chip">{{ getPaymentLabel(cobro.paymentMethod) }}</mat-chip>
                </div>
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openFormDialog(cobro)">
                    <mat-icon>edit</mat-icon>
                    <span>Editar</span>
                  </button>
                  @if (cobro.checkImageUrl) {
                    <button mat-menu-item (click)="viewImage(cobro)">
                      <mat-icon>image</mat-icon>
                      <span>Ver imagen</span>
                    </button>
                  }
                  <mat-divider></mat-divider>
                  <button mat-menu-item class="delete-option" (click)="confirmDelete(cobro)">
                    <mat-icon>delete</mat-icon>
                    <span>Eliminar</span>
                  </button>
                </mat-menu>
              </div>

              <div class="card-body">
                <div class="amount-section">
                  <span class="amount">{{ cobro.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                  <span class="date">{{ cobro.transactionDate?.toDate() | date:'dd/MM/yyyy' }}</span>
                </div>

                <div class="details-section">
                  <div class="detail-row">
                    <mat-icon>business</mat-icon>
                    <span>{{ cobro.clientName }}</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>receipt</mat-icon>
                    <span>{{ cobro.proposalNumber }}</span>
                  </div>
                  @if (cobro.checkNumber) {
                    <div class="detail-row">
                      <mat-icon>tag</mat-icon>
                      <span>Cheque #{{ cobro.checkNumber }}</span>
                    </div>
                  }
                  @if (cobro.bankName) {
                    <div class="detail-row">
                      <mat-icon>account_balance</mat-icon>
                      <span>{{ cobro.bankName }}</span>
                    </div>
                  }
                  @if (cobro.referenceNumber) {
                    <div class="detail-row">
                      <mat-icon>confirmation_number</mat-icon>
                      <span>Ref: {{ cobro.referenceNumber }}</span>
                    </div>
                  }
                </div>

                @if (cobro.notes) {
                  <div class="notes-section">
                    <p>{{ cobro.notes }}</p>
                  </div>
                }
              </div>

              @if (cobro.checkImageUrl) {
                <div class="card-footer">
                  <mat-icon>image</mat-icon>
                  <span>Imagen adjunta</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button mat-icon-button [disabled]="currentPage() === 0" (click)="currentPage.set(currentPage() - 1)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="page-info">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
            <button mat-icon-button [disabled]="currentPage() >= totalPages() - 1" (click)="currentPage.set(currentPage() + 1)">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .cobros-list-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon-container {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-container mat-icon {
      color: white;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
    }

    .subtitle {
      margin: 0;
      color: #64748b;
      font-size: 0.85rem;
    }

    .filters-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .search-field {
      flex: 1;
      min-width: 250px;
    }

    .filter-field {
      min-width: 180px;
    }

    .summary-bar {
      display: flex;
      gap: 2rem;
      padding: 1rem 1.5rem;
      background: #f8fafc;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }

    .summary-item {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .summary-label {
      color: #64748b;
      font-size: 0.9rem;
    }

    .summary-value {
      font-weight: 600;
      color: #1e293b;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 4rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #f8fafc;
      border-radius: 16px;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #cbd5e1;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem;
      color: #475569;
    }

    .empty-state p {
      color: #64748b;
      margin-bottom: 1.5rem;
    }

    .cobros-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .cobro-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .cobro-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.75rem;
    }

    .payment-type {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .type-icon {
      width: 36px;
      height: 36px;
      background: #dcfce7;
      color: #16a34a;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .method-chip {
      font-size: 0.75rem;
    }

    .card-body {
      padding: 0 1rem 1rem;
    }

    .amount-section {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .amount {
      font-size: 1.5rem;
      font-weight: 700;
      color: #16a34a;
    }

    .date {
      font-size: 0.85rem;
      color: #64748b;
    }

    .details-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.9rem;
    }

    .detail-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    .notes-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    .notes-section p {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
      font-style: italic;
    }

    .card-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.8rem;
    }

    .card-footer mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .delete-option {
      color: #dc2626;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
    }

    .page-info {
      color: #64748b;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .cobros-list-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions button {
        width: 100%;
      }

      .cobros-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CobrosListComponent implements OnInit {
  private treasuryService = inject(TreasuryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  isLoading = this.treasuryService.isLoading;
  cobros = this.treasuryService.activeCobros;

  searchTerm = signal<string>('');
  filterMethod = signal<string>('all');
  currentPage = signal<number>(0);
  itemsPerPage = 12;

  paymentMethods = [
    { value: 'check', label: PAYMENT_METHOD_LABELS.check },
    { value: 'transfer', label: PAYMENT_METHOD_LABELS.transfer },
    { value: 'cash', label: PAYMENT_METHOD_LABELS.cash }
  ];

  filteredCobros = computed(() => {
    let result = this.cobros();
    const search = this.searchTerm().toLowerCase();
    const method = this.filterMethod();

    if (search) {
      result = result.filter(c =>
        c.clientName?.toLowerCase().includes(search) ||
        c.proposalNumber?.toLowerCase().includes(search) ||
        c.checkNumber?.toLowerCase().includes(search) ||
        c.referenceNumber?.toLowerCase().includes(search)
      );
    }

    if (method !== 'all') {
      result = result.filter(c => c.paymentMethod === method);
    }

    return result;
  });

  paginatedCobros = computed(() => {
    const start = this.currentPage() * this.itemsPerPage;
    return this.filteredCobros().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredCobros().length / this.itemsPerPage)
  );

  totalAmount = computed(() =>
    this.filteredCobros().reduce((sum, c) => sum + (c.amount || 0), 0)
  );

  async ngOnInit(): Promise<void> {
    await this.treasuryService.initialize();

    // Check if we should open dialog
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openFormDialog();
      }
    });
  }

  getPaymentIcon(method: string): string {
    return PAYMENT_METHOD_ICONS[method as PaymentMethod] || 'payment';
  }

  getPaymentLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod] || method;
  }

  goBack(): void {
    this.router.navigate(['/modules/treasury']);
  }

  openFormDialog(cobro?: Cobro): void {
    const dialogRef = this.dialog.open(CobroFormDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { cobro }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.treasuryService.forceReload();
        this.snackBar.open(
          cobro ? 'Cobro actualizado correctamente' : 'Cobro registrado correctamente',
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  viewImage(cobro: Cobro): void {
    if (cobro.checkImageUrl) {
      window.open(cobro.checkImageUrl, '_blank');
    }
  }

  confirmDelete(cobro: Cobro): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar Cobro',
        message: `¿Estás seguro de eliminar el cobro de ${cobro.clientName} por ${cobro.amount}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(async confirmed => {
      if (confirmed) {
        try {
          await this.treasuryService.deleteCobro(cobro.id);
          this.snackBar.open('Cobro eliminado correctamente', 'OK', { duration: 3000 });
        } catch (error) {
          this.snackBar.open('Error al eliminar el cobro', 'OK', { duration: 3000 });
        }
      }
    });
  }
}
