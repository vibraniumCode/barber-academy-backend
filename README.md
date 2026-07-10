# BarberAcademy — Backend

API REST para la plataforma de cursos online de barbería. Construida con Node.js, Express y TypeScript.

## Stack y dependencias

### Runtime
| Dependencia | Versión | Para qué sirve |
|---|---|---|
| `express` | ^4.x | Framework web — maneja las rutas, middlewares y requests HTTP |
| `mongoose` | ^8.x | ODM para MongoDB — define los modelos y consulta la base de datos |
| `dotenv` | ^16.x | Carga las variables de entorno desde el archivo `.env` |
| `bcryptjs` | ^2.x | Hashea las contraseñas antes de guardarlas (nunca se guardan en texto plano) |
| `jsonwebtoken` | ^9.x | Genera y verifica tokens JWT para autenticación |
| `cors` | ^2.x | Permite que el frontend (en otro dominio/puerto) consuma la API |
| `helmet` | ^7.x | Agrega headers de seguridad HTTP automáticamente |
| `morgan` | ^1.x | Logger de requests HTTP — muestra en consola cada llamada que llega |
| `express-rate-limit` | ^7.x | Limita la cantidad de requests por IP para prevenir ataques de fuerza bruta |
| `multer` | ^1.x | Maneja la subida de archivos (videos, imágenes) desde el frontend |
| `axios` | ^1.x | Cliente HTTP — se usa para llamar a la API de Bunny.net |
| `stripe` | ^22.x | SDK oficial de Stripe para procesar pagos y suscripciones |
| `nodemailer` | ^6.x | Envío de emails transaccionales (confirmaciones, notificaciones) |

### Dev
| Dependencia | Versión | Para qué sirve |
|---|---|---|
| `typescript` | ~6.x | Lenguaje — agrega tipado estático a JavaScript |
| `tsx` | ^4.x | Ejecuta TypeScript directamente sin compilar (usado en desarrollo) |
| `nodemon` | ^3.x | Reinicia el servidor automáticamente al detectar cambios en los archivos |
| `@types/node` | ^26.x | Tipos de TypeScript para las APIs nativas de Node.js |
| `@types/express` | ^4.x | Tipos de TypeScript para Express |
| `@types/bcryptjs` | ^2.x | Tipos de TypeScript para bcryptjs |
| `@types/jsonwebtoken` | ^9.x | Tipos de TypeScript para jsonwebtoken |
| `@types/cors` | ^2.x | Tipos de TypeScript para cors |
| `@types/morgan` | ^1.x | Tipos de TypeScript para morgan |
| `@types/multer` | ^1.x | Tipos de TypeScript para multer |
| `@types/nodemailer` | ^6.x | Tipos de TypeScript para nodemailer |

## Servicios externos requeridos

| Servicio | Para qué | Plan gratuito |
|---|---|---|
| **MongoDB Atlas** | Base de datos en la nube | ✅ 512MB gratis |
| **Bunny.net Stream** | Hosting y streaming seguro de videos | ✅ Pay-as-you-go (centavos en desarrollo) |
| **Stripe** | Pagos internacionales y suscripciones | ✅ Modo test ilimitado |

## Instalación

### Requisitos previos
- Node.js >= 18
- pnpm >= 8 (`npm install -g pnpm`)
- Cuenta en MongoDB Atlas
- Cuenta en Bunny.net
- Cuenta en Stripe

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/vibraniumCode/barber-academy-backend.git
cd barber-academy-backend

# 2. Instalar dependencias
pnpm install

# 3. Crear el archivo de variables de entorno
cp .env.example .env
# Completar los valores en .env (ver sección Variables de entorno)

# 4. Iniciar en modo desarrollo
pnpm dev
```

El servidor queda disponible en `http://localhost:3000`.

## Variables de entorno

Crear un archivo `.env` en la raíz con estos valores:

```env
# Base de datos
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/barber-academy-dev

# JWT
JWT_SECRET=un_secreto_largo_y_aleatorio_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
CLIENT_URL=http://localhost:5173

# Bunny.net (videos)
BUNNY_API_KEY=tu_api_key_de_bunny
BUNNY_LIBRARY_ID=123456
BUNNY_CDN_HOSTNAME=vz-xxxxx.b-cdn.net
BUNNY_TOKEN_KEY=tu_token_key_de_bunny

# Stripe (pagos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUBSCRIPTION_PRICE_ID=price_...
```

> ⚠️ Nunca subas el archivo `.env` a GitHub. Ya está incluido en el `.gitignore`.

## Scripts disponibles

```bash
pnpm dev      # Inicia el servidor en modo desarrollo con hot-reload
pnpm build    # Compila TypeScript a JavaScript en /dist
pnpm start    # Inicia el servidor compilado (producción)
```

## Estructura del proyecto

## Endpoints principales

| Prefijo | Descripción | Auth |
|---|---|---|
| `/api/public` | Catálogo, búsqueda, perfil instructor | ❌ No |
| `/api/auth` | Register, login, perfil | Mixto |
| `/api/courses` | CRUD de cursos, módulos y lecciones | 🔒 Instructor |
| `/api/video` | Upload y streaming seguro de videos | 🔒 Mixto |
| `/api/payments` | Checkout Stripe, suscripciones | 🔒 Student |
| `/api/comments` | Comentarios por lección | 🔒 Student |
| `/api/student` | Dashboard, progreso, completar lecciones | 🔒 Student |
| `/api/instructor` | Stats, alumnos, ingresos | 🔒 Instructor |