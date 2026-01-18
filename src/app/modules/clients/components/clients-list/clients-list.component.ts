// src/app/modules/clients/components/clients-list/clients-list.component.ts

import { Component, OnInit, AfterViewInit, inject, signal, computed, effect, ViewChild, TemplateRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
import { GenericSearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { GenericDataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ColumnVisibilityControlComponent, ColumnOption } from '../../../../shared/components/column-visibility-control/column-visibility-control.component';

// Models
import { Client, ClientFilters, ClientSort } from '../../models';
import { createGenericConfig } from '../../clients-config';
import { TableColumn, TableConfig } from '../../../../shared/components/data-table/models';

// Shared utilities
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { filterData, paginateData } from '../../../../shared/utils';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    GenericSearchBarComponent,
    GenericDataTableComponent,
    ColumnVisibilityControlComponent,
    PaginationComponent,
  ],
  templateUrl: './clients-list.component.html',
  styleUrl: './clients-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsListComponent implements OnInit, AfterViewInit {
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigServiceRefactored);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  // ViewChild templates for GenericDataTable
  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;

  // Signals del servicio
  clients = this.clientsService.clients;
  isLoading = this.clientsService.isLoading;
  stats = this.clientsService.stats;

  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

  // Columnas visibles (manejado por ColumnVisibilityControl)
  visibleColumnIds = signal<string[]>([]);

  // Opciones de columnas para el control de visibilidad
  columnOptions = computed<ColumnOption[]>(() => {
    return this.gridFields().map(field => ({
      id: field.id,
      label: field.label,
      visible: this.visibleColumnIds().includes(field.id)
    }));
  });

  // Grid fields filtrados por columnas visibles
  visibleGridFields = computed(() => {
    const allFields = this.gridFields();
    const visibleIds = this.visibleColumnIds();

    // Si no hay columnas seleccionadas, mostrar solo las que tienen showInGrid: true
    if (visibleIds.length === 0) {
      return allFields.filter(field => field.gridConfig?.showInGrid === true);
    }

    return allFields.filter(field => visibleIds.includes(field.id));
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

  // Estado de dropdowns de filtros
  openFilterDropdown = signal<string | null>(null);
  filterSearchTerms = signal<Record<string, string>>({});

  // Valores únicos por campo filtrable
  uniqueValuesByField = computed(() => {
    const clients = this.clients();
    const filterableFieldsList = this.filterableFields();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const field of filterableFieldsList) {
      const valuesMap = new Map<any, number>();

      for (const client of clients) {
        const value = this.getFieldValue(client, field.name);

        if (value !== null && value !== undefined && value !== '') {
          // Para campos array (multiselect), procesar cada valor
          if (Array.isArray(value)) {
            for (const v of value) {
              valuesMap.set(v, (valuesMap.get(v) || 0) + 1);
            }
          } else {
            valuesMap.set(value, (valuesMap.get(value) || 0) + 1);
          }
        }
      }

      // Convertir a array y agregar labels
      const uniqueValues = Array.from(valuesMap.entries()).map(([value, count]) => {
        // Para select/dictionary, obtener el label de las opciones
        let label = String(value);
        if (field.type === 'select' || field.type === 'multiselect' || field.type === 'dictionary') {
          const option = field.options?.find(opt => opt.value === value);
          if (option) {
            label = option.label;
          }
        }

        return { value, label, count };
      });

      // Ordenar por label
      uniqueValues.sort((a, b) => a.label.localeCompare(b.label));

      result[field.name] = uniqueValues;
    }

    return result;
  });

  // Opciones filtradas por búsqueda interna
  filteredOptions = computed(() => {
    const uniqueValues = this.uniqueValuesByField();
    const searchTerms = this.filterSearchTerms();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const [fieldName, values] of Object.entries(uniqueValues)) {
      const searchTerm = (searchTerms[fieldName] || '').toLowerCase();

      if (!searchTerm) {
        result[fieldName] = values;
      } else {
        result[fieldName] = values.filter(item =>
          item.label.toLowerCase().includes(searchTerm)
        );
      }
    }

    return result;
  });

  // Generic config for delete dialogs
  genericConfig = computed(() => {
    const clientConfig = this.config();
    return clientConfig ? createGenericConfig(clientConfig) : null;
  });

  // Verificar si el usuario es admin
  isAdmin = computed(() => this.authService.authorizedUser()?.role === 'admin');

  // Template synchronization
  templatesReady = signal(false);
  tableConfig = signal<TableConfig<Client>>({
    columns: [],
    selectable: 'multiple',
    showSelectAll: true,
    sortable: true,
    themeColor: 'purple',
    emptyMessage: 'No hay clientes disponibles'
  });

  // Señales locales
  searchTerm = signal<string>('');
  currentFilter = signal<ClientFilters>({});
  currentSort = signal<ClientSort>({ field: 'name', direction: 'asc' });
  selectedClients = signal<Set<string | number>>(new Set());

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10); // Valor por defecto: 10 registros por página

  // Opciones de registros por página
  pageSizeOptions = [10, 20, 50, 100];

  // Math para templates
  Math = Math;

  // Expose Object for template use
  Object = Object;

  // Clientes filtrados y paginados
  filteredClients = computed(() => {
    let clients = this.clients();
    const search = this.searchTerm().toLowerCase();
    const fields = this.visibleGridFields();
    const customFilters = this.customFieldFilters();

    // 1. Filtrar por campos personalizados (filterable: true)
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

    // 2. Filtrar por búsqueda global
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

    // 3. Ordenar (sortable: true)
    const sort = this.currentSort();
    if (sort.field) {
      const allFields = this.gridFields();
      const sortField = allFields.find(f => f.name === sort.field);

      clients = [...clients].sort((a, b) => {
        let aValue = this.getFieldValue(a, sort.field);
        let bValue = this.getFieldValue(b, sort.field);

        // Manejar valores null/undefined
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Ordenar según tipo de campo
        let comparison = 0;

        if (sortField) {
          if (sortField.type === 'number' || sortField.type === 'currency') {
            // Números: comparación numérica
            comparison = Number(aValue) - Number(bValue);
          } else if (sortField.type === 'date') {
            // Fechas: comparación de timestamps
            const aDate = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
            const bDate = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
            comparison = aDate - bDate;
          } else if (sortField.type === 'checkbox') {
            // Booleanos: true > false
            comparison = (aValue === true ? 1 : 0) - (bValue === true ? 1 : 0);
          } else {
            // Texto: comparación alfabética (case-insensitive)
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            comparison = aStr.localeCompare(bStr);
          }
        } else {
          // Campo por defecto (name, email, etc): comparación alfabética
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        // Aplicar dirección (asc/desc)
        return sort.direction === 'asc' ? comparison : -comparison;
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

  constructor() {
    // Effect para actualizar la tabla cuando:
    // 1. Los templates estén disponibles (templatesReady)
    // 2. Las columnas visibles cambien (visibleGridFields)
    effect(() => {
      if (this.templatesReady()) {
        // Capturar visibleGridFields para que el effect reaccione a sus cambios
        const fields = this.visibleGridFields();
        this.updateTableConfig();
      }
    });
  }

  async ngOnInit() {
    // Cargar preferencias de filtros
    this.loadFilterPreferences();
    // Cargar datos
    await this.loadData();
  }

  ngAfterViewInit() {
    // Asegurarnos de que los templates estén realmente disponibles
    setTimeout(() => {
      this.templatesReady.set(true);
      this.cdr.detectChanges();
    }, 0);
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

      // Inicializar selector de columnas con las columnas visibles por defecto
      const defaultVisibleColumns = this.gridFields()
        .filter(field => field.gridConfig?.showInGrid === true)
        .map(field => field.id);

      this.visibleColumnIds.set(defaultVisibleColumns);

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
   * Manejar cambio de visibilidad de columnas desde ColumnVisibilityControl
   */
  onColumnVisibilityChange(visibleIds: string[]) {
    this.visibleColumnIds.set(visibleIds);
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
      customFieldFilters: this.customFieldFilters()
    };
    localStorage.setItem(storageKey, JSON.stringify(filters));
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
    this.customFieldFilters.set({});
    this.currentPage.set(0);
    this.saveFilterPreferences();
    this.snackBar.open('Filtros limpiados', '', { duration: 2000 });
  }

  /**
   * Verificar si hay filtros activos
   */
  hasActiveFilters(): boolean {
    return Object.keys(this.customFieldFilters()).length > 0;
  }

  /**
   * Contar filtros activos
   */
  activeFiltersCount = computed(() => {
    return Object.keys(this.customFieldFilters()).length;
  });

  /**
   * Abrir/cerrar dropdown de filtro
   */
  toggleFilterDropdown(fieldName: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const currentOpen = this.openFilterDropdown();
    if (currentOpen === fieldName) {
      this.openFilterDropdown.set(null);
    } else {
      this.openFilterDropdown.set(fieldName);
      // Limpiar búsqueda interna al abrir
      const searchTerms = { ...this.filterSearchTerms() };
      searchTerms[fieldName] = '';
      this.filterSearchTerms.set(searchTerms);
    }
  }

  /**
   * Cerrar dropdown de filtro
   */
  closeFilterDropdown() {
    this.openFilterDropdown.set(null);
  }

  /**
   * Verificar si dropdown está abierto
   */
  isFilterDropdownOpen(fieldName: string): boolean {
    return this.openFilterDropdown() === fieldName;
  }

  /**
   * Actualizar término de búsqueda interna del filtro
   */
  onFilterSearchChange(fieldName: string, searchTerm: string) {
    const searchTerms = { ...this.filterSearchTerms() };
    searchTerms[fieldName] = searchTerm;
    this.filterSearchTerms.set(searchTerms);
  }

  /**
   * Seleccionar valor de filtro desde dropdown
   */
  selectFilterValue(fieldName: string, value: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.onCustomFieldFilterChange(fieldName, value);
    this.closeFilterDropdown();
  }

  /**
   * Obtener label del valor seleccionado
   */
  getSelectedFilterLabel(fieldName: string): string {
    const filterValue = this.customFieldFilters()[fieldName];
    if (!filterValue || filterValue === 'all') {
      return 'Todos';
    }

    const uniqueValues = this.uniqueValuesByField()[fieldName];
    if (!uniqueValues) {
      return String(filterValue);
    }

    const option = uniqueValues.find(opt => opt.value === filterValue);
    return option ? option.label : String(filterValue);
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

    // El computed filteredClients se recalculará automáticamente
    // No es necesario llamar al servicio, el ordenamiento es local
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
    if (selectedIds.size === 0) {
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const clients = this.clients().filter(c => selectedIds.has(c.id));

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
        await Promise.all(Array.from(selectedIds).map(id => this.clientsService.deleteClient(id as string)));

        this.selectedClients.set(new Set());
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
    const selected = new Set(this.selectedClients());
    if (selected.has(clientId)) {
      selected.delete(clientId);
    } else {
      selected.add(clientId);
    }
    this.selectedClients.set(selected);
  }

  /**
   * Seleccionar/deseleccionar todos
   */
  toggleSelectAll() {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();

    if (selected.size === paginated.length && paginated.length > 0) {
      this.selectedClients.set(new Set());
    } else {
      this.selectedClients.set(new Set(paginated.map(c => c.id)));
    }
  }

  /**
   * Verificar si está seleccionado
   */
  isSelected(clientId: string): boolean {
    return this.selectedClients().has(clientId);
  }

  /**
   * Verificar si todos están seleccionados
   */
  isAllSelected(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return paginated.length > 0 && selected.size === paginated.length;
  }

  /**
   * Verificar si hay selección parcial
   */
  isIndeterminate(): boolean {
    const selected = this.selectedClients();
    const paginated = this.paginatedClients();
    return selected.size > 0 && selected.size < paginated.length;
  }

  // Usar funciones compartidas de formateo
  formatFieldValue = formatFieldValue;
  getFieldValue = getFieldValue;

  /**
   * Construir columnas de la tabla basadas en visibleGridFields
   */
  private buildTableColumns(): TableColumn<Client>[] {
    const columns: TableColumn<Client>[] = [];
    const fields = this.visibleGridFields();

    // Columnas dinámicas basadas en gridFields visibles
    for (const field of fields) {
      columns.push({
        id: field.id,
        label: field.label,
        field: field.name as keyof Client,
        sortable: field.gridConfig?.sortable === true,
        valueFormatter: (value, row) => this.formatFieldValue(value, field)
      });
    }

    // Columna de estado con template
    columns.push({
      id: 'status',
      label: 'Estado',
      cellTemplate: this.statusColumnTemplate,
      sortable: false
    });

    // Columna de acciones con template
    columns.push({
      id: 'actions',
      label: 'Acciones',
      cellTemplate: this.actionsColumnTemplate,
      sortable: false
    });

    return columns;
  }

  /**
   * Actualizar configuración de la tabla
   */
  private updateTableConfig() {
    const columns = this.buildTableColumns();
    const config = this.config();
    const enableBulkActions = config?.gridConfig?.enableBulkActions !== false;

    this.tableConfig.set({
      columns: columns,
      selectable: enableBulkActions ? 'multiple' : false,
      showSelectAll: enableBulkActions,
      sortable: true,
      themeColor: 'purple',
      emptyMessage: this.searchTerm() && this.searchTerm().length >= 2
        ? 'No se encontraron clientes'
        : 'Comienza agregando tu primer cliente'
    });
    // Forzar detección de cambios INMEDIATA (no solo marcar)
    this.cdr.detectChanges();
  }

  /**
   * Manejar cambio de selección desde GenericDataTable
   */
  onSelectionChange(selectedIds: (string | number)[]) {
    this.selectedClients.set(new Set(selectedIds));
  }

  /**
   * Limpiar selección
   */
  clearSelection() {
    this.selectedClients.set(new Set());
  }

  /**
   * Navegar a configuración
   */
  goToConfig() {
    this.router.navigate(['/modules/clients/config']);
  }

  /**
   * Exportar datos a CSV
   */
  exportToCSV() {
    try {
      const clients = this.filteredClients();
      if (clients.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      const fields = this.visibleGridFields();

      // Encabezados
      const headers = fields.map(f => f.label).join(',');

      // Filas
      const rows = clients.map(client => {
        return fields.map(field => {
          const value = this.getFieldValue(client, field.name);
          const formatted = this.formatFieldValue(value, field);
          // Escapar comillas y valores con comas
          return `"${String(formatted).replace(/"/g, '""')}"`;
        }).join(',');
      });

      // Combinar
      const csv = [headers, ...rows].join('\n');

      // Descargar
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Datos exportados exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error exportando a CSV:', error);
      this.snackBar.open('Error al exportar datos', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Exportar datos a JSON
   */
  exportToJSON() {
    try {
      const clients = this.filteredClients();
      if (clients.length === 0) {
        this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
        return;
      }

      // Convertir a JSON
      const json = JSON.stringify(clients, null, 2);

      // Descargar
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('Datos exportados exitosamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error exportando a JSON:', error);
      this.snackBar.open('Error al exportar datos', 'Cerrar', { duration: 3000 });
    }
  }
}
