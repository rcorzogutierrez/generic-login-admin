// ui-utils.service.ts - SERVICIO COMPARTIDO PARA UTILIDADES UI
// Creado para eliminar duplicación de código según principio DRY
import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Servicio compartido para utilidades de UI reutilizables
 * Elimina duplicación de código en múltiples componentes
 */
@Injectable({
  providedIn: 'root'
})
export class UiUtilsService {

  /**
   * Genera un color basado en el hash del email
   * Usado para avatares de usuario consistentes
   */
  getColorFromEmail(email: string): string {
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

  /**
   * Obtiene las iniciales de un nombre completo
   * Ejemplos: "Juan Pérez" -> "JP", "Ana" -> "A"
   */
  getInitials(name: string): string {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Obtiene el icono de Material correspondiente a cada rol
   */
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      admin: 'shield',
      user: 'person',
      viewer: 'visibility'
    };
    return icons[role] || 'person';
  }

  /**
   * Obtiene el icono de Material correspondiente a cada permiso
   */
  getPermissionIcon(permission: string): string {
    const icons: Record<string, string> = {
      read: 'visibility',
      write: 'edit',
      delete: 'delete',
      manage_users: 'people'
    };
    return icons[permission] || 'check_circle';
  }

  /**
   * Obtiene el color asociado a cada rol
   */
  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      admin: 'warn',
      user: 'primary',
      viewer: 'accent'
    };
    return colors[role] || 'primary';
  }

  /**
   * Toggle de un item en un array (agrega si no existe, elimina si existe)
   * Retorna un nuevo array (inmutable)
   */
  toggleArrayItem<T>(array: T[], item: T): T[] {
    const index = array.indexOf(item);
    if (index > -1) {
      return [...array.slice(0, index), ...array.slice(index + 1)];
    }
    return [...array, item];
  }

  /**
   * Obtiene el mensaje de error apropiado para un control de formulario
   * Centraliza la lógica de validación de formularios
   */
  getFormFieldError(control: AbstractControl | null, fieldLabel: string): string {
    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return `${fieldLabel} es requerido`;
    }
    if (control.hasError('email')) {
      return 'Email inválido';
    }
    if (control.hasError('minlength')) {
      const len = control.getError('minlength').requiredLength;
      return `Mínimo ${len} caracteres`;
    }
    if (control.hasError('maxlength')) {
      const len = control.getError('maxlength').requiredLength;
      return `Máximo ${len} caracteres`;
    }
    if (control.hasError('pattern')) {
      return 'Formato inválido';
    }

    return 'Campo inválido';
  }

  /**
   * Formatea una fecha relativa (ej: "Hace 5 minutos", "Ayer", etc.)
   */
  getRelativeTime(timestamp: any): string {
    if (!timestamp) return 'Fecha desconocida';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Ahora mismo';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;

      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Formatea una fecha en formato legible
   */
  formatDate(timestamp: any, format: 'short' | 'long' = 'short'): string {
    if (!timestamp) return 'Fecha desconocida';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

      if (format === 'long') {
        return date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  /**
   * Normaliza un email a minúsculas y sin espacios
   */
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Verifica si un string es un email válido
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Capitaliza la primera letra de cada palabra
   */
  capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
