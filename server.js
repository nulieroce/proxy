const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const cron = require('node-cron');

const app = express();

// Configuración de entorno
const PORT = process.env.PORT || 10000;
const TARGET_URL = process.env.TARGET_URL || 'https://mi-app-original.com';
const NODE_ENV = process.env.NODE_ENV || 'development';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL; // URL del propio servicio para evitar sleep

// Trust proxy para obtener IPs reales
app.set('trust proxy', true);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Permitir contenido del backend
  crossOriginEmbedderPolicy: false
}));

// Compresión
app.use(compression());

// CORS configurado para permitir todo (transparencia total)
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Logging con formato personalizado
const logFormat = NODE_ENV === 'production' 
  ? 'combined' 
  : ':method :url :status :res[content-length] - :response-time ms - IP: :remote-addr';

app.use(morgan(logFormat));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  // No aplicar rate limit al health check
  skip: (req) => req.path === '/health' || req.path === '/keep-alive'
});

app.use(limiter);

// Función para obtener la IP real del cliente
function getRealIP(req) {
  // Priorizar diferentes headers de IP
  const forwarded = req.get('X-Forwarded-For');
  const realIP = req.get('X-Real-IP');
  const cfIP = req.get('CF-Connecting-IP');
  const clientIP = req.get('X-Client-IP');
  const expressIP = req.ip;

  let ip = null;

  if (forwarded) {
    // X-Forwarded-For puede contener múltiples IPs separadas por comas
    ip = forwarded.split(',')[0].trim();
  } else if (cfIP) {
    ip = cfIP;
  } else if (realIP) {
    ip = realIP;
  } else if (clientIP) {
    ip = clientIP;
  } else {
    ip = expressIP;
  }

  // Limpiar IPv6 mapped IPv4
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip || 'unknown';
}

// Función para obtener el dominio de acceso
function getAccessDomain(req) {
  const host = req.get('Host');
  const forwarded = req.get('X-Forwarded-Host');
  return forwarded || host || 'unknown';
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: NODE_ENV,
    target: TARGET_URL,
    version: '1.0.0'
  });
});

// Keep alive endpoint para evitar sleep en Render free tier
app.get('/keep-alive', (req, res) => {
  res.status(200).json({
    status: 'awake',
    timestamp: new Date().toISOString(),
    message: 'Servicio activo'
  });
});

