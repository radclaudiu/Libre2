# Manual de Usuario - QR Restaurant System

---

## 1. Registro y primer acceso

1. Abrir la web y pulsar **"Acceder al Panel"**
2. Pulsar **"Crear cuenta"** e introducir: nombre, nombre del restaurante, email y contraseña
3. La contraseña requiere mínimo 8 caracteres con mayúscula, minúscula y número

---

## 2. Panel de administración web

### Dashboard

Muestra un resumen del día: pedidos hoy, pedidos pendientes, sesiones activas, facturación.

### Navegación lateral

- **Dashboard**: Resumen general
- **Menú**: Gestión de categorías y productos
- **Mesas**: Plano del restaurante y códigos QR
- **Pedidos**: Pedidos en tiempo real
- **Historial**: Cuentas cerradas

---

## 3. Gestión del menú

### Categorías

Crear, editar o eliminar categorías (ej: Entrantes, Principales, Postres, Bebidas). Cada categoría tiene un número de orden que determina su posición en el menú.

### Productos

- **Nombre, descripción, precio, categoría, imagen**
- **Extras/modificadores**: opciones adicionales con precio (ej: "Extra queso +1.50€")
- **Activo/Inactivo**: los productos inactivos no aparecen en el menú público

---

## 4. Gestión de mesas y QR

### Plano del restaurante

Las mesas aparecen como rectángulos con colores:
- **Verde**: Libre
- **Rojo**: Ocupada (sesión activa)

Arrastrar para reorganizar el plano.

### Código QR

1. Pulsar el icono QR de una mesa
2. Descargar el PNG
3. Imprimir y colocar en la mesa física

**El QR es fijo y nunca cambia.** El control de acceso se hace mediante sesiones, no cambiando el QR.

---

## 5. Sistema de sesiones (CONCEPTO CLAVE)

### ¿Qué es una sesión?

Una sesión controla cuándo los clientes pueden pedir. **Sin sesión activa, el cliente NO puede hacer pedidos** aunque tenga el QR escaneado.

### Flujo

1. **Camarero abre mesa** desde el TPV → Se crea sesión activa
2. **Cliente escanea QR** → El sistema verifica que hay sesión activa → Permite ver menú y pedir
3. **Cliente pide** → El pedido se vincula a la sesión
4. **Camarero cierra mesa** desde el TPV → La sesión se cierra, se calcula el total, y el cliente ya no puede pedir

### ¿Por qué sesiones?

- **Seguridad**: Un cliente anterior no puede pedir en la mesa del siguiente
- **Control**: Solo el camarero decide cuándo se puede pedir
- **Facturación**: Cada sesión agrupa todos los pedidos para calcular la cuenta

---

## 6. Gestión de pedidos (Panel admin web)

Los pedidos llegan en tiempo real. Cada uno muestra:
- Mesa, estado, productos con extras, notas del cliente, hora, total

**Estados:** Pendiente → Aceptado → Servido (o Cancelado)

Filtrar por estado usando el selector superior.

---

## 7. Experiencia del cliente (móvil)

### Cuando el QR no tiene sesión activa

El cliente ve: **"Mesa no disponible. Solicita al camarero que abra tu mesa."** con un botón para reintentar.

### Cuando hay sesión activa

1. El menú se carga con categorías y productos
2. Añadir productos con botón "+"
3. Seleccionar extras si los tiene
4. Ver carrito (botón flotante inferior)
5. Añadir notas para la cocina
6. Pulsar **"Pedir"**
7. Confirmación: "Tu pedido ha sido enviado"
8. Puede seguir pidiendo mientras la sesión esté activa

### Cuando el camarero cierra la mesa

El cliente ve en tiempo real: **"Tu sesión ha finalizado. Gracias por tu visita."** y ya no puede pedir más.

---

## 8. App TPV (Windows) - El corazón del sistema

### Conexión

1. Abrir la app TPV
2. Introducir la **URL del servidor** (ej: `http://localhost:3001` o `https://api.tudominio.com`)
3. Email y contraseña del restaurante
4. Pulsar **"Entrar"**

La URL del servidor vincula el TPV con la web. **Ambos deben apuntar al mismo servidor.**

