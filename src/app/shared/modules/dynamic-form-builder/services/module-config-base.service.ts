// src/app/shared/modules/dynamic-form-builder/services/module-config-base.service.ts

import { inject, signal } from '@angular/core';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { AuthService } from '../../../../core/services/auth.service';
import { ModuleConfig, FieldConfig, FormLayoutConfig } from '../models';

/**
 * Servicio base abstracto para configuración de módulos dinámicos
 *
 * Este servicio proporciona toda la funcionalidad común para:
 * - Gestión de campos (crear, editar, eliminar, reordenar)
 * - Gestión de layout del formulario
 * - Persistencia en Firestore
 * - Gestión de estado con signals
 *
 * Cada módulo debe extender esta clase e implementar:
 * - collectionPath: Ruta del documento en Firestore
 * - defaultFields: Campos por defecto del módulo
 * - getDefaultConfig(): Configuración por defecto del módulo
 */
export abstract class ModuleConfigBaseService<TConfig extends ModuleConfig = ModuleConfig> {
  protected firestore = getFirestore();
  protected authService = inject(AuthService);

  // Propiedades abstractas que cada módulo debe definir
  protected abstract readonly collectionPath: string;        // ej: 'moduleConfigs/clients'
  protected abstract readonly defaultFields: Partial<FieldConfig>[];
  protected abstract getDefaultConfig(): Omit<TConfig, 'id' | 'lastModified' | 'modifiedBy'>;

  // Document reference (se crea automáticamente)
  protected get configDoc(): DocumentReference {
    return doc(this.firestore, this.collectionPath);
  }

