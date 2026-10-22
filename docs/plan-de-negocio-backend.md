# Plan de negocio por organización

Este documento define los cambios que debe implementar el backend para que el frontend pueda
mostrar y administrar el plan de cada organización. No sustituye ni modifica la copia
[api-contract.md](../api-contract.md). Los límites y permisos descritos aquí siempre se validan
en el backend; los avisos y bloqueos del frontend solo orientan al usuario.

## 1. Datos de la organización

Agregar al documento/DTO `Organization`:

| Campo | Tipo | Regla |
|---|---|---|
| `plan` | `'basico' \| 'pro' \| 'negocio' \| 'a-medida'` | Plan contratado. |
| `clientLimit` | `number` | Límite efectivo de clientes. Básico 30, Pro 150, Negocio 300. Para A medida, asignación manual mayor de 300. |
| `planStatus` | `'prueba' \| 'activo' \| 'vencido' \| 'suspendido'` | Estado de acceso a escritura de la organización. |
| `trialEndsAt` | `string \| null` | Fin de prueba en ISO 8601 UTC; solo se usa con Básico en prueba. |
| `planExpiresAt` | `string \| null` | Vencimiento del período pagado, ISO 8601 UTC. |
| `clientCount` | `number` | Número actual de documentos de cliente de la organización. Entero no negativo. |

Incluir estos campos en los DTO de `GET /organizations`, `GET /organizations/:id`, `POST
/organizations` y `PUT /organizations/:id`. No exponer credenciales ni campos internos de
facturación.

### Datos de la organización durante el inicio de sesión

Hoy `User` solo contiene `organizationId`; el frontend no carga el documento de la organización
para un admin. Para evitar una lectura adicional, incluir `organization` (el DTO de organización
con los campos de plan anteriores) dentro de `user` en las respuestas de:

- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me`

Para un super-admin, `organization` puede omitirse. Para un admin, debe corresponder únicamente a
la organización asignada por el backend, nunca a un ID enviado por el cliente. Mantener actualizado
este dato en la respuesta al cambiar o refrescar el perfil, de modo que el frontend pueda actualizar
su sesión sin consultar otra colección.

## 2. Catálogo de planes

El catálogo comercial que debe reflejar el frontend es:

| Clave | Nombre | Límite predeterminado | Precio mensual | Prueba |
|---|---|---:|---:|---|
| `basico` | Básico | 30 clientes | 15 USD | 14 días |
| `pro` | Pro | 150 clientes | 25 USD | No |
| `negocio` | Negocio | 300 clientes | 40 USD | No |
| `a-medida` | A medida | Más de 300, asignado manualmente | Cotización | No |

Todos incluyen WhatsApp y las mismas funciones. Los importes son precios de referencia; Twilio,
mensajes, plantillas y los servicios opcionales de configuración o carga se pagan por separado y
no son suscripciones de la aplicación.

## 3. Creación, edición y lectura del plan

### Organizaciones

- El super-admin puede asignar `plan`, `clientLimit`, `planStatus`, `trialEndsAt` y `planExpiresAt`
  mediante `PUT /organizations/:id`.
- Validar en servidor que `clientLimit` sea entero positivo, que A medida tenga límite mayor de
  300 y que los planes fijos respeten su límite comercial. No aceptar un límite efectivo
  proporcionado por un admin.
- Requerir `trialEndsAt` para estado `prueba` y permitirlo únicamente en Básico; requerir
  `planExpiresAt` para estado `activo`. Los estados `vencido` y `suspendido` pueden conservar sus
  fechas anteriores para consulta e historial.
- No permitir reducir el límite por debajo de `clientCount` sin una operación explícita que
  preserve los datos. El cambio de plan nunca elimina ni oculta clientes.
- Las lecturas de organización y el inicio de sesión deben devolver `clientCount` almacenado; no
  contar la colección de clientes durante cada lectura.
- Extender `GET /organizations` con el parámetro opcional `filter` para que la paginación filtre el
  conjunto completo en el servidor:
  - `trial-expiring`: organizaciones en prueba cuya fecha termina dentro de los próximos 3 días.
  - `expired`: organizaciones vencidas o cuya fecha de prueba/plan ya pasó.
  - `near-limit`: organizaciones cuyo `clientCount / clientLimit` es al menos 80%; incluye las que
    ya llegaron al límite.
- Conservar los filtros `search`, `limit` y `offset` existentes y aplicar el filtro de plan antes de
  calcular `pagination`.

### Alta conjunta de organización y admin

Agregar una operación exclusiva de super-admin:

`POST /organizations/onboard`

Solicitud:

```json
{
  "organization": { "name": "Nombre", "slug": "nombre" },
  "admin": { "name": "Nombre", "email": "admin@example.com", "password": "..." }
}
```

El backend debe crear la organización y su primer admin como una sola operación lógica, asignar el
admin a esa organización y establecer en servidor:

```json
{
  "plan": "basico",
  "clientLimit": 30,
  "planStatus": "prueba",
  "trialEndsAt": "<creación + 14 días en UTC>",
  "planExpiresAt": null,
  "clientCount": 0
}
```

Responder `201` con `{ "organization": Organization, "admin": User }`. No devolver contraseñas en
la respuesta ni almacenarlas en Firestore; el frontend solo conserva temporalmente la contraseña
inicial que el super-admin escribió para mostrarla una vez. Si falla la creación del usuario o de la
organización, no dejar un alta parcial. Aplicar validación de correo, contraseña segura, correo
único y límites de frecuencia; no aceptar campos de plan arbitrarios en esta solicitud.

### Registro de pago manual

Agregar el modelo `OrganizationPlanPayment` (colección/almacenamiento independiente del pago que
registra el admin a sus propios clientes):

```typescript
interface OrganizationPlanPayment {
  id: string
  organizationId: string
  paidAt: string
  amount: number
  method: 'transferencia' | 'usdt' | 'efectivo'
  plan: 'basico' | 'pro' | 'negocio' | 'a-medida'
  newPlanExpiresAt: string
  notes?: string
  createdBy: string
  createdAt: string
}
```

Agregar `POST /organizations/:id/plan-payments`, solo para super-admin. Aceptar `paidAt`, `amount`,
`method`, `plan`, `newPlanExpiresAt` y `notes`; validar fecha, monto positivo y método permitido.
En una transacción guardar el registro, actualizar el plan/fecha de vencimiento y activar la
organización (`planStatus: 'activo'`, limpiar `trialEndsAt`). Devolver el pago y la organización
actualizada. Esta operación registra un pago externo; no intenta cobrar ni validar una transferencia
con un proveedor.

## 4. Contador y límites de clientes

- Inicializar `clientCount` para las organizaciones existentes con una migración de backend antes
  de habilitar la interfaz. El frontend no hará conteos de respaldo.
- Al crear un cliente, validar en el backend, dentro de una operación atómica, que la organización
  autenticada tenga un plan vigente y que `clientCount < clientLimit`; crear el cliente e
  incrementar el contador en la misma operación.
- Si se alcanza el límite, responder `409 CLIENT_LIMIT_REACHED`, incluyendo `clientCount` y
  `clientLimit` actuales. Nunca aceptar plan, límite, estado o contador enviados por el admin.
- Al eliminar un cliente, eliminarlo y restar uno del contador de forma atómica e idempotente; no
  permitir valores negativos. La eliminación de clientes existentes sigue disponible en cuentas
  vigentes; la organización vencida queda en solo lectura.
- El contador solo mide clientes de esa organización, no suscripciones, mensajes o reportes.

## 5. Vencimiento y solo lectura

- Calcular vencimientos con hora UTC del servidor. No confiar en fechas, estado del plan ni contador
  enviados por el frontend.
- Al vencer `trialEndsAt` o `planExpiresAt`, marcar `planStatus: 'vencido'` y denegar en el backend
  toda creación, edición y eliminación de recursos de la organización. No basta con ocultar botones:
  proteger todas las rutas de escritura de clientes, planes internos, suscripciones, períodos,
  configuración, admins y operaciones equivalentes. Las lecturas permanecen habilitadas.
- Si `planStatus` es `suspendido`, aplicar la misma política de solo lectura hasta que un
  super-admin reactive la cuenta.
- Los endpoints públicos del portal `/public/*` de consulta y reporte de clientes finales no deben
  cambiar su acceso por estos estados.
- Al activar o extender el plan, recalcular el estado desde el servidor; no restaurar escrituras por
  una modificación local de la app.

## 6. Seguridad y operación

- Derivar la organización de un admin de su JWT/contexto autenticado. Ignorar `organizationId`,
  `plan`, `clientLimit`, `planStatus` y `clientCount` que un admin incluya en body o query.
- Autorizar edición de planes, altas conjuntas y registro de pagos únicamente a super-admin.
- Mantener aislamiento por organización en cada lectura, escritura, contador y pago.
- Registrar quién asignó/cambió un plan y quién registró cada pago para auditoría, sin registrar
  contraseñas iniciales, tokens ni secretos.
- No añadir cobro automático, registro autoservicio, procesamiento de pagos, ni servicios de
  Twilio al cobro de la suscripción de esta aplicación.

## 7. Preparación para autoservicio futuro

No se implementa ahora. Para incorporarlo después hará falta un flujo público de alta con verificación
de correo y protección contra abuso, creación segura del usuario y organización, aceptación de
términos/privacidad, y un proveedor de pagos con webhooks firmados, idempotencia, conciliación,
renovaciones, cancelaciones y tratamiento de reembolsos. La autorización y los límites del plan
seguirán siendo decisiones del backend.
