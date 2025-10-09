// src/app/admin/components/system-config/system-config.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SystemConfigService } from '../../services/system-config.service';
import { AuthService } from '../../../core/services/auth.service';
import { SystemConfig } from '../../models/system-config.interface';

@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './system-config.component.html',
  styleUrl: './system-config.component.css'
})
export class SystemConfigComponent implements OnInit {
  configForm!: FormGroup;
  isLoading = signal(true);
  isSaving = signal(false);
  
  currentConfig = this.configService.config;
  currentUser = this.authService.authorizedUser;
  
  // Logo preview
  logoPreviewUrl = signal<string>('');
  selectedLogoFile = signal<File | null>(null);
  isUploadingLogo = signal(false);

  constructor(
    private fb: FormBuilder,
    private configService: SystemConfigService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadConfiguration();
    this.initializeForm();
  }

  /**
   * Carga la configuración actual
   */
  async loadConfiguration() {
    try {
      this.isLoading.set(true);
      const config = await this.configService.loadConfig();
      this.logoPreviewUrl.set(config.logoUrl || '');
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.snackBar.open('Error al cargar la configuración', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Inicializa el formulario con los valores actuales
   */
  private initializeForm() {
    const config = this.currentConfig();
    
    this.configForm = this.fb.group({
      appName: [
        config?.appName || '', 
        [Validators.required, Validators.maxLength(50)]
      ],
      appDescription: [
        config?.appDescription || '', 
        [Validators.maxLength(200)]
      ],
      adminContactEmail: [
        config?.adminContactEmail || '', 
        [Validators.required, Validators.email]
      ],
      footerText: [
        config?.footerText || '', 
        [Validators.maxLength(100)]
      ]
    });
  }

  /**
   * Maneja la selección de archivo de logo
   */
  onLogoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedLogoFile.set(file);
      
      // Preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Sube el logo seleccionado
   */
  async uploadLogo() {
    const file = this.selectedLogoFile();
    const currentUserUid = this.currentUser()?.uid;
    
    if (!file || !currentUserUid) {
      this.snackBar.open('Selecciona un archivo válido', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isUploadingLogo.set(true);

    try {
      const result = await this.configService.uploadLogo(file, currentUserUid);
      
      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
        this.selectedLogoFile.set(null);
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }
    } catch (error: any) {
      this.snackBar.open('Error al subir el logo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isUploadingLogo.set(false);
    }
  }

  /**
   * Elimina el logo actual
   */
  async removeLogo() {
    const currentUserUid = this.currentUser()?.uid;
    
    if (!currentUserUid) return;

    const confirm = window.confirm('¿Seguro que quieres eliminar el logo actual?');
    if (!confirm) return;

    this.isUploadingLogo.set(true);

    try {
      const result = await this.configService.removeCurrentLogo(currentUserUid);
      
      if (result.success) {
        this.logoPreviewUrl.set('');
        this.selectedLogoFile.set(null);
        this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Error al eliminar el logo', 'Cerrar', { duration: 3000 });
    } finally {
      this.isUploadingLogo.set(false);
    }
  }

  /**
   * Guarda la configuración (sin logo)
   */
  async saveConfiguration() {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      this.snackBar.open('Completa todos los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const currentUserUid = this.currentUser()?.uid;
    if (!currentUserUid) return;

    this.isSaving.set(true);

    try {
      const formValue = this.configForm.value;
      
      const result = await this.configService.updateConfig({
        appName: formValue.appName.trim(),
        appDescription: formValue.appDescription?.trim() || '',
        adminContactEmail: formValue.adminContactEmail.trim(),
        footerText: formValue.footerText?.trim() || ''
      }, currentUserUid);

      if (result.success) {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      } else {
        this.snackBar.open(result.message, 'Cerrar', { duration: 4000 });
      }

    } catch (error: any) {
      this.snackBar.open('Error al guardar la configuración', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Vuelve al panel de admin
   */
  goBack() {
    this.router.navigate(['/admin']);
  }

  /**
   * Obtiene mensaje de error del campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.configForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    
    if (control?.hasError('email')) {
      return 'Email no válido';
    }
    
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    
    return '';
  }

  /**
   * Verifica si un campo es inválido
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.configForm.get(fieldName);
    return !!(control?.invalid && (control?.dirty || control?.touched));
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }
}