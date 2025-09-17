// src/routes/billing.js - Advanced Stripe Billing with Customer Portal
const express = require('express');
const router = express.Router();
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

function getStripeClient() {
  const Stripe = require('stripe');
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  return new Stripe(secretKey);
}

// Create checkout session
async function checkout(req, res) {
  try {
    const stripe = getStripeClient();
    const priceId = process.env.STRIPE_PRICE_ID;
    
    if (!priceId) {
      return res.status(400).json({ 
        error: 'STRIPE_PRICE_ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const { customerId, successUrl, cancelUrl } = req.body;

    const sessionData = {
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: successUrl || process.env.STRIPE_SUCCESS_URL || 'http://localhost:5173/success',
      cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL || 'http://localhost:5173/cancel',
      metadata: {
        source: 'MyMentalHealthBuddy-V10-PERFECTION'
      }
    };

    if (customerId) {
      sessionData.customer = customerId;
    } else {
      sessionData.customer_email = req.body.email;
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    
    logger.info('Checkout session created', {
      sessionId: session.id,
      customerId: customerId || 'new',
      priceId
    });

    res.json({
      id: session.id,
      url: session.url,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Checkout creation failed', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Checkout creation failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Customer portal access
async function customerPortal(req, res) {
  try {
    const stripe = getStripeClient();
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_RETURN_URL || 'http://localhost:5173/dashboard'
    });
    
    logger.info('Customer portal session created', {
      customerId,
      sessionId: session.id
    });

    res.json({
      url: session.url,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Customer portal creation failed', {
      error: error.message,
      customerId: req.body.customerId
    });
    
    res.status(500).json({
      error: 'Customer portal access failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Get billing status
async function getStatus(req, res) {
  try {
    const stripe = getStripeClient();
    const { customerId } = req.query;
    
    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required',
        timestamp: new Date().toISOString()
      });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10
    });
    
    const customer = await stripe.customers.retrieve(customerId);
    
    const status = {
      customerId,
      email: customer.email,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end
      })),
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
    
  } catch (error) {
    logger.error('Billing status retrieval failed', {
      error: error.message,
      customerId: req.query.customerId
    });
    
    res.status(500).json({
      error: 'Billing status retrieval failed',
      detail: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Stripe webhook handler
async function webhook(req, res) {
  const stripe = getStripeClient();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).send('STRIPE_WEBHOOK_SECRET required');
  }

  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    
    logger.info('Webhook received', {
      type: event.type,
      id: event.id
    });

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        logger.info('Checkout completed', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });
        break;
        
      case 'customer.subscription.created':
        const newSubscription = event.data.object;
        logger.info('Subscription created', {
          subscriptionId: newSubscription.id,
          customerId: newSubscription.customer,
          status: newSubscription.status
        });
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        logger.info('Subscription updated', {
          subscriptionId: updatedSubscription.id,
          customerId: updatedSubscription.customer,
          status: updatedSubscription.status
        });
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        logger.info('Subscription cancelled', {
          subscriptionId: deletedSubscription.id,
          customerId: deletedSubscription.customer
        });
        break;
        
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        logger.info('Payment succeeded', {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amount: invoice.amount_paid
        });
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        logger.warn('Payment failed', {
          invoiceId: failedInvoice.id,
          customerId: failedInvoice.customer,
          amount: failedInvoice.amount_due
        });
        break;
        
      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true, timestamp: new Date().toISOString() });
    
  } catch (error) {
    logger.error('Webhook signature verification failed', {
      error: error.message
    });
    
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
}

module.exports = {
  checkout,
  customerPortal,
  getStatus,
  webhook
};
