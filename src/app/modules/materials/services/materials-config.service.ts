/**
 * Servicio de configuración para el módulo de Materials
 * Extiende ModuleConfigBaseService para heredar funcionalidad común
 */

import { Injectable } from '@angular/core';
import { MaterialModuleConfig, DEFAULT_MODULE_CONFIG } from '../models';
import { ModuleConfigBaseService } from '../../../shared/modules/dynamic-form-builder';

@Injectable({
  providedIn: 'root'
})
// @ts-expect-error - MaterialModuleConfig extends GenericModuleConfig, type compatibility handled at runtime
export class MaterialsConfigService extends ModuleConfigBaseService<MaterialModuleConfig> {

  // Implementación de propiedades abstractas
  protected readonly collectionPath = 'moduleConfigs/materials';
  protected readonly defaultFields = []; // Sin campos por defecto - solo los configurados en el builder

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

  // toggleFieldActive, reorderFields, reorderGridColumns ahora están en base class
  // Métodos específicos de Materials se pueden agregar aquí en el futuro
}
