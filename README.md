# Business Management System

> **Sistema integral de gestión empresarial** para administrar clientes, proyectos, estimados, trabajadores y materiales - construido con Angular 20 y Firebase.

[![Claude Code](https://img.shields.io/badge/Powered%20by-Claude%20Code-orange?style=for-the-badge&logo=claude&logoColor=orange)](https://claude.ai/code)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
![Angular](https://img.shields.io/badge/Framework-Angular_20-red?logo=angular&logoColor=white&style=for-the-badge)
![Firebase](https://img.shields.io/badge/Backend-Firebase-ffca28?logo=firebase&logoColor=white&style=for-the-badge)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Angular Material](https://img.shields.io/badge/UI-Angular_Material-C3002F?style=for-the-badge&logo=angular&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📋 Tabla de Contenido

- [Descripción General](#-descripción-general)
- [Características Principales](#-características-principales)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Inicio Rápido](#-inicio-rápido)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Configuración](#-configuración)
- [Despliegue](#-despliegue)
- [Documentación](#-documentación)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)

---

## 🎯 Descripción General

**Business Management System** es una aplicación web empresarial moderna diseñada para pequeñas y medianas empresas que necesitan gestionar eficientemente sus operaciones diarias. Este es un **sistema CRM/ERP completo** que incluye:

- 🤝 **Gestión de Clientes**: CRM con campos totalmente personalizables
- 📊 **Propuestas y Estimados**: Creación de presupuestos profesionales con conversión a facturas
- 👷 **Gestión de Trabajadores**: Control de personal y asignación a proyectos
- 📦 **Catálogo de Materiales**: Inventario y uso de materiales en proyectos
- 🔐 **Control de Acceso Robusto**: Sistema RBAC (Role-Based Access Control)
- 🌍 **Multi-idioma**: Soporte completo para Español e Inglés
- ⚙️ **Configuración Dinámica**: Campos personalizables por módulo sin tocar código

### ¿Para quién es este sistema?

Este sistema está diseñado para empresas de:
- Construcción y remodelación
- Plomería y servicios
- Instalación de equipos
- Cualquier negocio que necesite gestionar clientes, proyectos y estimados

---

## ✨ Características Principales

### 🧑‍💼 Gestión de Clientes (CRM)

- **CRUD Completo** de clientes con validaciones
- **Campos Dinámicos**: Crea campos personalizados sin programar
  - Tipos soportados: texto, número, email, teléfono, select, multiselect, fecha, checkbox, textarea, URL, moneda
  - Validaciones configurables (requerido, longitud, patrones regex)
  - Campos visibles/ocultos en formularios y grids
- **Vistas Múltiples**: Tabla, Grid, Tarjetas
- **Filtrado Avanzado**: Búsqueda global y filtros por estado, asignación, tags
- **Estadísticas en Tiempo Real**: Clientes activos, inactivos, potenciales, archivados
- **Asignación de Usuarios**: Asigna clientes a vendedores o responsables
- **Tags y Categorización**: Organiza clientes con etiquetas personalizadas

### 📑 Propuestas y Estimados

- **Creación de Estimados Profesionales**
  - Numeración automática de propuestas
  - Información del cliente auto-rellenada
  - Ubicación del trabajo (dirección, ciudad, estado, código postal)
  - Clasificación: Residencial/Comercial, Remodelación/Plomería/Servicios/Equipos/Nueva Construcción
- **Catálogo de Items Reutilizables**
  - Biblioteca de servicios y materiales comunes
  - Agregar items al estimado con un clic
  - Gestionar catálogo desde panel de administración
- **Secciones del Estimado**
  - **Incluye**: Items incluidos en el trabajo (con precios opcionales)
  - **No Incluye**: Lista de extras no contemplados
- **Cálculo Automático de Totales**
  - Subtotal de items
  - Impuestos configurables por porcentaje
  - Descuentos por porcentaje
  - Total final calculado automáticamente
- **Estados del Estimado**
  - `Draft` → `Sent` → `Approved`/`Rejected` → `Converted to Invoice`
- **Conversión a Factura**
  - Cuando un estimado se aprueba, se puede convertir a factura
  - Agrega información de trabajo realizado:
    - Materiales usados (con cantidades y precios)
    - Trabajadores que participaron
    - Fechas de inicio y fin del trabajo
    - Horas de trabajo
  - Recálculo automático de totales incluyendo materiales
- **Multi-idioma**: Genera estimados en Español o Inglés
- **Vista de Impresión**: Diseño profesional optimizado para imprimir o exportar PDF
- **Términos y Condiciones**: Plantillas configurables
- **Notas Internas**: Visibles solo para el equipo, no para el cliente

### 👷 Gestión de Trabajadores

- **CRUD de Trabajadores** con campos personalizables
- Campos por defecto: nombre, email, teléfono, cargo/posición
- **Campos Dinámicos Opcionales**: departamento, turno, fecha de contratación, etc.
- **Asignación a Proyectos**: Vincula trabajadores a facturas/proyectos
- **Tracking de Participación**: Historial de trabajos realizados

### 📦 Gestión de Materiales

- **CRUD de Materiales** con campos personalizables
- Campos por defecto: nombre, código, descripción
- **Campos Dinámicos Opcionales**: categoría, stock, proveedor, fecha de expiración, etc.
- **Uso en Proyectos**: Registra materiales usados en facturas
- **Control de Inventario**: (configurable según necesidades)

### 💰 Tesorería y Finanzas

- **Gestión de Cobros (Cuentas por Cobrar)**
  - Registro de pagos recibidos de clientes
  - Seguimiento de facturas pendientes de cobro
  - Estados: Pendiente, Parcial, Pagado, Vencido
  - Vinculación con propuestas y facturas
- **Gestión de Pagos (Cuentas por Pagar)**
  - Control de pagos a proveedores y trabajadores
  - Registro de gastos operativos
  - Categorización de pagos
  - Seguimiento de fechas de vencimiento
- **Dashboard Financiero**
  - Resumen de cobros y pagos del período
  - Análisis de flujo de caja
  - Estadísticas en tiempo real
- **Reportes Financieros**: Visualización de ingresos, egresos y balance

### 🔐 Control de Acceso Basado en Roles (RBAC)

- **Roles Predefinidos**:
  - **Admin**: Acceso total al sistema
  - **User**: Acceso a módulos asignados
  - **Viewer**: Solo lectura
- **Roles Personalizados**: Crea roles con permisos específicos
- **Permisos Granulares**:
  - `read`: Ver información
  - `write`: Crear y editar
  - `delete`: Eliminar registros
  - `manage_users`: Gestionar usuarios (admin)
  - `export`: Exportar datos
  - `import`: Importar datos
- **Asignación de Módulos**: Controla qué módulos ve cada usuario
- **Guards de Ruta**: Validación automática antes de acceder a cada página

### 🌍 Internacionalización (i18n)

- **Idiomas Soportados**: Español (por defecto) e Inglés
- **Cambio Dinámico**: Cambia el idioma sin recargar la aplicación
- **Traducciones Completas**: Más de 288 líneas de traducción por idioma
- **Documentos Multi-idioma**: Genera propuestas/facturas en el idioma del cliente

### ⚙️ Sistema de Configuración Dinámica

- **Configuración del Sistema**:
  - Nombre de la aplicación
  - Logo y favicon personalizados
  - Colores corporativos (primario, secundario)
  - Información de contacto del administrador
- **Información de Empresa**:
  - Nombre legal y comercial
  - RFC/Tax ID
  - Múltiples emails y teléfonos
  - Dirección completa
  - Logo y colores de marca
  - Redes sociales
- **Configuración por Módulo**:
  - Permisos específicos
  - Campos visibles en grids
  - Notificaciones habilitadas
  - Auto-archiving de registros inactivos

### 📊 Constructor de Formularios Dinámicos

- **Diseñador Visual**: Crea y edita campos desde la interfaz
- **13+ Tipos de Campo**: Text, Number, Email, Phone, Select, Multiselect, Dictionary, Date, DateTime, Checkbox, Textarea, URL, Currency
- **Validaciones Configurables**:
  - Campo requerido
  - Longitud mínima/máxima
  - Patrones regex personalizados
  - Valores mínimos/máximos (numéricos)
- **Configuración de Grid**:
  - Mostrar/ocultar en tabla
  - Orden de columnas
  - Ancho de columna
  - Ordenable/filtrable
- **Configuración de Formulario**:
  - Orden de campos
  - Ancho (completo, mitad, tercio)
  - Placeholder y texto de ayuda
  - Icono Material

### 🔍 Auditoría y Seguridad

- **Logs de Auditoría**: Registra quién creó/modificó cada registro
- **Metadata Automática**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- **Firebase Authentication**: OAuth con Google
- **Firestore Security Rules**: Validación server-side (recomendado configurar)
- **Tracking de Sesiones**: Fecha de primer login, último login

---

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **Angular** | 20.0.0 | Framework principal (standalone components) |
| **TypeScript** | 5.8.2 | Lenguaje de programación |
| **Angular Material** | 20.0.0 | Componentes UI (Material Design) |
| **Tailwind CSS** | 3.4.0 | Utilidades CSS y diseño responsivo |
| **RxJS** | 7.8.1 | Programación reactiva |
| **@ngx-translate** | 15.0.0 | Internacionalización |

### Backend

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| **Firebase Authentication** | 10.7.1 | Autenticación OAuth (Google) |
| **Firestore Database** | 10.7.1 | Base de datos NoSQL en tiempo real |
| **Firebase Storage** | 10.7.1 | Almacenamiento de archivos (logos, adjuntos) |

### Herramientas de Desarrollo

- **Angular CLI** 20.0.0
- **PostCSS** + **Autoprefixer**
- **Zone.js** 0.15.0

---

## 🏗️ Arquitectura

### Estructura de Módulos

```
/src/app/
├── core/                    # Servicios centrales y guards
│   ├── services/            # Auth, User, Config, Language
│   └── guards/              # Auth, Role, Module guards
├── admin/                   # Panel de administración
│   ├── system-config/       # Configuración del sistema
│   ├── business-info/       # Información de empresa
│   ├── manage-roles/        # Gestión de roles
│   ├── manage-modules/      # Gestión de módulos
│   └── admin-logs/          # Logs de auditoría
├── modules/                 # Módulos de negocio
│   ├── clients/             # CRM - Gestión de clientes
│   ├── projects/            # Propuestas y estimados
│   ├── workers/             # Gestión de trabajadores
│   ├── materials/           # Gestión de materiales
│   ├── treasury/            # Tesorería y finanzas
│   └── user-modules/        # Vista de módulos asignados al usuario
└── shared/                  # Código compartido
    ├── components/          # Componentes reutilizables
    ├── services/            # Servicios genéricos
    ├── pipes/               # Pipes personalizados
    └── utils/               # Utilidades auxiliares
```

### Patrones de Diseño

- **Component-Based Architecture**: Componentes standalone de Angular
- **Service Layer Pattern**: Lógica de negocio separada de la presentación
- **Generic Service Pattern**: `GenericFirestoreService<T>` para CRUD reutilizable
- **Signal-Based State Management**: Angular Signals para reactividad
- **Reactive Programming**: RxJS Observables para operaciones asíncronas
- **Type-Safe Development**: TypeScript strict mode + interfaces explícitas
- **Module Guards**: Validación de permisos en cada ruta

### Colecciones Firestore

```
/firestore/
├── authorized_users          # Usuarios del sistema
├── clients                   # Clientes
├── proposals                 # Propuestas/Estimados
├── catalog_items             # Catálogo de items
├── workers                   # Trabajadores
├── materials                 # Materiales
├── cobros                    # Cobros (cuentas por cobrar)
├── pagos                     # Pagos (cuentas por pagar)
├── roles                     # Roles personalizados
├── system_modules            # Módulos del sistema
├── system_config             # Configuración global (doc único)
└── business_info             # Info de empresa (doc único)
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

Asegúrate de tener instalado:

- **Node.js** v18 o superior - [Descargar](https://nodejs.org/)
- **npm** (incluido con Node.js) o **yarn**
- **Angular CLI**:
  ```bash
  npm install -g @angular/cli
  ```
- **Cuenta de Firebase** - [Crear cuenta](https://console.firebase.google.com/)

### Instalación

#### 1. Clonar el repositorio

```bash
git clone https://github.com/rcorzogutierrez/Business-Management-System.git
cd Business-Management-System
```

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Authentication** → Métodos de acceso → **Google**
4. Habilita **Firestore Database** (modo producción o prueba)
5. Habilita **Storage** (para logos y archivos adjuntos)
6. Copia las credenciales de configuración

#### 4. Crear archivos de entorno

**Windows (PowerShell):**
```powershell
mkdir src\environments
echo. > src\environments\environment.ts
echo. > src\environments\environment.development.ts
```

**Mac/Linux/Git Bash:**
```bash
mkdir -p src/environments
touch src/environments/environment.ts
touch src/environments/environment.development.ts
```

#### 5. Configurar credenciales de Firebase

**`src/environments/environment.development.ts`** (desarrollo):
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "TU-API-KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
  }
};
```

**`src/environments/environment.ts`** (producción):
```typescript
export const environment = {
  production: true,
  firebase: {
    // Misma configuración que arriba
  }
};
```

#### 6. Crear usuario administrador inicial

**Antes de ejecutar la aplicación**, debes crear manualmente el primer usuario admin en Firebase:

1. **Crear usuario en Firebase Authentication**:
   - Ve a Firebase Console → Authentication → Users
   - Clic en "Add user"
   - Ingresa email y contraseña
   - **Copia el UID generado**

2. **Crear documento en Firestore**:
   - Ve a Firestore Database
   - Crea la colección `authorized_users` (si no existe)
   - Clic en "Add document"
   - **ID del documento**: Pega el UID copiado
   - **Campos** (agregar uno por uno):

   ```json
   {
     "uid": "UID_COPIADO",
     "email": "tu-email@ejemplo.com",
     "displayName": "Tu Nombre (Admin)",
     "role": "admin",
     "accountStatus": "active",
     "isActive": true,
     "profileComplete": true,
     "modules": ["dashboard", "admin"],
     "permissions": ["read", "write", "manage_users", "delete"],
     "createdAt": [Timestamp - usar "now"],
     "createdBy": "system",
     "firstLoginDate": [Timestamp - usar "now"],
     "lastLogin": [Timestamp - usar "now"],
     "lastLoginDate": "2025-11-24T12:00:00.000Z"
   }
   ```

   > **Nota**: En Firestore, para los arrays (`modules`, `permissions`), agrégalos como tipo "array" y usa índices numéricos (0, 1, 2...).

#### 7. Ejecutar la aplicación

```bash
npm start
# o
ng serve
```

Abre tu navegador en `http://localhost:4200`

#### 8. Iniciar sesión

Usa el email y contraseña que creaste en Firebase Authentication.

---

## 📦 Módulos del Sistema

### 1. Dashboard

- Vista general del sistema
- Accesos rápidos a módulos
- Estadísticas generales

### 2. Clientes (CRM)

**Ruta**: `/modules/clients`

- **Listar clientes**: Tabla con búsqueda, filtros y ordenamiento
- **Crear cliente**: Formulario con validaciones
- **Editar cliente**: Modificar información existente
- **Ver cliente**: Detalles completos
- **Configuración**: Panel admin para configurar campos dinámicos

### 3. Proyectos (Propuestas)

**Ruta**: `/modules/projects`

- **Listar propuestas**: Tabla con estados y filtros
- **Crear estimado**: Formulario multi-paso
  1. Información del cliente
  2. Ubicación del trabajo
  3. Fechas
  4. Items incluidos (desde catálogo o personalizados)
  5. Extras no incluidos
  6. Totales (subtotal, impuestos, descuentos)
  7. Notas y términos
- **Ver propuesta**: Vista previa profesional (imprimible)
- **Editar propuesta**: Modificar antes de enviar
- **Cambiar estado**: Draft → Sent → Approved/Rejected
- **Convertir a factura**: Agregar materiales, trabajadores, fechas
- **Configuración**: Gestión del catálogo de items

### 4. Trabajadores

**Ruta**: `/modules/workers`

- **Listar trabajadores**: Tabla con búsqueda y filtros
- **Crear trabajador**: Formulario con campos dinámicos
- **Editar trabajador**: Modificar información
- **Configuración**: Panel admin para campos personalizados

### 5. Materiales

**Ruta**: `/modules/materials`

- **Listar materiales**: Tabla con búsqueda y filtros
- **Crear material**: Formulario con campos dinámicos
- **Editar material**: Modificar información
- **Configuración**: Panel admin para campos personalizados

### 6. Tesorería

**Ruta**: `/modules/treasury`

- **Dashboard Financiero**: Resumen de cobros, pagos y flujo de caja
- **Gestión de Cobros**: 
  - Listar cobros con filtros por estado, fecha y cliente
  - Registrar nuevos cobros vinculados a facturas
  - Marcar cobros como pagados o parcialmente pagados
  - Seguimiento de facturas vencidas
- **Gestión de Pagos**:
  - Listar pagos con filtros por categoría y fecha
  - Registrar pagos a proveedores y trabajadores
  - Categorización de gastos (operativos, materiales, nómina, etc.)
  - Control de pagos pendientes
- **Reportes**: Análisis de ingresos, egresos y balance del período

### 7. Módulos del Usuario

**Ruta**: `/user-modules`

- **Vista Centralizada**: Acceso a todos los módulos asignados al usuario actual
- **Vista Grid o Lista**: Dos modos de visualización
- **Búsqueda de Módulos**: Encuentra rápidamente el módulo que necesitas
- **Información de Acceso**: Solo muestra módulos activos y autorizados para el usuario
- **Navegación Rápida**: Acceso directo desde cualquier parte del sistema

### 8. Administración

**Ruta**: `/admin` (solo para usuarios con rol `admin`)

- **Configuración del Sistema**: Logo, nombre de app, colores, admin email
- **Información de Empresa**: Datos legales, contacto, branding
- **Gestión de Roles**: Crear, editar, eliminar roles personalizados
- **Gestión de Módulos**: Activar/desactivar módulos, cambiar iconos
- **Logs de Auditoría**: Historial de cambios en el sistema

---

## ⚙️ Configuración

### Firestore Security Rules (Recomendado)

Configura reglas de seguridad en Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: usuario autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: usuario es admin
    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/authorized_users/$(request.auth.uid)).data.role == 'admin';
    }

    // Usuarios autorizados (solo admins pueden modificar)
    match /authorized_users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Clientes
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Propuestas
    match /proposals/{proposalId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Trabajadores
    match /workers/{workerId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Materiales
    match /materials/{materialId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Cobros (Treasury)
    match /cobros/{cobroId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Pagos (Treasury)
    match /pagos/{pagoId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Configuración del sistema (solo lectura para todos, escritura para admins)
    match /system_config/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Roles (solo lectura para todos, escritura para admins)
    match /roles/{roleId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Módulos del sistema
    match /system_modules/{moduleId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Catálogo de items
    match /catalog_items/{itemId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Business info
    match /business_info/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Storage Rules (Para logos y archivos)

Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper: usuario autenticado
    function isAuthenticated() {
      return request.auth != null;
    }

    // Logos del sistema (solo admins pueden subir)
    match /logos/{allPaths=**} {
      allow read: if true;  // Público para mostrar en la app
      allow write: if isAuthenticated();  // Solo usuarios autenticados pueden subir
    }

    // Adjuntos de propuestas
    match /proposals/{proposalId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

### Configuración de Términos y Condiciones

Los términos por defecto se pueden configurar desde:

**Admin → Configuración del Sistema**

O directamente en Firestore:
- Colección: `system_config`
- Documento: `system_config`
- Campo: `defaultTerms` (string)

### Personalización de Branding

**Admin → Información de Empresa**

- Sube tu logo
- Configura colores corporativos (primario, secundario)
- Completa información de contacto
- Agrega redes sociales

---

## 🚀 Despliegue

### Build para Producción

```bash
ng build --configuration production
```

Los archivos compilados estarán en `dist/Business-Management-System/`

### Opción 1: Firebase Hosting

1. **Instalar Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Iniciar sesión**:
   ```bash
   firebase login
   ```

3. **Inicializar proyecto**:
   ```bash
   firebase init hosting
   ```

   - Selecciona el proyecto de Firebase
   - Public directory: `dist/Business-Management-System/browser`
   - Configure as single-page app: **Yes**
   - Set up automatic builds with GitHub: (opcional)

4. **Desplegar**:
   ```bash
   firebase deploy --only hosting
   ```

### Opción 2: Vercel

1. **Instalar Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Desplegar**:
   ```bash
   vercel
   ```

### Opción 3: Netlify

1. Arrastra la carpeta `dist/Business-Management-System/browser` a [Netlify Drop](https://app.netlify.com/drop)
2. O conecta tu repositorio de GitHub para despliegues automáticos

### Opción 4: Otros Servicios

Los archivos estáticos generados pueden desplegarse en:
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- GitHub Pages (requiere configuración adicional)

---

## 📚 Documentación

### Guías de Usuario

- **[Gestión de Clientes](docs/clients.md)** _(pendiente)_
- **[Crear Propuestas](docs/proposals.md)** _(pendiente)_
- **[Conversión a Facturas](docs/invoices.md)** _(pendiente)_
- **[Configuración de Campos Dinámicos](docs/dynamic-fields.md)** _(pendiente)_
- **[Gestión de Roles y Permisos](docs/roles.md)** _(pendiente)_

### Guías Técnicas

- **[Arquitectura del Sistema](docs/architecture.md)** _(pendiente)_
- **[API Reference](docs/api.md)** _(pendiente)_
- **[Crear Módulos Personalizados](docs/custom-modules.md)** _(pendiente)_

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor sigue estos pasos:

1. **Fork** el proyecto
2. **Crea una rama** para tu feature:
   ```bash
   git checkout -b feature/NuevaCaracteristica
   ```
3. **Commit** tus cambios:
   ```bash
   git commit -m 'Add: Nueva característica increíble'
   ```
4. **Push** a la rama:
   ```bash
   git push origin feature/NuevaCaracteristica
   ```
5. **Abre un Pull Request**

### Guía de Commits

Usa prefijos descriptivos:
- `feat:` Nueva característica
- `fix:` Corrección de bug
- `refactor:` Refactorización de código
- `docs:` Cambios en documentación
- `style:` Cambios de formato (sin afectar lógica)
- `test:` Agregar o corregir tests
- `chore:` Tareas de mantenimiento

---

## 📋 Roadmap

### ✅ Completado

- [x] Sistema de autenticación con Firebase
- [x] Gestión de clientes con campos dinámicos
- [x] Creación de propuestas/estimados
- [x] Conversión de propuestas a facturas
- [x] Gestión de trabajadores
- [x] Gestión de materiales
- [x] Control de acceso basado en roles (RBAC)
- [x] Internacionalización (ES/EN)
- [x] Constructor de formularios dinámicos
- [x] Sistema de configuración jerárquico
- [x] Catálogo de items reutilizables
- [x] Cálculo automático de totales
- [x] Vista de impresión profesional

### 🚧 En Desarrollo

- [ ] Exportación a PDF de propuestas/facturas
- [ ] Envío de propuestas por email
- [ ] Firma digital de propuestas
- [ ] Dashboard con gráficos y estadísticas
- [ ] Reportes avanzados

### 🔮 Futuro

- [ ] Multi-tenancy (múltiples empresas en una instancia)
- [ ] Módulo de inventario completo
- [ ] Integración con servicios de facturación fiscal
- [ ] API REST para integraciones
- [ ] Aplicación móvil (Flutter/React Native)
- [ ] Webhooks y automatizaciones
- [ ] Integración con sistemas de pago (Stripe, PayPal)
- [ ] Sistema de notificaciones push
- [ ] Chat interno entre usuarios
- [ ] Historial de versiones de propuestas
- [ ] Plantillas de propuestas reutilizables

---

## 🐛 Problemas Conocidos

- El módulo de exportación a PDF está en desarrollo
- La búsqueda en campos dinámicos puede ser lenta con >10,000 registros
- Algunos navegadores antiguos pueden tener problemas con CSS Grid

Revisa los [Issues](https://github.com/rcorzogutierrez/Business-Management-System/issues) para más detalles.

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver el archivo [LICENSE](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2025 Rafael Corzo

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia
de este software y archivos de documentación asociados (el "Software"), para
tratar el Software sin restricciones, incluyendo sin limitación los derechos
de usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o
vender copias del Software...
```

---

## 👥 Autores

- **Rafael Corzo** - *Desarrollo principal* - [@rcorzogutierrez](https://github.com/rcorzogutierrez)

### Contribuidores

¿Quieres aparecer aquí? ¡Contribuye al proyecto!

---

## 🙏 Agradecimientos

- **Angular Team** - Por el increíble framework
- **Firebase Team** - Por los servicios backend robustos
- **Material Design Team** - Por los componentes UI elegantes
- **Tailwind CSS** - Por las utilidades CSS que aceleran el desarrollo
- **Claude AI** - Por asistir en el desarrollo mediante "Vibe Coding"
- **Comunidad Open Source** - Por inspiración y recursos

---

## 📞 Soporte

Si tienes preguntas, problemas o sugerencias:

- 🐛 **Reportar un bug**: [Abrir Issue](https://github.com/rcorzogutierrez/Business-Management-System/issues/new?template=bug_report.md)
- 💡 **Solicitar feature**: [Abrir Issue](https://github.com/rcorzogutierrez/Business-Management-System/issues/new?template=feature_request.md)
- 📧 **Email**: (pendiente configurar)
- 💬 **Discusiones**: [GitHub Discussions](https://github.com/rcorzogutierrez/Business-Management-System/discussions)

---

## 📊 Estado del Proyecto

![GitHub last commit](https://img.shields.io/github/last-commit/rcorzogutierrez/Business-Management-System)
![GitHub issues](https://img.shields.io/github/issues/rcorzogutierrez/Business-Management-System)
![GitHub pull requests](https://img.shields.io/github/issues-pr/rcorzogutierrez/Business-Management-System)

---

## 🌟 Star History

Si este proyecto te resultó útil, considera darle una ⭐ en GitHub. ¡Ayuda a otros desarrolladores a descubrirlo!

---

<div align="center">

**[⬆ Volver arriba](#business-management-system)**

Hecho con ❤️ usando Angular, Firebase y mucho ☕

</div>
