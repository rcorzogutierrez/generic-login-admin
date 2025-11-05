/**
 * Servicio de configuración para el módulo de Materials
 * Extiende ModuleConfigBaseService para heredar funcionalidad común
 */

import { Injectable } from '@angular/core';
import { MaterialModuleConfig, DEFAULT_MODULE_CONFIG, DEFAULT_MATERIAL_FIELDS } from '../models';
import { ModuleConfigBaseService } from '../../../shared/modules/dynamic-form-builder';

@Injectable({
  providedIn: 'root'
})
export class MaterialsConfigService extends ModuleConfigBaseService<MaterialModuleConfig> {

  // Implementación de propiedades abstractas
  protected readonly collectionPath = 'moduleConfigs/materials';
  protected readonly defaultFields = DEFAULT_MATERIAL_FIELDS;

  /**
   * Retorna la configuración por defecto del módulo de materials
   */
  protected getDefaultConfig(): Omit<MaterialModuleConfig, 'id' | 'lastModified' | 'modifiedBy'> {
    return {
      ...DEFAULT_MODULE_CONFIG,
      fields: [],
      settings: {
        enableTags: true,
        enableCategories: true,
        enableStock: true,
        requireApproval: false,
        autoExpiry: false,
        expiryDays: 365
      }
    } as Omit<MaterialModuleConfig, 'id' | 'lastModified' | 'modifiedBy'>;
  }

  /**
   * Métodos específicos de Materials (si se necesitan en el futuro)
   */

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

      await this.updateConfig({ fields: reorderedFields });
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

      await this.updateConfig({ fields: reorderedFields });
    } catch (error) {
      console.error('❌ Error reordenando columnas:', error);
      throw error;
    }
  }
}
