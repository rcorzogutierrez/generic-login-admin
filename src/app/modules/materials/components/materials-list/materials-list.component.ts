import { Component, OnInit, AfterViewInit, inject, signal, computed, effect, ViewChild, TemplateRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { MaterialsService, MaterialsConfigService } from '../../services';
import { Material } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { GenericSearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { GenericDataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig } from '../../../../shared/components/data-table/models';
import { createGenericConfig } from '../../config/materials.config';
import { AuthService } from '../../../../core/services/auth.service';
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';
import { filterData, paginateData } from '../../../../shared/utils';

@Component({
  selector: 'app-materials-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    PaginationComponent,
    GenericSearchBarComponent,
    GenericDataTableComponent
  ],
  templateUrl: './materials-list.component.html',
  styleUrl: './materials-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialsListComponent implements OnInit, AfterViewInit {
  private materialsService = inject(MaterialsService);
  private configService = inject(MaterialsConfigService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;

  // Estado
  searchTerm = signal<string>('');
  selectedIds = signal<Set<string | number>>(new Set());
  isLoading = signal(false);
  templatesReady = signal(false);

  // Sorting y Filtros
  currentSort = signal<{ field: string; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  customFieldFilters = signal<Record<string, any>>({});

  // Estado de dropdowns de filtros
  openFilterDropdown = signal<string | null>(null);
  filterSearchTerms = signal<Record<string, string>>({});

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10);
  pageSizeOptions = [10, 20, 50, 100];

  // Datos
  materials = this.materialsService.materials;
  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

  // Campos filtrables (filterable: true)
  filterableFields = computed(() => {
    const allFields = this.gridFields();
    return allFields.filter(field =>
      field.gridConfig?.filterable === true && field.isActive
    );
  });

  // Valores únicos por campo filtrable
  uniqueValuesByField = computed(() => {
    const materials = this.materials();
    const filterableFieldsList = this.filterableFields();
    const result: Record<string, Array<{ value: any; label: string; count: number }>> = {};

    for (const field of filterableFieldsList) {
      const valuesMap = new Map<any, number>();

      for (const material of materials) {
        const value = getFieldValue(material, field.name);

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

  // Exponer Object para uso en template
  Object = Object;

  // Configuración de la tabla (se inicializa en ngAfterViewInit cuando los templates estén disponibles)
  tableConfig = signal<TableConfig<Material>>({
    columns: [],
    selectable: 'multiple',
    showSelectAll: true,
    clickableRows: false,
    hoverEffect: true,
    themeColor: 'green',
    emptyMessage: 'Comienza agregando tu primer material',
    emptyIcon: 'inventory_2',
    loadingMessage: 'Cargando materiales...'
  });

  // Materials filtrados
  filteredMaterials = computed(() => {
    let materials = this.materials();
    const search = this.searchTerm();
    const customFilters = this.customFieldFilters();
    const sort = this.currentSort();

    // 1. Filtrar por campos personalizados (filterable: true)
    if (Object.keys(customFilters).length > 0) {
      materials = materials.filter(material => {
        for (const [fieldName, filterValue] of Object.entries(customFilters)) {
          // Si el filtro está vacío o es "all", ignorar
          if (!filterValue || filterValue === '' || filterValue === 'all') {
            continue;
          }

          // Obtener el valor del campo en el material
          const materialValue = getFieldValue(material, fieldName);

          // Si el campo no existe o no coincide, filtrar
          if (materialValue === undefined || materialValue === null) {
            return false;
          }

          // Comparar valores (normalizar a string)
          if (String(materialValue) !== String(filterValue)) {
            return false;
          }
        }
        return true;
      });
    }

    // 2. Filtrar por búsqueda global
    if (search) {
      // Construir campos de búsqueda
      const searchFields: string[] = [];
      searchFields.push('name', 'code', 'description');

      for (const field of this.gridFields()) {
        if (field.name === 'name' || field.name === 'code' || field.name === 'description') {
          continue;
        }
        searchFields.push(`customFields.${field.name}`);
      }

      materials = filterData(materials, search, searchFields);
    }

    // 3. Ordenar (sortable: true)
    if (sort.field) {
      const allFields = this.gridFields();
      const sortField = allFields.find(f => f.name === sort.field);

      materials = [...materials].sort((a, b) => {
        let aValue = getFieldValue(a, sort.field);
        let bValue = getFieldValue(b, sort.field);

        // Manejar valores null/undefined
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';

        // Ordenar según tipo de campo
        let comparison = 0;

        if (sortField) {
          if (sortField.type === 'number' || sortField.type === 'currency') {
            comparison = Number(aValue) - Number(bValue);
          } else if (sortField.type === 'date') {
            const aDate = aValue instanceof Date ? aValue.getTime() : new Date(aValue).getTime();
            const bDate = bValue instanceof Date ? bValue.getTime() : new Date(bValue).getTime();
            comparison = aDate - bDate;
          } else if (sortField.type === 'checkbox') {
            comparison = (aValue === true ? 1 : 0) - (bValue === true ? 1 : 0);
          } else {
            // Texto: comparación alfabética (case-insensitive)
            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            comparison = aStr.localeCompare(bStr);
          }
        } else {
          // Campo por defecto (name, code, etc): comparación alfabética
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        // Aplicar dirección (asc/desc)
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return materials;
  });

  // Materials paginados
  paginatedMaterials = computed(() => {
    return paginateData(
      this.filteredMaterials(),
      this.currentPage(),
      this.itemsPerPage()
    );
  });

  totalPages = computed(() => {
    const total = this.filteredMaterials().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  // Generic config for delete dialogs
  genericConfig = computed(() => {
    const materialConfig = this.config();
    return materialConfig ? createGenericConfig(materialConfig) : null;
  });

  constructor() {
    // Effect para actualizar la tabla cuando los templates y gridFields estén listos
    effect(() => {
      if (this.templatesReady() && this.gridFields().length > 0) {
        this.updateTableConfig();
      }
    });
  }

  async ngOnInit() {
    this.isLoading.set(true);
    await Promise.all([
      this.configService.initialize(),
      this.materialsService.initialize()
    ]);

    // Cargar configuración de paginación
    const config = this.config();
    if (config?.gridConfig) {
      this.itemsPerPage.set(config.gridConfig.itemsPerPage || 10);
    }

    this.isLoading.set(false);
  }

  ngAfterViewInit() {
    // Asegurarnos de que los templates estén realmente disponibles
    setTimeout(() => {
      this.templatesReady.set(true);
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Actualiza la configuración de la tabla (debe llamarse después de que los templates estén disponibles)
   */
  private updateTableConfig() {
    this.tableConfig.set({
      columns: this.buildTableColumns(),
      selectable: 'multiple',
      showSelectAll: true,
      clickableRows: false,
      hoverEffect: true,
      sortable: true, // Habilitar sorting
      themeColor: 'green',
      emptyMessage: this.searchTerm() && this.searchTerm().length >= 2
        ? 'No se encontraron materiales con esos criterios'
        : 'Comienza agregando tu primer material',
      emptyIcon: 'inventory_2',
      loadingMessage: 'Cargando materiales...'
    });
  }

  /**
   * Construye las columnas de la tabla basándose en gridFields
   */
  private buildTableColumns(): TableColumn<Material>[] {
    const columns: TableColumn<Material>[] = [];

    // Columnas dinámicas desde configuración
    for (const field of this.gridFields()) {
      columns.push({
        id: field.id,
        label: field.label,
        field: field.name as keyof Material,
        width: field.gridConfig.gridWidth || 'auto',
        sortable: field.gridConfig?.sortable === true, // Usar configuración de sortable
        valueFormatter: (value, row) => formatFieldValue(value, field)
      });
    }

    // Columna de Estado
    columns.push({
      id: 'status',
      label: 'Estado',
      field: 'isActive',
      width: '120px',
      cellTemplate: this.statusColumnTemplate,
      cellAlign: 'left',
      sortable: false
    });

    // Columna de Acciones
    columns.push({
      id: 'actions',
      label: 'Acciones',
      width: '80px',
      cellTemplate: this.actionsColumnTemplate,
      cellAlign: 'right',
      sortable: false
    });

    return columns;
  }

  /**
   * Maneja el cambio de búsqueda
   */
  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0);

    // Actualizar el mensaje de empty state según la búsqueda
    const currentConfig = this.tableConfig();
    this.tableConfig.set({
      ...currentConfig,
      emptyMessage: term && term.length >= 2
        ? 'No se encontraron materiales con esos criterios'
        : 'Comienza agregando tu primer material'
    });
  }

  /**
   * Maneja el cambio de selección
   */
  onSelectionChange(ids: (string | number)[]) {
    this.selectedIds.set(new Set(ids));
  }

  /**
   * Navegación de páginas
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
      // Nuevo campo, ordenar ascendente
      this.currentSort.set({
        field,
        direction: 'asc'
      });
    }

    this.currentPage.set(0);
  }

  /**
   * Abrir/cerrar dropdown de filtro
   */
  toggleFilterDropdown(fieldName: string, event: Event) {
    event.stopPropagation();
    const current = this.openFilterDropdown();

    if (current === fieldName) {
      this.openFilterDropdown.set(null);
    } else {
      this.openFilterDropdown.set(fieldName);
    }
  }

  /**
   * Cerrar dropdown de filtro
   */
  closeFilterDropdown() {
    this.openFilterDropdown.set(null);
  }

  /**
   * Verificar si un dropdown está abierto
   */
  isFilterDropdownOpen(fieldName: string): boolean {
    return this.openFilterDropdown() === fieldName;
  }

  /**
   * Cambio en búsqueda interna de filtro
   */
  onFilterSearchChange(fieldName: string, value: string) {
    const current = this.filterSearchTerms();
    this.filterSearchTerms.set({
      ...current,
      [fieldName]: value
    });
  }

  /**
   * Seleccionar valor de filtro
   */
  selectFilterValue(fieldName: string, value: any, event: Event) {
    event.stopPropagation();

    const current = this.customFieldFilters();

    if (value === null || value === '' || value === 'all') {
      // Remover filtro
      const newFilters = { ...current };
      delete newFilters[fieldName];
      this.customFieldFilters.set(newFilters);
    } else {
      // Agregar/actualizar filtro
      this.customFieldFilters.set({
        ...current,
        [fieldName]: value
      });
    }

    this.currentPage.set(0);
    this.closeFilterDropdown();
  }

  /**
   * Obtener label del valor seleccionado en un filtro
   */
  getSelectedFilterLabel(fieldName: string): string {
    const filterValue = this.customFieldFilters()[fieldName];
    if (!filterValue) return 'Todos';

    const uniqueValues = this.uniqueValuesByField()[fieldName];
    if (!uniqueValues) return String(filterValue);

    const option = uniqueValues.find(opt => opt.value === filterValue);
    return option ? option.label : String(filterValue);
  }

  /**
   * Limpiar todos los filtros
   */
  clearAllFilters() {
    this.customFieldFilters.set({});
    this.currentPage.set(0);
  }

  /**
   * Crear nuevo material
   */
  createMaterial() {
    this.router.navigate(['/modules/materials/new']);
  }

  /**
   * Editar material
   */
  editMaterial(material: Material) {
    this.router.navigate(['/modules/materials', material.id, 'edit']);
  }

  /**
   * Toggle activo/inactivo
   */
  async toggleActive(material: Material) {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser?.uid) {
      this.snackBar.open('Usuario no autenticado', 'Cerrar', { duration: 3000 });
      return;
    }

    const newStatus = !material.isActive;
    const result = await this.materialsService.toggleActive(material.id, newStatus, currentUser.uid);

    if (result.success) {
      this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
    } else {
      this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
    }
  }

  /**
   * Eliminar material
   */
  async deleteMaterial(material: Material) {
    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      width: '600px',
      data: {
        entity: material as any,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.materialsService.deleteMaterial(material.id);
        if (deleteResult.success) {
          this.snackBar.open('Material eliminado exitosamente', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  /**
   * Eliminar materiales seleccionados
   */
  async deleteSelectedMaterials() {
    const selectedArray = Array.from(this.selectedIds()) as string[];

    if (selectedArray.length === 0) {
      this.snackBar.open('Selecciona al menos un material', 'Cerrar', { duration: 3000 });
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.materials().filter(m => selectedArray.includes(m.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      width: '700px',
      data: {
        entities: selectedList as any[],
        count: selectedList.length,
        config: config
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.confirmed) {
        const deleteResult = await this.materialsService.deleteMultipleMaterials(selectedArray);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedIds.set(new Set());
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  /**
   * Limpiar selección
   */
  clearSelection() {
    this.selectedIds.set(new Set());
  }

  /**
   * Ir a configuración
   */
  goToConfig() {
    this.router.navigate(['/modules/materials/config']);
  }

  /**
   * Refrescar datos
   */
  async refreshData() {
    this.isLoading.set(true);
    await this.materialsService.initialize();
    this.isLoading.set(false);
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  /**
   * Helper methods
   */
  getActiveMaterialsCount(): number {
    return this.materials().filter(m => m.isActive).length;
  }
}
