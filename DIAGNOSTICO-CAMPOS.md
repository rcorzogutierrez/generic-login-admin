# 🔍 Diagnóstico de Configuración de Campos

## Problema Reportado
Un campo aparece en la columna del grid pero no en el formulario de crear/editar cliente.

## Cómo Ejecutar el Diagnóstico

### Opción 1: Desde la Consola del Navegador (MÁS RÁPIDO)

1. **Abre tu aplicación** en el navegador
2. **Ve a la lista de clientes**: `/modules/clients`
3. **Abre la consola del navegador** (F12 o clic derecho → Inspeccionar → Consola)
4. **Ejecuta este comando**:

```javascript
// Obtener el servicio de configuración desde Angular
const configService = ng.probe(document.querySelector('app-clients-list')).injector.get('ClientConfigServiceRefactored');

// Ejecutar diagnóstico
configService.diagnoseFields();
```

5. **Analiza el reporte** que aparece en la consola

---

### Opción 2: Agregar Botón Temporal en la UI

Si la Opción 1 no funciona, agrega esto temporalmente:

**En `clients-list.component.ts`**, agrega este método:

```typescript
debugFields() {
  this.configService.diagnoseFields();
}
```

**En `clients-list.component.html`**, agrega este botón en el toolbar:

```html
<button mat-raised-button color="warn" (click)="debugFields()">
  <mat-icon>bug_report</mat-icon>
  Diagnosticar Campos
</button>
```

Luego simplemente haz clic en el botón y ve a la consola del navegador.

---

## Qué Buscar en el Reporte

El diagnóstico te mostrará:

### ✅ Estadísticas Generales
- Total de campos configurados
- Campos activos vs inactivos
- Campos en grid vs solo en formulario

### 🔍 Análisis Detallado
Te mostrará cualquier campo con configuración problemática:

**Problema Típico:**
```
⚠️ Ciudad (city)
  isActive: false
  showInGrid: true  ← PROBLEMA: Esto causa que aparezca en grid sin datos
  formOrder: 5
  gridOrder: 11
  ⚠️ Marcado para grid pero está inactivo
```

### 📋 Listado por Categoría
- **Campos en Grid**: Los que SÍ aparecen en la tabla
- **Solo en Formulario**: Los que solo aparecen al crear/editar
- **Inactivos**: Los que no deberían aparecer en ningún lado

---

## Solución Esperada

Después de ejecutar el diagnóstico, busca un campo que tenga:

```
isActive: false
showInGrid: true
```

Este es el campo problemático. Para solucionarlo:

### Opción A: Activar el campo (para que aparezca en formulario Y grid)
1. Ve a `/modules/clients/config`
2. Busca el campo en la lista de "Campos Disponibles"
3. Activa el campo (toggle de "Activo")
4. Guarda los cambios

### Opción B: Desactivar en grid (para ocultarlo completamente)
1. Ve a `/modules/clients/config`
2. Busca el campo
3. Desmarca "Mostrar en Grid"
4. Guarda los cambios

---

## Ejemplo de Salida del Diagnóstico

```
📊 DIAGNÓSTICO DE CAMPOS
Total de campos: 8

✅ Campos activos: 5
❌ Campos inactivos: 3
📊 En grid: 4
📝 Solo en formulario: 1

🔍 ANÁLISIS DETALLADO
  Ciudad (city)
    ID: field_abc123
    isActive: false
    showInGrid: true   ← PROBLEMA ENCONTRADO
    formOrder: 5
    gridOrder: 11
    ⚠️ Marcado para grid pero está inactivo

📋 CAMPOS POR CATEGORÍA
  Campos en Grid (4)
    - Nombre (name)
    - Email (email)
    - Teléfono (phone)
    - Ciudad (city) ← Este es el problemático

  Solo en Formulario (1)
    - Notas (notes)

  Inactivos (3)
    - Dirección (address) - showInGrid: false
    - Ciudad (city) - showInGrid: true ← PROBLEMA
    - País (country) - showInGrid: false
```

---

## Reporte para Claude

Una vez que ejecutes el diagnóstico, **copia la salida completa de la consola** y envíamela para que pueda ayudarte a corregir el problema específico.

Incluye:
- El nombre del campo problemático
- Su configuración actual (isActive, showInGrid, etc.)
- Qué quieres hacer con ese campo (activarlo, desactivarlo, o solo quitarlo del grid)
