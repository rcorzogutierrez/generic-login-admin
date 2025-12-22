import { Component } from '@angular/core';
import { AuthService } from './auth.service';
import { AppConfigService } from './app-config.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  constructor(
    private authService: AuthService,
    public appConfigService: AppConfigService // Usa 'public' para acceso en el HTML
  ) {}

  onSubmit(email: string, password: string) {
    this.appConfigService.setLoading(true);
    this.authService.login(email, password).then(() => {
      this.appConfigService.setLoading(false);
    });
  }
}