// src/app/admin/models/role.interface.ts
export interface Role {
  id: string;
  value: string;
  label: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;  // true para admin, user, viewer (no se pueden eliminar)
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  userCount?: number;  // Contador de usuarios con este rol
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}
