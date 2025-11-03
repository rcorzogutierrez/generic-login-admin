# 🔍 DIAGNÓSTICO: Campo "Costo" Invisible pero se Guarda

## 🚨 Problema Reportado

El campo **"Costo"** (tipo currency):
- ❌ NO se muestra en el formulario de crear/editar cliente
- ✅ SÍ se guarda cuando se envía el formulario
- ❓ Aparece como "campo usado" aunque no lo veas

---

## 🔎 Posible Causa: Layout Personalizado

Sospecho que tienes un **layout personalizado** configurado en el constructor de formularios que:
- ✅ Incluye 6 campos específicos con posiciones definidas
- ❌ NO incluye el campo "Costo"
- Por lo tanto, "Costo" no se renderiza en pantalla
- Pero el control del formulario SÍ se crea, por eso se guarda

---

## 🧪 Cómo Verificar

### Paso 1: Recarga tu Aplicación

1. Haz pull de los cambios más recientes
2. Reinicia tu servidor de desarrollo si es necesario
3. Ve a: `http://localhost:4200/modules/clients/new`
4. Abre la **Consola del navegador** (F12)

### Paso 2: Revisa los Logs

Busca este bloque de logs:

```
🎨 getGridRows(): Total de campos a renderizar: 7
```

**CASO 1: Sin Layout Personalizado**
```
   Usando layout por defecto (una sola fila)
   Campos que se van a renderizar:
     1. Nombre del Cliente (nombre_del_cliente) - Tipo: text
     2. Dirección (direccion) - Tipo: text
     3. email (email) - Tipo: email
     4. Tipo de Cliente (tipo_de_cliente) - Tipo: select
     5. diccionario-test (diccionario_test) - Tipo: dictionary
     6. Costo (costo) - Tipo: currency
     7. Telefono (telefono) - Tipo: phone
```
→ Todos los campos deberían mostrarse

**CASO 2: Con Layout Personalizado (PROBLEMA)**
```
   ⚠️ Usando layout personalizado
   Layout tiene 6 posiciones definidas
     ✅ Nombre del Cliente tiene posición en layout
     ✅ Dirección tiene posición en layout
     ✅ email tiene posición en layout
     ✅ Tipo de Cliente tiene posición en layout
     ✅ diccionario-test tiene posición en layout
     ❌ Costo NO tiene posición en layout - SE OMITIRÁ  ← PROBLEMA
     ✅ Telefono tiene posición en layout
```
→ El campo "Costo" no se renderiza porque no está en el layout

### Paso 3: Copia los Logs

**Copia TODA la sección de logs de `getGridRows()`** y envíamelos.

---

## 💡 Soluciones (Dependiendo del Caso)

### Si Es CASO 2 (Layout Personalizado)

**Opción A: Agregar "Costo" al Layout**

1. Ve a: `/modules/clients/config`
2. Busca la pestaña **"Layout del Formulario"** o **"Diseñador de Formulario"**
3. Arrastra el campo **"Costo"** a la posición deseada en el grid
4. Guarda cambios

**Opción B: Eliminar el Layout Personalizado**

Si no necesitas un layout personalizado:

1. Ve a: `/modules/clients/config`
2. En **"Layout del Formulario"**
3. Haz clic en **"Restaurar Layout por Defecto"** o **"Eliminar Layout Personalizado"**
4. Guarda cambios

Esto hará que todos los campos activos se muestren en orden.

**Opción C: Desactivar el Campo "Costo"**

Si no necesitas el campo:

1. Ve a: `/modules/clients/config`
2. Busca el campo **"Costo"**
3. Desactiva el toggle **"Activo"**
4. Guarda cambios

Esto evitará que se guarde.

---

### Si Es CASO 1 (Sin Layout Personalizado)

Si los logs muestran que NO hay layout personalizado pero el campo no se ve, entonces:

1. El campo "Costo" podría estar al **final del formulario** y necesitas hacer **scroll hacia abajo**
2. Podría haber un problema de **CSS que lo oculta**
3. El campo tipo **currency** podría tener un bug de renderizado

En ese caso, envíame los logs y una captura de pantalla del formulario completo (con scroll hasta el final).

---

## 🎯 Diferencia Importante

| Comportamiento | Explicación |
|----------------|-------------|
| **buildForm()** crea 7 controles | Por eso el campo se guarda aunque no lo veas |
| **getGridRows()** solo renderiza 6 | Por eso solo ves 6 campos en pantalla |

El problema está en `getGridRows()` que filtra campos según el layout personalizado.

---

## 🔧 Siguiente Paso

**Por favor ejecuta el diagnóstico y envíame los logs completos de `getGridRows()`**.

Con esa información podré decirte exactamente:
- ✅ Si tienes un layout personalizado
- ✅ Qué campos están incluidos/excluidos
- ✅ La solución exacta para tu caso

---

## 📋 También Revisa

Adicionalmente, busca estos logs en consola:

```
📖 Campo DICTIONARY: diccionario-test tiene X opciones
```

O:

```
⚠️ Campo DICTIONARY: diccionario-test NO tiene opciones - no se renderizará
```

Esto confirmará el problema del campo "diccionario-test" que ya identificamos.
