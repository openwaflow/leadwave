const pino = require("pino");
class SupportBotService {
  constructor(_0x5c24e9, _0x397a57) {
    this.db = _0x5c24e9;
    this.whatsapp = _0x397a57;
    this.logger = pino({
      level: "info"
    });
  }
  async processMessage(_0x3c8917, _0xafc795) {
    try {
      const _0x25f086 = await this.getSettings(_0x3c8917);
      if (!_0x25f086) {
        return false;
      }
      if (!_0x25f086.is_active) {
        this.logger.info("⚠️ Support Bot: Bot is inactive for session " + _0x3c8917);
        return false;
      }
      this.logger.info("✅ Support Bot: Active bot found - \"" + _0x25f086.name + "\"");
      this.logger.info("   Trigger Field: " + _0x25f086.trigger_field);
      this.logger.info("   ID Pattern: " + _0x25f086.id_pattern);
      const _0xbd4983 = this.extractMessageText(_0xafc795);
      if (!_0xbd4983 || !_0xbd4983.trim()) {
        this.logger.info("⚠️ Support Bot: Empty message, skipping");
        return false;
      }
      const _0x1f7859 = _0xbd4983.trim();
      this.logger.info("📝 Support Bot: Message text = \"" + _0x1f7859 + "\"");
      const _0xa03a65 = new RegExp(_0x25f086.id_pattern);
      const _0xd35fa3 = _0xa03a65.test(_0x1f7859);
      this.logger.info("🔍 Support Bot: Pattern test - \"" + _0x1f7859 + "\" vs /" + _0x25f086.id_pattern + "/ = " + _0xd35fa3);
      if (!_0xd35fa3) {
        this.logger.info("❌ Support Bot: Message does not match pattern, skipping");
        return false;
      }
      this.logger.info("🤖 Support Bot: Pattern matched! Processing lookup for \"" + _0x1f7859 + "\"");
      const _0xd9d46e = _0xafc795.key?.remoteJid || _0xafc795.from;
      const _0x39950e = await this.lookupCustomer(_0x3c8917, _0x25f086.trigger_field, _0x1f7859);
      const _0x554609 = this.extractPhoneNumber(_0xd9d46e);
      if (_0x39950e) {
        this.logger.info("✅ Support Bot: Customer found!");
        this.logger.info("   Customer Data: " + JSON.stringify(_0x39950e));
        await this.sendResponse(_0x3c8917, _0xd9d46e, _0x39950e, _0x25f086.response_template, _0x25f086.attachment_path, _0x25f086.attachment_type || "image");
        await this.logLookup(_0x3c8917, _0x554609, _0x1f7859, true, true, null);
        this.logger.info("✅ Support Bot: Successfully sent response for \"" + _0x1f7859 + "\"");
        return true;
      } else {
        this.logger.info("❌ Support Bot: Customer \"" + _0x1f7859 + "\" not found in database");
        await this.sendNotFoundMessage(_0x3c8917, _0xd9d46e, _0x25f086);
        await this.logLookup(_0x3c8917, _0x554609, _0x1f7859, false, true, "Customer not found");
        this.logger.info("⚠️ Support Bot: Sent \"not found\" message");
        return true;
      }
    } catch (_0xd60168) {
      this.logger.error("❌ Support Bot: Error in message processing:", _0xd60168);
      return false;
    }
  }
  async lookupCustomer(_0x51e4a4, _0x536ecd, _0x3fd845) {
    try {
      this.logger.info("🔍 Looking up customer: session=" + _0x51e4a4 + ", field=" + _0x536ecd + ", value=\"" + _0x3fd845 + "\"");
      const _0x562df2 = await this.db.query("SELECT customer_data FROM support_bot_customers WHERE session_id = ?", [_0x51e4a4]);
      if (!_0x562df2.success || !_0x562df2.data || _0x562df2.data.length === 0) {
        this.logger.info("⚠️ No customer records found for session " + _0x51e4a4);
        return null;
      }
      this.logger.info("📊 Found " + _0x562df2.data.length + " customer records to search");
      let _0x1b80b4 = 0;
      for (const _0x57b891 of _0x562df2.data) {
        try {
          const _0x24f677 = JSON.parse(_0x57b891.customer_data);
          const _0x826161 = _0x24f677[_0x536ecd];
          this.logger.info("   Record " + (_0x1b80b4 + 1) + ": " + _0x536ecd + " = \"" + _0x826161 + "\" (comparing with \"" + _0x3fd845 + "\")");
          if (_0x826161 && _0x826161.toString().toLowerCase() === _0x3fd845.toLowerCase()) {
            this.logger.info("✅ MATCH FOUND at record " + (_0x1b80b4 + 1) + "!");
            return _0x24f677;
          }
          _0x1b80b4++;
        } catch (_0x1b828c) {
          this.logger.error("Error parsing customer data at record " + _0x1b80b4 + ":", _0x1b828c);
          _0x1b80b4++;
        }
      }
      this.logger.info("❌ No matching customer found after checking " + _0x1b80b4 + " records");
      return null;
    } catch (_0x296d61) {
      this.logger.error("Error looking up customer:", _0x296d61);
      return null;
    }
  }
  async sendResponse(_0x393f10, _0x44498d, _0x82b1c0, _0x2f6fdf, _0x5ebbec = null, _0x4fe2bd = "image") {
    try {
      let _0x5cba0c = _0x2f6fdf;
      Object.keys(_0x82b1c0).forEach(_0x432287 => {
        const _0x590a8e = _0x82b1c0[_0x432287] || "";
        const _0x232e83 = new RegExp("{{" + _0x432287 + "}}", "g");
        _0x5cba0c = _0x5cba0c.replace(_0x232e83, _0x590a8e);
      });
      if (_0x5ebbec) {
        const _0x581ea8 = require("fs").promises;
        const _0x3e216f = await _0x581ea8.readFile(_0x5ebbec);
        await this.whatsapp.sendMediaMessage(_0x393f10, _0x44498d, _0x3e216f, _0x4fe2bd, _0x5cba0c);
        this.logger.info("📤 Support Bot: Sent response with " + _0x4fe2bd + " to " + _0x44498d);
      } else {
        await this.whatsapp.sendMessage(_0x393f10, _0x44498d, _0x5cba0c);
        this.logger.info("📤 Support Bot: Sent response to " + _0x44498d);
      }
    } catch (_0x39b308) {
      this.logger.error("Error sending support bot response:", _0x39b308);
      throw _0x39b308;
    }
  }
  async sendNotFoundMessage(_0x3670ca, _0x1918ba, _0x2a8410) {
    try {
      if (_0x2a8410.not_found_template_id) {
        const _0x3c046d = await this.db.get("SELECT * FROM message_templates WHERE id = ?", [_0x2a8410.not_found_template_id]);
        if (_0x3c046d) {
          this.logger.info("📤 Support Bot: Sending template \"" + _0x3c046d.name + "\" as not found message");
          const _0x328823 = {
            ..._0x3c046d,
            buttons: _0x3c046d.buttons ? JSON.parse(_0x3c046d.buttons) : null,
            attachments: _0x3c046d.attachments ? JSON.parse(_0x3c046d.attachments) : null,
            interactive_settings: _0x3c046d.interactive_settings ? JSON.parse(_0x3c046d.interactive_settings) : null
          };
          await this.whatsapp.sendTemplateMessage(_0x3670ca, _0x1918ba, _0x328823, {});
          this.logger.info("📤 Support Bot: Sent template not found message to " + _0x1918ba);
          return;
        } else {
          this.logger.warn("⚠️ Support Bot: Template " + _0x2a8410.not_found_template_id + " not found, falling back to text message");
        }
      }
      await this.whatsapp.sendMessage(_0x3670ca, _0x1918ba, _0x2a8410.not_found_message);
      this.logger.info("📤 Support Bot: Sent text not found message to " + _0x1918ba);
    } catch (_0x5a8d69) {
      this.logger.error("Error sending not found message:", _0x5a8d69);
    }
  }
  async getSettings(_0x355db3) {
    try {
      const _0x1e26b0 = await this.db.get("SELECT * FROM support_bot_settings WHERE session_id = ? AND is_active = 1", [_0x355db3]);
      return _0x1e26b0;
    } catch (_0x47f2d4) {
      return null;
    }
  }
  async importCustomerData(_0x121736, _0x2968e0) {
    try {
      let _0x69d1da = 0;
      let _0x2570f6 = 0;
      await this.db.run("DELETE FROM support_bot_customers WHERE session_id = ?", [_0x121736]);
      for (const _0x25d1d5 of _0x2968e0) {
        try {
          const _0x2ca512 = await this.db.run("INSERT INTO support_bot_customers (session_id, customer_data, created_at, updated_at)\n             VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x121736, JSON.stringify(_0x25d1d5)]);
          if (_0x2ca512.success) {
            _0x69d1da++;
          } else {
            _0x2570f6++;
          }
        } catch (_0x5b2ed5) {
          this.logger.error("Error inserting customer record:", _0x5b2ed5);
          _0x2570f6++;
        }
      }
      this.logger.info("📊 Support Bot: Imported " + _0x69d1da + " records, " + _0x2570f6 + " errors");
      return {
        success: true,
        imported: _0x69d1da,
        errors: _0x2570f6,
        total: _0x2968e0.length
      };
    } catch (_0x536cab) {
      this.logger.error("Error importing customer data:", _0x536cab);
      return {
        success: false,
        error: _0x536cab.message
      };
    }
  }
  async saveFieldMappings(_0x4925e0, _0x2e7597) {
    try {
      await this.db.run("DELETE FROM support_bot_field_mappings WHERE session_id = ?", [_0x4925e0]);
      for (const _0x34d99f of _0x2e7597) {
        await this.db.run("INSERT INTO support_bot_field_mappings\n           (session_id, excel_column, field_name, field_type, is_trigger, display_order, created_at)\n           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x4925e0, _0x34d99f.excelColumn, _0x34d99f.fieldName, _0x34d99f.fieldType || "text", _0x34d99f.isTrigger ? 1 : 0, _0x34d99f.displayOrder || 0]);
      }
      this.logger.info("✅ Support Bot: Saved " + _0x2e7597.length + " field mappings");
      return {
        success: true
      };
    } catch (_0x2abee) {
      this.logger.error("Error saving field mappings:", _0x2abee);
      return {
        success: false,
        error: _0x2abee.message
      };
    }
  }
  async getFieldMappings(_0x3ed7eb) {
    try {
      const _0x3c0ee8 = await this.db.query("SELECT * FROM support_bot_field_mappings WHERE session_id = ? ORDER BY display_order ASC", [_0x3ed7eb]);
      if (_0x3c0ee8.success) {
        return _0x3c0ee8.data;
      } else {
        return [];
      }
    } catch (_0x245545) {
      this.logger.error("Error getting field mappings:", _0x245545);
      return [];
    }
  }
  async logLookup(_0x4e874d, _0x1280dd, _0x3c3572, _0x4ff39a, _0x57ef43, _0x37709e) {
    try {
      const _0xf6547b = new Date();
      const _0x19a95c = _0xf6547b.getFullYear();
      const _0xeec0f = String(_0xf6547b.getMonth() + 1).padStart(2, "0");
      const _0x32458e = String(_0xf6547b.getDate()).padStart(2, "0");
      const _0xd92594 = String(_0xf6547b.getHours()).padStart(2, "0");
      const _0x332d8a = String(_0xf6547b.getMinutes()).padStart(2, "0");
      const _0xa436a3 = String(_0xf6547b.getSeconds()).padStart(2, "0");
      const _0x4d805a = _0x19a95c + "-" + _0xeec0f + "-" + _0x32458e + " " + _0xd92594 + ":" + _0x332d8a + ":" + _0xa436a3;
      await this.db.run("INSERT INTO support_bot_logs\n         (session_id, user_phone, lookup_value, success, response_sent, error_message, created_at)\n         VALUES (?, ?, ?, ?, ?, ?, ?)", [_0x4e874d, _0x1280dd, _0x3c3572, _0x4ff39a ? 1 : 0, _0x57ef43 ? 1 : 0, _0x37709e, _0x4d805a]);
    } catch (_0x5c883f) {
      this.logger.error("Error logging lookup:", _0x5c883f);
    }
  }
  async getStatistics(_0x4f67c0) {
    try {
      const _0x422840 = await this.db.get("SELECT\n          COUNT(*) as total_lookups,\n          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_lookups,\n          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_lookups\n         FROM support_bot_logs\n         WHERE session_id = ?", [_0x4f67c0]);
      const _0x38d060 = await this.db.get("SELECT COUNT(*) as customer_count FROM support_bot_customers WHERE session_id = ?", [_0x4f67c0]);
      return {
        totalLookups: _0x422840.data?.total_lookups || 0,
        successfulLookups: _0x422840.data?.successful_lookups || 0,
        failedLookups: _0x422840.data?.failed_lookups || 0,
        customerCount: _0x38d060.data?.customer_count || 0
      };
    } catch (_0x5737ae) {
      this.logger.error("Error getting statistics:", _0x5737ae);
      return {
        totalLookups: 0,
        successfulLookups: 0,
        failedLookups: 0,
        customerCount: 0
      };
    }
  }
  extractMessageText(_0x9b4aa5) {
    if (_0x9b4aa5.message?.ephemeralMessage?.message) {
      const _0x5ef905 = _0x9b4aa5.message.ephemeralMessage.message;
      if (_0x5ef905.conversation) {
        return _0x5ef905.conversation;
      }
      if (_0x5ef905.extendedTextMessage?.text) {
        return _0x5ef905.extendedTextMessage.text;
      }
    }
    if (_0x9b4aa5.message?.conversation) {
      return _0x9b4aa5.message.conversation;
    }
    if (_0x9b4aa5.message?.extendedTextMessage?.text) {
      return _0x9b4aa5.message.extendedTextMessage.text;
    }
    if (_0x9b4aa5.text) {
      return _0x9b4aa5.text;
    }
    return "";
  }
  extractPhoneNumber(_0x5cab76) {
    if (!_0x5cab76) {
      return "";
    }
    return _0x5cab76.split("@")[0];
  }
  async uploadAttachment(_0x4c7594, _0xf7455a) {
    try {
      const _0x137891 = require("fs").promises;
      const _0x5c9281 = require("path");
      const {
        app: _0x4109ff
      } = require("electron");
      const _0xc06555 = _0x5c9281.join(_0x4109ff.getPath("userData"), "support-bot-attachments", _0xf7455a);
      await _0x137891.mkdir(_0xc06555, {
        recursive: true
      });
      const _0x288cfe = Date.now();
      const _0x69ddb7 = _0x5c9281.extname(_0x4c7594.name);
      const _0x5ed11c = "" + _0x288cfe + _0x69ddb7;
      const _0x26b964 = _0x5c9281.join(_0xc06555, _0x5ed11c);
      const _0x490f20 = _0x4c7594.data.replace(/^data:.*?;base64,/, "");
      const _0x285768 = Buffer.from(_0x490f20, "base64");
      await _0x137891.writeFile(_0x26b964, _0x285768);
      this.logger.info("📎 Support Bot: Attachment saved to " + _0x26b964);
      return {
        success: true,
        path: _0x26b964
      };
    } catch (_0x31cce4) {
      this.logger.error("Error uploading attachment:", _0x31cce4);
      return {
        success: false,
        error: _0x31cce4.message
      };
    }
  }
}
module.exports = SupportBotService;