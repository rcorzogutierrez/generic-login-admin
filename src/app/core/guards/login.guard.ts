// src/app/core/guards/login.guard.ts - VERSIÓN FINAL
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🔐 LOGIN GUARD ejecutándose');

  const isAuth = authService.isAuthenticated();
  const isAuthorized = authService.isAuthorized();

  console.log('📊 Estado:', { isAuth, isAuthorized });

  // Si está autenticado Y autorizado, redirigir al dashboard
  if (isAuth && isAuthorized) {
    console.log('✅ Usuario ya autenticado, redirigiendo a /dashboard');
    router.navigate(['/dashboard']);
    return false;
  }

  // Si NO está autenticado, permitir acceso al login
  console.log('✅ Permitiendo acceso a página de login');
  return true;
};