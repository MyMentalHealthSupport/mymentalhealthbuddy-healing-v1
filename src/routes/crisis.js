// src/routes/crisis.js - Crisis Support and Emergency Resources
const express = require('express');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Crisis reports storage (in production, this should be in a secure database)
let crisisReports = [];
let reportIdCounter = 1;

// Comprehensive crisis resources
const CRISIS_RESOURCES = {
  immediate_emergency: {
    title: '🚨 Immediate Emergency',
    description: 'If you are in immediate danger or having thoughts of suicide',
    contacts: [
      {
        name: 'Emergency Services',
        number: '911',
        description: 'Call 911 for immediate emergency assistance',
        available: '24/7'
      }
    ]
  },
  suicide_prevention: {
    title: '💚 Suicide Prevention',
    description: 'Free, confidential support for people in distress',
    contacts: [
      {
        name: 'Suicide & Crisis Lifeline',
        number: '988',
        description: 'Free and confidential emotional support 24/7',
        available: '24/7',
        website: 'https://suicidepreventionlifeline.org'
      },
      {
        name: 'Crisis Text Line',
        number: '741741',
        description: 'Text HOME to 741741 for crisis support via text',
        available: '24/7',
        website: 'https://crisistextline.org'
      }
    ]
  },
  mental_health_support: {
    title: '🧠 Mental Health Support',
    description: 'Professional mental health resources and support',
    contacts: [
      {
        name: 'NAMI National Helpline',
        number: '800-950-6264',
        description: 'Information, referrals and support for mental health',
        available: 'Mon-Fri 10am-10pm ET',
        website: 'https://nami.org'
      },
      {
        name: 'SAMHSA National Helpline',
        number: '800-662-4357',
        description: 'Treatment referral and information service',
        available: '24/7',
        website: 'https://samhsa.gov'
      }
    ]
  },
  specialized_support: {
    title: '🤝 Specialized Support',
    description: 'Support for specific groups and situations',
    contacts: [
      {
        name: 'LGBT National Hotline',
        number: '888-843-4564',
        description: 'Support for LGBTQ+ individuals',
        available: 'Daily 4pm-12am ET',
        website: 'https://lgbthotline.org'
      },
      {
        name: 'Veterans Crisis Line',
        number: '988',
        description: 'Press 1 after calling 988 for veteran-specific support',
        available: '24/7',
        website: 'https://veteranscrisisline.net'
      },
      {
        name: 'Teen Line',
        number: '800-852-8336',
        description: 'Teen-to-teen support and crisis intervention',
        available: 'Daily 6pm-10pm PT',
        website: 'https://teenline.org'
      }
    ]
  },
  self_care_resources: {
    title: '🌟 Immediate Self-Care',
    description: 'Things you can do right now to help yourself',
    techniques: [
      {
        name: 'Deep Breathing',
        description: 'Take slow, deep breaths. Inhale for 4 counts, hold for 4, exhale for 6.',
        duration: '2-5 minutes'
      },
      {
        name: 'Grounding Exercise',
        description: 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
        duration: '3-10 minutes'
      },
      {
        name: 'Progressive Muscle Relaxation',
        description: 'Tense and then relax each muscle group in your body, starting from your toes.',
        duration: '10-20 minutes'
      },
      {
        name: 'Mindful Walking',
        description: 'Take a slow walk, focusing on each step and your surroundings.',
        duration: '5-30 minutes'
      }
    ]
  }
};

// Safety planning resources
const SAFETY_PLAN_TEMPLATE = {
  warning_signs: [
    'Feeling hopeless or trapped',
    'Intense emotional pain',
    'Thinking about death or suicide',
    'Withdrawing from others',
    'Changes in sleep or appetite'
  ],
  coping_strategies: [
    'Call a trusted friend or family member',
    'Use breathing exercises or meditation',
    'Go for a walk or do physical exercise',
    'Listen to calming music',
    'Write in a journal',
    'Take a warm bath or shower'
  ],
  social_support: [
    'List trusted friends and family members',
    'Include their phone numbers',
    'Mental health professionals',
    'Support group contacts'
  ],
  professional_help: [
    'Therapist or counselor contact information',
    'Primary care doctor',
    'Local emergency room',
    'Crisis hotlines'
  ],
  environment_safety: [
    'Remove or secure potential means of harm',
    'Stay in safe, supportive environments',
    'Avoid alcohol and drugs',
    'Stay with trusted people when feeling unsafe'
  ]
};

