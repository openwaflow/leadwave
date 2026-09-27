const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");
class LiveChatService extends EventEmitter {
  constructor(_0x1e8f88, _0x1906ef = null) {
    super();
    this.db = _0x1e8f88;
    this.whatsappService = _0x1906ef;
    this.initialized = false;
  }
  log(_0x2fb3a5) {
    try {
      const _0x4316ad = new Date().toISOString();
      const _0x47d359 = "[" + _0x4316ad + "] " + _0x2fb3a5;
      if (typeof global.logToFile === "function") {
        global.logToFile(_0x47d359);
      }
    } catch (_0x3a7877) {
      console.error("Error logging:", _0x3a7877);
    }
  }
  async initialize() {
    try {
      await this.runMigrations();
      this.setupEventListeners();
      this.initialized = true;
      this.log("✅ Live Chat Service: Initialized successfully");
      return {
        success: true
      };
    } catch (_0x21722d) {
      this.log("❌ Live Chat Service: Error initializing: " + _0x21722d.message);
      this.log("❌ Live Chat Service: Error stack: " + _0x21722d.stack);
      return {
        success: false,
        error: _0x21722d.message
      };
    }
  }
  setupEventListeners() {
    if (!this.whatsappService) {
      this.log("⚠️ Live Chat Service: WhatsApp service not available, skipping event listeners");
      return;
    }
    this.whatsappService.on("message_received", async _0x32d863 => {
      try {
        await this.handleWhatsAppMessage(_0x32d863);
      } catch (_0x4f4d3d) {
        this.log("❌ Live Chat Service: Error handling WhatsApp message: " + _0x4f4d3d.message);
        console.error("❌ Live Chat Service: Error handling WhatsApp message:", _0x4f4d3d);
      }
    });
    this.whatsappService.on("message_sent", async _0x428688 => {
      try {
        await this.handleWhatsAppMessage(_0x428688);
      } catch (_0xd670cd) {
        this.log("❌ Live Chat Service: Error handling outgoing message: " + _0xd670cd.message);
        console.error("❌ Live Chat Service: Error handling outgoing message:", _0xd670cd);
      }
    });
  }
  async handleWhatsAppMessage(_0x32c688) {
    try {
      const {
        sessionId: _0x4d26e9,
        message: _0x1d42da,
        formattedMessage: _0xa84104
      } = _0x32c688;
      if (!_0xa84104 || !_0x1d42da?.key?.remoteJid) {
        return;
      }
      const _0x149dd2 = _0x1d42da.key.remoteJid;
      if (_0x149dd2 === "status@broadcast" || _0x149dd2.includes("@broadcast") || _0x149dd2.includes("@newsletter")) {
        return;
      }
      let _0x2845d0 = _0x149dd2.split("@")[0];
      if (_0x149dd2.includes("@lid") && _0x1d42da.key.remoteJidAlt) {
        const _0x3e467b = _0x1d42da.key.remoteJidAlt.split("@")[0].split(":")[0];
        if (/^\d+$/.test(_0x3e467b)) {
          _0x2845d0 = _0x3e467b;
        }
      }
      const _0x383a99 = _0x1d20a6 => !_0x1d20a6 || /^[+0-9\s\-()]{6,}$/.test(_0x1d20a6.trim()) || /^Contact\s+[0-9]+$/i.test(_0x1d20a6.trim());
      const _0x483e5e = _0x1d42da.pushName || "";
      let _0x25d954 = !_0x383a99(_0x483e5e) ? _0x483e5e : null;
      if (!_0x25d954 && this.whatsappService) {
        try {
          const _0x123457 = this.whatsappService.getStore(_0x4d26e9);
          if (_0x123457 && _0x123457.contacts) {
            const _0x56e1d3 = [_0x2845d0 + "@s.whatsapp.net", _0x149dd2];
            for (const _0x195a67 of _0x56e1d3) {
              const _0xddcb41 = _0x123457.contacts[_0x195a67];
              if (_0xddcb41) {
                const _0x2f25f2 = _0xddcb41.notify || _0xddcb41.name || _0xddcb41.verifiedName;
                if (_0x2f25f2 && _0x2f25f2.trim()) {
                  _0x25d954 = _0x2f25f2.trim();
                  break;
                }
              }
            }
          }
        } catch (_0x1cabe8) {}
      }
      const _0x23583b = await this.getOrCreateConversation(_0x4d26e9, _0x2845d0, _0x25d954, null, _0x149dd2);
      if (!_0x23583b.success) {
        this.log("❌ Live Chat Service: Failed to get/create conversation: " + _0x23583b.error);
        return;
      }
      const _0x4c7dcf = _0x4d26e9 + "_" + _0x2845d0;
      const _0x564709 = _0x1d42da.key.fromMe ? "agent" : "customer";
      let _0x4418b7 = null;
      let _0x413259 = null;
      let _0x1bafe5 = null;
      const _0x3a2744 = _0x1d42da.message || {};
      const _0x41b4cc = !!_0x3a2744.imageMessage || !!_0x3a2744.videoMessage || !!_0x3a2744.audioMessage || !!_0x3a2744.documentMessage || !!_0x3a2744.stickerMessage;
      if (_0x41b4cc && this.whatsappService) {
        try {
          const _0x12e8d4 = await this.whatsappService.downloadMedia(_0x4d26e9, _0x1d42da.key);
          if (_0x12e8d4 && _0x12e8d4.success && _0x12e8d4.buffer) {
            const _0x49fde3 = _0x12e8d4.buffer.toString("base64");
            _0x1bafe5 = _0x12e8d4.mimeType || "application/octet-stream";
            _0x4418b7 = "data:" + _0x1bafe5 + ";base64," + _0x49fde3;
          }
        } catch (_0xd50573) {
          this.log("⚠️ Live Chat Service: Could not download media: " + _0xd50573.message);
        }
        if (_0x3a2744.documentMessage) {
          _0x413259 = _0x3a2744.documentMessage.fileName || null;
          if (!_0x1bafe5) {
            _0x1bafe5 = _0x3a2744.documentMessage.mimetype || null;
          }
        }
      }
      const _0x2b6469 = {
        messageId: _0x1d42da.key.id,
        senderType: _0x564709,
        senderName: _0x25d954,
        content: _0xa84104.text || _0xa84104.caption || "",
        messageType: _0xa84104.type || "text",
        attachmentUrl: _0x4418b7,
        attachmentName: _0x413259,
        attachmentSize: null,
        attachmentMimeType: _0x1bafe5,
        caption: _0xa84104.caption || null,
        metadata: JSON.stringify({
          whatsappMessageId: _0x1d42da.key.id,
          remoteJid: _0x149dd2,
          timestamp: _0xa84104.timestamp || new Date().toISOString()
        }),
        status: "sent"
      };
      const _0x24e805 = await this.saveMessage(_0x4c7dcf, _0x2b6469);
      if (_0x24e805.success) {
        this.emit("message:new", {
          conversationId: _0x4c7dcf,
          sessionId: _0x4d26e9,
          messageData: _0x2b6469,
          message: _0xa84104
        });
      } else {
        this.log("❌ Live Chat Service: Failed to save message: " + _0x24e805.error);
      }
    } catch (_0x5395aa) {
      this.log("❌ Live Chat Service: Error in handleWhatsAppMessage: " + _0x5395aa.message);
      console.error("❌ Live Chat Service: Error in handleWhatsAppMessage:", _0x5395aa);
    }
  }
  async runMigrations() {
    try {
      const _0x2de191 = path.join(__dirname, "..", "database", "migrations", "live_chat_schema.sql");
      if (fs.existsSync(_0x2de191)) {
        const _0x4f5cac = fs.readFileSync(_0x2de191, "utf8");
        if (this.db && this.db.dbRaw && typeof this.db.dbRaw.exec === "function") {
          this.db.dbRaw.exec(_0x4f5cac);
        } else {
          const _0x1745a1 = _0x4f5cac.split(";").map(_0x3dee5f => _0x3dee5f.replace(/^(\s*--[^\n]*\n)+/g, "").trim()).filter(_0x3205cd => _0x3205cd.length > 0);
          for (let _0x21782e = 0; _0x21782e < _0x1745a1.length; _0x21782e++) {
            const _0x489544 = _0x1745a1[_0x21782e].trim();
            if (_0x489544) {
              try {
                await this.db.run(_0x489544);
              } catch (_0x5b1e2e) {
                if (_0x5b1e2e.message && _0x5b1e2e.message.includes("already exists")) {} else {
                  this.log("⚠️ Live Chat Service: Statement warning: " + _0x5b1e2e.message);
                }
              }
            }
          }
        }
      } else {
        this.log("❌ Live Chat Service: Migration file not found: " + _0x2de191);
      }
    } catch (_0x44355e) {
      this.log("❌ Live Chat Service: Error running migrations: " + _0x44355e.message);
    }
  }
  async getOrCreateConversation(_0x566fc2, _0x1ce80b, _0x51cbf4 = null, _0x2afa07 = null, _0x1bf84a = null) {
    try {
      const _0x14c952 = _0x566fc2 + "_" + _0x1ce80b;
      let _0x26ce1d = null;
      if (_0x1bf84a) {
        const _0x19b593 = await this.db.query("SELECT * FROM live_chat_conversations\n           WHERE session_id = ? AND metadata LIKE ?\n           ORDER BY updated_at DESC LIMIT 1", [_0x566fc2, "%\"fullChatId\":\"" + _0x1bf84a + "\"%"]);
        if (_0x19b593.success && _0x19b593.data && _0x19b593.data.length > 0) {
          _0x26ce1d = _0x19b593;
        }
      }
      if (!_0x26ce1d) {
        _0x26ce1d = await this.db.query("SELECT * FROM live_chat_conversations WHERE session_id = ? AND contact_phone = ? ORDER BY updated_at DESC LIMIT 1", [_0x566fc2, _0x1ce80b]);
      }
      if (_0x26ce1d.success && _0x26ce1d.data && _0x26ce1d.data.length > 0) {
        const _0x21094b = _0x26ce1d.data[0];
        if (_0x21094b.conversation_id !== _0x14c952) {
          await this.db.run("UPDATE live_chat_conversations SET conversation_id = ? WHERE id = ?", [_0x14c952, _0x21094b.id]);
          _0x21094b.conversation_id = _0x14c952;
        }
        const _0x18d13d = _0x494884 => !_0x494884 || /^[+0-9\s\-()]{6,}$/.test(_0x494884.trim()) || /^Contact\s+[0-9]+$/i.test(_0x494884.trim());
        const _0x1f9039 = _0x3f558e => !_0x3f558e || /^[+0-9\s\-()]{6,}$/.test(_0x3f558e.trim()) || /^Contact\s+[0-9]+$/i.test(_0x3f558e.trim());
        if (_0x51cbf4 && !_0x1f9039(_0x51cbf4) && _0x18d13d(_0x21094b.contact_name)) {
          await this.db.run("UPDATE live_chat_conversations SET contact_name = ? WHERE id = ?", [_0x51cbf4, _0x21094b.id]);
          _0x21094b.contact_name = _0x51cbf4;
        }
        return {
          success: true,
          conversation: _0x21094b
        };
      }
      const _0x1fd0b1 = _0x51cbf4 && _0x51cbf4 !== "null" ? _0x51cbf4 : null;
      const _0x2f6aae = await this.db.run("INSERT INTO live_chat_conversations\n        (conversation_id, session_id, contact_phone, contact_name, contact_avatar, status, last_message_at)\n        VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))", [_0x14c952, _0x566fc2, _0x1ce80b, _0x1fd0b1, _0x2afa07]);
      if (_0x2f6aae.success) {
        await this.createOrUpdateContact(_0x1ce80b, _0x51cbf4, _0x2afa07);
        const _0x144372 = await this.db.query("SELECT * FROM live_chat_conversations WHERE id = ?", [_0x2f6aae.lastID]);
        return {
          success: true,
          conversation: _0x144372.data[0]
        };
      }
      return {
        success: false,
        error: "Failed to create conversation"
      };
    } catch (_0x383f42) {
      console.error("❌ Error getting/creating conversation:", _0x383f42);
      return {
        success: false,
        error: _0x383f42.message
      };
    }
  }
  async saveMessage(_0x35c599, _0x333ceb) {
    try {
      const {
        messageId: _0x3a3f98,
        senderType: _0x17881d,
        senderName: _0x5cd7f8,
        content: _0xe4b797,
        messageType = "text",
        attachmentUrl = null,
        attachmentName = null,
        attachmentSize = null,
        attachmentMimeType = null,
        caption = null,
        metadata = null,
        status = "sent"
      } = _0x333ceb;
      const _0x1be903 = await this.db.query("SELECT id FROM live_chat_conversations WHERE conversation_id = ?", [_0x35c599]);
      if (!_0x1be903.success || !_0x1be903.data || _0x1be903.data.length === 0) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const _0x3eaca7 = _0x1be903.data[0].id;
      const _0x3ebc88 = await this.db.run("INSERT OR IGNORE INTO live_chat_messages\n        (message_id, conversation_id, sender_type, sender_name, content, message_type,\n         attachment_url, attachment_name, attachment_size, attachment_mime_type, caption, metadata, status)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0x3a3f98, _0x3eaca7, _0x17881d, _0x5cd7f8, _0xe4b797, messageType, attachmentUrl, attachmentName, attachmentSize, attachmentMimeType, caption, metadata ? JSON.stringify(metadata) : null, status]);
      if (_0x3ebc88.success) {
        if (!_0x3ebc88.changes || _0x3ebc88.changes === 0) {
          return {
            success: true,
            messageId: null
          };
        }
        await this.db.run("UPDATE live_chat_conversations\n           SET last_message_at = datetime('now'),\n               last_message_preview = ?,\n               unread_count = CASE WHEN ? = 'customer' THEN unread_count + 1 ELSE unread_count END\n           WHERE id = ?", [_0xe4b797 || "[" + messageType + "]", _0x17881d, _0x3eaca7]);
        this.emit("message:new", {
          conversationId: _0x35c599,
          messageData: _0x333ceb
        });
        return {
          success: true,
          messageId: _0x3ebc88.lastID
        };
      }
      return {
        success: false,
        error: "Failed to save message"
      };
    } catch (_0x80681) {
      console.error("❌ Error saving message:", _0x80681);
      return {
        success: false,
        error: _0x80681.message
      };
    }
  }
  async updateMessageAttachment(_0x5be0a8, _0x1d4025, _0x36824a) {
    try {
      const _0x265275 = await this.db.run("UPDATE live_chat_messages\n         SET attachment_url = ?, attachment_mime_type = ?\n         WHERE message_id = ?", [_0x1d4025, _0x36824a || null, _0x5be0a8]);
      return {
        success: _0x265275.success,
        changes: _0x265275.changes
      };
    } catch (_0x1ee496) {
      console.error("❌ Error updating message attachment:", _0x1ee496);
      return {
        success: false,
        error: _0x1ee496.message
      };
    }
  }
  async getConversations(_0x12e609, _0x5bf70d = {}) {
    try {
      const {
        status = "active",
        assignedTo = null,
        limit = 50,
        offset = 0
      } = _0x5bf70d;
      let _0x47aa53 = "\n        SELECT c.*,\n               COUNT(DISTINCT m.id) as message_count,\n               MAX(m.created_at) as last_message_time\n        FROM live_chat_conversations c\n        LEFT JOIN live_chat_messages m ON c.id = m.conversation_id\n        WHERE c.contact_phone != 'status'\n      ";
      const _0xbba7a = [];
      if (_0x12e609 && _0x12e609 !== "__all__") {
        _0x47aa53 += " AND c.session_id = ?";
        _0xbba7a.push(_0x12e609);
      }
      if (status && status !== "all") {
        _0x47aa53 += " AND c.status = ?";
        _0xbba7a.push(status);
      }
      if (assignedTo) {
        _0x47aa53 += " AND c.assigned_to = ?";
        _0xbba7a.push(assignedTo);
      }
      _0x47aa53 += " GROUP BY c.id ORDER BY c.last_message_at DESC";
      const _0x17ba2f = await this.db.query(_0x47aa53, _0xbba7a);
      if (!_0x17ba2f.success || !_0x17ba2f.data) {
        return _0x17ba2f;
      }
      const _0x3d2647 = _0x2dc237 => !_0x2dc237 || /^[+0-9\s\-()]{4,}$/.test(_0x2dc237.trim()) || /^Contact\s+[0-9]+$/i.test(_0x2dc237.trim());
      const _0x39834e = new Map();
      for (const _0xedfb5 of _0x17ba2f.data) {
        const _0xeee2ac = _0xedfb5.contact_phone;
        if (!_0xeee2ac) {
          continue;
        }
        const _0x11e99a = _0x39834e.get(_0xeee2ac);
        if (!_0x11e99a || _0x3d2647(_0x11e99a.contact_name) && !_0x3d2647(_0xedfb5.contact_name)) {
          _0x39834e.set(_0xeee2ac, _0xedfb5);
        }
      }
      const _0xf48c05 = new Set();
      let _0x1c6ab1 = [];
      for (const _0x2e96f6 of _0x17ba2f.data) {
        const _0x1d95fa = _0x2e96f6.contact_phone;
        if (!_0x1d95fa) {
          _0x1c6ab1.push(_0x2e96f6);
          continue;
        }
        if (_0xf48c05.has(_0x1d95fa)) {
          continue;
        }
        _0xf48c05.add(_0x1d95fa);
        _0x1c6ab1.push(_0x39834e.get(_0x1d95fa) || _0x2e96f6);
      }
      const _0x4d3952 = new Map();
      const _0x83565b = _0x1c6ab1.filter(_0x510f1 => _0x510f1.contact_phone).map(_0x4dcc9d => _0x4dcc9d.contact_phone);
      if (_0x83565b.length > 0) {
        const _0xd72213 = _0x83565b.map(() => "?").join(",");
        try {
          const _0x3b9657 = await this.db.query("SELECT phone, name FROM live_chat_contacts WHERE phone IN (" + _0xd72213 + ")", _0x83565b);
          if (_0x3b9657.success && _0x3b9657.data) {
            for (const _0x28d48d of _0x3b9657.data) {
              if (!_0x3d2647(_0x28d48d.name)) {
                _0x4d3952.set(_0x28d48d.phone, _0x28d48d.name);
              }
            }
          }
        } catch (_0xcef1b3) {}
        try {
          const _0x21d468 = await this.db.query("SELECT phone_number, name FROM contacts WHERE phone_number IN (" + _0xd72213 + ")", _0x83565b);
          if (_0x21d468.success && _0x21d468.data) {
            for (const _0x1d7878 of _0x21d468.data) {
              if (!_0x3d2647(_0x1d7878.name) && !_0x4d3952.has(_0x1d7878.phone_number)) {
                _0x4d3952.set(_0x1d7878.phone_number, _0x1d7878.name);
              }
            }
          }
        } catch (_0x532fc0) {}
      }
      if (this.whatsappService) {
        try {
          const _0x207a54 = this.whatsappService.getStore(_0x12e609);
          if (_0x207a54 && _0x207a54.contacts) {
            for (const _0x4243a5 of _0x1c6ab1) {
              const _0x471cea = _0x4243a5.contact_phone;
              if (!_0x471cea) {
                continue;
              }
              const _0x44e2f9 = [_0x471cea + "@s.whatsapp.net", _0x471cea + "@c.us"];
              for (const _0x54e75d of _0x44e2f9) {
                const _0x1121bc = _0x207a54.contacts[_0x54e75d];
                if (_0x1121bc) {
                  const _0x576689 = _0x1121bc.notify || _0x1121bc.name || _0x1121bc.verifiedName;
                  if (_0x576689 && !_0x3d2647(_0x576689)) {
                    _0x4d3952.set(_0x471cea, _0x576689.trim());
                    break;
                  }
                }
              }
            }
          }
        } catch (_0x4fe4ee) {}
      }
      if (_0x4d3952.size > 0) {
        _0x1c6ab1 = _0x1c6ab1.map(_0x33c15d => {
          const _0x7c212a = _0x4d3952.get(_0x33c15d.contact_phone);
          if (_0x7c212a && (_0x3d2647(_0x33c15d.contact_name) || _0x7c212a !== _0x33c15d.contact_name)) {
            return {
              ..._0x33c15d,
              contact_name: _0x7c212a
            };
          }
          return _0x33c15d;
        });
      }
      const _0x40302c = [];
      _0x1c6ab1 = _0x1c6ab1.map(_0x2920ed => {
        if (/^Contact\s+[0-9]+$/i.test((_0x2920ed.contact_name || "").trim())) {
          const _0x2f8b2a = _0x2920ed.contact_phone || _0x2920ed.contact_name;
          _0x40302c.push({
            id: _0x2920ed.id,
            name: _0x2f8b2a
          });
          return {
            ..._0x2920ed,
            contact_name: _0x2f8b2a
          };
        }
        return _0x2920ed;
      });
      if (_0x40302c.length > 0) {
        Promise.all(_0x40302c.map(({
          id: _0x1a8f3f
        }) => this.db.run("UPDATE live_chat_conversations SET contact_name = NULL WHERE id = ?", [_0x1a8f3f]))).catch(() => {});
      }
      _0x1c6ab1 = _0x1c6ab1.map(_0x1d7345 => ({
        ..._0x1d7345,
        contact_name: _0x1d7345.contact_name || _0x1d7345.contact_phone
      }));
      const _0x4961a5 = _0x1c6ab1.slice(Number(offset), Number(offset) + Number(limit));
      return {
        success: true,
        data: _0x4961a5
      };
    } catch (_0x2a1cd3) {
      console.error("❌ Error getting conversations:", _0x2a1cd3);
      return {
        success: false,
        error: _0x2a1cd3.message
      };
    }
  }
  async getMessages(_0x336d94, _0x41244a = 100, _0x4770ae = 0) {
    try {
      const _0x55c2b8 = await this.db.query("SELECT id FROM live_chat_conversations WHERE conversation_id = ?", [_0x336d94]);
      if (!_0x55c2b8.success || !_0x55c2b8.data || _0x55c2b8.data.length === 0) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const _0xe4d07f = _0x55c2b8.data[0].id;
      const _0x339e37 = await this.db.query("SELECT * FROM live_chat_messages\n         WHERE conversation_id = ? AND is_deleted = 0\n         ORDER BY created_at ASC\n         LIMIT ? OFFSET ?", [_0xe4d07f, _0x41244a, _0x4770ae]);
      return _0x339e37;
    } catch (_0x5ae729) {
      console.error("❌ Error getting messages:", _0x5ae729);
      return {
        success: false,
        error: _0x5ae729.message
      };
    }
  }
  async markAsRead(_0x222dbb) {
    try {
      const _0x1af125 = await this.db.query("SELECT session_id, contact_phone, metadata FROM live_chat_conversations WHERE conversation_id = ?", [_0x222dbb]);
      if (!_0x1af125.success || !_0x1af125.data || _0x1af125.data.length === 0) {
        const _0xf3614 = _0x222dbb.split("_");
        if (_0xf3614.length >= 2) {
          const _0x26a0c2 = _0xf3614.slice(0, -1).join("_");
          const _0xf534dc = _0xf3614[_0xf3614.length - 1];
          const _0xed7344 = await this.getOrCreateConversation(_0x26a0c2, _0xf534dc);
          if (_0xed7344.success) {
            const _0x19c693 = await this.db.run("UPDATE live_chat_conversations SET unread_count = 0 WHERE conversation_id = ?", [_0x222dbb]);
            return _0x19c693;
          }
        }
        return {
          success: false,
          error: "Conversation not found and could not be created"
        };
      }
      const _0x122cf6 = _0x1af125.data[0];
      const _0x273042 = _0x122cf6.session_id;
      let _0x4b6307 = null;
      if (_0x122cf6.metadata) {
        try {
          const _0x113e26 = JSON.parse(_0x122cf6.metadata);
          _0x4b6307 = _0x113e26.fullChatId;
        } catch (_0x397afe) {}
      }
      if (!_0x4b6307 && _0x122cf6.contact_phone) {
        _0x4b6307 = _0x122cf6.contact_phone + "@s.whatsapp.net";
      }
      const _0x4cd53c = await this.db.run("UPDATE live_chat_conversations SET unread_count = 0 WHERE conversation_id = ?", [_0x222dbb]);
      if (this.whatsappService && _0x4b6307 && _0x273042) {
        try {
          await this.whatsappService.markChatAsRead(_0x273042, _0x4b6307);
        } catch (_0x32da21) {}
      }
      this.emit("conversation:read", {
        conversationId: _0x222dbb
      });
      return _0x4cd53c;
    } catch (_0x2b1c08) {
      console.error("❌ Error marking conversation as read:", _0x2b1c08);
      return {
        success: false,
        error: _0x2b1c08.message
      };
    }
  }
  async updateConversation(_0x1d8a98, _0x5a49df) {
    try {
      const _0x2eafe9 = [];
      const _0x44d05f = [];
      if (_0x5a49df.metadata !== undefined) {
        _0x2eafe9.push("metadata = ?");
        _0x44d05f.push(_0x5a49df.metadata);
      }
      if (_0x5a49df.status !== undefined) {
        _0x2eafe9.push("status = ?");
        _0x44d05f.push(_0x5a49df.status);
      }
      if (_0x5a49df.contact_name !== undefined) {
        _0x2eafe9.push("contact_name = ?");
        _0x44d05f.push(_0x5a49df.contact_name);
      }
      if (_0x5a49df.contact_phone !== undefined) {
        _0x2eafe9.push("contact_phone = ?");
        _0x44d05f.push(_0x5a49df.contact_phone);
      }
      if (_0x2eafe9.length === 0) {
        return {
          success: true
        };
      }
      _0x44d05f.push(_0x1d8a98);
      const _0x39e3da = await this.db.run("UPDATE live_chat_conversations SET " + _0x2eafe9.join(", ") + " WHERE id = ?", _0x44d05f);
      return _0x39e3da;
    } catch (_0x575524) {
      console.error("❌ Error updating conversation:", _0x575524);
      return {
        success: false,
        error: _0x575524.message
      };
    }
  }
  async updateConversationStatus(_0x294be8, _0x39b871) {
    try {
      await this.db.run("UPDATE live_chat_conversations\n         SET status = ?,\n             resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE resolved_at END,\n             archived_at = CASE WHEN ? = 'archived' THEN datetime('now') ELSE archived_at END\n         WHERE conversation_id = ?", [_0x39b871, _0x39b871, _0x39b871, _0x294be8]);
      await this.logActivity(_0x294be8, "status_changed", null, {
        newStatus: _0x39b871
      });
      this.emit("conversation:status_changed", {
        conversationId: _0x294be8,
        status: _0x39b871
      });
      return {
        success: true
      };
    } catch (_0x4eae77) {
      console.error("❌ Error updating conversation status:", _0x4eae77);
      return {
        success: false,
        error: _0x4eae77.message
      };
    }
  }
  async createOrUpdateContact(_0x10c512, _0x22f39c = null, _0x45722e = null, _0x42ca86 = {}) {
    try {
      const _0x5e5698 = _0x4db632 => !_0x4db632 || /^[+0-9\s\-()]{6,}$/.test(_0x4db632.trim()) || /^Contact\s+[0-9]+$/i.test(_0x4db632.trim());
      const _0x1bcd4d = _0x5e5698(_0x22f39c) ? null : _0x22f39c;
      const _0x28316c = await this.db.query("SELECT * FROM live_chat_contacts WHERE phone = ?", [_0x10c512]);
      if (_0x28316c.success && _0x28316c.data && _0x28316c.data.length > 0) {
        const _0x43125f = [];
        const _0x3feabc = [];
        if (_0x1bcd4d && _0x5e5698(_0x28316c.data[0].name)) {
          _0x43125f.push("name = ?");
          _0x3feabc.push(_0x1bcd4d);
        }
        if (_0x45722e) {
          _0x43125f.push("avatar = ?");
          _0x3feabc.push(_0x45722e);
        }
        if (_0x42ca86.email !== undefined) {
          _0x43125f.push("email = ?");
          _0x3feabc.push(_0x42ca86.email);
        }
        if (_0x42ca86.company !== undefined) {
          _0x43125f.push("company = ?");
          _0x3feabc.push(_0x42ca86.company);
        }
        if (_0x42ca86.tags !== undefined) {
          _0x43125f.push("tags = ?");
          _0x3feabc.push(_0x42ca86.tags);
        }
        _0x43125f.push("last_contact_at = datetime('now')");
        _0x43125f.push("updated_at = datetime('now')");
        _0x3feabc.push(_0x10c512);
        if (_0x43125f.length > 0) {
          await this.db.run("UPDATE live_chat_contacts SET " + _0x43125f.join(", ") + " WHERE phone = ?", _0x3feabc);
        }
        const _0x3bdd63 = await this.db.query("SELECT * FROM live_chat_contacts WHERE phone = ?", [_0x10c512]);
        return {
          success: true,
          contact: _0x3bdd63.data[0]
        };
      } else {
        const _0x5e51ce = await this.db.run("INSERT INTO live_chat_contacts\n          (phone, name, avatar, email, company, tags, first_contact_at, last_contact_at, total_conversations)\n          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)", [_0x10c512, _0x1bcd4d, _0x45722e, _0x42ca86.email || null, _0x42ca86.company || null, _0x42ca86.tags || null]);
        if (_0x5e51ce.success) {
          const _0x579d1f = await this.db.query("SELECT * FROM live_chat_contacts WHERE id = ?", [_0x5e51ce.lastID]);
          return {
            success: true,
            contact: _0x579d1f.data[0]
          };
        }
      }
      return {
        success: false,
        error: "Failed to create/update contact"
      };
    } catch (_0x73598d) {
      console.error("❌ Error creating/updating contact:", _0x73598d);
      return {
        success: false,
        error: _0x73598d.message
      };
    }
  }
  async getContact(_0x4d190a) {
    try {
      const _0x1799db = await this.db.query("SELECT * FROM live_chat_contacts WHERE phone = ?", [_0x4d190a]);
      return _0x1799db;
    } catch (_0x515b50) {
      console.error("❌ Error getting contact:", _0x515b50);
      return {
        success: false,
        error: _0x515b50.message
      };
    }
  }
  async addNote(_0x47a0b6, _0xc36090, _0x506714, _0x50f0a3 = "general") {
    try {
      const _0x9dfff = await this.db.query("SELECT id, contact_phone FROM live_chat_conversations WHERE conversation_id = ?", [_0x47a0b6]);
      if (!_0x9dfff.success || !_0x9dfff.data || _0x9dfff.data.length === 0) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const _0x25a0c4 = _0x9dfff.data[0].id;
      const _0x356a38 = await this.db.query("SELECT id FROM live_chat_contacts WHERE phone = ?", [_0x9dfff.data[0].contact_phone]);
      const _0x1580e3 = _0x356a38.success && _0x356a38.data && _0x356a38.data.length > 0 ? _0x356a38.data[0].id : null;
      await this.db.run("INSERT INTO live_chat_notes (conversation_id, contact_id, author, note_type, content)\n         VALUES (?, ?, ?, ?, ?)", [_0x25a0c4, _0x1580e3, _0xc36090, _0x50f0a3, _0x506714]);
      this.emit("note:added", {
        conversationId: _0x47a0b6,
        noteType: _0x50f0a3,
        content: _0x506714
      });
      return {
        success: true
      };
    } catch (_0x1544ef) {
      console.error("❌ Error adding note:", _0x1544ef);
      return {
        success: false,
        error: _0x1544ef.message
      };
    }
  }
  async getNotes(_0x58681b) {
    try {
      const _0x5d5bef = await this.db.query("SELECT id FROM live_chat_conversations WHERE conversation_id = ?", [_0x58681b]);
      if (!_0x5d5bef.success || !_0x5d5bef.data || _0x5d5bef.data.length === 0) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const _0x1a1f07 = await this.db.query("SELECT * FROM live_chat_notes WHERE conversation_id = ? ORDER BY created_at DESC", [_0x5d5bef.data[0].id]);
      return _0x1a1f07;
    } catch (_0x419e36) {
      console.error("❌ Error getting notes:", _0x419e36);
      return {
        success: false,
        error: _0x419e36.message
      };
    }
  }
  async updateNote(_0x3ba41e, _0x149b59) {
    try {
      await this.db.run("UPDATE live_chat_notes\n         SET content = ?, updated_at = CURRENT_TIMESTAMP\n         WHERE id = ?", [_0x149b59, _0x3ba41e]);
      this.emit("note:updated", {
        noteId: _0x3ba41e,
        content: _0x149b59
      });
      return {
        success: true
      };
    } catch (_0x1fe15f) {
      console.error("❌ Error updating note:", _0x1fe15f);
      return {
        success: false,
        error: _0x1fe15f.message
      };
    }
  }
  async deleteNote(_0x43537b) {
    try {
      await this.db.run("DELETE FROM live_chat_notes WHERE id = ?", [_0x43537b]);
      this.emit("note:deleted", {
        noteId: _0x43537b
      });
      return {
        success: true
      };
    } catch (_0x735d00) {
      console.error("❌ Error deleting note:", _0x735d00);
      return {
        success: false,
        error: _0x735d00.message
      };
    }
  }
  async logActivity(_0x22e53f, _0x4f7f28, _0x10687b = null, _0x1f9915 = {}) {
    try {
      const _0x3d7e4b = await this.db.query("SELECT id FROM live_chat_conversations WHERE conversation_id = ?", [_0x22e53f]);
      if (!_0x3d7e4b.success || !_0x3d7e4b.data || _0x3d7e4b.data.length === 0) {
        return {
          success: false,
          error: "Conversation not found"
        };
      }
      const _0x31cb78 = await this.db.run("INSERT INTO live_chat_activity_log (conversation_id, activity_type, actor, details)\n         VALUES (?, ?, ?, ?)", [_0x3d7e4b.data[0].id, _0x4f7f28, _0x10687b, JSON.stringify(_0x1f9915)]);
      return _0x31cb78;
    } catch (_0x3c809e) {
      console.error("❌ Error logging activity:", _0x3c809e);
      return {
        success: false,
        error: _0x3c809e.message
      };
    }
  }
  async searchConversations(_0x3bc761, _0xa72bfb) {
    try {
      const _0x4857c7 = await this.db.query("SELECT DISTINCT c.* FROM live_chat_conversations c\n         LEFT JOIN live_chat_messages m ON c.id = m.conversation_id\n         WHERE c.session_id = ? AND (\n           c.contact_name LIKE ? OR\n           c.contact_phone LIKE ? OR\n           m.content LIKE ?\n         )\n         ORDER BY c.last_message_at DESC\n         LIMIT 50", [_0x3bc761, "%" + _0xa72bfb + "%", "%" + _0xa72bfb + "%", "%" + _0xa72bfb + "%"]);
      return _0x4857c7;
    } catch (_0x3d2cdf) {
      console.error("❌ Error searching conversations:", _0x3d2cdf);
      return {
        success: false,
        error: _0x3d2cdf.message
      };
    }
  }
  async getQuickReplies() {
    try {
      const _0x322edd = await this.db.query("SELECT * FROM live_chat_quick_replies WHERE is_active = 1 ORDER BY usage_count DESC");
      return _0x322edd;
    } catch (_0x18c6e1) {
      console.error("❌ Error getting quick replies:", _0x18c6e1);
      return {
        success: false,
        error: _0x18c6e1.message
      };
    }
  }
  async createQuickReply(_0x580b4a, _0x1ad465, _0x4a3e38, _0x266c2d = "general") {
    try {
      const _0x14a83e = await this.db.run("INSERT INTO live_chat_quick_replies (shortcut, title, content, category)\n         VALUES (?, ?, ?, ?)", [_0x580b4a, _0x1ad465, _0x4a3e38, _0x266c2d]);
      return _0x14a83e;
    } catch (_0x2086b8) {
      console.error("❌ Error creating quick reply:", _0x2086b8);
      return {
        success: false,
        error: _0x2086b8.message
      };
    }
  }
  async getStatistics(_0x493079) {
    try {
      const _0x24ce2b = await this.db.query("SELECT\n           COUNT(*) as total_conversations,\n           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,\n           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_conversations,\n           SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_conversations,\n           SUM(unread_count) as total_unread\n         FROM live_chat_conversations\n         WHERE session_id = ?", [_0x493079]);
      return _0x24ce2b;
    } catch (_0xd23334) {
      console.error("❌ Error getting statistics:", _0xd23334);
      return {
        success: false,
        error: _0xd23334.message
      };
    }
  }
}
module.exports = LiveChatService;