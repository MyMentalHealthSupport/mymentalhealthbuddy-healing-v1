// src/routes/metrics.js - Prometheus Metrics and System Monitoring
const express = require('express');
const promClient = require('prom-client');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Create a Registry
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics for MyMentalHealthBuddy™
const httpRequestsTotal = new promClient.Counter({
  name: 'mhb_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'mhb_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const activeUsers = new promClient.Gauge({
  name: 'mhb_active_users',
  help: 'Number of currently active users',
  registers: [register]
});

const journalEntriesTotal = new promClient.Counter({
  name: 'mhb_journal_entries_total',
  help: 'Total number of journal entries created',
  labelNames: ['crisis_detected'],
  registers: [register]
});

const moodTrackingTotal = new promClient.Counter({
  name: 'mhb_mood_tracking_total',
  help: 'Total number of mood entries recorded',
  registers: [register]
});

const ttsRequestsTotal = new promClient.Counter({
  name: 'mhb_tts_requests_total',
  help: 'Total number of TTS requests',
  labelNames: ['provider', 'status'],
  registers: [register]
});

const billingEventsTotal = new promClient.Counter({
  name: 'mhb_billing_events_total',
  help: 'Total number of billing events',
  labelNames: ['event_type', 'status'],
  registers: [register]
});

const crisisReportsTotal = new promClient.Counter({
  name: 'mhb_crisis_reports_total',
  help: 'Total number of crisis reports',
  labelNames: ['severity', 'immediate_danger'],
  registers: [register]
});

const systemHealth = new promClient.Gauge({
  name: 'mhb_system_health',
  help: 'System health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['component'],
  registers: [register]
});

// Memory usage tracking
const memoryUsage = new promClient.Gauge({
  name: 'mhb_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register]
});

// Response time tracking
const responseTimeGauge = new promClient.Gauge({
  name: 'mhb_response_time_ms',
  help: 'Average response time in milliseconds',
  labelNames: ['endpoint'],
  registers: [register]
});

// Update memory metrics periodically
setInterval(() => {
  const memStats = process.memoryUsage();
  memoryUsage.labels('rss').set(memStats.rss);
  memoryUsage.labels('heapUsed').set(memStats.heapUsed);
  memoryUsage.labels('heapTotal').set(memStats.heapTotal);
  memoryUsage.labels('external').set(memStats.external);
}, 10000); // Update every 10 seconds

// Middleware to track HTTP metrics
function trackHttpMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const status = res.statusCode.toString();
    
    httpRequestsTotal.labels(method, route, status).inc();
    httpRequestDuration.labels(method, route, status).observe(duration);
    responseTimeGauge.labels(route).set(duration * 1000);
  });
  
  next();
}

// Functions to track application-specific metrics
function trackJournalEntry(crisisDetected = false) {
  journalEntriesTotal.labels(crisisDetected.toString()).inc();
  logger.info('Journal entry metric updated', { crisisDetected });
}

function trackMoodEntry() {
  moodTrackingTotal.inc();
  logger.info('Mood tracking metric updated');
}

function trackTTSRequest(provider, success = true) {
  ttsRequestsTotal.labels(provider, success ? 'success' : 'error').inc();
  logger.info('TTS request metric updated', { provider, success });
}

function trackBillingEvent(eventType, success = true) {
  billingEventsTotal.labels(eventType, success ? 'success' : 'error').inc();
  logger.info('Billing event metric updated', { eventType, success });
}

function trackCrisisReport(severity, immediateDanger = false) {
  crisisReportsTotal.labels(severity, immediateDanger.toString()).inc();
  logger.warn('Crisis report metric updated', { severity, immediateDanger });
}

function updateSystemHealth(component, healthy = true) {
  systemHealth.labels(component).set(healthy ? 1 : 0);
  logger.info('System health metric updated', { component, healthy });
}

function updateActiveUsers(count) {
  activeUsers.set(count);
  logger.info('Active users metric updated', { count });
}

// Get metrics endpoint for Prometheus
function getMetrics(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
    
    logger.info('Metrics endpoint accessed');
  } catch (error) {
    logger.error('Metrics retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Metrics retrieval failed',
      timestamp: new Date().toISOString()
    });
  }
}

// Get human-readable metrics summary
router.get('/summary', async (req, res) => {
  try {
    const metrics = await register.getMetricsAsJSON();
    
    // Process metrics into readable format
    const summary = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        platform: process.platform,
        node_version: process.version
      },
      application: {
        total_http_requests: getMetricValue(metrics, 'mhb_http_requests_total') || 0,
        total_journal_entries: getMetricValue(metrics, 'mhb_journal_entries_total') || 0,
        total_mood_entries: getMetricValue(metrics, 'mhb_mood_tracking_total') || 0,
        total_tts_requests: getMetricValue(metrics, 'mhb_tts_requests_total') || 0,
        total_crisis_reports: getMetricValue(metrics, 'mhb_crisis_reports_total') || 0,
        active_users: getMetricValue(metrics, 'mhb_active_users') || 0
      },
      health: {
        overall: 'healthy',
        components: {
          server: getMetricValue(metrics, 'mhb_system_health', 'server') || 1,
          database: getMetricValue(metrics, 'mhb_system_health', 'database') || 1,
          tts: getMetricValue(metrics, 'mhb_system_health', 'tts') || 1,
          billing: getMetricValue(metrics, 'mhb_system_health', 'billing') || 1,
          storage: getMetricValue(metrics, 'mhb_system_health', 'storage') || 1
        }
      },
      timestamp: new Date().toISOString()
    };
    
    // Determine overall health
    const componentHealthValues = Object.values(summary.health.components);
    const unhealthyComponents = componentHealthValues.filter(health => health === 0);
    
    if (unhealthyComponents.length > 0) {
      summary.health.overall = unhealthyComponents.length > componentHealthValues.length / 2 ? 'critical' : 'degraded';
    }
    
    res.json(summary);
    
  } catch (error) {
    logger.error('Metrics summary retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Metrics summary retrieval failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to extract metric values
function getMetricValue(metrics, metricName, labelValue = null) {
  const metric = metrics.find(m => m.name === metricName);
  if (!metric) return null;
  
  if (labelValue) {
    const value = metric.values.find(v => 
      v.labels && Object.values(v.labels).includes(labelValue)
    );
    return value ? value.value : null;
  }
  
  return metric.values.length > 0 ? metric.values[0].value : null;
}

// Initialize system health metrics
updateSystemHealth('server', true);
updateSystemHealth('database', true);
updateSystemHealth('tts', true);
updateSystemHealth('billing', true);
updateSystemHealth('storage', true);

// Export metrics functions and middleware
module.exports = {
  getMetrics,
  trackHttpMetrics,
  trackJournalEntry,
  trackMoodEntry,
  trackTTSRequest,
  trackBillingEvent,
  trackCrisisReport,
  updateSystemHealth,
  updateActiveUsers,
  router
};
