// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return async (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // ⏳ Esperar a que el AuthService termine de inicializar
    let maxWaitIterations = 50; // 5 segundos máximo (50 * 100ms)
    while (authService.loading() && maxWaitIterations > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      maxWaitIterations--;
    }

    if (authService.loading()) {

      router.navigate(['/login']);
      return false;
    }

    const user = authService.authorizedUser();

    if (!user) {

      router.navigate(['/login']);
      return false;
    }

    if (allowedRoles.includes(user.role)) {

      return true;
    }

    router.navigate(['/access-denied']);
    return false;
  };
};