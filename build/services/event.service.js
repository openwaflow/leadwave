const {
  EventEmitter
} = require("events");
const pino = require("pino");
const MessageProcessorService = require("./message-processor.service");
class EventService extends EventEmitter {
  constructor(_0x2dc6cf, _0x5b976a) {
    super();
    this.databaseService = _0x2dc6cf;
    this.whatsappService = _0x5b976a;
    this.messageProcessor = new MessageProcessorService(_0x2dc6cf);
    this.logger = pino({
      level: "info"
    });
    this.emailService = null;
    this.supportBotService = null;
    this.setupWhatsAppEventListeners();
  }
  setupWhatsAppEventListeners() {
    this.whatsappService.on("qr_code", async _0x4a4b25 => {
      await this.handleQRCode(_0x4a4b25);
    });
    this.whatsappService.on("session_connected", async _0x2e2093 => {
      await this.handleSessionConnected(_0x2e2093);
    });
    this.whatsappService.on("session_connecting", async _0xc023ed => {
      await this.handleSessionConnecting(_0xc023ed);
    });
    this.whatsappService.on("session_disconnected", async _0x503c04 => {
      await this.handleSessionDisconnected(_0x503c04);
    });
    this.whatsappService.on("device_ban_suspected", _0x6e94ab => {
      this.emit("device_ban_suspected", _0x6e94ab);
    });
    this.whatsappService.on("session_status_update", async _0x25dd02 => {
      await this.handleSessionStatusUpdate(_0x25dd02);
    });
    this.whatsappService.on("message_received", async _0x47790e => {
      if (_0x47790e.message?.key?.fromMe !== false) {
        return;
      }
      await this.handleMessageReceived(_0x47790e);
    });
    this.whatsappService.on("contacts_update", async _0x5ebd9c => {
      await this.handleContactsUpdate(_0x5ebd9c);
    });
    this.whatsappService.on("call_received", async _0xc415b4 => {
      await this.handleCallReceived(_0xc415b4);
    });
    this.whatsappService.on("presence_update", async _0x2459d9 => {
      await this.handlePresenceUpdate(_0x2459d9);
    });
    this.whatsappService.on("session_deleted", async _0x319995 => {
      await this.handleSessionDeleted(_0x319995);
    });
    this.whatsappService.on("message_ack", _0x15d599 => {
      this.emit("message_ack", _0x15d599);
    });
  }
  async handleQRCode(_0x412cb0) {
    const {
      sessionId: _0x13a94d,
      qrCode: _0x58ed91,
      timestamp: _0x18a21b
    } = _0x412cb0;
    if (!_0x58ed91 || !_0x58ed91.startsWith("data:image/")) {
      this.logger.warn("Invalid QR code data for session " + _0x13a94d);
      return;
    }
    this.emit("qr_code_generated", {
      sessionId: _0x13a94d,
      qrCode: _0x58ed91,
      timestamp: _0x18a21b || new Date().toISOString(),
      status: "qr_ready"
    });
    this.logger.info("QR code generated and forwarded for session " + _0x13a94d);
    try {
      await this.databaseService.run("UPDATE whatsapp_sessions SET status = ?, qr_code = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?", ["qr_ready", _0x58ed91, _0x13a94d]);
    } catch (_0x5c1e13) {
      this.logger.error("DB update failed for QR code (session " + _0x13a94d + "):", _0x5c1e13);
      console.error("❌ QR code DB update error for " + _0x13a94d + ":", _0x5c1e13);
    }
  }
  async handleSessionConnected(_0x4b1476) {
    const {
      sessionId: _0x448f9a,
      phoneNumber: _0x40da7e,
      profilePicture: _0x376c8d,
      status: _0x22f5cc,
      isLoggedIn: _0x3397ed
    } = _0x4b1476;
    try {
      await this.databaseService.run("\n        UPDATE whatsapp_sessions \n        SET status = 'connected', \n            phone_number = ?, \n            profile_picture = ?,\n            is_active = 1,\n            last_seen = CURRENT_TIMESTAMP,\n            connected_at = CURRENT_TIMESTAMP,\n            qr_code = NULL,\n            updated_at = CURRENT_TIMESTAMP\n        WHERE session_id = ?\n      ", [_0x40da7e || null, _0x376c8d || null, _0x448f9a]);
      await this.databaseService.run("\n        INSERT INTO activity_logs (action_type, description, metadata)\n        VALUES (?, ?, ?)\n      ", ["session_connected", "Session " + _0x448f9a + " connected" + (_0x40da7e ? " with phone " + _0x40da7e : ""), JSON.stringify({
        sessionId: _0x448f9a,
        phoneNumber: _0x40da7e || "unknown"
      })]);
      this.emit("session_connected", {
        sessionId: _0x448f9a,
        phoneNumber: _0x40da7e,
        profilePicture: _0x376c8d,
        status: _0x22f5cc || "connected",
        isLoggedIn: _0x3397ed !== undefined ? _0x3397ed : true,
        timestamp: new Date()
      });
      this.logger.info("Session " + _0x448f9a + " connected" + (_0x40da7e ? " with phone " + _0x40da7e : ""));
    } catch (_0x836b3c) {
      this.logger.error("Error handling session connected for " + _0x448f9a + ":", _0x836b3c);
    }
  }
  async handleSessionConnecting(_0xd3e86d) {
    const {
      sessionId: _0x3ac168,
      status: _0x3dce9c,
      isLoggedIn: _0x1726f6
    } = _0xd3e86d;
    try {
      const _0x5f5b4b = _0x3dce9c || "connecting";
      await this.databaseService.run("\n        UPDATE whatsapp_sessions\n        SET status = ?,\n            last_seen = CURRENT_TIMESTAMP,\n            updated_at = CURRENT_TIMESTAMP\n        WHERE session_id = ?\n      ", [_0x5f5b4b, _0x3ac168]);
      this.emit("session_connecting", {
        sessionId: _0x3ac168,
        status: _0x5f5b4b,
        isLoggedIn: _0x1726f6 !== undefined ? _0x1726f6 : false,
        timestamp: new Date()
      });
      this.logger.info("Session " + _0x3ac168 + " is " + _0x5f5b4b + "...");
    } catch (_0x5adfc7) {
      this.logger.error("Error handling session connecting for " + _0x3ac168 + ":", _0x5adfc7);
    }
  }
  async handleSessionDisconnected(_0x56492b) {
    const {
      sessionId: _0x323f2c,
      reason: _0x4919a6
    } = _0x56492b;
    try {
      await this.databaseService.run("\n        UPDATE whatsapp_sessions \n        SET status = 'disconnected', \n            disconnected_at = CURRENT_TIMESTAMP,\n            updated_at = CURRENT_TIMESTAMP\n        WHERE session_id = ?\n      ", [_0x323f2c]);
      await this.databaseService.run("\n        INSERT INTO activity_logs (action_type, description, metadata)\n        VALUES (?, ?, ?)\n      ", ["session_disconnected", "Session " + _0x323f2c + " disconnected: " + _0x4919a6, JSON.stringify({
        sessionId: _0x323f2c,
        reason: _0x4919a6
      })]);
      this.emit("session_disconnected", {
        sessionId: _0x323f2c,
        reason: _0x4919a6,
        timestamp: new Date()
      });
      this.logger.info("Session " + _0x323f2c + " disconnected: " + _0x4919a6);
    } catch (_0x28c507) {
      this.logger.error("Error handling session disconnected for " + _0x323f2c + ":", _0x28c507);
    }
  }
  async handleSessionStatusUpdate(_0x106464) {
    const {
      sessionId: _0x1e5a24,
      status: _0x58e0c7,
      isLoggedIn: _0xe28057
    } = _0x106464;
    try {
      const _0x1562c1 = ["status = ?", "last_seen = CURRENT_TIMESTAMP", "updated_at = CURRENT_TIMESTAMP"];
      const _0xda5109 = [_0x58e0c7];
      if (_0x58e0c7 === "connected" && _0xe28057) {
        _0x1562c1.push("is_active = 1");
        _0x1562c1.push("connected_at = CURRENT_TIMESTAMP");
      }
      await this.databaseService.run("\n        UPDATE whatsapp_sessions \n        SET " + _0x1562c1.join(", ") + "\n        WHERE session_id = ?\n      ", [..._0xda5109, _0x1e5a24]);
      this.emit("session_status_update", {
        sessionId: _0x1e5a24,
        status: _0x58e0c7,
        isLoggedIn: _0xe28057,
        timestamp: new Date()
      });
    } catch (_0x116aa7) {
      this.logger.error("Error handling session status update for " + _0x1e5a24 + ":", _0x116aa7);
    }
  }
  async handleMessageReceived(_0x478a2c) {
    const {
      sessionId: _0x53b0af,
      message: _0x238a93,
      formattedMessage: _0x2debd0
    } = _0x478a2c;
    try {
      const _0x5b7e65 = this.messageProcessor.parseIncomingMessage(_0x238a93);
      const _0x113c2d = {
        pushName: _0x238a93.pushName || null,
        verifiedBizName: _0x238a93.verifiedBizName || null,
        originalMessage: _0x238a93
      };
      this.messageContextCache = this.messageContextCache || new Map();
      this.messageContextCache.set(_0x5b7e65.from, _0x113c2d);
      const _0x9364b4 = _0x2debd0 || _0x5b7e65;
      if (_0x9364b4.from && _0x9364b4.text) {
        await this.databaseService.run("\n          INSERT INTO message_history (\n            session_id, message_id, contact_phone,\n            content, message_type, direction, status, timestamp\n          ) VALUES (?, ?, ?, ?, ?, 'incoming', 'received', ?)\n        ", [_0x53b0af, _0x9364b4.id, this.messageProcessor.extractPhoneNumber(_0x9364b4.from), _0x9364b4.text, _0x9364b4.type, new Date().toISOString()]);
      }
      const _0x2005bc = await this.checkSupportBotLookup(_0x53b0af, _0x238a93);
      if (_0x2005bc) {
        this.logger.info("🤖 Support Bot processed message - skipping other automated responses");
        await this.updateContactFromMessage(_0x9364b4);
        this.emit("message_received", {
          sessionId: _0x53b0af,
          message: _0x238a93,
          timestamp: new Date()
        });
        return;
      }
      await this.checkAutoReplyRules(_0x53b0af, _0x238a93);
      await this.checkChatbotTriggers(_0x53b0af, _0x238a93);
      await this.checkRecallBotMessages(_0x53b0af, _0x238a93);
      await this.updateContactFromMessage(_0x9364b4);
      this.emit("message_received", {
        sessionId: _0x53b0af,
        message: _0x238a93,
        timestamp: new Date()
      });
      this.logger.info("Message received in session " + _0x53b0af + " from " + _0x238a93.from + (_0x113c2d.pushName ? " (" + _0x113c2d.pushName + ")" : ""));
    } catch (_0x36e945) {
      this.logger.error("Error handling message received for " + _0x53b0af + ":", _0x36e945);
    }
  }
  async checkRecallBotMessages(_0x41ab97, _0x11d445) {
    try {
      if (!global.appService || !global.appService.getRecallBotService) {
        return;
      }
      const _0x4f9876 = global.appService.getRecallBotService();
      if (!_0x4f9876 || !_0x4f9876.isInitialized) {
        return;
      }
      const _0x3228e7 = await this.shouldProcessForRecallBot(_0x41ab97, _0x11d445);
      if (_0x3228e7) {
        this.logger.info("🤖 Processing message for Recall Bot in session " + _0x41ab97);
        const _0x4e20bf = await _0x4f9876.processMessage(_0x41ab97, _0x11d445);
        if (_0x4e20bf.success) {
          this.logger.info("✅ Recall Bot processed message successfully in session " + _0x41ab97);
          _0x11d445._recallBotProcessed = true;
        } else {
          this.logger.warn("⚠️ Recall Bot failed to process message in session " + _0x41ab97 + ": " + (_0x4e20bf.error || _0x4e20bf.reason));
        }
      }
    } catch (_0x563268) {
      this.logger.error("Error checking recall bot messages for session " + _0x41ab97 + ":", _0x563268);
    }
  }
  async shouldProcessForRecallBot(_0x3098b5, _0x4435a3) {
    try {
      if (!global.appService || !global.appService.getRecallBotService) {
        return false;
      }
      const _0x31e261 = global.appService.getRecallBotService();
      if (!_0x31e261) {
        return false;
      }
      const _0x545010 = await _0x31e261.isEnabledForSession(_0x3098b5);
      if (!_0x545010) {
        return false;
      }
      const _0x67c108 = _0x4435a3.messageType || _0x4435a3.type;
      const _0x566929 = (_0x4435a3.message?.conversation || _0x4435a3.message?.extendedTextMessage?.text || _0x4435a3.text || "").toLowerCase();
      if (_0x566929) {
        const _0x10fed9 = ["remind", "reminder", "remember", "alert", "notify", "notification", "schedule", "appointment", "meeting", "call", "task", "todo", "tomorrow", "today", "next week", "next month", "later", "at", "on", "in", "every", "daily", "weekly", "monthly", "cancel reminder", "delete reminder", "remove reminder", "cancel all", "delete all", "clear all", "remove all", "list reminders", "show reminders", "my reminders", "list all"];
        const _0x1b0b81 = _0x10fed9.some(_0x416244 => _0x566929.includes(_0x416244));
        const _0x12623a = [/\d{1,2}:\d{2}/, /\d{1,2}\s*(am|pm)/i, /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, /\b\d{1,2}(st|nd|rd|th)\b/i];
        const _0x2d39cd = _0x12623a.some(_0x25057d => _0x25057d.test(_0x566929));
        const _0x350dfa = _0x1b0b81 || _0x2d39cd;
        return _0x350dfa;
      }
      const _0x736a28 = _0x4435a3.message?.audioMessage || _0x4435a3.message?.ptt || _0x67c108 && _0x67c108.includes("audio") || _0x4435a3.type && _0x4435a3.type.includes("audio");
      if (_0x736a28) {
        return true;
      }
      return false;
    } catch (_0x28c8b2) {
      this.logger.error("Error determining if message should be processed by recall bot:", _0x28c8b2);
      return false;
    }
  }
  async handleContactsUpdate(_0x55466b) {
    const {
      sessionId: _0x2440a6,
      contacts: _0x1948a4
    } = _0x55466b;
    try {
      for (const _0x5ea6c7 of _0x1948a4) {
        const _0x2734d8 = _0x5ea6c7.id.split("@")[0];
        const _0x2df678 = _0x5ea6c7.name || _0x5ea6c7.pushName || "";
        const _0x39427e = await this.databaseService.get("SELECT id, name FROM contacts WHERE phone_number = ? AND is_active = 1", [_0x2734d8]);
        if (_0x39427e) {
          const _0x322229 = _0x2df678 && _0x2df678 !== _0x2734d8 && (!_0x39427e.name || _0x39427e.name === _0x2734d8 || _0x39427e.name.length < _0x2df678.length);
          if (_0x322229) {
            await this.databaseService.run("\n              UPDATE contacts\n              SET name = ?, updated_at = CURRENT_TIMESTAMP\n              WHERE phone_number = ? AND is_active = 1\n            ", [_0x2df678, _0x2734d8]);
          } else {}
        } else {
          await this.databaseService.run("\n            INSERT INTO contacts (\n              phone_number, name, is_active, created_at, updated_at\n            ) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n          ", [_0x2734d8, _0x2df678]);
        }
      }
      this.logger.info("Updated " + _0x1948a4.length + " contacts for session " + _0x2440a6);
    } catch (_0x292e63) {
      this.logger.error("Error handling contacts update for " + _0x2440a6 + ":", _0x292e63);
    }
  }
  async handleCallReceived(_0x3afdb2) {
    const {
      sessionId: _0x2e104f,
      call: _0x23d4d8
    } = _0x3afdb2;
    this.logger.info("🔔 EVENT SERVICE: handleCallReceived called for " + _0x2e104f + " from " + _0x23d4d8.from + ", status: " + _0x23d4d8.status);
    try {
      await this.databaseService.run("\n        INSERT INTO activity_logs (action_type, description, metadata)\n        VALUES (?, ?, ?)\n      ", ["call_received", "Call received in session " + _0x2e104f + " from " + _0x23d4d8.from, JSON.stringify({
        sessionId: _0x2e104f,
        call: _0x23d4d8
      })]);
      this.logger.info("🔔 EVENT SERVICE: About to call processCallResponderRules...");
      await this.whatsappService.processCallResponderRules(_0x2e104f, _0x23d4d8);
      this.logger.info("🔔 EVENT SERVICE: processCallResponderRules completed");
      this.emit("call_received", {
        sessionId: _0x2e104f,
        call: _0x23d4d8,
        timestamp: new Date()
      });
      this.logger.info("Call received in session " + _0x2e104f + " from " + _0x23d4d8.from);
    } catch (_0x5648bf) {
      this.logger.error("Error handling call received for " + _0x2e104f + ":", _0x5648bf);
    }
  }
  async handlePresenceUpdate(_0x5019a3) {
    const {
      sessionId: _0x3fcd80,
      presence: _0xfc680a
    } = _0x5019a3;
    try {
      if (_0xfc680a.id && _0xfc680a.lastSeen) {
        await this.databaseService.run("\n          UPDATE contacts \n          SET last_seen = ?, updated_at = CURRENT_TIMESTAMP\n          WHERE phone_number = ?\n        ", [_0xfc680a.lastSeen, _0xfc680a.id.split("@")[0]]);
      }
      this.emit("presence_update", _0x5019a3);
    } catch (_0x477098) {
      this.logger.error("Error handling presence update for " + _0x3fcd80 + ":", _0x477098);
    }
  }
  async handleSessionDeleted(_0x4d04d3) {
    const {
      sessionId: _0xc528f6
    } = _0x4d04d3;
    try {
      await this.databaseService.run("UPDATE whatsapp_sessions SET is_active = 0, status = \"deleted\", updated_at = CURRENT_TIMESTAMP WHERE session_id = ?", [_0xc528f6]);
      await this.databaseService.run("\n        INSERT INTO activity_logs (action_type, description, metadata)\n        VALUES (?, ?, ?)\n      ", ["session_deleted", "Session " + _0xc528f6 + " deleted", JSON.stringify({
        sessionId: _0xc528f6
      })]);
      this.emit("session_deleted", {
        sessionId: _0xc528f6,
        timestamp: new Date()
      });
      this.logger.info("Session " + _0xc528f6 + " deleted");
    } catch (_0x289894) {
      this.logger.error("Error handling session deleted for " + _0xc528f6 + ":", _0x289894);
    }
  }
  async checkSupportBotLookup(_0xc5ced3, _0x5920e6) {
    try {
      if (!this.supportBotService) {
        return false;
      }
      const _0x5ebd7d = this.messageProcessor.parseIncomingMessage(_0x5920e6);
      if (!_0x5ebd7d.from || _0x5ebd7d.fromMe || !_0x5ebd7d.text?.trim()) {
        return false;
      }
      const _0x45152d = await this.supportBotService.processMessage(_0xc5ced3, _0x5920e6);
      return _0x45152d;
    } catch (_0x83ea14) {
      this.logger.error("❌ EVENT SERVICE: Error checking Support Bot lookup:", _0x83ea14);
      return false;
    }
  }
  async checkAutoReplyRules(_0x5e6730, _0x39381c) {
    try {
      const _0x3d3a5e = this.messageProcessor.parseIncomingMessage(_0x39381c);
      if (!_0x3d3a5e.from || _0x3d3a5e.fromMe || !_0x3d3a5e.text?.trim()) {
        return;
      }
      const _0x3dac8a = this.messageProcessor.extractPhoneNumber(_0x3d3a5e.from);
      const _0x3a58e5 = await this.databaseService.query("\n        SELECT * FROM auto_reply_rules\n        WHERE is_active = 1\n        ORDER BY priority ASC\n      ");
      if (!_0x3a58e5.success || !_0x3a58e5.data?.length) {
        this.logger.debug("📧 No active auto-reply rules found");
        return;
      }
      const _0x5ed28b = _0x3a58e5.data.filter(_0x3d6847 => {
        try {
          const _0x2e4ba9 = JSON.parse(_0x3d6847.session_ids || "[]");
          if (_0x2e4ba9.length === 0 && _0x3d6847.session_id) {
            return _0x3d6847.session_id === _0x5e6730;
          }
          return _0x2e4ba9.includes(_0x5e6730);
        } catch {
          return false;
        }
      });
      if (!_0x5ed28b.length) {
        this.logger.debug("📧 No active auto-reply rules found for session " + _0x5e6730);
        return;
      }
      this.logger.info("📧 Found " + _0x5ed28b.length + " active auto-reply rules for session " + _0x5e6730);
      const _0x381d7 = _0x3d3a5e.text.toLowerCase().trim();
      const _0x22119a = _0x3d3a5e.from;
      const _0x1d1831 = _0x22119a?.endsWith("@g.us");
      for (const _0x5832f4 of _0x5ed28b) {
        const _0x2afca2 = _0x5832f4.target_type || "all";
        let _0x18ed11 = true;
        if (_0x2afca2 === "individual" && _0x1d1831) {
          this.logger.info("📧 Skipping auto-reply rule \"" + _0x5832f4.name + "\" - configured for individual chats only, but message is from group");
          _0x18ed11 = false;
        } else if (_0x2afca2 === "group") {
          if (!_0x1d1831) {
            this.logger.info("📧 Skipping auto-reply rule \"" + _0x5832f4.name + "\" - configured for groups only, but message is from individual");
            _0x18ed11 = false;
          } else {
            const _0x211088 = _0x5832f4.target_groups ? JSON.parse(_0x5832f4.target_groups) : [];
            if (_0x211088.length > 0 && !_0x211088.includes(_0x22119a)) {
              this.logger.info("📧 Skipping auto-reply rule \"" + _0x5832f4.name + "\" - group " + _0x22119a + " not in allowed groups list");
              _0x18ed11 = false;
            }
          }
        }
        if (_0x18ed11) {
          if (_0x5832f4.cooldown_minutes > 0) {
            const _0x54be7e = await this.databaseService.get("\n              SELECT last_reply_at FROM auto_reply_cooldowns\n              WHERE rule_id = ? AND user_phone = ?\n            ", [_0x5832f4.id, _0x3dac8a]);
            if (_0x54be7e) {
              const _0x3f5441 = new Date(_0x54be7e.last_reply_at);
              const _0x170cf3 = new Date();
              const _0x283d89 = (_0x170cf3 - _0x3f5441) / 60000;
              if (_0x283d89 < _0x5832f4.cooldown_minutes) {
                this.logger.info("📧 ⏰ Auto-reply cooldown active for rule \"" + _0x5832f4.name + "\" and user " + _0x3dac8a + " (" + _0x283d89.toFixed(1) + " minutes ago, cooldown: " + _0x5832f4.cooldown_minutes + " minutes)");
                continue;
              } else {
                this.logger.info("📧 ✅ Auto-reply cooldown expired for rule \"" + _0x5832f4.name + "\" and user " + _0x3dac8a + " (" + _0x283d89.toFixed(1) + " minutes ago, cooldown: " + _0x5832f4.cooldown_minutes + " minutes)");
              }
            } else {
              this.logger.info("📧 ✅ Auto-reply no previous cooldown record for rule \"" + _0x5832f4.name + "\" and user " + _0x3dac8a);
            }
          }
          if (_0x5832f4.typing_enabled && _0x5832f4.typing_seconds > 0) {
            const _0x4f5fc5 = Math.min(_0x5832f4.typing_seconds, 30);
            this.logger.info("📧 ⌨️ Showing typing indicator for " + _0x4f5fc5 + "s before auto-reply \"" + _0x5832f4.name + "\"");
            await this.whatsappService.sendPresenceUpdate(_0x5e6730, _0x3d3a5e.from, "composing");
            await new Promise(_0x5aecfb => setTimeout(_0x5aecfb, _0x4f5fc5 * 1000));
            await this.whatsappService.sendPresenceUpdate(_0x5e6730, _0x3d3a5e.from, "paused");
          }
          let _0x1cb5d2 = _0x5832f4.response;
          let _0x4e4147 = "text";
          let _0x3cf28f = {};
          let _0x235497;
          if (_0x5832f4.template_id) {
            const _0x13f501 = await this.databaseService.get("SELECT * FROM message_templates WHERE id = ?", [_0x5832f4.template_id]);
            if (_0x13f501) {
              const _0x23e1d7 = {
                user_phone: _0x3dac8a,
                user_message: _0x3d3a5e.text,
                name: _0x3dac8a.split("@")[0],
                phone: _0x3dac8a.split("@")[0]
              };
              _0x235497 = await this.whatsappService.sendTemplateMessage(_0x5e6730, _0x3d3a5e.from, _0x13f501, _0x23e1d7);
            } else {
              this.logger.warn("Template " + _0x5832f4.template_id + " not found for auto-reply rule " + _0x5832f4.name);
              continue;
            }
          } else {
            _0x235497 = await this.whatsappService.sendMessage(_0x5e6730, _0x3d3a5e.from, _0x1cb5d2, "text");
          }
          if (_0x235497.success) {
            if (_0x5832f4.cooldown_minutes > 0) {
              const _0x406355 = new Date().toISOString();
              await this.databaseService.run("\n                INSERT OR REPLACE INTO auto_reply_cooldowns (rule_id, user_phone, last_reply_at)\n                VALUES (?, ?, ?)\n              ", [_0x5832f4.id, _0x3dac8a, _0x406355]);
              this.logger.info("📧 ⏰ Updated cooldown record for auto-reply rule \"" + _0x5832f4.name + "\" and user " + _0x3dac8a);
            }
            await this.databaseService.run("\n              UPDATE auto_reply_rules\n              SET response_count = COALESCE(response_count, 0) + 1,\n                  last_used = CURRENT_TIMESTAMP,\n                  updated_at = CURRENT_TIMESTAMP\n              WHERE id = ?\n            ", [_0x5832f4.id]);
            await this.databaseService.run("\n              INSERT INTO message_history (\n                session_id, contact_phone, content, message_type,\n                direction, status, timestamp, created_at\n              ) VALUES (?, ?, ?, ?, 'outgoing', 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n            ", [_0x5e6730, _0x3dac8a, _0x1cb5d2, _0x4e4147]);
            await this.databaseService.run("\n              INSERT INTO activity_logs (action_type, description, metadata)\n              VALUES (?, ?, ?)\n            ", ["auto_reply_sent", "Auto-reply sent for rule \"" + _0x5832f4.name + "\" to " + _0x3dac8a, JSON.stringify({
              sessionId: _0x5e6730,
              ruleId: _0x5832f4.id,
              ruleName: _0x5832f4.name,
              fromNumber: _0x3d3a5e.from,
              userPhone: _0x3dac8a,
              userMessage: _0x381d7,
              response: _0x1cb5d2,
              messageType: _0x4e4147
            })]);
            this.logger.info("Auto-reply sent for rule \"" + _0x5832f4.name + "\" to " + _0x3dac8a);
          } else {
            this.logger.error("Failed to send auto-reply for rule \"" + _0x5832f4.name + "\" to " + _0x3dac8a + ":", _0x235497.error);
          }
          break;
        }
      }
    } catch (_0x2dc06a) {
      this.logger.error("Error checking auto-reply rules for " + _0x5e6730 + ":", _0x2dc06a);
      console.error("❌ Auto-reply error details:", _0x2dc06a.message);
      console.error("❌ Auto-reply error stack:", _0x2dc06a.stack);
    }
  }
  async checkChatbotTriggers(_0x2fb7bd, _0xf0ca97) {
    try {
      this.logger.info("🤖 Checking chatbot triggers for session " + _0x2fb7bd);
      if (_0xf0ca97._aiProcessed) {
        this.logger.info("🤖 ⏭️ Skipping old chatbot flow - message already processed by AI chatbot system");
        return;
      }
      const _0x3822e7 = this.messageProcessor.parseIncomingMessage(_0xf0ca97);
      this.logger.info("🤖 Parsed message: " + JSON.stringify(_0x3822e7));
      if (_0x3822e7.type === "interactive_response" || _0x3822e7.type === "button_response" || _0x3822e7.type === "list_response" || _0x3822e7.type === "interactive_list_response" || _0x3822e7.type === "template_button_response") {
        this.logger.info("🤖 ✅ BUTTON/INTERACTIVE RESPONSE DETECTED! Type: " + _0x3822e7.type + ", Text: \"" + _0x3822e7.text + "\"");
      }
      if (!_0x3822e7.from || _0x3822e7.fromMe || !_0x3822e7.text?.trim()) {
        this.logger.info("🤖 Skipping chatbot check - fromMe: " + _0x3822e7.fromMe + ", text: \"" + _0x3822e7.text + "\"");
        return;
      }
      const _0x52ca36 = this.messageProcessor.extractPhoneNumber(_0x3822e7.from);
      this.logger.info("🤖 User phone: " + _0x52ca36 + ", message text: \"" + _0x3822e7.text + "\", message type: " + _0x3822e7.type);
      const _0x193d13 = await this.databaseService.get("\n        SELECT cc.*, cf.name as flow_name, cf.is_active as flow_is_active FROM chatbot_conversations cc\n        JOIN chatbot_flows cf ON cc.flow_id = cf.id\n        WHERE cc.session_id = ? AND cc.user_phone = ? AND cc.is_active = 1\n        ORDER BY cc.last_activity DESC\n        LIMIT 1\n      ", [_0x2fb7bd, _0x52ca36]);
      this.logger.info("🤖 Active conversation check: " + (_0x193d13 ? "Found conversation ID " + _0x193d13.id : "No active conversation"));
      if (_0x193d13 && _0x193d13.id) {
        if (!_0x193d13.flow_is_active) {
          this.logger.info("🤖 Flow " + _0x193d13.flow_id + " is inactive, ending conversation " + _0x193d13.id);
          await this.endChatbotConversation(_0x193d13.id);
          await this.checkNewChatbotTriggers(_0x2fb7bd, _0x3822e7);
          return;
        }
        this.logger.info("🤖 Found active conversation " + _0x193d13.id + ", checking if it should continue or restart");
        const _0x19160c = (_0x3822e7.text || "").trim();
        const _0xb010a3 = await this.databaseService.all("\n          SELECT * FROM chatbot_flows\n          WHERE is_active = 1\n          ORDER BY id ASC\n        ");
        const _0x4edc15 = (_0xb010a3.data || []).filter(_0x4ab39c => {
          try {
            const _0x5e2ccf = JSON.parse(_0x4ab39c.session_ids || "[]");
            if (_0x5e2ccf.length === 0 && _0x4ab39c.session_id) {
              return _0x4ab39c.session_id === _0x2fb7bd;
            }
            return _0x5e2ccf.includes(_0x2fb7bd);
          } catch {
            return false;
          }
        });
        let _0x4d7343 = false;
        if (_0xb010a3.success && _0x4edc15.length) {
          for (const _0x337e11 of _0x4edc15) {
            const _0x347452 = _0x337e11.keyword_match_type || "contains";
            const _0x5c13ba = _0x337e11.keyword_case_sensitive || false;
            const _0x5cfec6 = _0x5c13ba ? _0x337e11.trigger_keywords.split(",").map(_0x38a3dd => _0x38a3dd.trim()) : _0x337e11.trigger_keywords.toLowerCase().split(",").map(_0x27bcc4 => _0x27bcc4.trim());
            const _0x1dcdde = _0x5c13ba ? _0x19160c : _0x19160c.toLowerCase();
            const _0x580f91 = _0x5cfec6.some(_0x1ae061 => this.messageProcessor.matchesKeyword(_0x1dcdde, _0x1ae061, _0x347452));
            if (_0x580f91) {
              this.logger.info("🤖 Message \"" + _0x19160c + "\" matches trigger keyword, restarting flow");
              _0x4d7343 = true;
              await this.endChatbotConversation(_0x193d13.id);
              await this.startChatbotFlow(_0x2fb7bd, _0x3822e7, _0x337e11);
            }
          }
        }
        if (!_0x4d7343) {
          await this.processChatbotConversation(_0x2fb7bd, _0x3822e7, _0x193d13);
          _0x3822e7._flowProcessed = true;
          _0xf0ca97._flowProcessed = true;
        }
      } else {
        await this.checkNewChatbotTriggers(_0x2fb7bd, _0x3822e7);
      }
    } catch (_0x251962) {
      this.logger.error("Error checking chatbot triggers:", _0x251962);
    }
  }
  async checkNewChatbotTriggers(_0x59001e, _0xf14662) {
    try {
      this.logger.info("🤖 Checking new chatbot triggers for session " + _0x59001e);
      const _0x2ed4c8 = await this.databaseService.all("\n        SELECT * FROM chatbot_flows\n        WHERE is_active = 1\n        ORDER BY id ASC\n      ");
      if (!_0x2ed4c8.success || !_0x2ed4c8.data) {
        this.logger.info("🤖 No active chatbot flows found");
        return;
      }
      const _0xc68d72 = _0x2ed4c8.data.filter(_0x541a15 => {
        try {
          const _0x447a11 = JSON.parse(_0x541a15.session_ids || "[]");
          if (_0x447a11.length === 0 && _0x541a15.session_id) {
            return _0x541a15.session_id === _0x59001e;
          }
          return _0x447a11.includes(_0x59001e);
        } catch {
          return false;
        }
      });
      this.logger.info("🤖 Found " + _0xc68d72.length + " active flows for session " + _0x59001e);
      _0xc68d72.forEach(_0x246399 => {
        this.logger.info("🤖 Active flow: " + _0x246399.name + " (ID: " + _0x246399.id + ") - Keywords: " + _0x246399.trigger_keywords);
      });
      const _0x50e9af = (_0xf14662.text || "").trim();
      if (!_0x50e9af) {
        return;
      }
      const _0x58acc8 = this.messageProcessor.extractPhoneNumber(_0xf14662.from);
      const _0x30c7e2 = _0xf14662.from;
      const _0x57f6fb = _0x30c7e2?.endsWith("@g.us");
      this.logger.info("🤖 Message text: \"" + _0x50e9af + "\", User phone: " + _0x58acc8 + ", Is group: " + _0x57f6fb);
      for (const _0x88ecc1 of _0xc68d72) {
        const _0x567c15 = _0x88ecc1.target_type || "all";
        let _0x2d8623 = true;
        if (_0x567c15 === "individual" && _0x57f6fb) {
          this.logger.info("🤖 Skipping chatbot flow \"" + _0x88ecc1.name + "\" - configured for individual chats only, but message is from group");
          _0x2d8623 = false;
        } else if (_0x567c15 === "group") {
          if (!_0x57f6fb) {
            this.logger.info("🤖 Skipping chatbot flow \"" + _0x88ecc1.name + "\" - configured for groups only, but message is from individual");
            _0x2d8623 = false;
          } else {
            const _0xba69a7 = _0x88ecc1.target_groups ? JSON.parse(_0x88ecc1.target_groups) : [];
            if (_0xba69a7.length > 0 && !_0xba69a7.includes(_0x30c7e2)) {
              this.logger.info("🤖 Skipping chatbot flow \"" + _0x88ecc1.name + "\" - group " + _0x30c7e2 + " not in allowed groups list");
              _0x2d8623 = false;
            }
          }
        }
        if (!_0x2d8623) {
          continue;
        }
        const _0xe8716b = _0x88ecc1.keyword_match_type || "contains";
        const _0x12967f = _0x88ecc1.keyword_case_sensitive || false;
        const _0x29de91 = _0x12967f ? _0x88ecc1.trigger_keywords.split(",").map(_0x4e6cb8 => _0x4e6cb8.trim()) : _0x88ecc1.trigger_keywords.toLowerCase().split(",").map(_0x1d82da => _0x1d82da.trim());
        const _0x5bd9ef = _0x12967f ? _0x50e9af : _0x50e9af.toLowerCase();
        this.logger.info("🤖 Flow \"" + _0x88ecc1.name + "\" keywords: [" + _0x29de91.join(", ") + "] (" + _0xe8716b + ", case-sensitive: " + _0x12967f + ")");
        const _0x5d802d = _0x29de91.some(_0x16841b => {
          const _0x5e75bb = this.messageProcessor.matchesKeyword(_0x5bd9ef, _0x16841b, _0xe8716b);
          this.logger.info("🤖 Testing keyword \"" + _0x16841b + "\" against \"" + _0x5bd9ef + "\": " + _0x5e75bb);
          return _0x5e75bb;
        });
        this.logger.info("🤖 Flow \"" + _0x88ecc1.name + "\" has match: " + _0x5d802d);
        if (_0x5d802d) {
          if (_0x88ecc1.cooldown_minutes > 0) {
            const _0x50b3fc = await this.databaseService.get("\n              SELECT last_triggered_at FROM chatbot_flow_cooldowns\n              WHERE flow_id = ? AND user_phone = ?\n            ", [_0x88ecc1.id, _0x58acc8]);
            if (_0x50b3fc) {
              const _0x3003d5 = new Date(_0x50b3fc.last_triggered_at);
              const _0x11be13 = new Date();
              const _0x1b57b9 = (_0x11be13 - _0x3003d5) / 60000;
              if (_0x1b57b9 < _0x88ecc1.cooldown_minutes) {
                this.logger.info("🤖 ⏰ Chatbot flow \"" + _0x88ecc1.name + "\" cooldown active for user " + _0x58acc8 + " (" + _0x1b57b9.toFixed(1) + " minutes ago, cooldown: " + _0x88ecc1.cooldown_minutes + " minutes)");
                continue;
              } else {
                this.logger.info("🤖 ✅ Chatbot flow \"" + _0x88ecc1.name + "\" cooldown expired for user " + _0x58acc8 + " (" + _0x1b57b9.toFixed(1) + " minutes ago, cooldown: " + _0x88ecc1.cooldown_minutes + " minutes)");
              }
            } else {
              this.logger.info("🤖 ✅ Chatbot flow \"" + _0x88ecc1.name + "\" no previous cooldown record for user " + _0x58acc8);
            }
          }
          try {
            await this.startChatbotFlow(_0x59001e, _0xf14662, _0x88ecc1);
            _0xf14662._flowProcessed = true;
          } catch (_0x520da2) {
            this.logger.error("Error starting chatbot flow \"" + _0x88ecc1.name + "\": " + _0x520da2.message, _0x520da2);
          }
        }
      }
    } catch (_0x2e9906) {
      this.logger.error("Error checking new chatbot triggers: " + _0x2e9906.message, _0x2e9906);
    }
  }
  async startChatbotFlow(_0x32cb84, _0x3cde79, _0x1ed775) {
    try {
      const _0x269187 = this.messageProcessor.extractPhoneNumber(_0x3cde79.from);
      const _0x20912c = await this.databaseService.get("\n        SELECT * FROM chatbot_nodes\n        WHERE flow_id = ?\n        ORDER BY position ASC\n        LIMIT 1\n      ", [_0x1ed775.id]);
      if (!_0x20912c) {
        this.logger.warn("No nodes found for chatbot flow " + _0x1ed775.id);
        return;
      }
      const _0x2faca6 = await this.databaseService.run("\n        INSERT INTO chatbot_conversations (\n          session_id, flow_id, user_phone, current_node_id,\n          conversation_data, is_active, started_at, last_activity\n        ) VALUES (?, ?, ?, ?, '{}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n      ", [_0x32cb84, _0x1ed775.id, _0x269187, _0x20912c.id]);
      if (_0x2faca6.success) {
        await this.databaseService.run("\n          UPDATE chatbot_flows\n          SET conversation_count = COALESCE(conversation_count, 0) + 1,\n              last_triggered = CURRENT_TIMESTAMP,\n              updated_at = CURRENT_TIMESTAMP\n          WHERE id = ?\n        ", [_0x1ed775.id]);
        if (_0x1ed775.cooldown_minutes > 0) {
          const _0x48c236 = new Date().toISOString();
          await this.databaseService.run("\n            INSERT OR REPLACE INTO chatbot_flow_cooldowns (flow_id, user_phone, last_triggered_at)\n            VALUES (?, ?, ?)\n          ", [_0x1ed775.id, _0x269187, _0x48c236]);
          this.logger.info("🤖 ⏰ Updated cooldown record for flow \"" + _0x1ed775.name + "\" and user " + _0x269187);
        }
        await this.sendChatbotNodeMessage(_0x32cb84, _0x3cde79.from, _0x20912c, {
          conversationId: _0x2faca6.insertId,
          userPhone: _0x269187,
          flowName: _0x1ed775.name
        });
        const _0x5d5a58 = await this.databaseService.get("\n          SELECT * FROM chatbot_nodes\n          WHERE flow_id = ? AND position > ?\n          ORDER BY position ASC\n          LIMIT 1\n        ", [_0x1ed775.id, _0x20912c.position]);
        if (!_0x5d5a58) {
          await this.endChatbotConversation(_0x2faca6.insertId);
          this.logger.info("Ended single-node chatbot flow \"" + _0x1ed775.name + "\" for user " + _0x269187);
        }
        this.logger.info("Started chatbot flow \"" + _0x1ed775.name + "\" for user " + _0x269187);
      }
    } catch (_0x14d453) {
      this.logger.error("Error starting chatbot flow:", _0x14d453);
    }
  }
  async processChatbotConversation(_0x3cc110, _0x2bddd3, _0x2a86e0) {
    try {
      const _0x1834bd = this.messageProcessor.extractPhoneNumber(_0x2bddd3.from);
      const _0x18b21c = await this.databaseService.get("\n        SELECT * FROM chatbot_flows WHERE id = ? AND is_active = 1\n      ", [_0x2a86e0.flow_id]);
      if (!_0x18b21c) {
        this.logger.info("🤖 Flow " + _0x2a86e0.flow_id + " not found or inactive, ending conversation " + _0x2a86e0.id);
        await this.endChatbotConversation(_0x2a86e0.id);
        return;
      }
      const _0x466ad3 = await this.databaseService.get("\n        SELECT * FROM chatbot_nodes WHERE id = ?\n      ", [_0x2a86e0.current_node_id]);
      if (!_0x466ad3) {
        this.logger.info("🤖 Node " + _0x2a86e0.current_node_id + " not found, ending conversation " + _0x2a86e0.id);
        await this.endChatbotConversation(_0x2a86e0.id);
        return;
      }
      await this.databaseService.run("\n        UPDATE chatbot_conversations\n        SET last_activity = CURRENT_TIMESTAMP\n        WHERE id = ?\n      ", [_0x2a86e0.id]);
      if (_0x466ad3.node_type === "question") {
        await this.processChatbotQuestionResponse(_0x3cc110, _0x2bddd3, _0x2a86e0, _0x466ad3);
      } else {
        await this.moveToNextChatbotNode(_0x3cc110, _0x2bddd3.from, _0x2a86e0, _0x466ad3);
      }
    } catch (_0xd90051) {
      this.logger.error("Error processing chatbot conversation:", _0xd90051);
    }
  }
  async processChatbotQuestionResponse(_0x4cafd9, _0x39c4a1, _0x5df76b, _0x4ae781) {
    try {
      this.logger.info("🤖 Processing question response for node: " + _0x4ae781.name + " (ID: " + _0x4ae781.id + ")");
      const _0x58bff6 = (_0x39c4a1.text || "").trim();
      const _0x1acfbf = this.messageProcessor.extractPhoneNumber(_0x39c4a1.from);
      let _0x39e572 = await this.getConversationData(_0x5df76b.id);
      _0x39e572["node_" + _0x4ae781.id + "_response"] = _0x58bff6;
      _0x39e572.last_response = _0x58bff6;
      _0x39e572.last_response_at = new Date().toISOString();
      if (_0x4ae781.options) {
        try {
          const _0x3ebf2e = JSON.parse(_0x4ae781.options);
          let _0x356364 = null;
          if (typeof _0x3ebf2e === "object" && !Array.isArray(_0x3ebf2e)) {
            _0x356364 = _0x3ebf2e.extract_variable;
          } else if (Array.isArray(_0x3ebf2e)) {
            _0x356364 = null;
          }
          if (_0x356364) {
            try {
              const _0x354fb7 = this.messageProcessor.extractSmartVariable(_0x58bff6, _0x356364);
              _0x39e572["custom_" + _0x356364] = _0x354fb7;
              if (_0x356364 === "name" || _0x356364 === "user_name") {
                _0x39e572.user_name = _0x354fb7;
              }
              this.logger.info("🤖 Variable extracted: " + _0x356364 + " = \"" + _0x354fb7 + "\" from \"" + _0x58bff6 + "\"");
            } catch (_0x477b64) {
              this.logger.warn("Smart extraction failed for variable " + _0x356364 + ", falling back to full response:", _0x477b64.message);
              _0x39e572["custom_" + _0x356364] = _0x58bff6;
              if (_0x356364 === "name" || _0x356364 === "user_name") {
                _0x39e572.user_name = _0x58bff6;
              }
            }
          }
        } catch (_0x17ae69) {
          this.logger.warn("Invalid node configuration for node " + _0x4ae781.id + ":", _0x17ae69.message);
        }
      }
      await this.databaseService.run("\n        UPDATE chatbot_conversations\n        SET conversation_data = ?\n        WHERE id = ?\n      ", [JSON.stringify(_0x39e572), _0x5df76b.id]);
      this.logger.info("🤖 About to move to next node from question: " + _0x4ae781.name);
      await this.moveToNextChatbotNode(_0x4cafd9, _0x39c4a1.from, _0x5df76b, _0x4ae781, _0x58bff6);
      this.logger.info("🤖 Successfully moved to next node from question: " + _0x4ae781.name);
    } catch (_0x3f72e5) {
      this.logger.error("Error processing chatbot question response:", _0x3f72e5);
    }
  }
  async moveToNextChatbotNode(_0x5d342f, _0x341d78, _0x3f8968, _0x5578f1, _0x85a7f9 = null) {
    try {
      this.logger.info("🤖 Moving to next node from current node: " + _0x5578f1.name + " (ID: " + _0x5578f1.id + ")");
      let _0x4c49b0 = null;
      if (_0x5578f1.next_node_id) {
        this.logger.info("🤖 Current node has next_node_id: " + _0x5578f1.next_node_id);
        _0x4c49b0 = await this.databaseService.get("\n          SELECT * FROM chatbot_nodes WHERE id = ?\n        ", [_0x5578f1.next_node_id]);
        if (_0x4c49b0) {
          this.logger.info("🤖 Found next node by ID: " + _0x4c49b0.name + " (ID: " + _0x4c49b0.id + ")");
        } else {
          this.logger.warn("🤖 Next node with ID " + _0x5578f1.next_node_id + " not found");
        }
      }
      if (!_0x4c49b0) {
        _0x4c49b0 = await this.databaseService.get("\n          SELECT * FROM chatbot_nodes\n          WHERE flow_id = ? AND position > ?\n          ORDER BY position ASC\n          LIMIT 1\n        ", [_0x3f8968.flow_id, _0x5578f1.position]);
      }
      if (_0x4c49b0 && _0x4c49b0.node_type === "condition") {
        _0x4c49b0 = await this.processConditionalNode(_0x4c49b0, _0x3f8968, _0x85a7f9);
      }
      if (_0x4c49b0 && _0x4c49b0.node_type === "action") {
        this.logger.info("🎬 Processing action node: " + _0x4c49b0.name);
        try {
          await this.processActionNode(_0x4c49b0, _0x3f8968, _0x85a7f9);
          this.logger.info("🎬 Action node processed successfully: " + _0x4c49b0.name);
          if (_0x4c49b0.next_node_id) {
            _0x4c49b0 = await this.databaseService.get("\n              SELECT * FROM chatbot_nodes WHERE id = ?\n            ", [_0x4c49b0.next_node_id]);
            this.logger.info("🎬 Next node after action: " + (_0x4c49b0 ? _0x4c49b0.name : "undefined") + " (ID: " + (_0x4c49b0 ? _0x4c49b0.id : "undefined") + ")");
          } else {
            _0x4c49b0 = null;
            this.logger.info("🎬 Next node after action: END (no next_node_id)");
          }
        } catch (_0x56cad9) {
          this.logger.error("🎬 Error processing action node " + _0x4c49b0.name + ":", _0x56cad9);
          throw _0x56cad9;
        }
      }
      if (_0x4c49b0) {
        this.logger.info("🤖 Found next node: " + _0x4c49b0.name + " (ID: " + _0x4c49b0.id + ")");
        await this.databaseService.run("\n          UPDATE chatbot_conversations\n          SET current_node_id = ?, last_activity = CURRENT_TIMESTAMP\n          WHERE id = ?\n        ", [_0x4c49b0.id, _0x3f8968.id]);
        if (_0x4c49b0.node_type !== "action") {
          await this.sendChatbotNodeMessage(_0x5d342f, _0x341d78, _0x4c49b0, {
            conversationId: _0x3f8968.id,
            userPhone: this.messageProcessor.extractPhoneNumber(_0x341d78),
            flowName: _0x3f8968.flow_name
          });
        } else {
          await this.moveToNextChatbotNode(_0x5d342f, _0x341d78, _0x3f8968, _0x4c49b0, _0x85a7f9);
        }
      } else {
        this.logger.info("🤖 No next node found, ending conversation " + _0x3f8968.id);
        await this.endChatbotConversation(_0x3f8968.id);
        const _0x3d2703 = await this.databaseService.get("\n          SELECT fallback_message FROM chatbot_flows WHERE id = ?\n        ", [_0x3f8968.flow_id]);
        this.logger.info("🤖 Flow fallback_message: \"" + _0x3d2703?.fallback_message + "\"");
        if (_0x3d2703 && _0x3d2703.fallback_message && _0x3d2703.fallback_message.trim() !== "") {
          const _0x4a1a0d = await this.getConversationData(_0x3f8968.id);
          const _0x44b1e8 = this.messageContextCache?.get(_0x341d78) || null;
          const _0x47a738 = await this.messageProcessor.processChatbotMessage(_0x3d2703.fallback_message, _0x4a1a0d, _0x5d342f, _0x341d78, _0x44b1e8);
          this.logger.info("🤖 Processed fallback content: \"" + _0x47a738.content + "\"");
          if (_0x47a738.content && _0x47a738.content.trim() !== "") {
            await this.whatsappService.sendMessage(_0x5d342f, _0x341d78, _0x47a738.content, "text");
          } else {
            this.logger.info("🤖 Skipping empty fallback message for flow " + _0x3f8968.flow_id);
          }
        } else {
          this.logger.info("🤖 No fallback message configured for flow " + _0x3f8968.flow_id);
        }
      }
    } catch (_0x43d212) {
      this.logger.error("Error moving to next chatbot node:", _0x43d212);
      try {
        this.logger.info("🤖 Ending conversation " + _0x3f8968.id + " due to error to prevent getting stuck");
        await this.endChatbotConversation(_0x3f8968.id);
      } catch (_0x316f03) {
        this.logger.error("Error ending conversation after node error:", _0x316f03);
      }
    }
  }
  async sendChatbotNodeMessage(_0x48f6cd, _0x10a08c, _0x1d8d53, _0x487b96 = {}) {
    try {
      if (!_0x1d8d53) {
        this.logger.error("Cannot send chatbot node message: node is undefined or null");
        return {
          success: false,
          error: "Node is undefined or null"
        };
      }
      let _0x39ca0e = 0;
      if (_0x487b96.conversationId) {
        try {
          const _0x4ef826 = await this.databaseService.get("\n            SELECT flow_id FROM chatbot_conversations WHERE id = ?\n          ", [_0x487b96.conversationId]);
          if (_0x4ef826 && _0x4ef826.flow_id) {
            const _0x4f1a0c = await this.databaseService.get("\n              SELECT message_delay_seconds FROM chatbot_flows WHERE id = ?\n            ", [_0x4ef826.flow_id]);
            if (_0x4f1a0c && _0x4f1a0c.message_delay_seconds) {
              _0x39ca0e = _0x4f1a0c.message_delay_seconds;
              this.logger.info("🕐 Message delay configured: " + _0x39ca0e + " seconds for flow " + _0x4ef826.flow_id);
            }
          }
        } catch (_0x547333) {
          this.logger.warn("Error getting message delay setting:", _0x547333);
        }
      }
      if (_0x39ca0e > 0) {
        this.logger.info("⏳ Waiting " + _0x39ca0e + " seconds before sending message...");
        await new Promise(_0x270641 => setTimeout(_0x270641, _0x39ca0e * 1000));
      }
      if (_0x1d8d53.typing_enabled && _0x1d8d53.typing_seconds > 0) {
        const _0x139fca = Math.min(_0x1d8d53.typing_seconds, 30);
        this.logger.info("🤖 ⌨️ Showing typing indicator for " + _0x139fca + "s before chatbot node \"" + _0x1d8d53.name + "\"");
        await this.whatsappService.sendPresenceUpdate(_0x48f6cd, _0x10a08c, "composing");
        await new Promise(_0xf3a5f6 => setTimeout(_0xf3a5f6, _0x139fca * 1000));
        await this.whatsappService.sendPresenceUpdate(_0x48f6cd, _0x10a08c, "paused");
      }
      let _0x4bf158 = _0x1d8d53.message || "";
      let _0x5e13b3 = "text";
      let _0x10288f = {};
      this.logger.info("Sending chatbot node message: " + _0x1d8d53.name + ", content: \"" + _0x4bf158 + "\", type: " + _0x5e13b3);
      let _0x5d7b7d = {};
      if (_0x487b96.conversationId) {
        try {
          const _0x1237b8 = await this.databaseService.get("\n            SELECT conversation_data FROM chatbot_conversations WHERE id = ?\n          ", [_0x487b96.conversationId]);
          if (_0x1237b8 && _0x1237b8.conversation_data) {
            _0x5d7b7d = JSON.parse(_0x1237b8.conversation_data);
          }
        } catch (_0x2cc68b) {
          this.logger.warn("Could not load conversation data for ID " + _0x487b96.conversationId + ":", _0x2cc68b.message);
        }
      }
      if (_0x1d8d53.template_id) {
        const _0x130b96 = await this.databaseService.get("SELECT * FROM message_templates WHERE id = ?", [_0x1d8d53.template_id]);
        if (_0x130b96) {
          const _0x256b5f = {
            user_phone: _0x487b96.userPhone,
            flow_name: _0x487b96.flowName,
            node_name: _0x1d8d53.name,
            name: _0x487b96.userPhone.split("@")[0],
            phone: _0x487b96.userPhone.split("@")[0],
            ..._0x5d7b7d
          };
          _0xd35d77 = await this.whatsappService.sendTemplateMessage(_0x48f6cd, _0x10a08c, _0x130b96, _0x256b5f);
          return _0xd35d77;
        } else {
          this.logger.warn("Template " + _0x1d8d53.template_id + " not found for chatbot node " + _0x1d8d53.name);
        }
      } else {
        const _0x303ddb = this.messageContextCache?.get(_0x10a08c) || null;
        const _0x424045 = await this.messageProcessor.processChatbotMessage(_0x4bf158, _0x5d7b7d, _0x48f6cd, _0x10a08c, _0x303ddb);
        if (_0x424045.success) {
          _0x4bf158 = _0x424045.content;
        }
      }
      if (typeof _0x4bf158 !== "string") {
        this.logger.error("🤖 ❌ Invalid message content type: " + typeof _0x4bf158 + ", content: " + JSON.stringify(_0x4bf158));
        _0x4bf158 = String(_0x4bf158 || "Sorry, there was an error processing this message.");
      }
      if (_0x4bf158 === "[object Object]") {
        this.logger.error("🤖 ❌ Detected [object Object] in message content, replacing with fallback");
        _0x4bf158 = "Sorry, there was an error processing this message.";
      }
      if (_0x1d8d53.attachment_data && _0x1d8d53.attachment_type) {
        _0x5e13b3 = _0x1d8d53.attachment_type;
        _0x10288f = {
          caption: _0x4bf158 || ""
        };
      }
      if (_0x1d8d53.node_type === "question" && _0x1d8d53.options) {
        try {
          const _0x5f06ec = JSON.parse(_0x1d8d53.options);
          let _0xdcf0f2 = [];
          if (typeof _0x5f06ec === "object" && !Array.isArray(_0x5f06ec)) {
            _0xdcf0f2 = _0x5f06ec.options || [];
          } else if (Array.isArray(_0x5f06ec)) {
            _0xdcf0f2 = _0x5f06ec;
          }
          if (_0xdcf0f2.length > 0) {
            const _0x4f3792 = typeof _0x5f06ec === "object" && !Array.isArray(_0x5f06ec) ? _0x5f06ec.interaction_type : "buttons";
            const _0x3265f4 = _0x4f3792 === "buttons" && _0xdcf0f2.length <= 3 && _0x5e13b3 === "text";
            if (_0x3265f4) {
              _0x5e13b3 = "interactive";
              _0x10288f = {
                text: _0x4bf158,
                footer: "Choose an option:",
                buttons: _0xdcf0f2.map((_0x19ddea, _0x35d5c4) => {
                  let _0x56cc41 = "";
                  let _0x192741 = "";
                  if (typeof _0x19ddea === "string") {
                    _0x56cc41 = _0x19ddea;
                    _0x192741 = "option_" + (_0x35d5c4 + 1);
                  } else if (typeof _0x19ddea === "object" && _0x19ddea !== null) {
                    _0x56cc41 = _0x19ddea.display_text || _0x19ddea.title || _0x19ddea.name || _0x19ddea.text || _0x19ddea.value || "Option " + (_0x35d5c4 + 1);
                    _0x192741 = _0x19ddea.id || "option_" + (_0x35d5c4 + 1);
                  } else {
                    _0x56cc41 = String(_0x19ddea || "Option " + (_0x35d5c4 + 1));
                    _0x192741 = "option_" + (_0x35d5c4 + 1);
                  }
                  return {
                    buttonId: _0x192741,
                    buttonText: {
                      displayText: _0x56cc41
                    },
                    type: 1
                  };
                }),
                headerType: 1
              };
              _0x4bf158 = _0x10288f;
            } else {
              const _0x238f93 = _0xdcf0f2.map((_0x4eefb1, _0x312b77) => {
                let _0x431441 = "";
                if (typeof _0x4eefb1 === "string") {
                  _0x431441 = _0x4eefb1;
                } else if (typeof _0x4eefb1 === "object" && _0x4eefb1 !== null) {
                  _0x431441 = _0x4eefb1.display_text || _0x4eefb1.title || _0x4eefb1.name || _0x4eefb1.text || _0x4eefb1.value || String(_0x4eefb1);
                } else {
                  _0x431441 = String(_0x4eefb1 || "");
                }
                return _0x312b77 + 1 + ". " + _0x431441;
              });
              const _0x1606ba = "\n\nOptions:\n" + _0x238f93.join("\n");
              if (_0x5e13b3 === "text") {
                _0x4bf158 += _0x1606ba;
              } else {
                _0x10288f.caption = (_0x10288f.caption || "") + _0x1606ba;
              }
            }
          }
        } catch (_0x85888b) {
          this.logger.warn("Invalid options JSON for node " + _0x1d8d53.id + ":", _0x85888b.message);
        }
      }
      let _0xd35d77;
      if (_0x1d8d53.attachment_data && _0x1d8d53.attachment_type && !_0x1d8d53.template_id) {
        let _0x283d71 = {};
        if (_0x1d8d53.attachment_data.startsWith("data:")) {
          const _0x10cfab = _0x1d8d53.attachment_data.split(",")[1];
          const _0x600d97 = Buffer.from(_0x10cfab, "base64");
          switch (_0x1d8d53.attachment_type) {
            case "image":
              _0x283d71 = {
                image: _0x600d97,
                caption: _0x4bf158 || ""
              };
              break;
            case "video":
              _0x283d71 = {
                video: _0x600d97,
                caption: _0x4bf158 || ""
              };
              break;
            case "audio":
              _0x283d71 = {
                audio: _0x600d97,
                mimetype: "audio/mp4"
              };
              break;
            case "document":
              _0x283d71 = {
                document: _0x600d97,
                fileName: "document.pdf",
                caption: _0x4bf158 || ""
              };
              break;
          }
        } else {
          _0x283d71 = {
            [_0x1d8d53.attachment_type]: {
              url: _0x1d8d53.attachment_data
            },
            caption: _0x4bf158 || ""
          };
        }
        _0xd35d77 = await this.whatsappService.sendMessage(_0x48f6cd, _0x10a08c, _0x283d71, _0x5e13b3, _0x10288f);
      } else if (_0x5e13b3 === "text") {
        if (!_0x4bf158 || _0x4bf158.trim() === "") {
          this.logger.info("🤖 ⏭️ Skipping empty text message for node: " + _0x1d8d53.name);
          return {
            success: true,
            skipped: true,
            reason: "Empty message content"
          };
        }
        _0xd35d77 = await this.whatsappService.sendMessage(_0x48f6cd, _0x10a08c, {
          text: _0x4bf158
        }, _0x5e13b3, _0x10288f);
      } else if (_0x5e13b3 === "interactive") {
        _0xd35d77 = await this.whatsappService.sendMessage(_0x48f6cd, _0x10a08c, _0x4bf158, _0x5e13b3, _0x10288f);
      } else {
        const _0x46eccf = this.messageProcessor.formatMessageContent(_0x4bf158, _0x5e13b3, _0x10288f);
        if (_0x5e13b3 === "mixed_buttons") {
          _0xd35d77 = await this.whatsappService.sendMessage(_0x48f6cd, _0x10a08c, _0x46eccf, _0x5e13b3);
        } else {
          _0xd35d77 = await this.whatsappService.sendMessage(_0x48f6cd, _0x10a08c, _0x46eccf, _0x5e13b3, _0x10288f);
        }
      }
      if (_0xd35d77.success) {
        this.logger.info("Chatbot node message sent: " + _0x1d8d53.name + " (" + _0x5e13b3 + ") to " + _0x487b96.userPhone);
      } else {
        this.logger.error("Failed to send chatbot node message: " + _0xd35d77.error);
      }
      return _0xd35d77;
    } catch (_0x135f7f) {
      this.logger.error("Error sending chatbot node message:", _0x135f7f);
      return {
        success: false,
        error: _0x135f7f.message
      };
    }
  }
  async endChatbotConversation(_0x161685) {
    try {
      await this.databaseService.run("\n        UPDATE chatbot_conversations\n        SET is_active = 0, completed_at = CURRENT_TIMESTAMP\n        WHERE id = ?\n      ", [_0x161685]);
      this.logger.info("Ended chatbot conversation " + _0x161685);
    } catch (_0x1eb1ac) {
      this.logger.error("Error ending chatbot conversation:", _0x1eb1ac);
    }
  }
  async checkCallResponderRules(_0x2872d7, _0xb5e387) {}
  async updateContactFromMessage(_0x38ba5f) {
    try {
      const _0x45b3be = _0x38ba5f.from.split("@")[0];
      const _0x440e3c = await this.databaseService.get("SELECT id FROM contacts WHERE phone_number = ?", [_0x45b3be]);
      if (!_0x440e3c) {
        await this.databaseService.run("\n          INSERT INTO contacts (phone_number, name, last_message_at, created_at, updated_at)\n          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n        ", [_0x45b3be, _0x45b3be, _0x38ba5f.timestamp]);
      } else {
        await this.databaseService.run("\n          UPDATE contacts \n          SET last_message_at = ?, updated_at = CURRENT_TIMESTAMP\n          WHERE phone_number = ?\n        ", [_0x38ba5f.timestamp, _0x45b3be]);
      }
    } catch (_0x5e871a) {
      this.logger.error("Error updating contact from message:", _0x5e871a);
    }
  }
  async processActionNode(_0x242bf3, _0x59a2a1, _0x56d027) {
    try {
      this.logger.info("🎬 Processing action node: " + _0x242bf3.name);
      let _0x5e04fc = {};
      try {
        _0x5e04fc = JSON.parse(_0x242bf3.options || "{}");
      } catch (_0x4e89d0) {
        this.logger.warn("Invalid action configuration for node " + _0x242bf3.id);
        if (_0x242bf3.next_node_id) {
          return await this.databaseService.get("\n            SELECT * FROM chatbot_nodes WHERE id = ?\n          ", [_0x242bf3.next_node_id]);
        }
        return null;
      }
      const _0x39944e = await this.getConversationData(_0x59a2a1.id);
      this.logger.info("🎬 Action type: " + _0x5e04fc.action_type);
      switch (_0x5e04fc.action_type) {
        case "email":
          this.logger.info("🎬 Calling executeEmailAction");
          await this.executeEmailAction(_0x5e04fc, _0x39944e, _0x59a2a1);
          this.logger.info("🎬 executeEmailAction completed");
          break;
        case "webhook":
          await this.executeWebhookAction(_0x5e04fc, _0x39944e, _0x59a2a1);
          break;
        case "api_call":
          await this.executeApiCallAction(_0x5e04fc, _0x39944e, _0x59a2a1);
          break;
        case "save_data":
          await this.executeSaveDataAction(_0x5e04fc, _0x39944e, _0x59a2a1);
          break;
        case "delay":
          await this.executeDelayAction(_0x5e04fc);
          break;
        default:
          this.logger.warn("Unknown action type: " + _0x5e04fc.action_type);
      }
      if (_0x242bf3.next_node_id) {
        return await this.databaseService.get("\n          SELECT * FROM chatbot_nodes WHERE id = ?\n        ", [_0x242bf3.next_node_id]);
      }
      return null;
    } catch (_0x2443e9) {
      this.logger.error("Error processing action node:", _0x2443e9);
      if (_0x242bf3.next_node_id) {
        return await this.databaseService.get("\n          SELECT * FROM chatbot_nodes WHERE id = ?\n        ", [_0x242bf3.next_node_id]);
      }
      return null;
    }
  }
  async processConditionalNode(_0x440e03, _0x4a754f, _0x506e89) {
    try {
      this.logger.info("🔀 Processing condition node: " + _0x440e03.name);
      let _0x4b55b6 = {};
      try {
        _0x4b55b6 = JSON.parse(_0x440e03.options || "{}");
      } catch (_0xd2e802) {
        this.logger.warn("Invalid condition configuration for node " + _0x440e03.id);
        return null;
      }
      const _0x4dec0e = await this.getConversationData(_0x4a754f.id);
      const _0xcb3a2a = _0x4b55b6.condition_type || "user_response";
      this.logger.info("🔀 Evaluating condition type: " + _0xcb3a2a);
      let _0x371f20 = false;
      let _0x1110ab = null;
      switch (_0xcb3a2a) {
        case "user_response":
          _0x371f20 = await this.evaluateUserResponseCondition(_0x4b55b6, _0x506e89);
          break;
        case "variable_value":
          _0x371f20 = await this.evaluateVariableCondition(_0x4b55b6, _0x4dec0e);
          break;
        case "time_based":
          _0x371f20 = await this.evaluateTimeCondition(_0x4b55b6);
          break;
        case "random":
          return await this.evaluateRandomCondition(_0x4b55b6);
        default:
          this.logger.warn("Unknown condition type: " + _0xcb3a2a);
          return null;
      }
      if (_0x371f20) {
        _0x1110ab = _0x4b55b6.true_path;
        this.logger.info("🔀 Condition TRUE - routing to node: " + _0x1110ab);
      } else {
        _0x1110ab = _0x4b55b6.false_path;
        this.logger.info("🔀 Condition FALSE - routing to node: " + _0x1110ab);
      }
      if (_0x1110ab) {
        return await this.databaseService.get("\n          SELECT * FROM chatbot_nodes WHERE id = ?\n        ", [_0x1110ab]);
      }
      this.logger.info("🔀 No path specified for condition result, ending conversation");
      return null;
    } catch (_0x513ab3) {
      this.logger.error("Error processing conditional node:", _0x513ab3);
      return null;
    }
  }
  async getNextNodeInSequence(_0x4d5f3c) {
    try {
      return await this.databaseService.get("\n        SELECT * FROM chatbot_nodes\n        WHERE flow_id = ? AND position > ?\n        ORDER BY position ASC\n        LIMIT 1\n      ", [_0x4d5f3c.flow_id, _0x4d5f3c.position]);
    } catch (_0x7a153a) {
      this.logger.error("Error getting next node in sequence:", _0x7a153a);
      return null;
    }
  }
  replaceVariables(_0x1341e5, _0x1aaff8) {
    if (!_0x1341e5 || typeof _0x1341e5 !== "string") {
      return _0x1341e5;
    }
    let _0xb5018e = _0x1341e5;
    const _0x43f5fe = /\{\{([^}]+)\}\}/g;
    _0xb5018e = _0xb5018e.replace(_0x43f5fe, (_0x127408, _0x4ea7ee) => {
      const _0x14783a = _0x1aaff8[_0x4ea7ee] || _0x1aaff8["custom_" + _0x4ea7ee] || "";
      return _0x14783a;
    });
    return _0xb5018e;
  }
  async executeEmailAction(_0x16ef33, _0x1c360b, _0x1a5224) {
    try {
      this.logger.info("📧 Executing email action");
      this.logger.info("📧 Action config:", JSON.stringify(_0x16ef33, null, 2));
      this.logger.info("📧 Conversation data:", JSON.stringify(_0x1c360b, null, 2));
      if (!this.emailService) {
        this.logger.info("📧 Email service not available, creating new instance");
        const _0x58441f = require("./email.service");
        this.emailService = new _0x58441f();
        this.emailService.setDatabaseService(this.databaseService);
        await this.emailService.initialize();
        this.logger.info("📧 Email service created and initialized");
      } else {
        this.logger.info("📧 Email service available");
      }
      const _0x2cde15 = _0x16ef33.email_recipients;
      if (!_0x2cde15) {
        this.logger.warn("Email action missing recipients");
        return;
      }
      let _0xcbf90;
      if (_0x16ef33.email_template) {
        try {
          this.logger.info("📧 Processing email template ID: " + _0x16ef33.email_template);
          if (typeof this.emailService.processEmailTemplate !== "function") {
            this.logger.error("📧 processEmailTemplate method not found on email service");
            throw new Error("processEmailTemplate method not available");
          }
          const _0x534343 = await this.emailService.processEmailTemplate(_0x16ef33.email_template, _0x1c360b);
          this.logger.info("📧 Template processed successfully:", _0x534343);
          _0xcbf90 = {
            to: this.replaceVariables(_0x2cde15, _0x1c360b),
            cc: _0x16ef33.email_cc ? this.replaceVariables(_0x16ef33.email_cc, _0x1c360b) : null,
            bcc: _0x16ef33.email_bcc ? this.replaceVariables(_0x16ef33.email_bcc, _0x1c360b) : null,
            subject: _0x534343.subject,
            html: _0x534343.html,
            text: _0x534343.text,
            template_id: _0x16ef33.email_template,
            conversation_id: _0x1a5224.id
          };
        } catch (_0x291ecb) {
          this.logger.error("📧 Error processing email template:", _0x291ecb);
          this.logger.info("📧 Falling back to custom email content");
          const _0x5606b5 = this.replaceVariables(_0x16ef33.email_subject || "Thank you for contacting us", _0x1c360b);
          const _0x506faf = this.replaceVariables(_0x16ef33.email_body || "Thank you for providing your email address. We will get back to you soon.", _0x1c360b);
          _0xcbf90 = {
            to: this.replaceVariables(_0x2cde15, _0x1c360b),
            cc: _0x16ef33.email_cc ? this.replaceVariables(_0x16ef33.email_cc, _0x1c360b) : null,
            bcc: _0x16ef33.email_bcc ? this.replaceVariables(_0x16ef33.email_bcc, _0x1c360b) : null,
            subject: _0x5606b5,
            html: _0x506faf,
            text: _0x506faf,
            conversation_id: _0x1a5224.id
          };
        }
      } else {
        const _0x284fec = this.replaceVariables(_0x16ef33.email_subject || "Notification", _0x1c360b);
        const _0x212cdb = this.replaceVariables(_0x16ef33.email_body || "", _0x1c360b);
        if (!_0x284fec.trim()) {
          this.logger.warn("Email action missing subject");
          return;
        }
        _0xcbf90 = {
          to: this.replaceVariables(_0x2cde15, _0x1c360b),
          cc: _0x16ef33.email_cc ? this.replaceVariables(_0x16ef33.email_cc, _0x1c360b) : null,
          bcc: _0x16ef33.email_bcc ? this.replaceVariables(_0x16ef33.email_bcc, _0x1c360b) : null,
          subject: _0x284fec,
          conversation_id: _0x1a5224.id
        };
        if (_0x16ef33.email_format === "text") {
          _0xcbf90.text = _0x212cdb;
        } else {
          _0xcbf90.html = _0x212cdb;
          _0xcbf90.text = _0x212cdb.replace(/<[^>]*>/g, "");
        }
      }
      if (_0x16ef33.email_high_priority) {
        _0xcbf90.priority = "high";
      }
      if (_0x16ef33.email_request_receipt) {
        _0xcbf90.requestReceipt = true;
      }
      if (_0x16ef33.email_attachments && _0x16ef33.email_attachments.length > 0) {
        _0xcbf90.attachments = _0x16ef33.email_attachments.map(_0x448879 => ({
          filename: _0x448879.name || _0x448879.filename,
          path: _0x448879.path || _0x448879.url,
          contentType: _0x448879.type || _0x448879.contentType
        }));
      }
      if (_0x16ef33.email_delivery_timing === "delayed" && _0x16ef33.email_delay_minutes > 0) {
        this.logger.info("📧 Email scheduled for " + _0x16ef33.email_delay_minutes + " minutes delay");
        setTimeout(async () => {
          const _0x3b72c4 = await this.emailService.sendEmail(_0xcbf90);
          this.logger.info("📧 Delayed email result:", _0x3b72c4);
        }, _0x16ef33.email_delay_minutes * 60 * 1000);
      } else {
        const _0xdb11fc = await this.emailService.sendEmail(_0xcbf90);
        if (_0xdb11fc.success) {
          this.logger.info("📧 Email sent successfully to " + _0xcbf90.to, {
            messageId: _0xdb11fc.messageId
          });
        } else {
          this.logger.error("📧 Failed to send email:", _0xdb11fc.error);
        }
      }
    } catch (_0x22fc0a) {
      this.logger.error("Error executing email action:", _0x22fc0a);
    }
  }
  async executeWebhookAction(_0x55f091, _0x33674e, _0x6c98e3) {
    try {
      this.logger.info("🔗 Executing webhook action");
      const _0x26a531 = _0x55f091.webhook_url;
      if (!_0x26a531) {
        this.logger.warn("Webhook action missing URL");
        return;
      }
      const _0x5f2b03 = {
        conversation_id: _0x6c98e3.id,
        flow_name: _0x6c98e3.flow_name,
        user_phone: _0x33674e.user_phone,
        conversation_data: _0x33674e,
        timestamp: new Date().toISOString()
      };
      const _0x2ed616 = require("node-fetch");
      const _0x42f8d6 = await _0x2ed616(_0x26a531, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(_0x5f2b03)
      });
      this.logger.info("🔗 Webhook sent to " + _0x26a531 + ", status: " + _0x42f8d6.status);
    } catch (_0xc1e980) {
      this.logger.error("Error executing webhook action:", _0xc1e980);
    }
  }
  async executeApiCallAction(_0x1bea95, _0x24d14c, _0x378a77) {
    try {
      this.logger.info("🌐 Executing API call action");
      const _0x5a8420 = _0x1bea95.api_endpoint;
      const _0x3355ef = _0x1bea95.api_method || "POST";
      if (!_0x5a8420) {
        this.logger.warn("API call action missing endpoint");
        return;
      }
      let _0x18a22c = {
        "Content-Type": "application/json"
      };
      if (_0x1bea95.api_headers) {
        try {
          const _0x569ac1 = JSON.parse(this.replaceVariables(_0x1bea95.api_headers, _0x24d14c));
          _0x18a22c = {
            ..._0x18a22c,
            ..._0x569ac1
          };
        } catch (_0x403771) {
          this.logger.warn("Invalid API headers JSON");
        }
      }
      let _0x59630f = null;
      if (_0x1bea95.api_body && _0x3355ef !== "GET") {
        try {
          const _0x3f7bfe = this.replaceVariables(_0x1bea95.api_body, _0x24d14c);
          _0x59630f = JSON.stringify(JSON.parse(_0x3f7bfe));
        } catch (_0x4acb5f) {
          this.logger.warn("Invalid API body JSON");
        }
      }
      const _0x2be5e9 = require("node-fetch");
      const _0x34a7f6 = await _0x2be5e9(_0x5a8420, {
        method: _0x3355ef,
        headers: _0x18a22c,
        body: _0x59630f
      });
      this.logger.info("🌐 API call to " + _0x5a8420 + ", method: " + _0x3355ef + ", status: " + _0x34a7f6.status);
    } catch (_0x1fe0d0) {
      this.logger.error("Error executing API call action:", _0x1fe0d0);
    }
  }
  async executeSaveDataAction(_0x1ca49c, _0x4c2580, _0xfb9b55) {
    try {
      this.logger.info("💾 Executing save data action");
      const _0x4acce1 = _0x1ca49c.save_data_fields || [];
      if (_0x4acce1.length === 0) {
        this.logger.warn("Save data action has no fields specified");
        return;
      }
      const _0x1af60a = {};
      _0x4acce1.forEach(_0x102f94 => {
        if (_0x4c2580[_0x102f94] !== undefined) {
          _0x1af60a[_0x102f94] = _0x4c2580[_0x102f94];
        } else if (_0x4c2580["custom_" + _0x102f94] !== undefined) {
          _0x1af60a[_0x102f94] = _0x4c2580["custom_" + _0x102f94];
        }
      });
      await this.databaseService.run("\n        INSERT INTO chatbot_saved_data (conversation_id, flow_id, data, created_at)\n        VALUES (?, ?, ?, CURRENT_TIMESTAMP)\n      ", [_0xfb9b55.id, _0xfb9b55.flow_id, JSON.stringify(_0x1af60a)]);
      this.logger.info("💾 Saved data:", _0x1af60a);
    } catch (_0x5e5ddc) {
      this.logger.error("Error executing save data action:", _0x5e5ddc);
    }
  }
  async executeDelayAction(_0x555461) {
    try {
      const _0x37358f = _0x555461.delay_seconds || 5;
      this.logger.info("⏰ Executing delay action: " + _0x37358f + " seconds");
      await new Promise(_0x135d2b => setTimeout(_0x135d2b, _0x37358f * 1000));
    } catch (_0xf2194) {
      this.logger.error("Error executing delay action:", _0xf2194);
    }
  }
  async evaluateUserResponseCondition(_0x319f7e, _0x28f2e3) {
    try {
      const _0x537362 = _0x319f7e.response_conditions || [];
      const _0x4a0b87 = (_0x28f2e3 || "").toLowerCase().trim();
      this.logger.info("🔀 Evaluating user response: \"" + _0x28f2e3 + "\" against " + _0x537362.length + " conditions");
      if (!_0x4a0b87) {
        this.logger.info("🔀 Empty user response");
        return false;
      }
      for (const _0x134fa0 of _0x537362) {
        const _0x231c71 = (_0x134fa0.keyword || "").toLowerCase().trim();
        const _0x46150e = _0x134fa0.operator || "contains";
        if (!_0x231c71) {
          continue;
        }
        let _0x56fdcb = false;
        switch (_0x46150e) {
          case "equals":
            _0x56fdcb = _0x4a0b87 === _0x231c71;
            break;
          case "contains":
            _0x56fdcb = _0x4a0b87.includes(_0x231c71);
            break;
          case "starts_with":
            _0x56fdcb = _0x4a0b87.startsWith(_0x231c71);
            break;
          case "ends_with":
            _0x56fdcb = _0x4a0b87.endsWith(_0x231c71);
            break;
          case "regex":
            try {
              const _0x5a4dcf = new RegExp(_0x231c71, "i");
              _0x56fdcb = _0x5a4dcf.test(_0x4a0b87);
            } catch (_0x21bb9b) {
              this.logger.warn("Invalid regex pattern: " + _0x231c71);
              _0x56fdcb = false;
            }
            break;
          default:
            _0x56fdcb = _0x4a0b87.includes(_0x231c71);
        }
        if (_0x56fdcb) {
          this.logger.info("🔀 User response condition matched: \"" + _0x231c71 + "\" (" + _0x46150e + ")");
          return true;
        }
      }
      this.logger.info("🔀 No user response conditions matched");
      return false;
    } catch (_0x12382e) {
      this.logger.error("Error evaluating user response condition:", _0x12382e);
      return false;
    }
  }
  async evaluateVariableCondition(_0x4454ee, _0x4bb359) {
    try {
      const _0x5c6c2e = _0x4454ee.condition_variable;
      const _0x263a35 = _0x4454ee.condition_operator || "equals";
      const _0x2a646c = _0x4454ee.condition_value || "";
      this.logger.info("🔀 Evaluating variable condition: " + _0x5c6c2e + " " + _0x263a35 + " \"" + _0x2a646c + "\"");
      if (!_0x5c6c2e) {
        this.logger.warn("🔀 No variable name specified for condition");
        return false;
      }
      const _0x2238fd = _0x4bb359[_0x5c6c2e] || _0x4bb359["custom_" + _0x5c6c2e] || "";
      this.logger.info("🔀 Variable \"" + _0x5c6c2e + "\" has value: \"" + _0x2238fd + "\"");
      let _0x3c3716 = false;
      switch (_0x263a35) {
        case "equals":
          _0x3c3716 = _0x2238fd.toString() === _0x2a646c.toString();
          break;
        case "not_equals":
          _0x3c3716 = _0x2238fd.toString() !== _0x2a646c.toString();
          break;
        case "contains":
          _0x3c3716 = _0x2238fd.toString().toLowerCase().includes(_0x2a646c.toLowerCase());
          break;
        case "not_contains":
          _0x3c3716 = !_0x2238fd.toString().toLowerCase().includes(_0x2a646c.toLowerCase());
          break;
        case "starts_with":
          _0x3c3716 = _0x2238fd.toString().toLowerCase().startsWith(_0x2a646c.toLowerCase());
          break;
        case "ends_with":
          _0x3c3716 = _0x2238fd.toString().toLowerCase().endsWith(_0x2a646c.toLowerCase());
          break;
        case "is_empty":
          _0x3c3716 = !_0x2238fd || _0x2238fd.toString().trim() === "";
          break;
        case "is_not_empty":
          _0x3c3716 = _0x2238fd && _0x2238fd.toString().trim() !== "";
          break;
        case "greater_than":
          const _0x9c676e = parseFloat(_0x2238fd);
          const _0x41ce67 = parseFloat(_0x2a646c);
          _0x3c3716 = !isNaN(_0x9c676e) && !isNaN(_0x41ce67) && _0x9c676e > _0x41ce67;
          break;
        case "less_than":
          const _0x11a015 = parseFloat(_0x2238fd);
          const _0x1f8aaa = parseFloat(_0x2a646c);
          _0x3c3716 = !isNaN(_0x11a015) && !isNaN(_0x1f8aaa) && _0x11a015 < _0x1f8aaa;
          break;
        case "regex":
          try {
            const _0x42ad00 = new RegExp(_0x2a646c, "i");
            _0x3c3716 = _0x42ad00.test(_0x2238fd.toString());
          } catch (_0x2edd0e) {
            this.logger.warn("Invalid regex pattern: " + _0x2a646c);
            _0x3c3716 = false;
          }
          break;
        default:
          this.logger.warn("Unknown operator: " + _0x263a35);
          _0x3c3716 = false;
      }
      this.logger.info("🔀 Variable condition result: " + _0x3c3716);
      return _0x3c3716;
    } catch (_0x362607) {
      this.logger.error("Error evaluating variable condition:", _0x362607);
      return false;
    }
  }
  async evaluateTimeCondition(_0x47c6e3) {
    try {
      const _0x4f6115 = new Date();
      const _0x1e4f23 = _0x4f6115.getHours();
      const _0x45cc70 = _0x4f6115.getMinutes();
      const _0x33861 = _0x4f6115.getDay();
      const _0x442d94 = _0x1e4f23 * 60 + _0x45cc70;
      this.logger.info("🔀 Evaluating time condition at " + _0x1e4f23 + ":" + _0x45cc70.toString().padStart(2, "0") + " (Day: " + _0x33861 + ")");
      const _0x284999 = _0x47c6e3.time_type || "business_hours";
      let _0x3c4886 = false;
      switch (_0x284999) {
        case "business_hours":
          const _0x31ba17 = _0x47c6e3.start_hour || 9;
          const _0x2e1f3d = _0x47c6e3.end_hour || 18;
          const _0x4a74a3 = _0x47c6e3.work_days || [1, 2, 3, 4, 5];
          _0x3c4886 = _0x4a74a3.includes(_0x33861) && _0x1e4f23 >= _0x31ba17 && _0x1e4f23 < _0x2e1f3d;
          break;
        case "specific_hours":
          const _0x441c40 = this.parseTimeString(_0x47c6e3.start_time || "09:00");
          const _0x2f4c67 = this.parseTimeString(_0x47c6e3.end_time || "18:00");
          if (_0x441c40 <= _0x2f4c67) {
            _0x3c4886 = _0x442d94 >= _0x441c40 && _0x442d94 <= _0x2f4c67;
          } else {
            _0x3c4886 = _0x442d94 >= _0x441c40 || _0x442d94 <= _0x2f4c67;
          }
          break;
        case "weekend":
          _0x3c4886 = _0x33861 === 0 || _0x33861 === 6;
          break;
        case "weekday":
          _0x3c4886 = _0x33861 >= 1 && _0x33861 <= 5;
          break;
        case "specific_day":
          const _0x3e4a77 = _0x47c6e3.target_day || 1;
          _0x3c4886 = _0x33861 === _0x3e4a77;
          break;
        case "after_hour":
          const _0x13d685 = _0x47c6e3.after_hour || 18;
          _0x3c4886 = _0x1e4f23 >= _0x13d685;
          break;
        case "before_hour":
          const _0x510917 = _0x47c6e3.before_hour || 9;
          _0x3c4886 = _0x1e4f23 < _0x510917;
          break;
        default:
          _0x3c4886 = _0x33861 >= 1 && _0x33861 <= 5 && _0x1e4f23 >= 9 && _0x1e4f23 < 18;
      }
      this.logger.info("🔀 Time condition (" + _0x284999 + ") result: " + _0x3c4886);
      return _0x3c4886;
    } catch (_0x28eadf) {
      this.logger.error("Error evaluating time condition:", _0x28eadf);
      return false;
    }
  }
  parseTimeString(_0x31960e) {
    try {
      const [_0x42baaa, _0x22a33e] = _0x31960e.split(":").map(Number);
      return _0x42baaa * 60 + (_0x22a33e || 0);
    } catch (_0x41ca64) {
      this.logger.warn("Invalid time format: " + _0x31960e);
      return 0;
    }
  }
  async evaluateRandomCondition(_0x1387cf) {
    try {
      const _0x1a0eb3 = _0x1387cf.random_paths || [];
      this.logger.info("🔀 Evaluating random condition with " + _0x1a0eb3.length + " paths");
      if (_0x1a0eb3.length === 0) {
        this.logger.warn("🔀 No random paths configured");
        return null;
      }
      const _0x31f0d7 = _0x1a0eb3.reduce((_0x44d2ec, _0x53715e) => _0x44d2ec + (_0x53715e.weight || 1), 0);
      this.logger.info("🔀 Total weight: " + _0x31f0d7);
      const _0x3fd514 = Math.random() * _0x31f0d7;
      this.logger.info("🔀 Random number: " + _0x3fd514);
      let _0x45cd49 = 0;
      for (const _0x5e33ac of _0x1a0eb3) {
        const _0x551dbd = _0x5e33ac.weight || 1;
        _0x45cd49 += _0x551dbd;
        this.logger.info("🔀 Checking path: weight=" + _0x551dbd + ", cumulative=" + _0x45cd49 + ", nextNode=" + _0x5e33ac.nextNode);
        if (_0x3fd514 <= _0x45cd49 && _0x5e33ac.nextNode) {
          this.logger.info("🔀 Selected random path to node: " + _0x5e33ac.nextNode);
          return await this.databaseService.get("\n            SELECT * FROM chatbot_nodes WHERE id = ?\n          ", [_0x5e33ac.nextNode]);
        }
      }
      this.logger.warn("🔀 No random path selected");
      return null;
    } catch (_0x25e754) {
      this.logger.error("Error evaluating random condition:", _0x25e754);
      return null;
    }
  }
  async evaluateCondition(_0x586809, _0x551f23, _0x2463f1) {
    try {
      const {
        type: _0x2b3a48,
        field: _0x4c02c5,
        operator: _0x5bd0c4,
        value: _0x213958
      } = _0x586809;
      let _0x5966aa = "";
      switch (_0x2b3a48) {
        case "user_response":
          _0x5966aa = _0x2463f1 || "";
          break;
        case "conversation_data":
          _0x5966aa = _0x551f23[_0x4c02c5] || "";
          break;
        case "node_response":
          _0x5966aa = _0x551f23["node_" + _0x4c02c5 + "_response"] || "";
          break;
        default:
          return false;
      }
      switch (_0x5bd0c4) {
        case "equals":
          return _0x5966aa.toLowerCase() === _0x213958.toLowerCase();
        case "contains":
          return _0x5966aa.toLowerCase().includes(_0x213958.toLowerCase());
        case "starts_with":
          return _0x5966aa.toLowerCase().startsWith(_0x213958.toLowerCase());
        case "ends_with":
          return _0x5966aa.toLowerCase().endsWith(_0x213958.toLowerCase());
        case "not_equals":
          return _0x5966aa.toLowerCase() !== _0x213958.toLowerCase();
        case "is_empty":
          return !_0x5966aa || _0x5966aa.trim() === "";
        case "is_not_empty":
          return _0x5966aa && _0x5966aa.trim() !== "";
        case "matches_regex":
          try {
            const _0x382401 = new RegExp(_0x213958, "i");
            return _0x382401.test(_0x5966aa);
          } catch (_0x2eb0e0) {
            return false;
          }
        default:
          return false;
      }
    } catch (_0x3809ce) {
      this.logger.error("Error evaluating condition:", _0x3809ce);
      return false;
    }
  }
  async getConversationData(_0x1067bc) {
    try {
      const _0x33c282 = await this.databaseService.get("\n        SELECT conversation_data FROM chatbot_conversations WHERE id = ?\n      ", [_0x1067bc]);
      if (_0x33c282 && _0x33c282.conversation_data) {
        return JSON.parse(_0x33c282.conversation_data);
      }
      return {};
    } catch (_0x19d3c6) {
      this.logger.error("Error getting conversation data:", _0x19d3c6);
      return {};
    }
  }
  async getEventStats() {
    try {
      const _0x5a4510 = await this.databaseService.get("\n        SELECT \n          COUNT(CASE WHEN action = 'session_connected' THEN 1 END) as sessions_connected,\n          COUNT(CASE WHEN action = 'session_disconnected' THEN 1 END) as sessions_disconnected,\n          COUNT(CASE WHEN action = 'call_received' THEN 1 END) as calls_received,\n          COUNT(*) as total_events\n        FROM activity_logs \n        WHERE DATE(timestamp) = DATE('now')\n      ");
      return _0x5a4510;
    } catch (_0x2bffd6) {
      this.logger.error("Error getting event stats:", _0x2bffd6);
      return null;
    }
  }
}
module.exports = EventService;