// Status endpoint con información del proxy
app.get('/proxy-status', (req, res) => {
  res.status(200).json({
    proxy: 'ProxyRender Liberia v1.0',
    status: 'active',
    target: TARGET_URL,
    timestamp: new Date().toISOString(),
    client_ip: getRealIP(req),
    access_domain: getAccessDomain(req),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// Middleware para logging de peticiones (solo en desarrollo)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`Client IP: ${getRealIP(req)}`);
    console.log(`Access Domain: ${getAccessDomain(req)}`);
    console.log('Headers:', req.headers);
    next();
  });
}

// Configuración del proxy
const proxyOptions = {
  target: TARGET_URL,
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  timeout: 30000, // 30 segundos
  proxyTimeout: 30000,
  ws: true, // Soporte para WebSockets
  
  // Modificar headers de la petición
  onProxyReq: (proxyReq, req, res) => {
    // Agregar headers personalizados con información del cliente
    const clientIP = getRealIP(req);
    const accessDomain = getAccessDomain(req);
    
    // Headers importantes para el proxy
    proxyReq.setHeader('X-Real-IP', clientIP);
    proxyReq.setHeader('X-Forwarded-For', clientIP);
    proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'https');
    proxyReq.setHeader('X-Forwarded-Host', req.get('host') || accessDomain);
    
    // Headers personalizados
    proxyReq.setHeader('user_ip', clientIP);
    proxyReq.setHeader('domain_ip', accessDomain);
    
    // Preservar headers importantes del cliente
    const headersToPreserve = ['user-agent', 'accept', 'accept-language', 'accept-encoding', 'cookie', 'authorization', 'referer', 'origin'];
    headersToPreserve.forEach(header => {
      const value = req.get(header);
      if (value) {
        proxyReq.setHeader(header, value);
      }
    });
    
    // Log para debugging
    console.log(`[PROXY REQUEST] ${req.method} ${req.url}`);
    console.log(`[PROXY TARGET] ${TARGET_URL}${req.url}`);
    console.log(`[CLIENT INFO] IP: ${clientIP}, Domain: ${accessDomain}`);
    if (NODE_ENV === 'development' || true) { // Temporalmente activar logs
      console.log('[REQUEST HEADERS]', req.headers);
    }
  },
  
  // Modificar headers de la respuesta
  onProxyRes: (proxyRes, req, res) => {
    // Permitir CORS completo
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
    proxyRes.headers['access-control-allow-headers'] = '*';
    proxyRes.headers['access-control-allow-credentials'] = 'true';
    
    // Remover headers que podrían revelar el backend
    proxyRes.headers['x-powered-by'] = 'ProxyRender-Liberia';
    delete proxyRes.headers['server'];
    delete proxyRes.headers['x-aspnet-version'];
    delete proxyRes.headers['x-aspnetmvc-version'];
    
    // Log de respuesta
    console.log(`[PROXY RESPONSE] ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    if (NODE_ENV === 'development' || true) { // Temporalmente activar logs
      console.log('[RESPONSE HEADERS]', proxyRes.headers);
    }
  },
  
  // Manejo de errores
  onError: (err, req, res) => {
    console.error(`[PROXY ERROR] ${err.message}`);
    console.error(`[PROXY ERROR DETAILS]`, {
      url: req.url,
      method: req.method,
      target: TARGET_URL,
      error_code: err.code,
      error_stack: err.stack,
      timestamp: new Date().toISOString(),
      client_ip: getRealIP(req)
    });
    
    // Determinar tipo de error y respuesta apropiada
    let statusCode = 502;
    let errorMessage = 'Error en el proxy';
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'No se pudo conectar con el servidor de destino';
      statusCode = 503;
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = 'Tiempo de espera agotado';
      statusCode = 504;
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'Servidor de destino no encontrado';
      statusCode = 502;
    }
    
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: errorMessage,
        message: NODE_ENV === 'development' ? err.message : 'Error al procesar la solicitud',
        code: err.code,
        path: req.url,
        target: NODE_ENV === 'development' ? TARGET_URL : undefined,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Headers adicionales para mantener la funcionalidad
  headers: {
    'Connection': 'keep-alive'
  }
};

// Crear el proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Manejo especial para OPTIONS (CORS preflight)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Aplicar el proxy a todas las rutas excepto las de control
app.use((req, res, next) => {
  // Excluir rutas de control del proxy
  if (req.path === '/health' || req.path === '/keep-alive' || req.path === '/proxy-status') {
    return next();
  }
  
  // Log para debugging
  console.log(`[ROUTING] Proxying ${req.method} ${req.path} to ${TARGET_URL}`);
  
  // Aplicar proxy a todas las demás rutas
  return proxy(req, res, next);
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 500,
      timestamp: new Date().toISOString()
    });
  }
});

// Función para mantener el servicio activo (evitar sleep en Render free tier)
function keepAlive() {
  if (KEEP_ALIVE_URL) {
    axios.get(KEEP_ALIVE_URL + '/keep-alive')
      .then(() => {
        console.log('[KEEP-ALIVE] Ping successful');
      })
      .catch(err => {
        console.log('[KEEP-ALIVE] Ping failed:', err.message);
      });
  }
}

// Programar keep-alive cada 10 minutos (solo si está configurado)
if (KEEP_ALIVE_URL) {
  cron.schedule('*/10 * * * *', keepAlive);
  console.log('[KEEP-ALIVE] Scheduled every 10 minutes');
}

// Iniciar el servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 ProxyRender Liberia iniciado exitosamente!
📍 Puerto: ${PORT}
🎯 Target: ${TARGET_URL}
🌍 Entorno: ${NODE_ENV}
⚡ Rate Limit: ${RATE_LIMIT_MAX_REQUESTS} req/${RATE_LIMIT_WINDOW_MS/1000}s
${KEEP_ALIVE_URL ? '💚 Keep-Alive: Habilitado' : '⚠️  Keep-Alive: Deshabilitado'}

Endpoints disponibles:
- GET /health - Health check
- GET /keep-alive - Keep alive ping
- GET /proxy-status - Estado del proxy
- * - Proxy transparente hacia ${TARGET_URL}
  `);
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Recibida señal SIGTERM, cerrando servidor...');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado exitosamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Recibida señal SIGINT, cerrando servidor...');
  server.close(() => {
    console.log('[SHUTDOWN] Servidor cerrado exitosamente');
    process.exit(0);
  });
});

module.exports = app;