// src/routes/journal.js - Advanced Journal System with Crisis Detection
const express = require('express');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// In-memory storage for demo (replace with database in production)
let journalEntries = [];
let entryIdCounter = 1;

// Crisis keywords for detection
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'worthless', 'hopeless',
  'self-harm', 'hurt myself', 'cut myself', 'overdose', 'die',
  'depressed', 'anxiety attack', 'panic', 'cant cope', 'overwhelming'
];

// Detect crisis indicators in text
function detectCrisis(text) {
  const lowerText = text.toLowerCase();
  const foundKeywords = CRISIS_KEYWORDS.filter(keyword => 
    lowerText.includes(keyword)
  );
  
  return {
    detected: foundKeywords.length > 0,
    keywords: foundKeywords,
    severity: foundKeywords.length >= 3 ? 'high' : foundKeywords.length >= 1 ? 'medium' : 'low'
  };
}

// Generate insights based on journal content
function generateInsights(content, mood_before, mood_after) {
  const insights = [];
  const wordCount = content.split(' ').length;
  const moodImprovement = mood_after - mood_before;
  
  if (wordCount > 200) {
    insights.push('You wrote a detailed entry today - expressing yourself fully can be very therapeutic.');
  }
  
  if (moodImprovement > 2) {
    insights.push('Great improvement in mood! Journaling seems to be helping you process your feelings.');
  } else if (moodImprovement < -1) {
    insights.push('Your mood declined during this entry. Consider reaching out for support if needed.');
  }
  
  if (content.toLowerCase().includes('grateful') || content.toLowerCase().includes('thankful')) {
    insights.push('Gratitude practice detected! This is excellent for mental wellbeing.');
  }
  
  return insights;
}

// Create journal entry
function createEntry(req, res) {
  try {
    const { content, mood_before, mood_after, tags = [] } = req.body;
    
    // Validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Content is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }
    
    if (content.length > 10000) {
      return res.status(400).json({
        error: 'Content exceeds maximum length of 10,000 characters',
        length: content.length,
        timestamp: new Date().toISOString()
      });
    }
    
    if (mood_before !== undefined && (mood_before < 1 || mood_before > 10)) {
      return res.status(400).json({
        error: 'mood_before must be between 1 and 10',
        timestamp: new Date().toISOString()
      });
    }
    
    if (mood_after !== undefined && (mood_after < 1 || mood_after > 10)) {
      return res.status(400).json({
        error: 'mood_after must be between 1 and 10',
        timestamp: new Date().toISOString()
      });
    }
    
    // Crisis detection
    const crisisAnalysis = detectCrisis(content);
    
    // Generate insights
    const insights = generateInsights(content, mood_before || 5, mood_after || 5);
    
    // Create entry
    const entry = {
      id: entryIdCounter++,
      content,
      mood_before,
      mood_after,
      tags,
      crisis_analysis: crisisAnalysis,
      insights,
      word_count: content.split(' ').length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    journalEntries.push(entry);
    
    logger.info('Journal entry created', {
      entryId: entry.id,
      wordCount: entry.word_count,
      crisisDetected: crisisAnalysis.detected,
      moodChange: mood_after ? mood_after - (mood_before || 5) : null
    });
    
    // Log crisis detection for immediate attention
    if (crisisAnalysis.detected) {
      logger.warn('CRISIS INDICATORS DETECTED', {
        entryId: entry.id,
        severity: crisisAnalysis.severity,
        keywords: crisisAnalysis.keywords,
        timestamp: entry.created_at
      });
    }
    
    res.status(201).json({
      success: true,
      entry: {
        ...entry,
        // Don't return sensitive content in response, just metadata
        content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      },
      crisis_resources: crisisAnalysis.detected ? {
        emergency: '911',
        suicide_prevention: '988',
        crisis_text: 'Text HOME to 741741'
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Journal entry creation failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Journal entry creation failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Get journal entries
function getEntries(req, res) {
  try {
    const { page = 1, limit = 10, tags, from_date, to_date } = req.query;
    
    let filteredEntries = [...journalEntries];
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredEntries = filteredEntries.filter(entry => 
        entry.tags.some(tag => tagArray.includes(tag.toLowerCase()))
      );
    }
    
    // Filter by date range
    if (from_date) {
      const fromDate = new Date(from_date);
      filteredEntries = filteredEntries.filter(entry => 
        new Date(entry.created_at) >= fromDate
      );
    }
    
    if (to_date) {
      const toDate = new Date(to_date);
      filteredEntries = filteredEntries.filter(entry => 
        new Date(entry.created_at) <= toDate
      );
    }
    
    // Sort by creation date (newest first)
    filteredEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);
    
    // Calculate statistics
    const stats = {
      total_entries: filteredEntries.length,
      total_words: filteredEntries.reduce((sum, entry) => sum + entry.word_count, 0),
      average_mood_before: filteredEntries.length > 0 ? 
        filteredEntries.filter(e => e.mood_before).reduce((sum, e) => sum + e.mood_before, 0) / 
        filteredEntries.filter(e => e.mood_before).length : null,
      average_mood_after: filteredEntries.length > 0 ? 
        filteredEntries.filter(e => e.mood_after).reduce((sum, e) => sum + e.mood_after, 0) / 
        filteredEntries.filter(e => e.mood_after).length : null,
      crisis_entries: filteredEntries.filter(e => e.crisis_analysis.detected).length
    };
    
    res.json({
      entries: paginatedEntries.map(entry => ({
        ...entry,
        // Truncate content for list view
        content: entry.content.substring(0, 200) + (entry.content.length > 200 ? '...' : '')
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredEntries.length,
        pages: Math.ceil(filteredEntries.length / limitNum)
      },
      stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Journal entries retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Journal entries retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Get specific journal entry
router.get('/:id', (req, res) => {
  try {
    const entryId = parseInt(req.params.id);
    const entry = journalEntries.find(e => e.id === entryId);
    
    if (!entry) {
      return res.status(404).json({
        error: 'Journal entry not found',
        id: entryId,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      entry,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Journal entry retrieval failed', {
      error: error.message,
      entryId: req.params.id
    });
    
    res.status(500).json({
      error: 'Journal entry retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Export functions for server.js
module.exports = {
  createEntry,
  getEntries,
  router
};
