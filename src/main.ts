// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('🎉 Angular Firebase Auth App iniciada exitosamente!');
  })
  .catch((err) => {
    console.error('💥 Error iniciando la aplicación:', err);
  });
