# Utilidades Tailwind Personalizadas

Este proyecto extiende Tailwind CSS con utilidades personalizadas para mantener consistencia visual y reducir CSS duplicado.

## 📦 Border Radius

Reemplaza patrones repetitivos de `border-radius` con clases semánticas:

| Clase | Valor | Uso |
|-------|-------|-----|
| `rounded-dialog` | 20px | Diálogos modales |
| `rounded-card` | 16px | Tarjetas y contenedores principales |
| `rounded-section` | 12px | Secciones dentro de cards |
| `rounded-btn` | 10px | Botones |
| `rounded-input` | 10px | Inputs y campos de formulario |

### Ejemplos:

```html
<!-- Antes -->
<div style="border-radius: 16px">...</div>

<!-- Después -->
<div class="rounded-card">...</div>
```

```css
/* Antes en CSS */
.my-component {
  border-radius: 12px;
}

/* Después con @apply */
.my-component {
  @apply rounded-section;
}
```

---

## 🌑 Box Shadows

Shadows corporativos consistentes en todo el proyecto:

| Clase | Uso | Descripción |
|-------|-----|-------------|
| `shadow-corporate` | Elementos sutiles | Shadow muy ligero (0 2px 8px) |
| `shadow-material` | Cards, containers | Shadow estándar Material Design |
| `shadow-hover` | Estados hover | Shadow elevado para interacciones |
| `shadow-elevated` | Elementos flotantes | Shadow muy elevado |
| `shadow-purple` | Elementos con tema purple | Shadow con tinte morado |
| `shadow-purple-lg` | Elementos purple destacados | Shadow morado grande |
| `shadow-dialog` | Diálogos modales | Shadow para modales |

### Ejemplos:

```html
<!-- Card normal -->
<div class="rounded-card shadow-material">...</div>

<!-- Card con hover -->
<div class="rounded-card shadow-material hover:shadow-hover transition-all">
  ...
</div>

<!-- Dialog -->
<div class="rounded-dialog shadow-dialog">...</div>

<!-- Botón purple -->
<button class="rounded-btn shadow-purple">...</button>
```

---

## ⚡ Transition Timing Functions

Funciones de timing consistentes para animaciones:

| Clase | Valor | Uso |
|-------|-------|-----|
| `ease-smooth` | cubic-bezier(0.4, 0, 0.2, 1) | Transiciones suaves estándar |
| `ease-bouncy` | cubic-bezier(0.34, 1.56, 0.64, 1) | Efecto bounce (overshooting) |

### Ejemplos:

```html
<!-- Transición suave -->
<div class="transition-all duration-300 ease-smooth">...</div>

<!-- Transición con bounce -->
<button class="transition-transform duration-350 ease-bouncy hover:scale-110">
  Click me
</button>
```

```css
/* Antes */
.my-element {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Después */
.my-element {
  @apply transition-all duration-300 ease-smooth;
}
```

---

## 🎨 Colores Purple Extendidos

Se agregaron tonos purple adicionales para consistencia:

| Clase | Hex | Uso |
|-------|-----|-----|
| `text-purple-50` | #faf5ff | Fondos muy claros |
| `bg-purple-100` | #f3e8ff | Fondos claros |
| `text-purple-500` | #8b5cf6 | Texto/iconos principales |
| `bg-purple-600` | #7c3aed | Fondos hover |
| `border-purple-700` | #6d28d9 | Bordes activos |

---

## 🚀 Duraciones de Transición

Duraciones adicionales para mayor control:

| Clase | Valor |
|-------|-------|
| `duration-250` | 250ms |
| `duration-350` | 350ms |

---

## 📖 Patrones Comunes

### Card Estándar
```html
<div class="bg-white rounded-card shadow-material border-2 border-slate-200 p-6">
  <h3>Título</h3>
  <p>Contenido...</p>
</div>
```

### Card con Hover
```html
<div class="bg-white rounded-card shadow-material hover:shadow-hover
            border-2 border-slate-200 transition-all duration-300 ease-smooth
            p-6 cursor-pointer">
  <h3>Card Interactivo</h3>
</div>
```

### Botón Primario
```html
<button class="bg-purple-600 hover:bg-purple-700 text-white
               rounded-btn shadow-purple hover:shadow-purple-lg
               transition-all duration-250 ease-smooth
               px-6 py-3 font-semibold">
  Click Me
</button>
```

### Input Field
```html
<input class="w-full h-12 px-4 rounded-input border-2 border-slate-200
              focus:border-purple-500 focus:ring-4 focus:ring-purple-100
              transition-all duration-200 ease-smooth
              text-slate-900 placeholder-slate-400"
       placeholder="Ingresa texto...">
```

### Dialog Modal
```html
<div class="fixed inset-0 flex items-center justify-center p-4">
  <div class="bg-white rounded-dialog shadow-dialog max-w-md w-full">
    <div class="p-6">
      <h2>Modal Title</h2>
      <p>Content...</p>
    </div>
  </div>
</div>
```

---

## 💡 Beneficios

✅ **Consistencia**: Mismos valores en todo el proyecto
✅ **Mantenibilidad**: Cambios centralizados en tailwind.config.js
✅ **DRY**: Menos CSS duplicado
✅ **Semántica**: Clases con nombres descriptivos
✅ **Performance**: Tailwind optimiza y purga clases no usadas

---

## 🔄 Migración Gradual

No es necesario reemplazar todo el CSS existente de inmediato. Las utilidades están disponibles para:

1. **Nuevos componentes**: Usa las clases desde el inicio
2. **Refactoring**: Reemplaza CSS repetitivo gradualmente
3. **Componentes existentes**: Mantén el CSS actual o migra cuando sea conveniente

---

**Última actualización**: $(date +%Y-%m-%d)
