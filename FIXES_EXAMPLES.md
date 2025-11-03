# EJEMPLOS DE CORRECCIONES - ANGULAR 19+

## 1. ACCESIBILIDAD HTML - EJEMPLOS PRÁCTICOS

### Problema 1: Botones sin aria-label
**Ubicación**: `/src/app/modules/clients/components/clients-list/clients-list.component.html` (líneas 28-45)

#### ANTES (Sin Accesibilidad)
```html
<button
  mat-icon-button
  class="icon-btn"
  (click)="refresh()"
  [disabled]="isLoading()"
  matTooltip="Actualizar">
  <mat-icon>refresh</mat-icon>
</button>

@if (isAdmin()) {
  <button
    mat-icon-button
    class="icon-btn"
    (click)="goToConfig()"
    matTooltip="Configurar módulo">
    <mat-icon>settings</mat-icon>
  </button>
}

<button
  mat-raised-button
  color="primary"
  (click)="createClient()"
  [disabled]="isLoading()"
  class="flex items-center gap-2">
  <mat-icon>add</mat-icon>
  Nuevo Cliente
</button>
```

#### DESPUÉS (Con Accesibilidad)
```html
<button
  mat-icon-button
  class="icon-btn"
  (click)="refresh()"
  [disabled]="isLoading()"
  aria-label="Actualizar lista de clientes"
  matTooltip="Actualizar">
  <mat-icon aria-hidden="true">refresh</mat-icon>
</button>

@if (isAdmin()) {
  <button
    mat-icon-button
    class="icon-btn"
    (click)="goToConfig()"
    aria-label="Configurar módulo de clientes"
    matTooltip="Configurar módulo">
    <mat-icon aria-hidden="true">settings</mat-icon>
  </button>
}

<button
  mat-raised-button
  color="primary"
  (click)="createClient()"
  [disabled]="isLoading()"
  aria-label="Crear nuevo cliente"
  class="flex items-center gap-2">
  <mat-icon aria-hidden="true">add</mat-icon>
  Nuevo Cliente
</button>
```

---

### Problema 2: Input de búsqueda sin descripción
**Ubicación**: `/src/app/modules/clients/components/clients-list/clients-list.component.html` (líneas 121-139)

#### ANTES
```html
<div class="flex items-center gap-4">
  <mat-icon class="text-slate-400">search</mat-icon>
  <input
    type="text"
    placeholder="Buscar en cualquier campo..."
    [(ngModel)]="searchTerm"
    (ngModelChange)="onSearch($event)"
    class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium
           focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all
           placeholder:text-slate-400"
    matTooltip="Busca en todos los campos visibles en la tabla, incluyendo campos personalizados">

  @if (searchTerm()) {
    <button
      mat-icon-button
      (click)="onSearch('')"
      matTooltip="Limpiar búsqueda">
      <mat-icon>close</mat-icon>
    </button>
  }
</div>
```

#### DESPUÉS
```html
<div class="flex items-center gap-4">
  <label for="search-clients" class="sr-only">Buscar clientes</label>
  <mat-icon class="text-slate-400" aria-hidden="true">search</mat-icon>
  <input
    id="search-clients"
    type="text"
    placeholder="Buscar en cualquier campo..."
    [(ngModel)]="searchTerm"
    (ngModelChange)="onSearch($event)"
    aria-label="Buscar clientes por nombre, email o empresa"
    aria-describedby="search-help"
    class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium
           focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all
           placeholder:text-slate-400"
    matTooltip="Busca en todos los campos visibles en la tabla, incluyendo campos personalizados">

  <span id="search-help" class="sr-only">
    Puedes buscar en todos los campos visibles en la tabla, incluyendo campos personalizados del cliente
  </span>

  @if (searchTerm()) {
    <button
      mat-icon-button
      (click)="onSearch('')"
      aria-label="Limpiar búsqueda"
      matTooltip="Limpiar búsqueda">
      <mat-icon aria-hidden="true">close</mat-icon>
    </button>
  }
</div>
```

---

### Problema 3: Tabla sin descripción semántica
**Ubicación**: `/src/app/modules/clients/components/clients-list/clients-list.component.html` (líneas 209-240)

#### ANTES
```html
<div class="overflow-x-auto">
  <table class="w-full">
    <!-- Header -->
    <thead class="bg-slate-50 border-b-2 border-slate-200">
      <tr>
        <th class="px-4 py-3 text-left w-12">
          <input
            type="checkbox"
            [checked]="isAllSelected()"
            [indeterminate]="isIndeterminate()"
            (change)="toggleSelectAll()"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
        </th>
        <!-- Más columnas... -->
      </tr>
    </thead>
  </table>
</div>
```

