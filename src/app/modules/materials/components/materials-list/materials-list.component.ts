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
  searchTerm = '';
  selectedMaterials = new Set<string>();
  isLoading = false;

  materials = this.materialsService.materials;
  filteredMaterials = signal<Material[]>([]);
  displayedMaterials = signal<Material[]>([]);

  config = this.configService.config;

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
    private router: Router
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await Promise.all([
      this.configService.initialize(),
      this.materialsService.initialize()
    ]);
    this.applyFilters();
    this.isLoading = false;
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase().trim();
    const materials = this.materials();

    if (!term) {
      this.filteredMaterials.set(materials);
    } else {
      this.filteredMaterials.set(
        materials.filter(m =>
          m.name.toLowerCase().includes(term) ||
          m.code.toLowerCase().includes(term) ||
          (m.description && m.description.toLowerCase().includes(term))
        )
      );
    }

    this.displayedMaterials.set(this.filteredMaterials().slice(0, 50));
  }

  createMaterial() {
    this.router.navigate(['/modules/materials/new']);
  }

  editMaterial(material: Material) {
    this.router.navigate(['/modules/materials/edit', material.id]);
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
          this.applyFilters();
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  async deleteSelectedMaterials() {
    if (this.selectedMaterials.size === 0) {
      this.snackBar.open('Selecciona al menos un material', 'Cerrar', { duration: 3000 });
      return;
    }

    const config = this.genericConfig();
    if (!config) {
      this.snackBar.open('Configuración no disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    const selectedList = this.materials().filter(m => this.selectedMaterials.has(m.id));

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
        const deleteResult = await this.materialsService.deleteMultipleMaterials(
          Array.from(this.selectedMaterials)
        );

        if (deleteResult.success) {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 3000 });
          this.selectedMaterials.clear();
          this.applyFilters();
        } else {
          this.snackBar.open(deleteResult.message, 'Cerrar', { duration: 4000 });
        }
      }
    });
  }

  toggleSelection(materialId: string) {
    if (this.selectedMaterials.has(materialId)) {
      this.selectedMaterials.delete(materialId);
    } else {
      this.selectedMaterials.add(materialId);
    }
  }

  isSelected(materialId: string): boolean {
    return this.selectedMaterials.has(materialId);
  }

  toggleSelectAll() {
    if (this.selectedMaterials.size === this.displayedMaterials().length) {
      this.clearSelection();
    } else {
      this.displayedMaterials().forEach(material => {
        this.selectedMaterials.add(material.id);
      });
    }
  }

  clearSelection() {
    this.selectedMaterials.clear();
  }

  goToConfig() {
    this.router.navigate(['/modules/materials/config']);
  }

  async refreshData() {
    this.isLoading = true;
    await this.materialsService.initialize();
    this.applyFilters();
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
}
