# Propuesta Técnica: Soporte para Suscripciones Retroactivas

## 📋 Caso de Negocio

### Escenario Real
Una empresa de internet instala antenas para clientes. En muchos casos:
- La antena se instala y activa físicamente (ej: 5 de mayo)
- El cliente usa el servicio durante varios meses
- Después de 2-3 meses, el operador registra la suscripción en el sistema administrativo
- **Problema:** El sistema actual solo permite crear suscripciones desde "hoy", no permite registrar el historial de pagos anteriores

### Ejemplo Concreto
```
Fecha actual: 30 de julio de 2026
Antena activada: 5 de mayo de 2026
Día de corte: 6 de cada mes

Períodos de servicio:
- Mayo 2026: 5 mayo → 6 junio (PAGADO)
- Junio 2026: 6 junio → 6 julio (PAGADO)
- Julio 2026: 6 julio → 6 agosto (PENDIENTE)
```

**Necesidad del operador:**
1. Crear suscripción con fecha de activación retroactiva (5 mayo)
2. Registrar automáticamente los períodos mayo y junio como PAGADOS
3. Dejar el período julio como PENDING para cobrar

---

## ❌ Limitaciones Actuales de la API

### Endpoint Actual
```http
POST /api/subscriptions
Content-Type: application/json

{
  "clientId": "uuid",
  "planId": "uuid",
  "kitNumber": "KIT-001",
  "billingDay": 6,
  "maxOverduePeriods": 2
}
```

**Respuesta actual:**
```json
{
  "subscription": {
    "id": "uuid",
    "clientId": "uuid",
    "planId": "uuid",
    "kitNumber": "KIT-001",
    "billingDay": 6,
    "status": "ACTIVE",
    "createdAt": "2026-07-30T00:00:00Z"
  },
  "firstBillingPeriod": {
    "id": "uuid",
    "subscriptionId": "uuid",
    "periodLabel": "Agosto 2026",
    "startDate": "2026-07-30",
    "endDate": "2026-08-06",
    "amount": 350.00,
    "status": "PENDING"
  }
}
```

**Problemas:**
1. ❌ No acepta fecha de activación retroactiva
2. ❌ Genera solo UN período desde "hoy"
3. ❌ No permite crear períodos históricos
4. ❌ No permite marcar períodos pasados como pagados

---

## ✅ Solución Propuesta

### Opción 1: Extender POST /subscriptions (Recomendada)

Agregar campos opcionales para manejar suscripciones retroactivas:

```http
POST /api/subscriptions
Content-Type: application/json

{
  "clientId": "uuid",
  "planId": "uuid",
  "kitNumber": "KIT-001",
  "billingDay": 6,
  "maxOverduePeriods": 2,
  
  // NUEVOS CAMPOS OPCIONALES
  "activationDate": "2026-05-05",
  "historicalPayments": [
    {
      "periodLabel": "Mayo 2026",
      "startDate": "2026-05-05",
      "endDate": "2026-06-06",
      "amount": 350.00,
      "paidAt": "2026-06-05T10:30:00Z",
      "paymentMethod": "CASH",
      "notes": "Pago en oficina"
    },
    {
      "periodLabel": "Junio 2026",
      "startDate": "2026-06-06",
      "endDate": "2026-07-06",
      "amount": 350.00,
      "paidAt": "2026-07-04T15:20:00Z",
      "paymentMethod": "TRANSFER",
      "notes": "Transferencia bancaria"
    }
  ]
}
```

**Respuesta esperada:**
```json
{
  "subscription": {
    "id": "uuid",
    "clientId": "uuid",
    "planId": "uuid",
    "kitNumber": "KIT-001",
    "billingDay": 6,
    "status": "ACTIVE",
    "activationDate": "2026-05-05",
    "createdAt": "2026-07-30T00:00:00Z"
  },
  "billingPeriods": [
    {
      "id": "uuid-1",
      "periodLabel": "Mayo 2026",
      "startDate": "2026-05-05",
      "endDate": "2026-06-06",
      "amount": 350.00,
      "status": "PAID",
      "paidAt": "2026-06-05T10:30:00Z",
      "paymentMethod": "CASH"
    },
    {
      "id": "uuid-2",
      "periodLabel": "Junio 2026",
      "startDate": "2026-06-06",
      "endDate": "2026-07-06",
      "amount": 350.00,
      "status": "PAID",
      "paidAt": "2026-07-04T15:20:00Z",
      "paymentMethod": "TRANSFER"
    },
    {
      "id": "uuid-3",
      "periodLabel": "Julio 2026",
      "startDate": "2026-07-06",
      "endDate": "2026-08-06",
      "amount": 350.00,
      "status": "OVERDUE"
    }
  ],
  "summary": {
    "totalPeriods": 3,
    "paidPeriods": 2,
    "pendingPeriods": 0,
    "overduePeriods": 1,
    "totalPaid": 700.00,
    "totalPending": 350.00
  }
}
```