#### DESPUÉS
```html
<div class="overflow-x-auto">
  <table class="w-full" role="table" aria-label="Lista de clientes del sistema">
    <caption class="sr-only">
      Tabla de clientes registrados. Usa las columnas para filtrar o seleccionar múltiples 
      clientes para realizar acciones en lote.
    </caption>
    
    <!-- Header -->
    <thead class="bg-slate-50 border-b-2 border-slate-200">
      <tr role="row">
        <th class="px-4 py-3 text-left w-12" scope="col">
          <label class="sr-only">Seleccionar todos los clientes de esta página</label>
          <input
            type="checkbox"
            aria-label="Seleccionar todos los clientes de esta página"
            [checked]="isAllSelected()"
            [indeterminate]="isIndeterminate()"
            (change)="toggleSelectAll()"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
        </th>
        <!-- Más columnas... -->
      </tr>
    </thead>
  </table>
</div>
```

---

## 2. MIGRACIÓN DE OBSERVABLES A PROMISES

### Problema: 229 usos de subscribe()

#### Tipo 1: Diálogos (Más común)

**ANTES**
```typescript
// En admin-panel.component.ts línea 391
dialogRef.afterClosed().subscribe(async (result) => {
  if (result?.confirmed) {
    await this.performBulkDeletion(Array.from(this.selectedUsers));
  }
});
```

**DESPUÉS**
```typescript
// OPCIÓN 1: Con async/await
const result = await dialogRef.afterClosed().toPromise();
if (result?.confirmed) {
  await this.performBulkDeletion(Array.from(this.selectedUsers));
}

// OPCIÓN 2: Con .then()
dialogRef.afterClosed().toPromise().then(result => {
  if (result?.confirmed) {
    this.performBulkDeletion(Array.from(this.selectedUsers));
  }
});
```

#### Tipo 2: Observables en servicios

**ANTES**
```typescript
// Componente
constructor(private someService: SomeService) {}

ngOnInit() {
  this.someService.getData().subscribe(data => {
    this.data = data;
  });
}
```

**DESPUÉS - Opción A: Usar effect() y signal**
```typescript
// Servicio
export class SomeService {
  data = signal<Data[]>([]);
  
  async loadData() {
    const data = await this.getData().toPromise();
    this.data.set(data || []);
  }
}

// Componente
export class MyComponent {
  data = inject(SomeService).data;
  
  async ngOnInit() {
    await inject(SomeService).loadData();
  }
}
```

**DESPUÉS - Opción B: Usar toSignal()**
```typescript
// En servicio (Angular 16+)
import { toSignal } from '@angular/core';

export class SomeService {
  private dataObservable = this.getData();
  data = toSignal(this.dataObservable, { initialValue: [] });
}
```

#### Tipo 3: FormBuilder (Menos frecuente)

**ANTES**
```typescript
this.form.statusChanges.subscribe(status => {
  console.log('Form status:', status);
});
```

**DESPUÉS**
```typescript
// Opción A: Con effect()
import { effect } from '@angular/core';

effect(() => {
  const status = this.form.status;
  console.log('Form status:', status);
});

// Opción B: Con signal
private formStatus = toSignal(this.form.statusChanges);
```

---

## 3. INMUTABILIDAD EN SIGNALS

### Problema: Array mutations

#### ANTES (Incorrecto)
```typescript
// En clients-list.component.ts
selectedClients = signal<string[]>([]);

toggleClientSelection(clientId: string) {
  const selected = this.selectedClients();
  if (selected.includes(clientId)) {
    selected.splice(selected.indexOf(clientId), 1);  // ❌ MUTACIÓN
    this.selectedClients.set(selected);
  } else {
    selected.push(clientId);  // ❌ MUTACIÓN
    this.selectedClients.set(selected);
  }
}

clearSelection() {
  this.selectedClients().length = 0;  // ❌ MUTACIÓN
}
```

