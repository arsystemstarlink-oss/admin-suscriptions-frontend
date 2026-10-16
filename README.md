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

2. Copia `.env.example` a `.env.local`. En desarrollo, `VITE_API_BASE_URL` indica la API local:
   Vite la usa primero y cambia a `VITE_API_FALLBACK_URL` si no está disponible. La conexión
   remota se realiza mediante el proxy local, por lo que no depende de que el backend permita
   CORS desde localhost.
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
