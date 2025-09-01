# 💻 Ejemplos de Integración Backend

**Cómo leer los headers `user_ip` y `domain_ip` en diferentes tecnologías**

---

## 🌟 Headers Disponibles

El proxy agrega automáticamente estos headers a todas las peticiones:

```http
user_ip: 192.168.1.100              # IP real del cliente
domain_ip: tu-proxy.onrender.com    # Dominio usado para acceder
X-Proxy-By: ProxyRender-Liberia     # Identificador del proxy
```

---

## 🟢 Node.js / Express

### Middleware Global
```javascript
const express = require('express');
const app = express();

// Middleware para capturar datos del proxy
app.use((req, res, next) => {
  // Obtener datos del proxy
  req.realClientIP = req.get('user_ip') || req.ip;
  req.accessDomain = req.get('domain_ip') || req.get('host');
  req.isViaProxy = req.get('X-Proxy-By') === 'ProxyRender-Liberia';
  
  // Log opcional
  console.log(`Cliente: ${req.realClientIP} via ${req.accessDomain}`);
  
  next();
});

// Usar en cualquier ruta
app.get('/api/users', (req, res) => {
  const clientInfo = {
    realIP: req.realClientIP,
    domain: req.accessDomain,
    viaProxy: req.isViaProxy
  };
  
  res.json({
    message: 'Lista de usuarios',
    client: clientInfo,
    users: [...]
  });
});
```

### Función Helper
```javascript
// helpers/proxy.js
function getClientInfo(req) {
  return {
    realIP: req.get('user_ip') || req.ip,
    accessDomain: req.get('domain_ip') || req.get('host'),
    userAgent: req.get('user-agent'),
    isViaProxy: req.get('X-Proxy-By') === 'ProxyRender-Liberia',
    headers: {
      forwarded: req.get('x-forwarded-for'),
      realIP: req.get('x-real-ip'),
      cfIP: req.get('cf-connecting-ip')
    }
  };
}

// Uso en rutas
app.post('/api/login', (req, res) => {
  const clientInfo = getClientInfo(req);
  
  // Guardar en logs de seguridad
  console.log('Login attempt:', {
    email: req.body.email,
    clientIP: clientInfo.realIP,
    domain: clientInfo.accessDomain,
    timestamp: new Date().toISOString()
  });
  
  // Tu lógica de login...
});

module.exports = { getClientInfo };
```

---

## 🐘 PHP / Laravel

### Middleware PHP Puro
```php
<?php
// middleware/ProxyMiddleware.php

class ProxyMiddleware {
    
    public static function getClientInfo() {
        return [
            'realIP' => $_SERVER['HTTP_USER_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'accessDomain' => $_SERVER['HTTP_DOMAIN_IP'] ?? $_SERVER['HTTP_HOST'] ?? 'unknown',
            'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'isViaProxy' => ($_SERVER['HTTP_X_PROXY_BY'] ?? '') === 'ProxyRender-Liberia'
        ];
    }
    
    public static function logAccess($action = '') {
        $client = self::getClientInfo();
        
        error_log(sprintf(
            "[%s] %s - IP: %s, Domain: %s, Via Proxy: %s",
            date('Y-m-d H:i:s'),
            $action,
            $client['realIP'],
            $client['accessDomain'],
            $client['isViaProxy'] ? 'Yes' : 'No'
        ));
    }
}

// Uso en cualquier script
ProxyMiddleware::logAccess('API Login');
$clientInfo = ProxyMiddleware::getClientInfo();

echo json_encode([
    'message' => 'Login successful',
    'client' => $clientInfo
]);
?>
```

### Laravel Middleware
```php
<?php
// app/Http/Middleware/ProxyHeaders.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ProxyHeaders
{
    public function handle(Request $request, Closure $next)
    {
        // Agregar datos del proxy al request
        $request->merge([
            'real_client_ip' => $request->header('user_ip', $request->ip()),
            'access_domain' => $request->header('domain_ip', $request->getHost()),
            'via_proxy' => $request->header('X-Proxy-By') === 'ProxyRender-Liberia'
        ]);
        
        // Log opcional
        \Log::info('Request via proxy', [
            'ip' => $request->get('real_client_ip'),
            'domain' => $request->get('access_domain'),
            'endpoint' => $request->path()
        ]);
        
        return $next($request);
    }
}

// Registrar en app/Http/Kernel.php:
protected $middleware = [
    // ...
    \App\Http\Middleware\ProxyHeaders::class,
];
```