  // Signals
  config = signal<TConfig | null>(null);
  fields = signal<FieldConfig[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private isInitialized = false;

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
   * Cargar configuración del módulo desde Firestore
   */
  async loadConfig(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const docSnap = await getDoc(this.configDoc);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const config = {
          id: docSnap.id,
          ...data as Omit<TConfig, 'id'>
        };

        // Asegurar que fields siempre sea un array
        if (!config.fields || !Array.isArray(config.fields)) {

          config.fields = [];
        }

        this.config.set(config as TConfig);
        this.fields.set(config.fields);
      } else {
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
  async createDefaultConfig(): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const now = Timestamp.now();

    // Crear campos por defecto con IDs únicos
    const defaultFields: FieldConfig[] = this.defaultFields.map((field, index) => ({
      ...field,
      id: `field_${Date.now()}_${index}`,
      createdAt: now,
      createdBy: currentUser.uid,
      updatedAt: now,
      updatedBy: currentUser.uid
    } as FieldConfig));

    const defaultConfig = {
      ...this.getDefaultConfig(),
      fields: defaultFields,
      lastModified: now,
      modifiedBy: currentUser.uid,
      createdAt: now,
      createdBy: currentUser.uid
    };

    await setDoc(this.configDoc, defaultConfig);

    const config = {
      id: this.configDoc.id,
      ...defaultConfig
    } as TConfig;

    this.config.set(config);
    this.fields.set(defaultFields);
  }

  /**
   * Actualizar configuración
   */
  async updateConfig(updates: Partial<TConfig>): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const currentUser = this.authService.authorizedUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const updateData = {
        ...updates,
        lastModified: Timestamp.now(),
        modifiedBy: currentUser.uid
      };

      await updateDoc(this.configDoc, updateData);

      // Actualizar el signal local
      const currentConfig = this.config();
      if (currentConfig) {
        this.config.set({ ...currentConfig, ...updateData });

        // Si se actualizaron los fields, actualizar el signal de fields
        if (updates.fields) {
          this.fields.set(updates.fields);
        }
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
   * Agregar campo personalizado
   */
  async addCustomField(fieldConfig: Omit<FieldConfig, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>): Promise<FieldConfig> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    const now = Timestamp.now();

    const newField: FieldConfig = {
      ...fieldConfig,
      id: `custom_${Date.now()}`,
      createdAt: now,
      createdBy: currentUser.uid,
      updatedAt: now,
      updatedBy: currentUser.uid
    };

    let currentFields = this.fields();
    if (!currentFields || !Array.isArray(currentFields)) {

      currentFields = [];
    }

    const updatedFields = [...currentFields, newField];
    await this.updateConfig({ fields: updatedFields } as Partial<TConfig>);

    return newField;
  }

  /**
   * Actualizar campo existente
   */
  async updateField(fieldId: string, updates: Partial<FieldConfig>): Promise<void> {
    const currentUser = this.authService.authorizedUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    let currentFields = this.fields();
    if (!currentFields || !Array.isArray(currentFields)) {
      currentFields = [];
    }

    const updatedFields = currentFields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          ...updates,
          updatedAt: Timestamp.now(),
          updatedBy: currentUser.uid
        };
      }
      return field;
    });

    await this.updateConfig({ fields: updatedFields } as Partial<TConfig>);
  }

  /**
   * Eliminar campo
   */
  async deleteField(fieldId: string): Promise<void> {
    let currentFields = this.fields();
    if (!currentFields || !Array.isArray(currentFields)) {
      currentFields = [];
    }

    // Buscar el campo a eliminar
    const fieldToDelete = currentFields.find(f => f.id === fieldId);

    // No permitir eliminar campos del sistema
    if (fieldToDelete?.isSystem) {
      throw new Error('No se puede eliminar un campo del sistema');
    }

    const updatedFields = currentFields.filter(field => field.id !== fieldId);
    await this.updateConfig({ fields: updatedFields } as Partial<TConfig>);
  }

  /**
   * Activar/desactivar un campo
   */
  async toggleFieldActive(fieldId: string, isActive: boolean): Promise<void> {
    await this.updateField(fieldId, { isActive });
  }

  /**
   * Reordenar campos en el formulario
   */
  async reorderFields(fieldIds: string[]): Promise<void> {
    try {
      let currentFields = this.fields();
      if (!currentFields || !Array.isArray(currentFields)) {
        currentFields = [];
      }

      const reorderedFields = currentFields.map(field => {
        const newOrder = fieldIds.indexOf(field.id);
        if (newOrder !== -1) {
          return { ...field, formOrder: newOrder };
        }
        return field;
      });

      await this.updateConfig({ fields: reorderedFields } as Partial<TConfig>);

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
        currentFields = [];
      }

      const reorderedFields = currentFields.map(field => {
        const newGridOrder = fieldIds.indexOf(field.id);
        if (newGridOrder !== -1) {
          return {
            ...field,
            gridConfig: {
              ...field.gridConfig,
              gridOrder: newGridOrder
            }
          };
        }
        return field;
      });

      await this.updateConfig({ fields: reorderedFields } as Partial<TConfig>);

    } catch (error) {
      console.error('❌ Error reordenando columnas del grid:', error);
      throw error;
    }
  }

  /**
   * Guardar layout del formulario
   */
  async saveFormLayout(layout: FormLayoutConfig): Promise<void> {
    await this.updateConfig({ formLayout: layout } as Partial<TConfig>);
  }

  /**
   * Obtener campos activos ordenados por formOrder
   */
  getActiveFields(): FieldConfig[] {
    const fields = this.fields();
    return fields
      .filter(field => field.isActive)
      .sort((a, b) => a.formOrder - b.formOrder);
  }

  /**
   * Obtener campos visibles en el grid
   * IMPORTANTE: Si hay un layout personalizado, solo se muestran los campos que están en ese layout
   */
  getGridFields(): FieldConfig[] {
    const fields = this.fields();
    const layout = this.getFormLayout();

    // Filtro base: campos activos con showInGrid = true
    let gridFields = fields.filter(field => field.isActive && field.gridConfig.showInGrid);

    // Si hay layout personalizado, filtrar solo campos que estén en el layout
    if (layout && layout.fields && Object.keys(layout.fields).length > 0) {
      const fieldsInLayout = new Set(Object.keys(layout.fields));
      gridFields = gridFields.filter(field => fieldsInLayout.has(field.id));

    }

    return gridFields.sort((a, b) => a.gridConfig.gridOrder - b.gridConfig.gridOrder);
  }

  /**
   * Obtener layout del formulario
   */
  getFormLayout(): FormLayoutConfig | undefined {
    return this.config()?.formLayout;
  }

  /**
   * Obtener campos que están en uso (en el layout personalizado)
   * Si no hay layout personalizado, retorna todos los campos activos
   */
  getFieldsInUse(): FieldConfig[] {
    const fields = this.fields();
    const layout = this.getFormLayout();

    if (!layout || !layout.fields || Object.keys(layout.fields).length === 0) {
      // Sin layout personalizado, todos los campos activos están "en uso"
      return fields.filter(field => field.isActive);
    }

    // Con layout personalizado, solo los campos que están en el layout están "en uso"
    const fieldsInLayout = new Set(Object.keys(layout.fields));
    return fields.filter(field => field.isActive && fieldsInLayout.has(field.id));
  }

  /**
   * Obtener campos disponibles pero no en uso
   * (campos activos que NO están en el layout personalizado)
   */
  getAvailableFieldsNotInUse(): FieldConfig[] {
    const fields = this.fields();
    const layout = this.getFormLayout();

    if (!layout || !layout.fields || Object.keys(layout.fields).length === 0) {
      // Sin layout personalizado, no hay campos "disponibles pero no en uso"
      return [];
    }

    // Campos activos que NO están en el layout
    const fieldsInLayout = new Set(Object.keys(layout.fields));
    return fields.filter(field => field.isActive && !fieldsInLayout.has(field.id));
  }

  /**
   * Obtener campo por nombre
   */
  getFieldByName(name: string): FieldConfig | undefined {
    return this.fields().find(field => field.name === name);
  }

  /**
   * Verificar si el nombre del campo es único
   */
  isFieldNameUnique(name: string, excludeFieldId?: string): boolean {
    const fields = this.fields();
    return !fields.some(field =>
      field.name === name && field.id !== excludeFieldId
    );
  }

  /**
   * Recargar configuración desde Firestore
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Diagnosticar problemas con la configuración de campos
   * Útil para debugging - ejecutar desde consola del navegador
   */
  diagnoseFields(): void {
    const fields = this.fields();

    // Agrupar por estado
    const active = fields.filter(f => f.isActive);
    const inactive = fields.filter(f => !f.isActive);
    const inGrid = fields.filter(f => f.isActive && f.gridConfig.showInGrid);
    const inFormOnly = fields.filter(f => f.isActive && !f.gridConfig.showInGrid);

    // Buscar problemas potenciales

    fields.forEach(field => {
      const problems: string[] = [];

      // Problema: showInGrid=true pero isActive=false
      if (!field.isActive && field.gridConfig.showInGrid) {
        problems.push('⚠️ Marcado para grid pero está inactivo');
      }

      // Advertencia: Campo activo solo en formulario
      if (field.isActive && !field.gridConfig.showInGrid && !field.isSystem) {
        problems.push('ℹ️ Solo visible en formulario (no en grid)');
      }

      if (problems.length > 0) {

        problems.forEach(p => 

      }
    });

    // Listar campos por categoría

    if (inGrid.length > 0) {
      
      inGrid.forEach(f => 

    }

    if (inFormOnly.length > 0) {
      
      inFormOnly.forEach(f => 

    }

    if (inactive.length > 0) {
      
      inactive.forEach(f => 

    }

  }

  /**
   * Diagnosticar un campo específico por nombre
   * Útil para debugging de campos individuales
   */
  diagnoseField(fieldNameOrLabel: string): void {
    const fields = this.fields();
    const searchTerm = fieldNameOrLabel.toLowerCase();

    const field = fields.find(f =>
      f.name.toLowerCase().includes(searchTerm) ||
      f.label.toLowerCase().includes(searchTerm)
    );

    if (!field) {
      console.error(`❌ Campo "${fieldNameOrLabel}" no encontrado`);
      
      return;
    }

    // Análisis de problemas
    const problems = [];
    if (!field.isActive && field.gridConfig.showInGrid) {
      problems.push('showInGrid está activado pero el campo está inactivo - INCONSISTENCIA');
    }
    if (field.isActive && field.formOrder > 100) {
      problems.push('formOrder muy alto - el campo podría estar muy abajo en el formulario');
    }
    if (field.isActive && !field.formWidth) {
      problems.push('formWidth no definido - podría tener problemas de visualización');
    }

    if (problems.length > 0) {

      problems.forEach(p => 

    } else {

    }

    if (!field.isActive && field.gridConfig.showInGrid) {

    } else if (field.isActive && !field.gridConfig.showInGrid) {

    } else if (field.isActive && field.gridConfig.showInGrid) {

    } else {
      
    }

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
