// src/app/modules/projects/components/add-client-dialog/add-client-dialog.component.ts

import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ClientsService } from '../../../clients/services/clients.service';
import { CreateClientData } from '../../../clients/models';

@Component({
  selector: 'app-add-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './add-client-dialog.component.html',
  styleUrls: ['./add-client-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddClientDialogComponent {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private dialogRef = inject(MatDialogRef<AddClientDialogComponent>);
  private snackBar = inject(MatSnackBar);

  isLoading = signal<boolean>(false);
  clientForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  initForm() {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      city: [''],
      state: [''],
      zipCode: ['']
    });
  }

  async save() {
    if (this.clientForm.invalid) {
      this.snackBar.open('Por favor completa el nombre del cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isLoading.set(true);
      const formValue = this.clientForm.value;

      // Construir dirección completa con estado y zip code si se proporcionan
      let fullAddress = formValue.address || '';
      if (formValue.state || formValue.zipCode) {
        const parts = [fullAddress, formValue.state, formValue.zipCode].filter(p => p);
        fullAddress = parts.join(', ');
      }

      const clientData: CreateClientData = {
        name: formValue.name,
        email: formValue.email || undefined,
        phone: formValue.phone || undefined,
        address: fullAddress || undefined,
        city: formValue.city || undefined,
        customFields: {
          state: formValue.state || '',
          zipCode: formValue.zipCode || ''
        }
      };

      const newClient = await this.clientsService.createClient(clientData);
      this.snackBar.open('Cliente creado exitosamente', 'Cerrar', { duration: 2000 });
      this.dialogRef.close(newClient);
    } catch (error) {
      console.error('Error creando cliente:', error);
      this.snackBar.open('Error al crear el cliente', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