### Laravel Controller
```php
<?php
// app/Http/Controllers/ApiController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function getUsers(Request $request)
    {
        $clientInfo = [
            'real_ip' => $request->get('real_client_ip'),
            'domain' => $request->get('access_domain'),
            'via_proxy' => $request->get('via_proxy')
        ];
        
        return response()->json([
            'users' => User::all(),
            'client_info' => $clientInfo
        ]);
    }
    
    public function login(Request $request)
    {
        // Validación...
        
        // Log de seguridad con IP real
        \Log::channel('security')->info('Login attempt', [
            'email' => $request->email,
            'real_ip' => $request->get('real_client_ip'),
            'domain' => $request->get('access_domain'),
            'success' => true
        ]);
        
        return response()->json(['message' => 'Login successful']);
    }
}
?>
```

---

## 🐍 Python / Django

### Middleware Django
```python
# middleware/proxy_middleware.py

import logging

logger = logging.getLogger(__name__)

class ProxyHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Obtener datos del proxy
        request.real_client_ip = request.META.get('HTTP_USER_IP') or self.get_client_ip(request)
        request.access_domain = request.META.get('HTTP_DOMAIN_IP') or request.get_host()
        request.via_proxy = request.META.get('HTTP_X_PROXY_BY') == 'ProxyRender-Liberia'
        
        # Log opcional
        logger.info(f"Request from {request.real_client_ip} via {request.access_domain}")
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

# Registrar en settings.py:
MIDDLEWARE = [
    # ...
    'middleware.proxy_middleware.ProxyHeadersMiddleware',
]
```

### Django Views
```python
# views.py

from django.http import JsonResponse
from django.views import View
import json

class ApiView(View):
    def get_client_info(self, request):
        return {
            'real_ip': getattr(request, 'real_client_ip', 'unknown'),
            'access_domain': getattr(request, 'access_domain', 'unknown'),
            'via_proxy': getattr(request, 'via_proxy', False),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
    
    def get(self, request):
        client_info = self.get_client_info(request)
        
        return JsonResponse({
            'message': 'API response',
            'client': client_info,
            'data': {...}
        })
    
    def post(self, request):
        client_info = self.get_client_info(request)
        data = json.loads(request.body)
        
        # Log de seguridad
        import logging
        logger = logging.getLogger('security')
        logger.info(f"POST request from {client_info['real_ip']}")
        
        return JsonResponse({
            'message': 'Data processed',
            'client': client_info
        })
```

### Flask
```python
# app.py

from flask import Flask, request, jsonify
import logging

app = Flask(__name__)

def get_client_info():
    return {
        'real_ip': request.headers.get('user_ip') or request.remote_addr,
        'access_domain': request.headers.get('domain_ip') or request.host,
        'via_proxy': request.headers.get('X-Proxy-By') == 'ProxyRender-Liberia',
        'user_agent': request.headers.get('User-Agent', '')
    }

@app.before_request
def log_request():
    client = get_client_info()
    app.logger.info(f"Request from {client['real_ip']} to {request.path}")

@app.route('/api/users')
def get_users():
    client_info = get_client_info()
    
    return jsonify({
        'users': [...],
        'client_info': client_info
    })

@app.route('/api/login', methods=['POST'])
def login():
    client_info = get_client_info()
    
    # Log de seguridad
    logging.info(f"Login attempt from {client_info['real_ip']}")
    
    return jsonify({
        'message': 'Login successful',
        'client': client_info
    })
```

---

## ☕ Java / Spring Boot

