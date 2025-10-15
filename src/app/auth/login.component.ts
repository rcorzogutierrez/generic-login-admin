// src/app/auth/login.component.ts
import { Component, OnInit, OnDestroy, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AppConfigService } from '../core/services/app-config.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private _isLoggingIn = signal(false);
  private _loginMessage = signal<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  isLoggingIn = this._isLoggingIn.asReadonly();
  loginMessage = this._loginMessage.asReadonly();

  // Tipado explícito para permitir null
  appName: Signal<string | null> = this.appConfigService.appName;
  appDescription: Signal<string | null> = this.appConfigService.appDescription;
  logoUrl: Signal<string | null> = this.appConfigService.logoUrl;
  logoBackgroundColor = this.appConfigService.logoBackgroundColor;
  adminContactEmail: Signal<string | null> = this.appConfigService.adminContactEmail;

  appInfo = this.authService.getAppInfo();
  angularVersion = '20';

  private checkInterval: any;

  constructor(
    public authService: AuthService,
    private appConfigService: AppConfigService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    console.log('🔍 LoginComponent - Valores actuales:', {
      appName: this.appName(),
      appDescription: this.appDescription(),
      logoUrl: this.logoUrl(),
      adminContactEmail: this.adminContactEmail()
    });
    
    this._loginMessage.set(null);
    this.checkAuthAndRedirect();
    
    this.checkInterval = setInterval(() => {
      this.checkAuthAndRedirect();
    }, 200);
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  private checkAuthAndRedirect(): void {
    const isLoading = this.authService.loading();
    const isAuth = this.authService.isAuthenticated();
    const isAuthorized = this.authService.isAuthorized();

    if (!isLoading && isAuth && isAuthorized) {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }

      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate([returnUrl]);
    }
  }

  async loginWithGoogle() {
    if (this._isLoggingIn()) return;

    this._isLoggingIn.set(true);
    this._loginMessage.set(null);

    try {
      const result = await this.authService.loginWithGoogle();

      if (result.success) {
        this._loginMessage.set({
          type: 'success',
          message: '¡Bienvenido! Redirigiendo...',
        });

        setTimeout(() => {
          this.checkAuthAndRedirect();
        }, 1000);

      } else {
        this._loginMessage.set({
          type: 'error',
          message: result.message,
        });

        this.snackBar.open(result.message, 'Cerrar', {
          duration: 8000,
          panelClass: ['error-snackbar'],
        });
      }
    } catch (error: any) {
      this._loginMessage.set({
        type: 'error',
        message: error.message || 'Error inesperado',
      });
    } finally {
      this._isLoggingIn.set(false);
    }
  }
}