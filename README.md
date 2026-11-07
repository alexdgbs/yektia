# Yektia · Frontend

Interfaz React/Vite del directorio médico Yektia. Este paquete contiene únicamente el frontend; la API REST y Socket.IO se ejecutan en el backend alojado por separado.

## Requisitos

- Node.js 22.12 o posterior.
- npm.
- Una instancia desplegada del backend Yektia y su URL pública.

## Instalación local

```bash
npm ci
cp .env.example .env
npm run dev
```

En Windows puedes copiar `.env.example` manualmente como `.env`. Cambia los valores de ejemplo antes de probar la aplicación.

## Variables de entorno

```env
VITE_API_REST=https://tu-dominio-del-backend/api
VITE_SOCKET_URL=https://tu-dominio-del-backend
VITE_GOOGLE_CLIENT_ID=tu_client_id_web.apps.googleusercontent.com
```

`VITE_API_REST` puede apuntar directamente al backend real de Yektia y puede incluir `/api`; la aplicación normaliza la ruta. Si no se define en producción, REST conserva el proxy `/api` configurado actualmente en `vercel.json` para no romper la integración existente. Para migrar a otro dominio, configura `VITE_API_REST` en Vercel y vuelve a desplegar. Para Socket.IO, define `VITE_SOCKET_URL`; si se omite pero se define `VITE_API_REST`, el origen se deriva de esa URL.

En Vercel configura estas variables en el proyecto y vuelve a desplegar para que Vite las incorpore al bundle. Como las sesiones usan cookies, el backend debe permitir el origen exacto del frontend con credenciales habilitadas; los atributos de la cookie deben admitir el despliegue entre orígenes si aplica.

El archivo `vercel.json` conserva el rewrite de API existente y además resuelve las rutas de la SPA hacia `index.html`. Cambia el destino del rewrite solo cuando tengas confirmada la URL del backend de reemplazo; también puedes usar `VITE_API_REST` para hacer que las peticiones REST vayan directamente a esa URL.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Estructura

- `src/pages`: portada/directorio, perfil en modal y cuenta.
- `src/components/doctors`: tarjetas de especialista, perfil, reseñas, valoración y comparación.
- `src/components/appointments`: selección de disponibilidad y solicitud de cita.
- `src/components/account`: acceso, agenda, configuración de cuenta, panel administrativo y solicitudes médicas.
- `src/services`: clientes REST y Socket.IO del backend desplegado.
- `src/styles`: estilos globales, experiencia del directorio y pantallas de cuenta.

## Calidad

El workflow de GitHub Actions valida ESLint y el build de Vite. Este paquete no contiene pruebas ni código del backend; las pruebas de API deben ejecutarse en el repositorio donde se mantiene ese servicio.
