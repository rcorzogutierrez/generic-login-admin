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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

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
    MatMenuModule,
    MatDialogModule,
    MatSlideToggleModule
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
  private dialog = inject(MatDialog);

  // Signals
  proposal = signal<Proposal | null>(null);
  isLoading = signal<boolean>(false);
  businessInfo = this.businessInfoService.businessInfo;
  showProposalDetails = signal<boolean>(false); // Toggle para mostrar detalles del estimado original

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await Promise.all([
        this.loadProposal(id),
        this.businessInfoService.getBusinessInfo()
      ]);

      // Si viene el query param para abrir el diálogo de factura, abrirlo
      const openInvoiceDialog = this.route.snapshot.queryParamMap.get('openInvoiceDialog');
      if (openInvoiceDialog === 'true' && this.proposal()?.status === 'converted_to_invoice') {
        // Esperar un tick para asegurar que el componente esté completamente renderizado
        setTimeout(() => {
          this.editInvoiceData();
        }, 100);
      }
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
   * Abre el diálogo para agregar datos de factura
   */
  async convertToInvoice() {
    const proposal = this.proposal();
    if (!proposal) {
      console.error('No hay proposal disponible');
      return;
    }

    // Validar que el proposal esté aprobado
    if (proposal.status !== 'approved') {
      this.snackBar.open('Solo se pueden convertir a factura los estimados aprobados', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    console.log('🔄 Abriendo diálogo de factura para proposal:', proposal.id);

    // Abrir directamente el diálogo para agregar datos de factura
    // El estado se cambiará a 'converted_to_invoice' cuando se guarden los datos
    await this.editInvoiceData();
  }

  /**
   * Eliminar proposal
   */
  async deleteProposal() {
    const proposal = this.proposal();
    if (!proposal) return;

    // Importar dinámicamente el diálogo de confirmación
    const { ConfirmDialogComponent } = await import('../confirm-dialog/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Eliminar Estimado',
        message: `¿Estás seguro de eliminar el estimado ${proposal.proposalNumber}?\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
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
    });
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

  /**
   * Toggle para mostrar/ocultar detalles del estimado original
   */
  toggleProposalDetails() {
    this.showProposalDetails.update(value => !value);
  }

  /**
   * Calcular el total de materiales usados
   */
  calculateMaterialsTotal(): number {
    const proposal = this.proposal();
    if (!proposal?.materialsUsed || proposal.materialsUsed.length === 0) {
      return 0;
    }

    return proposal.materialsUsed.reduce((total, material) => {
      return total + (material.amount * material.price);
    }, 0);
  }

  /**
   * Calcular el subtotal combinado (trabajo + materiales)
   */
  calculateCombinedSubtotal(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;

    const workSubtotal = proposal.subtotal || 0;
    const materialsTotal = this.calculateMaterialsTotal();

    return workSubtotal + materialsTotal;
  }

  /**
   * Calcular impuesto sobre el subtotal combinado (si hay materiales)
   */
  calculateTaxAmount(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;

    // Si no hay materiales, usar el impuesto original
    if (!proposal.materialsUsed || proposal.materialsUsed.length === 0) {
      return proposal.tax || 0;
    }

    // Si hay materiales, recalcular el impuesto sobre el subtotal combinado
    const combinedSubtotal = this.calculateCombinedSubtotal();
    const taxPercentage = proposal.taxPercentage || 0;

    return (combinedSubtotal * taxPercentage) / 100;
  }

  /**
   * Calcular descuento sobre el subtotal combinado (si hay materiales)
   */
  calculateDiscountAmount(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;

    // Si no hay materiales, usar el descuento original
    if (!proposal.materialsUsed || proposal.materialsUsed.length === 0) {
      return proposal.discount || 0;
    }

    // Si hay materiales, recalcular el descuento sobre el subtotal combinado
    const combinedSubtotal = this.calculateCombinedSubtotal();
    const discountPercentage = proposal.discountPercentage || 0;

    return (combinedSubtotal * discountPercentage) / 100;
  }

  /**
   * Calcular el gran total (subtotal combinado + impuesto - descuento)
   */
  calculateGrandTotal(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;

    // Si no hay materiales, usar el total original
    if (!proposal.materialsUsed || proposal.materialsUsed.length === 0) {
      return proposal.total || 0;
    }

    // Si hay materiales, calcular el gran total con impuestos y descuentos recalculados
    const combinedSubtotal = this.calculateCombinedSubtotal();
    const tax = this.calculateTaxAmount();
    const discount = this.calculateDiscountAmount();

    return combinedSubtotal + tax - discount;
  }

  /**
   * Editar datos de factura
   */
  async editInvoiceData() {
    const proposal = this.proposal();
    if (!proposal) {
      console.error('No hay proposal disponible para editar factura');
      return;
    }

    console.log('📋 Abriendo diálogo de factura con datos:', {
      proposalId: proposal.id,
      status: proposal.status,
      hasWorkers: !!proposal.workers,
      hasMaterials: !!proposal.materialsUsed
    });

    try {
      // Importar dinámicamente el componente del diálogo
      console.log('⏳ Cargando componente InvoiceEditDialogComponent...');
      const { InvoiceEditDialogComponent } = await import('../invoice-edit-dialog/invoice-edit-dialog.component');
      console.log('✅ Componente cargado exitosamente');

      console.log('🔓 Abriendo diálogo...');
      const dialogRef = this.dialog.open(InvoiceEditDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        data: { proposal }
      });

      console.log('✅ Diálogo abierto');

      dialogRef.afterClosed().subscribe(async (result) => {
        console.log('🔒 Diálogo cerrado con resultado:', result);
        if (result) {
          // Recargar el proposal para ver los cambios
          console.log('🔄 Recargando proposal...');
          await this.loadProposal(proposal.id);
        }
      });
    } catch (error) {
      console.error('❌ Error abriendo diálogo de factura:', error);
      this.snackBar.open('Error al abrir el editor de factura', 'Cerrar', { duration: 3000 });
    }
  }
}
