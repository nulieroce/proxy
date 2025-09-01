#!/usr/bin/env node

/**
 * Health Check Script para ProxyRender Liberia
 * 
 * Este script puede ser usado para:
 * 1. Verificar que el servicio está funcionando correctamente
 * 2. Testing local durante desarrollo
 * 3. Monitoreo externo del servicio
 * 4. CI/CD health checks
 */

const axios = require('axios');

// Configuración
const CONFIG = {
  // URL base del servicio (se auto-detecta si no se especifica)
  baseURL: process.env.HEALTH_CHECK_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000',
  timeout: 10000, // 10 segundos
  retries: 3,
  retryDelay: 2000 // 2 segundos entre reintentos
};

// Colores para output en consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Imprime mensaje con color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Imprime header con información del script
 */
function printHeader() {
  log('='.repeat(60), 'blue');
  log('🏥 HEALTH CHECK - ProxyRender Liberia', 'bold');
  log('='.repeat(60), 'blue');
  log(`📍 Target URL: ${CONFIG.baseURL}`);
  log(`⏱️  Timeout: ${CONFIG.timeout}ms`);
  log(`🔄 Max Retries: ${CONFIG.retries}`);
  log('='.repeat(60), 'blue');
}

/**
 * Sleep function para delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Realiza una petición HTTP con reintentos
 */
