// src/app/modules/clients/services/client-config.service.ts

import { Injectable, inject, signal } from '@angular/core';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import {
  ClientModuleConfig,
  FieldConfig,
  DEFAULT_MODULE_CONFIG,
  DEFAULT_CLIENT_FIELDS
} from '../models';
import { FormLayoutConfig } from '../models/client-module-config.interface';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientConfigService {
  private firestore = getFirestore();
  private authService = inject(AuthService);

  // Collection reference
  private configDoc = doc(this.firestore, 'moduleConfigs/clients');

  // Signals
  config = signal<ClientModuleConfig | null>(null);
  fields = signal<FieldConfig[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private isInitialized = false;

  constructor() {}

  /**
   * Inicializar el servicio - cargar configuración
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadConfig();
    this.isInitialized = true;
  }

  /**
   * Cargar configuración del módulo
   */
  async loadConfig(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      console.log('📂 loadConfig() - Cargando configuración...');
      const docSnap = await getDoc(this.configDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('✅ Documento encontrado en Firestore');
        console.log('   Fields en documento:', data['fields']?.length || 0);

        const config = {
          id: docSnap.id,
          ...data as Omit<ClientModuleConfig, 'id'>
        };

        // Asegurar que fields siempre sea un array
        if (!config.fields || !Array.isArray(config.fields)) {
          console.warn('⚠️ Fields no es un array válido, inicializando como array vacío');
          config.fields = [];
        }

        this.config.set(config);
        this.fields.set(config.fields);
        console.log('✅ Configuración cargada:', config.fields.length, 'campos');
      } else {
        console.log('⚠️ Documento no existe, creando configuración por defecto');
        // Crear configuración por defecto si no existe
        await this.createDefaultConfig();
      }

    } catch (error) {
      console.error('❌ Error cargando configuración del módulo:', error);
      this.error.set('Error al cargar la configuración');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Crear configuración por defecto
   */
  private async createDefaultConfig(): Promise<void> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const now = Timestamp.now();

      // Crear campos por defecto con IDs únicos
      const defaultFields: FieldConfig[] = DEFAULT_CLIENT_FIELDS.map((field, index) => ({
        ...field,
        id: `field_${index}_${Date.now()}`,
        createdAt: now,
        createdBy: currentUser.uid,
        updatedAt: now,
        updatedBy: currentUser.uid
      } as FieldConfig));

      const config: ClientModuleConfig = {
        ...DEFAULT_MODULE_CONFIG,
        id: 'clients',
        fields: defaultFields,
        lastModified: now,
        modifiedBy: currentUser.uid,
        createdAt: now,
        createdBy: currentUser.uid
      };

      await setDoc(this.configDoc, config);

      this.config.set(config);
      this.fields.set(defaultFields);

    } catch (error) {
      console.error('❌ Error creando configuración por defecto:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración completa del módulo
   */
  async updateConfig(updates: Partial<ClientModuleConfig>): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      const updatedConfig: ClientModuleConfig = {
        ...currentConfig,
        ...updates,
        lastModified: Timestamp.now(),
        modifiedBy: currentUser.uid
      };

      await updateDoc(this.configDoc, updatedConfig as any);

      this.config.set(updatedConfig);
      if (updates.fields) {
        this.fields.set(updates.fields);
      }

    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      this.error.set('Error al actualizar la configuración');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Agregar un nuevo campo personalizado
   */
  async addCustomField(fieldConfig: Omit<FieldConfig, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<FieldConfig> {
    try {
      console.log('➕ addCustomField() - Agregando nuevo campo...');

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const now = Timestamp.now();

      const newField: FieldConfig = {
        ...fieldConfig,
        id: `field_custom_${Date.now()}`,
        isDefault: false,
        isSystem: false,
        createdAt: now,
        createdBy: currentUser.uid,
        updatedAt: now,
        updatedBy: currentUser.uid
      };

      // Obtener campos actuales y asegurar que sea un array
      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        console.warn('⚠️ currentFields no es un array, inicializando como array vacío');
        currentFields = [];
      }

      console.log('   Campos actuales:', currentFields.length);
      const updatedFields = [...currentFields, newField];
      console.log('   Campos después de agregar:', updatedFields.length);

      await this.updateConfig({ fields: updatedFields });
      console.log('✅ Campo agregado exitosamente');

      return newField;

    } catch (error) {
      console.error('❌ Error agregando campo personalizado:', error);
      throw error;
    }
  }

  /**
   * Actualizar un campo existente
   */
  async updateField(fieldId: string, updates: Partial<FieldConfig>): Promise<void> {
    try {
      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        console.warn('⚠️ currentFields no es un array en updateField');
        currentFields = [];
      }

      const fieldIndex = currentFields.findIndex(f => f.id === fieldId);

      if (fieldIndex === -1) {
        throw new Error('Campo no encontrado');
      }

      // No permitir editar campos del sistema
      if (currentFields[fieldIndex].isSystem &&
          (updates.name || updates.type || updates.validation?.required !== undefined)) {
        throw new Error('No se pueden modificar propiedades esenciales de campos del sistema');
      }

      const updatedFields = [...currentFields];
      updatedFields[fieldIndex] = {
        ...updatedFields[fieldIndex],
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.uid
      };

      await this.updateConfig({ fields: updatedFields });

    } catch (error) {
      console.error(`❌ Error actualizando campo ${fieldId}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar un campo personalizado
   */
  async deleteField(fieldId: string): Promise<void> {
    try {
      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        console.warn('⚠️ currentFields no es un array en deleteField');
        currentFields = [];
      }

      const field = currentFields.find(f => f.id === fieldId);

      if (!field) {
        throw new Error('Campo no encontrado');
      }

      // No permitir eliminar campos del sistema
      if (field.isSystem) {
        throw new Error('No se pueden eliminar campos del sistema');
      }

      const updatedFields = currentFields.filter(f => f.id !== fieldId);

      await this.updateConfig({ fields: updatedFields });

    } catch (error) {
      console.error(`❌ Error eliminando campo ${fieldId}:`, error);
      throw error;
    }
  }

  /**
   * Activar/Desactivar un campo
   */
  async toggleFieldActive(fieldId: string, isActive: boolean): Promise<void> {
    try {
      await this.updateField(fieldId, { isActive });
    } catch (error) {
      console.error(`❌ Error cambiando estado del campo ${fieldId}:`, error);
      throw error;
    }
  }

  /**
   * Reordenar campos
   */
  async reorderFields(fieldIds: string[]): Promise<void> {
    try {
      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        console.warn('⚠️ currentFields no es un array en reorderFields');
        currentFields = [];
      }

      // Crear mapa de campos por ID
      const fieldsMap = new Map(currentFields.map(f => [f.id, f]));

      // Reordenar según el array de IDs y actualizar formOrder
      const reorderedFields = fieldIds
        .map((id, index) => {
          const field = fieldsMap.get(id);
          if (!field) return null;
          return {
            ...field,
            formOrder: index
          };
        })
        .filter(Boolean) as FieldConfig[];

      // Agregar campos que no están en fieldIds al final
      const remainingFields = currentFields
        .filter(f => !fieldIds.includes(f.id))
        .map((f, index) => ({
          ...f,
          formOrder: reorderedFields.length + index
        }));

      const updatedFields = [...reorderedFields, ...remainingFields];

      await this.updateConfig({ fields: updatedFields });

    } catch (error) {
      console.error('❌ Error reordenando campos:', error);
      throw error;
    }
  }

  /**
   * Reordenar columnas del grid
   */
  async reorderGridColumns(fieldIds: string[]): Promise<void> {
    try {
      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        console.warn('⚠️ currentFields no es un array en reorderGridColumns');
        currentFields = [];
      }

      const updatedFields = currentFields.map(field => {
        const gridOrder = fieldIds.indexOf(field.id);
        if (gridOrder !== -1) {
          return {
            ...field,
            gridConfig: {
              ...field.gridConfig,
              gridOrder
            }
          };
        }
        return field;
      });

      await this.updateConfig({ fields: updatedFields });

    } catch (error) {
      console.error('❌ Error reordenando columnas del grid:', error);
      throw error;
    }
  }

  /**
   * Obtener campos activos ordenados por formOrder
   */
  getActiveFields(): FieldConfig[] {
    const fields = this.fields();
    if (!fields || !Array.isArray(fields)) {
      return [];
    }
    return fields
      .filter(f => f.isActive)
      .sort((a, b) => a.formOrder - b.formOrder);
  }

  /**
   * Obtener campos visibles en el grid ordenados por gridOrder
   */
  getGridFields(): FieldConfig[] {
    const fields = this.fields();
    if (!fields || !Array.isArray(fields)) {
      return [];
    }
    return fields
      .filter(f => f.isActive && f.gridConfig.showInGrid)
      .sort((a, b) => a.gridConfig.gridOrder - b.gridConfig.gridOrder);
  }

  /**
   * Obtener un campo por nombre
   */
  getFieldByName(name: string): FieldConfig | undefined {
    const fields = this.fields();
    if (!fields || !Array.isArray(fields)) {
      return undefined;
    }
    return fields.find(f => f.name === name);
  }

  /**
   * Validar nombre de campo único
   */
  isFieldNameUnique(name: string, excludeId?: string): boolean {
    const fields = this.fields();
    if (!fields || !Array.isArray(fields)) {
      return true; // Si no hay campos, el nombre es único
    }
    return !fields.some(f =>
      f.name === name && f.id !== excludeId
    );
  }

  /**
   * Actualizar configuración del grid
   */
  async updateGridConfig(gridConfig: Partial<ClientModuleConfig['gridConfig']>): Promise<void> {
    try {
      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      await this.updateConfig({
        gridConfig: {
          ...currentConfig.gridConfig,
          ...gridConfig
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando configuración del grid:', error);
      throw error;
    }
  }

  /**
   * Actualizar permisos del módulo
   */
  async updatePermissions(permissions: Partial<ClientModuleConfig['permissions']>): Promise<void> {
    try {
      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      await this.updateConfig({
        permissions: {
          ...currentConfig.permissions,
          ...permissions
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando permisos:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración del layout del formulario
   */
  async updateFormLayout(formLayout: FormLayoutConfig): Promise<void> {
    try {
      console.log('🔧 ClientConfigService.updateFormLayout() - Iniciando...');
      console.log('   Layout recibido:', formLayout);
      console.log('   Campos en layout:', Object.keys(formLayout.fields).length);

      const currentConfig = this.config();
      if (!currentConfig) {
        throw new Error('Configuración no cargada');
      }

      console.log('📝 Llamando a updateConfig()...');
      await this.updateConfig({
        formLayout
      });

      console.log('✅ Layout del formulario actualizado correctamente en Firestore');

    } catch (error) {
      console.error('❌ Error actualizando layout del formulario:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración del layout del formulario
   */
  getFormLayout(): FormLayoutConfig | undefined {
    return this.config()?.formLayout;
  }

  /**
   * Refrescar configuración
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Limpiar el servicio
   */
  clear(): void {
    this.config.set(null);
    this.fields.set([]);
    this.isLoading.set(false);
    this.error.set(null);
    this.isInitialized = false;
  }
}
