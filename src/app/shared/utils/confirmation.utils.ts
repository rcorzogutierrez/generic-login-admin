/**
 * Utilidades compartidas para validación de confirmaciones
 */

/**
 * Normaliza un texto eliminando acentos, convirtiendo a minúsculas y quitando espacios
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Valida si el texto ingresado coincide con la palabra clave esperada
 */
export function validateConfirmation(input: string, keyword: string): boolean {
  return normalizeText(input) === normalizeText(keyword);
}