#### Lógica del Backend

```typescript
// Pseudocódigo de la lógica
async function createSubscription(request) {
  const { activationDate, historicalPayments, billingDay, ...rest } = request;
  
  // 1. Crear suscripción
  const subscription = await db.subscription.create({
    ...rest,
    activationDate: activationDate || new Date(),
    createdAt: new Date()
  });
  
  // 2. Si hay activationDate retroactiva, generar períodos históricos
  if (activationDate && historicalPayments) {
    const periods = generateHistoricalPeriods(
      activationDate,
      billingDay,
      historicalPayments,
      plan.price
    );
    
    await db.billingPeriod.createMany({ data: periods });
    
    // 3. Generar período actual (si no está incluido en historicalPayments)
    const currentPeriod = generateCurrentPeriod(
      subscription,
      billingDay,
      plan.price
    );
    
    await db.billingPeriod.create({ data: currentPeriod });
  } else {
    // Comportamiento actual: solo un período desde hoy
    const firstPeriod = generateFirstPeriod(subscription, billingDay, plan.price);
    await db.billingPeriod.create({ data: firstPeriod });
  }
  
  return { subscription, billingPeriods, summary };
}
```

#### Validaciones Necesarias

```typescript
function validateHistoricalPayments(request) {
  const { activationDate, historicalPayments, billingDay } = request;
  
  // 1. activationDate no puede ser futura
  if (activationDate && new Date(activationDate) > new Date()) {
    throw new Error('INVALID_ACTIVATION_DATE: La fecha de activación no puede ser futura');
  }
  
  // 2. historicalPayments debe ser un array
  if (historicalPayments && !Array.isArray(historicalPayments)) {
    throw new Error('INVALID_HISTORICAL_PAYMENTS: Debe ser un array');
  }
  
  // 3. Validar cada pago histórico
  historicalPayments?.forEach((payment, index) => {
    // paidAt no puede ser futura
    if (new Date(payment.paidAt) > new Date()) {
      throw new Error(`INVALID_PAYMENT_DATE: El pago ${index} tiene fecha futura`);
    }
    
    // startDate debe ser posterior a activationDate
    if (activationDate && new Date(payment.startDate) < new Date(activationDate)) {
      throw new Error(`INVALID_PERIOD_START: El período ${index} inicia antes de la activación`);
    }
    
    // endDate debe ser posterior a startDate
    if (new Date(payment.endDate) <= new Date(payment.startDate)) {
      throw new Error(`INVALID_PERIOD_RANGE: El período ${index} tiene rango inválido`);
    }
    
    // amount debe ser positivo
    if (payment.amount <= 0) {
      throw new Error(`INVALID_AMOUNT: El pago ${index} tiene monto inválido`);
    }
    
    // paymentMethod debe ser válido
    if (!Object.values(PaymentMethod).includes(payment.paymentMethod)) {
      throw new Error(`INVALID_PAYMENT_METHOD: El pago ${index} tiene método inválido`);
    }
  });
  
  // 4. Validar que los períodos no se superpongan
  const sortedPayments = [...historicalPayments].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  for (let i = 1; i < sortedPayments.length; i++) {
    const prev = sortedPayments[i - 1];
    const curr = sortedPayments[i];
    
    if (new Date(curr.startDate) < new Date(prev.endDate)) {
      throw new Error('OVERLAPPING_PERIODS: Los períodos históricos se superponen');
    }
  }
}
```

---

### Opción 2: Endpoint Separado para Períodos Manuales

Crear un nuevo endpoint para crear períodos manualmente:

```http
POST /api/billing-periods/manual
Content-Type: application/json

{
  "subscriptionId": "uuid",
  "periods": [
    {
      "periodLabel": "Mayo 2026",
      "startDate": "2026-05-05",
      "endDate": "2026-06-06",
      "amount": 350.00,
      "status": "PAID",
      "paidAt": "2026-06-05T10:30:00Z",
      "paymentMethod": "CASH",
      "notes": "Pago en oficina"
    },
    {
      "periodLabel": "Junio 2026",
      "startDate": "2026-06-06",
      "endDate": "2026-07-06",
      "amount": 350.00,
      "status": "PAID",
      "paidAt": "2026-07-04T15:20:00Z",
      "paymentMethod": "TRANSFER"
    }
  ]
}
```

**Respuesta:**
```json
{
  "createdPeriods": [
    {
      "id": "uuid-1",
      "periodLabel": "Mayo 2026",
      "status": "PAID"
    },
    {
      "id": "uuid-2",
      "periodLabel": "Junio 2026",
      "status": "PAID"
    }
  ],
  "summary": {
    "totalCreated": 2,
    "totalPaid": 2,
    "totalAmount": 700.00
  }
}
```

