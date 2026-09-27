const DatabaseService = require("./database.service");
const WhatsAppService = require("./whatsapp.service");
const EventService = require("./event.service");
const EmailService = require("./email.service");
const CampaignSchedulerService = require("./campaign-scheduler.service");
const FollowUpSchedulerService = require("./followup-scheduler.service");
const TranslationService = require("./translation.service");
const WarmerService = require("./warmer.service");
const ProxyService = require("./proxy.service");
const SupportBotService = require("./support-bot.service");
const DeviceHealthService = require("./device-health.service");
const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const devLog = (..._0x1c6935) => {
  if (isDev) {
    console.log(..._0x1c6935);
  }
};
const devWarn = (..._0x35b6e9) => {
  if (isDev) {
    console.warn(..._0x35b6e9);
  }
};
const devError = (..._0x2e781a) => {
  if (isDev) {
    console.error(..._0x2e781a);
  }
};
const AIWhatsAppIntegration = require("./ai-whatsapp.integration");
const WhatsAppSession = require("../models/WhatsAppSession");
const MessageTemplate = require("../models/MessageTemplate");
const Contact = require("../models/Contact");
class AppService {
  constructor() {
    this.isInitialized = false;
    this.database = null;
    this.whatsappService = null;
    this.eventService = null;
    this.emailService = null;
    this.campaignScheduler = null;
    this.followUpScheduler = null;
    this.warmerService = null;
    this.proxyService = null;
    this.deviceHealthService = null;
    this.deviceHealthInterval = null;
    this.aiIntegration = null;
    this.translationService = null;
    this.supportBotService = null;
    this.liveChatService = null;
    this.models = {
      WhatsAppSession: WhatsAppSession,
      MessageTemplate: MessageTemplate,
      Contact: Contact
    };
  }
  async initialize() {
    try {
      this.database = new DatabaseService();
      await this.database.initialize();
      this.whatsappService = new WhatsAppService(this.database);
      this.whatsappService.setDatabaseService(this.database);
      this.emailService = new EmailService();
      this.emailService.setDatabaseService(this.database);
      await this.emailService.initialize();
      this.eventService = new EventService(this.database, this.whatsappService);
      this.eventService.emailService = this.emailService;
      this.campaignScheduler = new CampaignSchedulerService();
      await this.campaignScheduler.initialize(this.database, this.whatsappService, this.eventService.messageProcessor);
      try {
        const _0x4d8466 = require("./recall-bot.service");
        this.recallBotService = new _0x4d8466();
        const _0x712c14 = await this.recallBotService.initialize(this.database, this.whatsappService);
        if (!_0x712c14.success) {
          this.recallBotService = null;
        } else {}
      } catch (_0x55e121) {
        console.error("⚠️ Failed to initialize Recall Bot service:", _0x55e121);
        console.error("⚠️ Error stack:", _0x55e121.stack);
        this.recallBotService = null;
      }
      this.followUpScheduler = new FollowUpSchedulerService();
      await this.followUpScheduler.initialize(this.database, this.whatsappService, this.eventService.messageProcessor);
      try {
        this.warmerService = new WarmerService(this.database, this.whatsappService);
      } catch (_0xfe1e4e) {
        console.error("⚠️ Failed to initialize Warmer service:", _0xfe1e4e);
        this.warmerService = null;
      }
      try {
        this.proxyService = new ProxyService(this.database);
      } catch (_0xd702ed) {
        console.error("⚠️ Failed to initialize Proxy service:", _0xd702ed);
        this.proxyService = null;
      }
      try {
        this.deviceHealthService = new DeviceHealthService(this.database);
        if (this.whatsappService) {
          this.whatsappService.setDeviceHealthService(this.deviceHealthService);
        }
        this.startDeviceHealthMonitoring();
      } catch (_0x51b54c) {
        console.error("⚠️ Failed to initialize Device Health service:", _0x51b54c);
        this.deviceHealthService = null;
      }
      try {
        const _0x48a85f = require("./ai.service");
        this.aiService = new _0x48a85f(this.database);
        await this.aiService.initialize(this.database);
      } catch (_0x3068c0) {
        console.error("⚠️ Failed to initialize AI service:", _0x3068c0);
        this.aiService = null;
      }
      this.aiIntegration = new AIWhatsAppIntegration(this.whatsappService, this.database, this.aiService);
      try {
        this.translationService = new TranslationService(this.database);
        setImmediate(async () => {
          try {
            const _0x292930 = require("fs");
            const _0x262af2 = require("path");
            const _0x45dca8 = require("vm");
            const _0x2974b5 = _0x262af2.join(__dirname, "..", "locales", "en.js");
            const _0x313a02 = _0x292930.readFileSync(_0x2974b5, "utf8");
            const _0x52d044 = _0x313a02.replace(/^export\s+default\s+/, "").trim().replace(/;$/, "");
            const _0xff3ace = new _0x45dca8.Script("(" + _0x52d044 + ")");
            const _0x2984bc = _0xff3ace.runInNewContext({});
            await this.translationService.syncTranslationKeys(_0x2984bc);
          } catch (_0x28d74b) {
            console.error("⚠️ Failed to auto-sync translation keys:", _0x28d74b);
          }
        });
      } catch (_0x12d3fb) {
        console.error("⚠️ Failed to initialize Translation service:", _0x12d3fb);
        this.translationService = null;
      }
      try {
        this.supportBotService = new SupportBotService(this.database, this.whatsappService);
        if (this.eventService) {
          this.eventService.supportBotService = this.supportBotService;
        }
      } catch (_0x4b1fc9) {
        console.error("⚠️ Failed to initialize Support Bot service:", _0x4b1fc9);
        this.supportBotService = null;
      }
      try {
        const _0xd80001 = require("./live-chat.service");
        this.liveChatService = new _0xd80001(this.database, this.whatsappService);
        await this.liveChatService.initialize();
      } catch (_0x51ab26) {
        console.error("⚠️ Failed to initialize Live Chat service:", _0x51ab26);
        this.liveChatService = null;
      }
      WhatsAppSession.db = this.database;
      MessageTemplate.db = this.database;
      Contact.db = this.database;
      this.models = {
        WhatsAppSession: WhatsAppSession,
        MessageTemplate: MessageTemplate,
        Contact: Contact
      };
      await this.createDefaultData();
      const _0x31612d = setTimeout(async () => {
        try {
          await this.whatsappService.restoreAllSessions();
        } catch (_0x21fd48) {
          console.error("❌ [APP SERVICE] Error in restoreAllSessions():", _0x21fd48);
        }
      }, 2000);
      console.log("🚀 AppService: Starting campaign scheduler...");
      this.campaignScheduler.start();
      console.log("✅ AppService: Campaign scheduler started");
      console.log("🚀 AppService: Starting follow-up scheduler...");
      this.followUpScheduler.start();
      console.log("✅ AppService: Follow-up scheduler started");
      this.isInitialized = true;
      console.log("✅ AppService: Initialization complete, all schedulers running");
    } catch (_0x56c084) {
      console.error("❌ AppService: Initialization failed:", _0x56c084);
      console.error("❌ AppService: Error stack:", _0x56c084.stack);
      this.isInitialized = false;
      throw _0x56c084;
    }
  }
  async createDefaultData() {
    try {
      const _0x5e66c2 = await this.database.get("SELECT COUNT(*) as count FROM app_settings");
      if (_0x5e66c2.count === 0) {}
    } catch (_0x5a47ff) {
      devError("Error creating default data:", _0x5a47ff);
    }
  }
  async createDefaultTemplates() {
    const _0xe14b3b = [{
      name: "Welcome Message",
      category: "welcome",
      content: "Hello {{name}}! Welcome to our service. We're excited to have you on board! 🎉\n\nHow can we help you today?",
      variables: JSON.stringify(["name"]),
      attachments: null
    }, {
      name: "Thank You",
      category: "general",
      content: "Thank you {{name}} for your interest! We really appreciate it. 😊\n\nWe'll get back to you soon.",
      variables: JSON.stringify(["name"]),
      attachments: null
    }, {
      name: "Product Inquiry Response",
      category: "sales",
      content: "Hi {{name}}! 👋\n\nThank you for your inquiry about {{product}}. Here are the details:\n\n💰 Price: ${{price}}\n📦 Availability: In Stock\n🚚 Shipping: Free\n\nWould you like to place an order?",
      variables: JSON.stringify(["name", "product", "price"]),
      attachments: null
    }, {
      name: "Appointment Confirmation",
      category: "appointments",
      content: "Hello {{name}}! ✅\n\nYour appointment has been confirmed for:\n📅 Date: {{date}}\n⏰ Time: {{time}}\n📍 Location: {{location}}\n\nPlease arrive 10 minutes early. See you soon!",
      variables: JSON.stringify(["name", "date", "time", "location"]),
      attachments: null
    }, {
      name: "Follow Up",
      category: "follow_up",
      content: "Hi {{name}}! 👋\n\nJust checking in to see how you're doing with {{product}}. \n\nDo you have any questions or need any assistance? We're here to help! 🤗",
      variables: JSON.stringify(["name", "product"]),
      attachments: null
    }, {
      name: "Order Confirmation",
      category: "orders",
      content: "Order Confirmed! 🎉\n\nHi {{name}}, your order #{{order_id}} has been confirmed.\n\n📦 Items: {{items}}\n💰 Total: ${{total}}\n🚚 Estimated delivery: {{delivery_date}}\n\nThank you for your purchase!",
      variables: JSON.stringify(["name", "order_id", "items", "total", "delivery_date"]),
      attachments: null
    }];
    for (const _0x20c067 of _0xe14b3b) {
      const _0x223c97 = new MessageTemplate(_0x20c067);
      await _0x223c97.save();
    }
  }
  async getStats() {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    const _0x35d96d = await this.database.getStats();
    const _0x9e9e73 = await WhatsAppSession.getStats();
    const _0xcb825d = await MessageTemplate.getStats();
    const _0x38c09a = await Contact.getStats();
    const _0xf8b896 = this.whatsappService ? this.whatsappService.getAllSessions() : [];
    const _0x1ac61a = _0xf8b896.filter(_0x382cb4 => _0x382cb4.status === "connected").length;
    const _0xd5a85b = _0xf8b896.filter(_0x6d8159 => _0x6d8159.status === "qr_ready").length;
    const _0x577e5b = await this.getModuleStats();
    return {
      database: _0x35d96d,
      sessions: {
        ..._0x9e9e73,
        connected: _0x1ac61a,
        qrReady: _0xd5a85b,
        total: _0xf8b896.length
      },
      templates: _0xcb825d,
      contacts: _0x38c09a,
      modules: _0x577e5b,
      lastUpdated: new Date().toISOString()
    };
  }
  async getModuleStats() {
    try {
      const _0x3e646d = await this.database.query("SELECT COUNT(*) as total_rules FROM auto_reply_rules");
      const _0x16b707 = await this.database.query("SELECT COUNT(*) as active_rules FROM auto_reply_rules WHERE is_active = 1");
      const _0x204b99 = await this.database.query("SELECT SUM(COALESCE(response_count, 0)) as total_responses FROM auto_reply_rules");
      const _0x616144 = await this.database.query("SELECT COUNT(*) as used_rules FROM auto_reply_rules WHERE COALESCE(response_count, 0) > 0");
      const _0xafd5d6 = await this.database.query("SELECT COUNT(*) as total_flows FROM chatbot_flows");
      const _0x58afb4 = await this.database.query("SELECT COUNT(*) as active_flows FROM chatbot_flows WHERE is_active = 1");
      const _0x2092b5 = await this.database.query("SELECT COUNT(*) as total_conversations FROM chatbot_conversations");
      const _0x117d19 = await this.database.query("SELECT COUNT(*) as completed_conversations FROM chatbot_conversations WHERE completed_at IS NOT NULL");
      const _0x41d4c4 = await this.database.query("SELECT COUNT(*) as total_rules FROM call_responses");
      const _0x58ffa2 = await this.database.query("SELECT COUNT(*) as active_rules FROM call_responses WHERE is_active = 1");
      const _0x5cf7f1 = await this.database.query("SELECT SUM(COALESCE(usage_count, 0)) as total_responses FROM call_responses");
      const _0x36d8e1 = await this.database.query("SELECT COUNT(*) as total_campaigns FROM bulk_campaigns");
      const _0x436896 = await this.database.query("SELECT COUNT(*) as completed_campaigns FROM bulk_campaigns WHERE status = 'completed'");
      const _0x5efb24 = await this.database.query("SELECT COUNT(*) as running_campaigns FROM bulk_campaigns WHERE status = 'running'");
      const _0x1c9785 = await this.database.query("SELECT COUNT(*) as scheduled_campaigns FROM bulk_campaigns WHERE status = 'scheduled'");
      const _0x1505a5 = await this.database.query("SELECT id, name, status, sent_count, failed_count FROM bulk_campaigns");
      const _0x328794 = await this.database.query("\n        SELECT COUNT(*) as total_sent\n        FROM bulk_campaign_recipients\n        WHERE status = 'sent'\n      ");
      const _0x69931c = await this.database.query("\n        SELECT COUNT(*) as total_failed\n        FROM bulk_campaign_recipients\n        WHERE status = 'failed'\n      ");
      const _0xe27d9b = await this.database.query("SELECT id, campaign_id, status FROM bulk_campaign_recipients");
      const _0xc66e06 = await this.database.query("\n        SELECT COUNT(*) as total_sent\n        FROM message_history\n        WHERE direction = 'outgoing' AND status IN ('sent', 'delivered', 'read')\n      ");
      const _0x373042 = await this.database.query("\n        SELECT COUNT(*) as total_failed\n        FROM message_history\n        WHERE direction = 'outgoing' AND status = 'failed'\n      ");
      const _0x52d874 = await this.database.query("SELECT COUNT(*) as total_messages FROM message_history WHERE direction = 'outgoing'");
      const _0x1bcef9 = await this.database.query("SELECT COUNT(*) as recent_messages FROM message_history WHERE direction = 'outgoing' AND date(created_at) = date('now')");
      const _0x621c66 = await this.database.query("SELECT COUNT(*) as total_templates FROM message_templates");
      const _0x29613d = {
        autoReply: {
          total_rules: _0x3e646d.success && _0x3e646d.data[0] ? _0x3e646d.data[0].total_rules : 0,
          active_rules: _0x16b707.success && _0x16b707.data[0] ? _0x16b707.data[0].active_rules : 0,
          total_responses: _0x204b99.success && _0x204b99.data[0] ? _0x204b99.data[0].total_responses || 0 : 0,
          used_rules: _0x616144.success && _0x616144.data[0] ? _0x616144.data[0].used_rules : 0
        },
        chatbot: {
          total_flows: _0xafd5d6.success && _0xafd5d6.data[0] ? _0xafd5d6.data[0].total_flows : 0,
          active_flows: _0x58afb4.success && _0x58afb4.data[0] ? _0x58afb4.data[0].active_flows : 0,
          total_conversations: _0x2092b5.success && _0x2092b5.data[0] ? _0x2092b5.data[0].total_conversations : 0,
          active_conversations: 0,
          completed_conversations: _0x117d19.success && _0x117d19.data[0] ? _0x117d19.data[0].completed_conversations : 0
        },
        callResponder: {
          total_rules: _0x41d4c4.success && _0x41d4c4.data[0] ? _0x41d4c4.data[0].total_rules : 0,
          active_rules: _0x58ffa2.success && _0x58ffa2.data[0] ? _0x58ffa2.data[0].active_rules : 0,
          total_responses: _0x5cf7f1.success && _0x5cf7f1.data[0] ? _0x5cf7f1.data[0].total_responses || 0 : 0
        },
        bulkCampaigns: {
          total_campaigns: _0x36d8e1.success && _0x36d8e1.data[0] ? _0x36d8e1.data[0].total_campaigns : 0,
          completed_campaigns: _0x436896.success && _0x436896.data[0] ? _0x436896.data[0].completed_campaigns : 0,
          running_campaigns: _0x5efb24.success && _0x5efb24.data[0] ? _0x5efb24.data[0].running_campaigns : 0,
          scheduled_campaigns: _0x1c9785.success && _0x1c9785.data[0] ? _0x1c9785.data[0].scheduled_campaigns : 0,
          total_recipients: 0,
          total_sent: _0x328794.success && _0x328794.data[0] ? _0x328794.data[0].total_sent : 0,
          total_failed: _0x69931c.success && _0x69931c.data[0] ? _0x69931c.data[0].total_failed : 0
        },
        overallMessages: {
          total_sent: _0xc66e06.success && _0xc66e06.data[0] ? _0xc66e06.data[0].total_sent : 0,
          total_failed: _0x373042.success && _0x373042.data[0] ? _0x373042.data[0].total_failed : 0
        },
        activity: {
          messages_last_7_days: _0x52d874.success && _0x52d874.data[0] ? _0x52d874.data[0].total_messages : 0,
          messages_last_24_hours: _0x1bcef9.success && _0x1bcef9.data[0] ? _0x1bcef9.data[0].recent_messages : 0
        },
        templateUsage: {
          used_templates: _0x621c66.success && _0x621c66.data[0] ? _0x621c66.data[0].total_templates : 0,
          total_template_usage: 0
        }
      };
      return _0x29613d;
    } catch (_0x4d94aa) {
      devError("Error getting module stats:", _0x4d94aa);
      return {
        autoReply: {
          total_rules: 0,
          active_rules: 0,
          total_responses: 0,
          used_rules: 0
        },
        chatbot: {
          total_flows: 0,
          active_flows: 0,
          total_conversations: 0,
          active_conversations: 0,
          completed_conversations: 0
        },
        callResponder: {
          total_rules: 0,
          active_rules: 0,
          total_responses: 0
        },
        bulkCampaigns: {
          total_campaigns: 0,
          completed_campaigns: 0,
          running_campaigns: 0,
          scheduled_campaigns: 0,
          total_recipients: 0,
          total_sent: 0,
          total_failed: 0
        },
        activity: {
          messages_last_7_days: 0,
          messages_last_24_hours: 0
        },
        templateUsage: {
          used_templates: 0,
          total_template_usage: 0
        }
      };
    }
  }
  async getRecentActivities(_0x5220a5 = 10) {
    try {
      const _0x2e260b = [];
      const _0x5a26d2 = await this.database.query("\n        SELECT\n          'device' as type,\n          'Device ' || name || ' connected' as title,\n          'WhatsApp session established successfully' as description,\n          updated_at as time,\n          'success' as status\n        FROM whatsapp_sessions\n        WHERE status = 'connected' AND updated_at >= datetime('now', '-7 days')\n        ORDER BY updated_at DESC\n        LIMIT 3\n      ");
      const _0xcd48ab = await this.database.query("\n        SELECT\n          'message' as type,\n          'Message sent to ' || mh.contact_phone as title,\n          CASE\n            WHEN length(mh.content) > 50 THEN substr(mh.content, 1, 50) || '...'\n            ELSE mh.content\n          END as description,\n          mh.timestamp as time,\n          CASE WHEN mh.status = 'sent' THEN 'success' ELSE 'info' END as status\n        FROM message_history mh\n        INNER JOIN whatsapp_sessions ws ON mh.session_id = ws.id\n        WHERE mh.direction = 'outgoing' AND mh.timestamp >= datetime('now', '-7 days')\n        ORDER BY mh.timestamp DESC\n        LIMIT 5\n      ");
      const _0x42f2c9 = await this.database.query("\n        SELECT\n          'campaign' as type,\n          'Bulk campaign ' || name || ' completed' as title,\n          'Campaign status: ' || status as description,\n          updated_at as time,\n          CASE WHEN status = 'completed' THEN 'success' ELSE 'info' END as status\n        FROM bulk_campaigns\n        WHERE updated_at >= datetime('now', '-7 days')\n        ORDER BY updated_at DESC\n        LIMIT 3\n      ");
      const _0x5324ff = await this.database.query("\n        SELECT\n          'template' as type,\n          'Template ' || name || ' created' as title,\n          'New message template added' as description,\n          created_at as time,\n          'info' as status\n        FROM message_templates\n        WHERE created_at >= datetime('now', '-7 days')\n        ORDER BY created_at DESC\n        LIMIT 2\n      ");
      const _0x34d77b = await this.database.query("\n        SELECT\n          'activity' as type,\n          description as title,\n          action_type as description,\n          created_at as time,\n          'info' as status\n        FROM activity_logs\n        WHERE created_at >= datetime('now', '-7 days')\n        ORDER BY created_at DESC\n        LIMIT 3\n      ");
      if (_0x5a26d2.success) {
        _0x2e260b.push(..._0x5a26d2.data);
      }
      if (_0xcd48ab.success) {
        _0x2e260b.push(..._0xcd48ab.data);
      }
      if (_0x42f2c9.success) {
        _0x2e260b.push(..._0x42f2c9.data);
      }
      if (_0x5324ff.success) {
        _0x2e260b.push(..._0x5324ff.data);
      }
      if (_0x34d77b.success) {
        _0x2e260b.push(..._0x34d77b.data);
      }
      _0x2e260b.sort((_0x4f3ad9, _0x1a1abe) => new Date(_0x1a1abe.time) - new Date(_0x4f3ad9.time));
      return _0x2e260b.slice(0, _0x5220a5).map((_0x45ba8a, _0x5c514f) => ({
        id: _0x5c514f + 1,
        ..._0x45ba8a,
        time: this.formatTimeAgo(_0x45ba8a.time)
      }));
    } catch (_0x25583c) {
      devError("Error getting recent activities:", _0x25583c);
      return [];
    }
  }
  formatTimeAgo(_0x24883e) {
    const _0x3153a6 = new Date();
    const _0x53c019 = new Date(_0x24883e);
    const _0x9a9c99 = Math.floor((_0x3153a6 - _0x53c019) / 1000);
    if (_0x9a9c99 < 60) {
      return "Just now";
    }
    if (_0x9a9c99 < 3600) {
      return Math.floor(_0x9a9c99 / 60) + " minutes ago";
    }
    if (_0x9a9c99 < 86400) {
      return Math.floor(_0x9a9c99 / 3600) + " hours ago";
    }
    if (_0x9a9c99 < 604800) {
      return Math.floor(_0x9a9c99 / 86400) + " days ago";
    }
    return _0x53c019.toLocaleDateString();
  }
  async getHealthCheck() {
    return {
      status: this.isInitialized ? "healthy" : "initializing",
      database: this.database ? "connected" : "disconnected",
      whatsapp: this.whatsappService ? "ready" : "not_initialized",
      events: this.eventService ? "listening" : "not_initialized",
      models: Object.keys(this.models).length,
      timestamp: new Date().toISOString()
    };
  }
  async shutdown() {
    try {
      this.stopDeviceHealthMonitoring();
      if (this.whatsappService && typeof this.whatsappService.shutdown === "function") {
        await this.whatsappService.shutdown();
      } else if (this.whatsappService) {
        const _0x4ceca5 = this.whatsappService.getAllSessions();
        for (const _0x47aedb of _0x4ceca5) {
          const _0x454ea4 = this.whatsappService.sessions.get(_0x47aedb.id);
          if (_0x454ea4) {
            try {
              await _0x454ea4.end();
            } catch (_0x5231c1) {}
          }
        }
        this.whatsappService.sessions.clear();
        this.whatsappService.sessionStates.clear();
      }
      if (this.campaignScheduler) {
        this.campaignScheduler.stop();
      }
      if (this.followUpScheduler) {
        this.followUpScheduler.stop();
      }
      if (this.database) {
        await this.database.close();
      }
      this.isInitialized = false;
    } catch (_0x3f3f6a) {
      console.error("Error during shutdown:", _0x3f3f6a);
    }
  }
  async createWhatsAppSession(_0x1b8158 = "Lead Wave Device") {
    if (!this.isInitialized) {
      const _0x2a1f00 = 90000;
      const _0x5c6228 = 500;
      let _0xad30c8 = 0;
      while (!this.isInitialized && _0xad30c8 < _0x2a1f00) {
        await new Promise(_0x5b3625 => setTimeout(_0x5b3625, _0x5c6228));
        _0xad30c8 += _0x5c6228;
      }
      if (!this.isInitialized) {
        return {
          success: false,
          message: "Application is still starting up. Please wait a moment and try again."
        };
      }
    }
    const _0x4e2bc4 = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    let _0x5b13bf = false;
    try {
      const _0x55ec5f = await this.database.run("INSERT INTO whatsapp_sessions\n           (session_id, name, device_name, status, is_active, created_at, updated_at)\n         VALUES (?, ?, ?, 'creating', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x4e2bc4, _0x1b8158, _0x1b8158]);
      if (!_0x55ec5f || !_0x55ec5f.success) {
        throw new Error("Failed to create session record in database: " + (_0x55ec5f?.error || "unknown database error"));
      }
      _0x5b13bf = true;
      await this.database.saveDatabase();
      const _0x498934 = await this.whatsappService.createSession(_0x4e2bc4);
      if (!_0x498934 || !_0x498934.success) {
        await this.database.run("DELETE FROM whatsapp_sessions WHERE session_id = ?", [_0x4e2bc4]);
        await this.database.saveDatabase();
        return {
          success: false,
          message: _0x498934 && _0x498934.message || "Failed to initialise WhatsApp socket"
        };
      }
      return {
        success: true,
        sessionId: _0x4e2bc4,
        message: "Session created successfully"
      };
    } catch (_0x84875a) {
      console.error("Error creating WhatsApp session:", _0x84875a);
      if (_0x5b13bf) {
        try {
          await this.database.run("DELETE FROM whatsapp_sessions WHERE session_id = ?", [_0x4e2bc4]);
          await this.database.saveDatabase();
        } catch (_0x15b540) {
          console.error("Error cleaning up failed session record:", _0x15b540);
        }
      }
      return {
        success: false,
        message: _0x84875a.message
      };
    }
  }
  async disconnectWhatsAppSession(_0x5bcac4) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      const _0x4c3323 = await this.whatsappService.disconnectSession(_0x5bcac4);
      return _0x4c3323;
    } catch (_0x1a96a3) {
      console.error("❌ AppService: Error disconnecting WhatsApp session " + _0x5bcac4 + ":", _0x1a96a3);
      return {
        success: false,
        message: _0x1a96a3.message
      };
    }
  }
  async reconnectWhatsAppSession(_0x12f032) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      const _0x1b36d4 = await this.whatsappService.forceReconnectSession(_0x12f032);
      return _0x1b36d4;
    } catch (_0x37e589) {
      console.error("❌ AppService: Error reconnecting WhatsApp session " + _0x12f032 + ":", _0x37e589);
      return {
        success: false,
        message: _0x37e589.message
      };
    }
  }
  async deleteWhatsAppSession(_0x148991) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      const _0x5a48f6 = await this.whatsappService.deleteSession(_0x148991);
      return _0x5a48f6;
    } catch (_0x5ad44f) {
      console.error("❌ AppService: Error deleting WhatsApp session " + _0x148991 + ":", _0x5ad44f);
      return {
        success: false,
        message: _0x5ad44f.message
      };
    }
  }
  async getWhatsAppSessions() {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      const _0x5150b1 = await WhatsAppSession.findAll();
      const _0x2dba2e = this.whatsappService.getAllSessions();
      const _0x344597 = _0x5150b1.map(_0x53556c => {
        const _0x4e7d42 = _0x2dba2e.find(_0x22df07 => _0x22df07.id === _0x53556c.sessionId);
        let _0x2d9579 = _0x53556c.status;
        let _0x269f8f = false;
        if (_0x4e7d42) {
          if (_0x53556c.status === "connected" && _0x4e7d42.silentReconnect) {
            _0x2d9579 = "connected";
            _0x269f8f = true;
          } else {
            _0x2d9579 = _0x4e7d42.status;
            _0x269f8f = _0x4e7d42.isLoggedIn;
          }
        }
        const _0x4eb42a = {
          id: _0x53556c.id,
          sessionId: _0x53556c.sessionId,
          session_id: _0x53556c.sessionId,
          name: _0x53556c.name,
          deviceName: _0x53556c.deviceName,
          device_name: _0x53556c.deviceName,
          phoneNumber: _0x53556c.phoneNumber,
          phone_number: _0x53556c.phoneNumber,
          status: _0x53556c.status,
          qrCode: _0x53556c.qrCode,
          isActive: _0x53556c.isActive,
          createdAt: _0x53556c.createdAt,
          updatedAt: _0x53556c.updatedAt,
          connectedAt: _0x53556c.connectedAt,
          disconnectedAt: _0x53556c.disconnectedAt,
          lastSeen: _0x53556c.lastSeen,
          realTimeStatus: _0x2d9579,
          isLoggedIn: _0x269f8f,
          connectionTimestamp: _0x4e7d42 ? _0x4e7d42.connectionTimestamp : null
        };
        return _0x4eb42a;
      });
      return _0x344597;
    } catch (_0x3548dd) {
      console.error("Error getting WhatsApp sessions:", _0x3548dd);
      return [];
    }
  }
  async sendMessage(_0x560055, _0x1c18ba, _0x6ec44e, _0x3d0df7 = "text", _0x4614d7 = {}) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      console.log("📨 [APP SERVICE] sendMessage called:");
      console.log("  Session ID: " + _0x560055);
      console.log("  To: " + _0x1c18ba);
      console.log("  Message: " + JSON.stringify(_0x6ec44e));
      console.log("  Type: " + _0x3d0df7);
      console.log("  Options: " + JSON.stringify(_0x4614d7));
      let _0x56345e;
      switch (_0x3d0df7) {
        case "text":
          console.log("📨 [APP SERVICE] Calling sendTextMessage with message: \"" + _0x6ec44e + "\"");
          _0x56345e = await this.whatsappService.sendTextMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "button":
        case "interactive":
          if (typeof _0x6ec44e === "object" && _0x6ec44e.buttons) {
            _0x56345e = await this.whatsappService.sendInteractiveMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          } else {
            _0x56345e = await this.whatsappService.sendButtonMessage(_0x560055, _0x1c18ba, _0x6ec44e, _0x4614d7.buttons || []);
          }
          break;
        case "list":
          if (typeof _0x6ec44e === "object" && _0x6ec44e.sections) {
            _0x56345e = await this.whatsappService.sendInteractiveMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          } else {
            _0x56345e = await this.whatsappService.sendListMessage(_0x560055, _0x1c18ba, _0x6ec44e, _0x4614d7.buttonText || "Select Option", _0x4614d7.sections || []);
          }
          break;
        case "poll":
          _0x56345e = await this.whatsappService.sendPollMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "contact":
          _0x56345e = await this.whatsappService.sendContactMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "location":
          _0x56345e = await this.whatsappService.sendLocationMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "media":
        case "image":
        case "video":
        case "audio":
        case "document":
          if (typeof _0x6ec44e === "object") {
            if (_0x6ec44e[_0x3d0df7]) {
              let _0xc60d29;
              if (typeof _0x6ec44e[_0x3d0df7] === "string") {
                _0xc60d29 = _0x6ec44e[_0x3d0df7];
              } else if (_0x6ec44e[_0x3d0df7].url || _0x6ec44e[_0x3d0df7].data) {
                _0xc60d29 = _0x6ec44e[_0x3d0df7].url || _0x6ec44e[_0x3d0df7].data;
              }
              if (_0xc60d29) {
                if (typeof _0xc60d29 === "string" && _0xc60d29.startsWith("data:")) {
                  const _0x188c7a = _0xc60d29.split(",")[1];
                  const _0x346772 = Buffer.from(_0x188c7a, "base64");
                  _0x56345e = await this.whatsappService.sendMediaMessage(_0x560055, _0x1c18ba, _0x346772, _0x3d0df7, _0x6ec44e.caption || "");
                } else {
                  _0x56345e = await this.whatsappService.sendMessage(_0x560055, _0x1c18ba, _0x6ec44e, _0x3d0df7);
                }
              } else {
                _0x56345e = await this.whatsappService.sendInteractiveMessage(_0x560055, _0x1c18ba, _0x6ec44e);
              }
            } else {
              _0x56345e = await this.whatsappService.sendInteractiveMessage(_0x560055, _0x1c18ba, _0x6ec44e);
            }
          } else {
            _0x56345e = await this.whatsappService.sendMediaMessage(_0x560055, _0x1c18ba, _0x4614d7.mediaBuffer, _0x4614d7.mediaType, _0x6ec44e);
          }
          break;
        case "template":
          _0x56345e = await this.whatsappService.sendTemplateMessage(_0x560055, _0x1c18ba, _0x6ec44e, _0x4614d7.variables || {});
          break;
        case "cta_button":
          _0x56345e = await this.whatsappService.sendCTAButtonMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "copy_code":
          _0x56345e = await this.whatsappService.sendCopyCodeMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        case "mixed_buttons":
          _0x56345e = await this.whatsappService.sendMixedButtonsMessage(_0x560055, _0x1c18ba, _0x6ec44e);
          break;
        default:
          throw new Error("Unsupported message type: " + _0x3d0df7);
      }
      if (_0x56345e.success) {
        const _0xa5b3e7 = await this.database.query("SELECT id FROM whatsapp_sessions WHERE session_id = ?", [_0x560055]);
        if (_0xa5b3e7.success && _0xa5b3e7.data.length > 0) {
          const _0x20bf22 = await this.database.run("\n            INSERT INTO message_history (\n              session_id, message_id, contact_phone,\n              content, message_type, direction, status, timestamp\n            ) VALUES (?, ?, ?, ?, ?, 'outgoing', 'sent', CURRENT_TIMESTAMP)\n          ", [_0xa5b3e7.data[0].id, _0x56345e.messageId, _0x1c18ba.replace("@s.whatsapp.net", ""), _0x6ec44e, _0x3d0df7]);
        } else {
          console.error("❌ DEBUG - Failed to find session in database:", _0x560055);
        }
      }
      return _0x56345e;
    } catch (_0x1b2154) {
      console.error("Error sending message from " + _0x560055 + ":", _0x1b2154);
      return {
        success: false,
        error: _0x1b2154.message
      };
    }
  }
  getModel(_0x65e8b8) {
    if (!this.models[_0x65e8b8]) {
      throw new Error("Model " + _0x65e8b8 + " not found");
    }
    return this.models[_0x65e8b8];
  }
  getDatabaseService() {
    return this.database;
  }
  getWhatsAppService() {
    return this.whatsappService;
  }
  getAIService() {
    return this.aiService;
  }
  getEventService() {
    return this.eventService;
  }
  getAIIntegration() {
    return this.aiIntegration;
  }
  getCampaignScheduler() {
    return this.campaignScheduler;
  }
  getFollowUpScheduler() {
    return this.followUpScheduler;
  }
  getWarmerService() {
    return this.warmerService;
  }
  getProxyService() {
    return this.proxyService;
  }
  getDeviceHealthService() {
    return this.deviceHealthService;
  }
  startDeviceHealthMonitoring() {
    if (this.deviceHealthInterval) {
      return;
    }
    setTimeout(() => {
      if (this.deviceHealthService) {
        this.deviceHealthService.computeAllScores().catch(_0x28c139 => {
          console.error("⚠️ Initial device health scoring failed:", _0x28c139.message);
        });
      }
    }, 60000);
    this.deviceHealthInterval = setInterval(() => {
      if (this.deviceHealthService) {
        this.deviceHealthService.computeAllScores().catch(_0x1ecb96 => {
          console.error("⚠️ Device health scoring failed:", _0x1ecb96.message);
        });
      }
    }, 1800000);
    if (this.deviceHealthInterval.unref) {
      this.deviceHealthInterval.unref();
    }
  }
  stopDeviceHealthMonitoring() {
    if (this.deviceHealthInterval) {
      clearInterval(this.deviceHealthInterval);
      this.deviceHealthInterval = null;
    }
  }
  getRecallBotService() {
    return this.recallBotService;
  }
  getTranslationService() {
    return this.translationService;
  }
  getSupportBotService() {
    return this.supportBotService;
  }
  getLiveChatService() {
    return this.liveChatService;
  }
  async requestPairingCode(_0x14da57, _0x366be2) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    return await this.whatsappService.requestPairingCode(_0x14da57, _0x366be2);
  }
  async createPairingCodeSession(_0x531a59) {
    if (!this.isInitialized) {
      throw new Error("Application not initialized");
    }
    try {
      const _0x34aa03 = await this.whatsappService.createPairingCodeSession(_0x531a59);
      return _0x34aa03;
    } catch (_0x5cfd24) {
      console.error("❌ AppService: Error creating pairing code session for " + _0x531a59 + ":", _0x5cfd24);
      return {
        success: false,
        error: _0x5cfd24.message,
        phoneNumber: _0x531a59
      };
    }
  }
}
module.exports = AppService;