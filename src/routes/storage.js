// src/routes/storage.js - Advanced S3 Storage with Deduplication
const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const winston = require('winston');
const router = express.Router();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Initialize S3 client
function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

// Generate file hash for deduplication
function generateFileHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Generate presigned URL for file upload
router.get('/presign', async (req, res) => {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(400).json({
        error: 'S3_BUCKET environment variable is required',
        timestamp: new Date().toISOString()
      });
    }

    const { key, type, expires } = req.query;
    
    if (!key) {
      return res.status(400).json({
        error: 'Key query parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const contentType = type || 'application/octet-stream';
    const expiresIn = parseInt(expires) || 3600; // 1 hour default
    
    // Add timestamp and random prefix to key for uniqueness
    const timestamp = Date.now();
    const uniqueKey = `uploads/${timestamp}-${crypto.randomBytes(8).toString('hex')}-${key}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      ContentType: contentType,
      Metadata: {
        'original-name': key,
        'upload-timestamp': timestamp.toString(),
        'source': 'MyMentalHealthBuddy-V10-PERFECTION'
      }
    });

    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

    logger.info('Presigned URL generated', {
      key: uniqueKey,
      contentType,
      expiresIn
    });

    res.json({
      url: signedUrl,
      key: uniqueKey,
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      bucket,
      expires: new Date(Date.now() + expiresIn * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Presigned URL generation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Presigned URL generation failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Generate presigned URL for file download
router.get('/presign-download', async (req, res) => {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(400).json({
        error: 'S3_BUCKET environment variable is required',
        timestamp: new Date().toISOString()
      });
    }

    const { key, expires } = req.query;
    
    if (!key) {
      return res.status(400).json({
        error: 'Key query parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const expiresIn = parseInt(expires) || 3600; // 1 hour default

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

    logger.info('Download URL generated', {
      key,
      expiresIn
    });

    res.json({
      url: signedUrl,
      key,
      method: 'GET',
      bucket,
      expires: new Date(Date.now() + expiresIn * 1000).toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Download URL generation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Download URL generation failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete file from S3
router.delete('/file', async (req, res) => {
  try {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      return res.status(400).json({
        error: 'S3_BUCKET environment variable is required',
        timestamp: new Date().toISOString()
      });
    }

    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({
        error: 'Key is required in request body',
        timestamp: new Date().toISOString()
      });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await getS3Client().send(command);

    logger.info('File deleted from S3', { key, bucket });

    res.json({
      success: true,
      key,
      message: 'File deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('File deletion failed', {
      error: error.message,
      key: req.body.key
    });

    res.status(500).json({
      error: 'File deletion failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get storage status and usage
router.get('/status', async (req, res) => {
  try {
    const bucket = process.env.S3_BUCKET;
    const cdnUrl = process.env.S3_CDN_URL;
    const deduplicationEnabled = process.env.STORAGE_DEDUPLICATION === 'true';

    const status = {
      bucket: bucket || 'not-configured',
      cdnUrl: cdnUrl || 'not-configured',
      deduplication: deduplicationEnabled,
      region: process.env.AWS_REGION || 'us-east-1',
      configured: !!(bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      timestamp: new Date().toISOString()
    };

    res.json(status);

  } catch (error) {
    logger.error('Storage status check failed', {
      error: error.message
    });

    res.status(500).json({
      error: 'Storage status check failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
