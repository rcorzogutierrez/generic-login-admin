// src/app/shared/pipes/currency-formatter.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear cantidades como moneda
 *
 * Uso en templates:
 * {{ amount | currencyFormatter }}
 * {{ amount | currencyFormatter:'EUR' }}
 * {{ amount | currencyFormatter:'USD':'es-ES' }}
 *
 * @example
 * {{ 1234.56 | currencyFormatter }} → "$1,234.56"
 * {{ 1234.56 | currencyFormatter:'EUR' }} → "€1,234.56"
 * {{ 1234.56 | currencyFormatter:'USD':'es-ES' }} → "1.234,56 US$"
 */
@Pipe({
  name: 'currencyFormatter',
  standalone: true
})
export class CurrencyFormatterPipe implements PipeTransform {
  /**
   * Transforma un número en formato de moneda
   *
   * @param value - El valor numérico a formatear
   * @param currency - Código de moneda (ISO 4217) - default: 'USD'
   * @param locale - Código de locale para formateo - default: 'en-US'
   * @returns El valor formateado como string de moneda
   */
  transform(value: number | null | undefined, currency: string = 'USD', locale: string = 'en-US'): string {
    // Manejar valores nulos o undefined
    if (value === null || value === undefined) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(0);
    }

    // Formatear el valor
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value);
  }
}
