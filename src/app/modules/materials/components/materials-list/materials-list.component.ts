import { Component, OnInit, AfterViewInit, signal, computed, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
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
  styleUrl: './materials-list.component.css'
})
export class MaterialsListComponent implements OnInit, AfterViewInit {
  @ViewChild('statusColumn') statusColumnTemplate!: TemplateRef<any>;
  @ViewChild('actionsColumn') actionsColumnTemplate!: TemplateRef<any>;

  // Estado
  searchTerm = signal<string>('');
  selectedIds = signal<Set<string | number>>(new Set());
  isLoading = signal(false);

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(10);
  pageSizeOptions = [10, 20, 50, 100];

  // Datos
  materials = this.materialsService.materials;
  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

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
    const materials = this.materials();
    const search = this.searchTerm();

    if (!search) return materials;

    // Construir campos de búsqueda
    const searchFields: string[] = [];

    // Agregar campos del sistema
    searchFields.push('name', 'code', 'description');

    // Agregar campos personalizados con prefijo 'customFields.'
    for (const field of this.gridFields()) {
      // Si es campo del sistema, agregar directamente
      if (field.name === 'name' || field.name === 'code' || field.name === 'description') {
        continue; // Ya lo agregamos arriba
      }
      // Si es campo personalizado, agregar con prefijo
      searchFields.push(`customFields.${field.name}`);
    }

    return filterData(materials, search, searchFields);
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

  constructor(
    private materialsService: MaterialsService,
    private configService: MaterialsConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

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

    // Esperar al siguiente ciclo para que los templates estén disponibles
    setTimeout(() => {
      this.updateTableConfig();
      this.cdr.detectChanges();
    }, 0);
  }

  ngAfterViewInit() {
    // Los templates están disponibles aquí, pero esperamos a que termine ngOnInit
    // La actualización se hace en ngOnInit después del setTimeout
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
        sortable: false, // Materials no tiene sorting por ahora
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
      cellAlign: 'left'
    });

    // Columna de Acciones
    columns.push({
      id: 'actions',
      label: 'Acciones',
      width: '80px',
      cellTemplate: this.actionsColumnTemplate,
      cellAlign: 'right'
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
