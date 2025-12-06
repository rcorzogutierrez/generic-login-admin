// src/app/core/guards/login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  const isAuthorized = authService.isAuthorized();

  if (isAuth && isAuthorized) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
