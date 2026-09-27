/**
 * Lead Wave REST API Server
 * Provides local HTTP API for integrating WhatsApp messaging with external systems
 *
 * @version 1.0.0
 * @author Lead Wave Team
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class RestAPIServer {
  constructor(appService, licenseService, databaseService) {
    this.instanceId = Math.random().toString(36).substring(7);

    this.app = express();
    this.server = null;
    this.appService = appService;
    this.licenseService = licenseService;
    this.databaseService = databaseService;
    this.isRunning = false;
    this.config = {
      enabled: false,
      port: 8080,
      allowExternalAccess: false,
      rateLimit: 100, // requests per minute
      apiKey: null,
      webhookUrl: null,
      webhookEnabled: false
    };

    // Bound listener reference so it can be removed on stop()
    this._webhookMessageListener = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like Postman, curl)
        if (!origin) return callback(null, true);

        // If external access is disabled, only allow localhost
        if (!this.config.allowExternalAccess) {
          const allowedOrigins = ['http://localhost', 'http://127.0.0.1'];
          if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            return callback(null, true);
          }
          return callback(new Error('External access not allowed'));
        }

        callback(null, true);
      },
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // IP restriction middleware (if external access is disabled)
    this.app.use((req, res, next) => {
      if (!this.config.allowExternalAccess) {
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const isLocalhost = clientIP.includes('127.0.0.1') ||
                           clientIP.includes('::1') ||
                           clientIP.includes('::ffff:127.0.0.1');

        if (!isLocalhost) {
          return res.status(403).json({
            success: false,
            error: 'Access denied. External access is disabled.',
            message: 'Enable external access in REST API settings to allow remote connections.'
          });
        }
      }
      next();
    });

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: () => this.config.rateLimit,
      message: {
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${this.config.rateLimit} requests per minute.`
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // API Key authentication middleware
    this.app.use('/api/', async (req, res, next) => {
      // Skip auth for health check and docs
      if (req.path === '/health' || req.path === '/docs' || req.path === '/') {
        return next();
      }

      // Accept API key from header OR query parameter (for browser testing)
      const apiKey = req.headers['x-api-key'] ||
                     req.headers['authorization']?.replace('Bearer ', '') ||
                     req.query.access_token;

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'API key is required. Include it in X-API-Key header, Authorization: Bearer header, or access_token query parameter.'
        });
      }

      const isValid = await this.validateAPIKey(apiKey);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key',
          message: 'The provided API key is invalid or has been revoked.'
        });
      }

      // Log API usage
      await this.logAPIUsage(apiKey, req.method, req.path);

      next();
    });

    // License validation middleware
    this.app.use('/api/', async (req, res, next) => {
      // Skip for health check and docs
      if (req.path === '/health' || req.path === '/docs' || req.path === '/') {
        return next();
      }

      // Skip license validation if license service is not available (development mode)
      if (!this.licenseService) {
        console.log('[REST API] License service not available - skipping validation (development mode)');
        return next();
      }

      try {
        const hasLicense = await this.licenseService.hasLicense();
        if (!hasLicense) {
          return res.status(403).json({
            success: false,
            error: 'License required',
            message: 'A valid Lead Wave license is required to use the REST API.'
          });
        }

        // Check if REST API module is enabled
        const isModuleEnabled = await this.licenseService.isModuleEnabled('rest-api');
        if (!isModuleEnabled) {
          return res.status(403).json({
            success: false,
            error: 'Module not enabled',
            message: 'REST API module is not enabled in your license. Please upgrade your license.'
          });
        }

        next();
      } catch (error) {
        console.error('[REST API] License validation error:', error);
        return res.status(500).json({
          success: false,
          error: 'License validation failed',
          message: error.message
        });
      }
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint (no auth required)
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API documentation endpoint (no auth required)
    this.app.get('/api/docs', (req, res) => {
      res.json(this.getAPIDocumentation());
    });

    // Root endpoint
    this.app.get('/api/', (req, res) => {
      res.json({
        success: true,
        message: 'REST API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          messages: '/api/messages/*',
          groups: '/api/groups/*',
          sessions: '/api/sessions/*',
          templates: '/api/templates/*',
          contacts: '/api/contacts/*',
          webhooks: '/api/webhooks/*'
        }
      });
    });

    // Import and use route modules
    const messagesRoute = require(path.join(__dirname, 'routes', 'messages'));
    const groupsRoute = require(path.join(__dirname, 'routes', 'groups'));
    const sessionsRoute = require(path.join(__dirname, 'routes', 'sessions'));
    const templatesRoute = require(path.join(__dirname, 'routes', 'templates'));
    const contactsRoute = require(path.join(__dirname, 'routes', 'contacts'));
    const webhooksRoute = require(path.join(__dirname, 'routes', 'webhooks'));

    this.app.use('/api/messages', messagesRoute(this));
    this.app.use('/api/groups', groupsRoute(this));
    this.app.use('/api/sessions', sessionsRoute(this));
    this.app.use('/api/templates', templatesRoute(this));
    this.app.use('/api/contacts', contactsRoute(this));
    this.app.use('/api/webhooks', webhooksRoute(this));

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found. See /api/docs for available endpoints.`
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }

  /**
   * Start the REST API server
   * @param {boolean} force - Force start even if disabled in config (for manual start)
   */
  async start(force = false) {
    if (this.isRunning) {
      throw new Error('REST API server is already running');
    }

    // Load configuration from database
    await this.loadConfig();

    if (!this.config.enabled && !force) {
      return false;
    }

    return new Promise((resolve, reject) => {
      try {
        // Use '127.0.0.1' instead of 'localhost' — Node.js 18+ resolves
        // 'localhost' to the IPv6 address ::1, but node-fetch (and most HTTP
        // clients) also resolve 'localhost' to ::1 while the OS may have the
        // server bound to 127.0.0.1 (IPv4 only), causing ECONNREFUSED ::1.
        // Binding explicitly to 127.0.0.1 ensures client and server use the
        // same address family.
        const host = this.config.allowExternalAccess ? '0.0.0.0' : '127.0.0.1';

        this.server = this.app.listen(this.config.port, host, () => {
          this.isRunning = true;
          this.setupEventListeners();
          resolve(true);
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} is already in use`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to incoming message events and forward them to the configured webhook URL.
   * Called once after the server starts successfully.
   */
  setupEventListeners() {
    try {
      const eventService = this.appService && this.appService.getEventService
        ? this.appService.getEventService()
        : null;

      if (!eventService) {
        console.warn('[REST API] eventService not available — webhook forwarding disabled');
        return;
      }

      const { sendWebhook } = require(path.join(__dirname, 'routes', 'webhooks'));

      this._webhookMessageListener = async (data) => {
        try {
          if (!this.config.webhookEnabled || !this.config.webhookUrl) return;

          const { sessionId, message, timestamp } = data;

          const payload = {
            event: 'message_received',
            timestamp: (timestamp || new Date()).toISOString(),
            session_id: sessionId,
            data: {
              id: message?.key?.id,
              from: message?.key?.remoteJid,
              from_me: message?.key?.fromMe || false,
              push_name: message?.pushName || null,
              message_type: message?.message ? Object.keys(message.message)[0] : 'unknown',
              text: message?.message?.conversation
                || message?.message?.extendedTextMessage?.text
                || message?.message?.imageMessage?.caption
                || message?.message?.videoMessage?.caption
                || null,
              timestamp: message?.messageTimestamp
                ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
                : null,
              raw: message
            }
          };

          await sendWebhook(this.config.webhookUrl, payload);
        } catch (err) {
          console.error('[REST API] Error forwarding message to webhook:', err.message);
        }
      };

      eventService.on('message_received', this._webhookMessageListener);
      console.log('[REST API] Webhook event listener registered');
    } catch (err) {
      console.error('[REST API] Failed to set up webhook event listeners:', err.message);
    }
  }

  /**
   * Stop the REST API server
   */
  async stop() {
    if (!this.isRunning || !this.server) {
      return false;
    }

    // Remove webhook event listener to avoid memory leaks
    if (this._webhookMessageListener) {
      try {
        const eventService = this.appService && this.appService.getEventService
          ? this.appService.getEventService()
          : null;
        if (eventService) {
          eventService.removeListener('message_received', this._webhookMessageListener);
        }
      } catch (_) {}
      this._webhookMessageListener = null;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        resolve(true);
      });
    });
  }

  /**
   * Restart the REST API server
   */
  async restart() {
    await this.stop();
    await this.start();
  }

  /**
   * Load configuration from database
   */
  async loadConfig() {
    try {
      const result = await this.databaseService.query('SELECT * FROM rest_api_config WHERE id = 1');

      if (result.success && result.data && result.data.length > 0) {
        const config = result.data[0];
        this.config = {
          enabled: Boolean(config.enabled),
          port: config.port || 8080,
          allowExternalAccess: Boolean(config.allow_external_access),
          rateLimit: config.rate_limit || 100,
          apiKey: config.api_key,
          webhookUrl: config.webhook_url,
          webhookEnabled: Boolean(config.webhook_enabled)
        };
      }
    } catch (error) {
      // Use default config if database read fails
    }
  }

  /**
   * Save configuration to database
   */
  async saveConfig(newConfig) {
    try {
      // Normalize: accept both camelCase (REST routes) and snake_case (UI IPC calls)
      const normalized = {};
      if (newConfig.enabled !== undefined)               normalized.enabled = Boolean(newConfig.enabled);
      if (newConfig.port !== undefined)                  normalized.port = newConfig.port;
      if (newConfig.allowExternalAccess !== undefined)   normalized.allowExternalAccess = Boolean(newConfig.allowExternalAccess);
      if (newConfig.allow_external_access !== undefined) normalized.allowExternalAccess = Boolean(newConfig.allow_external_access);
      if (newConfig.rateLimit !== undefined)             normalized.rateLimit = newConfig.rateLimit;
      if (newConfig.rate_limit !== undefined)            normalized.rateLimit = newConfig.rate_limit;
      if (newConfig.apiKey !== undefined)                normalized.apiKey = newConfig.apiKey;
      if (newConfig.api_key !== undefined)               normalized.apiKey = newConfig.api_key;
      if (newConfig.webhookUrl !== undefined)            normalized.webhookUrl = newConfig.webhookUrl;
      if (newConfig.webhook_url !== undefined)           normalized.webhookUrl = newConfig.webhook_url;
      if (newConfig.webhookEnabled !== undefined)        normalized.webhookEnabled = Boolean(newConfig.webhookEnabled);
      if (newConfig.webhook_enabled !== undefined)       normalized.webhookEnabled = Boolean(newConfig.webhook_enabled);

      // Merge normalized config
      this.config = { ...this.config, ...normalized };

      const result = await this.databaseService.query(`
        INSERT OR REPLACE INTO rest_api_config (
          id, enabled, port, allow_external_access, rate_limit,
          api_key, webhook_url, webhook_enabled, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        this.config.enabled ? 1 : 0,
        this.config.port,
        this.config.allowExternalAccess ? 1 : 0,
        this.config.rateLimit,
        this.config.apiKey,
        this.config.webhookUrl,
        this.config.webhookEnabled ? 1 : 0
      ]);

      return result.success;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate new API key
   * @param {string} deviceId - WhatsApp device ID
   * @param {string} name - Optional name for the key
   */
  async generateAPIKey(deviceId, name = null) {
    const apiKey = `lw_${uuidv4().replace(/-/g, '')}`;

    try {
      // Get device name if not provided
      if (!name && deviceId) {
        const deviceResult = await this.databaseService.query(
          'SELECT name FROM whatsapp_sessions WHERE id = ?',
          [deviceId]
        );

        if (deviceResult.success && deviceResult.data && deviceResult.data.length > 0) {
          name = `${deviceResult.data[0].name} API Key`;
        } else {
          name = `Device ${deviceId} API Key`;
        }
      } else if (!name) {
        name = 'Default API Key';
      }

      const result = await this.databaseService.query(`
        INSERT INTO rest_api_keys (
          id, api_key, name, device_id, is_active, created_at
        ) VALUES (?, ?, ?, ?, 1, datetime('now'))
      `, [uuidv4(), apiKey, name, deviceId]);

      if (!result.success) {
        throw new Error(result.error || 'Failed to insert API key');
      }

      return { apiKey, name, deviceId };
    } catch (error) {
      console.error('[REST API] Error generating API key:', error);
      throw error;
    }
  }

  /**
   * Get all API keys
   */
  async getAPIKeys() {
    try {
      const result = await this.databaseService.query(`
        SELECT
          k.id,
          k.api_key,
          k.name,
          k.device_id,
          k.is_active,
          k.last_used_at,
          k.created_at,
          s.name as device_name
        FROM rest_api_keys k
        LEFT JOIN whatsapp_sessions s ON k.device_id = s.id
        ORDER BY k.created_at DESC
      `);

      return result.success ? result.data : [];
    } catch (error) {
      console.error('[REST API] Error getting API keys:', error);
      return [];
    }
  }

  /**
   * Delete API key
   * @param {string} keyId - API key ID
   */
  async deleteAPIKey(keyId) {
    try {
      const result = await this.databaseService.query(
        'DELETE FROM rest_api_keys WHERE id = ?',
        [keyId]
      );

      return result.success;
    } catch (error) {
      console.error('[REST API] Error deleting API key:', error);
      return false;
    }
  }

  /**
   * Toggle API key active status
   * @param {string} keyId - API key ID
   * @param {boolean} isActive - New active status
   */
  async toggleAPIKey(keyId, isActive) {
    try {
      const result = await this.databaseService.query(
        'UPDATE rest_api_keys SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, keyId]
      );

      return result.success;
    } catch (error) {
      console.error('[REST API] Error toggling API key:', error);
      return false;
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey) {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM rest_api_keys WHERE api_key = ? AND is_active = 1',
        [apiKey]
      );

      return result.success && result.data && result.data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Log API usage
   */
  async logAPIUsage(apiKey, method, endpoint) {
    try {
      await this.databaseService.query(`
        INSERT INTO rest_api_logs (
          id, api_key, method, endpoint, timestamp
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `, [uuidv4(), apiKey, method, endpoint]);
    } catch (error) {
      // Don't throw error for logging failures
    }
  }

  /**
   * Get API documentation
   */
  getAPIDocumentation() {
    return {
      title: 'Lead Wave REST API Documentation',
      version: '1.0.0',
      description: 'Complete REST API for integrating WhatsApp messaging with external systems',
      baseUrl: `http://localhost:${this.config.port}/api`,
      authentication: {
        type: 'API Key',
        methods: [
          'Header: X-API-Key: {api_key}',
          'Header: Authorization: Bearer {api_key}',
          'Query Parameter: ?access_token={api_key}'
        ],
        example: 'X-API-Key: lw_abc123...',
        note: 'Query parameter method is recommended for browser testing'
      },
      endpoints: {
        messages: {
          sendText: {
            method: 'POST',
            path: '/messages/send',
            description: 'Send a text message',
            body: {
              session_id: 'string (required)',
              to: 'string (required) - Phone number with country code',
              message: 'string (required)',
              quoted_message_id: 'string (optional)'
            }
          },
          sendMedia: {
            method: 'POST',
            path: '/messages/send-media',
            description: 'Send media message (image, video, audio, document)',
            body: {
              session_id: 'string (required)',
              to: 'string (required)',
              media_url: 'string (required) - URL or base64',
              type: 'string (required) - image|video|audio|document',
              caption: 'string (optional)',
              filename: 'string (optional)'
            }
          }
        }
      }
    };
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: {
        ...this.config,
        apiKey: this.config.apiKey ? '***' + this.config.apiKey.slice(-8) : null
      },
      uptime: this.isRunning ? process.uptime() : 0
    };
  }
}

module.exports = RestAPIServer;

