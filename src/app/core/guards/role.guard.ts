// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.loading()) return false;

    if (!authService.isAuthenticated() || !authService.isAuthorized()) {
      router.navigate(['/login']);
      return false;
    }

    const userRole = authService.authorizedUser()?.role;
    if (userRole && allowedRoles.includes(userRole)) {
      console.log(`✅ Role Guard: Acceso permitido para rol ${userRole}`);
      return true;
    }

    console.log(
      `🚫 Role Guard: Rol ${userRole} no permitido para roles: ${allowedRoles.join(
        ', '
      )}`
    );
    router.navigate(['/access-denied']);
    return false;
  };
}
