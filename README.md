# Administración de suscripciones

Aplicación web instalable (PWA) para que los administradores gestionen clientes, planes,
suscripciones, períodos de facturación y cobranzas. También incluye vistas de reportes,
administración y mensajería.

## Requisitos

- Node.js y npm
- Acceso a una instancia del backend

## Desarrollo local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y configura `VITE_API_BASE_URL` con la URL base de la
   API. Las variables opcionales y sus valores de ejemplo están descritos en `.env.example`.
3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Comprobaciones

```bash
npm run lint
npm run build
```

## Documentación

Consulta el [índice de documentación](docs/index.md) para conocer el propósito y responsable de
cada documento.

`api-contract.md` es una copia del contrato publicado por el backend. No se edita en este
repositorio: cuando cambia el contrato, se vuelve a copiar desde el backend.
