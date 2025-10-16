// src/app/admin/components/delete-module-dialog/delete-module-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SystemModule } from '../../models/system-module.interface';

export interface DeleteModuleDialogData {
  module: SystemModule;
}

@Component({
  selector: 'app-delete-module-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="max-w-[600px]">
      
      <!-- HEADER -->
      <div class="text-center px-6 pt-6 pb-4">
        <div class="warning-icon w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
          <mat-icon class="!text-[36px] text-red-600">warning</mat-icon>
        </div>
        <h2 mat-dialog-title class="text-2xl font-bold text-slate-800 m-0">
          ⚠️ Eliminar Módulo
        </h2>
      </div>

      <!-- CONTENT -->
      <mat-dialog-content class="px-6 pb-6">
        <div class="flex flex-col gap-5">
          
          <!-- Module Info -->
          <div class="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-5">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <mat-icon class="!text-2xl text-white">{{ data.module.icon }}</mat-icon>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-slate-800 mb-1">{{ data.module.label }}</h3>
                <p class="text-sm text-slate-600 mb-2">{{ data.module.description }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <mat-icon class="!text-sm">code</mat-icon>
                    {{ data.module.value }}
                  </span>
                  @if (data.module.usersCount && data.module.usersCount > 0) {
                    <span class="bg-red-100 text-red-800 px-2 py-1 rounded-md font-semibold">
                      {{ data.module.usersCount }} usuario(s) asignado(s)
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Opciones de eliminación -->
          <div class="flex flex-col gap-3">
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <mat-icon class="!text-lg text-purple-500">settings</mat-icon>
              Método de eliminación:
            </label>

            <mat-radio-group [(ngModel)]="deleteMethod" class="flex flex-col gap-3">
              
              <!-- Soft delete (recomendado) -->
              <mat-radio-button value="soft" class="option-card">
                <div class="ml-9">
                  <div class="flex items-center gap-3 mb-1">
                    <mat-icon class="!text-xl text-amber-500">visibility_off</mat-icon>
                    <span class="text-base font-semibold text-slate-800">Desactivar (Recomendado)</span>
                  </div>
                  <p class="text-sm text-slate-600 m-0">
                    El módulo se ocultará pero se conservarán los datos y asignaciones
                  </p>
                </div>
              </mat-radio-button>

              <!-- Hard delete -->
              <mat-radio-button 
                value="hard" 
                class="option-card danger-option"
                [disabled]="data.module.usersCount && data.module.usersCount > 0">
                <div class="ml-9">
                  <div class="flex items-center gap-3 mb-1">
                    <mat-icon class="!text-xl text-red-600">delete_forever</mat-icon>
                    <span class="text-base font-semibold text-slate-800">Eliminar Permanentemente</span>
                  </div>
                  <p class="text-sm text-red-900 font-semibold m-0">
                    @if (data.module.usersCount && data.module.usersCount > 0) {
                      ⚠️ No disponible: {{ data.module.usersCount }} usuario(s) tienen este módulo asignado
                    } @else {
                      ⚠️ Esta acción NO se puede deshacer
                    }
                  </p>
                </div>
              </mat-radio-button>

            </mat-radio-group>
          </div>

          <!-- Advertencias -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div class="flex items-start gap-3 text-amber-900 text-sm font-medium mb-2">
              <mat-icon class="!text-lg text-red-600 flex-shrink-0">error</mat-icon>
              <span>
                @if (deleteMethod === 'hard') {
                  La eliminación permanente borrará todos los datos del módulo
                } @else {
                  El módulo desactivado podrá ser reactivado más tarde
                }
              </span>
            </div>
            @if (data.module.usersCount && data.module.usersCount > 0) {
              <div class="flex items-start gap-3 text-amber-900 text-sm font-medium">
                <mat-icon class="!text-lg text-amber-600 flex-shrink-0">info</mat-icon>
                <span>Los usuarios con este módulo asignado mantendrán la asignación</span>
              </div>
            }
          </div>

        </div>
      </mat-dialog-content>

      <!-- ACTIONS -->
      <mat-dialog-actions class="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
        <button 
          mat-stroked-button 
          (click)="onCancel()"
          [disabled]="isDeleting"
          class="!px-5 !py-2.5">
          <mat-icon>close</mat-icon>
          Cancelar
        </button>
        
        <button 
          mat-raised-button 
          (click)="onConfirm()"
          [disabled]="isDeleting"
          [class.!bg-amber-500]="deleteMethod === 'soft'"
          [class.!bg-red-600]="deleteMethod === 'hard'"
          class="!text-white !px-5 !py-2.5">
          @if (isDeleting) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>{{ deleteMethod === 'hard' ? 'delete_forever' : 'visibility_off' }}</mat-icon>
          }
          {{ isDeleting ? 'Procesando...' : (deleteMethod === 'hard' ? 'Eliminar Permanentemente' : 'Desactivar Módulo') }}
        </button>
      </mat-dialog-actions>
      
    </div>
  `,
  styles: [`
    .warning-icon {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .option-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .option-card:hover {
      border-color: #8b5cf6;
      background: #faf5ff;
    }

    .option-card.danger-option {
      border-color: #fecaca;
      background: #fef2f2;
    }

    .option-card.danger-option:hover:not([disabled]) {
      border-color: #dc2626;
    }

    ::ng-deep .option-card.mat-mdc-radio-button.mat-mdc-radio-checked {
      border-color: #8b5cf6;
      background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
    }

    ::ng-deep .option-card.danger-option.mat-mdc-radio-button.mat-mdc-radio-checked {
      border-color: #dc2626;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    }

    ::ng-deep .mat-mdc-radio-button.mat-mdc-radio-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class DeleteModuleDialogComponent {
  deleteMethod: 'soft' | 'hard' = 'soft';
  isDeleting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteModuleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteModuleDialogData
  ) {}

  onConfirm(): void {
    if (!this.isDeleting) {
      this.isDeleting = true;
      this.dialogRef.close({ 
        confirmed: true, 
        hardDelete: this.deleteMethod === 'hard' 
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}