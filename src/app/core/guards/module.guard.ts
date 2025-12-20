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

      router.navigate(['/login']);
      return false;
    }

    // Si es admin, permitir acceso inmediato a todos los módulos
    if (user.role === 'admin') {

      return true;
    }

    try {
      // Solo verificar módulos asignados para usuarios no-admin
      // IMPORTANTE: Usar forceRefresh=true para obtener siempre datos frescos de permisos
      
      await adminService.initialize(true);

      // Obtener datos del usuario desde Firebase
      const users = adminService.users();

      const currentUserData = users.find(u => u.email === user.email);

      // Verificar si el usuario tiene el módulo asignado
      if (currentUserData?.modules?.includes(requiredModule)) {

        return true;
      }

      router.navigate(['/dashboard']);
      return false;

    } catch (error) {
      console.error('❌ moduleGuard: Error verificando acceso al módulo:', error);
      router.navigate(['/dashboard']);
      return false;
    }
  };
}
