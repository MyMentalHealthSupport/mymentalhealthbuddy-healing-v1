// src/routes/analytics.js - Advanced Analytics and Insights
const express = require('express');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Mock data storage (in production, this would come from database)
let analyticsData = {
  dailyStats: [],
  userEngagement: [],
  featureUsage: {},
  performanceMetrics: []
};

// Analytics collection functions
function collectDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  const existingStats = analyticsData.dailyStats.find(stat => stat.date === today);
  
  if (existingStats) {
    existingStats.page_views += 1;
    existingStats.last_updated = new Date().toISOString();
  } else {
    analyticsData.dailyStats.push({
      date: today,
      page_views: 1,
      unique_visitors: 1,
      journal_entries: 0,
      mood_entries: 0,
      tts_requests: 0,
      crisis_reports: 0,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    });
  }
}

function trackFeatureUsage(feature, action = 'used') {
  if (!analyticsData.featureUsage[feature]) {
    analyticsData.featureUsage[feature] = {
      total_uses: 0,
      unique_users: new Set(),
      actions: {},
      first_used: new Date().toISOString(),
      last_used: new Date().toISOString()
    };
  }
  
  analyticsData.featureUsage[feature].total_uses += 1;
  analyticsData.featureUsage[feature].last_used = new Date().toISOString();
  
  if (!analyticsData.featureUsage[feature].actions[action]) {
    analyticsData.featureUsage[feature].actions[action] = 0;
  }
  analyticsData.featureUsage[feature].actions[action] += 1;
}

function trackUserEngagement(userId, activity, duration = 0) {
  const engagement = {
    user_id: userId,
    activity,
    duration_seconds: duration,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };
  
  analyticsData.userEngagement.push(engagement);
  
  // Keep only last 1000 entries to prevent memory issues
  if (analyticsData.userEngagement.length > 1000) {
    analyticsData.userEngagement = analyticsData.userEngagement.slice(-1000);
  }
}

function recordPerformanceMetric(endpoint, responseTime, statusCode) {
  const metric = {
    endpoint,
    response_time_ms: responseTime,
    status_code: statusCode,
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };
  
  analyticsData.performanceMetrics.push(metric);
  
  // Keep only last 1000 entries
  if (analyticsData.performanceMetrics.length > 1000) {
    analyticsData.performanceMetrics = analyticsData.performanceMetrics.slice(-1000);
  }
}

