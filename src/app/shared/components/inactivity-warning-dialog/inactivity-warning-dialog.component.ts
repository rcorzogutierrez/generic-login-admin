// src/app/shared/components/inactivity-warning-dialog/inactivity-warning-dialog.component.ts

import { Component, Inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface InactivityWarningDialogData {
  warningSeconds: number;
}

@Component({
  selector: 'app-inactivity-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './inactivity-warning-dialog.component.html',
  styleUrl: './inactivity-warning-dialog.component.css'
})
export class InactivityWarningDialogComponent implements OnInit, OnDestroy {
  secondsRemaining = signal<number>(0);
  private countdownInterval: any = null;

  constructor(
    public dialogRef: MatDialogRef<InactivityWarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InactivityWarningDialogData
  ) {}

  ngOnInit() {
    // Inicializar countdown
    this.secondsRemaining.set(this.data.warningSeconds);
    this.startCountdown();
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  /**
   * Iniciar countdown
   */
  private startCountdown() {
    this.countdownInterval = setInterval(() => {
      const current = this.secondsRemaining();
      if (current > 0) {
        this.secondsRemaining.set(current - 1);
      } else {
        // Tiempo agotado, cerrar y hacer logout
        this.stopCountdown();
        this.dialogRef.close(false);
      }
    }, 1000);
  }

  /**
   * Detener countdown
   */
  private stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Formatear segundos a MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Usuario quiere continuar sesión
   */
  continueSession() {
    this.stopCountdown();
    this.dialogRef.close(true);
  }

  /**
   * Usuario quiere cerrar sesión
   */
  logout() {
    this.stopCountdown();
    this.dialogRef.close(false);
  }
}