### Vista principal: Plano de mesas

Las mesas se muestran con **3 colores**:

| Color | Significado |
|-------|-------------|
| **Verde** | Mesa libre, sin sesión |
| **Amarillo** | Sesión activa, sin pedidos pendientes |
| **Rojo** | Sesión activa CON pedidos pendientes |

Cada mesa con sesión muestra la hora de apertura.

### Abrir mesa (iniciar sesión)

1. Click en una mesa **verde** (libre)
2. En el panel lateral, pulsar **"Abrir mesa"**
3. La mesa cambia a amarillo → Los clientes ya pueden pedir escaneando el QR

### Recibir pedidos

Cuando un cliente pide:
1. Suena una **notificación sonora**
2. Aparece un **aviso visual** "Nuevo pedido - Mesa X"
3. La mesa cambia de amarillo a **rojo**
4. La **comanda se imprime automáticamente**

### Gestionar pedidos en el panel lateral

Click en una mesa para ver:
- Hora de apertura de la sesión y tiempo transcurrido
- Lista de todos los pedidos de la sesión
- Detalle: productos, cantidades, extras, notas
- **Aceptar** / **Cancelar** pedidos pendientes
- **Marcar servido** pedidos aceptados
- **Reimprimir** comandas

### Cerrar mesa (finalizar sesión)

1. Click en la mesa ocupada
2. Pulsar **"Cerrar mesa"**
3. Se calcula el **total** de todos los pedidos no cancelados
4. La sesión se cierra → el cliente ve "Tu sesión ha finalizado"
5. La mesa vuelve a **verde** (libre)

### Impresión de comandas

Formato de la comanda:
```
================================
NUEVO PEDIDO - Mesa 5
Fecha: 22/03/2026 14:35
================================
2x Hamburguesa clásica     24.00
   + Extra queso             3.00
1x Coca-Cola                 2.50
1x Patatas fritas            3.00
--------------------------------
Notas: Sin cebolla por favor
================================
```

### Configuración

| Opción | Descripción |
|--------|-------------|
| Impresora | Seleccionar del sistema |
| Ancho de papel | 80mm (estándar) o 58mm |
| Impresión automática | Sí/No |
| Sonido | Sí/No |

### Historial

Ver sesiones/cuentas cerradas filtradas por fecha, con total del día.

---

## 9. Flujo completo de trabajo diario

### Preparación (una sola vez)

1. Registrar restaurante → Crear menú → Crear mesas → Imprimir QR → Instalar TPV

### Operación diaria

```
Camarero abre mesa en TPV
         ↓
Mesa cambia a amarillo
         ↓
Cliente escanea QR → Ve menú → Pide
         ↓
TPV recibe pedido (sonido + comanda impresa)
Mesa cambia a rojo
         ↓
Cocina prepara → Camarero marca "Servido"
Mesa vuelve a amarillo
         ↓
Cliente puede seguir pidiendo
         ↓
Al terminar: Camarero cierra mesa en TPV
         ↓
Se calcula total → Sesión finalizada
Cliente ve "Sesión finalizada"
Mesa vuelve a verde
```

---

## 10. Preguntas frecuentes

**¿Qué pasa si un cliente anterior tiene el QR abierto en su móvil?**
No puede pedir. Al cerrar la mesa, la sesión muere y cualquier intento de pedir con el token antiguo es rechazado con error 403.

**¿Se puede abrir/cerrar mesas desde la web admin?**
No. Las sesiones solo se gestionan desde el TPV (Electron). La web admin puede ver las sesiones pero no crearlas ni cerrarlas.

**¿El QR cambia cada vez?**
No. El QR es fijo por mesa. El control de acceso lo hace el sistema de sesiones, no el QR.

**¿Pueden varios clientes pedir desde la misma mesa?**
Sí. Mientras la sesión esté activa, cualquier dispositivo que tenga el sessionToken puede pedir. Todos los que escaneen el QR de la mesa durante la sesión activa comparten el mismo token.

**¿Qué pasa si se cae la conexión del TPV?**
Los clientes pueden seguir pidiendo (el servidor procesa los pedidos). Al reconectar, el TPV verá todos los pedidos pendientes.
