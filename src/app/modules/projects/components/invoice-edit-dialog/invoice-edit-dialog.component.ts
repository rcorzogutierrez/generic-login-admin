// src/app/modules/projects/components/invoice-edit-dialog/invoice-edit-dialog.component.ts

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Proposal } from '../../models';
import { ProposalsService } from '../../services/proposals.service';
import { MaterialsService } from '../../../materials/services/materials.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { Material } from '../../../materials/models';
import { Worker } from '../../../workers/models';
import { Timestamp } from 'firebase/firestore';

interface SelectedMaterial {
  materialId: string;
  materialName: string;
  amount: number;
  price: number;
}

interface SelectedWorker {
  workerId: string;
  workerName: string;
}

@Component({
  selector: 'app-invoice-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './invoice-edit-dialog.component.html',
  styleUrls: ['./invoice-edit-dialog.component.css']
})
export class InvoiceEditDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<InvoiceEditDialogComponent>);
  private proposalsService = inject(ProposalsService);
  private materialsService = inject(MaterialsService);
  private workersService = inject(WorkersService);
  private snackBar = inject(MatSnackBar);
  public data = inject<{ proposal: Proposal }>(MAT_DIALOG_DATA);

  // Signals
  isSaving = signal(false);
  availableMaterials = signal<Material[]>([]);
  availableWorkers = signal<Worker[]>([]);

  // Form data
  workStartDate: string = '';
  workEndDate: string = '';
  workTime: number | null = null;
  selectedMaterials: SelectedMaterial[] = [];
  selectedWorkers: SelectedWorker[] = [];

  async ngOnInit() {
    console.log('🚀 Iniciando InvoiceEditDialogComponent');
    console.log('📦 Datos del proposal:', this.data.proposal);

    try {
      await this.loadData();
      this.initFormData();
    } catch (error) {
      console.error('❌ Error en ngOnInit:', error);
    }
  }

  /**
   * Cargar materiales y trabajadores disponibles
   */
  async loadData() {
    console.log('⏳ Cargando materiales y trabajadores...');

    try {
      // Inicializar servicios en paralelo (como lo hace proposal-form)
      console.log('🔧 Inicializando MaterialsService y WorkersService...');
      await Promise.all([
        this.materialsService.initialize(),
        this.workersService.initialize()
      ]);
      console.log('✅ Servicios inicializados');

      // Los signals de los servicios ya están actualizados después de initialize()
      // Simplemente leemos los valores actuales
      const materials = this.materialsService.activeMaterials();
      const workers = this.workersService.activeWorkers();

      console.log('📊 Datos cargados:');
      console.log('  - Materiales activos:', materials.length);
      console.log('  - Trabajadores activos:', workers.length);

      if (materials.length > 0) {
        console.log('  - Primer material:', materials[0]);
      }
      if (workers.length > 0) {
        console.log('  - Primer trabajador:', workers[0]);
      }

      this.availableMaterials.set(materials);
      this.availableWorkers.set(workers);

      console.log('✅ Datos asignados a signals');
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.snackBar.open('Error al cargar materiales y trabajadores', 'Cerrar', {
        duration: 3000
      });
      throw error;
    }
  }

  /**
   * Inicializar datos del formulario con los datos existentes del proposal
   */
  initFormData() {
    console.log('📝 Inicializando datos del formulario...');
    const proposal = this.data.proposal;

    // Fechas
    if (proposal.workStartDate) {
      const date = proposal.workStartDate.toDate();
      this.workStartDate = date.toISOString().split('T')[0];
      console.log('  ✓ workStartDate:', this.workStartDate);
    }
    if (proposal.workEndDate) {
      const date = proposal.workEndDate.toDate();
      this.workEndDate = date.toISOString().split('T')[0];
      console.log('  ✓ workEndDate:', this.workEndDate);
    }

    // Tiempo de trabajo
    this.workTime = proposal.workTime || null;
    console.log('  ✓ workTime:', this.workTime);

    // Materiales
    if (proposal.materialsUsed && proposal.materialsUsed.length > 0) {
      this.selectedMaterials = proposal.materialsUsed.map(m => ({
        materialId: m.id,
        materialName: m.material,
        amount: m.amount,
        price: m.price
      }));
      console.log('  ✓ Materiales cargados:', this.selectedMaterials.length);
    } else {
      console.log('  ℹ️ No hay materiales previos');
    }

    // Trabajadores
    if (proposal.workers && proposal.workers.length > 0) {
      this.selectedWorkers = proposal.workers.map(w => ({
        workerId: w.id,
        workerName: w.name
      }));
      console.log('  ✓ Trabajadores cargados:', this.selectedWorkers.length);
    } else {
      console.log('  ℹ️ No hay trabajadores previos');
    }

    console.log('✅ Formulario inicializado');
  }

  /**
   * Agregar material seleccionado
   */
  addMaterial(materialId: string) {
    console.log('➕ Agregando material:', materialId);
    console.log('  - Materiales disponibles:', this.availableMaterials().length);

    if (!materialId) {
      console.warn('  ⚠️ materialId está vacío');
      return;
    }

    const material = this.availableMaterials().find(m => m.id === materialId);
    if (!material) {
      console.error('  ❌ Material no encontrado:', materialId);
      return;
    }

    console.log('  - Material encontrado:', material);

    // Verificar si ya está agregado
    const exists = this.selectedMaterials.find(m => m.materialId === materialId);
    if (exists) {
      console.log('  ⚠️ Material ya está agregado');
      this.snackBar.open('Este material ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    this.selectedMaterials.push({
      materialId: material.id!,
      materialName: material.name,
      amount: 1,
      price: 0
    });

    console.log('  ✅ Material agregado. Total:', this.selectedMaterials.length);
  }

  /**
   * Eliminar material
   */
  removeMaterial(index: number) {
    this.selectedMaterials.splice(index, 1);
  }

  /**
   * Agregar trabajador seleccionado
   */
  addWorker(workerId: string) {
    console.log('➕ Agregando trabajador:', workerId);
    console.log('  - Trabajadores disponibles:', this.availableWorkers().length);

    if (!workerId) {
      console.warn('  ⚠️ workerId está vacío');
      return;
    }

    const worker = this.availableWorkers().find(w => w.id === workerId);
    if (!worker) {
      console.error('  ❌ Trabajador no encontrado:', workerId);
      return;
    }

    console.log('  - Trabajador encontrado:', worker);

    // Verificar si ya está agregado
    const exists = this.selectedWorkers.find(w => w.workerId === workerId);
    if (exists) {
      console.log('  ⚠️ Trabajador ya está agregado');
      this.snackBar.open('Este trabajador ya está agregado', 'Cerrar', { duration: 2000 });
      return;
    }

    this.selectedWorkers.push({
      workerId: worker.id!,
      workerName: worker.name
    });

    console.log('  ✅ Trabajador agregado. Total:', this.selectedWorkers.length);
  }

  /**
   * Eliminar trabajador
   */
  removeWorker(index: number) {
    this.selectedWorkers.splice(index, 1);
  }

  /**
   * Validar formulario
   */
  validate(): boolean {
    if (this.selectedMaterials.length === 0) {
      this.snackBar.open('Debes agregar al menos un material', 'Cerrar', { duration: 3000 });
      return false;
    }

    if (this.selectedWorkers.length === 0) {
      this.snackBar.open('Debes agregar al menos un trabajador', 'Cerrar', { duration: 3000 });
      return false;
    }

    // Validar que todos los materiales tengan cantidad y precio
    for (const material of this.selectedMaterials) {
      if (!material.amount || material.amount <= 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener una cantidad mayor a 0`, 'Cerrar', {
          duration: 3000
        });
        return false;
      }
      if (!material.price || material.price < 0) {
        this.snackBar.open(`El material "${material.materialName}" debe tener un precio válido`, 'Cerrar', {
          duration: 3000
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Guardar cambios y cambiar estado a 'converted_to_invoice'
   */
  async save() {
    console.log('💾 Guardando factura...');

    if (!this.validate()) {
      console.log('  ❌ Validación falló');
      return;
    }

    try {
      this.isSaving.set(true);

      const updateData: any = {
        workers: this.selectedWorkers.map(w => ({
          id: w.workerId,
          name: w.workerName
        })),
        materialsUsed: this.selectedMaterials.map(m => ({
          id: m.materialId,
          material: m.materialName,
          amount: m.amount,
          price: m.price
        })),
        workTime: this.workTime || null,
        status: 'converted_to_invoice' // Cambiar el estado al guardar
      };

      // Convertir fechas a Timestamp si existen
      if (this.workStartDate) {
        updateData.workStartDate = Timestamp.fromDate(new Date(this.workStartDate));
      }
      if (this.workEndDate) {
        updateData.workEndDate = Timestamp.fromDate(new Date(this.workEndDate));
      }

      console.log('📤 Datos a guardar:', {
        workers: updateData.workers.length,
        materials: updateData.materialsUsed.length,
        workTime: updateData.workTime,
        status: updateData.status
      });

      await this.proposalsService.updateProposal(this.data.proposal.id, updateData);

      console.log('✅ Factura guardada exitosamente');
      this.snackBar.open('Factura creada exitosamente', 'Cerrar', { duration: 3000 });

      this.dialogRef.close(true);
    } catch (error) {
      console.error('❌ Error guardando datos de factura:', error);
      this.snackBar.open('Error al guardar los datos', 'Cerrar', {
        duration: 3000
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Cancelar
   */
  cancel() {
    this.dialogRef.close(false);
  }
}
