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
| `clientLimit` | `number` | Límite efectivo de clientes. Básico 30, Pro 75, Negocio 150. Para A medida, asignación manual mayor de 150. |
| `planStatus` | `'prueba' \| 'activo' \| 'vencido' \| 'suspendido'` | Estado de acceso a escritura de la organización. |
| `billingDay` | `number` | Día de corte mensual (1-28). Se establece al crear la organización a partir de la fecha de alta y se mantiene en las renovaciones. |
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
| `pro` | Pro | 75 clientes | 25 USD | No |
| `negocio` | Negocio | 150 clientes | 40 USD | No |
| `a-medida` | A medida | Más de 150, asignado manualmente | Cotización | No |

Todos incluyen WhatsApp y las mismas funciones. Los importes son precios de referencia; Twilio,
mensajes, plantillas y los servicios opcionales de configuración o carga se pagan por separado y
no son suscripciones de la aplicación.

## 3. Creación, edición y lectura del plan

### Organizaciones

- El super-admin puede asignar `plan`, `clientLimit`, `planStatus`, `trialEndsAt` y `planExpiresAt`
  mediante `PUT /organizations/:id`.
- Validar en servidor que `clientLimit` sea entero positivo, que A medida tenga límite mayor de
  150 y que los planes fijos respeten su límite comercial. No aceptar un límite efectivo
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
  "billingDay": "<día UTC del alta, 1-28>",
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
`method`, `plan`, `months` y `notes`; validar fecha, monto positivo, método permitido y meses entre 1
y 12. Calcular `newPlanExpiresAt` en el servidor sumando los meses al fin de prueba o al vencimiento
vigente y anclando el resultado al `billingDay` de la organización; no aceptar fechas libres del
frontend. En una transacción guardar el registro, actualizar el plan/fecha de vencimiento y activar la
organización (`planStatus: 'activo'`, limpiar `trialEndsAt`). Devolver el pago y la organización
actualizada. Esta operación registra un pago externo; no intenta cobrar ni validar una transferencia
con un proveedor.

### Catálogo de precios y reporte del admin

- Mantener los precios fijos en el backend (`BUSINESS_PLAN_PRICES`: Básico 15, Pro 25, Negocio
  40, A medida null) y exponerlos en `GET /public/business-plans` junto con límites y días de
  prueba. El frontend no debe duplicar precios.
- Agregar `OrganizationPlanPaymentReport` para que un admin reporte el pago de su organización.
  Guardar plan, meses, método, fecha, monto, referencia y estado (`PENDING`, `APPROVED`,
  `REJECTED`). Para planes fijos el monto se toma del catálogo; A medida acepta monto acordado.
- `POST /organization-plan-payment-reports` (admin) valida que no exista otro reporte pendiente y
  que el plan no baje mientras la suscripción esté vigente. `POST
  /organization-plan-payment-reports/:id/review` (super-admin) aprueba aplicando el mismo flujo de
  `registerPlanPayment` y calculando el vencimiento con `months` y `billingDay`, o rechaza con
  motivo.
- El reporte del admin debe funcionar aunque la organización esté vencida o suspendida: es la vía
  para regularizar el pago. No aplicar `requireWritablePlan` a esa ruta.

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
- No añadir cobro automático, procesamiento de pagos con pasarela, ni servicios de Twilio al cobro
  de la suscripción de esta aplicación. El autoservicio actual usa pago reportado y revisión manual.

## 7. Autoservicio implementado

El alta autoservicio ya está disponible desde `/planes/solicitar`:

- **Básico**: crea organización + admin y empieza la prueba gratis. Sin reporte de pago.
- **Pro / Negocio**: crea organización + admin en Básico de prueba y deja un
  `OrganizationPlanPaymentReport` PENDING por 1 mes con el monto calculado por el backend. El
  super-admin lo revisa en `/payment-reports/plans`; al aprobar se activa el plan y se envía push.
- **A medida**: solo registra una solicitud (`PlanQuoteRequest`) que el super-admin ve en
  `/config/plan-quote-requests`. No crea organización ni usuario.

Rutas backend: `GET /public/payment-instructions`, `POST /public/signup`,
`POST /public/plan-quote-requests`, `GET/PATCH /plan-quote-requests`. El alta usa rate limit
estricto y CAPTCHA Turnstile (`public_signup`, `public_quote`), y crea la organización, el admin y
el reporte pendiente en una sola transacción, revirtiendo el usuario de Firebase Auth si falla.

**Queda fuera de alcance**: pasarela de cobro automático y webhooks, verificación de correo,
recuperación de contraseña por correo, carga de comprobantes y conciliación/reembolsos. Las
renovaciones y prepagos de 3/6/12 meses siguen desde Perfil con el flujo existente.