**Desventaja:** Requiere 2 llamadas (crear suscripción + crear períodos)

---

## 🎯 Comparación de Opciones

| Criterio | Opción 1 (Extender POST /subscriptions) | Opción 2 (Endpoint separado) |
|----------|-----------------------------------------|------------------------------|
| **Simplicidad frontend** | ✅ 1 sola llamada | ❌ 2 llamadas |
| **Atomicidad** | ✅ Todo o nada | ❌ Puede fallar a mitad |
| **Backward compatibility** | ✅ Campos opcionales | ✅ No afecta existente |
| **Complejidad backend** | ⚠️ Media | ✅ Baja |
| **Flexibilidad** | ⚠️ Solo al crear | ✅ Puede agregar después |

**Recomendación:** Opción 1 (extender POST /subscriptions)

---

## 🔄 Impacto en el Frontend

### Cambios necesarios en types/api.ts

```typescript
// Agregar a CreateSubscriptionRequest
export interface CreateSubscriptionRequest {
  clientId: string
  planId: string
  kitNumber: string
  billingDay: number
  maxOverduePeriods?: number
  
  // NUEVOS CAMPOS
  activationDate?: string  // ISO date
  historicalPayments?: HistoricalPayment[]
}

export interface HistoricalPayment {
  periodLabel: string
  startDate: string  // ISO date
  endDate: string    // ISO date
  amount: number
  paidAt: string     // ISO datetime
  paymentMethod: PaymentMethod
  notes?: string
}

// Actualizar CreateSubscriptionResponse
export interface CreateSubscriptionResponse {
  subscription: Subscription & { activationDate?: string }
  billingPeriods: BillingPeriod[]  // Cambiar de firstBillingPeriod a billingPeriods
  summary: {
    totalPeriods: number
    paidPeriods: number
    pendingPeriods: number
    overduePeriods: number
    totalPaid: number
    totalPending: number
  }
}
```

### Cambios en SubscriptionFormPage.tsx

Agregar sección de "Suscripción Retroactiva" con:
- Checkbox: "¿La suscripción fue activada en el pasado?"
- Date picker: Fecha de activación
- Lista dinámica de pagos históricos
- Validación de fechas y montos

---

## 🧪 Casos de Prueba

### Caso 1: Suscripción normal (sin cambios)
```json
{
  "clientId": "uuid",
  "planId": "uuid",
  "kitNumber": "KIT-001",
  "billingDay": 6
}
```
**Resultado:** Comportamiento actual (1 período desde hoy)

### Caso 2: Suscripción retroactiva con pagos
```json
{
  "clientId": "uuid",
  "planId": "uuid",
  "kitNumber": "KIT-002",
  "billingDay": 6,
  "activationDate": "2026-05-05",
  "historicalPayments": [
    {
      "periodLabel": "Mayo 2026",
      "startDate": "2026-05-05",
      "endDate": "2026-06-06",
      "amount": 350.00,
      "paidAt": "2026-06-05T10:30:00Z",
      "paymentMethod": "CASH"
    }
  ]
}
```
**Resultado:** 2 períodos (mayo pagado + julio pendiente/overdue)

### Caso 3: Error - Fecha de activación futura
```json
{
  "activationDate": "2026-12-31"
}
```
**Resultado:** Error 400 `INVALID_ACTIVATION_DATE`

### Caso 4: Error - Períodos superpuestos
```json
{
  "historicalPayments": [
    { "startDate": "2026-05-05", "endDate": "2026-06-10" },
    { "startDate": "2026-06-06", "endDate": "2026-07-06" }
  ]
}
```
**Resultado:** Error 400 `OVERLAPPING_PERIODS`

---

## 📊 Beneficios para el Negocio

1. **Flexibilidad operativa:** Permite registrar suscripciones antiguas sin perder historial
2. **Precisión financiera:** Refleja correctamente los ingresos históricos
3. **Mejor experiencia:** Operadores no necesitan workarounds manuales
4. **Escalabilidad:** Prepara el sistema para migraciones de otros sistemas

---

## 🚀 Prioridad de Implementación

**Alta prioridad** - Este caso es común en empresas de internet/ISP donde:
- Los técnicos instalan antenas físicamente
- El registro administrativo se hace días/semanas después
- Es crítico mantener el historial de pagos para auditoría

**Estimación de esfuerzo:**
- Backend: 2-3 días (endpoint + validaciones + tests)
- Frontend: 1-2 días (formulario + validaciones UI)
- Tests: 1 día

**Total:** 4-6 días de desarrollo

---

## 📞 Siguiente Paso

Agendar reunión con backend para:
1. Revisar esta propuesta
2. Definir qué opción implementar
3. Establecer timeline de desarrollo
4. Coordinar cambios en frontend

---

**Documento preparado por:** Frontend Lead  
**Fecha:** 28 de julio de 2026  
**Versión:** 1.0
