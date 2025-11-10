import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { MaterialsService, MaterialsConfigService } from '../../services';
import { Material } from '../../models';
import { GenericDeleteDialogComponent } from '../../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';
import { createGenericConfig } from '../../config/materials.config';
import { AuthService } from '../../../../core/services/auth.service';
import { formatFieldValue, getFieldValue } from '../../../../shared/modules/dynamic-form-builder/utils';

@Component({
  selector: 'app-materials-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatMenuModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './materials-list.component.html',
  styleUrl: './materials-list.component.css'
})
export class MaterialsListComponent implements OnInit {
  searchTerm = signal<string>('');
  selectedMaterials = signal<string[]>([]);
  isLoading = false;

  // Paginación
  currentPage = signal<number>(0);
  itemsPerPage = signal<number>(25);

  // Math para templates
  Math = Math;

  materials = this.materialsService.materials;

  // Materials filtrados
  filteredMaterials = computed(() => {
    const materials = this.materials();
    const search = this.searchTerm().toLowerCase();

    if (!search) return materials;

    return materials.filter(m =>
      m.name.toLowerCase().includes(search) ||
      m.code.toLowerCase().includes(search) ||
      (m.description && m.description.toLowerCase().includes(search))
    );
  });

  // Materials paginados
  paginatedMaterials = computed(() => {
    const materials = this.filteredMaterials();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = page * perPage;
    const end = start + perPage;

    return materials.slice(start, end);
  });

  totalPages = computed(() => {
    const total = this.filteredMaterials().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage);
  });

  config = this.configService.config;
  gridFields = computed(() => this.configService.getGridFields());

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
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await Promise.all([
      this.configService.initialize(),
      this.materialsService.initialize()
    ]);

    // Cargar configuración de paginación
    const config = this.config();
    if (config && config.gridConfig) {
      this.itemsPerPage.set(config.gridConfig.itemsPerPage || 25);
    }

    this.isLoading = false;
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(0); // Reset a primera página al buscar
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  createMaterial() {
    this.router.navigate(['/modules/materials/new']);
  }

  editMaterial(material: Material) {
    this.router.navigate(['/modules/materials', material.id, 'edit']);
  }

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

  async deleteSelectedMaterials() {
    const selectedIds = this.selectedMaterials();
    if (selectedIds.length === 0) {
      this.snackBar.open('Selecciona al menos un material', 'Cerrar', { duration: 3000 });
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.materials().filter(m => selectedIds.includes(m.id));

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
        const deleteResult = await this.materialsService.deleteMultipleMaterials(selectedIds);

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedMaterials.set([]);
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(materialId: string) {
    const selected = this.selectedMaterials();
    if (selected.includes(materialId)) {
      this.selectedMaterials.set(selected.filter(id => id !== materialId));
    } else {
      this.selectedMaterials.set([...selected, materialId]);
    }
  }

  isSelected(materialId: string): boolean {
    return this.selectedMaterials().includes(materialId);
  }

  toggleSelectAll() {
    const selected = this.selectedMaterials();
    const paginated = this.paginatedMaterials();

    if (selected.length === paginated.length) {
      this.clearSelection();
    } else {
      this.selectedMaterials.set(paginated.map(material => material.id));
    }
  }

  isAllSelected(): boolean {
    const selected = this.selectedMaterials();
    const paginated = this.paginatedMaterials();
    return paginated.length > 0 && selected.length === paginated.length;
  }

  isIndeterminate(): boolean {
    const selected = this.selectedMaterials();
    const paginated = this.paginatedMaterials();
    return selected.length > 0 && selected.length < paginated.length;
  }

  clearSelection() {
    this.selectedMaterials.set([]);
  }

  goToConfig() {
    this.router.navigate(['/modules/materials/config']);
  }

  async refreshData() {
    this.isLoading = true;
    await this.materialsService.initialize();
    this.isLoading = false;
    this.snackBar.open('Datos actualizados', 'Cerrar', { duration: 2000 });
  }

  trackById(index: number, material: Material): string {
    return material.id;
  }

  /**
   * Helper methods to avoid arrow functions in templates
   */
  getActiveMaterials(): Material[] {
    return this.materials().filter(m => m.isActive);
  }

  getActiveMaterialsCount(): number {
    return this.getActiveMaterials().length;
  }

  getFilteredActiveMaterials(): Material[] {
    return this.filteredMaterials().filter(m => m.isActive);
  }

  // Usar funciones compartidas de formateo
  formatFieldValue = formatFieldValue;
  getFieldValue = getFieldValue;
}
