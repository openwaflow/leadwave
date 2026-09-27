const nodemailer = require("nodemailer");
const DatabaseService = require("./database.service");
class EmailService {
  constructor() {
    this.databaseService = new DatabaseService();
    this.transporter = null;
    this.currentConfig = null;
  }
  setDatabaseService(_0x36eb14) {
    this.databaseService = _0x36eb14;
  }
  log(_0x540e71, _0xdc32b4 = "info") {
    const _0x33944b = new Date().toISOString();
  }
  async initialize() {
    try {
      await this.loadEmailConfiguration();
      if (this.currentConfig && this.currentConfig.enabled) {
        await this.createTransporter();
      }
    } catch (_0x42c1b3) {
      this.log("Failed to initialize email service: " + _0x42c1b3.message, "error");
    }
  }
  async loadEmailConfiguration() {
    try {
      const _0x1fea28 = await this.databaseService.query("SELECT * FROM email_settings WHERE enabled = 1 AND is_default = 1 ORDER BY id DESC LIMIT 1");
      if (_0x1fea28.success && _0x1fea28.data.length > 0) {
        this.currentConfig = _0x1fea28.data[0];
        this.log("Email configuration loaded successfully");
      } else {
        this.log("No active email configuration found", "warn");
        this.currentConfig = null;
      }
    } catch (_0x1b1de2) {
      this.log("Error loading email configuration: " + _0x1b1de2.message, "error");
      this.currentConfig = null;
    }
  }
  async createTransporter() {
    try {
      if (!this.currentConfig) {
        throw new Error("No email configuration available");
      }
      const _0x4154dc = JSON.parse(this.currentConfig.smtp_config);
      let _0x58cbb4;
      switch (this.currentConfig.provider) {
        case "smtp":
          _0x58cbb4 = {
            host: _0x4154dc.host,
            port: parseInt(_0x4154dc.port) || 587,
            secure: _0x4154dc.secure || false,
            auth: {
              user: _0x4154dc.username,
              pass: _0x4154dc.password
            },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000
          };
          if (_0x4154dc.disable_tls) {
            _0x58cbb4.ignoreTLS = true;
            _0x58cbb4.secure = false;
          } else {
            _0x58cbb4.tls = {
              rejectUnauthorized: _0x4154dc.reject_unauthorized !== false,
              ciphers: "SSLv3",
              secureProtocol: "TLSv1_2_method"
            };
          }
          if (parseInt(_0x4154dc.port) === 465) {
            _0x58cbb4.secure = true;
          } else if (parseInt(_0x4154dc.port) === 587 || parseInt(_0x4154dc.port) === 25) {
            _0x58cbb4.secure = false;
            if (!_0x4154dc.disable_tls) {
              _0x58cbb4.requireTLS = true;
            }
          }
          break;
        case "gmail":
          _0x58cbb4 = {
            service: "gmail",
            auth: {
              user: _0x4154dc.email,
              pass: _0x4154dc.app_password
            }
          };
          break;
        default:
          throw new Error("Unsupported email provider: " + this.currentConfig.provider);
      }
      this.transporter = nodemailer.createTransport(_0x58cbb4);
      await this.transporter.verify();
      this.log("Email transporter created successfully for provider: " + this.currentConfig.provider);
    } catch (_0x5c253b) {
      this.log("Error creating email transporter: " + _0x5c253b.message, "error");
      this.transporter = null;
      throw _0x5c253b;
    }
  }
  async sendEmail(_0x195ebb) {
    try {
      if (!this.transporter) {
        await this.initialize();
        if (!this.transporter) {
          throw new Error("Email service not configured or unavailable");
        }
      }
      const _0x2a1478 = {
        from: _0x195ebb.from || this.currentConfig.from_name + " <" + this.currentConfig.from_email + ">",
        to: _0x195ebb.to,
        cc: _0x195ebb.cc,
        bcc: _0x195ebb.bcc,
        subject: _0x195ebb.subject,
        text: _0x195ebb.text,
        html: _0x195ebb.html,
        attachments: _0x195ebb.attachments || []
      };
      const _0xdc0bd5 = await this.transporter.sendMail(_0x2a1478);
      await this.logEmailSent({
        ..._0x195ebb,
        message_id: _0xdc0bd5.messageId,
        status: "sent",
        sent_at: new Date().toISOString()
      });
      this.log("Email sent successfully to " + _0x195ebb.to + " (messageId: " + _0xdc0bd5.messageId + ")");
      return {
        success: true,
        messageId: _0xdc0bd5.messageId,
        response: _0xdc0bd5.response
      };
    } catch (_0x3d6da6) {
      this.log("Error sending email: " + _0x3d6da6.message, "error");
      await this.logEmailSent({
        ..._0x195ebb,
        status: "failed",
        error_message: _0x3d6da6.message,
        sent_at: new Date().toISOString()
      });
      return {
        success: false,
        error: _0x3d6da6.message
      };
    }
  }
  async processEmailTemplate(_0x42cba7, _0x2b63ab = {}) {
    try {
      const _0x5a8e76 = await this.databaseService.query("SELECT * FROM email_templates WHERE id = ? AND is_active = 1", [_0x42cba7]);
      if (!_0x5a8e76.success || _0x5a8e76.data.length === 0) {
        throw new Error("Email template with ID " + _0x42cba7 + " not found");
      }
      const _0x23d209 = _0x5a8e76.data[0];
      let _0x404d70 = _0x23d209.subject;
      let _0x5b27b9 = _0x23d209.html_content;
      let _0x277197 = _0x23d209.text_content;
      Object.keys(_0x2b63ab).forEach(_0x88c296 => {
        const _0x4f152e = new RegExp("{{\\s*" + _0x88c296 + "\\s*}}", "g");
        const _0x4148e6 = _0x2b63ab[_0x88c296] || "";
        _0x404d70 = _0x404d70.replace(_0x4f152e, _0x4148e6);
        _0x5b27b9 = _0x5b27b9.replace(_0x4f152e, _0x4148e6);
        _0x277197 = _0x277197.replace(_0x4f152e, _0x4148e6);
      });
      return {
        subject: _0x404d70,
        html: _0x5b27b9,
        text: _0x277197,
        template_name: _0x23d209.name
      };
    } catch (_0x38b63d) {
      this.log("Error processing email template: " + _0x38b63d.message, "error");
      throw _0x38b63d;
    }
  }
  async logEmailSent(_0x5e2699) {
    try {
      await this.databaseService.query("INSERT INTO email_logs (\n          to_email, cc_email, bcc_email, subject, message_id, \n          status, error_message, template_id, conversation_id, \n          sent_at, created_at\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x5e2699.to, _0x5e2699.cc || null, _0x5e2699.bcc || null, _0x5e2699.subject, _0x5e2699.message_id || null, _0x5e2699.status, _0x5e2699.error_message || null, _0x5e2699.template_id || null, _0x5e2699.conversation_id || null, _0x5e2699.sent_at]);
    } catch (_0xf9cbca) {
      this.log("Error logging email activity: " + _0xf9cbca.message, "error");
    }
  }
  async testEmailConfiguration(_0x3c21c0) {
    try {
      this.log("Testing email configuration for provider: " + _0x3c21c0.provider, "info");
      let _0x3797f7;
      switch (_0x3c21c0.provider) {
        case "smtp":
          const _0x5df6cb = {
            host: _0x3c21c0.host,
            port: parseInt(_0x3c21c0.port) || 587,
            secure: _0x3c21c0.secure || false,
            auth: {
              user: _0x3c21c0.username,
              pass: _0x3c21c0.password
            },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
            debug: true,
            logger: true
          };
          if (_0x3c21c0.disable_tls) {
            _0x5df6cb.ignoreTLS = true;
            _0x5df6cb.secure = false;
          } else {
            _0x5df6cb.tls = {
              rejectUnauthorized: _0x3c21c0.reject_unauthorized !== false,
              ciphers: "SSLv3",
              secureProtocol: "TLSv1_2_method"
            };
          }
          if (parseInt(_0x3c21c0.port) === 465) {
            _0x5df6cb.secure = true;
          } else if (parseInt(_0x3c21c0.port) === 587 || parseInt(_0x3c21c0.port) === 25) {
            _0x5df6cb.secure = false;
            _0x5df6cb.requireTLS = true;
          }
          this.log("SMTP Config: " + JSON.stringify(_0x5df6cb, null, 2), "debug");
          _0x3797f7 = nodemailer.createTransport(_0x5df6cb);
          break;
        case "gmail":
          _0x3797f7 = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: _0x3c21c0.email,
              pass: _0x3c21c0.app_password
            },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000
          });
          break;
        default:
          throw new Error("Testing not implemented for provider: " + _0x3c21c0.provider);
      }
      this.log("Attempting to verify SMTP connection...", "info");
      const _0x357d2c = _0x3797f7.verify();
      const _0x51ac0f = new Promise((_0x28303b, _0x412e35) => {
        setTimeout(() => _0x412e35(new Error("Connection timeout after 15 seconds")), 15000);
      });
      await Promise.race([_0x357d2c, _0x51ac0f]);
      this.log("Email configuration test successful", "info");
      return {
        success: true,
        message: "Email configuration test successful"
      };
    } catch (_0x4e7fdd) {
      this.log("Email configuration test failed: " + _0x4e7fdd.message, "error");
      let _0x146ea3 = _0x4e7fdd.message;
      if (_0x4e7fdd.message.includes("ECONNREFUSED")) {
        _0x146ea3 = "Connection refused. Please check the SMTP host and port.";
      } else if (_0x4e7fdd.message.includes("ENOTFOUND")) {
        _0x146ea3 = "SMTP host not found. Please check the hostname.";
      } else if (_0x4e7fdd.message.includes("ETIMEDOUT")) {
        _0x146ea3 = "Connection timeout. Please check your network connection and SMTP settings.";
      } else if (_0x4e7fdd.message.includes("TLS")) {
        _0x146ea3 = "TLS/SSL connection failed. Try disabling SSL/TLS or check your security settings.";
      } else if (_0x4e7fdd.message.includes("authentication")) {
        _0x146ea3 = "Authentication failed. Please check your username and password.";
      }
      return {
        success: false,
        error: _0x146ea3
      };
    }
  }
  async getEmailStats(_0x76941f = 30) {
    try {
      const _0x52e975 = await this.databaseService.query("SELECT \n          COUNT(*) as total_emails,\n          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_emails,\n          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails,\n          DATE(sent_at) as date\n        FROM email_logs \n        WHERE sent_at >= datetime('now', '-" + _0x76941f + " days')\n        GROUP BY DATE(sent_at)\n        ORDER BY date DESC");
      if (_0x52e975.success) {
        return _0x52e975.data;
      } else {
        return [];
      }
    } catch (_0x2fd343) {
      this.log("Error getting email stats: " + _0x2fd343.message, "error");
      return [];
    }
  }
}
module.exports = EmailService;