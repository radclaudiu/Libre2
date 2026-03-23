# Manual de Usuario - QR Restaurant System

## Tabla de contenidos

1. [Registro y primer acceso](#1-registro-y-primer-acceso)
2. [Panel de administración web](#2-panel-de-administración-web)
3. [Gestión del menú](#3-gestión-del-menú)
4. [Gestión de mesas y QR](#4-gestión-de-mesas-y-qr)
5. [Gestión de pedidos](#5-gestión-de-pedidos)
6. [Historial y facturación](#6-historial-y-facturación)
7. [Experiencia del cliente](#7-experiencia-del-cliente)
8. [App TPV (Windows)](#8-app-tpv-windows)
9. [Flujo completo de trabajo](#9-flujo-completo-de-trabajo)

---

## 1. Registro y primer acceso

### Crear cuenta del restaurante

1. Abrir la web y pulsar **"Acceder al Panel"**
2. En la pantalla de login, pulsar **"Crear cuenta"**
3. Rellenar:
   - **Nombre**: Tu nombre
   - **Nombre del restaurante**: El nombre de tu negocio
   - **Email**: Tu email (será tu usuario)
   - **Contraseña**: Mínimo 8 caracteres, con mayúscula, minúscula y número
4. Pulsar **"Crear cuenta"**

Se creará tu restaurante y accederás directamente al panel de administración.

### Iniciar sesión

1. Introducir email y contraseña
2. Pulsar **"Entrar"**

---

## 2. Panel de administración web

### Dashboard

El dashboard muestra un resumen del día:

- **Pedidos hoy**: Número total de pedidos recibidos
- **Pedidos pendientes**: Pedidos que aún no han sido aceptados
- **Mesas ocupadas**: Cuántas mesas están en uso (ej: 3/6)
- **Facturación hoy**: Total facturado de cuentas cerradas

### Navegación

El menú lateral tiene 5 secciones:
- **Dashboard**: Resumen general
- **Menú**: Gestión de categorías y productos
- **Mesas**: Plano del restaurante y códigos QR
- **Pedidos**: Pedidos en tiempo real
- **Historial**: Cuentas cerradas

---

## 3. Gestión del menú

### Categorías

Las categorías organizan tu menú (ej: Entrantes, Principales, Postres, Bebidas).

**Crear categoría:**
1. Ir a **Menú**
2. Pulsar **"Añadir"** junto a "Categorías"
3. Introducir nombre y orden (número que determina la posición)
4. Pulsar **"Guardar"**

**Editar categoría:** Pulsar el icono de lápiz junto al nombre.

**Eliminar categoría:** Pulsar el icono de papelera. Se eliminarán también todos los productos de esa categoría.

### Productos

**Crear producto:**
1. Seleccionar la categoría deseada
2. Pulsar **"Añadir producto"**
3. Rellenar:
   - **Nombre**: Nombre del plato/bebida
   - **Descripción**: Descripción breve (visible para el cliente)
   - **Precio**: Precio en euros
   - **Categoría**: A qué categoría pertenece
   - **Activo**: Si está disponible para pedir
4. Pulsar **"Guardar"**

**Añadir extras/modificadores:**

Los extras son opciones adicionales que el cliente puede seleccionar (ej: "Extra queso +1.50€").

1. Al crear o editar un producto, pulsar **"+ Añadir extra"**
2. Introducir nombre del extra y precio adicional
3. Se pueden añadir múltiples extras

**Subir imagen del producto:**
1. En la lista de productos, pulsar el icono de imagen junto al producto
2. Seleccionar una imagen (JPEG, PNG o WebP, máximo 5MB)
3. La imagen se muestra en el menú del cliente

**Desactivar producto:** Editar el producto y desmarcar "Activo". El producto no aparecerá en el menú público pero se conserva en el sistema.

---

## 4. Gestión de mesas y QR

### Plano del restaurante

La sección **Mesas** muestra un plano visual del restaurante donde las mesas aparecen como rectángulos:

- **Verde**: Mesa libre
- **Rojo**: Mesa ocupada

**Reorganizar mesas:** Arrastrar y soltar las mesas en el plano. La nueva posición se guarda automáticamente.

### Crear mesa

1. Pulsar **"Nueva mesa"**
2. Introducir nombre (ej: "Mesa 7", "Terraza 1")
3. Pulsar **"Crear mesa"**
4. La mesa aparece en el plano y se puede mover a la posición deseada

### Generar código QR

Cada mesa necesita un código QR que los clientes escanearán:

1. En el plano de mesas, pulsar el icono QR de la mesa deseada
2. Aparece el código QR generado
3. Pulsar **"Descargar PNG"** para obtener la imagen
4. Imprimir el QR y colocarlo en la mesa física

El QR contiene la URL: `https://tudominio.com/m/tu-restaurante/ID_MESA`

### Eliminar mesa

Pulsar el icono de papelera en la mesa del plano.

---

## 5. Gestión de pedidos

### Vista de pedidos

La sección **Pedidos** muestra todos los pedidos en tiempo real.

Cada pedido muestra:
- **Mesa**: De qué mesa viene
- **Estado**: Pendiente, Aceptado, Servido o Cancelado
- **Productos**: Lista detallada con cantidades, extras y precios
- **Notas**: Comentarios del cliente (ej: "Sin cebolla")
- **Hora**: Cuándo se realizó el pedido
- **Total**: Precio total del pedido

### Filtrar pedidos

Usar el selector de la esquina superior derecha para filtrar por estado:
- **Todos**: Muestra todos los pedidos
- **Pendientes**: Solo los que esperan respuesta
- **Aceptados**: Los que están en preparación
- **Servidos**: Los ya entregados
- **Cancelados**: Los cancelados

### Gestionar estados

**Cuando llega un pedido nuevo (estado: Pendiente):**
- Pulsar **"Aceptar"** → El pedido pasa a "Aceptado" (en preparación)
- Pulsar **"Cancelar"** → El pedido se cancela

**Cuando el pedido está listo (estado: Aceptado):**
- Pulsar **"Marcar servido"** → El pedido pasa a "Servido"

### Notificaciones en tiempo real

Los pedidos nuevos aparecen automáticamente sin necesidad de recargar la página.

---

## 6. Historial y facturación

### Cuentas cerradas

La sección **Historial** muestra todas las cuentas cerradas.

Cada cuenta muestra:
- **Mesa**: De qué mesa era
- **Fecha de cierre**: Cuándo se cerró
- **Total**: Importe total

### Ver detalle

Pulsar en una cuenta para expandir y ver:
- Todos los pedidos incluidos
- Detalle de cada producto con extras
- Notas del cliente
- Si algún pedido fue cancelado

---

## 7. Experiencia del cliente

### Flujo del cliente (sin necesidad de app ni registro)

1. **Escanear QR**: El cliente escanea el código QR de su mesa con la cámara del móvil
2. **Ver menú**: Se abre el menú del restaurante en el navegador del móvil
3. **Navegar categorías**: Seleccionar entre las categorías (pestañas superiores)
4. **Añadir productos**: Pulsar el botón "+" en cada producto
5. **Seleccionar extras**: Si el producto tiene extras, aparece un popup para seleccionarlos
6. **Ver carrito**: Pulsar el botón flotante inferior que muestra la cantidad y el total
7. **Revisar pedido**: En el carrito se pueden:
   - Cambiar cantidades con los botones +/-
   - Eliminar productos
   - Añadir notas para la cocina
8. **Enviar pedido**: Pulsar **"Pedir"**
9. **Confirmación**: Aparece el mensaje "Tu pedido ha sido enviado"
10. **Seguir pidiendo**: El cliente puede añadir más productos y hacer nuevos pedidos

### Lo que ve el cliente

- Nombre del restaurante
- Menú organizado por categorías
- Cada producto con: nombre, descripción, precio e imagen (si tiene)
- Indicador de extras disponibles
- Carrito con resumen y total
- Campo de notas para la cocina

---

## 8. App TPV (Windows)

### Primer acceso

1. Abrir la aplicación TPV
2. Introducir:
   - **Servidor**: URL del servidor API (ej: `http://localhost:3001` o `https://api.tudominio.com`)
   - **Email**: El email de tu cuenta
   - **Contraseña**: Tu contraseña
3. Pulsar **"Entrar"**

### Vista principal: Plano de mesas

La pantalla principal muestra el plano del restaurante:

- **Mesas verdes**: Libres
- **Mesas rojas**: Ocupadas
- **Borde azul**: Mesa seleccionada

**Mover mesas:** Arrastrar con el ratón para reorganizar.

**Seleccionar mesa:** Hacer clic en una mesa para ver sus pedidos.

### Panel de mesa (lateral derecho)

Al seleccionar una mesa se abre el panel con:

- **Estado de la mesa** (libre/ocupada)
- **Lista de pedidos** ordenados cronológicamente
- **Detalle de cada pedido**: productos, cantidades, extras, notas
- **Estado de cada pedido** con código de color
- **Total acumulado** de todos los pedidos de la mesa

**Acciones disponibles:**
- **Aceptar**: Aceptar un pedido pendiente
- **Cancelar**: Cancelar un pedido pendiente
- **Marcar servido**: Marcar un pedido aceptado como servido
- **Reimprimir**: Reimprimir la comanda de un pedido
- **Cerrar mesa**: Cierra la cuenta, calcula el total y libera la mesa

### Recepción de pedidos

Cuando un cliente envía un pedido:

1. **Sonido**: Suena una notificación (si está activado)
2. **Popup**: Aparece un aviso "Nuevo pedido - Mesa X"
3. **Mesa se actualiza**: Cambia de verde a rojo en el plano
4. **Impresión automática**: La comanda se imprime automáticamente (si está configurado)

### Formato de la comanda impresa

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

### Configuración del TPV

Acceder desde el icono de engranaje en la barra superior:

| Opción | Descripción |
|--------|-------------|
| **Impresora** | Seleccionar la impresora del sistema |
| **Ancho de papel** | 80mm (estándar) o 58mm (pequeño) |
| **Impresión automática** | Imprimir al recibir pedido nuevo |
| **Sonido** | Activar/desactivar sonido de notificación |
| **Probar impresión** | Envía una prueba a la impresora |

### Historial del TPV

Acceder desde el icono de reloj en la barra superior:

- Ver cuentas cerradas filtradas por fecha
- Total del día/periodo seleccionado
- Expandir cada cuenta para ver el detalle

---

## 9. Flujo completo de trabajo

### Preparación (una sola vez)

1. Registrar el restaurante en la web
2. Crear las categorías del menú
3. Añadir todos los productos con precios, descripciones y extras
4. Crear las mesas del restaurante
5. Generar e imprimir los códigos QR de cada mesa
6. Colocar los QR impresos en las mesas físicas
7. Instalar la app TPV en el PC del restaurante
8. Configurar la impresora en el TPV

### Operación diaria

1. **Abrir el TPV** en el PC del restaurante e iniciar sesión
2. **El cliente escanea** el QR de su mesa
3. **El cliente pide** desde su móvil
4. **El TPV recibe** el pedido con notificación sonora
5. **La comanda se imprime** automáticamente
6. **Cocina prepara** el pedido
7. **El camarero marca** el pedido como "Servido" en el TPV
8. **El cliente puede seguir pidiendo** más productos
9. **Al terminar**, el camarero pulsa **"Cerrar mesa"** en el TPV
10. **La mesa vuelve a verde** (libre) y la cuenta queda en el historial

### Consejos de uso

- Los clientes pueden hacer múltiples pedidos sin reescanear el QR
- Las notas del cliente aparecen destacadas en cada pedido
- Si un producto se agota, desactivarlo en el panel de menú para que no aparezca
- Usar el dashboard para ver el resumen del día
- Revisar el historial para llevar control de facturación
- Los pedidos cancelados no se suman al total de la cuenta
