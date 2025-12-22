/**
 * Modelos y tipos para el módulo de Workers
 */

import { GenericEntity } from '../../../shared/models/generic-entity.interface';

/**
 * Tipo de trabajador
 */
export type WorkerType = 'internal' | 'contractor';

/**
 * Interfaz para Worker (Trabajadores/Empleados)
 */
export interface Worker extends GenericEntity {
  // Datos personales
  fullName: string;           // Nombres y Apellidos (requerido)
  idOrLicense?: string;       // ID o Licencia de conducir
  socialSecurity?: string;    // Social Security
  address?: string;           // Dirección
  phone?: string;             // Teléfono

  // Tipo de trabajador
  workerType: WorkerType;     // 'internal' = Empleado propio, 'contractor' = Subcontratado
  companyId?: string;         // ID de la empresa (solo si es contractor)
  companyName?: string;       // Nombre de la empresa (desnormalizado para mostrar en lista)

  // Metadatos del sistema
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Tipo para datos parciales de Worker (crear/actualizar)
 */
export type WorkerFormData = Omit<Worker, 'id' | 'isActive' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

/**
 * Labels para tipos de trabajador
 */
export const WORKER_TYPE_LABELS: Record<WorkerType, string> = {
  internal: 'Empleado Propio',
  contractor: 'Subcontratado'
};
