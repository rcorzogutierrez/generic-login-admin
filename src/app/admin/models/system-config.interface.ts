// src/app/admin/models/system-config.interface.ts
export interface SystemConfig {
    id: string; // 'system_config' (único documento)
    appName: string; // Nombre de la aplicación
    appDescription: string; // Descripción
    logoUrl: string; // URL del logo en Firebase Storage
    logoStoragePath: string; // Path en Storage para eliminación
    logoBackgroundColor: string; // Color de fondo del logo
    adminContactEmail: string; // Email del admin
    footerText: string; // Texto del footer
    footerColor: string; // Color de fondo del footer
    footerTextColor: string; // Color del texto del footer
    faviconUrl?: string; // URL del favicon (puede ser el mismo logo)

    // Metadata
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number; // Para control de versiones
  }

  export interface LogoUploadResult {
    success: boolean;
    logoUrl?: string;
    storagePath?: string;
    message: string;
    error?: any;
  }