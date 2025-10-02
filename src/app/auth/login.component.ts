// src/app/auth/login.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

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
export class LoginComponent implements OnInit {
  // Signals privados
  private _isLoggingIn = signal(false);
  private _loginMessage = signal<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Getters públicos para el template
  isLoggingIn = this._isLoggingIn.asReadonly();
  loginMessage = this._loginMessage.asReadonly();

  // Propiedades del componente
  appInfo = this.authService.getAppInfo();
  angularVersion = '20';

  constructor(
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Limpiar mensajes al cargar
    this._loginMessage.set(null);

    // Redirigir si ya está autenticado y autorizado
    if (this.authService.isAuthenticated() && this.authService.isAuthorized()) {
      const returnUrl =
        this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      console.log('🔄 Usuario ya autenticado, redirigiendo a:', returnUrl);
      this.router.navigate([returnUrl]);
    }
  }

  async loginWithGoogle() {
    if (this._isLoggingIn()) return;

    this._isLoggingIn.set(true);
    this._loginMessage.set(null);

    try {
      console.log('🚀 Iniciando proceso de login...');
      const result = await this.authService.loginWithGoogle();

      if (result.success) {
        this._loginMessage.set({
          type: 'success',
          message: '¡Bienvenido! Redirigiendo al dashboard...',
        });

        // Obtener URL de retorno o ir al dashboard
        const returnUrl =
          this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

        // Pequeño delay para mostrar el mensaje de éxito
        setTimeout(() => {
          console.log('✅ Login exitoso, redirigiendo a:', returnUrl);
          this.router.navigate([returnUrl]);
        }, 1500);
      } else {
        this._loginMessage.set({
          type: 'error',
          message: result.message,
        });

        // Mostrar snackbar también para errores importantes
        this.snackBar.open(result.message, 'Cerrar', {
          duration: 8000,
          panelClass: ['error-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'top',
        });
      }
    } catch (error) {
      console.error('💥 Error inesperado en login:', error);
      this._loginMessage.set({
        type: 'error',
        message: 'Error inesperado. Por favor, intenta nuevamente.',
      });
    } finally {
      this._isLoggingIn.set(false);
    }
  }
}
