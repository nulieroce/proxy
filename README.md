# 🚀 ProxyRender Liberia

**Proxy reverso completo para Render.com** que oculta la IP y dominio de tu aplicación original mientras captura información del cliente de forma transparente.

## 🎯 Características Principales

- ✅ **Ocultación completa** de la IP y dominio del backend
- 🌐 **Captura de IP real** del usuario (`user_ip` header)
- 🏠 **Captura de dominio de acceso** (`domain_ip` header)
- 🔄 **Proxy transparente** para todas las peticiones (GET, POST, PUT, DELETE, etc.)
- 🛡️ **Rate limiting** configurable
- 💚 **Anti-sleep** para plan gratuito de Render
- 🔒 **Headers de seguridad** básicos
- ⚡ **Compresión gzip** automática
- 📊 **Health checks** y monitoreo
- 🔍 **Logging detallado** para debugging

## 📋 Tabla de Contenidos

- [Instalación Local](#-instalación-local)
- [Configuración](#-configuración)
- [Deployment en Render](#-deployment-en-render)
- [Variables de Entorno](#-variables-de-entorno)
- [Endpoints Disponibles](#-endpoints-disponibles)
- [Testing](#-testing)
- [Monitoreo](#-monitoreo)
- [Troubleshooting](#-troubleshooting)
- [Contribución](#-contribución)

## 🚀 Instalación Local

### Prerrequisitos

- Node.js >= 18.0.0
- npm o yarn
- Git

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/proxyrender-liberia.git
   cd proxyrender-liberia
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Crear archivo .env (opcional para desarrollo)
   cp .env.example .env  # Si tienes archivo de ejemplo
   
   # O exportar directamente
   export TARGET_URL=https://tu-app-backend.com
   export NODE_ENV=development
   ```

4. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

5. **Ejecutar en modo producción**
   ```bash
   npm start
   ```

6. **Verificar funcionamiento**
   ```bash
   # Health check
   curl http://localhost:10000/health
   
   # Status del proxy
   curl http://localhost:10000/proxy-status
   ```

## ⚙️ Configuración

### Variables de Entorno Requeridas

```bash
# URL del backend que se va a proxificar
TARGET_URL=https://tu-aplicacion-original.com

# Puerto del servicio (Render lo asigna automáticamente)
PORT=10000

# Entorno de ejecución
NODE_ENV=production
```

### Variables Opcionales

```bash
# Rate Limiting - Ventana de tiempo (15 min = 900000ms)
RATE_LIMIT_WINDOW_MS=900000

# Rate Limiting - Máximo peticiones por ventana
RATE_LIMIT_MAX_REQUESTS=100

# Keep-alive URL (para evitar sleep en plan gratuito)
KEEP_ALIVE_URL=https://tu-proxy.onrender.com
```

### Archivo .env de Ejemplo

```bash
# Configuración principal
TARGET_URL=https://mi-app-original.com
NODE_ENV=development
PORT=10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Keep-alive (se configurará automáticamente en Render)
KEEP_ALIVE_URL=https://tu-proxy.onrender.com
```

## 🌟 Deployment en Render

### Método 1: Usando render.yaml (Recomendado)

1. **Conectar repositorio a Render**
   - Ve a [Render Dashboard](https://dashboard.render.com)
   - Click en "New" → "Blueprint"
   - Conecta tu repositorio GitHub

2. **Configurar variables de entorno**
   ```bash
   TARGET_URL=https://tu-aplicacion-original.com
   # Las demás se configuran automáticamente
   ```

3. **Desplegar**
   - Render detectará automáticamente el `render.yaml`
   - Se creará el servicio con toda la configuración

### Método 2: Manual

1. **Crear Web Service**
   - Dashboard → New → Web Service
   - Conectar repositorio

2. **Configuración del servicio**
   ```
   Name: proxyrender-liberia
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Variables de entorno**
   ```
   TARGET_URL=https://tu-aplicacion-original.com
   NODE_ENV=production
   ```

4. **Configuración adicional**
   ```
   Health Check Path: /health
   Auto-Deploy: Yes
   ```

### Configuración Post-Deployment

Una vez desplegado, configura la URL de keep-alive:

1. Copia la URL de tu servicio (ej: `https://tu-proxy.onrender.com`)
2. Agrega la variable de entorno:
   ```bash
   KEEP_ALIVE_URL=https://tu-proxy.onrender.com
   ```

## 🔧 Variables de Entorno

| Variable | Tipo | Default | Descripción |
|----------|------|---------|-------------|
| `TARGET_URL` | **Requerida** | - | URL del backend a proxificar |
| `PORT` | Automática | 10000 | Puerto del servicio |
| `NODE_ENV` | Opcional | development | Entorno de ejecución |
| `RATE_LIMIT_WINDOW_MS` | Opcional | 900000 | Ventana de rate limiting (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | Opcional | 100 | Max peticiones por ventana |
| `KEEP_ALIVE_URL` | Opcional | - | URL para evitar sleep (plan gratuito) |

## 🛠 Endpoints Disponibles

### Endpoints de Control

| Endpoint | Método | Descripción | Respuesta |
|----------|--------|-------------|-----------|
| `/health` | GET | Health check del servicio | Status, uptime, memoria |
| `/keep-alive` | GET | Ping para evitar sleep | Status de actividad |
| `/proxy-status` | GET | Información del proxy | Config y cliente info |

### Proxy Transparente

- **Todas las demás rutas** se reenvían automáticamente al `TARGET_URL`
- Se preservan métodos HTTP, headers, body, y query parameters
- Se agregan headers personalizados: `user_ip` y `domain_ip`

### Ejemplos de Uso

```bash
# Health check
curl https://tu-proxy.onrender.com/health

# Status del proxy
curl https://tu-proxy.onrender.com/proxy-status

# Petición que será enviada al backend
curl https://tu-proxy.onrender.com/api/usuarios
# → Se reenvía a: https://tu-backend.com/api/usuarios
# → Con headers: user_ip=x.x.x.x, domain_ip=tu-proxy.onrender.com
```

## 🧪 Testing

### Health Check Manual

```bash
node health.js
```

### Health Check con URL personalizada

```bash
node health.js --url https://tu-proxy.onrender.com
```

### Health Check con opciones

```bash
node health.js --url https://tu-proxy.onrender.com --timeout 5000 --retries 5
```

### Testing con cURL

```bash
# Test básico
curl -v https://tu-proxy.onrender.com/health

# Test con headers personalizados
curl -H \"User-Agent: Test-Client\" https://tu-proxy.onrender.com/proxy-status

# Test de rate limiting (hacer varias peticiones rápidas)
for i in {1..10}; do curl https://tu-proxy.onrender.com/health; done
```

### NPM Scripts

```bash
# Ejecutar health check
npm test

# Modo desarrollo con nodemon
npm run dev

# Producción
npm start
```

## 📊 Monitoreo

### Logs Estructurados

El servicio genera logs detallados:

```
[2024-01-15T10:30:45.123Z] GET /api/users 200 - 45ms - IP: 192.168.1.1
[PROXY] GET /api/users -> https://backend.com/api/users
[PROXY] Added headers: user_ip=192.168.1.1, domain_ip=proxy.onrender.com
```

### Métricas Disponibles

- **Uptime**: Tiempo de actividad del servicio
- **Memory Usage**: Uso de memoria en tiempo real
- **Request Rate**: Peticiones por minuto
- **Response Time**: Tiempo de respuesta promedio
- **Error Rate**: Porcentaje de errores

### Health Check Automático

El servicio incluye un health check interno que verifica:

- ✅ Conectividad con el backend
- ✅ Estado de memoria
- ✅ Tiempo de respuesta
- ✅ Rate limiting funcional
- ✅ Headers de seguridad

## 🔍 Headers Agregados

### Headers que se envían al backend

```http
user_ip: 192.168.1.100          # IP real del cliente
domain_ip: tu-proxy.onrender.com # Dominio usado para acceder
X-Proxy-By: ProxyRender-Liberia # Identificador del proxy
User-Agent: Mozilla/5.0...      # User agent original preservado
```

### Headers que se remueven

```http
host                    # Se reemplaza por el target
server                  # Se oculta información del servidor
x-aspnet-version       # Se oculta información de framework
x-aspnetmvc-version    # Se oculta información de framework
```

### Headers que se agregan en la respuesta

```http
X-Powered-By: ProxyRender-Liberia
X-Proxy-Version: 1.0.0
```

## 🛡️ Características de Seguridad

### Rate Limiting

- **Ventana**: 15 minutos (configurable)
- **Límite**: 100 peticiones por IP (configurable)
- **Respuesta**: HTTP 429 con mensaje explicativo

### Headers de Seguridad

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### Sanitización

- Headers sensibles removidos
- Información del servidor oculta
- Timeouts configurables
- Validación de input básica

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error: ECONNREFUSED

```bash
Error: connect ECONNREFUSED
```

**Solución**: Verificar que `TARGET_URL` sea correcta y esté accesible.

```bash
# Verificar conectividad
curl -I https://tu-backend.com
```

#### 2. Rate Limiting Demasiado Agresivo

```bash
HTTP 429 - Too Many Requests
```

**Solución**: Ajustar variables de rate limiting.

```bash
RATE_LIMIT_WINDOW_MS=1800000  # 30 minutos
RATE_LIMIT_MAX_REQUESTS=200   # 200 peticiones
```

#### 3. Sleep en Plan Gratuito

El servicio se duerme después de 30 minutos de inactividad.

**Solución**: Configurar keep-alive.

```bash
KEEP_ALIVE_URL=https://tu-proxy.onrender.com
```

#### 4. Headers No Se Pasan

Los headers `user_ip` y `domain_ip` no llegan al backend.

**Solución**: Verificar que tu backend los esté leyendo correctamente.

```javascript
// En tu backend (Express)
app.use((req, res, next) => {
  console.log('User IP:', req.get('user_ip'));
  console.log('Domain:', req.get('domain_ip'));
  next();
});
```

### Debug Mode

Para debugging detallado:

```bash
NODE_ENV=development npm start
```

Esto habilitará:
- Logs detallados de cada petición
- Información de headers
- Tiempos de respuesta
- Stack traces completos

### Verificación de Salud

```bash
# Verificar que el servicio está corriendo
curl https://tu-proxy.onrender.com/health

# Verificar configuración del proxy
curl https://tu-proxy.onrender.com/proxy-status

# Verificar conectividad con backend
curl -I https://tu-backend.com
```

## 📈 Optimización para Plan Gratuito

### Anti-Sleep

El sistema incluye un mecanismo automático que previene que Render duerma tu servicio:

```javascript
// Ping cada 10 minutos
cron.schedule('*/10 * * * *', () => {
  axios.get(KEEP_ALIVE_URL + '/keep-alive');
});
```

### Optimización de Recursos

- **Compresión gzip** para reducir bandwidth
- **Keep-alive connections** para reusar conexiones
- **Memory monitoring** para prevenir leaks
- **Request pooling** para optimizar peticiones

### Configuración Recomendada para Free Tier

```bash
TARGET_URL=https://tu-backend.com
RATE_LIMIT_WINDOW_MS=900000      # 15 minutos
RATE_LIMIT_MAX_REQUESTS=50       # Conservador para free tier
KEEP_ALIVE_URL=https://tu-proxy.onrender.com  # ¡IMPORTANTE!
NODE_ENV=production
```

## 🔧 Configuración Avanzada

### Custom Headers

Para agregar headers personalizados:

```javascript
// En server.js, modificar onProxyReq
onProxyReq: (proxyReq, req, res) => {
  // Headers existentes
  proxyReq.setHeader('user_ip', getRealIP(req));
  proxyReq.setHeader('domain_ip', getAccessDomain(req));
  
  // Headers personalizados
  proxyReq.setHeader('X-Custom-Header', 'valor');
  proxyReq.setHeader('X-Request-ID', generateRequestId());
}
```

### Rate Limiting Personalizado

```javascript
// Rate limiting por ruta
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por IP
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // límite más estricto
});

app.use('/api/', apiLimiter);
app.use('/admin/', strictLimiter);
```

### Middleware Personalizado

```javascript
// Agregar middleware personalizado antes del proxy
app.use((req, res, next) => {
  // Lógica personalizada
  req.customData = 'valor';
  next();
});
```

## 📋 Ejemplo de Implementación Completa

### Backend (Express.js)

```javascript
// En tu aplicación backend
app.use((req, res, next) => {
  // Leer los headers del proxy
  const clientIP = req.get('user_ip');
  const accessDomain = req.get('domain_ip');
  
  console.log(`Cliente real: ${clientIP} desde dominio: ${accessDomain}`);
  
  // Usar en tu lógica de negocio
  req.realClientIP = clientIP;
  req.accessDomain = accessDomain;
  
  next();
});
```

### Frontend (cualquier tecnología)

```javascript
// El frontend no necesita cambios
// Todas las peticiones van normalmente al proxy

fetch('https://tu-proxy.onrender.com/api/users')
  .then(response => response.json())
  .then(data => console.log(data));

// La petición será automáticamente enviada a:
// https://tu-backend.com/api/users
// Con headers: user_ip=x.x.x.x, domain_ip=tu-proxy.onrender.com
```

## 🏗️ Arquitectura

```
[Cliente] → [Render Proxy] → [Tu Backend]
    ↓           ↓                ↓
  IP Real   Captura IP      Recibe Headers:
            Captura Domain   - user_ip
            Agrega Headers   - domain_ip
            Rate Limiting    - X-Proxy-By
            Seguridad
```

### Flujo de Datos

1. **Cliente** hace petición a `https://tu-proxy.onrender.com/api/data`
2. **Proxy** captura IP real y dominio de acceso
3. **Proxy** agrega headers `user_ip` y `domain_ip`
4. **Proxy** reenvía petición a `https://tu-backend.com/api/data`
5. **Backend** procesa con información real del cliente
6. **Backend** responde a proxy
7. **Proxy** reenvía respuesta al cliente

## 🤝 Contribución

### Reportar Issues

Si encuentras algún problema:

1. Describe el problema claramente
2. Incluye logs relevantes
3. Especifica tu configuración
4. Proporciona pasos para reproducir

### Pull Requests

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Desarrollo Local

```bash
# Clonar tu fork
git clone https://github.com/tu-usuario/proxyrender-liberia.git

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test
```

## 📝 Notas Importantes

### ⚠️ Consideraciones de Seguridad

- **Nunca expongas** información sensible en los logs
- **Valida siempre** las URLs del `TARGET_URL`
- **Usa HTTPS** tanto en el proxy como en el backend
- **Revisa regularmente** los headers que se pasan

### 💡 Best Practices

- **Monitorea** regularmente el uso de recursos
- **Implementa** logging estructurado
- **Usa** environment variables para toda configuración
- **Mantén** el proxy lo más simple posible
- **Documenta** cualquier customización

### 🔄 Actualizaciones

Para mantener el proxy actualizado:

```bash
# Verificar actualizaciones de dependencias
npm audit

# Actualizar dependencias
npm update

# Verificar funcionamiento
npm test
```

## 📞 Soporte

Si necesitas ayuda:

- 📧 Email: tu-email@ejemplo.com
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/proxyrender-liberia/issues)
- 📖 Docs: [Wiki del Proyecto](https://github.com/tu-usuario/proxyrender-liberia/wiki)

---

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">

**⭐ Si este proyecto te fue útil, dale una estrella en GitHub ⭐**

Hecho con ❤️ para la comunidad de desarrolladores

</div>