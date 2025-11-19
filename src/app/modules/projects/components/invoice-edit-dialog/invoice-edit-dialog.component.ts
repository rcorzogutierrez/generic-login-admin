// src/app/modules/projects/components/invoice-edit-dialog/invoice-edit-dialog.component.ts

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Proposal, MaterialUsed, Worker } from '../../models';
import { ProposalsService } from '../../services/proposals.service';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-invoice-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './invoice-edit-dialog.component.html',
  styleUrls: ['./invoice-edit-dialog.component.css']
})
export class InvoiceEditDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<InvoiceEditDialogComponent>);
  private proposalsService = inject(ProposalsService);
  private snackBar = inject(MatSnackBar);
  public data = inject<{ proposal: Proposal }>(MAT_DIALOG_DATA);

  invoiceForm!: FormGroup;
  isSaving = signal(false);

  ngOnInit() {
    this.initForm();
  }

  /**
   * Inicializar formulario
   */
  initForm() {
    const proposal = this.data.proposal;

    this.invoiceForm = this.fb.group({
      workStartDate: [proposal.workStartDate?.toDate() || null],
      workEndDate: [proposal.workEndDate?.toDate() || null],
      workTime: [proposal.workTime || null, [Validators.min(0)]],
      workers: this.fb.array(
        proposal.workers?.map(w => this.createWorkerFormGroup(w)) || []
      ),
      materialsUsed: this.fb.array(
        proposal.materialsUsed?.map(m => this.createMaterialFormGroup(m)) || []
      )
    });
  }

  /**
   * Crear FormGroup para un trabajador
   */
  createWorkerFormGroup(worker?: Worker): FormGroup {
    return this.fb.group({
      id: [worker?.id || `worker-${Date.now()}-${Math.random()}`],
      name: [worker?.name || '', Validators.required],
      role: [worker?.role || '']
    });
  }

  /**
   * Crear FormGroup para un material
   */
  createMaterialFormGroup(material?: MaterialUsed): FormGroup {
    return this.fb.group({
      id: [material?.id || `material-${Date.now()}-${Math.random()}`],
      material: [material?.material || '', Validators.required],
      amount: [material?.amount || 0, [Validators.required, Validators.min(0)]],
      price: [material?.price || 0, [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Getters para FormArrays
   */
  get workers(): FormArray {
    return this.invoiceForm.get('workers') as FormArray;
  }

  get materialsUsed(): FormArray {
    return this.invoiceForm.get('materialsUsed') as FormArray;
  }

  /**
   * Agregar trabajador
   */
  addWorker() {
    this.workers.push(this.createWorkerFormGroup());
  }

  /**
   * Eliminar trabajador
   */
  removeWorker(index: number) {
    this.workers.removeAt(index);
  }

  /**
   * Agregar material
   */
  addMaterial() {
    this.materialsUsed.push(this.createMaterialFormGroup());
  }

  /**
   * Eliminar material
   */
  removeMaterial(index: number) {
    this.materialsUsed.removeAt(index);
  }

  /**
   * Guardar cambios
   * @param asDraft - Si es true, guarda como borrador sin validaciones estrictas
   */
  async save(asDraft: boolean = false) {
    // Si NO es borrador, validar formulario completo
    if (!asDraft && this.invoiceForm.invalid) {
      this.snackBar.open('Por favor, completa todos los campos requeridos', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    try {
      this.isSaving.set(true);
      const formValue = this.invoiceForm.value;

      const updateData: any = {
        workers: formValue.workers || [],
        materialsUsed: formValue.materialsUsed || [],
        workTime: formValue.workTime || null
      };

      // Convertir fechas a Timestamp si existen
      if (formValue.workStartDate) {
        updateData.workStartDate = Timestamp.fromDate(new Date(formValue.workStartDate));
      }
      if (formValue.workEndDate) {
        updateData.workEndDate = Timestamp.fromDate(new Date(formValue.workEndDate));
      }

      await this.proposalsService.updateProposal(this.data.proposal.id, updateData);

      this.snackBar.open(
        asDraft ? 'Borrador de factura guardado exitosamente' : 'Datos de factura actualizados exitosamente',
        'Cerrar',
        { duration: 3000 }
      );

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error guardando datos de factura:', error);
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
