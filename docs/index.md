# Documentación

Los documentos usan `lowercase-kebab-case`, siguiendo la convención del backend. `README.md` se
conserva por convención del proyecto.

## Referencias del frontend

| Documento | Propósito | Responsable |
|---|---|---|
| [Sistema visual](design-system.md) | Tokens, jerarquía de superficies y patrones visuales de la interfaz. | Frontend |
| [Notificaciones push](push-notifications.md) | Requisitos y detalles de integración Web Push consumidos por el frontend. | Fuente y contenido canónicos: backend; frontend conserva una copia |
| [Plan de negocio](plan-de-negocio-backend.md) | Campos, operaciones y reglas de backend para planes, límites y pagos manuales de suscripción. | Frontend define requisitos; backend implementa |

## Contrato de API

[api-contract.md](../api-contract.md) es una copia del contrato publicado por el backend. El backend
es su única fuente de verdad; aquí no se modifica ni se mantiene manualmente. Cuando el backend lo
actualice, se copia su versión vigente.

## Inicio

Para instalar y ejecutar la aplicación, consulta el [README](../README.md).
