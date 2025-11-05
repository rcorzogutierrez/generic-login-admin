import { GenericModuleConfig } from '../../../shared/models/generic-entity.interface';
import { Worker } from '../models';

export const WORKERS_CONFIG: GenericModuleConfig = {
  collection: 'workers',
  entityName: 'Trabajador',
  entityNamePlural: 'Trabajadores',
  deleteDialogFieldsCount: 3,

  fields: [
    {
      name: 'name',
      label: 'Nombre',
      type: 'text',
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'position',
      label: 'Cargo',
      type: 'text',
      showInDelete: true,
      showInGrid: true
    },
    {
      name: 'phone',
      label: 'Teléfono',
      type: 'text',
      showInDelete: false,
      showInGrid: true
    },
    {
      name: 'isActive',
      label: 'Estado',
      type: 'checkbox',
      showInDelete: false,
      showInGrid: true,
      format: (isActive: boolean) => isActive ? '✓ Activo' : '✗ Inactivo'
    }
  ]
};

export function adaptWorkerToGenericEntity(worker: Worker): any {
  return {
    ...worker,
    id: worker.id
  };
}
