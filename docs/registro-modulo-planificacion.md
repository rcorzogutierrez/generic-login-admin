# Registrar Módulo de Planificación de Trabajo

El módulo de planificación ya está implementado en el código, pero necesita ser registrado en Firebase para aparecer en el menú de navegación.

## Opción 1: Registro Manual (Firebase Console)

1. **Ir a Firebase Console**
   - Abrir: https://console.firebase.google.com
   - Seleccionar tu proyecto
   - Ir a `Firestore Database`

2. **Agregar el documento**
   - Ir a la colección `system_modules`
   - Click en "Agregar documento"
   - Dejar que Firebase genere el ID automáticamente
   - Agregar los siguientes campos:

   ```
   Campo             | Tipo      | Valor
   -----------------|-----------|---------------------------------------
   value            | string    | work-planning
   label            | string    | Planificación de Trabajo
   description      | string    | Gestión y programación de planes de trabajo
   icon             | string    | event_note
   route            | string    | /modules/work-planning
   isActive         | boolean   | true
   order            | number    | (usar el número máximo + 1)
   createdAt        | timestamp | (fecha actual)
   createdBy        | string    | system
   updatedAt        | timestamp | (fecha actual)
   updatedBy        | string    | system
   usersCount       | number    | 0
   ```

3. **Guardar el documento**

## Opción 2: Usar el Script Automatizado

1. **Configurar las credenciales de Firebase**
   ```bash
   # Editar el archivo scripts/register-work-planning-module.ts
   # Copiar las credenciales de src/environments/environment.ts
   ```

2. **Instalar ts-node si no está instalado**
   ```bash
   npm install -g ts-node
   # o
   npm install --save-dev ts-node
   ```

3. **Ejecutar el script**
   ```bash
   npx ts-node scripts/register-work-planning-module.ts
   ```

## Opción 3: Desde el Admin del Sistema

1. **Ir al módulo de Administración**
   - Login como administrador
   - Ir a `Admin` > `Gestión de Módulos`

2. **Crear nuevo módulo**
   - Click en "Nuevo Módulo"
   - Llenar el formulario:
     - **Identificador:** `work-planning`
     - **Nombre:** `Planificación de Trabajo`
     - **Descripción:** `Gestión y programación de planes de trabajo para trabajadores y propuestas`
     - **Icono:** `event_note`
     - **Ruta:** `/modules/work-planning`
     - **Estado:** Activo ✅

3. **Guardar**

## Asignar el Módulo a Usuarios

Una vez registrado el módulo, asignar permisos a los usuarios:

1. **Ir a Admin > Gestión de Usuarios**
2. **Seleccionar un usuario**
3. **Click en "Editar"**
4. **En la sección "Módulos", marcar "Planificación de Trabajo"**
5. **Guardar cambios**

## Verificar que Funciona

1. **Refrescar la aplicación** (F5 o Ctrl+R)
2. **El enlace "Planificación" debería aparecer en el navbar**
3. **Click en "Planificación" para abrir el módulo**

## Características del Módulo

✅ **Vistas disponibles:**
- Vista de Calendario (semanal)
- Vista de Lista (tabla con filtros)
- Vista de Línea de Tiempo (cronológica)

✅ **Funcionalidades:**
- Crear planes de trabajo
- Asignar trabajadores o propuestas
- Configurar duración en días y horas
- Seleccionar color de identificación
- Filtrar por estado
- Búsqueda por texto
- Acciones masivas (eliminar múltiples)
- Estadísticas en tiempo real

## Solución de Problemas

**El módulo no aparece en el menú:**
- Verificar que `isActive` está en `true`
- Verificar que el usuario tiene el módulo asignado
- Refrescar la aplicación (limpiar caché)

**Error al acceder al módulo:**
- Verificar que la ruta `/modules/work-planning` está en `app.routes.ts`
- Verificar que el guard `moduleGuard('work-planning')` está configurado

**No puedo crear planes:**
- Verificar que hay trabajadores o propuestas creadas
- Verificar permisos del usuario en Firebase
