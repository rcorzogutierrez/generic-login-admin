// src/app/shared/access-denied.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.css',
})
export class AccessDeniedComponent {
  userRole = this.authService.authorizedUser()?.role || 'No definido';
  supportEmail = this.authService.getAppInfo().supportEmail;

  constructor(private router: Router, private authService: AuthService) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.authService.logout();
  }
}
