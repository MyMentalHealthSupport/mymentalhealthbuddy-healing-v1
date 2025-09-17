// src/routes/tts.js - Advanced TTS with OpenAI + AWS Polly
const express = require('express');
const router = express.Router();
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// OpenAI TTS implementation
async function generateOpenAITTS(text, voice, model, format) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'tts-1-hd',
      voice: voice || 'nova',
      input: text,
      response_format: format || 'mp3'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS failed: ${error}`);
  }

  return await response.arrayBuffer();
}

// AWS Polly TTS implementation (fallback)
async function generatePollyTTS(text, voice, format) {
  if (!process.env.AWS_POLLY_ACCESS_KEY_ID) {
    throw new Error('AWS Polly credentials not configured');
  }

  const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
  
  const pollyClient = new PollyClient({
    region: process.env.AWS_POLLY_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_POLLY_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_POLLY_SECRET_ACCESS_KEY
    }
  });

  const command = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: format === 'wav' ? 'pcm' : 'mp3',
    VoiceId: voice || 'Joanna',
    Engine: 'neural'
  });

  const response = await pollyClient.send(command);
  return await response.AudioStream.transformToByteArray();
}

// Main TTS endpoint
router.post('/', async (req, res) => {
  try {
    const { text, voice, format, model, provider } = req.body || {};
    
    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }

    if (text.length > 4000) {
      return res.status(400).json({ 
        error: 'Text exceeds maximum length of 4000 characters',
        length: text.length,
        timestamp: new Date().toISOString()
      });
    }

    const selectedProvider = provider || 'openai';
    const selectedFormat = format || 'mp3';
    const selectedVoice = voice || 'nova';
    const selectedModel = model || 'tts-1-hd';

    logger.info('TTS request received', {
      textLength: text.length,
      voice: selectedVoice,
      format: selectedFormat,
      provider: selectedProvider
    });

    let audioBuffer;
    let actualProvider = selectedProvider;

    try {
      if (selectedProvider === 'openai' && process.env.OPENAI_API_KEY) {
        audioBuffer = await generateOpenAITTS(text, selectedVoice, selectedModel, selectedFormat);
      } else if (selectedProvider === 'polly' || !process.env.OPENAI_API_KEY) {
        audioBuffer = await generatePollyTTS(text, selectedVoice, selectedFormat);
        actualProvider = 'polly';
      } else {
        throw new Error('No TTS provider configured');
      }
    } catch (primaryError) {
      logger.warn('Primary TTS provider failed, trying fallback', {
        provider: selectedProvider,
        error: primaryError.message
      });

      // Fallback logic
      try {
        if (selectedProvider === 'openai' && process.env.AWS_POLLY_ACCESS_KEY_ID) {
          audioBuffer = await generatePollyTTS(text, selectedVoice, selectedFormat);
          actualProvider = 'polly';
        } else if (selectedProvider === 'polly' && process.env.OPENAI_API_KEY) {
          audioBuffer = await generateOpenAITTS(text, selectedVoice, selectedModel, selectedFormat);
          actualProvider = 'openai';
        } else {
          throw primaryError;
        }
      } catch (fallbackError) {
        logger.error('Both TTS providers failed', {
          primaryError: primaryError.message,
          fallbackError: fallbackError.message
        });
        throw fallbackError;
      }
    }

    // Set appropriate content type
    const contentType = selectedFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
    
    res.set({
      'Content-Type': contentType,
      'Content-Length': audioBuffer.byteLength,
      'X-TTS-Provider': actualProvider,
      'X-TTS-Voice': selectedVoice,
      'X-TTS-Format': selectedFormat,
      'Cache-Control': 'public, max-age=3600'
    });

    res.send(Buffer.from(audioBuffer));

    logger.info('TTS response sent successfully', {
      provider: actualProvider,
      audioSize: audioBuffer.byteLength,
      voice: selectedVoice,
      format: selectedFormat
    });

  } catch (error) {
    logger.error('TTS generation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'TTS generation failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// TTS voices endpoint
router.get('/voices', (req, res) => {
  const voices = {
    openai: [
      { id: 'alloy', name: 'Alloy', gender: 'neutral' },
      { id: 'echo', name: 'Echo', gender: 'neutral' },
      { id: 'fable', name: 'Fable', gender: 'neutral' },
      { id: 'onyx', name: 'Onyx', gender: 'neutral' },
      { id: 'nova', name: 'Nova', gender: 'female' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female' }
    ],
    polly: [
      { id: 'Joanna', name: 'Joanna', gender: 'female', language: 'en-US' },
      { id: 'Matthew', name: 'Matthew', gender: 'male', language: 'en-US' },
      { id: 'Ivy', name: 'Ivy', gender: 'female', language: 'en-US' },
      { id: 'Justin', name: 'Justin', gender: 'male', language: 'en-US' },
      { id: 'Kendra', name: 'Kendra', gender: 'female', language: 'en-US' },
      { id: 'Kimberly', name: 'Kimberly', gender: 'female', language: 'en-US' }
    ]
  };

  res.json({
    voices,
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      polly: !!(process.env.AWS_POLLY_ACCESS_KEY_ID && process.env.AWS_POLLY_SECRET_ACCESS_KEY)
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
