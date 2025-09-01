# 📋 Guía Paso a Paso - ProxyRender Liberia

Esta guía te llevará desde cero hasta tener tu proxy reverso funcionando en Render.com en menos de 10 minutos.

## 🎯 Antes de Comenzar

### ✅ Requisitos Previos

- [ ] Cuenta en [GitHub](https://github.com)
- [ ] Cuenta en [Render.com](https://render.com) (plan gratuito es suficiente)
- [ ] URL de tu aplicación backend (ej: `https://mi-app.herokuapp.com`)
- [ ] Git instalado en tu computadora (opcional, para desarrollo local)

### 📝 Información que Necesitas

Antes de empezar, ten lista esta información:

1. **URL de tu backend**: `https://tu-aplicacion-original.com`
2. **Nombre para tu proxy**: `mi-proxy-liberia` (o el que prefieras)
3. **Región de Render**: `oregon`, `frankfurt`, o `singapore`

---

## 🚀 PASO 1: Preparar el Repositorio

### Opción A: Fork del Repositorio (Recomendado)

1. **Ve al repositorio original**:
   ```
   https://github.com/tu-usuario/proxyrender-liberia
   ```

2. **Hacer Fork**:
   - Click en el botón "Fork" (esquina superior derecha)
   - Selecciona tu cuenta personal
   - Espera que se complete el fork

3. **Clonar tu fork** (opcional, para desarrollo local):
   ```bash
   git clone https://github.com/TU-USUARIO/proxyrender-liberia.git
   cd proxyrender-liberia
   ```

### Opción B: Crear Repositorio Nuevo

1. **Crear nuevo repositorio en GitHub**:
   - Ve a GitHub.com
   - Click "New repository"
   - Nombre: `mi-proxy-liberia`
   - Público o privado (tu elección)
   - ✅ "Add a README file"

2. **Subir archivos**:
   - Descarga todos los archivos del proyecto
   - Súbelos a tu nuevo repositorio usando la interfaz web de GitHub
   - O clona y sube via Git:
   ```bash
   git clone https://github.com/TU-USUARIO/mi-proxy-liberia.git
   # Copia todos los archivos del proyecto aquí
   git add .
   git commit -m "Initial proxy setup"
   git push origin main
   ```

---

## ⚙️ PASO 2: Configurar el Backend Target

### 📝 Editar render.yaml

1. **Abrir el archivo `render.yaml`** en tu repositorio
2. **Localizar la línea del TARGET_URL** (línea ~15):
   ```yaml
   - key: TARGET_URL
     value: https://mi-app-original.com # ⚠️ CAMBIAR POR TU URL REAL
   ```

3. **Reemplazar con tu URL real**:
   ```yaml
   - key: TARGET_URL
     value: https://tu-aplicacion-real.herokuapp.com
   ```

4. **Opcional: Cambiar región** (línea ~8):
   ```yaml
   region: oregon # oregon, frankfurt, singapore
   ```

5. **Guardar y hacer commit**:
   ```bash
   git add render.yaml
   git commit -m "Configure TARGET_URL for backend"
   git push origin main
   ```

### 🔍 Verificar que tu Backend esté Accesible

Antes de continuar, verifica que tu backend funcione:

```bash
# Reemplaza con tu URL real
curl -I https://tu-aplicacion-real.herokuapp.com

# Debe devolver algo como:
# HTTP/2 200
# content-type: text/html
```

---

## 🌐 PASO 3: Desplegar en Render

### 🎛️ Crear Servicio en Render

1. **Ir a Render Dashboard**:
   - Ve a [https://dashboard.render.com](https://dashboard.render.com)
   - Inicia sesión con tu cuenta

2. **Crear nuevo Blueprint**:
   - Click en "New +" (esquina superior derecha)
   - Selecciona "Blueprint"
   - **NO** selecciones "Web Service"

3. **Conectar Repositorio**:
   - Selecciona "Connect a repository"
   - Elige "GitHub" y autoriza si es necesario
   - Busca tu repositorio: `proxyrender-liberia` o `mi-proxy-liberia`
   - Click "Connect"

4. **Configurar Blueprint**:
   - **Blueprint Name**: `proxyrender-liberia`
   - **Branch**: `main` (o `master`)
   - Render detectará automáticamente el `render.yaml`
   - Click "Apply"

### ⏳ Proceso de Deploy

1. **Render iniciará el build**:
   - Verás logs en tiempo real
   - El proceso toma ~3-5 minutos
   - Verás: "Installing dependencies", "Starting server", etc.

2. **Obtener URL del servicio**:
   - Una vez completado, verás algo como:
   ```
   ✅ proxyrender-liberia is live at https://proxyrender-liberia-abc123.onrender.com
   ```
   - **¡GUARDA ESTA URL!** La necesitarás en el siguiente paso

3. **Verificar que esté funcionando**:
   ```bash
   # Reemplaza con tu URL real de Render
   curl https://proxyrender-liberia-abc123.onrender.com/health
   
   # Debe devolver:
   {
     "status": "ok",
     "timestamp": "2024-01-15T10:30:45.123Z",
     "uptime": 123,
     "target": "https://tu-backend.com",
     "version": "1.0.0"
   }
   ```

---

## 🔧 PASO 4: Configurar Keep-Alive (Evitar Sleep)

### 📝 Agregar Variable KEEP_ALIVE_URL

1. **Ir a configuración del servicio**:
   - En Render Dashboard, click en tu servicio
   - Ve a la pestaña "Environment"

2. **Agregar nueva variable**:
   - Click "Add Environment Variable"
   - **Key**: `KEEP_ALIVE_URL`
   - **Value**: Tu URL de Render (ej: `https://proxyrender-liberia-abc123.onrender.com`)
   - Click "Save Changes"

3. **Redeploy automático**:
   - Render redesplegará automáticamente
   - Espera ~2-3 minutos

### ✅ Verificar Keep-Alive

```bash
# Test del endpoint keep-alive
curl https://tu-proxy.onrender.com/keep-alive

# Debe devolver:
{
  "status": "awake",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "message": "Servicio activo"
}
```

---

## 🧪 PASO 5: Probar el Proxy

### 🔍 Tests Básicos

1. **Health Check**:
   ```bash
   curl https://tu-proxy.onrender.com/health
   ```

2. **Status del Proxy**:
   ```bash
   curl https://tu-proxy.onrender.com/proxy-status
   ```

3. **Test de Proxy Transparente**:
   ```bash
   # Si tu backend tiene una ruta /api/users
   curl https://tu-proxy.onrender.com/api/users
   
   # Debe devolver la misma respuesta que:
   curl https://tu-backend.com/api/users
   ```

### 🔬 Test Avanzado con Headers

```bash
# Test para verificar que los headers se están agregando
curl -v https://tu-proxy.onrender.com/proxy-status

# Busca en la respuesta:
# "client_ip": "tu.ip.aqui"
# "access_domain": "tu-proxy.onrender.com"
```

### 🏃‍♂️ Test Automatizado

Si tienes Node.js instalado localmente:

```bash
# Clonar el repo si no lo has hecho
git clone https://github.com/TU-USUARIO/proxyrender-liberia.git
cd proxyrender-liberia

# Instalar dependencias
npm install

# Ejecutar health check completo
node health.js --url https://tu-proxy.onrender.com

# Debe mostrar:
# ✅ Health endpoint: OK
# ✅ Keep-alive endpoint: OK
# ✅ Proxy status endpoint: OK
# 🎉 TODOS LOS TESTS PASARON - Servicio saludable!
```

---

## 🎯 PASO 6: Configurar tu Frontend/Cliente

### 🌐 Cambiar URLs en tu Aplicación

En lugar de apuntar a tu backend directamente, ahora usa tu proxy:

**Antes**:
```javascript
const API_BASE = 'https://tu-backend.herokuapp.com';
```

**Después**:
```javascript
const API_BASE = 'https://tu-proxy.onrender.com';
```

### 📝 Ejemplos por Tecnología

#### React/Vue/Angular
```javascript
// En tu archivo de configuración
const config = {
  apiUrl: 'https://tu-proxy.onrender.com'
};

// Uso normal
fetch(`${config.apiUrl}/api/users`)
  .then(response => response.json())
  .then(data => console.log(data));
```

#### WordPress/PHP
```php
<?php
// En tu wp-config.php o archivo de configuración
define('API_BASE_URL', 'https://tu-proxy.onrender.com');

// Uso
$response = wp_remote_get(API_BASE_URL . '/api/users');
?>
```

#### Python
```python
import requests

API_BASE = 'https://tu-proxy.onrender.com'

response = requests.get(f'{API_BASE}/api/users')
data = response.json()
```

### 🔍 Verificar Headers en tu Backend

En tu aplicación backend, ahora puedes leer:

#### Node.js/Express
```javascript
app.use((req, res, next) => {
  const clientIP = req.get('user_ip');        // IP real del cliente
  const accessDomain = req.get('domain_ip');  // Dominio del proxy
  
  console.log(`Cliente real: ${clientIP}`);
  console.log(`Acceso via: ${accessDomain}`);
  
  next();
});
```

#### PHP
```php
<?php
$clientIP = $_SERVER['HTTP_USER_IP'] ?? 'unknown';
$accessDomain = $_SERVER['HTTP_DOMAIN_IP'] ?? 'unknown';

echo "Cliente real: " . $clientIP;
echo "Acceso via: " . $accessDomain;
?>
```

---

## 📊 PASO 7: Monitoreo y Mantenimiento

### 🔍 Verificaciones Periódicas

**Daily Check (Automatizable)**:
```bash
# Health check rápido
curl -s https://tu-proxy.onrender.com/health | jq '.status'
# Debe devolver: "ok"
```

**Weekly Check**:
```bash
# Health check completo
node health.js --url https://tu-proxy.onrender.com
```

### 📈 Métricas a Monitorear

1. **Uptime**: Debe estar cerca del 99%
2. **Response Time**: Debe ser < 2 segundos
3. **Error Rate**: Debe ser < 5%
4. **Keep-Alive Success**: Debe ser > 95%

### 🚨 Alertas Recomendadas

Configura alertas para:
- Servicio down por > 5 minutos
- Rate de errores > 10%
- Más de 5 fallas consecutivas de keep-alive

---

## 🔧 PASO 8: Customización (Opcional)

### 🎨 Headers Personalizados

Edita `server.js` línea ~140:

```javascript
// Agregar headers personalizados
proxyReq.setHeader('user_ip', clientIP);
proxyReq.setHeader('domain_ip', accessDomain);

// Tus headers personalizados aquí
proxyReq.setHeader('X-My-Custom-Header', 'mi-valor');
proxyReq.setHeader('X-API-Key', process.env.MY_API_KEY);
```

### ⚙️ Rate Limiting Personalizado

Edita las variables en Render:

```bash
RATE_LIMIT_WINDOW_MS=600000    # 10 minutos
RATE_LIMIT_MAX_REQUESTS=50     # 50 peticiones por ventana
```

### 🌍 Múltiples Regiones

Para mejor rendimiento global, puedes desplegar en múltiples regiones:

1. **USA**: `region: oregon`
2. **Europe**: `region: frankfurt`  
3. **Asia**: `region: singapore`

---

## 🆘 PASO 9: Troubleshooting

### ❌ Problemas Comunes

#### 1. "ECONNREFUSED" Error
```bash
Error: connect ECONNREFUSED
```
**Solución**: Verificar que `TARGET_URL` sea correcta y accesible:
```bash
curl -I https://tu-backend.com
```

#### 2. Proxy devuelve 502
```bash
HTTP/1.1 502 Bad Gateway
```
**Soluciones**:
- Verificar que el backend esté funcionando
- Revisar logs en Render Dashboard
- Verificar variable `TARGET_URL`

#### 3. Keep-Alive no funciona
```bash
curl: (28) Operation timed out
```
**Soluciones**:
- Verificar variable `KEEP_ALIVE_URL`
- Debe ser exactamente la URL de tu servicio de Render
- Redeploy después de cambiar variables

#### 4. Rate limiting muy agresivo
```bash
HTTP/1.1 429 Too Many Requests
```
**Solución**: Ajustar variables:
```bash
RATE_LIMIT_WINDOW_MS=1800000  # 30 minutos
RATE_LIMIT_MAX_REQUESTS=200   # 200 peticiones
```

### 🔍 Debug Mode

Para debugging detallado:

1. **Habilitar logs verbose**:
   - En Render Environment Variables
   - `NODE_ENV` = `development`
   - Redeploy

2. **Ver logs en tiempo real**:
   - Render Dashboard → Tu servicio → "Logs"
   - Verás requests detallados

3. **Test local**:
   ```bash
   export TARGET_URL=https://tu-backend.com
   export NODE_ENV=development
   npm run dev
   # Verás logs detallados en consola
   ```

---

## ✅ PASO 10: Checklist Final

### 🎯 Verificación Completa

- [ ] Backend original funciona: `curl -I https://tu-backend.com`
- [ ] Proxy desplegado en Render: `curl https://tu-proxy.onrender.com/health`
- [ ] Keep-alive configurado: `curl https://tu-proxy.onrender.com/keep-alive`
- [ ] Proxy transparente funciona: `curl https://tu-proxy.onrender.com/tu-ruta-api`
- [ ] Headers se agregan correctamente: `curl https://tu-proxy.onrender.com/proxy-status`
- [ ] Frontend actualizado para usar proxy
- [ ] Monitoreo básico configurado

### 📋 Información para Guardar

```bash
# URLs importantes
BACKEND_URL: https://tu-aplicacion-original.com
PROXY_URL: https://tu-proxy.onrender.com
REPO_URL: https://github.com/tu-usuario/proxyrender-liberia

# Endpoints de control
Health Check: https://tu-proxy.onrender.com/health
Keep Alive: https://tu-proxy.onrender.com/keep-alive
Proxy Status: https://tu-proxy.onrender.com/proxy-status

# Configuración
Rate Limit: 100 req/15min por IP
Keep Alive: Cada 10 minutos
Región: oregon (o la que hayas elegido)
```

---

## 🎉 ¡Listo!

Tu proxy reverso está funcionando y:

✅ **Oculta completamente** la IP/dominio de tu backend  
✅ **Captura la IP real** del usuario (`user_ip` header)  
✅ **Captura el dominio** de acceso (`domain_ip` header)  
✅ **Reenvía transparentemente** todas las peticiones  
✅ **Previene el sleep** en plan gratuito de Render  
✅ **Incluye rate limiting** y seguridad básica  
✅ **Monitoreo** y health checks integrados  

### 🚀 Próximos Pasos

1. **Monitorear** el servicio durante las primeras 24 horas
2. **Configurar alertas** si planeas uso en producción  
3. **Customizar** headers adicionales según tus necesidades
4. **Considerar upgrade** a plan pago si necesitas más recursos

### 📞 Soporte

Si tienes problemas:
- Revisa la sección **Troubleshooting** arriba
- Verifica los **logs en Render Dashboard**
- Ejecuta el **health check**: `node health.js --url tu-url`

¡Tu proxy está listo para usar! 🚀