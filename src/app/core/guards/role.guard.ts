// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log(`🔒 roleGuard: Verificando acceso a ${state.url}`);
    console.log(`   Roles permitidos:`, allowedRoles);

    const user = authService.authorizedUser();

    if (!user) {
      console.warn('⛔ roleGuard: Usuario no autenticado');
      router.navigate(['/login']);
      return false;
    }

    console.log(`👤 roleGuard: Usuario - ${user.email} (rol: ${user.role})`);

    if (allowedRoles.includes(user.role)) {
      console.log(`✅ roleGuard: Acceso permitido`);
      return true;
    }

    console.warn(`⛔ roleGuard: Acceso denegado - El rol '${user.role}' no está en roles permitidos:`, allowedRoles);
    router.navigate(['/access-denied']);
    return false;
  };
};