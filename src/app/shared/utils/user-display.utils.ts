/**
 * Utilidades compartidas para mostrar información de usuarios
 */

export interface UserDisplayData {
  displayName?: string;
  email: string;
}

/**
 * Genera las iniciales de un usuario basado en su nombre o email
 */
export function getUserInitials(user: UserDisplayData): string {
  const name = user.displayName || user.email;
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Genera un color de gradiente consistente basado en el email del usuario
 */
export function getUserColor(email: string): string {
  const colors = [
    'linear-gradient(135deg, #ef4444, #dc2626)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #3b82f6, #2563eb)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #ec4899, #db2777)'
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
