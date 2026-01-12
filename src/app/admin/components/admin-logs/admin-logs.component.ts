// src/app/admin/components/admin-logs/admin-logs.component.ts - OPTIMIZADO CON ANGULAR 20
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { AdminLogsService, AdminLog, LogsFilter } from '../../services/admin-logs.service';
import { Router } from '@angular/router';
import { DeleteLogsDialogComponent } from '../delete-logs-dialog/delete-logs-dialog.component';
import { LogDetailsDialogComponent } from '../log-details-dialog/log-details-dialog.component';
import { formatDateTime, getRelativeTime } from '../../../shared/utils/date-time.utils';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './admin-logs.component.html',
  styleUrl: './admin-logs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLogsComponent implements OnInit {
  // ✅ Inject pattern (Angular 20)
  private logsService = inject(AdminLogsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  // Estado de logs
  logs: AdminLog[] = [];
  isLoading = false;
  isLoadingMore = false;

  // Paginación
  currentPage = 1;
  itemsPerPage = 10; // Valor por defecto: 10 registros por página
  hasMorePages = false;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  private pageHistory: (QueryDocumentSnapshot<DocumentData> | null)[] = [null];

  // Opciones de registros por página
  pageSizeOptions = [10, 20, 50, 100];

  // Filtros
  selectedAction = 'all';
  searchTerm = '';
  availableActions: string[] = [];

  // Stats
  totalLogs = 0;

  // ✅ Utilidades compartidas expuestas al template
  readonly formatDateTime = formatDateTime;
  readonly getRelativeTime = getRelativeTime;

  constructor() {}

  async ngOnInit() {
    await this.loadInitialData();
  }

  /**
   * Carga inicial de datos
   */
  private async loadInitialData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      this.availableActions = await this.logsService.getUniqueActions();
      await this.loadLogs();
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
      this.snackBar.open('Error cargando logs', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Carga logs con filtros actuales
   */
  async loadLogs(resetPagination = false) {
    if (resetPagination) {
      this.currentPage = 1;
      this.pageHistory = [null];
      this.lastDoc = null;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const filters: LogsFilter = {};

      if (this.selectedAction !== 'all') {
        filters.action = this.selectedAction;
      }

      if (this.searchTerm.trim()) {
        filters.searchTerm = this.searchTerm.trim();
      }

      const result = await this.logsService.getLogsPaginated(
        this.itemsPerPage,
        filters,
        this.lastDoc
      );

      this.logs = result.logs;
      this.hasMorePages = result.hasMore;
      this.lastDoc = result.lastDoc;
    } catch (error) {
      console.error('❌ Error cargando logs:', error);
      this.snackBar.open('Error cargando logs', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
      this.isLoadingMore = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Página siguiente
   */
  async nextPage() {
    if (!this.hasMorePages || this.isLoadingMore) return;

    this.isLoadingMore = true;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios

    // Guardar documento actual en historial
    this.pageHistory.push(this.lastDoc);
    this.currentPage++;

    await this.loadLogs();
  }

  /**
   * Página anterior
   */
  async previousPage() {
    if (this.currentPage <= 1 || this.isLoadingMore) return;

    this.isLoadingMore = true;
    this.currentPage--;
    this.cdr.markForCheck(); // ✅ Forzar detección de cambios

    // Recuperar documento anterior del historial
    this.pageHistory.pop();
    this.lastDoc = this.pageHistory[this.pageHistory.length - 1];

    await this.loadLogs();
  }

  /**
   * Cambio de filtro de acción
   */
  async onActionFilterChange() {
    await this.loadLogs(true);
  }

  /**
   * Búsqueda en tiempo real
   */
  async onSearch() {
    await this.loadLogs(true);
  }

  /**
   * Limpiar todos los filtros
   */
  async clearFilters() {
    this.selectedAction = 'all';
    this.searchTerm = '';
    await this.loadLogs(true);
    this.snackBar.open('Filtros limpiados', '', { duration: 2000 });
  }

  /**
   * Cambiar tamaño de página
   */
  async changePageSize(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.itemsPerPage = newSize;
    await this.loadLogs(true); // Resetear paginación
    this.cdr.markForCheck();
  }

  /**
   * Refrescar logs
   */
  async refreshLogs() {
    await this.loadLogs(true);
    this.snackBar.open('Logs actualizados', '', { duration: 2000 });
  }

  /**
   * NUEVO: Abre el dialog para eliminar logs
   */
  openDeleteLogsDialog() {
    const dialogRef = this.dialog.open(DeleteLogsDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.success && result?.result) {
        const deleteResult = result.result;

        this.snackBar.open(
          deleteResult.message,
          'Cerrar',
          {
            duration: 6000,
            panelClass: deleteResult.success ? ['success-snackbar'] : ['error-snackbar']
          }
        );

        if (deleteResult.success && deleteResult.deletedCount > 0) {
          await this.refreshLogs();
        }
      }
    });
  }

  /**
   * Exportar logs a JSON
   */
  async exportLogs() {
    this.isLoading = true;
    
    try {
      const filters: LogsFilter = {};
      
      if (this.selectedAction !== 'all') {
        filters.action = this.selectedAction;
      }

      const logs = await this.logsService.exportLogs(filters);
      
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.snackBar.open(`${logs.length} logs exportados`, 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('❌ Error exportando logs:', error);
      this.snackBar.open('Error al exportar logs', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Ver detalles de un log
   */
  viewLogDetails(log: AdminLog) {
    this.dialog.open(LogDetailsDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: { log },
      panelClass: 'log-details-dialog'
    });
  }

  /**
   * Volver al panel de admin
   */
  goBackToAdmin() {
    this.router.navigate(['/admin']);
  }

  // ============================================
  // UTILIDADES DE FORMATO
  // ============================================

  getActionName(action: string): string {
    return this.logsService.formatActionName(action);
  }

  getActionIcon(action: string): string {
    return this.logsService.getActionIcon(action);
  }

  getActionBadgeClass(action: string): string {
    return this.logsService.getActionBadgeClass(action);
  }

  getUserInitials(email: string): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  }

  getUserColor(email: string): string {
    const colors = [
      'linear-gradient(135deg, #3b82f6, #2563eb)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ef4444, #dc2626)',
      'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      'linear-gradient(135deg, #06b6d4, #0891b2)',
      'linear-gradient(135deg, #ec4899, #db2777)'
    ];

    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * ✅ NOTA: formatDateTime y getRelativeTime eliminados
   * Ahora usan utilidades compartidas de shared/utils
   * Se exponen al template como readonly properties (líneas 61-62)
   */

  goBack() {
    this.router.navigate(['/admin']);
  }

  /**
   * Tracking para *ngFor
   */
  trackByLogId(index: number, log: AdminLog): string {
    return log.id;
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return this.selectedAction !== 'all' || this.searchTerm.trim().length > 0;
  }
}