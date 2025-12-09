import { Component, OnInit, OnDestroy, Inject, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

import { TreasuryService } from '../../services/treasury.service';
import { WorkersService } from '../../../workers/services/workers.service';
import { ProposalsService } from '../../../projects/services/proposals.service';
import { Pago, CreatePagoData, PaymentMethod } from '../../models';

export interface PagoFormDialogData {
  pago?: Pago;
}

interface SelectedProposal {
  id: string;
  proposalNumber: string;
  address: string;
  ownerName: string;
  total: number;
}

@Component({
  selector: 'app-pago-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-slate-200">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
            <mat-icon class="text-white !text-2xl">{{ isEditMode ? 'edit' : 'payments' }}</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0">
              {{ isEditMode ? 'Editar Pago' : 'Nuevo Pago' }}
            </h2>
            <p class="text-sm text-slate-500 m-0">
              {{ isEditMode ? 'Modifica los datos del pago' : 'Registra un pago a trabajador' }}
            </p>
          </div>
        </div>
        <button mat-icon-button (click)="cancel()" class="!text-slate-400">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <form [formGroup]="form" (ngSubmit)="save()" class="p-6 overflow-y-auto max-h-[65vh]">

        <!-- Trabajador -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
            <mat-icon class="!text-lg text-red-500">person</mat-icon>
            Trabajador
          </h3>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">
              Trabajador <span class="text-red-500">*</span>
            </label>
            <select
              class="input-field"
              formControlName="workerId"
              (change)="onWorkerChange($event)">
              <option value="">Seleccionar trabajador...</option>
              @for (worker of activeWorkers(); track worker.id) {
                <option [value]="worker.id">
                  {{ worker.fullName }}{{ worker.companyName ? ' - ' + worker.companyName : '' }}
                </option>
              }
            </select>
            @if (hasError('workerId')) {
              <span class="text-xs text-red-500 mt-1">Selecciona un trabajador</span>
            }
          </div>
        </div>

        <!-- Proyectos - Nuevo diseño con búsqueda y chips -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
            <mat-icon class="!text-lg text-red-500">assignment</mat-icon>
            Proyectos
          </h3>

          <!-- Selected Projects as Chips -->
          @if (selectedProposals().length > 0) {
            <div class="selected-chips-container mb-3">
              @for (proposal of selectedProposals(); track proposal.id) {
                <div class="project-chip">
                  <div class="chip-content">
                    <span class="chip-number">{{ proposal.proposalNumber }}</span>
                    <span class="chip-amount">{{ proposal.total | currency:'USD':'symbol':'1.0-0' }}</span>
                  </div>
                  <button
                    type="button"
                    class="chip-remove"
                    (click)="removeProject(proposal.id)"
                    title="Quitar proyecto">
                    <mat-icon class="!text-sm">close</mat-icon>
                  </button>
                </div>
              }
            </div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs text-slate-500">
                {{ selectedProposals().length }} proyecto(s) • Total: {{ selectedTotal() | currency:'USD':'symbol':'1.2-2' }}
              </span>
              <button
                type="button"
                class="text-xs text-red-500 hover:text-red-700 font-medium"
                (click)="clearAllProjects()">
                Limpiar todo
              </button>
            </div>
          }

          <!-- Search Input -->
          <div class="relative">
            <div class="search-input-container">
              <mat-icon class="search-icon">search</mat-icon>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar por número, dirección o cliente..."
                [value]="searchTerm()"
                (input)="onSearchChange($event)"
                (focus)="showDropdown.set(true)">
              @if (searchTerm()) {
                <button
                  type="button"
                  class="clear-search"
                  (click)="clearSearch()">
                  <mat-icon class="!text-lg">close</mat-icon>
                </button>
              }
            </div>

            <!-- Dropdown Results -->
            @if (showDropdown() && availableProposals().length > 0) {
              <div class="search-dropdown">
                <div class="dropdown-header">
                  <span>{{ filteredProposals().length }} proyectos disponibles</span>
                  @if (filteredProposals().length > 0 && filteredProposals().length <= 10) {
                    <button
                      type="button"
                      class="add-all-btn"
                      (click)="addAllFiltered()">
                      Agregar todos
                    </button>
                  }
                </div>
                <div class="dropdown-list">
                  @for (proposal of filteredProposals().slice(0, 50); track proposal.id) {
                    <div
                      class="dropdown-item"
                      (click)="addProject(proposal)">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-slate-800 text-sm">{{ proposal.proposalNumber }}</span>
                          <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            {{ proposal.total | currency:'USD':'symbol':'1.0-0' }}
                          </span>
                        </div>
                        <div class="text-xs text-slate-500 truncate">{{ proposal.address }}</div>
                        <div class="text-xs text-slate-400">{{ proposal.ownerName }}</div>
                      </div>
                      <mat-icon class="text-slate-300 !text-lg">add_circle</mat-icon>
                    </div>
                  }
                  @if (filteredProposals().length > 50) {
                    <div class="dropdown-more">
                      Mostrando 50 de {{ filteredProposals().length }} resultados. Refina tu búsqueda.
                    </div>
                  }
                </div>
              </div>
            }

            @if (showDropdown() && availableProposals().length === 0 && selectedWorkerId()) {
              <div class="search-dropdown">
                <div class="dropdown-empty">
                  <mat-icon class="!text-3xl text-slate-300 mb-2">inventory_2</mat-icon>
                  <p>No hay proyectos donde este trabajador haya participado</p>
                </div>
              </div>
            }

            @if (showDropdown() && !selectedWorkerId()) {
              <div class="search-dropdown">
                <div class="dropdown-empty">
                  <mat-icon class="!text-3xl text-slate-300 mb-2">person_search</mat-icon>
                  <p>Primero selecciona un trabajador</p>
                </div>
              </div>
            }

            @if (showDropdown() && availableProposals().length > 0 && filteredProposals().length === 0) {
              <div class="search-dropdown">
                <div class="dropdown-empty">
                  <mat-icon class="!text-3xl text-slate-300 mb-2">search_off</mat-icon>
                  <p>No se encontraron proyectos con "{{ searchTerm() }}"</p>
                </div>
              </div>
            }
          </div>

          <!-- Click outside to close -->
          @if (showDropdown()) {
            <div class="dropdown-backdrop" (click)="showDropdown.set(false)"></div>
          }

          @if (selectedProposals().length === 0 && form.touched) {
            <span class="text-xs text-red-500 mt-2 block">Selecciona al menos un proyecto</span>
          }
        </div>

        <!-- Detalles del Pago -->
        <div class="mb-6">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
            <mat-icon class="!text-lg text-red-500">payments</mat-icon>
            Detalles del Pago
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Monto -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Monto <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  class="input-field pl-7"
                  formControlName="amount"
                  placeholder="0.00"
                  step="0.01">
              </div>
              @if (hasError('amount')) {
                <span class="text-xs text-red-500 mt-1">Ingresa un monto válido</span>
              }
            </div>

            <!-- Fecha -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Fecha <span class="text-red-500">*</span>
              </label>
              <input
                type="date"
                class="input-field"
                formControlName="transactionDate">
              @if (hasError('transactionDate')) {
                <span class="text-xs text-red-500 mt-1">Selecciona la fecha</span>
              }
            </div>

            <!-- Método de pago -->
            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-slate-700 mb-2">
                Método de Pago
              </label>
              <div class="flex gap-3">
                @for (method of paymentMethods; track method.value) {
                  <label
                    class="payment-option"
                    [class.selected]="form.get('paymentMethod')?.value === method.value">
                    <input
                      type="radio"
                      formControlName="paymentMethod"
                      [value]="method.value"
                      class="hidden">
                    <mat-icon class="!text-xl">{{ method.icon }}</mat-icon>
                    <span>{{ method.label }}</span>
                  </label>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Datos del Cheque -->
        @if (form.get('paymentMethod')?.value === 'check') {
          <div class="mb-6 p-4 bg-slate-50 rounded-xl">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
              <mat-icon class="!text-lg text-red-500">money</mat-icon>
              Datos del Cheque
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Número de Cheque</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="checkNumber"
                  placeholder="Ej: 001234">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Banco</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="bankName"
                  placeholder="Ej: Bank of America">
              </div>

              <!-- Image Upload Section -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-600 mb-2">
                  <mat-icon class="!text-sm align-middle mr-1">photo_camera</mat-icon>
                  Imagen del Cheque
                </label>

                <!-- Upload Area -->
                @if (!imagePreview() && !form.get('checkImageUrl')?.value && !showCamera()) {
                  <div class="upload-area">
                    <div class="flex flex-col items-center gap-3">
                      <mat-icon class="!text-4xl text-slate-300">cloud_upload</mat-icon>
                      <p class="text-sm text-slate-500 text-center">
                        Sube una imagen o toma una foto del cheque
                      </p>
                      <div class="flex gap-2">
                        <label class="upload-btn">
                          <mat-icon class="!text-lg mr-1">folder_open</mat-icon>
                          Seleccionar archivo
                          <input
                            type="file"
                            accept="image/*"
                            (change)="onFileSelected($event)"
                            class="hidden">
                        </label>
                        <button
                          type="button"
                          class="upload-btn camera"
                          (click)="openCamera()">
                          <mat-icon class="!text-lg mr-1">photo_camera</mat-icon>
                          Tomar foto
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- Camera View -->
                @if (showCamera()) {
                  <div class="camera-container">
                    <video #videoElement autoplay playsinline class="camera-video"></video>
                    <canvas #canvasElement class="hidden"></canvas>
                    <div class="camera-controls">
                      <button
                        type="button"
                        class="camera-btn cancel"
                        (click)="closeCamera()">
                        <mat-icon>close</mat-icon>
                      </button>
                      <button
                        type="button"
                        class="camera-btn capture"
                        (click)="capturePhoto()">
                        <mat-icon>camera</mat-icon>
                      </button>
                    </div>
                    @if (cameraError()) {
                      <div class="camera-error">
                        <mat-icon>videocam_off</mat-icon>
                        <p>{{ cameraError() }}</p>
                        <button type="button" class="text-sm underline" (click)="closeCamera()">Cerrar</button>
                      </div>
                    }
                  </div>
                }

                <!-- Image Preview -->
                @if ((imagePreview() || form.get('checkImageUrl')?.value) && !showCamera()) {
                  <div class="image-preview-container">
                    <img
                      [src]="imagePreview() || form.get('checkImageUrl')?.value"
                      alt="Preview del cheque"
                      class="image-preview">
                    <div class="preview-overlay">
                      <button
                        type="button"
                        class="preview-btn view"
                        (click)="viewFullImage()">
                        <mat-icon>zoom_in</mat-icon>
                      </button>
                      <button
                        type="button"
                        class="preview-btn delete"
                        (click)="removeImage()">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                    @if (uploadProgress() > 0 && uploadProgress() < 100) {
                      <div class="upload-progress">
                        <mat-progress-bar mode="determinate" [value]="uploadProgress()"></mat-progress-bar>
                        <span class="text-xs text-white mt-1">{{ uploadProgress() }}%</span>
                      </div>
                    }
                  </div>
                }

                <span class="text-xs text-slate-400 mt-2 block">
                  Formatos: JPG, PNG, HEIC. Máximo 5MB
                </span>
              </div>
            </div>
          </div>
        }

        <!-- Datos de Transferencia -->
        @if (form.get('paymentMethod')?.value === 'transfer') {
          <div class="mb-6 p-4 bg-slate-50 rounded-xl">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-4">
              <mat-icon class="!text-lg text-red-500">account_balance</mat-icon>
              Datos de la Transferencia
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Número de Referencia</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="referenceNumber"
                  placeholder="Ej: REF123456">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-2">Banco</label>
                <input
                  type="text"
                  class="input-field"
                  formControlName="bankName"
                  placeholder="Ej: Chase">
              </div>
            </div>
          </div>
        }

        <!-- Notas -->
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-2">
            <mat-icon class="!text-sm align-middle mr-1 text-slate-400">notes</mat-icon>
            Notas (opcional)
          </label>
          <textarea
            class="input-field resize-none"
            formControlName="notes"
            rows="2"
            placeholder="Observaciones adicionales..."></textarea>
        </div>
      </form>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <button mat-stroked-button (click)="cancel()" [disabled]="isSaving()">
          Cancelar
        </button>
        <button
          mat-raised-button
          (click)="save()"
          [disabled]="form.invalid || selectedProposals().length === 0 || isSaving() || isUploading()"
          class="!bg-red-600 !text-white">
          @if (isSaving()) {
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          } @else {
            <mat-icon>{{ isEditMode ? 'save' : 'add' }}</mat-icon>
          }
          {{ isEditMode ? 'Guardar' : 'Registrar Pago' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 1rem;
      overflow: hidden;
      min-width: 500px;
      max-width: 600px;
    }

    .input-field {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.2s;
      outline: none;
      background: white;
    }

    .input-field:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .input-field::placeholder {
      color: #94a3b8;
    }

    .payment-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      color: #475569;
    }

    .payment-option:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .payment-option.selected {
      border-color: #ef4444;
      background: #fef2f2;
      color: #b91c1c;
    }

    /* Selected Chips */
    .selected-chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .project-chip {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.5rem;
      background: linear-gradient(135deg, #fef2f2, #fee2e2);
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      animation: chipIn 0.2s ease-out;
    }

    @keyframes chipIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .chip-content {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .chip-number {
      font-weight: 600;
      color: #b91c1c;
    }

    .chip-amount {
      color: #64748b;
      font-size: 0.65rem;
    }

    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.15s;
    }

    .chip-remove:hover {
      background: #fecaca;
      color: #b91c1c;
    }

    /* Search Input */
    .search-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.625rem 2.5rem 0.625rem 2.5rem;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      transition: all 0.2s;
      outline: none;
      background: white;
    }

    .search-input:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .clear-search {
      position: absolute;
      right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.15s;
    }

    .clear-search:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    /* Dropdown */
    .search-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 50;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.75rem;
      color: #64748b;
    }

    .add-all-btn {
      font-size: 0.7rem;
      font-weight: 500;
      color: #ef4444;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.15s;
    }

    .add-all-btn:hover {
      background: #fef2f2;
    }

    .dropdown-list {
      max-height: 220px;
      overflow-y: auto;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
      border-bottom: 1px solid #f1f5f9;
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: #fef2f2;
    }

    .dropdown-item:hover mat-icon {
      color: #ef4444;
    }

    .dropdown-more {
      padding: 0.75rem;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .dropdown-empty {
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .dropdown-empty p {
      margin: 0;
    }

    .dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
    }

    /* Upload Area */
    .upload-area {
      border: 2px dashed #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
      background: #fafafa;
      transition: all 0.2s;
    }

    .upload-area:hover {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .upload-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upload-btn:hover {
      border-color: #ef4444;
      color: #b91c1c;
    }

    .upload-btn.camera {
      background: #ef4444;
      border-color: #ef4444;
      color: white;
    }

    .upload-btn.camera:hover {
      background: #dc2626;
      border-color: #dc2626;
    }

    /* Camera */
    .camera-container {
      position: relative;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #000;
    }

    .camera-video {
      width: 100%;
      height: 250px;
      object-fit: cover;
    }

    .camera-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
    }

    .camera-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .camera-btn.capture {
      background: white;
      color: #1e293b;
    }

    .camera-btn.capture:hover {
      transform: scale(1.1);
    }

    .camera-btn.cancel {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .camera-btn.cancel:hover {
      background: rgba(255,255,255,0.3);
    }

    .camera-error {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.9);
      color: white;
      text-align: center;
      padding: 1rem;
    }

    .camera-error mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 0.5rem;
      color: #ef4444;
    }

    .camera-error p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
    }

    /* Image Preview */
    .image-preview-container {
      position: relative;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #f8fafc;
    }

    .image-preview {
      width: 100%;
      height: 200px;
      object-fit: contain;
      background: #f1f5f9;
    }

    .preview-overlay {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .preview-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .preview-btn.view {
      background: rgba(255, 255, 255, 0.9);
      color: #475569;
    }

    .preview-btn.view:hover {
      background: white;
      color: #1e293b;
    }

    .preview-btn.delete {
      background: rgba(239, 68, 68, 0.9);
      color: white;
    }

    .preview-btn.delete:hover {
      background: #dc2626;
    }

    .upload-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
      }
    }
  `]
})
export class PagoFormDialogComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private treasuryService = inject(TreasuryService);
  private workersService = inject(WorkersService);
  private proposalsService = inject(ProposalsService);
  private snackBar = inject(MatSnackBar);
  private storage = getStorage();

  private mediaStream: MediaStream | null = null;

  form!: FormGroup;
  isEditMode = false;
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  imagePreview = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  showCamera = signal<boolean>(false);
  cameraError = signal<string | null>(null);

  // Search and selection
  searchTerm = signal<string>('');
  showDropdown = signal<boolean>(false);
  selectedProposals = signal<SelectedProposal[]>([]);
  selectedWorkerId = signal<string>('');

  activeWorkers = this.workersService.activeWorkers;

  // All invoiced proposals
  invoicedProposals = computed(() =>
    this.proposalsService.proposals().filter(p =>
      p.status === 'converted_to_invoice' || p.status === 'paid' || p.status === 'approved'
    )
  );

  // Proposals where the selected worker participated
  workerProposals = computed(() => {
    const workerId = this.selectedWorkerId();
    if (!workerId) return [];

    return this.invoicedProposals().filter(p =>
      p.workers?.some(w => w.id === workerId)
    );
  });

  // Available proposals (not yet selected, filtered by worker)
  availableProposals = computed(() => {
    const selectedIds = new Set(this.selectedProposals().map(p => p.id));
    return this.workerProposals().filter(p => !selectedIds.has(p.id));
  });

  // Filtered by search term
  filteredProposals = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const available = this.availableProposals();

    if (!term) return available;

    return available.filter(p =>
      p.proposalNumber?.toLowerCase().includes(term) ||
      p.address?.toLowerCase().includes(term) ||
      p.ownerName?.toLowerCase().includes(term)
    );
  });

  // Total of selected proposals
  selectedTotal = computed(() =>
    this.selectedProposals().reduce((sum, p) => sum + (p.total || 0), 0)
  );

  paymentMethods = [
    { value: 'check', label: 'Cheque', icon: 'money' },
    { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
    { value: 'cash', label: 'Efectivo', icon: 'payments' }
  ];

  constructor(
    public dialogRef: MatDialogRef<PagoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoFormDialogData
  ) {}

  async ngOnInit(): Promise<void> {
    this.isEditMode = !!this.data?.pago;
    this.initForm();

    await Promise.all([
      this.workersService.initialize(),
      this.proposalsService.initialize()
    ]);

    if (this.isEditMode && this.data.pago) {
      this.populateForm(this.data.pago);
    }
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  private initForm(): void {
    this.form = this.fb.group({
      workerId: ['', Validators.required],
      workerName: [''],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      transactionDate: [this.formatDateForInput(new Date()), Validators.required],
      paymentMethod: ['check', Validators.required],
      checkNumber: [''],
      bankName: [''],
      checkImageUrl: [''],
      referenceNumber: [''],
      notes: ['']
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private populateForm(pago: Pago): void {
    const transactionDate = pago.transactionDate?.toDate?.() || new Date();

    // Set the selected worker ID first so workerProposals computed works
    this.selectedWorkerId.set(pago.workerId);

    this.form.patchValue({
      workerId: pago.workerId,
      workerName: pago.workerName,
      amount: pago.amount,
      transactionDate: this.formatDateForInput(transactionDate),
      paymentMethod: pago.paymentMethod,
      checkNumber: pago.checkNumber || '',
      bankName: pago.bankName || '',
      checkImageUrl: pago.checkImageUrl || '',
      referenceNumber: pago.referenceNumber || '',
      notes: pago.notes || ''
    });

    // Populate selected proposals from existing pago
    if (pago.proposalIds && pago.proposalIds.length > 0) {
      const proposals: SelectedProposal[] = [];
      pago.proposalIds.forEach((id, index) => {
        const proposal = this.invoicedProposals().find(p => p.id === id);
        if (proposal) {
          proposals.push({
            id: proposal.id,
            proposalNumber: proposal.proposalNumber,
            address: proposal.address,
            ownerName: proposal.ownerName,
            total: proposal.total
          });
        } else if (pago.proposalNumbers && pago.proposalNumbers[index]) {
          // Fallback if proposal not found
          proposals.push({
            id,
            proposalNumber: pago.proposalNumbers[index],
            address: '',
            ownerName: '',
            total: 0
          });
        }
      });
      this.selectedProposals.set(proposals);
    }
  }

  onWorkerChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const workerId = select.value;
    const worker = this.activeWorkers().find(w => w.id === workerId);

    // Update selected worker ID
    this.selectedWorkerId.set(workerId);

    // Clear selected proposals when worker changes
    this.selectedProposals.set([]);
    this.searchTerm.set('');

    if (worker) {
      this.form.patchValue({ workerName: worker.fullName });
    }
  }

  // Search methods
  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.showDropdown.set(true);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  // Project selection methods
  addProject(proposal: any): void {
    const selected: SelectedProposal = {
      id: proposal.id,
      proposalNumber: proposal.proposalNumber,
      address: proposal.address,
      ownerName: proposal.ownerName,
      total: proposal.total
    };
    this.selectedProposals.update(current => [...current, selected]);
    this.searchTerm.set('');
  }

  removeProject(proposalId: string): void {
    this.selectedProposals.update(current =>
      current.filter(p => p.id !== proposalId)
    );
  }

  clearAllProjects(): void {
    this.selectedProposals.set([]);
  }

  addAllFiltered(): void {
    const filtered = this.filteredProposals();
    const newProposals: SelectedProposal[] = filtered.map(p => ({
      id: p.id,
      proposalNumber: p.proposalNumber,
      address: p.address,
      ownerName: p.ownerName,
      total: p.total
    }));
    this.selectedProposals.update(current => [...current, ...newProposals]);
    this.searchTerm.set('');
    this.showDropdown.set(false);
  }

  // File selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('El archivo debe ser una imagen', 'OK', { duration: 3000 });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.snackBar.open('La imagen no debe superar los 5MB', 'OK', { duration: 3000 });
      return;
    }

    this.selectedFile.set(file);
    this.createPreview(file);
    input.value = '';
  }

  private createPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Camera methods
  async openCamera(): Promise<void> {
    this.showCamera.set(true);
    this.cameraError.set(null);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      if (error.name === 'NotAllowedError') {
        this.cameraError.set('Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.');
      } else if (error.name === 'NotFoundError') {
        this.cameraError.set('No se encontró ninguna cámara en este dispositivo.');
      } else {
        this.cameraError.set('Error al acceder a la cámara. Intenta seleccionar un archivo.');
      }
    }
  }

  capturePhoto(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `check_${Date.now()}.jpg`, { type: 'image/jpeg' });
          this.selectedFile.set(file);
          this.imagePreview.set(canvas.toDataURL('image/jpeg'));
          this.closeCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  }

  closeCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.showCamera.set(false);
    this.cameraError.set(null);
  }

  // Image upload
  async uploadImage(): Promise<string | null> {
    const file = this.selectedFile();
    if (!file) return this.form.get('checkImageUrl')?.value || null;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    try {
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `pago_${timestamp}.${extension}`;
      const storageRef = ref(this.storage, `treasury/pagos/${fileName}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            this.uploadProgress.set(Math.round(progress));
          },
          (error) => {
            console.error('Error uploading image:', error);
            this.isUploading.set(false);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              this.isUploading.set(false);
              resolve(downloadURL);
            } catch (error) {
              this.isUploading.set(false);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in uploadImage:', error);
      this.isUploading.set(false);
      return null;
    }
  }

  removeImage(): void {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
    this.form.patchValue({ checkImageUrl: '' });
  }

  viewFullImage(): void {
    const url = this.imagePreview() || this.form.get('checkImageUrl')?.value;
    if (url) {
      window.open(url, '_blank');
    }
  }

  hasError(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.selectedProposals().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    try {
      let checkImageUrl = this.form.get('checkImageUrl')?.value;
      if (this.selectedFile()) {
        const uploadedUrl = await this.uploadImage();
        if (uploadedUrl) {
          checkImageUrl = uploadedUrl;
        }
      }

      const formValue = this.form.value;
      const selected = this.selectedProposals();

      const pagoData: CreatePagoData = {
        workerId: formValue.workerId,
        workerName: formValue.workerName,
        proposalIds: selected.map(p => p.id),
        proposalNumbers: selected.map(p => p.proposalNumber),
        amount: formValue.amount,
        transactionDate: Timestamp.fromDate(new Date(formValue.transactionDate)),
        paymentMethod: formValue.paymentMethod as PaymentMethod,
        checkNumber: formValue.checkNumber || undefined,
        bankName: formValue.bankName || undefined,
        checkImageUrl: checkImageUrl || undefined,
        referenceNumber: formValue.referenceNumber || undefined,
        notes: formValue.notes || undefined
      };

      if (this.isEditMode && this.data.pago) {
        await this.treasuryService.updatePago(this.data.pago.id, pagoData);
      } else {
        await this.treasuryService.createPago(pagoData);
      }

      this.dialogRef.close({ saved: true });
    } catch (error) {
      console.error('Error saving pago:', error);
      this.snackBar.open('Error al guardar el pago', 'OK', { duration: 3000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    this.closeCamera();
    this.dialogRef.close();
  }
}
