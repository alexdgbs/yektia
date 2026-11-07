# Yektia

Directorio médico: busca especialistas, revisa su perfil, disponibilidad y
precio, y solicita una cita. El frontend es React 19 + Vite; el backend es
Express + Mongoose (MongoDB) con Socket.IO para actualizar comentarios,
valoraciones y agendas en tiempo real.

## Estructura

- `src/`: frontend (páginas, componentes, servicios REST y Socket.IO).
- `backend/`: API REST, Socket.IO y modelos de MongoDB.
- `.github/workflows/quality.yml`: valida ESLint y el build del frontend.

## Frontend

Requisitos: Node.js 22.12 o posterior y npm.

```bash
npm ci
npm run dev
```

### Variables de entorno (frontend)

Crea un archivo `.env` en la raíz con estas variables:

```env
VITE_API_REST=https://tu-dominio-del-backend/api
VITE_SOCKET_URL=https://tu-dominio-del-backend
VITE_GOOGLE_CLIENT_ID=tu_client_id_web.apps.googleusercontent.com
```

- `VITE_API_REST` es la URL pública del backend (puede incluir `/api`; la
  aplicación normaliza la ruta). Si se define, las peticiones REST van
  directas a esa URL.
- Si no se define en producción, el frontend usa el proxy `/api` de
  `vercel.json`, que hoy apunta a `https://caresync-anat.onrender.com/api`.
  Ese rewrite es estático: Vercel no permite interpolar variables de entorno
  en `vercel.json`. Para cambiar el backend fijo, edita el destino del
  rewrite en `vercel.json` o define `VITE_API_REST` en el proyecto de Vercel
  y vuelve a desplegar.
- `VITE_SOCKET_URL` es el origen de Socket.IO; si se omite pero se define
  `VITE_API_REST`, se deriva de esa URL.
- Como las sesiones usan cookies, el backend debe permitir el origen exacto
  del frontend con credenciales habilitadas.

Comandos del frontend:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Backend

Requisitos: Node.js 22.12 o posterior, npm y una base MongoDB.

```bash
cd backend
npm ci
npm run dev
```

### Variables de entorno (backend)

Crea `backend/.env` con:

```env
MONGO_URI=mongodb+srv://usuario:contraseña@cluster/tu-base
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=tu_client_id_web.apps.googleusercontent.com
```

- `MONGO_URI`: cadena de conexión a MongoDB.
- `FRONTEND_URL`: origen del frontend permitido por CORS (se pueden listar
  varios, separados por coma). En producción es obligatorio, junto con
  `MONGO_URI` y `GOOGLE_CLIENT_ID`; sin ellos el servidor no arranca.
- `GOOGLE_CLIENT_ID`: cliente web de Google para el inicio de sesión.
- `PORT` (opcional, por defecto `5000`).

El servidor escucha en `http://localhost:5000` y expone la API en `/api`
(`GET /api/health`, `GET /api/medicos`, `GET /api/medicos/:id`, entre otros)
y la documentación en `/api/docs`.

Comandos del backend:

```bash
npm run dev
npm start
npm test
```

### Doctores de ejemplo

El directorio solo muestra perfiles con `verificationStatus: "verified"`.
Para agregar los 5 doctores de ejemplo (Guadalajara, con especialidad, precio
en MXN, horarios, descripción e idiomas), con `MONGO_URI` ya configurado en
`backend/.env`:

```bash
cd backend
npm run seed:doctors
```

El script está en `backend/scripts/seed-doctors.js`. No borra nada: solo
agrega los doctores de ejemplo que aún no existan (por cédula) y deja
intactos los perfiles que ya están en la base. Los doctores llevan
`fuente: "ejemplo"` para distinguirlos de los perfiles reales. El sitio en
vivo seguirá mostrando los perfiles que ya tiene hasta que se corra este
seed contra su base de MongoDB.

## Sesiones

La cookie de sesión se llama `yektia_session` (`__Host-yektia_session` en
producción). Por compatibilidad, el backend también acepta la cookie anterior
`caresync_session`, así las sesiones creadas antes del cambio de nombre
siguen válidas hasta que expiren.
