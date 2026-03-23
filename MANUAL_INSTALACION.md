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
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Cargar datos de prueba
npx prisma db seed

# Iniciar servidor
npm run dev
```

El servidor arranca en `http://localhost:3001`.

### Paso 3: Web (Next.js)

```bash
cd web

# Copiar configuración
cp .env.example .env.local
```

Editar `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

Instalar y ejecutar:

```bash
npm install
npm run dev
```

La web arranca en `http://localhost:3000`.

### Paso 4: App TPV (Electron - Windows)

```bash
cd tpv

npm install

# Modo desarrollo
npm run dev

# Compilar instalador Windows (.exe)
npm run build:win
```

El instalador se genera en `tpv/build/`.

---

## Instalación en producción

### Servidor API

```bash
cd server
npm install
npx prisma generate
npm run build
NODE_ENV=production node dist/app.js
```

Se recomienda usar **PM2** para gestión de procesos:

```bash
npm install -g pm2
pm2 start dist/app.js --name qr-restaurant-api
pm2 save
```

### Web Next.js

```bash
cd web
npm install
npm run build
npm start
```

### Variables de entorno en producción

| Variable | Valor producción |
|----------|-----------------|
| `DATABASE_URL` | URL de tu PostgreSQL en producción |
| `JWT_SECRET` | Cadena aleatoria segura de 64+ caracteres |
| `CORS_ORIGIN` | `https://tudominio.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.tudominio.com` |
| `NEXT_PUBLIC_WS_URL` | `https://api.tudominio.com` |

### HTTPS

En producción es **obligatorio** usar HTTPS. Se recomienda:
- **Nginx** como proxy inverso con certificados Let's Encrypt
- O un servicio como **Cloudflare** para SSL

Ejemplo de configuración Nginx:

```nginx
server {
    listen 443 ssl;
    server_name api.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name tudominio.com;

    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Datos de prueba (seed)

Tras ejecutar el seed, el sistema incluye:

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

## Resolución de problemas

### El servidor no arranca

1. Verificar que PostgreSQL está corriendo: `pg_isready`
2. Verificar la variable `DATABASE_URL` en `.env`
3. Ejecutar `npx prisma migrate deploy`

### Error "JWT_SECRET must be at least 32 characters"

Asegurarse de que `JWT_SECRET` en `.env` tiene al menos 32 caracteres.

### La web no se conecta al servidor

1. Verificar que el servidor está corriendo en el puerto correcto
2. Verificar `NEXT_PUBLIC_API_URL` en `.env.local`
3. Verificar que `CORS_ORIGIN` en el servidor incluye la URL de la web

### El TPV no recibe pedidos en tiempo real

1. Verificar la URL del servidor en la pantalla de login del TPV
2. Verificar que el WebSocket está habilitado (mismo puerto que la API)
3. Comprobar que no hay firewall bloqueando la conexión

### La impresión no funciona

1. En Configuración del TPV, verificar que la impresora está seleccionada
2. Probar con el botón "Probar impresión"
3. Para impresoras térmicas, seleccionar el ancho de papel correcto (80mm o 58mm)
