import { Injectable } from '@angular/core';
import { WorkerModuleConfig, DEFAULT_MODULE_CONFIG, DEFAULT_WORKER_FIELDS } from '../models';
import { ModuleConfigBaseService } from '../../../shared/modules/dynamic-form-builder';

@Injectable({
  providedIn: 'root'
})
export class WorkersConfigService extends ModuleConfigBaseService<WorkerModuleConfig> {
  protected readonly collectionPath = 'moduleConfigs/workers';
  protected readonly defaultFields = DEFAULT_WORKER_FIELDS;

  protected getDefaultConfig(): Omit<WorkerModuleConfig, 'id' | 'lastModified' | 'modifiedBy'> {
    return {
      ...DEFAULT_MODULE_CONFIG,
      fields: [],
      settings: {
        enableTags: true,
        enableDepartments: true,
        enableShifts: true,
        requireApproval: false,
        autoDeactivate: false,
        deactivateDays: 90
      }
    } as Omit<WorkerModuleConfig, 'id' | 'lastModified' | 'modifiedBy'>;
  }
}
