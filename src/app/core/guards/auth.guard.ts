// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si está cargando, esperar
  if (authService.loading()) {
    return false;
  }

  // Si no está autenticado o no está autorizado
  if (!authService.isAuthenticated() || !authService.isAuthorized()) {
    console.log('🚫 Acceso denegado - redirigiendo a login');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  console.log('✅ Auth Guard: Acceso permitido');
  return true;
};