// Generate insights based on analytics data
function generateInsights(timeframe = 30) {
  const insights = [];
  const cutoffDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  // Daily stats insights
  const recentStats = analyticsData.dailyStats.filter(stat => 
    new Date(stat.date) >= cutoffDate
  );
  
  if (recentStats.length > 0) {
    const totalPageViews = recentStats.reduce((sum, stat) => sum + stat.page_views, 0);
    const totalJournalEntries = recentStats.reduce((sum, stat) => sum + stat.journal_entries, 0);
    const totalMoodEntries = recentStats.reduce((sum, stat) => sum + stat.mood_entries, 0);
    const avgDailyViews = Math.round(totalPageViews / recentStats.length);
    
    insights.push({
      type: 'engagement',
      title: 'User Engagement Trends',
      description: `Over the last ${timeframe} days, users viewed an average of ${avgDailyViews} pages per day`,
      metrics: {
        total_page_views: totalPageViews,
        total_journal_entries: totalJournalEntries,
        total_mood_entries: totalMoodEntries,
        average_daily_views: avgDailyViews
      }
    });
  }
  
  // Feature usage insights
  const popularFeatures = Object.entries(analyticsData.featureUsage)
    .sort(([,a], [,b]) => b.total_uses - a.total_uses)
    .slice(0, 5);
  
  if (popularFeatures.length > 0) {
    insights.push({
      type: 'features',
      title: 'Most Popular Features',
      description: `The top feature is ${popularFeatures[0][0]} with ${popularFeatures[0][1].total_uses} uses`,
      metrics: {
        top_features: popularFeatures.map(([feature, data]) => ({
          feature,
          total_uses: data.total_uses,
          last_used: data.last_used
        }))
      }
    });
  }
  
  // Performance insights
  const recentPerformance = analyticsData.performanceMetrics.filter(metric => 
    new Date(metric.timestamp) >= cutoffDate
  );
  
  if (recentPerformance.length > 0) {
    const avgResponseTime = Math.round(
      recentPerformance.reduce((sum, metric) => sum + metric.response_time_ms, 0) / recentPerformance.length
    );
    
    const errorRate = (recentPerformance.filter(metric => metric.status_code >= 400).length / recentPerformance.length) * 100;
    
    insights.push({
      type: 'performance',
      title: 'System Performance',
      description: `Average response time is ${avgResponseTime}ms with ${errorRate.toFixed(1)}% error rate`,
      metrics: {
        average_response_time_ms: avgResponseTime,
        error_rate_percent: Math.round(errorRate * 10) / 10,
        total_requests: recentPerformance.length
      }
    });
  }
  
  // User activity patterns
  const recentActivity = analyticsData.userEngagement.filter(activity => 
    new Date(activity.timestamp) >= cutoffDate
  );
  
  if (recentActivity.length > 0) {
    const activityByHour = {};
    recentActivity.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      activityByHour[hour] = (activityByHour[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(activityByHour)
      .sort(([,a], [,b]) => b - a)[0];
    
    insights.push({
      type: 'usage_patterns',
      title: 'Usage Patterns',
      description: `Peak activity occurs at ${peakHour[0]}:00 with ${peakHour[1]} activities`,
      metrics: {
        peak_hour: parseInt(peakHour[0]),
        peak_activity_count: peakHour[1],
        total_activities: recentActivity.length,
        activity_by_hour: activityByHour
      }
    });
  }
  
  return insights;
}

// Get comprehensive analytics
function getAnalytics(req, res) {
  try {
    const { timeframe = 30, include_raw = false } = req.query;
    const timeframeDays = parseInt(timeframe);
    const cutoffDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    
    // Filter data by timeframe
    const filteredStats = analyticsData.dailyStats.filter(stat => 
      new Date(stat.date) >= cutoffDate
    );
    
    const filteredEngagement = analyticsData.userEngagement.filter(activity => 
      new Date(activity.timestamp) >= cutoffDate
    );
    
    const filteredPerformance = analyticsData.performanceMetrics.filter(metric => 
      new Date(metric.timestamp) >= cutoffDate
    );
    
    // Calculate summary statistics
    const summary = {
      timeframe: {
        days: timeframeDays,
        from: cutoffDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      totals: {
        page_views: filteredStats.reduce((sum, stat) => sum + stat.page_views, 0),
        journal_entries: filteredStats.reduce((sum, stat) => sum + stat.journal_entries, 0),
        mood_entries: filteredStats.reduce((sum, stat) => sum + stat.mood_entries, 0),
        tts_requests: filteredStats.reduce((sum, stat) => sum + stat.tts_requests, 0),
        crisis_reports: filteredStats.reduce((sum, stat) => sum + stat.crisis_reports, 0),
        user_activities: filteredEngagement.length
      },
      averages: {},
      trends: {}
    };
    
    // Calculate averages
    if (filteredStats.length > 0) {
      summary.averages = {
        daily_page_views: Math.round(summary.totals.page_views / filteredStats.length),
        daily_journal_entries: Math.round(summary.totals.journal_entries / filteredStats.length),
        daily_mood_entries: Math.round(summary.totals.mood_entries / filteredStats.length)
      };
    }
    
    // Calculate trends (compare first half vs second half of timeframe)
    if (filteredStats.length >= 4) {
      const midpoint = Math.floor(filteredStats.length / 2);
      const firstHalf = filteredStats.slice(0, midpoint);
      const secondHalf = filteredStats.slice(midpoint);
      
      const firstHalfAvg = firstHalf.reduce((sum, stat) => sum + stat.page_views, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, stat) => sum + stat.page_views, 0) / secondHalf.length;
      
      const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      summary.trends = {
        page_views: {
          direction: trendPercentage > 5 ? 'increasing' : trendPercentage < -5 ? 'decreasing' : 'stable',
          percentage: Math.round(Math.abs(trendPercentage)),
          description: `Page views are ${trendPercentage > 5 ? 'increasing' : trendPercentage < -5 ? 'decreasing' : 'stable'}`
        }
      };
    }
    
    // Generate insights
    const insights = generateInsights(timeframeDays);
    
    // Build response
    const response = {
      summary,
      insights,
      feature_usage: analyticsData.featureUsage,
      timestamp: new Date().toISOString()
    };
    
    // Include raw data if requested
    if (include_raw === 'true') {
      response.raw_data = {
        daily_stats: filteredStats,
        user_engagement: filteredEngagement.slice(-100), // Last 100 activities
        performance_metrics: filteredPerformance.slice(-100) // Last 100 metrics
      };
    }
    
    res.json(response);
    
    logger.info('Analytics data retrieved', {
      timeframe: timeframeDays,
      include_raw: include_raw === 'true',
      insights_count: insights.length
    });
    
  } catch (error) {
    logger.error('Analytics retrieval failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Analytics retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Track page view
router.post('/pageview', (req, res) => {
  try {
    const { page, user_id, session_id } = req.body;
    
    collectDailyStats();
    
    if (user_id) {
      trackUserEngagement(user_id, `page_view:${page}`);
    }
    
    logger.info('Page view tracked', { page, user_id, session_id });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Page view tracking failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Page view tracking failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Track custom event
router.post('/event', (req, res) => {
  try {
    const { event_name, feature, action, user_id, properties = {} } = req.body;
    
    if (!event_name) {
      return res.status(400).json({
        error: 'event_name is required',
        timestamp: new Date().toISOString()
      });
    }
    
    trackFeatureUsage(feature || event_name, action || 'triggered');
    
    if (user_id) {
      trackUserEngagement(user_id, event_name, properties.duration || 0);
    }
    
    logger.info('Custom event tracked', {
      event_name,
      feature,
      action,
      user_id,
      properties
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Event tracking failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Event tracking failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize with some sample data for demonstration
collectDailyStats();
trackFeatureUsage('journal', 'entry_created');
trackFeatureUsage('mood_tracking', 'mood_recorded');
trackFeatureUsage('tts', 'voice_generated');
trackUserEngagement('demo_user', 'platform_access', 300);

// Export analytics functions
module.exports = {
  getAnalytics,
  collectDailyStats,
  trackFeatureUsage,
  trackUserEngagement,
  recordPerformanceMetric,
  generateInsights,
  router
};
