// src/app/modules/projects/components/proposal-view/proposal-view.component.ts

import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

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
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { ProposalsService } from '../../services/proposals.service';
import { ProposalCalculatorService } from '../../services/proposal-calculator.service';
import { BusinessInfoService } from '../../../../admin/services/business-info.service';
import { LanguageService } from '../../../../core/services/language.service';

// Models
import { Proposal, ProposalStatus } from '../../models';

// Shared
import { CurrencyFormatterPipe } from '../../../../shared/pipes/currency-formatter.pipe';

@Component({
  selector: 'app-proposal-view',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatTooltipModule,
    CurrencyFormatterPipe
  ],
  templateUrl: './proposal-view.component.html',
  styleUrl: './proposal-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProposalViewComponent implements OnInit {
  private proposalsService = inject(ProposalsService);
  private proposalCalculator = inject(ProposalCalculatorService);
  private businessInfoService = inject(BusinessInfoService);
  private languageService = inject(LanguageService);
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
        // Establecer el idioma de la UI según el idioma del documento
        if (proposal.language) {
          this.languageService.setLanguage(proposal.language);
        }
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

  /**
   * Obtener nombre del idioma
   */
  getLanguageName(language?: 'es' | 'en'): string {
    if (!language) return 'Español';
    return language === 'es' ? 'Español' : 'English';
  }

  /**
   * Obtener bandera del idioma
   */
  getLanguageFlag(language?: 'es' | 'en'): string {
    if (!language) return '🇪🇸';
    return language === 'es' ? '🇪🇸' : '🇺🇸';
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
   * Calcular el total de materiales usados usando el servicio centralizado
   * Nota: Los precios de materiales ya incluyen cualquier markup aplicado
   */
  calculateMaterialsTotal(): number {
    const proposal = this.proposal();
    return this.proposalCalculator.calculateMaterialsTotal(proposal?.materialsUsed);
  }

  /**
   * Calcular el subtotal combinado (trabajo + materiales) usando el servicio centralizado
   * Nota: Los precios de materiales ya incluyen cualquier markup aplicado
   */
  calculateCombinedSubtotal(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;
    return this.proposalCalculator.calculateCombinedSubtotal(
      proposal.subtotal || 0,
      proposal.materialsUsed
    );
  }

  /**
   * Calcular impuesto usando el servicio centralizado
   */
  calculateTaxAmount(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;
    return this.proposalCalculator.calculateProposalTax(proposal);
  }

  /**
   * Calcular descuento usando el servicio centralizado
   */
  calculateDiscountAmount(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;
    return this.proposalCalculator.calculateProposalDiscount(proposal);
  }

  /**
   * Calcular el gran total usando el servicio centralizado
   */
  calculateGrandTotal(): number {
    const proposal = this.proposal();
    if (!proposal) return 0;
    return this.proposalCalculator.calculateProposalGrandTotal(proposal);
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

    try {
      // Importar dinámicamente el componente del diálogo

      const { InvoiceEditDialogComponent } = await import('../invoice-edit-dialog/invoice-edit-dialog.component');

      const dialogRef = this.dialog.open(InvoiceEditDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        data: { proposal }
      });

      dialogRef.afterClosed().subscribe(async (result) => {

        if (result) {
          // Recargar el proposal para ver los cambios

          await this.loadProposal(proposal.id);
        }
      });
    } catch (error) {
      console.error('❌ Error abriendo diálogo de factura:', error);
      this.snackBar.open('Error al abrir el editor de factura', 'Cerrar', { duration: 3000 });
    }
  }
}