### Configuration
```java
// config/ProxyConfig.java

@Configuration
public class ProxyConfig {
    
    @Bean
    public FilterRegistrationBean<ProxyHeadersFilter> proxyHeadersFilter() {
        FilterRegistrationBean<ProxyHeadersFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new ProxyHeadersFilter());
        registrationBean.addUrlPatterns("/*");
        registrationBean.setOrder(1);
        return registrationBean;
    }
}
```

### Filter
```java
// filter/ProxyHeadersFilter.java

@Component
public class ProxyHeadersFilter implements Filter {
    
    private static final Logger logger = LoggerFactory.getLogger(ProxyHeadersFilter.class);
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        String realIP = httpRequest.getHeader("user_ip");
        if (realIP == null) realIP = httpRequest.getRemoteAddr();
        
        String accessDomain = httpRequest.getHeader("domain_ip");
        if (accessDomain == null) accessDomain = httpRequest.getServerName();
        
        boolean viaProxy = "ProxyRender-Liberia".equals(httpRequest.getHeader("X-Proxy-By"));
        
        // Agregar atributos al request
        httpRequest.setAttribute("realClientIP", realIP);
        httpRequest.setAttribute("accessDomain", accessDomain);
        httpRequest.setAttribute("viaProxy", viaProxy);
        
        logger.info("Request from {} via {}", realIP, accessDomain);
        
        chain.doFilter(request, response);
    }
}
```

### Controller
```java
// controller/ApiController.java

@RestController
@RequestMapping("/api")
public class ApiController {
    
    private static final Logger logger = LoggerFactory.getLogger(ApiController.class);
    
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers(HttpServletRequest request) {
        Map<String, Object> clientInfo = getClientInfo(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", userService.getAllUsers());
        response.put("client_info", clientInfo);
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody LoginRequest loginRequest, 
            HttpServletRequest request) {
        
        Map<String, Object> clientInfo = getClientInfo(request);
        
        // Log de seguridad
        logger.info("Login attempt from {} for user {}", 
                   clientInfo.get("realIP"), 
                   loginRequest.getEmail());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful");
        response.put("client_info", clientInfo);
        
        return ResponseEntity.ok(response);
    }
    
    private Map<String, Object> getClientInfo(HttpServletRequest request) {
        Map<String, Object> info = new HashMap<>();
        info.put("realIP", request.getAttribute("realClientIP"));
        info.put("accessDomain", request.getAttribute("accessDomain"));
        info.put("viaProxy", request.getAttribute("viaProxy"));
        info.put("userAgent", request.getHeader("User-Agent"));
        return info;
    }
}
```

---

## 🟦 C# / ASP.NET Core

### Middleware
```csharp
// Middleware/ProxyHeadersMiddleware.cs

public class ProxyHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ProxyHeadersMiddleware> _logger;

    public ProxyHeadersMiddleware(RequestDelegate next, ILogger<ProxyHeadersMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Obtener datos del proxy
        var realIP = context.Request.Headers["user_ip"].FirstOrDefault() 
                    ?? context.Connection.RemoteIpAddress?.ToString() 
                    ?? "unknown";
                    
        var accessDomain = context.Request.Headers["domain_ip"].FirstOrDefault() 
                          ?? context.Request.Host.Value 
                          ?? "unknown";
                          
        var viaProxy = context.Request.Headers["X-Proxy-By"].FirstOrDefault() == "ProxyRender-Liberia";

        // Agregar al contexto
        context.Items["RealClientIP"] = realIP;
        context.Items["AccessDomain"] = accessDomain;
        context.Items["ViaProxy"] = viaProxy;

        _logger.LogInformation("Request from {RealIP} via {Domain}", realIP, accessDomain);

        await _next(context);
    }
}

// En Startup.cs o Program.cs:
app.UseMiddleware<ProxyHeadersMiddleware>();
```

