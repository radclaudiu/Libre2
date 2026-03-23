# Manual de Instalación - QR Restaurant System

## Requisitos previos

| Software | Versión mínima | Uso |
|----------|---------------|-----|
| Node.js | 20.x | Servidor, Web, TPV |
| PostgreSQL | 16.x | Base de datos |
| npm | 10.x | Gestión de paquetes |
| Git | 2.x | Control de versiones |

Para la app TPV (Windows):
- Windows 10 o superior
- Impresora instalada (térmica ESC/POS o estándar)

---

## Opción 1: Instalación con Docker (recomendada)

### Paso 1: Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO> qr-restaurant
cd qr-restaurant
```

### Paso 2: Configurar variables de entorno

```bash
cp server/.env.example server/.env
```

Editar `server/.env` y cambiar **obligatoriamente**:

```env
JWT_SECRET=una-clave-secreta-muy-larga-de-al-menos-32-caracteres-aqui
```

### Paso 3: Levantar con Docker Compose

```bash
docker-compose up -d
```

Esto levanta:
- **PostgreSQL** en el puerto 5432
- **Servidor API** en el puerto 3001
- **Web Next.js** en el puerto 3000

### Paso 4: Ejecutar migraciones y datos de prueba

```bash
docker-compose exec server npx prisma migrate deploy
docker-compose exec server npx prisma db seed
```

### Paso 5: Verificar

- Abrir http://localhost:3000 → Página de inicio
- Abrir http://localhost:3001/api/health → `{"status":"ok"}`

---

## Opción 2: Instalación manual

### Paso 1: Instalar PostgreSQL

Instalar PostgreSQL 16+ y crear la base de datos:

```sql
CREATE DATABASE qr_restaurant;
```

### Paso 2: Servidor API

```bash
cd server

# Copiar configuración
cp .env.example .env
```

Editar `server/.env`:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/qr_restaurant?schema=public"
JWT_SECRET="cambia-esto-por-una-cadena-aleatoria-segura-de-minimo-32-caracteres"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
UPLOAD_DIR="./uploads"
```

Instalar y ejecutar:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

El servidor arranca en `http://localhost:3001`.

### Paso 3: Web (Next.js)

```bash
cd web
cp .env.example .env.local
```

Editar `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

```bash
npm install
npm run dev
```

La web arranca en `http://localhost:3000`.

### Paso 4: App TPV (Electron - Windows)

```bash
cd tpv
npm install
npm run dev
```

Para compilar el instalador Windows:

```bash
npm run build:win
```

El instalador se genera en `tpv/build/`.

---

## Datos de prueba (seed)

| Dato | Valor |
|------|-------|
| **Email** | admin@demo.com |
| **Contraseña** | Admin123! |
| **Restaurante** | Restaurante Demo |
| **Slug** | restaurante-demo |
| **Categorías** | Entrantes, Principales, Postres, Bebidas |
| **Productos** | 12 productos con precios y extras |
| **Mesas** | 6 mesas preconfiguradas |

---

## Producción

### Servidor

```bash
cd server && npm install && npx prisma generate && npm run build
NODE_ENV=production node dist/app.js
```

### Web

```bash
cd web && npm install && npm run build && npm start
```

### HTTPS (obligatorio en producción)

Usar Nginx como proxy inverso con certificados Let's Encrypt. Importante: configurar WebSocket passthrough.

---

## Resolución de problemas

| Problema | Solución |
|----------|----------|
| Servidor no arranca | Verificar PostgreSQL y DATABASE_URL |
| JWT_SECRET error | Mínimo 32 caracteres en .env |
| Web no conecta al servidor | Verificar NEXT_PUBLIC_API_URL y CORS_ORIGIN |
| TPV no recibe pedidos | Verificar URL del servidor y que WebSocket esté habilitado |
| Impresión no funciona | Verificar impresora en Configuración del TPV |
| Cliente ve "Mesa no disponible" | El camarero debe abrir la mesa desde el TPV primero |
