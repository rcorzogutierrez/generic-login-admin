// src/app/modules/projects/components/proposals-list/proposals-list.component.ts

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter, Subject, takeUntil } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Services
import { ProposalsService } from '../../services/proposals.service';
import { AuthService } from '../../../../core/services/auth.service';

// Models
import { Proposal, ProposalFilters, ProposalSort, ProposalStatus, ProposalStats } from '../../models';

// Shared Components
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericModuleConfig, GenericFieldConfig } from '../../../../shared/models/generic-entity.interface';

@Component({
  selector: 'app-proposals-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatBadgeModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatCheckboxModule
  ],
  templateUrl: './proposals-list.component.html',
  styleUrl: './proposals-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalsListComponent implements OnInit, OnDestroy {
  private proposalsService = inject(ProposalsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  // Signals del servicio
  proposals = this.proposalsService.proposals;
  isLoading = this.proposalsService.isLoading;
  stats = this.proposalsService.stats;

  // Verificar si el usuario es admin
  isAdmin = computed(() => this.authService.authorizedUser()?.role === 'admin');

  // Señales locales
  searchTerm = signal<string>('');
  currentFilter = signal<ProposalFilters>({});
  currentSort = signal<ProposalSort>({ field: 'date', direction: 'desc' });
  selectedProposals = signal<string[]>([]);
  statusFilter = signal<ProposalStatus | 'all'>('all');

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25);

  // Math para templates
  Math = Math;

  // Proposals filtrados y paginados
  filteredProposals = computed(() => {
    const proposals = this.proposals();
    const search = this.searchTerm().toLowerCase();
    const statusFilterValue = this.statusFilter();

    let filtered = proposals;

    // Filtrar por status
    if (statusFilterValue !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilterValue);
    }

    // Filtrar por búsqueda
    if (search) {
      filtered = filtered.filter(proposal =>
        proposal.proposalNumber.toLowerCase().includes(search) ||
        proposal.ownerName.toLowerCase().includes(search) ||
        proposal.address?.toLowerCase().includes(search) ||
        proposal.city?.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  paginatedProposals = computed(() => {
    const proposals = this.filteredProposals();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return proposals.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredProposals().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Estadísticas calculadas dinámicamente basadas en los proposals filtrados
  filteredStats = computed(() => {
    const proposals = this.filteredProposals();

    const stats: ProposalStats = {
      total: proposals.length,
      byStatus: {
        draft: proposals.filter(p => p.status === 'draft').length,
        sent: proposals.filter(p => p.status === 'sent').length,
        approved: proposals.filter(p => p.status === 'approved').length,
        rejected: proposals.filter(p => p.status === 'rejected').length,
        converted_to_invoice: proposals.filter(p => p.status === 'converted_to_invoice').length,
        paid: proposals.filter(p => p.status === 'paid').length,
        cancelled: proposals.filter(p => p.status === 'cancelled').length
      },
      totalValue: proposals.reduce((sum, p) => sum + (p.total || 0), 0),
      averageValue: 0,
      approvalRate: 0
    };

    // Calcular valor promedio
    if (proposals.length > 0) {
      stats.averageValue = stats.totalValue / proposals.length;
    }

    // Calcular tasa de aprobación
    const sentOrApproved = proposals.filter(
      p => ['sent', 'approved', 'converted_to_invoice'].includes(p.status)
    ).length;

    if (sentOrApproved > 0) {
      const approved = proposals.filter(
        p => ['approved', 'converted_to_invoice'].includes(p.status)
      ).length;
      stats.approvalRate = (approved / sentOrApproved) * 100;
    }

    return stats;
  });

  // Configuración para el diálogo de eliminación
  private deleteDialogConfig: GenericModuleConfig = {
    collection: 'proposals',
    entityName: 'Estimado',
    entityNamePlural: 'Estimados',
    fields: [
      {
        name: 'proposalNumber',
        label: 'Número de Estimado',
        type: 'text',
        showInDelete: true
      },
      {
        name: 'ownerName',
        label: 'Cliente',
        type: 'text',
        showInDelete: true
      },
      {
        name: 'address',
        label: 'Dirección del Trabajo',
        type: 'text',
        showInDelete: true
      },
      {
        name: 'total',
        label: 'Total',
        type: 'currency',
        showInDelete: true,
        format: (value: number) => this.formatCurrency(value)
      }
    ] as GenericFieldConfig[],
    deleteDialogFieldsCount: 4
  };

  constructor() {}

  async ngOnInit() {
    await this.loadData();

    // Escuchar eventos de navegación para forzar actualización cuando se vuelve a esta ruta
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        filter((event: NavigationEnd) => event.url === '/modules/projects'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Forzar detección de cambios cuando navegamos de vuelta a la lista
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar datos iniciales
   */
  async loadData() {
    try {

      await this.proposalsService.initialize();

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Refrescar lista manualmente
   */
  async refresh() {
    try {
      await this.proposalsService.reload();
      this.cdr.markForCheck();
      this.snackBar.open('Lista actualizada', 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('❌ Error refrescando datos:', error);
      this.snackBar.open('Error al actualizar la lista', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Buscar proposals
   */
  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  /**
   * Filtrar por status
   */
  filterByStatus(status: ProposalStatus | 'all') {
    this.statusFilter.set(status);
    this.currentPage.set(0);
  }

  /**
   * Ordenar por campo
   */
  sortBy(field: string) {
    const current = this.currentSort();

    if (current.field === field) {
      // Toggle direction
      this.currentSort.set({
        field,
        direction: current.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      this.currentSort.set({ field, direction: 'asc' });
    }

    this.applySort();
  }

  /**
   * Aplicar ordenamiento
   */
  private applySort() {
    const sort = this.currentSort();
    this.proposalsService.loadProposals(this.currentFilter(), sort);
  }

  /**
   * Navegar a crear proposal
   */
  createProposal() {
    this.router.navigate(['/modules/projects/new']);
  }

  /**
   * Abrir configuración del módulo
   */
  openConfig() {
    this.router.navigate(['/modules/projects/config']);
  }

  /**
   * Editar proposal
   */
  editProposal(proposal: Proposal) {
    this.router.navigate(['/modules/projects', proposal.id, 'edit']);
  }

  /**
   * Ver detalles del proposal
   */
  viewProposal(proposal: Proposal) {
    this.router.navigate(['/modules/projects', proposal.id]);
  }

  /**
   * Eliminar proposal
   */
  async deleteProposal(proposal: Proposal) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: proposal,
        config: this.deleteDialogConfig
      },
      width: '600px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        try {
          await this.proposalsService.deleteProposal(proposal.id);

          // Forzar recarga para asegurar actualización de estadísticas
          await this.proposalsService.refresh();

          this.snackBar.open('Estimado eliminado exitosamente', 'Cerrar', { duration: 3000 });
          this.cdr.markForCheck();
        } catch (error) {
          console.error('Error eliminando proposal:', error);
          this.snackBar.open('Error al eliminar el estimado', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  /**
   * Cambiar estado del proposal
   */
  async changeProposalStatus(proposal: Proposal, newStatus: ProposalStatus) {
    try {
      // Validar que el proposal esté completo antes de enviarlo
      if (proposal.status === 'draft' && newStatus === 'sent') {
        const validation = this.validateProposalComplete(proposal);
        if (!validation.isValid) {
          this.snackBar.open(validation.message, 'Cerrar', { duration: 5000 });
          return;
        }
      }

      // Validar que la factura tenga datos completos antes de marcar como pagado
      if (proposal.status === 'converted_to_invoice' && newStatus === 'paid') {
        const validation = this.validateInvoiceComplete(proposal);
        if (!validation.isValid) {
          this.snackBar.open(validation.message, 'Cerrar', { duration: 5000 });
          return;
        }
      }

      await this.proposalsService.updateProposalStatus(proposal.id, newStatus);

      // Forzar recarga de proposals para asegurar actualización de estadísticas
      await this.proposalsService.refresh();

      this.snackBar.open('Estado actualizado exitosamente', 'Cerrar', { duration: 3000 });
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cambiando estado del proposal:', error);
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Validar que el proposal esté completo antes de enviarlo
   */
  private validateProposalComplete(proposal: Proposal): { isValid: boolean; message: string } {
    const errors: string[] = [];

    // Validar que tenga items incluidos
    if (!proposal.includes || proposal.includes.length === 0) {
      errors.push('Debe agregar al menos un item al estimado');
    }

    // Validar que tenga dirección del trabajo
    if (!proposal.address || proposal.address.trim() === '') {
      errors.push('Debe especificar la dirección del trabajo');
    }

    // Validar que tenga ciudad
    if (!proposal.city || proposal.city.trim() === '') {
      errors.push('Debe especificar la ciudad');
    }

    // Validar que tenga un total válido
    if (!proposal.total || proposal.total <= 0) {
      errors.push('El total debe ser mayor a $0');
    }

    // Validar que tenga fecha de validez
    if (!proposal.validUntil) {
      errors.push('Debe especificar la fecha de validez del estimado');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: `No se puede enviar el estimado. Falta completar: ${errors.join(', ')}`
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validar que la factura tenga datos completos antes de marcar como pagado
   */
  private validateInvoiceComplete(proposal: Proposal): { isValid: boolean; message: string } {
    const errors: string[] = [];

    // Validar que tenga fecha de factura
    if (!proposal.invoiceDate) {
      errors.push('Falta la fecha de factura');
    }

    // Validar que tenga fechas de trabajo
    if (!proposal.workStartDate) {
      errors.push('Falta la fecha de inicio del trabajo');
    }

    if (!proposal.workEndDate) {
      errors.push('Falta la fecha de finalización del trabajo');
    }

    // Validar que tenga horas de trabajo
    if (!proposal.workTime || proposal.workTime <= 0) {
      errors.push('Faltan las horas trabajadas');
    }

    // Validar que tenga trabajadores
    if (!proposal.workers || proposal.workers.length === 0) {
      errors.push('Debe agregar al menos un trabajador');
    }

    // Validar que tenga materiales
    if (!proposal.materialsUsed || proposal.materialsUsed.length === 0) {
      errors.push('Debe agregar al menos un material');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: `No se puede marcar como pagado. Por favor, complete los datos de la factura:\n\n${errors.join('\n')}\n\nUse el botón "Editar Datos" en la vista de la factura.`
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Convertir a factura
   */
  async convertToInvoice(proposal: Proposal) {
    // Importar dinámicamente el diálogo de confirmación
    const { ConfirmDialogComponent } = await import('../confirm-dialog/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Convertir a Factura',
        message: `¿Convertir el estimado ${proposal.proposalNumber} a factura?\n\nPodrás agregar materiales, fechas y trabajadores inmediatamente.`,
        confirmText: 'Convertir',
        cancelText: 'Cancelar',
        confirmColor: 'primary',
        icon: 'receipt_long'
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.proposalsService.convertToInvoice(proposal.id);
          this.snackBar.open(`Estimado convertido a factura exitosamente`, 'Cerrar', { duration: 3000 });

          // Navegar a la vista del estimado con query param para abrir diálogo automáticamente
          this.router.navigate(['/modules/projects', proposal.id], {
            queryParams: { openInvoiceDialog: 'true' }
          });

          this.cdr.markForCheck();
        } catch (error) {
          console.error('Error convirtiendo a factura:', error);
          this.snackBar.open('Error al convertir a factura', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  /**
   * Cambiar página
   */
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Seleccionar/deseleccionar proposal
   */
  toggleProposalSelection(proposalId: string) {
    const selected = this.selectedProposals();
    if (selected.includes(proposalId)) {
      this.selectedProposals.set(selected.filter(id => id !== proposalId));
    } else {
      this.selectedProposals.set([...selected, proposalId]);
    }
  }

  /**
   * Seleccionar/deseleccionar todos
   */
  toggleSelectAll() {
    const selected = this.selectedProposals();
    const paginated = this.paginatedProposals();

    if (selected.length === paginated.length) {
      this.selectedProposals.set([]);
    } else {
      this.selectedProposals.set(paginated.map(p => p.id));
    }
  }

  /**
   * Verificar si está seleccionado
   */
  isSelected(proposalId: string): boolean {
    return this.selectedProposals().includes(proposalId);
  }

  /**
   * Verificar si todos están seleccionados
   */
  isAllSelected(): boolean {
    const selected = this.selectedProposals();
    const paginated = this.paginatedProposals();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  /**
   * Verificar si hay selección parcial
   */
  isIndeterminate(): boolean {
    const selected = this.selectedProposals();
    const paginated = this.paginatedProposals();
    return selected.length > 0 && selected.length < paginated.length;
  }

  /**
   * Formatear moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Formatear fecha
   */
  formatDate(timestamp: any): string {
    if (!timestamp) return '-';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  /**
   * Obtener label del status
   */
  getStatusLabel(status: ProposalStatus | 'all'): string {
    if (status === 'all') return 'Todos';
    const labels: Record<ProposalStatus, string> = {
      draft: 'Borrador',
      sent: 'Enviado',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      converted_to_invoice: 'Facturado',
      paid: 'Pagado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  }

  /**
   * Obtener clase de badge del status
   */
  getStatusClass(status: ProposalStatus): string {
    const classes: Record<ProposalStatus, string> = {
      draft: 'badge-status-draft',
      sent: 'badge-status-sent',
      approved: 'badge-status-approved',
      rejected: 'badge-status-rejected',
      converted_to_invoice: 'badge-status-converted',
      paid: 'badge-status-paid',
      cancelled: 'badge-status-cancelled'
    };
    return classes[status] || 'badge-status-draft';
  }
}
