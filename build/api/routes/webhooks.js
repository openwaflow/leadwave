/**
 * Webhook Routes
 * Handles webhook configuration and event forwarding
 */

const express = require('express');
const https = require('https');
const http = require('http');

module.exports = (apiServer) => {
  const router = express.Router();

  /**
   * Configure webhook
   * POST /api/webhooks/configure
   */
  router.post('/configure', async (req, res) => {
    try {
      const { webhook_url, enabled, events } = req.body;

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'webhook_url is required'
        });
      }

      // Validate webhook URL
      try {
        new URL(webhook_url);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook URL',
          message: 'Please provide a valid HTTP/HTTPS URL'
        });
      }

      // Save webhook configuration
      await apiServer.saveConfig({
        webhookUrl: webhook_url,
        webhookEnabled: enabled !== false,
        webhookEvents: events || ['message', 'status']
      });

      res.json({
        success: true,
        message: 'Webhook configured successfully',
        webhook_url,
        enabled: enabled !== false
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get webhook configuration
   * GET /api/webhooks/config
   */
  router.get('/config', async (req, res) => {
    try {
      const config = apiServer.config;

      res.json({
        success: true,
        webhook_url: config.webhookUrl || null,
        enabled: config.webhookEnabled || false,
        events: config.webhookEvents || ['message', 'status']
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Test webhook
   * POST /api/webhooks/test
   */
  router.post('/test', async (req, res) => {
    try {
      const { webhook_url } = req.body;

      if (!webhook_url) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'webhook_url is required'
        });
      }

      // Send test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from Lead Wave REST API'
        }
      };

      const result = await sendWebhook(webhook_url, testPayload);

      if (result.success) {
        res.json({
          success: true,
          message: 'Webhook test successful',
          response_code: result.statusCode
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Webhook test failed',
          message: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Disable webhook
   * POST /api/webhooks/disable
   */
  router.post('/disable', async (req, res) => {
    try {
      await apiServer.saveConfig({
        webhookEnabled: false
      });

      res.json({
        success: true,
        message: 'Webhook disabled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

/**
 * Send webhook notification
 */
async function sendWebhook(url, payload) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const data = JSON.stringify(payload);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'Lead Wave-REST-API/1.0'
        },
        timeout: 10000
      };

      const req = protocol.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: responseData
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout'
        });
      });

      req.write(data);
      req.end();
    } catch (error) {
      resolve({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports.sendWebhook = sendWebhook;

