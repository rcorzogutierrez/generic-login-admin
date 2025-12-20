// src/app/admin/services/system-config.service.ts
import { Injectable, signal, inject } from '@angular/core';
import {
  getFirestore,
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
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { SystemConfig, LogoUploadResult } from '../models/system-config.interface';
import { AppConfigService } from '../../core/services/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class SystemConfigService {
  private db = getFirestore();
  private storage = getStorage();
  private readonly CONFIG_DOC_ID = 'system_config';
  private readonly CONFIG_COLLECTION = 'config';
  private readonly STORAGE_PATH = 'system/branding/';

  // ✅ Inyectar AppConfigService para notificar cambios
  private appConfigService = inject(AppConfigService);

  // Signal para la configuración actual
  private _config = signal<SystemConfig | null>(null);
  readonly config = this._config.asReadonly();

  constructor() {
    this.loadConfig();
  }

  /**
   * Carga la configuración inicial
   */
  async loadConfig(): Promise<SystemConfig> {
    try {
      const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const data = configSnap.data() as SystemConfig;
        this._config.set(data);
        return data;
      } else {
        // Crear configuración por defecto
        const defaultConfig = this.getDefaultConfig();
        await this.createConfig(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración por defecto
   */
  private getDefaultConfig(): SystemConfig {
    return {
      id: this.CONFIG_DOC_ID,
      appName: 'Generic Admin Login',
      appDescription: 'Sistema de autenticación y gestión',
      logoUrl: '',
      logoStoragePath: '',
      logoBackgroundColor: 'transparent',
      adminContactEmail: '[email protected]',
      footerText: '© 2025 Generic Admin. Todos los derechos reservados.',
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system',
      version: 1
    };
  }

  /**
   * Crea la configuración inicial
   */
  private async createConfig(config: SystemConfig): Promise<void> {
    const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);
    await setDoc(configRef, config);
    this._config.set(config);
  }

  /**
 * Actualiza la configuración (sin logo)
 */
// src/app/admin/services/system-config.service.ts

async updateConfig(
  updates: Partial<SystemConfig>,
  currentUserUid: string
): Promise<{ success: boolean; message: string }> {
  try {
    const configRef = doc(this.db, this.CONFIG_COLLECTION, this.CONFIG_DOC_ID);

    // ✅ Crear objeto con tipos correctos para Firestore
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: currentUserUid,
      version: (this._config()?.version || 1) + 1
    };

    await updateDoc(configRef, updateData);

    // ✅ Recargar configuración local
    await this.loadConfig();

    // ✅ IMPORTANTE: Notificar a AppConfigService para actualizar navbar y títulos
    await this.appConfigService.forceReload();

    return {
      success: true,
      message: 'Configuración actualizada exitosamente'
    };
  } catch (error: any) {
    console.error('❌ Error actualizando configuración:', error);
    return {
      success: false,
      message: error.message || 'Error al actualizar la configuración'
    };
  }
}

  /**
   * Sube un logo a Firebase Storage
   */
  async uploadLogo(
    file: File,
    currentUserUid: string
  ): Promise<LogoUploadResult> {
    try {
      // Validaciones
      const validation = this.validateLogoFile(file);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Archivo no válido'
        };
      }

      // Eliminar logo anterior si existe
      const currentConfig = this._config();
      if (currentConfig?.logoStoragePath) {
        await this.deleteLogo(currentConfig.logoStoragePath);
      }

      // Crear referencia única
      const timestamp = Date.now();
      const fileName = `logo_${timestamp}_${file.name}`;
      const storagePath = `${this.STORAGE_PATH}${fileName}`;
      const storageRef = ref(this.storage, storagePath);

      // Subir archivo
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUserUid,
          uploadedAt: new Date().toISOString()
        }
      });

      // Obtener URL pública
      const logoUrl = await getDownloadURL(storageRef);

      // Actualizar Firestore
      await this.updateConfig({
        logoUrl,
        logoStoragePath: storagePath,
        faviconUrl: logoUrl // Usar el mismo logo como favicon
      }, currentUserUid);

      return {
        success: true,
        logoUrl,
        storagePath,
        message: 'Logo subido exitosamente'
      };

    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      return {
        success: false,
        message: error.message || 'Error al subir el logo',
        error
      };
    }
  }

  /**
   * Valida el archivo del logo
   */
  private validateLogoFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

    if (!file) {
      return { valid: false, error: 'No se seleccionó ningún archivo' };
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'El archivo excede el tamaño máximo de 2MB' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Formato no permitido. Usa PNG, JPG o SVG' };
    }

    return { valid: true };
  }

  /**
   * Elimina un logo de Firebase Storage
   */
  async deleteLogo(storagePath: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, storagePath);
      await deleteObject(storageRef);

    } catch (error: any) {
      // No es crítico si falla (el archivo puede no existir)

    }
  }

  /**
   * Elimina el logo actual y limpia las URLs
   */
  async removeCurrentLogo(currentUserUid: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentConfig = this._config();

      if (!currentConfig?.logoStoragePath) {
        return {
          success: false,
          message: 'No hay logo para eliminar'
        };
      }

      // Eliminar de Storage
      await this.deleteLogo(currentConfig.logoStoragePath);

      // Actualizar Firestore
      await this.updateConfig({
        logoUrl: '',
        logoStoragePath: '',
        faviconUrl: ''
      }, currentUserUid);

      return {
        success: true,
        message: 'Logo eliminado exitosamente'
      };

    } catch (error: any) {
      console.error('Error eliminando logo:', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar el logo'
      };
    }
  }

  /**
   * Valida email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Exporta la configuración actual
   */
  async exportConfig(): Promise<{ success: boolean; data?: SystemConfig; message: string }> {
    try {
      const config = await this.loadConfig();

      return {
        success: true,
        data: config,
        message: 'Configuración exportada exitosamente'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al exportar configuración'
      };
    }
  }
}