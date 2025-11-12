/**
 * Utilidades compartidas para manipulación de strings
 *
 * Este módulo proporciona funciones reutilizables para operaciones comunes
 * con strings como normalización de emails, formateo de nombres, generación
 * de iniciales, etc.
 *
 * @module string.utils
 */

/**
 * Normaliza un email a formato estándar (lowercase y sin espacios)
 *
 * @param email - Email a normalizar
 * @returns Email normalizado (lowercase, sin espacios)
 *
 * @example
 * ```typescript
 * normalizeEmail('  USER@EXAMPLE.COM  '); // 'user@example.com'
 * normalizeEmail('Test@Gmail.com');       // 'test@gmail.com'
 * normalizeEmail('');                     // ''
 * ```
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Formatea un nombre completo con capitalización correcta
 *
 * Convierte cada palabra a título capitalizado (primera letra mayúscula,
 * resto minúsculas), útil para nombres propios.
 *
 * @param name - Nombre a formatear
 * @returns Nombre formateado con capitalización correcta
 *
 * @example
 * ```typescript
 * formatDisplayName('juan PÉREZ garcía');  // 'Juan Pérez García'
 * formatDisplayName('MARÍA fernández');    // 'María Fernández'
 * formatDisplayName('  pedro   lopez  ');  // 'Pedro Lopez'
 * formatDisplayName('');                   // ''
 * ```
 */
