// src/routes/mood.js - Advanced Mood Tracking with Analytics
const express = require('express');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// In-memory storage for demo (replace with database in production)
let moodEntries = [];
let moodIdCounter = 1;

// Mood analysis functions
function analyzeMoodTrend(entries, days = 7) {
  if (entries.length < 2) return { trend: 'insufficient_data', change: 0 };
  
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentEntries = entries.filter(entry => new Date(entry.timestamp) >= cutoffDate);
  
  if (recentEntries.length < 2) return { trend: 'insufficient_data', change: 0 };
  
  const firstMood = recentEntries[recentEntries.length - 1].mood;
  const lastMood = recentEntries[0].mood;
  const change = lastMood - firstMood;
  
  let trend = 'stable';
  if (change > 1) trend = 'improving';
  else if (change < -1) trend = 'declining';
  
  return { trend, change, days };
}

function generateMoodInsights(entries) {
  if (entries.length < 3) {
    return ['Keep tracking your mood to get personalized insights!'];
  }
  
  const insights = [];
  const averageMood = entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length;
  const averageEnergy = entries.reduce((sum, entry) => sum + (entry.energy || 5), 0) / entries.length;
  const averageStress = entries.reduce((sum, entry) => sum + (entry.stress || 5), 0) / entries.length;
  
  // Mood insights
  if (averageMood >= 7) {
    insights.push('You\'ve been maintaining good mood levels! Keep up the positive momentum.');
  } else if (averageMood <= 4) {
    insights.push('Your mood has been lower recently. Consider reaching out for support or trying mood-boosting activities.');
  }
  
  // Energy insights
  if (averageEnergy >= 7) {
    insights.push('Your energy levels are strong! This often correlates with better overall wellbeing.');
  } else if (averageEnergy <= 4) {
    insights.push('Low energy detected. Ensure you\'re getting enough sleep, nutrition, and physical activity.');
  }
  
  // Stress insights
  if (averageStress >= 7) {
    insights.push('Stress levels are elevated. Consider stress management techniques like deep breathing or meditation.');
  } else if (averageStress <= 3) {
    insights.push('You\'re managing stress well! This is great for your mental health.');
  }
  
  // Sleep insights
  const entriesWithSleep = entries.filter(e => e.sleep_hours);
  if (entriesWithSleep.length > 0) {
    const averageSleep = entriesWithSleep.reduce((sum, entry) => sum + entry.sleep_hours, 0) / entriesWithSleep.length;
    if (averageSleep < 6) {
      insights.push('You may be getting insufficient sleep. Aim for 7-9 hours per night for optimal mental health.');
    } else if (averageSleep >= 8) {
      insights.push('Great sleep habits! Quality rest is essential for emotional regulation.');
    }
  }
  
  return insights;
}

