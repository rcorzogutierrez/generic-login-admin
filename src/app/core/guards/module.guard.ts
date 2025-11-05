// src/app/core/guards/module.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../../admin/services/admin.service';

/**
 * Guard que verifica si el usuario tiene un módulo específico asignado
 * Uso: canActivate: [moduleGuard('materials')]
 */
export function moduleGuard(requiredModule: string): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const adminService = inject(AdminService);
    const router = inject(Router);

    // Verificar si el usuario está autenticado
    const user = authService.authorizedUser();
    if (!user?.email) {
      console.warn('⛔ moduleGuard: Usuario no autenticado');
      router.navigate(['/login']);
      return false;
    }

    try {
      // Inicializar AdminService si no está inicializado
      await adminService.initialize();

      // Obtener datos del usuario desde Firebase
      const users = adminService.users();
      const currentUserData = users.find(u => u.email === user.email);

      // Verificar si el usuario tiene el módulo asignado
      if (currentUserData?.modules?.includes(requiredModule)) {
        console.log(`✅ moduleGuard: Usuario tiene acceso al módulo '${requiredModule}'`);
        return true;
      }

      // Si es admin, permitir acceso a todos los módulos
      if (user.role === 'admin') {
        console.log(`✅ moduleGuard: Admin tiene acceso completo al módulo '${requiredModule}'`);
        return true;
      }

      console.warn(`⛔ moduleGuard: Usuario no tiene acceso al módulo '${requiredModule}'`);
      router.navigate(['/dashboard']);
      return false;

    } catch (error) {
      console.error('❌ moduleGuard: Error verificando acceso al módulo:', error);
      router.navigate(['/dashboard']);
      return false;
    }
  };
}
