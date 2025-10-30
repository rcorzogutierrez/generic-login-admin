// src/app/modules/clients/services/client-config-refactored.service.ts

import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { ClientModuleConfig, FieldConfig, DEFAULT_MODULE_CONFIG, DEFAULT_CLIENT_FIELDS } from '../models';
import { ModuleConfigBaseService } from '../../../shared/modules/dynamic-form-builder';

/**
 * Servicio de configuración específico para el módulo de clientes
 * Extiende ModuleConfigBaseService para heredar toda la funcionalidad común
 * y agregar funcionalidad específica de clientes
 */
@Injectable({
  providedIn: 'root'
})
export class ClientConfigServiceRefactored extends ModuleConfigBaseService<ClientModuleConfig> {

  // Implementación de propiedades abstractas
  protected readonly collectionPath = 'moduleConfigs/clients';
  protected readonly defaultFields = DEFAULT_CLIENT_FIELDS;

  /**
   * Retorna la configuración por defecto del módulo de clientes
   */
  protected getDefaultConfig(): Omit<ClientModuleConfig, 'id' | 'lastModified' | 'modifiedBy'> {
    return {
      ...DEFAULT_MODULE_CONFIG,
      // Asegurar que settings específicos de clientes estén incluidos
      settings: {
        enableTags: true,
        enableAssignment: true,
        enableStatus: true,
        requireApproval: false,
        autoArchive: false,
        autoArchiveDays: 365
      }
    };
  }

  // ========================================
  // Métodos específicos de clientes
  // (no están en la clase base)
  // ========================================

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
      console.error('❌ Error reordenando columnas del grid:', error);
      throw error;
    }
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

      const updatedGridConfig = {
        ...currentConfig.gridConfig,
        ...gridConfig
      };

      await this.updateConfig({ gridConfig: updatedGridConfig });

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

      const updatedPermissions = {
        ...currentConfig.permissions,
        ...permissions
      };

      await this.updateConfig({ permissions: updatedPermissions });

    } catch (error) {
      console.error('❌ Error actualizando permisos:', error);
      throw error;
    }
  }

  /**
   * Actualizar layout del formulario
   * (sobrescribe el método de la clase base para agregar validación específica)
   */
  override async saveFormLayout(layout: import('../models/client-module-config.interface').FormLayoutConfig): Promise<void> {
    try {
      // Validación específica de clientes si es necesaria
      if (layout.columns < 2 || layout.columns > 4) {
        throw new Error('El número de columnas debe estar entre 2 y 4');
      }

      // Llamar al método de la clase base
      await super.saveFormLayout(layout);

    } catch (error) {
      console.error('❌ Error actualizando layout del formulario:', error);
      throw error;
    }
  }
}