// Record mood entry
function recordMood(req, res) {
  try {
    const { mood, energy, stress, sleep_hours, notes, activities = [] } = req.body;
    
    // Validation
    if (mood === undefined || typeof mood !== 'number') {
      return res.status(400).json({
        error: 'Mood is required and must be a number',
        timestamp: new Date().toISOString()
      });
    }
    
    if (mood < 1 || mood > 10) {
      return res.status(400).json({
        error: 'Mood must be between 1 and 10',
        timestamp: new Date().toISOString()
      });
    }
    
    if (energy !== undefined && (energy < 1 || energy > 10)) {
      return res.status(400).json({
        error: 'Energy must be between 1 and 10',
        timestamp: new Date().toISOString()
      });
    }
    
    if (stress !== undefined && (stress < 1 || stress > 10)) {
      return res.status(400).json({
        error: 'Stress must be between 1 and 10',
        timestamp: new Date().toISOString()
      });
    }
    
    if (sleep_hours !== undefined && (sleep_hours < 0 || sleep_hours > 24)) {
      return res.status(400).json({
        error: 'Sleep hours must be between 0 and 24',
        timestamp: new Date().toISOString()
      });
    }
    
    // Create mood entry
    const moodEntry = {
      id: moodIdCounter++,
      mood,
      energy,
      stress,
      sleep_hours,
      notes,
      activities,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    };
    
    moodEntries.unshift(moodEntry); // Add to beginning for chronological order
    
    // Generate trend analysis
    const trendAnalysis = analyzeMoodTrend(moodEntries);
    
    logger.info('Mood entry recorded', {
      entryId: moodEntry.id,
      mood,
      energy,
      stress,
      trend: trendAnalysis.trend
    });
    
    res.status(201).json({
      success: true,
      entry: moodEntry,
      trend_analysis: trendAnalysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Mood recording failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Mood recording failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Get mood data with analytics
function getMoodData(req, res) {
  try {
    const { days = 30, format = 'detailed' } = req.query;
    
    const daysNum = parseInt(days);
    const cutoffDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    
    // Filter entries by date range
    const filteredEntries = moodEntries.filter(entry => 
      new Date(entry.timestamp) >= cutoffDate
    );
    
    // Calculate statistics
    const stats = {
      total_entries: filteredEntries.length,
      date_range: {
        from: cutoffDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        days: daysNum
      }
    };
    
    if (filteredEntries.length > 0) {
      stats.averages = {
        mood: Math.round((filteredEntries.reduce((sum, e) => sum + e.mood, 0) / filteredEntries.length) * 10) / 10,
        energy: filteredEntries.filter(e => e.energy).length > 0 ? 
          Math.round((filteredEntries.filter(e => e.energy).reduce((sum, e) => sum + e.energy, 0) / 
          filteredEntries.filter(e => e.energy).length) * 10) / 10 : null,
        stress: filteredEntries.filter(e => e.stress).length > 0 ? 
          Math.round((filteredEntries.filter(e => e.stress).reduce((sum, e) => sum + e.stress, 0) / 
          filteredEntries.filter(e => e.stress).length) * 10) / 10 : null,
        sleep_hours: filteredEntries.filter(e => e.sleep_hours).length > 0 ? 
          Math.round((filteredEntries.filter(e => e.sleep_hours).reduce((sum, e) => sum + e.sleep_hours, 0) / 
          filteredEntries.filter(e => e.sleep_hours).length) * 10) / 10 : null
      };
      
      stats.ranges = {
        mood: {
          min: Math.min(...filteredEntries.map(e => e.mood)),
          max: Math.max(...filteredEntries.map(e => e.mood))
        }
      };
      
      if (filteredEntries.some(e => e.energy)) {
        stats.ranges.energy = {
          min: Math.min(...filteredEntries.filter(e => e.energy).map(e => e.energy)),
          max: Math.max(...filteredEntries.filter(e => e.energy).map(e => e.energy))
        };
      }
      
      if (filteredEntries.some(e => e.stress)) {
        stats.ranges.stress = {
          min: Math.min(...filteredEntries.filter(e => e.stress).map(e => e.stress)),
          max: Math.max(...filteredEntries.filter(e => e.stress).map(e => e.stress))
        };
      }
    }
    
    // Generate trend analysis and insights
    const trendAnalysis = analyzeMoodTrend(filteredEntries, Math.min(daysNum, 7));
    const insights = generateMoodInsights(filteredEntries);
    
    // Prepare response based on format
    const response = {
      stats,
      trend_analysis: trendAnalysis,
      insights,
      timestamp: new Date().toISOString()
    };
    
    if (format === 'detailed') {
      response.entries = filteredEntries;
    } else if (format === 'summary') {
      // Group by date for chart data
      const dailySummary = {};
      filteredEntries.forEach(entry => {
        const date = entry.date;
        if (!dailySummary[date]) {
          dailySummary[date] = { date, entries: [] };
        }
        dailySummary[date].entries.push(entry);
      });
      
      response.daily_summary = Object.values(dailySummary).map(day => ({
        date: day.date,
        count: day.entries.length,
        average_mood: Math.round((day.entries.reduce((sum, e) => sum + e.mood, 0) / day.entries.length) * 10) / 10,
        average_energy: day.entries.filter(e => e.energy).length > 0 ? 
          Math.round((day.entries.filter(e => e.energy).reduce((sum, e) => sum + e.energy, 0) / 
          day.entries.filter(e => e.energy).length) * 10) / 10 : null,
        average_stress: day.entries.filter(e => e.stress).length > 0 ? 
          Math.round((day.entries.filter(e => e.stress).reduce((sum, e) => sum + e.stress, 0) / 
          day.entries.filter(e => e.stress).length) * 10) / 10 : null
      })).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('Mood data retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Mood data retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Export functions for server.js
module.exports = {
  recordMood,
  getMoodData,
  router
};
