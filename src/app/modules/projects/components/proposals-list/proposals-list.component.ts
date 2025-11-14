// src/app/modules/projects/components/proposals-list/proposals-list.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
import { Proposal, ProposalFilters, ProposalSort, ProposalStatus } from '../../models';

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
export class ProposalsListComponent implements OnInit {
  private proposalsService = inject(ProposalsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

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

  constructor() {}

  async ngOnInit() {
    await this.loadData();
  }

  /**
   * Cargar datos iniciales
   */
  async loadData() {
    try {
      console.log('📂 ProposalsListComponent.loadData() - Iniciando...');
      await this.proposalsService.initialize();
      console.log('✅ Datos cargados correctamente');
      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
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
    const confirmed = confirm(
      `¿Estás seguro de eliminar el estimado ${proposal.proposalNumber}?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        await this.proposalsService.deleteProposal(proposal.id);
        this.snackBar.open('Estimado eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando proposal:', error);
        this.snackBar.open('Error al eliminar el estimado', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Cambiar estado del proposal
   */
  async changeProposalStatus(proposal: Proposal, newStatus: ProposalStatus) {
    try {
      await this.proposalsService.updateProposalStatus(proposal.id, newStatus);
      this.snackBar.open('Estado actualizado exitosamente', 'Cerrar', { duration: 3000 });
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cambiando estado del proposal:', error);
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Convertir a factura
   */
  async convertToInvoice(proposal: Proposal) {
    const confirmed = confirm(
      `¿Convertir el estimado ${proposal.proposalNumber} a factura?\n\nEsto cambiará el estado del estimado a "Convertido a Factura".`
    );

    if (confirmed) {
      try {
        const invoiceId = await this.proposalsService.convertToInvoice(proposal.id);
        this.snackBar.open(`Estimado convertido a factura exitosamente`, 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error convirtiendo a factura:', error);
        this.snackBar.open('Error al convertir a factura', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Refrescar lista
   */
  async refresh() {
    try {
      await this.proposalsService.refresh();
      this.snackBar.open('Lista actualizada', 'Cerrar', { duration: 2000 });
    } catch (error) {
      console.error('Error refrescando lista:', error);
      this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
    }
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
  getStatusLabel(status: ProposalStatus): string {
    const labels: Record<ProposalStatus, string> = {
      draft: 'Borrador',
      sent: 'Enviado',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      converted_to_invoice: 'Facturado',
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
      cancelled: 'badge-status-cancelled'
    };
    return classes[status] || 'badge-status-draft';
  }
}
