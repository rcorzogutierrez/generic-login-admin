// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavbarService } from '../../shared/services/navbar.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const navbarService = inject(NavbarService);

  const isAuth = authService.isAuthenticated();
  const isAuthorized = authService.isAuthorized();

  if (isAuth && isAuthorized) {
    navbarService.show(); // ✅ Mostrar navbar
    return true;
  }

  navbarService.hide(); // ❌ Ocultar navbar
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};