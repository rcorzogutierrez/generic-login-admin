// src/app/modules/clients/components/clients-list/clients-list.component.ts

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
import { ClientsService } from '../../services/clients.service';
import { ClientConfigService } from '../../services/client-config.service';

// Components
import { DeleteClientDialogComponent } from '../delete-client-dialog/delete-client-dialog.component';
import { DeleteMultipleClientsDialogComponent } from '../delete-multiple-clients-dialog/delete-multiple-clients-dialog.component';

// Models
import { Client, ClientFilters, ClientSort } from '../../models';

@Component({
  selector: 'app-clients-list',
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
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsListComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  // Signals del servicio
  clients = this.clientsService.clients;
  isLoading = this.clientsService.isLoading;
  stats = this.clientsService.stats;

  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

  // Señales locales
  searchTerm = signal<string>('');
  currentFilter = signal<ClientFilters>({});
  currentSort = signal<ClientSort>({ field: 'name', direction: 'asc' });
  selectedClients = signal<string[]>([]);

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25);

  // Math para templates
  Math = Math;

  // Clientes filtrados y paginados
  filteredClients = computed(() => {
    const clients = this.clients();
    const search = this.searchTerm().toLowerCase();

    if (!search) return clients;

    return clients.filter(client =>
      client.name.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.includes(search) ||
      client.company?.toLowerCase().includes(search)
    );
  });

  paginatedClients = computed(() => {
    const clients = this.filteredClients();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return clients.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredClients().length;
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
      // Cargar configuración y clientes en paralelo
      await Promise.all([
        this.configService.initialize(),
        this.clientsService.initialize()
      ]);

      const config = this.config();
      if (config) {
        this.itemsPerPage.set(config.gridConfig.itemsPerPage);
        this.currentSort.set({
          field: config.gridConfig.sortBy,
          direction: config.gridConfig.sortOrder
        });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Buscar clientes
   */
  onSearch(term: string) {
    this.searchTerm.set(term);
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
    this.clientsService.loadClients(this.currentFilter(), sort);
  }

  /**
   * Navegar a crear cliente
   */
  createClient() {
    this.router.navigate(['/modules/clients/new']);
  }

  /**
   * Editar cliente
   */
  editClient(client: Client) {
    this.router.navigate(['/modules/clients', client.id, 'edit']);
  }

  /**
   * Ver detalles del cliente
   */
  viewClient(client: Client) {
    this.router.navigate(['/modules/clients', client.id]);
  }

  /**
   * Eliminar cliente
   */
  async deleteClient(client: Client) {
    const dialogRef = this.dialog.open(DeleteClientDialogComponent, {
      data: { client },
      width: '600px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        await this.clientsService.deleteClient(client.id);
        this.snackBar.open('Cliente eliminado exitosamente', 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        this.snackBar.open('Error al eliminar el cliente', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Eliminar clientes seleccionados
   */
  async deleteSelectedClients() {
    const selectedIds = this.selectedClients();
    if (selectedIds.length === 0) {
      return;
    }

    const clients = this.clients().filter(c => selectedIds.includes(c.id));

    const dialogRef = this.dialog.open(DeleteMultipleClientsDialogComponent, {
      data: { clients, count: clients.length },
      width: '700px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        // Eliminar todos los clientes seleccionados
        await Promise.all(selectedIds.map(id => this.clientsService.deleteClient(id)));

        this.selectedClients.set([]);
        this.snackBar.open(`${clients.length} cliente(s) eliminado(s) exitosamente`, 'Cerrar', { duration: 3000 });
        this.cdr.markForCheck();
      } catch (error) {
        console.error('Error eliminando clientes:', error);
        this.snackBar.open('Error al eliminar los clientes', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Toggle estado activo/inactivo
   */
  async toggleClientStatus(client: Client) {
    try {
      await this.clientsService.toggleClientStatus(client.id, !client.isActive);
      const status = !client.isActive ? 'activado' : 'desactivado';
      this.snackBar.open(`Cliente ${status} exitosamente`, 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error cambiando estado del cliente:', error);
      this.snackBar.open('Error al cambiar el estado', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Refrescar lista
   */
  async refresh() {
    try {
      await this.clientsService.refresh();
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
   * Seleccionar/deseleccionar cliente
   */
  toggleClientSelection(clientId: string) {
    const selected = this.selectedClients();
    if (selected.includes(clientId)) {
      this.selectedClients.set(selected.filter(id => id !== clientId));
    } else {
      this.selectedClients.set([...selected, clientId]);
    }
  }

  /**
   * Seleccionar/deseleccionar todos
   */
  toggleSelectAll() {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();

    if (selected.length === paginated.length) {
      this.selectedClients.set([]);
    } else {
      this.selectedClients.set(paginated.map(c => c.id));
    }
  }

  /**
   * Verificar si está seleccionado
   */
  isSelected(clientId: string): boolean {
    return this.selectedClients().includes(clientId);
  }

  /**
   * Verificar si todos están seleccionados
   */
  isAllSelected(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  /**
   * Verificar si hay selección parcial
   */
  isIndeterminate(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return selected.length > 0 && selected.length < paginated.length;
  }

  /**
   * Obtener valor del campo
   */
  getFieldValue(client: Client, fieldName: string): any {
    if (fieldName in client) {
      return (client as any)[fieldName];
    }
    return client.customFields?.[fieldName];
  }

  /**
   * Formatear valor del campo
   */
  formatFieldValue(value: any, fieldType: string): string {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (fieldType) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'checkbox':
        return value ? 'Sí' : 'No';
      case 'currency':
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      default:
        return String(value);
    }
  }

  /**
   * Navegar a configuración
   */
  goToConfig() {
    // TODO: Implementar página de configuración del módulo
    this.snackBar.open(
      'La configuración de campos personalizados estará disponible próximamente',
      'Entendido',
      { duration: 4000 }
    );
  }
}