export function formatDisplayName(name: string): string {
  if (!name) return '';

  return name
    .trim()
    .split(' ')
    .filter(word => word.length > 0) // Eliminar espacios múltiples
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Obtiene las iniciales de un nombre completo
 *
 * Extrae la primera letra del primer y último nombre.
 * Si solo hay un nombre, devuelve solo su primera letra.
 *
 * @param displayName - Nombre completo
 * @returns Iniciales en mayúsculas (1-2 caracteres)
 *
 * @example
 * ```typescript
 * getInitials('Juan Pérez García');    // 'JG'
 * getInitials('María');                // 'M'
 * getInitials('Ana María López Cruz'); // 'AC'
 * getInitials('  ');                   // '??'
 * getInitials('');                     // '??'
 * ```
 */
export function getInitials(displayName: string): string {
  if (!displayName || !displayName.trim()) return '??';

  const words = displayName.trim().split(' ').filter(w => w.length > 0);

  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  // Primera letra del primer nombre + primera letra del último nombre
  return (
    words[0].charAt(0).toUpperCase() +
    words[words.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Genera un color de avatar consistente basado en un string (email, nombre, etc.)
 *
 * Usa un algoritmo de hash para asignar siempre el mismo color al mismo input,
 * útil para avatares de usuarios sin foto.
 *
 * @param input - String base para generar el color (normalmente email)
 * @returns Color en formato hexadecimal (ej: '#3b82f6')
 *
 * @example
 * ```typescript
 * getAvatarColor('user@example.com');    // '#ef4444' (siempre el mismo)
 * getAvatarColor('another@example.com'); // '#06b6d4' (diferente, pero consistente)
 * getAvatarColor('');                    // '#6b7280' (color por defecto)
 * ```
 */
export function getAvatarColor(input: string): string {
  if (!input) return '#6b7280'; // Color gris por defecto

  // Paleta de colores vibrantes (TailwindCSS)
  const colors = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
    '#ec4899'  // pink-500
  ];

  // Algoritmo de hash simple
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Seleccionar color basado en el hash
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Genera un ID corto aleatorio
 *
 * Útil para IDs temporales o identificadores únicos simples.
 *
 * @param length - Longitud del ID (por defecto 7)
 * @returns String aleatorio alfanumérico
 *
 * @example
 * ```typescript
 * generateShortId();     // 'x8k2m9p'
 * generateShortId(10);   // 'a4c8x9m2p5'
 * generateShortId(4);    // 'k3m9'
 * ```
 */
export function generateShortId(length: number = 7): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

/**
 * Trunca un string a una longitud máxima, añadiendo "..." si es necesario
 *
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima (incluyendo "...")
 * @returns Texto truncado
 *
 * @example
 * ```typescript
 * truncateText('Este es un texto muy largo', 15); // 'Este es un t...'
 * truncateText('Corto', 20);                      // 'Corto'
 * truncateText('Exacto', 6);                      // 'Exacto'
 * ```
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Convierte un string a formato slug (URL-friendly)
 *
 * @param text - Texto a convertir
 * @returns Slug (lowercase, sin espacios, sin caracteres especiales)
 *
 * @example
 * ```typescript
 * slugify('Hola Mundo!');           // 'hola-mundo'
 * slugify('Café con Leche');        // 'cafe-con-leche'
 * slugify('  Múltiples   espacios'); // 'multiples-espacios'
 * ```
 */
export function slugify(text: string): string {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')                   // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '')    // Eliminar diacríticos
    .replace(/[^\w\s-]/g, '')           // Eliminar caracteres especiales
    .replace(/\s+/g, '-')               // Reemplazar espacios con guiones
    .replace(/-+/g, '-')                // Eliminar guiones múltiples
    .replace(/^-+|-+$/g, '');           // Eliminar guiones al inicio/fin
}

/**
 * Formatea un número de teléfono (simple, para display)
 *
 * @param phone - Número de teléfono (solo dígitos)
 * @returns Teléfono formateado
 *
 * @example
 * ```typescript
 * formatPhoneNumber('1234567890');  // '(123) 456-7890'
 * formatPhoneNumber('555-1234');    // '555-1234' (sin formato)
 * ```
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Eliminar todo excepto dígitos
  const cleaned = phone.replace(/\D/g, '');

  // Formato (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone; // Devolver original si no es formato estándar
}

/**
 * Capitaliza solo la primera letra de un string
 *
 * @param text - Texto a capitalizar
 * @returns Texto con primera letra mayúscula
 *
 * @example
 * ```typescript
 * capitalize('hello world');  // 'Hello world'
 * capitalize('HELLO');        // 'Hello'
 * capitalize('');             // ''
 * ```
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Valida formato de email (simple)
 *
 * @param email - Email a validar
 * @returns true si el formato es válido
 *
 * @example
 * ```typescript
 * isValidEmail('user@example.com');  // true
 * isValidEmail('invalid.email');     // false
 * isValidEmail('');                  // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Genera un nombre de archivo seguro a partir de un string
 *
 * @param filename - Nombre de archivo original
 * @returns Nombre de archivo seguro
 *
 * @example
 * ```typescript
 * sanitizeFilename('Mi Documento.pdf');        // 'mi-documento.pdf'
 * sanitizeFilename('Reporte #1 (2024).xlsx');  // 'reporte-1-2024.xlsx'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed-file';

  // Separar nombre y extensión
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // Limpiar nombre
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // Reemplazar caracteres no alfanuméricos
    .replace(/-+/g, '-')          // Eliminar guiones múltiples
    .replace(/^-+|-+$/g, '');     // Eliminar guiones al inicio/fin

  return cleanName + ext.toLowerCase();
}

/**
 * Convierte snake_case a Title Case
 *
 * @param text - Texto en snake_case
 * @returns Texto en Title Case
 *
 * @example
 * ```typescript
 * snakeCaseToTitleCase('hello_world');     // 'Hello World'
 * snakeCaseToTitleCase('user_first_name'); // 'User First Name'
 * ```
 */
export function snakeCaseToTitleCase(text: string): string {
  if (!text) return '';

  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Enmascara un email para privacidad
 *
 * @param email - Email a enmascarar
 * @returns Email parcialmente oculto
 *
 * @example
 * ```typescript
 * maskEmail('usuario@example.com');  // 'usu***@example.com'
 * maskEmail('a@test.com');           // 'a***@test.com'
 * ```
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 3) {
    return `${localPart}***@${domain}`;
  }

  const visibleChars = Math.min(3, Math.floor(localPart.length / 3));
  return `${localPart.substring(0, visibleChars)}***@${domain}`;
}
