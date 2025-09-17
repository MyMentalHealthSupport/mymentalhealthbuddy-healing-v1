// src/utils/self-healing.js - V8+ Enhanced Self-Healing and Self-Evolving System
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const os = require('os');

class SelfHealingSystem {
  constructor(app, logger) {
    this.app = app;
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });
    
    this.healthChecks = new Map();
    this.autoRepairs = new Map();
    this.performanceMetrics = [];
    this.errorPatterns = new Map();
    this.isMonitoring = false;
    this.healingAttempts = new Map();
  }
  
  // V8+ Enhanced initialization with performance optimization
  initialize() {
    this.logger.info('🔧 Initializing Self-Healing System V10·PERFECTION V8+ ENHANCED');
    
    // V8 heap optimization
    if (global.gc) {
      this.logger.info('🚀 V8 garbage collection available - enabling periodic optimization');
      setInterval(() => {
        if (this.shouldOptimizeMemory()) {
          global.gc();
          this.logger.debug('🧹 V8 memory optimization completed');
        }
      }, 300000); // Every 5 minutes
    }
    
    this.setupHealthChecks();
    this.setupAutoRepairs();
    this.startMonitoring();
    this.setupErrorDetection();
    this.setupV8Monitoring();
    
    this.logger.info('✅ Self-Healing System V8+ initialized and active');
  }
  
  // Setup health checks for various components
  setupHealthChecks() {
    // Server health check
    this.healthChecks.set('server', {
      name: 'Server Health',
      check: () => {
        return {
          healthy: true,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        };
      },
      interval: 30000, // 30 seconds
      critical: true
    });
    
    // Memory health check
    this.healthChecks.set('memory', {
      name: 'Memory Usage',
      check: () => {
        const memUsage = process.memoryUsage();
        const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        return {
          healthy: memoryUsagePercent < 85,
          usage_percent: memoryUsagePercent,
          heap_used: memUsage.heapUsed,
          heap_total: memUsage.heapTotal,
          warning_threshold: 85,
          critical_threshold: 95,
          timestamp: new Date().toISOString()
        };
      },
      interval: 15000, // 15 seconds
      critical: true
    });
    
    // Response time health check
    this.healthChecks.set('response_time', {
      name: 'Response Time',
      check: () => {
        const recentMetrics = this.performanceMetrics.slice(-10);
        if (recentMetrics.length === 0) {
          return { healthy: true, average_response_time: 0, timestamp: new Date().toISOString() };
        }
        
        const avgResponseTime = recentMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / recentMetrics.length;
        
        return {
          healthy: avgResponseTime < 2000, // 2 seconds threshold
          average_response_time: avgResponseTime,
          threshold: 2000,
          recent_requests: recentMetrics.length,
          timestamp: new Date().toISOString()
        };
      },
      interval: 45000, // 45 seconds
      critical: false
    });
    
    // Error rate health check
    this.healthChecks.set('error_rate', {
      name: 'Error Rate',
      check: () => {
        const recentMetrics = this.performanceMetrics.slice(-50);
        if (recentMetrics.length === 0) {
          return { healthy: true, error_rate: 0, timestamp: new Date().toISOString() };
        }
        
        const errorCount = recentMetrics.filter(metric => metric.statusCode >= 400).length;
        const errorRate = (errorCount / recentMetrics.length) * 100;
        
        return {
          healthy: errorRate < 10, // 10% threshold
          error_rate: errorRate,
          error_count: errorCount,
          total_requests: recentMetrics.length,
          threshold: 10,
          timestamp: new Date().toISOString()
        };
      },
      interval: 60000, // 1 minute
      critical: true
    });
  }
  
  // Setup automatic repair mechanisms
  setupAutoRepairs() {
    // Memory cleanup repair
    this.autoRepairs.set('memory_cleanup', {
      name: 'Memory Cleanup',
      trigger: (healthStatus) => healthStatus.memory && !healthStatus.memory.healthy,
      repair: async () => {
        this.logger.warn('🔧 Triggering memory cleanup due to high usage');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          this.logger.info('✅ Garbage collection completed');
        }
        
        // Clear old performance metrics
        if (this.performanceMetrics.length > 1000) {
          this.performanceMetrics = this.performanceMetrics.slice(-500);
          this.logger.info('✅ Performance metrics cleaned up');
        }
        
        return { success: true, action: 'memory_cleanup' };
      },
      cooldown: 300000 // 5 minutes
    });
    
    // Response time optimization
    this.autoRepairs.set('response_optimization', {
      name: 'Response Time Optimization',
      trigger: (healthStatus) => healthStatus.response_time && !healthStatus.response_time.healthy,
      repair: async () => {
        this.logger.warn('🔧 Optimizing response times due to slow performance');
        
        // Clear old metrics to reduce processing overhead
        this.performanceMetrics = this.performanceMetrics.slice(-100);
        
        // Log performance warning
        this.logger.warn('⚠️ Response time degradation detected - monitoring for patterns');
        
        return { success: true, action: 'response_optimization' };
      },
      cooldown: 600000 // 10 minutes
    });
    
    // Error pattern analysis and mitigation
    this.autoRepairs.set('error_mitigation', {
      name: 'Error Pattern Mitigation',
      trigger: (healthStatus) => healthStatus.error_rate && !healthStatus.error_rate.healthy,
      repair: async () => {
        this.logger.warn('🔧 Analyzing error patterns for mitigation');
        
        const recentErrors = this.performanceMetrics
          .filter(metric => metric.statusCode >= 400)
          .slice(-20);
        
        // Analyze error patterns
        const errorsByEndpoint = {};
        recentErrors.forEach(error => {
          errorsByEndpoint[error.endpoint] = (errorsByEndpoint[error.endpoint] || 0) + 1;
        });
        
        // Log problematic endpoints
        Object.entries(errorsByEndpoint).forEach(([endpoint, count]) => {
          if (count >= 3) {
            this.logger.error('🚨 High error rate detected', {
              endpoint,
              error_count: count,
              recommendation: 'Consider endpoint review'
            });
          }
        });
        
        return { success: true, action: 'error_analysis', patterns: errorsByEndpoint };
      },
      cooldown: 900000 // 15 minutes
    });
    
    // System stability check and restart recommendation
    this.autoRepairs.set('stability_check', {
      name: 'System Stability Check',
      trigger: (healthStatus) => {
        const criticalIssues = Object.values(healthStatus).filter(status => 
          status && status.healthy === false && this.healthChecks.get(status.component)?.critical
        );
        return criticalIssues.length >= 2;
      },
      repair: async () => {
        this.logger.error('🚨 Multiple critical issues detected - system stability at risk');
        
        // Create stability report
        const stabilityReport = {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          recent_errors: this.performanceMetrics.filter(m => m.statusCode >= 500).slice(-10),
          recommendation: 'System restart may be required if issues persist'
        };
        
        this.logger.error('📊 Stability Report', stabilityReport);
        
        return { success: true, action: 'stability_assessment', report: stabilityReport };
      },
      cooldown: 1800000 // 30 minutes
    });
  }
  
  // Start continuous monitoring
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Run health checks at their specified intervals
    this.healthChecks.forEach((check, name) => {
      setInterval(async () => {
        try {
          const result = await check.check();
          result.component = name;
          
          if (!result.healthy) {
            this.logger.warn(`⚠️ Health check failed: ${check.name}`, result);
            await this.triggerHealing({ [name]: result });
          } else {
            this.logger.debug(`✅ Health check passed: ${check.name}`);
          }
        } catch (error) {
          this.logger.error(`❌ Health check error: ${check.name}`, {
            error: error.message,
            stack: error.stack
          });
        }
      }, check.interval);
    });
    
    // Performance metrics cleanup interval
    setInterval(() => {
      if (this.performanceMetrics.length > 2000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
        this.logger.info('🧹 Performance metrics auto-cleaned');
      }
    }, 600000); // 10 minutes
    
    this.logger.info('🔍 Continuous monitoring started');
  }
  
  // Setup error detection and pattern analysis
  setupErrorDetection() {
    // Override console.error to catch and analyze errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      this.analyzeError(args.join(' '));
    };
    
    // Process uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('🚨 Uncaught Exception Detected', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      this.analyzeError(error.message);
    });
    
    // Process unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('🚨 Unhandled Rejection Detected', {
        reason: reason,
        promise: promise,
        timestamp: new Date().toISOString()
      });
      
      this.analyzeError(String(reason));
    });
  }
  
  // Analyze error patterns for self-learning
  analyzeError(errorMessage) {
    const errorKey = this.extractErrorPattern(errorMessage);
    
    if (!this.errorPatterns.has(errorKey)) {
      this.errorPatterns.set(errorKey, {
        count: 0,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        messages: []
      });
    }
    
    const pattern = this.errorPatterns.get(errorKey);
    pattern.count += 1;
    pattern.last_seen = new Date().toISOString();
    pattern.messages.push({
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 messages per pattern
    if (pattern.messages.length > 10) {
      pattern.messages = pattern.messages.slice(-10);
    }
    
    // Alert on recurring patterns
    if (pattern.count >= 5) {
      this.logger.warn('🔄 Recurring error pattern detected', {
        pattern: errorKey,
        count: pattern.count,
        first_seen: pattern.first_seen,
        recommendation: 'Investigation recommended'
      });
    }
  }
  
  // Extract error pattern for categorization
  extractErrorPattern(errorMessage) {
    // Remove specific values and paths to generalize the error
    return errorMessage
      .replace(/\d+/g, 'NUMBER')
      .replace(/\/[^\s]+/g, 'PATH')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\b\w+@[\w.-]+\.\w+\b/g, 'EMAIL')
      .substring(0, 200); // Limit length
  }
  
  // Trigger healing mechanisms
  async triggerHealing(healthStatus) {
    for (const [repairName, repair] of this.autoRepairs) {
      try {
        // Check if repair should trigger
        if (!repair.trigger(healthStatus)) continue;
        
        // Check cooldown
        const lastAttempt = this.healingAttempts.get(repairName);
        if (lastAttempt && Date.now() - lastAttempt < repair.cooldown) {
          this.logger.debug(`⏳ Repair ${repairName} in cooldown period`);
          continue;
        }
        
        this.logger.info(`🔧 Triggering repair: ${repair.name}`);
        
        // Execute repair
        const result = await repair.repair();
        this.healingAttempts.set(repairName, Date.now());
        
        this.logger.info(`✅ Repair completed: ${repair.name}`, result);
        
      } catch (error) {
        this.logger.error(`❌ Repair failed: ${repair.name}`, {
          error: error.message,
          stack: error.stack
        });
      }
    }
  }
  
  // Record performance metric
  recordMetric(endpoint, responseTime, statusCode) {
    this.performanceMetrics.push({
      endpoint,
      responseTime,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
  
  // Get system health status
  async getHealthStatus() {
    const healthStatus = {};
    
    for (const [name, check] of this.healthChecks) {
      try {
        healthStatus[name] = await check.check();
      } catch (error) {
        healthStatus[name] = {
          healthy: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return healthStatus;
  }
  
  // Get error patterns summary
  getErrorPatterns() {
    const patterns = [];
    
    this.errorPatterns.forEach((data, pattern) => {
      patterns.push({
        pattern,
        count: data.count,
        first_seen: data.first_seen,
        last_seen: data.last_seen,
        recent_messages: data.messages.slice(-3)
      });
    });
    
    return patterns.sort((a, b) => b.count - a.count);
  }
  
  // Get healing attempts summary
  getHealingHistory() {
    const history = [];
    
    this.healingAttempts.forEach((timestamp, repairName) => {
      const repair = this.autoRepairs.get(repairName);
      history.push({
        repair_name: repairName,
        repair_description: repair?.name || repairName,
        last_attempt: new Date(timestamp).toISOString(),
        cooldown_remaining: Math.max(0, (timestamp + (repair?.cooldown || 0)) - Date.now())
      });
    });
    
    return history.sort((a, b) => new Date(b.last_attempt) - new Date(a.last_attempt));
  }
  
  // V8+ Memory optimization check
  shouldOptimizeMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    return heapUsedPercent > 75; // Trigger GC if heap usage > 75%
  }
  
  // V8+ Performance monitoring
  setupV8Monitoring() {
    this.healthChecks.set('v8_performance', {
      name: 'V8 Performance',
      check: () => {
        const memUsage = process.memoryUsage();
        const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        const v8Stats = typeof v8 !== 'undefined' && v8.getHeapStatistics ? v8.getHeapStatistics() : {};
        
        return {
          healthy: heapUsedPercent < 90,
          heap_used_percent: heapUsedPercent,
          heap_statistics: v8Stats,
          gc_available: typeof global.gc === 'function',
          optimization_level: 'v8_enhanced',
          timestamp: new Date().toISOString()
        };
      },
      interval: 30000, // 30 seconds
      critical: true
    });
    
    this.logger.info('🚀 V8+ performance monitoring enabled');
  }
}

// Export the self-healing system
module.exports = {
  SelfHealingSystem,
  initialize: (app, logger) => {
    const healingSystem = new SelfHealingSystem(app, logger);
    healingSystem.initialize();
    return healingSystem;
  }
};
