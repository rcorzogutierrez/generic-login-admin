// src/app/modules/projects/components/proposal-view/proposal-view.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';

// Services
import { ProposalsService } from '../../services/proposals.service';
import { BusinessInfoService } from '../../../../admin/services/business-info.service';

// Models
import { Proposal, ProposalStatus } from '../../models';

@Component({
  selector: 'app-proposal-view',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule
  ],
  templateUrl: './proposal-view.component.html',
  styleUrl: './proposal-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalViewComponent implements OnInit {
  private proposalsService = inject(ProposalsService);
  private businessInfoService = inject(BusinessInfoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  // Signals
  proposal = signal<Proposal | null>(null);
  isLoading = signal<boolean>(false);
  businessInfo = this.businessInfoService.businessInfo;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await Promise.all([
        this.loadProposal(id),
        this.businessInfoService.getBusinessInfo()
      ]);
    }
  }

  /**
   * Cargar proposal
   */
  async loadProposal(id: string) {
    try {
      this.isLoading.set(true);
      const proposal = await this.proposalsService.getProposalById(id);
      if (proposal) {
        this.proposal.set(proposal);
      } else {
        this.snackBar.open('Estimado no encontrado', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/projects']);
      }
    } catch (error) {
      console.error('Error cargando proposal:', error);
      this.snackBar.open('Error al cargar el estimado', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Editar proposal
   */
  editProposal() {
    const proposal = this.proposal();
    if (proposal) {
      this.router.navigate(['/modules/projects', proposal.id, 'edit']);
    }
  }

  /**
   * Cambiar estado
   */
  async changeStatus(newStatus: ProposalStatus) {
    const proposal = this.proposal();
    if (!proposal) return;

    try {
      await this.proposalsService.updateProposalStatus(proposal.id, newStatus);
      await this.loadProposal(proposal.id);
      this.snackBar.open('Estado actualizado exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      this.snackBar.open('Error al actualizar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Convertir a factura
   */
  async convertToInvoice() {
    const proposal = this.proposal();
    if (!proposal) return;

    const confirmed = confirm(
      `¿Convertir el estimado ${proposal.proposalNumber} a factura?\n\nEsto cambiará el estado del estimado a "Convertido a Factura".`
    );

    if (confirmed) {
      try {
        await this.proposalsService.convertToInvoice(proposal.id);
        await this.loadProposal(proposal.id);
        this.snackBar.open('Estimado convertido a factura exitosamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error convirtiendo a factura:', error);
        this.snackBar.open('Error al convertir a factura', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Eliminar proposal
   */
  async deleteProposal() {
    const proposal = this.proposal();
    if (!proposal) return;

    const confirmed = confirm(
      `¿Estás seguro de eliminar el estimado ${proposal.proposalNumber}?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        await this.proposalsService.deleteProposal(proposal.id);
        this.snackBar.open('Estimado eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/modules/projects']);
      } catch (error) {
        console.error('Error eliminando proposal:', error);
        this.snackBar.open('Error al eliminar el estimado', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Volver a la lista
   */
  back() {
    this.router.navigate(['/modules/projects']);
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
      month: 'long',
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

  /**
   * Imprimir o generar PDF
   */
  print() {
    window.print();
  }
}
