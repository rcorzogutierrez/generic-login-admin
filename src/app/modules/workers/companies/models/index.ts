/**
 * Modelos y tipos para el módulo de Companies (Empresas Subcontratistas)
 */

import { GenericEntity } from '../../../../shared/models/generic-entity.interface';

/**
 * Interfaz para Company (Empresa Subcontratista)
 */
export interface Company extends GenericEntity {
  // Campos de la empresa
  legalName: string;        // Nombre Legal (requerido)
  taxId: string;            // Tax ID (requerido)
  address?: string;         // Dirección
  phone?: string;           // Teléfono
  email?: string;           // Email

  // Metadatos del sistema
  isActive: boolean;
  createdAt: Date;          // Fecha de ingreso
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Tipo para datos parciales de Company (crear/actualizar)
 */
export type CompanyFormData = Omit<Company, 'id' | 'isActive' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
