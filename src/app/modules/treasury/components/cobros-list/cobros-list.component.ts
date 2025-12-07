import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <button
            mat-icon-button
            (click)="goBack()"
            matTooltip="Volver"
            class="!text-slate-500 hover:!bg-slate-100">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <mat-icon class="text-white !text-2xl">savings</mat-icon>
          </div>
          <div>
            <h1 class="text-xl md:text-2xl font-bold text-slate-800 m-0">Cobros</h1>
            <p class="text-sm text-slate-500 m-0">{{ filteredCobros().length }} registros</p>
          </div>
        </div>
        <button
          mat-raised-button
          (click)="openFormDialog()"
          class="!bg-emerald-600 !text-white hover:!bg-emerald-700 !rounded-xl !px-6 !h-11">
          <mat-icon class="mr-1">add</mat-icon>
          Nuevo Cobro
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="flex-1 relative">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-xl">search</mat-icon>
          <input
            type="text"
            [(ngModel)]="searchTermValue"
            (ngModelChange)="searchTerm.set($event)"
            placeholder="Buscar cliente, factura, número de cheque..."
            class="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-colors bg-white">
          @if (searchTerm()) {
            <button
              (click)="searchTerm.set(''); searchTermValue = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <mat-icon class="!text-xl">close</mat-icon>
            </button>
          }
        </div>
        <select
          [(ngModel)]="filterMethodValue"
          (ngModelChange)="filterMethod.set($event)"
          class="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-colors bg-white min-w-[160px]">
          <option value="all">Todos los métodos</option>
          @for (method of paymentMethods; track method.value) {
            <option [value]="method.value">{{ method.label }}</option>
          }
        </select>
      </div>

      <!-- Summary Bar -->
      <div class="flex flex-wrap gap-4 md:gap-8 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 mb-6">
        <div class="flex items-center gap-2">
          <span class="text-slate-500 text-sm">Total:</span>
          <span class="font-bold text-emerald-600 text-lg">{{ totalAmount() | currency:'USD':'symbol':'1.2-2' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-500 text-sm">Registros:</span>
          <span class="font-semibold text-slate-700">{{ filteredCobros().length }}</span>
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <p class="mt-4 text-slate-500">Cargando cobros...</p>
        </div>
      } @else if (filteredCobros().length === 0) {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 rounded-2xl">
          <div class="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <mat-icon class="!text-5xl text-slate-300">savings</mat-icon>
          </div>
          <h3 class="text-lg font-semibold text-slate-600 mb-2">No hay cobros registrados</h3>
          <p class="text-slate-500 text-center mb-6">Registra tu primer cobro haciendo clic en el botón "Nuevo Cobro"</p>
          <button
            mat-raised-button
            (click)="openFormDialog()"
            class="!bg-emerald-600 !text-white hover:!bg-emerald-700 !rounded-xl !px-6">
            <mat-icon class="mr-1">add</mat-icon>
            Registrar Cobro
          </button>
        </div>
      } @else {
        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (cobro of paginatedCobros(); track cobro.id) {
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200 group">
              <!-- Card Header -->
              <div class="flex items-center justify-between p-4 pb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                       [class]="getMethodBgClass(cobro.paymentMethod)">
                    <mat-icon [class]="getMethodIconClass(cobro.paymentMethod)">{{ getPaymentIcon(cobro.paymentMethod) }}</mat-icon>
                  </div>
                  <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                    {{ getPaymentLabel(cobro.paymentMethod) }}
                  </span>
                </div>
                <button mat-icon-button [matMenuTriggerFor]="menu" class="!text-slate-400 group-hover:!text-slate-600">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openFormDialog(cobro)">
                    <mat-icon class="text-slate-500">edit</mat-icon>
                    <span>Editar</span>
                  </button>
                  @if (cobro.checkImageUrl) {
                    <button mat-menu-item (click)="viewImage(cobro)">
                      <mat-icon class="text-slate-500">image</mat-icon>
                      <span>Ver imagen</span>
                    </button>
                  }
                  <button mat-menu-item (click)="confirmDelete(cobro)" class="!text-red-600">
                    <mat-icon class="!text-red-600">delete</mat-icon>
                    <span>Eliminar</span>
                  </button>
                </mat-menu>
              </div>

              <!-- Card Body -->
              <div class="px-4 pb-4">
                <!-- Amount & Date -->
                <div class="flex items-baseline justify-between mb-4 pb-3 border-b border-slate-100">
                  <span class="text-2xl font-bold text-emerald-600">{{ cobro.amount | currency:'USD':'symbol':'1.2-2' }}</span>
                  <span class="text-sm text-slate-500">{{ cobro.transactionDate.toDate() | date:'dd/MM/yyyy' }}</span>
                </div>

                <!-- Details -->
                <div class="space-y-2">
                  <div class="flex items-center gap-2 text-sm">
                    <mat-icon class="!text-lg text-slate-400">business</mat-icon>
                    <span class="text-slate-700 font-medium truncate">{{ cobro.clientName }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm">
                    <mat-icon class="!text-lg text-slate-400">receipt</mat-icon>
                    <span class="text-slate-600">{{ cobro.proposalNumber }}</span>
                  </div>
                  @if (cobro.checkNumber) {
                    <div class="flex items-center gap-2 text-sm">
                      <mat-icon class="!text-lg text-slate-400">tag</mat-icon>
                      <span class="text-slate-600">Cheque #{{ cobro.checkNumber }}</span>
                    </div>
                  }
                  @if (cobro.bankName) {
                    <div class="flex items-center gap-2 text-sm">
                      <mat-icon class="!text-lg text-slate-400">account_balance</mat-icon>
                      <span class="text-slate-600">{{ cobro.bankName }}</span>
                    </div>
                  }
                  @if (cobro.referenceNumber) {
                    <div class="flex items-center gap-2 text-sm">
                      <mat-icon class="!text-lg text-slate-400">confirmation_number</mat-icon>
                      <span class="text-slate-600">Ref: {{ cobro.referenceNumber }}</span>
                    </div>
                  }
                </div>

                <!-- Notes -->
                @if (cobro.notes) {
                  <div class="mt-3 pt-3 border-t border-slate-100">
                    <p class="text-sm text-slate-500 italic line-clamp-2">{{ cobro.notes }}</p>
                  </div>
                }
              </div>

              <!-- Card Footer (Image indicator) -->
              @if (cobro.checkImageUrl) {
                <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-500 text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                     (click)="viewImage(cobro)">
                  <mat-icon class="!text-base">image</mat-icon>
                  <span>Imagen adjunta</span>
                  <mat-icon class="!text-base ml-auto">open_in_new</mat-icon>
                </div>
              }
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-center gap-3 mt-8">
            <button
              mat-icon-button
              [disabled]="currentPage() === 0"
              (click)="currentPage.set(currentPage() - 1)"
              class="!border !border-slate-200 !rounded-xl disabled:!opacity-50">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span class="text-sm text-slate-600 px-4">
              Página {{ currentPage() + 1 }} de {{ totalPages() }}
            </span>
            <button
              mat-icon-button
              [disabled]="currentPage() >= totalPages() - 1"
              (click)="currentPage.set(currentPage() + 1)"
              class="!border !border-slate-200 !rounded-xl disabled:!opacity-50">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
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
  searchTermValue = '';
  filterMethod = signal<string>('all');
  filterMethodValue = 'all';
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

  getMethodBgClass(method: string): string {
    switch (method) {
      case 'check': return 'bg-emerald-100';
      case 'transfer': return 'bg-blue-100';
      case 'cash': return 'bg-amber-100';
      default: return 'bg-slate-100';
    }
  }

  getMethodIconClass(method: string): string {
    switch (method) {
      case 'check': return '!text-emerald-600';
      case 'transfer': return '!text-blue-600';
      case 'cash': return '!text-amber-600';
      default: return '!text-slate-600';
    }
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
