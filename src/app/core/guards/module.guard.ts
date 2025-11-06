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

    console.log(`🔐 moduleGuard: Verificando acceso al módulo '${requiredModule}'`);

    // Verificar si el usuario está autenticado
    const user = authService.authorizedUser();
    if (!user?.email) {
      console.warn('⛔ moduleGuard: Usuario no autenticado');
      router.navigate(['/login']);
      return false;
    }

    console.log(`👤 moduleGuard: Usuario autenticado - ${user.email} (${user.role})`);

    // Si es admin, permitir acceso inmediato a todos los módulos
    if (user.role === 'admin') {
      console.log(`✅ moduleGuard: Admin tiene acceso completo al módulo '${requiredModule}'`);
      return true;
    }

    try {
      // Solo verificar módulos asignados para usuarios no-admin
      console.log(`🔄 moduleGuard: Inicializando AdminService...`);
      await adminService.initialize();

      // Obtener datos del usuario desde Firebase
      const users = adminService.users();
      console.log(`📊 moduleGuard: Total usuarios cargados: ${users.length}`);

      const currentUserData = users.find(u => u.email === user.email);
      console.log(`📋 moduleGuard: Datos del usuario:`, currentUserData);

      // Verificar si el usuario tiene el módulo asignado
      if (currentUserData?.modules?.includes(requiredModule)) {
        console.log(`✅ moduleGuard: Usuario tiene acceso al módulo '${requiredModule}'`);
        return true;
      }

      console.warn(`⛔ moduleGuard: Usuario no tiene acceso al módulo '${requiredModule}'`);
      console.warn(`   Módulos asignados:`, currentUserData?.modules);
      router.navigate(['/dashboard']);
      return false;

    } catch (error) {
      console.error('❌ moduleGuard: Error verificando acceso al módulo:', error);
      router.navigate(['/dashboard']);
      return false;
    }
  };
}