#### DESPUÉS (Correcto)
```typescript
// En clients-list.component.ts
selectedClients = signal<string[]>([]);

toggleClientSelection(clientId: string) {
  const selected = this.selectedClients();
  if (selected.includes(clientId)) {
    // ✅ Crear nuevo array sin el elemento
    this.selectedClients.set(selected.filter(id => id !== clientId));
  } else {
    // ✅ Crear nuevo array con el nuevo elemento
    this.selectedClients.set([...selected, clientId]);
  }
}

clearSelection() {
  // ✅ Establecer array vacío
  this.selectedClients.set([]);
}

toggleSelectAll() {
  const selected = this.selectedClients();
  const paginated = this.paginatedClients();

  if (selected.length === paginated.length) {
    this.selectedClients.set([]);
  } else {
    // ✅ Crear nuevo array con todos los IDs
    this.selectedClients.set(paginated.map(c => c.id));
  }
}
```

---

## 4. UTILIDAD DE ACCESIBILIDAD

### Crear archivo: `src/app/shared/utils/a11y.utils.ts`

```typescript
/**
 * Utilidades para mejorar la accesibilidad (a11y)
 */

export const A11Y_LABELS = {
  // Acciones generales
  REFRESH: 'Actualizar',
  SEARCH: 'Buscar',
  DELETE: 'Eliminar',
  EDIT: 'Editar',
  VIEW: 'Ver detalles',
  CLOSE: 'Cerrar',
  CANCEL: 'Cancelar',
  CONFIRM: 'Confirmar',
  SAVE: 'Guardar',
  
  // Específicas de clientes
  CLIENT_REFRESH: 'Actualizar lista de clientes',
  CLIENT_SEARCH: 'Buscar clientes por nombre, email o empresa',
  CLIENT_DELETE: 'Eliminar cliente seleccionado',
  CLIENT_EDIT: 'Editar cliente',
  CLIENT_VIEW: 'Ver detalles del cliente',
  CLIENT_CREATE: 'Crear nuevo cliente',
  CLIENT_SETTINGS: 'Configurar módulo de clientes',
  
  // Específicas de usuarios (Admin)
  USER_ADD: 'Agregar nuevo usuario',
  USER_DELETE: 'Eliminar usuario',
  USER_EDIT: 'Editar usuario',
  USER_RESET_PASSWORD: 'Restablecer contraseña del usuario',
  USER_TOGGLE_STATUS: 'Cambiar estado del usuario',
  USER_ASSIGN_MODULES: 'Asignar módulos al usuario',
  
  // Acciones masivas
  BULK_DELETE: 'Eliminar elementos seleccionados',
  BULK_SELECT_ALL: 'Seleccionar todos los elementos',
  BULK_CLEAR_SELECTION: 'Limpiar selección',
  
  // Navegación
  LOGO_BUTTON: 'Ir al Dashboard',
  ADMIN_PANEL: 'Ir al Panel de Administración',
  LOGOUT: 'Cerrar sesión',
  
  // Formularios
  CONFIRM_DELETE_PASSWORD: 'Para confirmar, escribe: ELIMINAR',
};

export const A11Y_DESCRIPTIONS = {
  CLIENT_SEARCH: 'Puedes buscar en todos los campos visibles en la tabla, incluyendo campos personalizados del cliente',
  TABLE_SELECTION: 'Usa los checkboxes para seleccionar clientes y realizar acciones en lote',
  STATUS_FILTER: 'Filtra los clientes según su estado actual',
};

/**
 * Obtener clase CSS para screen readers
 * Oculta elementos visualmente pero mantiene accesibles para lectores de pantalla
 */
export const SR_ONLY_CLASS = 'sr-only';

export function getSrOnlyClass(): string {
  return 'absolute w-px h-px p-0 m-[-1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0';
}

/**
 * Helper para crear atributos ARIA comunes
 */
export const createAriaLabel = (label: string, context?: string): string => {
  return context ? `${label} - ${context}` : label;
};

export const createAriaDescribedBy = (elementId: string): string => {
  return elementId;
};
```

### Usar en componentes:

```typescript
// En clients-list.component.html
<button
  mat-icon-button
  (click)="refresh()"
  [aria-label]="A11Y_LABELS.CLIENT_REFRESH"
  matTooltip="Actualizar">
  <mat-icon aria-hidden="true">refresh</mat-icon>
</button>

<input
  [attr.aria-label]="A11Y_LABELS.CLIENT_SEARCH"
  [attr.aria-describedby]="'search-help'"
  [(ngModel)]="searchTerm"
  (ngModelChange)="onSearch($event)">

<span id="search-help" class="sr-only">{{ A11Y_DESCRIPTIONS.CLIENT_SEARCH }}</span>
```

---

## 5. @defer PARA COMPONENTES PESADOS