async function makeRequest(url, options = {}) {
  for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
    try {
      const response = await axios({
        url,
        timeout: CONFIG.timeout,
        validateStatus: (status) => status < 500, // Acepta códigos < 500
        ...options
      });
      return response;
    } catch (error) {
      log(`❌ Intento ${attempt}/${CONFIG.retries} falló: ${error.message}`, 'red');
      
      if (attempt < CONFIG.retries) {
        log(`⏳ Esperando ${CONFIG.retryDelay}ms antes del siguiente intento...`, 'yellow');
        await sleep(CONFIG.retryDelay);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthEndpoint() {
  log('\n🔍 TEST 1: Health Check Endpoint', 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseURL}/health`);
    
    if (response.status === 200) {
      log('✅ Health endpoint: OK', 'green');
      log(`   Status: ${response.status}`);
      log(`   Response time: ${response.headers['x-response-time'] || 'N/A'}`);
      
      if (response.data) {
        log(`   Uptime: ${Math.floor(response.data.uptime || 0)}s`);
        log(`   Environment: ${response.data.environment || 'N/A'}`);
        log(`   Version: ${response.data.version || 'N/A'}`);
      }
      
      return true;
    } else {
      log(`❌ Health endpoint returned status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 2: Keep Alive Endpoint
 */
async function testKeepAliveEndpoint() {
  log('\n🔍 TEST 2: Keep Alive Endpoint', 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseURL}/keep-alive`);
    
    if (response.status === 200) {
      log('✅ Keep-alive endpoint: OK', 'green');
      return true;
    } else {
      log(`❌ Keep-alive endpoint returned status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Keep-alive check failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 3: Proxy Status Endpoint
 */
async function testProxyStatusEndpoint() {
  log('\n🔍 TEST 3: Proxy Status Endpoint', 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseURL}/proxy-status`);
    
    if (response.status === 200) {
      log('✅ Proxy status endpoint: OK', 'green');
      
      if (response.data) {
        log(`   Proxy: ${response.data.proxy || 'N/A'}`);
        log(`   Target: ${response.data.target || 'N/A'}`);
        log(`   Client IP: ${response.data.client_ip || 'N/A'}`);
        log(`   Access Domain: ${response.data.access_domain || 'N/A'}`);
      }
      
      return true;
    } else {
      log(`❌ Proxy status endpoint returned status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Proxy status check failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test 4: Rate Limiting
 */
async function testRateLimiting() {
  log('\n🔍 TEST 4: Rate Limiting (Optional)', 'blue');
  
  try {
    // Hacer varias peticiones rápidas para probar el rate limiting
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(makeRequest(`${CONFIG.baseURL}/health`, { timeout: 2000 }));
    }
    
    const responses = await Promise.allSettled(requests);
    const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);
    
    log(`✅ Rate limiting test completed`, 'green');
    log(`   Successful requests: ${successful.length}/5`);
    log(`   Rate limited requests: ${rateLimited.length}/5`);
    
    return true;
  } catch (error) {
    log(`⚠️ Rate limiting test failed: ${error.message}`, 'yellow');
    return true; // No es crítico que falle este test
  }
}

/**
 * Test 5: Response Headers
 */
async function testResponseHeaders() {
  log('\n🔍 TEST 5: Response Headers', 'blue');
  
  try {
    const response = await makeRequest(`${CONFIG.baseURL}/health`);
    
    // Verificar headers importantes
    const importantHeaders = [
      'x-powered-by',
      'content-type',
      'x-ratelimit-limit',
      'x-ratelimit-remaining'
    ];
    
    let headersOk = true;
    for (const header of importantHeaders) {
      const value = response.headers[header.toLowerCase()];
      if (value) {
        log(`   ${header}: ${value}`, 'green');
      } else {
        log(`   ${header}: Not present`, 'yellow');
      }
    }
    
    // Verificar que no hay headers que revelen información sensible
    const sensitiveHeaders = ['server', 'x-aspnet-version'];
    for (const header of sensitiveHeaders) {
      if (response.headers[header.toLowerCase()]) {
        log(`   ⚠️ Sensitive header found: ${header}`, 'yellow');
        headersOk = false;
      }
    }
    
    if (headersOk) {
      log('✅ Response headers: OK', 'green');
    } else {
      log('⚠️ Some header issues detected', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Headers test failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Función principal
 */
async function runHealthChecks() {
  const startTime = Date.now();
  
  printHeader();
  
  // Ejecutar todos los tests
  const results = {
    health: await testHealthEndpoint(),
    keepAlive: await testKeepAliveEndpoint(),
    proxyStatus: await testProxyStatusEndpoint(),
    rateLimiting: await testRateLimiting(),
    headers: await testResponseHeaders()
  };
  
  // Resumen final
  const totalTime = Date.now() - startTime;
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN FINAL', 'bold');
  log('='.repeat(60), 'blue');
  log(`✅ Tests pasados: ${passedTests}/${totalTests}`);
  log(`⏱️ Tiempo total: ${totalTime}ms`);
  log(`🌐 URL probada: ${CONFIG.baseURL}`);
  
  if (passedTests === totalTests) {
    log('\n🎉 TODOS LOS TESTS PASARON - Servicio saludable!', 'green');
    process.exit(0);
  } else {
    log('\n❌ ALGUNOS TESTS FALLARON - Revisar configuración', 'red');
    process.exit(1);
  }
}

/**
 * Manejo de argumentos de línea de comandos
 */
function handleCliArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🏥 Health Check Script - ProxyRender Liberia

Uso:
  node health.js [opciones]

Opciones:
  --url <url>     URL del servicio a probar (default: auto-detect)
  --timeout <ms>  Timeout en milisegundos (default: 10000)
  --retries <n>   Número de reintentos (default: 3)
  --help, -h      Mostrar esta ayuda

Variables de entorno:
  HEALTH_CHECK_URL    URL del servicio a probar
  RENDER_EXTERNAL_URL URL automática de Render

Ejemplos:
  node health.js
  node health.js --url https://mi-proxy.onrender.com
  node health.js --timeout 5000 --retries 5
  HEALTH_CHECK_URL=https://mi-proxy.onrender.com node health.js
    `);
    process.exit(0);
  }
  
  // Procesar argumentos
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    CONFIG.baseURL = args[urlIndex + 1];
  }
  
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    CONFIG.timeout = parseInt(args[timeoutIndex + 1]) || CONFIG.timeout;
  }
  
  const retriesIndex = args.indexOf('--retries');
  if (retriesIndex !== -1 && args[retriesIndex + 1]) {
    CONFIG.retries = parseInt(args[retriesIndex + 1]) || CONFIG.retries;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  handleCliArgs();
  runHealthChecks().catch(error => {
    log(`💥 Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runHealthChecks,
  testHealthEndpoint,
  testKeepAliveEndpoint,
  testProxyStatusEndpoint
};