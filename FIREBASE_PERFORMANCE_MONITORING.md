# Firebase Performance Monitoring

## Descripción

Este sistema instrumenta todas las consultas a Firebase Firestore para mostrar métricas de rendimiento en tiempo real en la consola del navegador.

## Características

### Operaciones Monitoreadas

- **getDoc**: Obtención de un documento individual
- **getDocs**: Consultas de múltiples documentos
- **addDoc**: Creación de documentos
- **setDoc**: Establecer/reemplazar documentos
- **updateDoc**: Actualización de documentos
- **deleteDoc**: Eliminación de documentos

### Información Mostrada

Para cada operación se muestra:

1. **Tipo de operación**: Con emoji distintivo
   - 🔍 getDoc
   - 📋 getDocs
   - ➕ addDoc
   - 💾 setDoc
   - ✏️ updateDoc
   - 🗑️ deleteDoc

2. **Colección/Path**: Ruta completa de Firestore

3. **Tiempo de ejecución**: Con código de colores
   - Verde: < 100ms (rápido)
   - Amarillo: 100-500ms (aceptable)
   - Rojo: > 500ms (lento)

4. **Resultado**: Información adicional
   - Para `getDocs`: Número de documentos retornados
   - Para `getDoc`: Si el documento existe
   - Para `addDoc/setDoc`: ID del documento creado

## Cómo Usar

### Ver Logs en la Consola

1. Abre la aplicación en el navegador
2. Abre las DevTools (F12)
3. Ve a la pestaña Console
4. Interactúa con la aplicación (login, cargar usuarios, etc.)
5. Observa los logs con tiempos de cada operación

### Ejemplo de Logs

```
🔍 getDoc → config/system_config
✅ getDoc → config/system_config | Tiempo: 45.23ms | Existe: true

📋 getDocs → authorized_users
✅ getDocs → authorized_users | Tiempo: 234.56ms | Documentos: 15

➕ addDoc → admin_logs
✅ addDoc → admin_logs | Tiempo: 89.12ms | ID: abc123xyz
```

### Identificar Problemas de Rendimiento

#### Operaciones Lentas (> 500ms)

Si ves logs en **rojo**:

```
📋 getDocs → authorized_users | Tiempo: 1234.56ms | Documentos: 150
```

Posibles causas:
- Demasiados documentos sin paginación
- Falta de índices en Firestore
- Consultas ineficientes
- Problemas de red

#### Muchas Consultas Secuenciales

Si ves múltiples consultas una tras otra:

```
🔍 getDoc → users/user1 | Tiempo: 50ms
🔍 getDoc → users/user2 | Tiempo: 45ms
🔍 getDoc → users/user3 | Tiempo: 52ms
```

Solución: Usar batch reads o consultas compuestas

#### Consultas Duplicadas

Si ves la misma consulta repetida:

```
📋 getDocs → authorized_users | Tiempo: 200ms
📋 getDocs → authorized_users | Tiempo: 198ms
```

Problema: Posible falta de caché o inicialización múltiple

## Configuración

### Habilitar/Deshabilitar Logging

Puedes controlar el logging programáticamente:

```typescript
import { enableFirebaseLogging } from './shared/utils/firebase-logger.utils';

// Deshabilitar en producción
if (environment.production) {
  enableFirebaseLogging(false);
}

// Habilitar para debugging
enableFirebaseLogging(true);
```

### Agrupar Operaciones

Para medir el tiempo total de un conjunto de operaciones:

```typescript
import { FirebaseOperationGroup } from './shared/utils/firebase-logger.utils';

const group = new FirebaseOperationGroup('Carga inicial de usuarios');
// ... realizar operaciones ...
group.finish(); // Muestra resumen
```

## Casos de Uso

### 1. Debugging de Login Lento

Al hacer login, observa:

```
🔍 getDoc → config/system_config | Tiempo: 45ms
📋 getDocs → authorized_users | Tiempo: 1200ms ← PROBLEMA
🔍 getDoc → users/xyz123 | Tiempo: 50ms
```

**Solución**: Optimizar la consulta de `authorized_users` con índices o paginación.

### 2. Análisis de Carga de Página

Al cargar el dashboard admin:

```
📦 Iniciando grupo: Carga inicial de usuarios
📋 getDocs → authorized_users | Tiempo: 250ms
📋 getDocs → system_modules | Tiempo: 120ms
📋 getDocs → roles | Tiempo: 80ms
📊 Resumen:
  Tiempo total: 450ms
  Operaciones: 3
```

### 3. Detección de Loops N+1

Problema común donde se hace una consulta por cada elemento:

```
📋 getDocs → users | Tiempo: 100ms | Documentos: 10
🔍 getDoc → modules/mod1 | Tiempo: 45ms
🔍 getDoc → modules/mod2 | Tiempo: 43ms
...
```

**Solución**: Cargar todos los módulos de una vez.

## Mejores Prácticas

### 1. Monitorear Regularmente

- Revisa logs después de cada cambio importante
- Identifica regresiones de rendimiento temprano

### 2. Establecer Umbrales

- < 100ms: Excelente
- 100-300ms: Bueno
- 300-500ms: Aceptable
- > 500ms: Requiere optimización

### 3. Priorizar Optimizaciones

Enfócate primero en:
1. Consultas en rutas críticas (login, dashboard)
2. Operaciones frecuentes
3. Consultas que retornan muchos documentos

### 4. Usar Índices Compuestos

Si ves consultas lentas con múltiples filtros:

```
📋 getDocs → users | where(role, ==, 'admin') where(isActive, ==, true)
Tiempo: 800ms ← Necesita índice compuesto
```

Crea el índice en Firebase Console.

## Troubleshooting

### Los logs no aparecen

1. Verifica que el logging esté habilitado:
   ```typescript
   import { isFirebaseLoggingEnabled } from './shared/utils/firebase-logger.utils';
   console.log('Logging enabled:', isFirebaseLoggingEnabled());
   ```

2. Revisa la consola de DevTools (no TypeScript errors)

### Tiempos inconsistentes

- Primera carga siempre es más lenta (cold start)
- La caché del navegador afecta tiempos
- La red puede variar

### Colores no se muestran

Los códigos ANSI no funcionan en todos los navegadores. Los tiempos siguen siendo precisos.

## Impacto en Rendimiento

El sistema de logging tiene un overhead mínimo:
- < 1ms por operación
- No afecta la lógica de negocio
- Puede deshabilitarse en producción

## Referencias

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Query Performance](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)
- [Firestore Pricing](https://firebase.google.com/docs/firestore/pricing)

## Notas de Desarrollo

Los wrappers están en: `src/app/shared/utils/firebase-logger.utils.ts`

Servicios instrumentados:
- ✅ firestore-user.service.ts
- ✅ admin.service.ts
- ✅ roles.service.ts
- ✅ modules.service.ts
- ✅ app-config.service.ts
- ✅ system-config.service.ts
- ✅ admin-logs.service.ts
- ✅ auth.service.ts

---

**Última actualización**: 2025-10-23
