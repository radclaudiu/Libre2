# QR Restaurant System

Sistema completo multi-empresa para restaurantes con pedidos por QR.

## Flujo

1. El cliente escanea un QR en su mesa
2. Ve el menú en el móvil (web, sin app)
3. Añade productos al carrito y pulsa "Pedir"
4. El pedido llega en tiempo real al PC del restaurante (app Electron)
5. Se imprime automáticamente la comanda

## Estructura

```
qr-restaurant/
├── server/          # API Fastify + Prisma + PostgreSQL + Socket.io
├── web/             # Next.js (menú público + panel admin)
├── tpv/             # Electron app (TPV Windows)
├── docker-compose.yml
└── README.md
```

## Requisitos

- Node.js 20+
- PostgreSQL 16+
- npm

## Instalación rápida con Docker

```bash
docker-compose up -d
```

Esto levanta PostgreSQL, el servidor API y la web. La app TPV se ejecuta aparte en el PC.

## Instalación manual

### 1. Base de datos

Instalar PostgreSQL y crear una base de datos `qr_restaurant`.

### 2. Servidor API

```bash
cd server
cp .env.example .env
# Editar .env con tus valores (DATABASE_URL, JWT_SECRET)
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

El servidor arranca en `http://localhost:3001`.

### 3. Web (Next.js)

```bash
cd web
cp .env.example .env.local
# Editar .env.local
npm install
npm run dev
```

La web arranca en `http://localhost:3000`.

### 4. TPV (Electron)

```bash
cd tpv
npm install
npm run dev
```

Para compilar el instalador de Windows:

```bash
npm run build:win
```

## Datos de prueba

Tras ejecutar el seed:

- **Email:** admin@demo.com
- **Contraseña:** Admin123!
- **Restaurante:** Restaurante Demo (slug: restaurante-demo)
- 4 categorías con 12 productos
- 6 mesas preconfiguradas

## URLs del menú público

El QR de cada mesa apunta a:

```
https://{DOMINIO}/m/{companySlug}/{tableId}
```

En desarrollo: `http://localhost:3000/m/restaurante-demo/{tableId}`

## Variables de entorno

### Servidor (.env)

| Variable | Descripción |
|---|---|
| DATABASE_URL | URL de conexión PostgreSQL |
| JWT_SECRET | Clave secreta JWT (mínimo 32 caracteres) |
| PORT | Puerto del servidor (default: 3001) |
| CORS_ORIGIN | Orígenes permitidos (separados por coma) |
| UPLOAD_DIR | Directorio de uploads (default: ./uploads) |

### Web (.env.local)

| Variable | Descripción |
|---|---|
| NEXT_PUBLIC_API_URL | URL del servidor API |
| NEXT_PUBLIC_WS_URL | URL del WebSocket |

## API Endpoints

### Públicos (sin auth)
- `GET /api/menu/:companySlug` - Menú del restaurante
- `GET /api/tables/:id/info` - Info de mesa
- `POST /api/orders` - Crear pedido
- `GET /api/health` - Health check

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login

### Admin (requieren JWT)
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/products`
- `POST /api/products/:id/image` - Subir imagen
- `GET/POST/PUT/DELETE /api/tables`
- `PUT /api/tables/:id/position`
- `POST /api/tables/:id/qr`
- `GET /api/orders`
- `PUT /api/orders/:id/status`
- `POST /api/bills/open`
- `GET /api/bills`
- `PUT /api/bills/:id/close`

## WebSocket Events

- `new_order` - Nuevo pedido recibido
- `order_status_changed` - Estado de pedido actualizado
- `table_status_changed` - Estado de mesa actualizado
