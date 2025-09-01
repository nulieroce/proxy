#!/usr/bin/env node

/**
 * Keep-Alive Script para ProxyRender Liberia
 * 
 * Este script previene que Render.com duerma tu servicio en el plan gratuito
 * Se puede usar de forma standalone o integrado en el servidor principal
 */

const axios = require('axios');
const cron = require('node-cron');

// Configuración
const CONFIG = {
  // URL del servicio a mantener activo
  serviceURL: process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:10000',
  
  // Intervalo en formato cron (cada 10 minutos por defecto)
  interval: process.env.KEEP_ALIVE_INTERVAL || '*/10 * * * *',
  
  // Timeout para las peticiones
  timeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 10000,
  
  // Endpoint a usar para el ping
  endpoint: '/keep-alive',
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 5000,
  
  // Logging
  verbose: process.env.NODE_ENV === 'development' || process.env.KEEP_ALIVE_VERBOSE === 'true'
};

// Colores para logging
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

/**
 * Logger con colores y timestamps
 */
class Logger {
  static log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [KEEP-ALIVE]`;
    
    switch (level) {
      case 'success':
        console.log(`${colors.green}${prefix} ✅ ${message}${colors.reset}`);
        break;
      case 'error':
        console.log(`${colors.red}${prefix} ❌ ${message}${colors.reset}`);
        break;
      case 'warn':
        console.log(`${colors.yellow}${prefix} ⚠️ ${message}${colors.reset}`);
        break;
      case 'debug':
        if (CONFIG.verbose) {
          console.log(`${colors.gray}${prefix} 🔍 ${message}${colors.reset}`);
        }
        break;
      default:
        console.log(`${colors.blue}${prefix} ℹ️ ${message}${colors.reset}`);
    }
  }
}

/**
 * Sleep function para delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estadísticas del keep-alive
 */
class Stats {
  constructor() {
    this.startTime = Date.now();
    this.totalPings = 0;
    this.successfulPings = 0;
    this.failedPings = 0;
    this.lastSuccess = null;
    this.lastFailure = null;
    this.consecutiveFailures = 0;
  }
  
  recordSuccess() {
    this.totalPings++;
    this.successfulPings++;
    this.lastSuccess = new Date();
    this.consecutiveFailures = 0;
  }
  
  recordFailure() {
    this.totalPings++;
    this.failedPings++;
    this.lastFailure = new Date();
    this.consecutiveFailures++;
  }
  
  getSuccessRate() {
    return this.totalPings > 0 ? ((this.successfulPings / this.totalPings) * 100).toFixed(2) : 0;
  }
  
  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
  
  getSummary() {
    return {
      uptime: this.getUptime(),
      totalPings: this.totalPings,
      successfulPings: this.successfulPings,
      failedPings: this.failedPings,
      successRate: this.getSuccessRate(),
      lastSuccess: this.lastSuccess,
      lastFailure: this.lastFailure,
      consecutiveFailures: this.consecutiveFailures
    };
  }
}

// Instancia global de estadísticas
const stats = new Stats();

/**
 * Realizar ping al servicio
 */
async function pingService() {
  const url = `${CONFIG.serviceURL}${CONFIG.endpoint}`;
  
  Logger.log(`Ping to ${url}`, 'debug');
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'ProxyRender-KeepAlive/1.0',
          'X-Keep-Alive': 'true'
        },
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200) {
        stats.recordSuccess();
        Logger.log(`Ping successful (${response.status}) - Success rate: ${stats.getSuccessRate()}%`, 'success');
        
        // Log adicional en modo verbose
        if (CONFIG.verbose && response.data) {
          Logger.log(`Response: ${JSON.stringify(response.data)}`, 'debug');
        }
        
        return true;
      } else {
        Logger.log(`Ping returned status ${response.status}`, 'warn');
        if (attempt < CONFIG.maxRetries) {
          Logger.log(`Retrying in ${CONFIG.retryDelay}ms... (${attempt}/${CONFIG.maxRetries})`, 'warn');
          await sleep(CONFIG.retryDelay);
        }
      }
    } catch (error) {
      Logger.log(`Ping attempt ${attempt} failed: ${error.message}`, 'error');
      
      if (attempt < CONFIG.maxRetries) {
        Logger.log(`Retrying in ${CONFIG.retryDelay}ms... (${attempt}/${CONFIG.maxRetries})`, 'warn');
        await sleep(CONFIG.retryDelay);
      }
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  stats.recordFailure();
  Logger.log(`All ${CONFIG.maxRetries} attempts failed - Consecutive failures: ${stats.consecutiveFailures}`, 'error');
  
  // Alerta si hay muchas fallas consecutivas
  if (stats.consecutiveFailures >= 5) {
    Logger.log('⚠️ HIGH FAILURE RATE ALERT: 5+ consecutive failures detected!', 'error');
  }
  
  return false;
}

/**
 * Verificar configuración
 */
function validateConfig() {
  if (!CONFIG.serviceURL || CONFIG.serviceURL === 'http://localhost:10000') {
    Logger.log('⚠️ KEEP_ALIVE_URL not configured - running in localhost mode', 'warn');
    if (process.env.NODE_ENV === 'production') {
      Logger.log('❌ KEEP_ALIVE_URL is required in production!', 'error');
      return false;
    }
  }
  
  // Validar formato de URL
  try {
    new URL(CONFIG.serviceURL);
  } catch (error) {
    Logger.log(`❌ Invalid KEEP_ALIVE_URL: ${CONFIG.serviceURL}`, 'error');
    return false;
  }
  
  // Validar cron expression
  try {
    cron.validate(CONFIG.interval);
  } catch (error) {
    Logger.log(`❌ Invalid cron interval: ${CONFIG.interval}`, 'error');
    return false;
  }
  
  return true;
}

/**
 * Mostrar configuración actual
 */
function showConfig() {
  Logger.log('Keep-Alive Configuration:', 'info');
  Logger.log(`  Service URL: ${CONFIG.serviceURL}`, 'info');
  Logger.log(`  Interval: ${CONFIG.interval}`, 'info');
  Logger.log(`  Timeout: ${CONFIG.timeout}ms`, 'info');
  Logger.log(`  Max Retries: ${CONFIG.maxRetries}`, 'info');
  Logger.log(`  Verbose: ${CONFIG.verbose}`, 'info');
}

/**
 * Mostrar estadísticas
 */
function showStats() {
  const summary = stats.getSummary();
  Logger.log('Keep-Alive Statistics:', 'info');
  Logger.log(`  Uptime: ${summary.uptime}s`, 'info');
  Logger.log(`  Total Pings: ${summary.totalPings}`, 'info');
  Logger.log(`  Successful: ${summary.successfulPings}`, 'info');
  Logger.log(`  Failed: ${summary.failedPings}`, 'info');
  Logger.log(`  Success Rate: ${summary.successRate}%`, 'info');
  if (summary.lastSuccess) {
    Logger.log(`  Last Success: ${summary.lastSuccess.toISOString()}`, 'info');
  }
  if (summary.lastFailure) {
    Logger.log(`  Last Failure: ${summary.lastFailure.toISOString()}`, 'info');
  }
}

/**
 * Iniciar el keep-alive scheduler
 */
function startKeepAlive() {
  if (!validateConfig()) {
    process.exit(1);
  }
  
  Logger.log('🚀 Starting Keep-Alive service...', 'success');
  showConfig();
  
  // Ping inicial inmediato
  Logger.log('Performing initial ping...', 'info');
  pingService();
  
  // Programar pings regulares
  const task = cron.schedule(CONFIG.interval, async () => {
    await pingService();
  }, {
    scheduled: true
  });
  
  Logger.log(`✅ Keep-Alive scheduled with interval: ${CONFIG.interval}`, 'success');
  
  // Mostrar estadísticas cada hora
  cron.schedule('0 * * * *', () => {
    showStats();
  });
  
  return task;
}

/**
 * Manejar señales de cierre
 */
function setupGracefulShutdown(task) {
  const shutdown = (signal) => {
    Logger.log(`Received ${signal}, stopping keep-alive...`, 'warn');
    
    if (task) {
      task.stop();
    }
    
    showStats();
    Logger.log('Keep-Alive service stopped', 'info');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

/**
 * CLI Arguments handling
 */
function handleCliArgs() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔄 Keep-Alive Script - ProxyRender Liberia

Usage:
  node keep-alive.js [options]

Options:
  --url <url>        Service URL to keep alive
  --interval <cron>  Cron interval (default: '*/10 * * * *')
  --timeout <ms>     Request timeout (default: 10000)
  --verbose          Enable verbose logging
  --test             Run a single ping test and exit
  --stats            Show current statistics
  --help, -h         Show this help

Environment Variables:
  KEEP_ALIVE_URL        Service URL to ping
  KEEP_ALIVE_INTERVAL   Cron interval pattern
  KEEP_ALIVE_TIMEOUT    Request timeout in milliseconds
  KEEP_ALIVE_VERBOSE    Enable verbose logging ('true'/'false')

Examples:
  node keep-alive.js
  node keep-alive.js --url https://my-proxy.onrender.com
  node keep-alive.js --interval "*/5 * * * *" --verbose
  node keep-alive.js --test
    `);
    process.exit(0);
  }
  
  // Procesar argumentos
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    CONFIG.serviceURL = args[urlIndex + 1];
  }
  
  const intervalIndex = args.indexOf('--interval');
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    CONFIG.interval = args[intervalIndex + 1];
  }
  
  const timeoutIndex = args.indexOf('--timeout');
  if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
    CONFIG.timeout = parseInt(args[timeoutIndex + 1]) || CONFIG.timeout;
  }
  
  if (args.includes('--verbose')) {
    CONFIG.verbose = true;
  }
  
  // Comandos especiales
  if (args.includes('--test')) {
    Logger.log('Running single ping test...', 'info');
    pingService().then(success => {
      process.exit(success ? 0 : 1);
    });
    return false;
  }
  
  if (args.includes('--stats')) {
    showStats();
    process.exit(0);
  }
  
  return true;
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  if (handleCliArgs()) {
    const task = startKeepAlive();
    setupGracefulShutdown(task);
    
    // Mantener el proceso vivo
    process.stdin.resume();
  }
}

// Exportar para uso como módulo
module.exports = {
  pingService,
  startKeepAlive,
  stats,
  CONFIG,
  Logger
};