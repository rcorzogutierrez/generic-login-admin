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
          console.warn('⚠️ Fields no es un array válido, inicializando como array vacío');
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
      console.warn('⚠️ currentFields no es un array, inicializando como array vacío');
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
   */
  getGridFields(): FieldConfig[] {
    const fields = this.fields();
    return fields
      .filter(field => field.isActive && field.gridConfig.showInGrid)
      .sort((a, b) => a.gridConfig.gridOrder - b.gridConfig.gridOrder);
  }

  /**
   * Obtener layout del formulario
   */
  getFormLayout(): FormLayoutConfig | undefined {
    return this.config()?.formLayout;
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

    console.group('📊 DIAGNÓSTICO DE CAMPOS');
    console.log(`Total de campos: ${fields.length}\n`);

    // Agrupar por estado
    const active = fields.filter(f => f.isActive);
    const inactive = fields.filter(f => !f.isActive);
    const inGrid = fields.filter(f => f.isActive && f.gridConfig.showInGrid);
    const inFormOnly = fields.filter(f => f.isActive && !f.gridConfig.showInGrid);

    console.log(`✅ Campos activos: ${active.length}`);
    console.log(`❌ Campos inactivos: ${inactive.length}`);
    console.log(`📊 En grid: ${inGrid.length}`);
    console.log(`📝 Solo en formulario: ${inFormOnly.length}\n`);

    // Buscar problemas potenciales
    console.group('🔍 ANÁLISIS DETALLADO');

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
        console.group(`${field.label} (${field.name})`);
        console.log(`  ID: ${field.id}`);
        console.log(`  isActive: ${field.isActive}`);
        console.log(`  showInGrid: ${field.gridConfig.showInGrid}`);
        console.log(`  formOrder: ${field.formOrder}`);
        console.log(`  gridOrder: ${field.gridConfig.gridOrder}`);
        problems.forEach(p => console.log(`  ${p}`));
        console.groupEnd();
      }
    });

    console.groupEnd();

    // Listar campos por categoría
    console.group('📋 CAMPOS POR CATEGORÍA');

    if (inGrid.length > 0) {
      console.group(`Campos en Grid (${inGrid.length})`);
      inGrid.forEach(f => console.log(`  - ${f.label} (${f.name})`));
      console.groupEnd();
    }

    if (inFormOnly.length > 0) {
      console.group(`Solo en Formulario (${inFormOnly.length})`);
      inFormOnly.forEach(f => console.log(`  - ${f.label} (${f.name})`));
      console.groupEnd();
    }

    if (inactive.length > 0) {
      console.group(`Inactivos (${inactive.length})`);
      inactive.forEach(f => console.log(`  - ${f.label} (${f.name}) - showInGrid: ${f.gridConfig.showInGrid}`));
      console.groupEnd();
    }

    console.groupEnd();
    console.groupEnd();
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
