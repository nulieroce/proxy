# ⚡ Deploy Rápido - ProxyRender Liberia

**Guía express para tener tu proxy funcionando en 5 minutos**

## 🚀 Deploy en 3 Pasos

### 📋 Antes de Empezar
- Cuenta en GitHub ✅
- Cuenta en Render.com ✅  
- URL de tu backend: `https://___________`

---

## 1️⃣ PREPARAR CÓDIGO (2 minutos)

### Fork del Repo
```bash
# Ve a: https://github.com/tu-usuario/proxyrender-liberia
# Click "Fork" → Selecciona tu cuenta
```

### Configurar Backend
```bash
# Edita render.yaml línea 15:
- key: TARGET_URL
  value: https://TU-BACKEND-AQUI.com  # 👈 CAMBIAR AQUÍ
```

### Commit
```bash
git add render.yaml
git commit -m "Configure backend URL"
git push origin main
```

---

## 2️⃣ DESPLEGAR EN RENDER (2 minutos)

### Crear Servicio
1. **Dashboard Render** → https://dashboard.render.com
2. **"New +"** → **"Blueprint"** (NO Web Service)
3. **Connect GitHub** → Selecciona tu repo
4. **"Apply"** → Esperar deploy (~3 min)

### Obtener URL
```bash
# Render te dará algo como:
✅ https://proxyrender-liberia-abc123.onrender.com
# 👆 GUARDA ESTA URL
```

---

## 3️⃣ CONFIGURAR KEEP-ALIVE (1 minuto)

### Agregar Variable
1. **Tu servicio en Render** → **"Environment"**
2. **"Add Environment Variable"**:
   - **Key**: `KEEP_ALIVE_URL`
   - **Value**: `https://tu-proxy.onrender.com` 👈 Tu URL de Render
3. **"Save Changes"** → Esperar redeploy

---

## ✅ VERIFICAR FUNCIONAMIENTO

### Tests Rápidos
```bash
# Health check
curl https://tu-proxy.onrender.com/health
# Debe devolver: {"status":"ok",...}

# Proxy status  
curl https://tu-proxy.onrender.com/proxy-status
# Debe devolver: {"proxy":"ProxyRender Liberia",...}

# Test transparente (reemplaza /api/test con una ruta real de tu backend)
curl https://tu-proxy.onrender.com/api/test
# Debe devolver lo mismo que tu backend original
```

---

## 🎯 USAR EL PROXY

### En tu Frontend
```javascript
// ANTES:
const API_URL = 'https://mi-backend-original.com';

// DESPUÉS:
const API_URL = 'https://tu-proxy.onrender.com';

// ¡Eso es todo! El resto funciona igual
fetch(`${API_URL}/api/users`)...
```

### En tu Backend
```javascript
// Ahora puedes leer la IP real del cliente:
app.use((req, res, next) => {
  console.log('IP real cliente:', req.get('user_ip'));
  console.log('Dominio acceso:', req.get('domain_ip'));
  next();
});
```

---

## 🚨 Si Algo Sale Mal

### Backend no responde (502 Error)
```bash
# Verificar que tu backend esté funcionando:
curl -I https://tu-backend-original.com

# Si no responde, revisa tu backend first
# Si responde, verifica TARGET_URL en render.yaml
```

### Proxy se duerme (Plan gratuito)
```bash
# Verificar KEEP_ALIVE_URL configurada:
curl https://tu-proxy.onrender.com/keep-alive
# Debe devolver: {"status":"awake",...}
```

### Logs en Tiempo Real
```bash
# Ve a Render Dashboard → Tu servicio → "Logs"
# Verás requests en tiempo real
```

---

## 📊 URLs Importantes

```bash
# Anota estas URLs:
BACKEND:     https://tu-backend-original.com
PROXY:       https://tu-proxy.onrender.com  
HEALTH:      https://tu-proxy.onrender.com/health
KEEP-ALIVE:  https://tu-proxy.onrender.com/keep-alive
STATUS:      https://tu-proxy.onrender.com/proxy-status
```

---

## ⚙️ Configuración por Defecto

- ✅ **Rate Limit**: 100 peticiones/15min por IP
- ✅ **Keep-Alive**: Ping cada 10 minutos
- ✅ **Headers**: `user_ip` y `domain_ip` agregados
- ✅ **Timeout**: 30 segundos para peticiones
- ✅ **Compresión**: Gzip automático
- ✅ **Seguridad**: Headers básicos incluidos

---

## 🎉 ¡Ya está!

Tu proxy ya está:
- 🔒 **Ocultando** tu backend real
- 📡 **Capturando** IP real del cliente  
- 🌐 **Pasando** dominio de acceso
- 🔄 **Reenviando** todas las peticiones
- 💚 **Evitando** sleep automáticamente

**Total: ~5 minutos** ⚡

---

## 📋 Checklist Express

- [ ] Fork repo ✅
- [ ] Configurar `TARGET_URL` en render.yaml ✅  
- [ ] Deploy en Render con Blueprint ✅
- [ ] Configurar `KEEP_ALIVE_URL` ✅
- [ ] Test: `curl https://tu-proxy.onrender.com/health` ✅
- [ ] Actualizar frontend para usar proxy ✅
- [ ] Verificar headers en backend ✅

**¿Todo ✅? ¡Perfecto! Tu proxy está funcionando** 🚀

---

*Para configuración avanzada, ver [GUIA-PASO-A-PASO.md](./GUIA-PASO-A-PASO.md)*