### Problema: Componentes grandes cargan lentamente

#### ANTES
```html
<!-- form-designer.component.html -->
<div>
  <h2>Diseñador de Formularios</h2>
  <app-field-config-dialog *ngIf="showDialog"></app-field-config-dialog>
</div>
```

#### DESPUÉS
```html
<!-- form-designer.component.html -->
<div>
  <h2>Diseñador de Formularios</h2>
  
  <!-- Carga el componente solo cuando se vuelve visible o en background -->
  @defer (on viewport, on timer(5000)) {
    <app-field-config-dialog></app-field-config-dialog>
  } @loading {
    <div class="skeleton-loader">
      <div class="h-12 bg-slate-200 rounded"></div>
      <div class="h-12 bg-slate-200 rounded mt-2"></div>
    </div>
  } @placeholder {
    <!-- Mostrado mientras se carga -->
  } @error {
    <div class="error-state">
      Error cargando componente
    </div>
  }
</div>
```

---

## 6. CONSOLIDACIÓN DE SIGNALS EN AdminPanelComponent

### Problema: Mix de signals y propiedades locales

#### ANTES
```typescript
export class AdminPanelComponent implements OnInit {
  currentUser = this.authService.authorizedUser;
  
  // Propiedades locales (NO signals)
  totalUsers = 0;
  activeUsers = 0;
  totalModules = 0;
  adminUsers = 0;

  users: User[] = [];  // NO signal
  displayedUsers: User[] = [];  // NO signal
  filteredUsers: User[] = [];  // NO signal
  currentFilter: 'all' | 'admin' | 'modules' | 'active' = 'all';  // NO signal
  searchTerm = '';  // NO signal
  isLoading = false;  // NO signal
  selectedUsers = new Set<string>();  // NO signal
  
  constructor(...) {
    effect(() => {
      const users = this.adminService.users();
      this.users = users;  // Asignación directa
      this.applyFilters();
      this.cdr.markForCheck();
    });
  }
}
```

#### DESPUÉS (Completamente con Signals)
```typescript
export class AdminPanelComponent implements OnInit {
  currentUser = this.authService.authorizedUser;
  
  // TODAS las propiedades como signals
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  
  // Derivadas del servicio
  users = this.adminService.users;
  
  // Estado local
  totalUsers = signal<number>(0);
  activeUsers = signal<number>(0);
  totalModules = signal<number>(0);
  adminUsers = signal<number>(0);
  
  currentFilter = signal<'all' | 'admin' | 'modules' | 'active'>('all');
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(false);
  selectedUsers = signal<Set<string>>(new Set());
  
  // Computed values
  filteredUsers = computed(() => {
    const users = this.users();
    const term = this.searchTerm().toLowerCase();
    const filter = this.currentFilter();
    
    let filtered = users;
    
    // Aplicar filtro
    if (filter === 'admin') {
      filtered = filtered.filter(u => u.role === 'admin');
    } else if (filter === 'modules') {
      filtered = filtered.filter(u => u.modules?.length > 0);
    } else if (filter === 'active') {
      filtered = filtered.filter(u => u.isActive);
    }
    
    // Aplicar búsqueda
    if (term) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(term) ||
        u.displayName?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  });
  
  displayedUsers = computed(() => {
    return this.filteredUsers().slice(0, 10);
  });
  
  // Effect para actualizar stats
  private statsEffect = effect(() => {
    const users = this.users();
    this.totalUsers.set(users.length);
    this.activeUsers.set(users.filter(u => u.isActive).length);
    this.adminUsers.set(users.filter(u => u.role === 'admin').length);
    this.cdr.markForCheck();
  });
}
```

---

## 7. CHECKLIST DE IMPLEMENTACIÓN

### Para cada archivo HTML a modificar:

```typescript
// CHECKLIST
- [ ] Agregar aria-label a botones sin texto
- [ ] Agregar aria-hidden="true" a iconos decorativos
- [ ] Agregar aria-describedby a inputs complejos
- [ ] Agregar id a elementos que serán descritos
- [ ] Agregar scope="col" a headers de tabla
- [ ] Agregar role="table" a tablas principales
- [ ] Agregar <caption> a tablas con descripción
- [ ] Agregar <label> vinculados a inputs (con for=)
- [ ] Validar contraste de colores (Contrast Checker)
- [ ] Probar con screen reader (NVDA, JAWS)
```

---

**Nota**: Estos ejemplos están listos para copiar y pegar. Adapta el contexto específico según necesidad.
