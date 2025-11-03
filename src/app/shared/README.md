# Componentes y Servicios Genéricos Reutilizables

Este directorio contiene componentes, servicios y utilidades genéricas y reutilizables que puedes usar en cualquier módulo de la aplicación siguiendo el principio DRY (Don't Repeat Yourself).

## 📋 Contenido

- **Servicios**: `GenericFirestoreService` - CRUD operations base para Firestore
- **Componentes**: Diálogos genéricos de eliminación (individual y múltiple)
- **Modelos**: Interfaces y tipos genéricos

---

## 🚀 Uso Rápido

### 1. Crear un Nuevo Módulo (Ejemplo: Productos)

#### Paso 1: Define tu Interface

```typescript
// src/app/modules/productos/models/producto.interface.ts
import { GenericEntity } from '../../../shared/models/generic-entity.interface';

export interface Producto extends GenericEntity {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  activo: boolean;
}
```

#### Paso 2: Crea tu Servicio (Extiende el Genérico)

```typescript
// src/app/modules/productos/services/productos.service.ts
import { Injectable } from '@angular/core';
import { GenericFirestoreService } from '../../../shared/services/generic-firestore.service';
import { Producto } from '../models/producto.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductosService extends GenericFirestoreService<Producto> {
  constructor() {
    super('productos'); // Nombre de la colección en Firestore
  }

  // Puedes agregar métodos específicos aquí si los necesitas
  async getProductosPorCategoria(categoria: string): Promise<Producto[]> {
    return this.items().filter(p => p.categoria === categoria);
  }
}
```

#### Paso 3: Configura tu Módulo

```typescript
// src/app/modules/productos/productos-config.ts
import { GenericModuleConfig } from '../../shared/models/generic-entity.interface';

export const PRODUCTOS_CONFIG: GenericModuleConfig = {
  collection: 'productos',
  entityName: 'Producto',
  entityNamePlural: 'Productos',
  deleteDialogFieldsCount: 3,
  searchFields: ['nombre', 'descripcion', 'categoria'],
  defaultSort: { field: 'nombre', direction: 'asc' },
  itemsPerPage: 25,
  fields: [
    {
      name: 'nombre',
      label: 'Nombre del Producto',
      type: 'text',
      showInGrid: true,
      showInDelete: true,
      isDefault: false
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'text',
      showInGrid: true,
      showInDelete: true,
      isDefault: false
    },
    {
      name: 'precio',
      label: 'Precio',
      type: 'currency',
      showInGrid: true,
      showInDelete: true,
      isDefault: false
    },
    {
      name: 'stock',
      label: 'Stock',
      type: 'number',
      showInGrid: true,
      showInDelete: false,
      isDefault: false
    },
    {
      name: 'categoria',
      label: 'Categoría',
      type: 'select',
      options: [
        { value: 'electronica', label: 'Electrónica' },
        { value: 'ropa', label: 'Ropa' },
        { value: 'alimentos', label: 'Alimentos' }
      ],
      showInGrid: true,
      showInDelete: true,
      isDefault: false
    }
  ]
};
```

#### Paso 4: Usa los Componentes en tu Lista

```typescript
// src/app/modules/productos/components/productos-list.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductosService } from '../services/productos.service';
import { Producto } from '../models/producto.interface';
import { PRODUCTOS_CONFIG } from '../productos-config';
import { GenericDeleteDialogComponent } from '../../../shared/components/generic-delete-dialog/generic-delete-dialog.component';
import { GenericDeleteMultipleDialogComponent } from '../../../shared/components/generic-delete-multiple-dialog/generic-delete-multiple-dialog.component';

@Component({
  selector: 'app-productos-list',
  // ... imports
})
export class ProductosListComponent implements OnInit {
  private productosService = inject(ProductosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Configuración del módulo
  config = PRODUCTOS_CONFIG;

  // Signals del servicio
  productos = this.productosService.items;
  isLoading = this.productosService.isLoading;

  // Selección
  selectedProductos = signal<string[]>([]);

  async ngOnInit() {
    await this.productosService.initialize();
  }

  /**
   * Eliminar producto individual
   */
  async deleteProducto(producto: Producto) {
    const dialogRef = this.dialog.open(GenericDeleteDialogComponent, {
      data: {
        entity: producto,
        config: this.config
      },
      width: '600px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        await this.productosService.delete(producto.id);
        this.snackBar.open('Producto eliminado exitosamente', 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error eliminando producto:', error);
        this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  /**
   * Eliminar múltiples productos
   */
  async deleteSelectedProductos() {
    const selectedIds = this.selectedProductos();
    if (selectedIds.length === 0) return;

    const productos = this.productos().filter(p => selectedIds.includes(p.id));

    const dialogRef = this.dialog.open(GenericDeleteMultipleDialogComponent, {
      data: {
        entities: productos,
        count: productos.length,
        config: this.config
      },
      width: '800px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result?.confirmed) {
      try {
        await this.productosService.deleteMultiple(selectedIds);
        this.selectedProductos.set([]);
        this.snackBar.open(`${productos.length} producto(s) eliminado(s) exitosamente`, 'Cerrar', { duration: 3000 });
      } catch (error) {
        console.error('Error eliminando productos:', error);
        this.snackBar.open('Error al eliminar los productos', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
```

---

## 📦 Componentes Disponibles

### GenericDeleteDialogComponent

Diálogo de confirmación para eliminar una entidad individual.

**Características:**
- Muestra campos personalizados dinámicamente
- Validación de confirmación con palabra "ELIMINAR"
- Formateo automático según tipo de campo
- Totalmente reutilizable

**Uso:**
```typescript
this.dialog.open(GenericDeleteDialogComponent, {
  data: { entity, config },
  width: '600px'
});
```

### GenericDeleteMultipleDialogComponent

Diálogo de confirmación para eliminar múltiples entidades.

**Características:**
- Tabla con datos adicionales
- Muestra hasta 5 entidades (indica si hay más)
- Validación de confirmación
- Totalmente reutilizable

**Uso:**
```typescript
this.dialog.open(GenericDeleteMultipleDialogComponent, {
  data: { entities, count, config },
  width: '800px'
});
```

---

## 🔧 Servicio Base: GenericFirestoreService

### Métodos Disponibles

| Método | Descripción |
|--------|-------------|
| `initialize()` | Carga inicial de datos |
| `loadItems()` | Recarga todos los items |
| `getById(id)` | Obtiene un item por ID |
| `create(data)` | Crea un nuevo item |
| `update(id, data)` | Actualiza un item |
| `delete(id)` | Elimina un item |
| `deleteMultiple(ids)` | Elimina múltiples items |
| `toggleActive(id, isActive)` | Activa/desactiva un item |
| `search(term, fields)` | Busca en campos específicos |
| `sort(items, field, direction)` | Ordena items |
| `paginate(items, page, perPage)` | Pagina items |
| `refresh()` | Refresca los datos |

### Signals Disponibles

| Signal | Tipo | Descripción |
|--------|------|-------------|
| `items` | `T[]` | Todos los items |
| `isLoading` | `boolean` | Estado de carga |
| `error` | `string \| null` | Mensaje de error |
| `activeItems` | `T[]` | Solo items activos |
| `itemsCount` | `number` | Total de items |

---

## 🎨 Tipos de Campos Soportados

- `text` - Texto simple
- `number` - Números
- `date` - Fechas (formato local)
- `datetime` - Fecha y hora
- `checkbox` - Boolean (Sí/No)
- `currency` - Moneda (formato USD)
- `select` - Selector simple
- `multiselect` - Selector múltiple
- `dictionary` - Objeto clave-valor
- `email` - Email
- `phone` - Teléfono

---

## ✨ Mejores Prácticas

1. **Siempre extiende `GenericEntity`** en tus interfaces
2. **Usa el mismo nombre de colección** en el servicio y config
3. **Configura `showInDelete`** para controlar qué campos mostrar en diálogos
4. **Usa `format`** para formateos personalizados complejos
5. **Aprovecha los signals** del servicio para reactividad
6. **Mantén la config separada** del componente para mejor organización

---

## 📝 Ejemplo Completo

Ver la implementación completa en el módulo de **Clientes**:
- `/src/app/modules/clients/`

Este módulo usa todos los componentes genéricos y sirve como referencia.

---

## 🔄 Migrar Módulos Existentes

Para migrar un módulo existente a usar componentes genéricos:

1. Haz que tu entidad extienda `GenericEntity`
2. Haz que tu servicio extienda `GenericFirestoreService<T>`
3. Crea tu `ModuleConfig`
4. Reemplaza tus diálogos personalizados por los genéricos
5. Actualiza las llamadas a los diálogos con la nueva configuración

---

## 🚦 Próximos Pasos

Puedes extender esta arquitectura agregando:
- Componentes genéricos de búsqueda
- Grid/lista genérica con paginación
- Formularios dinámicos genéricos
- Filtros avanzados genéricos

**¡Listo para crear módulos nuevos en minutos!** 🎉
