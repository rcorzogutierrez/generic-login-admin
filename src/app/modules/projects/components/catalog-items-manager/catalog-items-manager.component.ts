// src/app/modules/projects/components/catalog-items-manager/catalog-items-manager.component.ts

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CatalogItemsService } from '../../services/catalog-items.service';
import { CatalogItem, CreateCatalogItemData } from '../../models';

@Component({
  selector: 'app-catalog-items-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './catalog-items-manager.component.html',
  styleUrl: './catalog-items-manager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogItemsManagerComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<CatalogItemsManagerComponent>);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private catalogItemsService = inject(CatalogItemsService);
  private snackBar = inject(MatSnackBar);

  // Signals
  catalogItems = this.catalogItemsService.catalogItems;
  isLoading = this.catalogItemsService.isLoading;
  isEditMode = signal<boolean>(false);
  editingItemId = signal<string | null>(null);
  searchTerm = signal<string>('');

  // Form
  itemForm!: FormGroup;

  ngOnInit() {
    this.initForm();
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  /**
   * Buscar items
   */
  get filteredItems(): CatalogItem[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.catalogItems();
    }

    return this.catalogItems().filter(item => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term) || false;
      return nameMatch || descMatch;
    });
  }

  /**
   * Manejar cambio en búsqueda
   */
  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  /**
   * Crear o actualizar item
   */
  async saveItem() {
    if (this.itemForm.invalid) {
      this.snackBar.open('Por favor completa el nombre del item', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      const formValue = this.itemForm.value;

      // Construir itemData solo con campos que tienen valor
      const itemData: CreateCatalogItemData = {
        name: formValue.name,
        order: this.catalogItems().length + 1
      };

      // Solo agregar description si tiene valor
      if (formValue.description && formValue.description.trim()) {
        itemData.description = formValue.description.trim();
      }

      if (this.isEditMode() && this.editingItemId()) {
        // Actualizar item existente
        await this.catalogItemsService.updateItem(this.editingItemId()!, itemData);
        this.snackBar.open('Item actualizado exitosamente', 'Cerrar', { duration: 3000 });
      } else {
        // Crear nuevo item
        await this.catalogItemsService.createItem(itemData);
        this.snackBar.open('Item creado exitosamente', 'Cerrar', { duration: 3000 });
      }

      this.resetForm();
    } catch (error) {
      console.error('Error guardando item:', error);
      this.snackBar.open('Error al guardar el item', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Editar item
   */
  editItem(item: CatalogItem) {
    this.isEditMode.set(true);
    this.editingItemId.set(item.id);

    this.itemForm.patchValue({
      name: item.name,
      description: item.description || ''
    });

    // Scroll to form
    setTimeout(() => {
      document.querySelector('.item-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  /**
   * Eliminar item
   */
  async deleteItem(item: CatalogItem) {
    // Importar dinámicamente el diálogo de confirmación
    const { ConfirmDialogComponent } = await import('../confirm-dialog/confirm-dialog.component');

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Eliminar Item',
        message: `¿Estás seguro de eliminar "${item.name}"?\n\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.catalogItemsService.deleteItem(item.id);
          this.snackBar.open('Item eliminado exitosamente', 'Cerrar', { duration: 3000 });

          // Si estábamos editando este item, resetear form
          if (this.editingItemId() === item.id) {
            this.resetForm();
          }
        } catch (error) {
          console.error('Error eliminando item:', error);
          this.snackBar.open('Error al eliminar el item', 'Cerrar', { duration: 3000 });
        }
      }
    });
  }

  /**
   * Resetear formulario
   */
  resetForm() {
    this.itemForm.reset();
    this.isEditMode.set(false);
    this.editingItemId.set(null);
  }

  /**
   * Cerrar dialog
   */
  close() {
    this.dialogRef.close();
  }
}
