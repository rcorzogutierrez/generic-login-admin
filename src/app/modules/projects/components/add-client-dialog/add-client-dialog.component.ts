// src/app/modules/projects/components/add-client-dialog/add-client-dialog.component.ts

import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ClientsService } from '../../../clients/services/clients.service';
import { ClientConfigServiceRefactored } from '../../../clients/services/client-config-refactored.service';
import { CreateClientData } from '../../../clients/models';
import { FieldConfig, FieldType } from '../../../clients/models/field-config.interface';

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
export class AddClientDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientsService = inject(ClientsService);
  private configService = inject(ClientConfigServiceRefactored);
  private dialogRef = inject(MatDialogRef<AddClientDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(false);
  fields = signal<FieldConfig[]>([]);
  clientForm!: FormGroup;

  // Expose FieldType to template
  FieldType = FieldType;

  constructor() {}

  async ngOnInit() {
    await this.initForm();
  }

  async initForm() {
    try {
      this.isLoading.set(true);

      // Cargar configuración de campos
      await this.configService.initialize();

      // Obtener campos activos ordenados
      const activeFields = this.configService.getActiveFields();

      console.log('📝 ADD CLIENT DIALOG: Campos activos cargados:', activeFields.length);
      console.log('   Lista de campos:');
      activeFields.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.label} (${f.name}) - isActive: ${f.isActive} - Tipo: ${f.type} - formOrder: ${f.formOrder}`);
      });

      if (activeFields.length === 0) {
        this.snackBar.open('No hay campos configurados. Contacta al administrador.', 'Cerrar', { duration: 5000 });
        this.dialogRef.close();
        return;
      }

      this.fields.set(activeFields);

      // Construir formulario dinámico
      this.buildForm();
      this.cdr.markForCheck();

    } catch (error) {
      console.error('Error inicializando formulario:', error);
      this.snackBar.open('Error al cargar el formulario', 'Cerrar', { duration: 3000 });
      this.dialogRef.close();
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private buildForm() {
    const formControls: any = {};
    const fields = this.fields();

    fields.forEach(field => {
      // Para campos tipo DICTIONARY, crear un control por cada opción
      if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
        field.options.forEach(option => {
          const controlName = `${field.name}_${option.value}`;
          const validators = field.validation.required ? [Validators.required] : [];
          formControls[controlName] = ['', validators];
        });
      } else if (field.type !== FieldType.DICTIONARY) {
        // Para otros tipos de campos
        const initialValue = this.getDefaultValueByType(field.type);
        const validators = this.createValidators(field);
        formControls[field.name] = [initialValue, validators];
      }
    });

    this.clientForm = this.fb.group(formControls);
  }

  private getDefaultValueByType(type: FieldType): any {
    switch (type) {
      case FieldType.CHECKBOX:
        return false;
      case FieldType.NUMBER:
      case FieldType.CURRENCY:
        return null;
      case FieldType.MULTISELECT:
        return [];
      default:
        return '';
    }
  }

  private createValidators(field: FieldConfig): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    const validation = field.validation;

    if (validation.required) {
      validators.push(Validators.required);
    }

    if (validation.minLength) {
      validators.push(Validators.minLength(validation.minLength));
    }

    if (validation.maxLength) {
      validators.push(Validators.maxLength(validation.maxLength));
    }

    if (validation.pattern) {
      validators.push(Validators.pattern(validation.pattern));
    }

    if (validation.email || field.type === FieldType.EMAIL) {
      validators.push(Validators.email);
    }

    if (validation.min !== undefined) {
      validators.push(Validators.min(validation.min));
    }

    if (validation.max !== undefined) {
      validators.push(Validators.max(validation.max));
    }

    if (validation.url || field.type === FieldType.URL) {
      validators.push(this.urlValidator());
    }

    return validators;
  }

  private urlValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null;
      }

      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const valid = urlPattern.test(control.value);

      return valid ? null : { url: { value: control.value } };
    };
  }

  async save() {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.isLoading.set(true);
      const formValue = this.clientForm.value;

      // Separar campos por defecto y personalizados
      const defaultFields: any = {};
      const customFields: any = {};

      this.fields().forEach(field => {
        if (field.type === FieldType.DICTIONARY && field.options && field.options.length > 0) {
          const dictionaryValue: any = {};

          field.options.forEach(option => {
            const controlName = `${field.name}_${option.value}`;
            const value = formValue[controlName];
            dictionaryValue[option.value] = value || '';
          });

          if (field.isDefault) {
            defaultFields[field.name] = dictionaryValue;
          } else {
            customFields[field.name] = dictionaryValue;
          }
        } else {
          const value = formValue[field.name];

          if (field.isDefault) {
            defaultFields[field.name] = value;
          } else {
            customFields[field.name] = value;
          }
        }
      });

      const clientData: CreateClientData = {
        ...defaultFields,
        customFields
      };

      const newClient = await this.clientsService.createClient(clientData);
      this.snackBar.open('Cliente creado exitosamente', 'Cerrar', { duration: 2000 });
      this.dialogRef.close(newClient);
    } catch (error) {
      console.error('Error creando cliente:', error);
      this.snackBar.open('Error al crear el cliente', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.clientForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const field = this.fields().find(f => f.name === fieldName);
    const errors = control.errors;

    if (errors['required']) {
      return `${field?.label || fieldName} es requerido`;
    }

    if (errors['email']) {
      return 'Formato de correo electrónico inválido';
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['maxlength']) {
      return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    }

    if (errors['min']) {
      return `El valor mínimo es ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `El valor máximo es ${errors['max'].max}`;
    }

    if (errors['pattern']) {
      return 'Formato inválido';
    }

    if (errors['url']) {
      return 'URL inválida';
    }

    return 'Campo inválido';
  }

  hasError(fieldName: string): boolean {
    const control = this.clientForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getFieldWidth(field: FieldConfig): string {
    switch (field.formWidth) {
      case 'full':
        return 'col-span-2';
      case 'half':
        return 'col-span-2 md:col-span-1';
      case 'third':
        return 'col-span-2 md:col-span-1 lg:col-span-1';
      default:
        return 'col-span-2 md:col-span-1';
    }
  }
}
