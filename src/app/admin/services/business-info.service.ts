// src/app/admin/services/business-info.service.ts
import { Injectable, inject, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  Timestamp
} from 'firebase/firestore';
import {
  getDocWithLogging as getDoc,
  setDocWithLogging as setDoc,
  updateDocWithLogging as updateDoc
} from '../../shared/utils/firebase-logger.utils';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { BusinessInfo, BusinessInfoFormData } from '../models/business-info.interface';
import { logAuditAction } from '../../shared/utils';

/**
 * Resultado de operación de negocio
 */
interface OperationResult {
  success: boolean;
  message: string;
  data?: BusinessInfo;
}

/**
 * Servicio para gestión de información de empresa
 *
 * Proporciona métodos CRUD para la información de la empresa en Firestore,
 * incluyendo upload de logos a Firebase Storage y registro de auditoría.
 *
 * @example
 * ```typescript
 * constructor(private businessService: BusinessInfoService) {}
 *
 * async loadBusiness() {
 *   const business = await this.businessService.getBusinessInfo();
 *   console.log(business);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class BusinessInfoService {
  // ============================================
  // DEPENDENCY INJECTION
  // ============================================
  private db = getFirestore();
  private storage = getStorage();
  private auth = getAuth();

  // ============================================
  // CONSTANTS
  // ============================================
  private readonly COLLECTION_NAME = 'business_info';
  private readonly DOCUMENT_ID = 'main'; // Solo un documento para la empresa
  private readonly STORAGE_PATH = 'business/logos';

  // ============================================
  // STATE (Signals)
  // ============================================

  /**
   * Información actual de la empresa en memoria
   */
  private _businessInfo = signal<BusinessInfo | null>(null);
  readonly businessInfo = this._businessInfo.asReadonly();

  /**
   * Estado de carga
   */
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  // ============================================
  // CRUD METHODS
  // ============================================

  /**
   * Obtiene la información de la empresa desde Firestore
   *
   * @returns Promise con la información de la empresa o null si no existe
   *
   * @example
   * ```typescript
   * const business = await this.businessInfoService.getBusinessInfo();
   * if (business) {
   *   console.log('Empresa:', business.businessName);
   * }
   * ```
   */
  async getBusinessInfo(): Promise<BusinessInfo | null> {
    this._loading.set(true);

    try {
      const docRef = doc(this.db, this.COLLECTION_NAME, this.DOCUMENT_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as BusinessInfo;
        this._businessInfo.set(data);
        return data;
      }

      this._businessInfo.set(null);
      return null;
    } catch (error) {
      console.error('Error obteniendo información de empresa:', error);
      this._businessInfo.set(null);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Crea o actualiza la información de la empresa
   *
   * Si ya existe un documento, lo actualiza. Si no existe, lo crea.
   *
   * @param formData - Datos del formulario
   * @returns Promise con el resultado de la operación
   *
   * @example
   * ```typescript
   * const result = await this.businessInfoService.saveBusinessInfo({
   *   businessName: 'Mi Empresa',
   *   legalName: 'Mi Empresa S.A.',
   *   taxId: 'J-12345678-9',
   *   email: 'info@empresa.com',
   *   phone: '+58 212 1234567',
   *   address: { ... },
   *   logoUrl: 'https://...'
   * });
   *
   * if (result.success) {
   *   console.log('Guardado exitoso');
   * }
   * ```
   */
  async saveBusinessInfo(formData: BusinessInfoFormData): Promise<OperationResult> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return {
          success: false,
          message: 'Usuario no autenticado'
        };
      }

      const docRef = doc(this.db, this.COLLECTION_NAME, this.DOCUMENT_ID);
      const docSnap = await getDoc(docRef);

      const now = Timestamp.now();
      const isUpdate = docSnap.exists();

      let businessData: Partial<BusinessInfo>;

      if (isUpdate) {
        // Actualización
        businessData = {
          ...formData,
          updatedAt: now
        };

        await updateDoc(docRef, businessData);

        // Log de auditoría
        await logAuditAction({
          action: 'business_info_updated',
          targetId: this.DOCUMENT_ID,
          details: {
            updatedFields: Object.keys(formData),
            businessName: formData.businessName
          }
        });
      } else {
        // Creación
        businessData = {
          id: this.DOCUMENT_ID,
          ...formData,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.uid,
          isActive: true
        };

        await setDoc(docRef, businessData);

        // Log de auditoría
        await logAuditAction({
          action: 'business_info_created',
          targetId: this.DOCUMENT_ID,
          details: {
            businessName: formData.businessName
          }
        });
      }

      // Actualizar signal
      const updatedBusiness = await this.getBusinessInfo();

      return {
        success: true,
        message: isUpdate
          ? 'Información de empresa actualizada exitosamente'
          : 'Información de empresa creada exitosamente',
        data: updatedBusiness || undefined
      };
    } catch (error) {
      console.error('Error guardando información de empresa:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al guardar'
      };
    }
  }

  // ============================================
  // LOGO UPLOAD METHODS
  // ============================================

  /**
   * Sube un logo a Firebase Storage
   *
   * Sube el archivo a la ruta 'business/logos/' y retorna la URL de descarga.
   * Si ya existe un logo, lo elimina antes de subir el nuevo.
   *
   * @param file - Archivo de imagen a subir
   * @param onProgress - Callback opcional para progreso (0-100)
   * @returns Promise con la URL de descarga o null si falla
   *
   * @example
   * ```typescript
   * const file = event.target.files[0];
   * const url = await this.businessInfoService.uploadLogo(file, (progress) => {
   *   console.log('Progreso:', progress, '%');
   * });
   *
   * if (url) {
   *   console.log('Logo subido:', url);
   * }
   * ```
   */
  async uploadLogo(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    try {
      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      // Máximo 5MB
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('El archivo no debe superar los 5MB');
      }

      // Eliminar logo anterior si existe
      const currentBusiness = this._businessInfo();
      if (currentBusiness?.logoUrl) {
        await this.deleteLogoFromUrl(currentBusiness.logoUrl);
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `logo_${timestamp}.${extension}`;
      const storageRef = ref(this.storage, `${this.STORAGE_PATH}/${fileName}`);

      // Upload con progreso
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: any) => {
            // Calcular progreso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          (error: any) => {
            console.error('Error subiendo logo:', error);
            reject(error);
          },
          async () => {
            // Upload completo, obtener URL
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error en uploadLogo:', error);
      return null;
    }
  }

  /**
   * Elimina un logo de Firebase Storage desde su URL
   *
   * @param logoUrl - URL del logo a eliminar
   * @returns Promise<void>
   */
  private async deleteLogoFromUrl(logoUrl: string): Promise<void> {
    try {
      // Solo eliminar si es de Firebase Storage
      if (!logoUrl.includes('firebasestorage.googleapis.com')) {
        return;
      }

      // Extraer path del Storage desde la URL
      const urlParts = logoUrl.split('/o/');
      if (urlParts.length < 2) return;

      const pathPart = urlParts[1].split('?')[0];
      const filePath = decodeURIComponent(pathPart);

      const fileRef = ref(this.storage, filePath);
      await deleteObject(fileRef);
      console.log('Logo anterior eliminado:', filePath);
    } catch (error) {
      console.warn('Error eliminando logo anterior:', error);
      // No lanzar error, continuar con la operación
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Verifica si existe información de la empresa
   *
   * @returns Promise<boolean>
   */
  async businessInfoExists(): Promise<boolean> {
    try {
      const docRef = doc(this.db, this.COLLECTION_NAME, this.DOCUMENT_ID);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error verificando existencia de empresa:', error);
      return false;
    }
  }

  /**
   * Limpia el signal de businessInfo
   */
  clearBusinessInfo(): void {
    this._businessInfo.set(null);
  }
}
