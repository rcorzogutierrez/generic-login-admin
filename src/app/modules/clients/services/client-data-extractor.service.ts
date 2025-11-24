// src/app/modules/clients/services/client-data-extractor.service.ts

import { Injectable, inject } from '@angular/core';
import { Client } from '../models';
import { FieldType } from '../models/field-config.interface';
import { ClientConfigServiceRefactored } from './client-config-refactored.service';
import { getFieldValue } from '../../../shared/modules/dynamic-form-builder/utils';

/**
 * Configuración para buscar un campo específico en un cliente
 */
interface FieldSearchConfig {
  /** Tipos de campo aceptables */
  types?: FieldType[];
  /** Nombres de campo aceptables */
  names?: string[];
  /** Nombre del campo estándar de fallback */
  fallbackProperty?: keyof Client;
  /** Valor por defecto si no se encuentra nada */
  defaultValue?: string;
}

/**
 * Servicio para extraer datos de clientes de manera consistente
 *
 * Este servicio centraliza la lógica para extraer información de clientes,
 * considerando tanto campos dinámicos como campos estándar.
 */
@Injectable({
  providedIn: 'root'
})
export class ClientDataExtractorService {
  private clientConfigService = inject(ClientConfigServiceRefactored);

  /**
   * Extrae el valor de un campo del cliente, buscando en campos dinámicos primero
   * y luego en campos estándar
   *
   * @param client - El cliente del cual extraer datos
   * @param config - Configuración de búsqueda
   * @returns El valor encontrado o el valor por defecto
   */
  private extractField(client: Client | undefined, config: FieldSearchConfig): string {
    if (!client) return config.defaultValue || '';

    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar en campos dinámicos
    const matchingField = fields.find(f => {
      const typeMatches = config.types?.includes(f.type);
      const nameMatches = config.names?.includes(f.name);
      return typeMatches || nameMatches;
    });

    if (matchingField) {
      const value = getFieldValue(client, matchingField.name);
      if (value) return String(value);
    }

    // Fallback a campos estándar
    if (config.fallbackProperty && client[config.fallbackProperty]) {
      return String(client[config.fallbackProperty]);
    }

    return config.defaultValue || '';
  }

  /**
   * Obtiene el nombre del cliente
   */
  getName(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.TEXT],
      names: ['name', 'nombre', 'nombre_del_cliente'],
      fallbackProperty: 'name',
      defaultValue: 'Sin nombre'
    });
  }

  /**
   * Obtiene el email del cliente
   */
  getEmail(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.EMAIL],
      names: ['email', 'correo'],
      fallbackProperty: 'email',
      defaultValue: ''
    });
  }

  /**
   * Obtiene el teléfono del cliente
   */
  getPhone(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.PHONE],
      names: ['phone', 'telefono', 'tel'],
      fallbackProperty: 'phone',
      defaultValue: ''
    });
  }

  /**
   * Obtiene la dirección del cliente
   */
  getAddress(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.TEXT],
      names: ['address', 'direccion', 'calle'],
      fallbackProperty: 'address',
      defaultValue: ''
    });
  }

  /**
   * Obtiene la ciudad del cliente
   */
  getCity(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.TEXT],
      names: ['city', 'ciudad'],
      fallbackProperty: 'city',
      defaultValue: ''
    });
  }

  /**
   * Obtiene el estado del cliente
   */
  getState(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.TEXT],
      names: ['state', 'estado', 'provincia'],
      defaultValue: ''
    });
  }

  /**
   * Obtiene el código postal del cliente
   */
  getZipCode(client: Client | undefined): string {
    return this.extractField(client, {
      types: [FieldType.TEXT],
      names: ['zipCode', 'zip_code', 'codigo_postal', 'cp'],
      fallbackProperty: 'zipCode',
      defaultValue: ''
    });
  }

  /**
   * Obtiene todos los datos del cliente de una vez
   * Útil para obtener todos los campos necesarios en una sola llamada
   */
  getAllData(client: Client | undefined) {
    return {
      name: this.getName(client),
      email: this.getEmail(client),
      phone: this.getPhone(client),
      address: this.getAddress(client),
      city: this.getCity(client),
      state: this.getState(client),
      zipCode: this.getZipCode(client)
    };
  }
}
