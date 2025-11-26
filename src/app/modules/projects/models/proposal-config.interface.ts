// src/app/modules/projects/models/proposal-config.interface.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Un mapeo individual de campo del cliente al estimado
 */
export interface ProposalFieldMapping {
  /**
   * Nombre del campo en el cliente (origen)
   * Ej: 'name', 'email', 'direccion', 'telefono_movil'
   */
  sourceField: string;

  /**
   * Nombre del campo en el estimado (destino)
   * Valores permitidos: 'name', 'email', 'phone', 'company', 'address', 'city', 'state', 'zipCode'
   */
  targetField: 'name' | 'email' | 'phone' | 'company' | 'address' | 'city' | 'state' | 'zipCode';

  /**
   * Orden de visualización en la UI
   */
  order?: number;
}

/**
 * @deprecated - Usar ProposalFieldMapping[] en su lugar
 * Mantenido para compatibilidad con datos existentes
 */
export interface ProposalClientFieldsMapping {
  name: string;
  email: string;
  phone: string;
  company: string;
}

/**
 * @deprecated - Usar ProposalFieldMapping[] en su lugar
 * Mantenido para compatibilidad con datos existentes
 */
export interface ProposalAddressMapping {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Configuración del módulo de Proposals/Estimados
 */
export interface ProposalModuleConfig {
  // ID único de la configuración
  id: string;

  // Mapeo dinámico de campos del cliente al estimado
  fieldMappings: ProposalFieldMapping[];

  // ====== Campos legacy (deprecados) ======
  // @deprecated - Usar fieldMappings en su lugar
  clientFieldsMapping?: ProposalClientFieldsMapping;
  // @deprecated - Usar fieldMappings en su lugar
  clientAddressMapping?: ProposalAddressMapping;

  // Configuración de valores por defecto
  defaultTaxPercentage?: number;        // Porcentaje de impuesto por defecto
  defaultValidityDays?: number;         // Días de validez por defecto
  defaultWorkType?: 'residential' | 'commercial';  // Tipo de trabajo por defecto
  defaultTerms?: string;                // Términos y condiciones por defecto

  // Metadata del sistema
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Datos para crear una nueva configuración
 */
export interface CreateProposalConfigData {
  fieldMappings: ProposalFieldMapping[];
  defaultTaxPercentage?: number;
  defaultValidityDays?: number;
  defaultWorkType?: 'residential' | 'commercial';
  defaultTerms?: string;
}

/**
 * Datos para actualizar la configuración
 */
export interface UpdateProposalConfigData extends Partial<CreateProposalConfigData> {}

/**
 * Configuración por defecto del módulo
 */
export const DEFAULT_PROPOSAL_CONFIG: Omit<ProposalModuleConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  fieldMappings: [
    { sourceField: 'name', targetField: 'name', order: 1 },
    { sourceField: 'email', targetField: 'email', order: 2 },
    { sourceField: 'phone', targetField: 'phone', order: 3 },
    { sourceField: 'company', targetField: 'company', order: 4 },
    { sourceField: 'address', targetField: 'address', order: 5 },
    { sourceField: 'city', targetField: 'city', order: 6 },
    { sourceField: 'estado', targetField: 'state', order: 7 },
    { sourceField: 'codigo_postal', targetField: 'zipCode', order: 8 }
  ],
  defaultTaxPercentage: 0,
  defaultValidityDays: 30,
  defaultWorkType: 'residential',
  defaultTerms: `Términos y Condiciones:

1. Forma de Pago: 50% al inicio de los trabajos y 50% al finalizar.

2. Los precios pueden variar según cambios en el alcance del proyecto o materiales adicionales solicitados.

3. Cualquier trabajo adicional no especificado en este estimado será cotizado por separado.

4. El cliente es responsable de obtener los permisos necesarios antes del inicio de los trabajos.

5. Este estimado es válido por el periodo especificado. Después de esta fecha, los precios están sujetos a cambios.

6. La empresa no se hace responsable por daños a estructuras ocultas o no visibles durante la inspección inicial.`
};