// Get crisis resources
function getCrisisResources(req, res) {
  try {
    const { category, format = 'full' } = req.query;
    
    let resources = CRISIS_RESOURCES;
    
    // Filter by category if specified
    if (category && CRISIS_RESOURCES[category]) {
      resources = { [category]: CRISIS_RESOURCES[category] };
    }
    
    const response = {
      resources,
      safety_plan: format === 'full' ? SAFETY_PLAN_TEMPLATE : undefined,
      emergency_numbers: {
        emergency: '911',
        suicide_prevention: '988',
        crisis_text: '741741'
      },
      timestamp: new Date().toISOString()
    };
    
    logger.info('Crisis resources accessed', {
      category: category || 'all',
      format
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('Crisis resources retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Crisis resources retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      emergency_contacts: {
        emergency: '911',
        suicide_prevention: '988'
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Report crisis situation
function reportCrisis(req, res) {
  try {
    const { 
      severity, 
      description, 
      immediate_danger = false, 
      contact_info,
      location,
      support_needed 
    } = req.body;
    
    // Validation
    if (!severity || !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        error: 'Severity is required and must be one of: low, medium, high, critical',
        timestamp: new Date().toISOString()
      });
    }
    
    // Create crisis report
    const report = {
      id: reportIdCounter++,
      severity,
      description,
      immediate_danger,
      contact_info,
      location,
      support_needed,
      timestamp: new Date().toISOString(),
      status: 'reported',
      follow_up_needed: severity === 'high' || severity === 'critical' || immediate_danger
    };
    
    crisisReports.push(report);
    
    // Log crisis report for immediate attention
    const logLevel = immediate_danger || severity === 'critical' ? 'error' : 
                    severity === 'high' ? 'warn' : 'info';
    
    logger.log(logLevel, 'CRISIS REPORT SUBMITTED', {
      reportId: report.id,
      severity,
      immediate_danger,
      timestamp: report.timestamp,
      follow_up_needed: report.follow_up_needed
    });
    
    // Prepare response with appropriate resources
    const responseResources = immediate_danger || severity === 'critical' ? 
      CRISIS_RESOURCES.immediate_emergency : 
      CRISIS_RESOURCES.suicide_prevention;
    
    res.status(201).json({
      success: true,
      report_id: report.id,
      message: immediate_danger ? 
        'Crisis report submitted. Please call 911 immediately if you are in immediate danger.' :
        'Crisis report submitted. Help is available - please reach out using the resources below.',
      immediate_resources: responseResources,
      follow_up: report.follow_up_needed ? 
        'A mental health professional will follow up on this report within 24 hours.' : 
        'Please continue to use the self-care resources and reach out for support as needed.',
      safety_resources: CRISIS_RESOURCES.self_care_resources,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Crisis report submission failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Crisis report submission failed',
      message: 'If this is an emergency, please call 911 immediately.',
      emergency_contacts: {
        emergency: '911',
        suicide_prevention: '988',
        crisis_text: '741741'
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Get safety plan
router.get('/safety-plan', (req, res) => {
  try {
    res.json({
      safety_plan: SAFETY_PLAN_TEMPLATE,
      instructions: {
        step1: 'Identify your personal warning signs',
        step2: 'List your internal coping strategies',
        step3: 'Identify people and social settings that provide distraction',
        step4: 'List people you can ask for help',
        step5: 'Contact mental health professionals or agencies',
        step6: 'Make your environment safe'
      },
      emergency_contacts: {
        emergency: '911',
        suicide_prevention: '988',
        crisis_text: '741741'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Safety plan retrieval failed', {
      error: error.message
    });
    
    res.status(500).json({
      error: 'Safety plan retrieval failed',
      emergency_contacts: {
        emergency: '911',
        suicide_prevention: '988'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Export functions for server.js
module.exports = {
  getCrisisResources,
  reportCrisis,
  router
};
