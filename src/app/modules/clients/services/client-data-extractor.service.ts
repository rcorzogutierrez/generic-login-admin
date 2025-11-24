// src/app/modules/clients/services/client-data-extractor.service.ts

import { Injectable, inject } from '@angular/core';
import { Client } from '../models';
import { FieldType } from '../models/field-config.interface';
import { ClientConfigServiceRefactored } from './client-config-refactored.service';
import { getFieldValue } from '../../../shared/modules/dynamic-form-builder/utils';

/**
 * Servicio para extraer datos de clientes de manera consistente
 *
 * Este servicio centraliza la lógica para extraer información de clientes,
 * considerando tanto campos dinámicos como campos estándar.
 *
 * NOTA: Para campos de dirección (address, city, state, zipCode), usa el
 * ProposalConfigService.getAddressMapping() en lugar de este servicio, ya que
 * esos campos están mapeados específicamente en la configuración del módulo.
 */
@Injectable({
  providedIn: 'root'
})
export class ClientDataExtractorService {
  private clientConfigService = inject(ClientConfigServiceRefactored);

  /**
   * Obtiene el nombre del cliente
   */
  getName(client: Client | undefined): string {
    if (!client) return 'Sin nombre';

    // Buscar en campos estándar primero
    if (client.name) return client.name;

    // Buscar en campos dinámicos
    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar campo de nombre por nombre específico
    const nameField = fields.find(f =>
      f.name === 'name' ||
      f.name === 'nombre' ||
      f.name === 'nombre_del_cliente'
    );

    if (nameField) {
      const value = getFieldValue(client, nameField.name);
      if (value) return String(value);
    }

    // Buscar cualquier campo TEXT como último recurso
    const textField = fields.find(f => f.type === FieldType.TEXT);
    if (textField) {
      const value = getFieldValue(client, textField.name);
      if (value) return String(value);
    }

    return 'Sin nombre';
  }

  /**
   * Obtiene el email del cliente
   */
  getEmail(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar primero
    if (client.email) return client.email;

    // Buscar en campos dinámicos
    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar campo de email por tipo
    const emailField = fields.find(f => f.type === FieldType.EMAIL);

    if (emailField) {
      const value = getFieldValue(client, emailField.name);
      if (value) return String(value);
    }

    // Buscar por nombre como fallback
    const emailByName = fields.find(f =>
      f.name === 'email' ||
      f.name === 'correo'
    );

    if (emailByName) {
      const value = getFieldValue(client, emailByName.name);
      if (value) return String(value);
    }

    return '';
  }

  /**
   * Obtiene el teléfono del cliente
   */
  getPhone(client: Client | undefined): string {
    if (!client) return '';

    // Buscar en campos estándar primero
    if (client.phone) return client.phone;

    // Buscar en campos dinámicos
    const fields = this.clientConfigService.getFieldsInUse();

    // Buscar campo de teléfono por tipo
    const phoneField = fields.find(f => f.type === FieldType.PHONE);

    if (phoneField) {
      const value = getFieldValue(client, phoneField.name);
      if (value) return String(value);
    }

    // Buscar por nombre como fallback
    const phoneByName = fields.find(f =>
      f.name === 'phone' ||
      f.name === 'telefono' ||
      f.name === 'tel'
    );

    if (phoneByName) {
      const value = getFieldValue(client, phoneByName.name);
      if (value) return String(value);
    }

    return '';
  }

  /**
   * Obtiene un campo del cliente usando un nombre específico
   *
   * Este método es útil cuando tienes un nombre de campo específico
   * (por ejemplo, del mapping de configuración) y quieres obtener su valor.
   *
   * @param client - El cliente
   * @param fieldName - Nombre exacto del campo a buscar
   * @param fallbackStandardField - Campo estándar como fallback
   * @returns El valor del campo o string vacío
   */
  getFieldByName(
    client: Client | undefined,
    fieldName: string,
    fallbackStandardField?: keyof Client
  ): string {
    if (!client) return '';

    // Buscar en campos estándar primero si hay fallback
    if (fallbackStandardField && client[fallbackStandardField]) {
      return String(client[fallbackStandardField]);
    }

    // Buscar en campos dinámicos usando el nombre específico
    const value = getFieldValue(client, fieldName);
    return value ? String(value) : '';
  }
}