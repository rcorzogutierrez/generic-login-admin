// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  const isAuthorized = authService.isAuthorized();

  console.log('🛡️ Auth Guard:', { isAuth, isAuthorized });

  // Si está autenticado Y autorizado, permitir acceso
  if (isAuth && isAuthorized) {
    console.log('✅ Auth Guard: Acceso permitido');
    return true;
  }

  // Si NO está autenticado, redirigir a login
  console.log('🚫 Auth Guard: Redirigiendo a /login');
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};