### Controller
```csharp
// Controllers/ApiController.cs

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ILogger<UsersController> _logger;

    public UsersController(ILogger<UsersController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult GetUsers()
    {
        var clientInfo = GetClientInfo();
        
        return Ok(new
        {
            Users = GetAllUsers(),
            ClientInfo = clientInfo
        });
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var clientInfo = GetClientInfo();
        
        // Log de seguridad
        _logger.LogInformation("Login attempt from {RealIP} for user {Email}", 
                              clientInfo.RealIP, 
                              request.Email);

        return Ok(new
        {
            Message = "Login successful",
            ClientInfo = clientInfo
        });
    }

    private dynamic GetClientInfo()
    {
        return new
        {
            RealIP = HttpContext.Items["RealClientIP"]?.ToString() ?? "unknown",
            AccessDomain = HttpContext.Items["AccessDomain"]?.ToString() ?? "unknown",
            ViaProxy = (bool)(HttpContext.Items["ViaProxy"] ?? false),
            UserAgent = Request.Headers["User-Agent"].FirstOrDefault() ?? ""
        };
    }
}
```

---

## 🔍 Casos de Uso Comunes

### 🛡️ Rate Limiting por IP Real
```javascript
// Node.js con express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  keyGenerator: (req) => {
    // Usar IP real del proxy en lugar de IP del proxy
    return req.get('user_ip') || req.ip;
  }
});

app.use('/api/', limiter);
```

### 📊 Analytics y Logging
```javascript
// Middleware de analytics
app.use((req, res, next) => {
  const analytics = {
    timestamp: new Date().toISOString(),
    realIP: req.get('user_ip') || req.ip,
    domain: req.get('domain_ip') || req.get('host'),
    path: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
    viaProxy: req.get('X-Proxy-By') === 'ProxyRender-Liberia'
  };
  
  // Enviar a tu sistema de analytics
  sendToAnalytics(analytics);
  
  next();
});
```

### 🚨 Sistema de Alertas
```javascript
// Detectar tráfico sospechoso
app.use((req, res, next) => {
  const realIP = req.get('user_ip') || req.ip;
  
  // Verificar si la IP está en lista negra
  if (isBlacklisted(realIP)) {
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLACKLISTED'
    });
  }
  
  // Alertar si hay muchas peticiones de la misma IP
  if (getTodayRequestCount(realIP) > 1000) {
    sendAlert(`High traffic from IP: ${realIP}`);
  }
  
  next();
});
```

---

## 🧪 Testing de Headers

### Verificar que los Headers Lleguen
```bash
# Test simple
curl -v https://tu-proxy.onrender.com/tu-endpoint

# Debe mostrar en la respuesta del backend:
# user_ip: tu.ip.real
# domain_ip: tu-proxy.onrender.com
```

### Script de Test para Backend
```javascript
// test-headers.js
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  const headers = {
    userIP: req.get('user_ip'),
    domainIP: req.get('domain_ip'),
    proxyBy: req.get('X-Proxy-By'),
    forwarded: req.get('X-Forwarded-For'),
    realIP: req.get('X-Real-IP')
  };
  
  console.log('Headers recibidos:', headers);
  
  res.json({
    message: 'Headers test',
    headers,
    originalIP: req.ip,
    success: !!headers.userIP && !!headers.domainIP
  });
});

app.listen(3000, () => {
  console.log('Test server running on port 3000');
});
```

---

## 📝 Notas Importantes

### ⚠️ Validación de Headers
```javascript
// Siempre validar que los headers existan
const realIP = req.get('user_ip') || req.ip || 'unknown';
const domain = req.get('domain_ip') || req.get('host') || 'unknown';

// Validar formato de IP
function isValidIP(ip) {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}
```

### 🔒 Seguridad
```javascript
// No confiar ciegamente en headers del proxy
function getClientIP(req) {
  const proxyIP = req.get('user_ip');
  const directIP = req.ip;
  
  // Verificar que realmente viene del proxy
  const isFromProxy = req.get('X-Proxy-By') === 'ProxyRender-Liberia';
  
  if (isFromProxy && proxyIP && isValidIP(proxyIP)) {
    return proxyIP;
  }
  
  return directIP;
}
```

---

¿Necesitas ayuda con alguna tecnología específica? ¡Los ejemplos están listos para copiar y pegar! 🚀