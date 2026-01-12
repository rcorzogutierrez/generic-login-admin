// src/app/modules/clients/components/clients-list/clients-list.component.ts

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Material imports (solo los necesarios)
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Services
import { ClientsService } from '../../services/clients.service';
import { ClientConfigServiceRefactored } from '../../services/client-config-refactored.service';
import { AuthService } from '../../../../core/services/auth.service';

// Generic Components
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

// Models
import { Client, ClientFilters, ClientSort } from '../../models';
import { createGenericConfig } from '../../clients-config';

// Shared utilities
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    PaginationComponent,
  ],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsListComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigServiceRefactored);
  private authService = inject(AuthService);
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

  // Columnas visibles (persistente en localStorage)
  visibleColumns = signal<Set<string>>(new Set());
  isColumnMenuOpen = signal<boolean>(false);

  // Grid fields filtrados por columnas visibles
  visibleGridFields = computed(() => {
    const allFields = this.gridFields();
    const visible = this.visibleColumns();

    // Si no hay columnas seleccionadas, mostrar todas
    if (visible.size === 0) {
      return allFields;
    }

    return allFields.filter(field => visible.has(field.id));
  });

  // Campos filtrables (filterable: true)
  filterableFields = computed(() => {
    const allFields = this.gridFields();
    return allFields.filter(field =>
      field.gridConfig?.filterable === true && field.isActive
    );
  });

  // Filtros activos por campos personalizados
  customFieldFilters = signal<Record<string, any>>({});
  statusFilter = signal<string>('all'); // 'all', 'active', 'inactive', 'potential'

  // Generic config for delete dialogs
  genericConfig = computed(() => {
    const clientConfig = this.config();
    return clientConfig ? createGenericConfig(clientConfig) : null;
  });

  // Verificar si el usuario es admin
  isAdmin = computed(() => this.authService.authorizedUser()?.role === 'admin');

  // Señales locales
  searchTerm = signal<string>('');
  currentFilter = signal<ClientFilters>({});
  currentSort = signal<ClientSort>({ field: 'name', direction: 'asc' });
  selectedClients = signal<string[]>([]);

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10); // Valor por defecto: 10 registros por página

  // Opciones de registros por página
  pageSizeOptions = [10, 20, 50, 100];

  // Math para templates
  Math = Math;

  // Clientes filtrados y paginados
  filteredClients = computed(() => {
    let clients = this.clients();
    const search = this.searchTerm().toLowerCase();
    const fields = this.visibleGridFields();
    const statusFilterValue = this.statusFilter();
    const customFilters = this.customFieldFilters();

    // 1. Filtrar por status
    if (statusFilterValue !== 'all') {
      clients = clients.filter(client => {
        if (statusFilterValue === 'active') return client.isActive === true;
        if (statusFilterValue === 'inactive') return client.isActive === false;
        if (statusFilterValue === 'potential') return client.status === 'potential';
        return true;
      });
    }

    // 2. Filtrar por campos personalizados (filterable: true)
    if (Object.keys(customFilters).length > 0) {
      clients = clients.filter(client => {
        for (const [fieldName, filterValue] of Object.entries(customFilters)) {
          // Si el filtro está vacío o es "all", ignorar
          if (!filterValue || filterValue === '' || filterValue === 'all') {
            continue;
          }

          // Obtener el valor del campo en el cliente
          const clientValue = this.getFieldValue(client, fieldName);

          // Si el campo no existe o no coincide, filtrar
          if (clientValue === undefined || clientValue === null) {
            return false;
          }

          // Comparar valores (normalizar a string)
          if (String(clientValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // 3. Filtrar por búsqueda global
    if (search) {
      clients = clients.filter(client => {
        // Buscar en todos los campos visibles en el grid
        for (const field of fields) {
          const value = this.getFieldValue(client, field.name);

          if (value !== null && value !== undefined) {
            // Para campos tipo select/dictionary, usar el valor formateado (labels)
            const formattedValue = this.formatFieldValue(value, field);
            if (formattedValue.toLowerCase().includes(search)) {
              return true;
            }
          }
        }

        // También buscar en campos por defecto que no estén en el grid
        if (client.name?.toLowerCase().includes(search)) return true;
        if (client.email?.toLowerCase().includes(search)) return true;
        if (client.phone?.includes(search)) return true;
        if (client.company?.toLowerCase().includes(search)) return true;

        return false;
      });
    }

    return clients;
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
    this.loadColumnPreferences();
    this.loadFilterPreferences();
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

      if (config && config.gridConfig) {

        this.itemsPerPage.set(config.gridConfig.itemsPerPage || 10);
        this.currentSort.set({
          field: config.gridConfig.sortBy || 'name',
          direction: config.gridConfig.sortOrder || 'asc'
        });

      } else {

        // Usar valores por defecto si no hay configuración
        this.itemsPerPage.set(10);
        this.currentSort.set({
          field: 'name',
          direction: 'asc'
        });
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar los datos', 'Cerrar', { duration: 3000 });
    }
  }

  // ============================================
  // GESTIÓN DE COLUMNAS VISIBLES
  // ============================================

  /**
   * Cargar preferencias de columnas desde localStorage
   */
  private loadColumnPreferences() {
    const storageKey = 'clients-visible-columns';
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const columnIds = JSON.parse(stored) as string[];
        this.visibleColumns.set(new Set(columnIds));
      } catch (error) {
        console.error('Error cargando preferencias de columnas:', error);
        // Si hay error, mostrar todas las columnas
        this.visibleColumns.set(new Set());
      }
    } else {
      // Primera vez: mostrar todas las columnas
      const allFields = this.gridFields();
      const allIds = allFields.map(f => f.id);
      this.visibleColumns.set(new Set(allIds));
      this.saveColumnPreferences();
    }
  }

  /**
   * Guardar preferencias de columnas en localStorage
   */
  private saveColumnPreferences() {
    const storageKey = 'clients-visible-columns';
    const columnIds = Array.from(this.visibleColumns());
    localStorage.setItem(storageKey, JSON.stringify(columnIds));
  }

  /**
   * Toggle menú de columnas
   */
  toggleColumnMenu() {
    this.isColumnMenuOpen.set(!this.isColumnMenuOpen());
  }

  /**
   * Cerrar menú de columnas
   */
  closeColumnMenu() {
    this.isColumnMenuOpen.set(false);
  }

  /**
   * Toggle visibilidad de una columna
   */
  toggleColumnVisibility(fieldId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const visible = new Set(this.visibleColumns());

    if (visible.has(fieldId)) {
      visible.delete(fieldId);
    } else {
      visible.add(fieldId);
    }

    this.visibleColumns.set(visible);
    this.saveColumnPreferences();
  }

  /**
   * Verificar si una columna es visible
   */
  isColumnVisible(fieldId: string): boolean {
    return this.visibleColumns().has(fieldId);
  }

  /**
   * Resetear columnas a valores por defecto (todas visibles)
   */
  resetColumnPreferences() {
    const allFields = this.gridFields();
    const allIds = allFields.map(f => f.id);
    this.visibleColumns.set(new Set(allIds));
    this.saveColumnPreferences();
    this.snackBar.open('Columnas restauradas', '', { duration: 2000 });
  }

  /**
   * Verificar si al menos una columna está visible
   */
  hasVisibleColumns(): boolean {
    return this.visibleColumns().size > 0;
  }

  // ============================================
  // BÚSQUEDA Y FILTROS
  // ============================================

  /**
   * Buscar clientes
   */
  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);
  }

  /**
   * Cargar preferencias de filtros desde localStorage
   */
  private loadFilterPreferences() {
    const storageKey = 'clients-filters';
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const filters = JSON.parse(stored);
        if (filters.statusFilter) {
          this.statusFilter.set(filters.statusFilter);
        }
        if (filters.customFieldFilters) {
          this.customFieldFilters.set(filters.customFieldFilters);
        }
      } catch (error) {
        console.error('Error cargando preferencias de filtros:', error);
      }
    }
  }

  /**
   * Guardar preferencias de filtros en localStorage
   */
  private saveFilterPreferences() {
    const storageKey = 'clients-filters';
    const filters = {
      statusFilter: this.statusFilter(),
      customFieldFilters: this.customFieldFilters()
    };
    localStorage.setItem(storageKey, JSON.stringify(filters));
  }

  /**
   * Cambiar filtro de status
   */
  onStatusFilterChange(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(0);
    this.saveFilterPreferences();
  }

  /**
   * Cambiar filtro de campo personalizado
   */
  onCustomFieldFilterChange(fieldName: string, value: any) {
    const currentFilters = { ...this.customFieldFilters() };

    if (!value || value === '' || value === 'all') {
      // Eliminar filtro si está vacío
      delete currentFilters[fieldName];
    } else {
      // Agregar o actualizar filtro
      currentFilters[fieldName] = value;
    }

    this.customFieldFilters.set(currentFilters);
    this.currentPage.set(0);
    this.saveFilterPreferences();
  }

  /**
   * Limpiar todos los filtros
   */
  clearAllFilters() {
    this.statusFilter.set('all');
    this.customFieldFilters.set({});
    this.currentPage.set(0);
    this.saveFilterPreferences();
    this.snackBar.open('Filtros limpiados', '', { duration: 2000 });
  }

  /**
   * Verificar si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return this.statusFilter() !== 'all' ||
           Object.keys(this.customFieldFilters()).length > 0;
  }

  /**
   * Contar filtros activos
   */
  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.statusFilter() !== 'all') count++;
    count += Object.keys(this.customFieldFilters()).length;
    return count;
  });

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
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: client as any,
        config: config
      },
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

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const clients = this.clients().filter(c => selectedIds.includes(c.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      data: {
        entities: clients as any[],
        count: clients.length,
        config: config
      },
      width: '800px',
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
   * Cambiar tamaño de página
   */
  changePageSize(newSize: number) {
    this.itemsPerPage.set(newSize);
    this.currentPage.set(0); // Volver a la primera página
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

  // Usar funciones compartidas de formateo
  formatFieldValue = formatFieldValue;
  getFieldValue = getFieldValue;

  /**
   * Navegar a configuración
   */
  goToConfig() {
    this.router.navigate(['/modules/clients/config']);
  }
}
