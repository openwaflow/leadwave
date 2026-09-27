const DatabaseService = require("./database.service");
class OptOutService {
  constructor(_0x358619 = null) {
    this.databaseService = _0x358619 || new DatabaseService();
    this.logger = require("pino")({
      level: "info"
    });
  }
  setDatabaseService(_0x56b7ca) {
    this.databaseService = _0x56b7ca;
  }
  async ensureTablesExist() {
    try {
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS communication_preferences (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          phone_number TEXT NOT NULL,\n          message_type TEXT NOT NULL DEFAULT 'promotional',\n          opted_out BOOLEAN DEFAULT 0,\n          consent_given BOOLEAN DEFAULT 1,\n          consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,\n          opt_out_date DATETIME,\n          opt_out_method TEXT,\n          opt_out_reason TEXT,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          UNIQUE(phone_number, message_type)\n        )\n      ");
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS opt_out_keywords (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          keyword TEXT NOT NULL UNIQUE,\n          auto_response_template TEXT,\n          case_sensitive BOOLEAN DEFAULT 0,\n          is_active BOOLEAN DEFAULT 1,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        )\n      ");
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS opt_out_requests (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          phone_number TEXT NOT NULL,\n          request_type TEXT NOT NULL,\n          keyword_used TEXT,\n          session_id TEXT,\n          processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          status TEXT DEFAULT 'processed'\n        )\n      ");
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS compliance_audit_log (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          phone_number TEXT NOT NULL,\n          action TEXT NOT NULL,\n          details TEXT,\n          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,\n          user_agent TEXT,\n          ip_address TEXT\n        )\n      ");
      await this.databaseService.run("\n        INSERT OR IGNORE INTO opt_out_keywords (keyword, auto_response_template, case_sensitive, is_active)\n        VALUES\n        ('UNSUBSCRIBE', 'You have been unsubscribed from our messages. Reply SUBSCRIBE to opt back in.', 0, 1),\n        ('SUBSCRIBE', 'You have been subscribed to our messages. Reply UNSUBSCRIBE to unsubscribe.', 0, 1)\n      ");
      await this.databaseService.run("\n        DELETE FROM opt_out_keywords\n        WHERE keyword NOT IN ('SUBSCRIBE', 'UNSUBSCRIBE')\n      ");
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS opt_out_settings (\n          id INTEGER PRIMARY KEY,\n          subscribe_message TEXT,\n          unsubscribe_message TEXT,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        )\n      ");
      await this.databaseService.run("\n        INSERT OR IGNORE INTO opt_out_settings (id, subscribe_message, unsubscribe_message)\n        VALUES (1,\n          'You have been subscribed to Lead Wave messages. Reply UNSUBSCRIBE to unsubscribe.',\n          'You have been unsubscribed from Lead Wave messages. Reply SUBSCRIBE to opt back in.'\n        )\n      ");
    } catch (_0x109242) {
      this.logger.error("Error creating opt-out tables:", _0x109242);
      throw _0x109242;
    }
  }
  async isOptedOut(_0x13cbde, _0x2737e1 = "marketing") {
    try {
      if (!this.databaseService || !this.databaseService.db) {
        return {
          isOptedOut: false,
          reason: "Database not available"
        };
      }
      const _0x294bbe = this.normalizePhoneNumber(_0x13cbde);
      const _0xf769b6 = await this.databaseService.get("\n        SELECT\n          opt_out_status,\n          opt_out_date,\n          opt_out_reason,\n          marketing_consent,\n          transactional_consent,\n          promotional_consent,\n          reminder_consent\n        FROM communication_preferences\n        WHERE phone_number = ?\n      ", [_0x294bbe]);
      const _0x418ab6 = _0xf769b6?.success ? _0xf769b6.data : _0xf769b6;
      if (!_0x418ab6) {
        return {
          isOptedOut: false
        };
      }
      if (_0x418ab6.opt_out_status === "opted_out") {
        return {
          isOptedOut: true,
          reason: _0x418ab6.opt_out_reason || "Global opt-out",
          optOutDate: _0x418ab6.opt_out_date ? new Date(_0x418ab6.opt_out_date) : null
        };
      }
      const _0x4e0551 = _0x2737e1 + "_consent";
      if (_0x418ab6[_0x4e0551] === 0) {
        return {
          isOptedOut: true,
          reason: "Opted out from " + _0x2737e1 + " messages",
          optOutDate: _0x418ab6.opt_out_date ? new Date(_0x418ab6.opt_out_date) : null
        };
      }
      return {
        isOptedOut: false
      };
    } catch (_0x4084b6) {
      this.logger.error("Error checking opt-out status:", _0x4084b6);
      return {
        isOptedOut: false,
        reason: "Error checking opt-out status"
      };
    }
  }
  async optOut(_0x25bf14, _0xa09c04 = {}) {
    try {
      const _0x3203c4 = this.normalizePhoneNumber(_0x25bf14);
      const {
        method = "manual",
        reason = "User request",
        campaignId = null,
        sessionId = null,
        messageTypes = ["all"]
      } = _0xa09c04;
      let _0x252bdc = await this.databaseService.get("SELECT id FROM contacts WHERE phone_number = ? OR phone_number = ? OR phone_number = ?", [_0x3203c4, _0x25bf14, "+" + _0x3203c4]);
      const _0x45df09 = new Date().toISOString();
      if (messageTypes.includes("all")) {
        await this.databaseService.run("\n          INSERT OR REPLACE INTO communication_preferences (\n            phone_number, contact_id, opt_out_status, opt_out_date, opt_out_method,\n            opt_out_campaign_id, opt_out_reason, marketing_consent, transactional_consent,\n            promotional_consent, reminder_consent, last_consent_update, updated_at\n          ) VALUES (?, ?, 'opted_out', ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)\n        ", [_0x3203c4, _0x252bdc?.id || null, _0x45df09, method, campaignId, reason, _0x45df09, _0x45df09]);
      } else {
        const _0x24f9f9 = messageTypes.map(_0x1b0e6e => _0x1b0e6e + "_consent = 0").join(", ");
        await this.databaseService.run("\n          INSERT OR REPLACE INTO communication_preferences (\n            phone_number, contact_id, opt_out_date, opt_out_method,\n            opt_out_campaign_id, opt_out_reason, last_consent_update, updated_at,\n            " + _0x24f9f9 + "\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, " + messageTypes.map(() => "0").join(", ") + ")\n        ", [_0x3203c4, _0x252bdc?.id || null, _0x45df09, method, campaignId, reason, _0x45df09, _0x45df09]);
      }
      await this.databaseService.run("\n        INSERT INTO opt_out_requests (\n          phone_number, contact_id, session_id, request_method, campaign_id,\n          processed, processed_at\n        ) VALUES (?, ?, ?, ?, ?, 1, ?)\n      ", [_0x3203c4, _0x252bdc?.id || null, sessionId, method, campaignId, _0x45df09]);
      await this.logComplianceAction(_0x3203c4, "opt_out", {
        method: method,
        reason: reason,
        messageTypes: messageTypes,
        campaignId: campaignId,
        sessionId: sessionId
      });
      this.logger.info("Successfully opted out " + _0x3203c4 + " via " + method);
      return {
        success: true,
        message: "Successfully opted out " + _0x3203c4 + " from " + (messageTypes.includes("all") ? "all" : messageTypes.join(", ")) + " messages"
      };
    } catch (_0x5632c0) {
      this.logger.error("Error opting out phone number:", _0x5632c0);
      return {
        success: false,
        message: "Failed to opt out " + _0x25bf14 + ": " + _0x5632c0.message
      };
    }
  }
  async optIn(_0xc0815b, _0x56e611 = {}) {
    try {
      const _0x35f351 = this.normalizePhoneNumber(_0xc0815b);
      const {
        method = "manual",
        sessionId = null,
        messageTypes = ["all"]
      } = _0x56e611;
      const _0x3c6553 = await this.databaseService.get("SELECT id FROM contacts WHERE phone_number = ? OR phone_number = ? OR phone_number = ?", [_0x35f351, _0xc0815b, "+" + _0x35f351]);
      const _0xaed803 = new Date().toISOString();
      if (messageTypes.includes("all")) {
        await this.databaseService.run("\n          INSERT OR REPLACE INTO communication_preferences (\n            phone_number, contact_id, opt_out_status, marketing_consent, transactional_consent,\n            promotional_consent, reminder_consent, last_consent_update, consent_source, updated_at\n          ) VALUES (?, ?, 'opted_in', 1, 1, 1, 1, ?, ?, ?)\n        ", [_0x35f351, _0x3c6553?.id || null, _0xaed803, method, _0xaed803]);
      } else {
        const _0x4bf124 = messageTypes.map(_0x583792 => _0x583792 + "_consent = 1").join(", ");
        await this.databaseService.run("\n          UPDATE communication_preferences \n          SET " + _0x4bf124 + ", last_consent_update = ?, updated_at = ?\n          WHERE phone_number = ?\n        ", [_0xaed803, _0xaed803, _0x35f351]);
      }
      await this.logComplianceAction(_0x35f351, "opt_in", {
        method: method,
        messageTypes: messageTypes,
        sessionId: sessionId
      });
      this.logger.info("Successfully opted in " + _0x35f351 + " via " + method);
      return {
        success: true,
        message: "Successfully opted in " + _0x35f351 + " to " + (messageTypes.includes("all") ? "all" : messageTypes.join(", ")) + " messages"
      };
    } catch (_0x30dade) {
      this.logger.error("Error opting in phone number:", _0x30dade);
      return {
        success: false,
        message: "Failed to opt in " + _0xc0815b + ": " + _0x30dade.message
      };
    }
  }
  async deleteOptOuts(_0xa690f5) {
    try {
      if (!Array.isArray(_0xa690f5) || _0xa690f5.length === 0) {
        return {
          success: false,
          deleted: 0,
          message: "No phone numbers provided"
        };
      }
      const _0x24f2bb = _0xa690f5.map(_0x313e99 => this.normalizePhoneNumber(_0x313e99)).filter(_0x34c83c => _0x34c83c && _0x34c83c.length > 0);
      if (_0x24f2bb.length === 0) {
        return {
          success: false,
          deleted: 0,
          message: "No valid phone numbers provided"
        };
      }
      const _0x33ae78 = _0x24f2bb.map(() => "?").join(",");
      await this.databaseService.run("DELETE FROM communication_preferences WHERE phone_number IN (" + _0x33ae78 + ")", _0x24f2bb);
      for (const _0x5ac4be of _0x24f2bb) {
        try {
          await this.logComplianceAction(_0x5ac4be, "opt_out_deleted", {
            method: "manual",
            source: "admin"
          });
        } catch (_0x2db52c) {
          this.logger.warn("Audit log failed for " + _0x5ac4be + ": " + _0x2db52c.message);
        }
      }
      this.logger.info("Deleted " + _0x24f2bb.length + " opt-out record(s)");
      return {
        success: true,
        deleted: _0x24f2bb.length,
        message: "Deleted " + _0x24f2bb.length + " opt-out record(s)"
      };
    } catch (_0x39e68b) {
      this.logger.error("Error deleting opt-out records:", _0x39e68b);
      return {
        success: false,
        deleted: 0,
        message: "Failed to delete opt-out records: " + _0x39e68b.message
      };
    }
  }
  async processOptOutKeyword(_0x92b647, _0xe32fa5, _0x2e7320) {
    try {
      const _0x193424 = _0xe32fa5.trim().toUpperCase();
      if (!this.databaseService) {
        throw new Error("Database service not initialized");
      }
      if (typeof this.databaseService.all !== "function") {
        throw new Error("Database service.all method not available");
      }
      await this.ensureTablesExist();
      const _0x4e4ce4 = await this.databaseService.get("\n        SELECT subscribe_message, unsubscribe_message\n        FROM opt_out_settings\n        WHERE id = 1\n      ");
      if (_0x193424 === "SUBSCRIBE") {
        await this.optIn(_0x92b647, {
          method: "keyword",
          sessionId: _0x2e7320
        });
        const _0x4132af = _0x4e4ce4?.subscribe_message || "You have been subscribed to Lead Wave messages. Reply UNSUBSCRIBE to unsubscribe.";
        return {
          isOptOutKeyword: true,
          action: "opt_in",
          response: _0x4132af
        };
      }
      if (_0x193424 === "UNSUBSCRIBE") {
        await this.optOut(_0x92b647, {
          method: "keyword",
          reason: "Keyword: UNSUBSCRIBE",
          sessionId: _0x2e7320
        });
        const _0x464485 = _0x4e4ce4?.unsubscribe_message || "You have been unsubscribed from Lead Wave messages. Reply SUBSCRIBE to opt back in.";
        return {
          isOptOutKeyword: true,
          action: "opt_out",
          response: _0x464485
        };
      }
      return {
        isOptOutKeyword: false
      };
    } catch (_0xb25288) {
      this.logger.error("Error processing opt-out keyword:", _0xb25288);
      return {
        isOptOutKeyword: false
      };
    }
  }
  async getOptOutStatistics(_0x572e12 = {}) {
    try {
      const {
        startDate: _0x20ff41,
        endDate: _0x5a44b4,
        campaignId: _0x3a9813
      } = _0x572e12;
      let _0x5d5b01 = "";
      let _0x36920d = [];
      if (_0x20ff41 && _0x5a44b4) {
        _0x5d5b01 += " WHERE created_at BETWEEN ? AND ?";
        _0x36920d.push(_0x20ff41, _0x5a44b4);
      }
      if (_0x3a9813) {
        _0x5d5b01 += _0x5d5b01 ? " AND" : " WHERE";
        _0x5d5b01 += " opt_out_campaign_id = ?";
        _0x36920d.push(_0x3a9813);
      }
      const _0x38c6ef = await this.databaseService.get("\n        SELECT\n          COUNT(*) as total_preferences,\n          SUM(CASE WHEN opt_out_status = 'opted_out' THEN 1 ELSE 0 END) as total_opted_out,\n          SUM(CASE WHEN opt_out_status = 'opted_in' THEN 1 ELSE 0 END) as total_opted_in,\n          SUM(CASE WHEN marketing_consent = 0 THEN 1 ELSE 0 END) as marketing_opt_outs,\n          SUM(CASE WHEN promotional_consent = 0 THEN 1 ELSE 0 END) as promotional_opt_outs,\n          SUM(CASE WHEN transactional_consent = 0 THEN 1 ELSE 0 END) as transactional_opt_outs\n        FROM communication_preferences" + _0x5d5b01 + "\n      ", _0x36920d);
      const _0x18f55c = _0x38c6ef?.success ? _0x38c6ef.data : _0x38c6ef;
      const _0x4a96ac = await this.databaseService.all("\n        SELECT opt_out_method, COUNT(*) as count\n        FROM communication_preferences\n        WHERE opt_out_status = 'opted_out'" + _0x5d5b01.replace("created_at", "opt_out_date") + "\n        GROUP BY opt_out_method\n      ", _0x36920d);
      const _0x55ba06 = _0x4a96ac?.success ? _0x4a96ac.data : _0x4a96ac;
      const _0x2cf4a7 = await this.databaseService.all("\n        SELECT\n          cp.phone_number,\n          cp.opt_out_date as activity_date,\n          cp.opt_out_method,\n          cp.opt_out_reason,\n          cp.opt_out_status,\n          c.name\n        FROM communication_preferences cp\n        LEFT JOIN contacts c ON cp.contact_id = c.id\n        WHERE cp.opt_out_date IS NOT NULL\n        ORDER BY cp.opt_out_date DESC\n        LIMIT 10\n      ");
      const _0x49ea8c = _0x2cf4a7?.success ? _0x2cf4a7.data : _0x2cf4a7;
      const _0x207c2a = Array.isArray(_0x49ea8c) ? _0x49ea8c.map(_0x39cbd2 => ({
        phone_number: _0x39cbd2.phone_number,
        name: _0x39cbd2.name || "Unknown",
        action: _0x39cbd2.opt_out_status === "opted_out" ? "Opted Out" : "Opted In",
        method: _0x39cbd2.opt_out_method || "Unknown",
        reason: _0x39cbd2.opt_out_reason || "No reason provided",
        created_at: _0x39cbd2.activity_date,
        icon: _0x39cbd2.opt_out_status === "opted_out" ? "opt-out" : "opt-in"
      })) : [];
      const _0x3490ce = new Date();
      const _0x36fb22 = new Date(_0x3490ce);
      _0x36fb22.setDate(_0x3490ce.getDate() - _0x3490ce.getDay());
      _0x36fb22.setHours(0, 0, 0, 0);
      const _0x1ab030 = new Date(_0x36fb22);
      _0x1ab030.setDate(_0x36fb22.getDate() + 6);
      _0x1ab030.setHours(23, 59, 59, 999);
      const _0xbb9dba = await this.databaseService.get("\n        SELECT COUNT(*) as thisWeek\n        FROM communication_preferences\n        WHERE opt_out_status = 'opted_out'\n        AND opt_out_date >= ?\n        AND opt_out_date <= ?\n      ", [_0x36fb22.toISOString(), _0x1ab030.toISOString()]);
      const _0x27b9d1 = _0xbb9dba?.success ? _0xbb9dba.data : _0xbb9dba;
      const _0x1bdacd = _0x27b9d1?.thisWeek || 0;
      const _0x54793c = new Date(_0x3490ce);
      _0x54793c.setHours(0, 0, 0, 0);
      const _0x165117 = new Date(_0x3490ce);
      _0x165117.setHours(23, 59, 59, 999);
      const _0x4c3040 = await this.databaseService.get("\n        SELECT COUNT(*) as today\n        FROM communication_preferences\n        WHERE opt_out_status = 'opted_out'\n        AND opt_out_date >= ?\n        AND opt_out_date <= ?\n      ", [_0x54793c.toISOString(), _0x165117.toISOString()]);
      const _0x32c17f = _0x4c3040?.success ? _0x4c3040.data : _0x4c3040;
      const _0x1080cb = _0x32c17f?.today || 0;
      const _0x429f53 = new Date(_0x3490ce.getFullYear(), _0x3490ce.getMonth(), 1);
      const _0x1b7257 = new Date(_0x3490ce.getFullYear(), _0x3490ce.getMonth() + 1, 0, 23, 59, 59, 999);
      const _0x10ef85 = await this.databaseService.get("\n        SELECT COUNT(*) as thisMonth\n        FROM communication_preferences\n        WHERE opt_out_status = 'opted_out'\n        AND opt_out_date >= ?\n        AND opt_out_date <= ?\n      ", [_0x429f53.toISOString(), _0x1b7257.toISOString()]);
      const _0x573fd5 = _0x10ef85?.success ? _0x10ef85.data : _0x10ef85;
      const _0x11d9db = _0x573fd5?.thisMonth || 0;
      const _0x1e15ab = {
        ..._0x18f55c,
        optOutMethods: _0x55ba06,
        optOutRate: _0x18f55c && _0x18f55c.total_preferences > 0 ? (_0x18f55c.total_opted_out / _0x18f55c.total_preferences * 100).toFixed(2) : 0,
        recentActivity: _0x207c2a,
        today: _0x1080cb,
        thisWeek: _0x1bdacd,
        thisMonth: _0x11d9db
      };
      return _0x1e15ab;
    } catch (_0x3bcf9b) {
      this.logger.error("Error getting opt-out statistics:", _0x3bcf9b);
      return null;
    }
  }
  async logComplianceAction(_0xa0303, _0x2bac3c, _0x31b25f) {
    try {
      const _0x2b75bb = await this.databaseService.get("SELECT id FROM contacts WHERE phone_number = ?", [_0xa0303]);
      await this.databaseService.run("\n        INSERT INTO compliance_audit_log (\n          phone_number, contact_id, action_type, action_details, campaign_id, session_id\n        ) VALUES (?, ?, ?, ?, ?, ?)\n      ", [_0xa0303, _0x2b75bb?.id || null, _0x2bac3c, JSON.stringify(_0x31b25f), _0x31b25f.campaignId || null, _0x31b25f.sessionId || null]);
    } catch (_0xaa65ac) {
      this.logger.error("Error logging compliance action:", _0xaa65ac);
    }
  }
  async filterContactsForBulkMessaging(_0x39e073, _0x172b11 = "marketing") {
    try {
      const _0x3e8507 = [];
      const _0x42384a = [];
      for (const _0xc81a95 of _0x39e073) {
        try {
          const _0x1c4200 = await this.isOptedOut(_0xc81a95.phone_number, _0x172b11);
          if (_0x1c4200.isOptedOut) {
            _0x42384a.push({
              ..._0xc81a95,
              blockReason: _0x1c4200.reason,
              optOutDate: _0x1c4200.optOutDate
            });
          } else {
            _0x3e8507.push(_0xc81a95);
          }
        } catch (_0x18129f) {
          this.logger.warn("Error checking opt-out status for " + _0xc81a95.phone_number + ":", _0x18129f);
          _0x3e8507.push(_0xc81a95);
        }
      }
      this.logger.info("Filtered " + _0x39e073.length + " contacts: " + _0x3e8507.length + " allowed, " + _0x42384a.length + " blocked");
      return {
        allowedContacts: _0x3e8507,
        blockedContacts: _0x42384a
      };
    } catch (_0x8a4a9a) {
      this.logger.error("Error filtering contacts for bulk messaging:", _0x8a4a9a);
      return {
        allowedContacts: _0x39e073,
        blockedContacts: []
      };
    }
  }
  async getOptedOutContacts(_0x1deac8 = {}) {
    try {
      const {
        messageType: _0x191ee2,
        startDate: _0x137a83,
        endDate: _0x243ec8,
        method: _0x31c85c
      } = _0x1deac8;
      let _0x5bba4f = "WHERE cp.opt_out_status = \"opted_out\"";
      let _0x401533 = [];
      if (_0x191ee2 && _0x191ee2 !== "all") {
        _0x5bba4f += " AND cp." + _0x191ee2 + "_consent = 0";
      }
      if (_0x137a83 && _0x243ec8) {
        _0x5bba4f += " AND cp.opt_out_date BETWEEN ? AND ?";
        _0x401533.push(_0x137a83, _0x243ec8);
      }
      if (_0x31c85c) {
        _0x5bba4f += " AND cp.opt_out_method = ?";
        _0x401533.push(_0x31c85c);
      }
      const _0x5f13e4 = await this.databaseService.all("\n        SELECT\n          cp.phone_number,\n          cp.opt_out_date,\n          cp.opt_out_method,\n          cp.opt_out_reason,\n          c.name,\n          c.email,\n          c.company\n        FROM communication_preferences cp\n        LEFT JOIN contacts c ON cp.contact_id = c.id\n        " + _0x5bba4f + "\n        ORDER BY cp.opt_out_date DESC\n      ", _0x401533);
      let _0x184091 = [];
      if (_0x5f13e4) {
        if (Array.isArray(_0x5f13e4)) {
          _0x184091 = _0x5f13e4;
        } else if (_0x5f13e4.success && _0x5f13e4.data) {
          if (Array.isArray(_0x5f13e4.data)) {
            _0x184091 = _0x5f13e4.data;
          } else if (_0x5f13e4.data.rows && Array.isArray(_0x5f13e4.data.rows)) {
            _0x184091 = _0x5f13e4.data.rows;
          } else if (_0x5f13e4.data.results && Array.isArray(_0x5f13e4.data.results)) {
            _0x184091 = _0x5f13e4.data.results;
          }
        } else if (_0x5f13e4.data && Array.isArray(_0x5f13e4.data)) {
          _0x184091 = _0x5f13e4.data;
        }
      }
      return _0x184091;
    } catch (_0x12e26c) {
      this.logger.error("Error getting opted-out contacts:", _0x12e26c);
      return [];
    }
  }
  async bulkOptOut(_0x52bbfc, _0x3e0937 = {}) {
    try {
      const _0x463db8 = [];
      let _0x31e851 = 0;
      let _0x5c04b3 = 0;
      for (const _0x3d3788 of _0x52bbfc) {
        const _0xc1ac8e = await this.optOut(_0x3d3788, _0x3e0937);
        _0x463db8.push({
          phoneNumber: _0x3d3788,
          ..._0xc1ac8e
        });
        if (_0xc1ac8e.success) {
          _0x31e851++;
        } else {
          _0x5c04b3++;
        }
      }
      this.logger.info("Bulk opt-out completed: " + _0x31e851 + " success, " + _0x5c04b3 + " failed");
      return {
        success: _0x31e851,
        failed: _0x5c04b3,
        results: _0x463db8
      };
    } catch (_0x40fb46) {
      this.logger.error("Error in bulk opt-out:", _0x40fb46);
      return {
        success: 0,
        failed: _0x52bbfc.length,
        results: _0x52bbfc.map(_0x10434d => ({
          phoneNumber: _0x10434d,
          success: false,
          message: _0x40fb46.message
        }))
      };
    }
  }
  async checkComplianceBeforeSending(_0x13cd6e, _0x41ea9c, _0x4a15ff = null) {
    try {
      const _0x101093 = await this.isOptedOut(_0x13cd6e, _0x41ea9c);
      if (_0x101093.isOptedOut) {
        await this.logComplianceAction(_0x13cd6e, "message_blocked", {
          messageType: _0x41ea9c,
          campaignId: _0x4a15ff,
          reason: _0x101093.reason,
          complianceStatus: "violation_prevented"
        });
        return {
          canSend: false,
          reason: _0x101093.reason,
          complianceStatus: "blocked"
        };
      }
      await this.logComplianceAction(_0x13cd6e, "message_sent", {
        messageType: _0x41ea9c,
        campaignId: _0x4a15ff,
        complianceStatus: "compliant"
      });
      return {
        canSend: true,
        complianceStatus: "compliant"
      };
    } catch (_0x13e4f9) {
      this.logger.error("Error checking compliance:", _0x13e4f9);
      return {
        canSend: false,
        reason: "Compliance check failed",
        complianceStatus: "error"
      };
    }
  }
  async getComplianceReport(_0x5b3b3b = {}) {
    try {
      const {
        startDate: _0x156466,
        endDate: _0x27eb80,
        campaignId: _0x31249c
      } = _0x5b3b3b;
      let _0x4b6cb7 = "";
      let _0x3d45a5 = [];
      if (_0x156466 && _0x27eb80) {
        _0x4b6cb7 = "WHERE created_at BETWEEN ? AND ?";
        _0x3d45a5.push(_0x156466, _0x27eb80);
      }
      if (_0x31249c) {
        _0x4b6cb7 += _0x4b6cb7 ? " AND" : "WHERE";
        _0x4b6cb7 += " campaign_id = ?";
        _0x3d45a5.push(_0x31249c);
      }
      const _0x4064ee = await this.databaseService.get("\n        SELECT\n          COUNT(*) as total_actions,\n          SUM(CASE WHEN action_type = 'message_sent' THEN 1 ELSE 0 END) as messages_sent,\n          SUM(CASE WHEN action_type = 'message_blocked' THEN 1 ELSE 0 END) as messages_blocked,\n          SUM(CASE WHEN action_type = 'opt_out' THEN 1 ELSE 0 END) as opt_outs,\n          SUM(CASE WHEN action_type = 'opt_in' THEN 1 ELSE 0 END) as opt_ins,\n          SUM(CASE WHEN compliance_status = 'violation' THEN 1 ELSE 0 END) as violations\n        FROM compliance_audit_log\n        " + _0x4b6cb7 + "\n      ", _0x3d45a5);
      const _0x5d81dc = await this.databaseService.all("\n        SELECT action_type, compliance_status, COUNT(*) as count\n        FROM compliance_audit_log\n        " + _0x4b6cb7 + "\n        GROUP BY action_type, compliance_status\n      ", _0x3d45a5);
      return {
        ..._0x4064ee,
        actionsByType: _0x5d81dc,
        complianceRate: _0x4064ee.total_actions > 0 ? ((_0x4064ee.total_actions - _0x4064ee.violations) / _0x4064ee.total_actions * 100).toFixed(2) : 100
      };
    } catch (_0xd6e82c) {
      this.logger.error("Error generating compliance report:", _0xd6e82c);
      return null;
    }
  }
  async updateAutoResponseMessages(_0x5443f8) {
    try {
      await this.databaseService.run("\n        CREATE TABLE IF NOT EXISTS opt_out_settings (\n          id INTEGER PRIMARY KEY,\n          subscribe_message TEXT,\n          unsubscribe_message TEXT,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        )\n      ");
      const _0x3543e6 = await this.databaseService.run("\n        INSERT OR REPLACE INTO opt_out_settings (id, subscribe_message, unsubscribe_message, updated_at)\n        VALUES (1, ?, ?, CURRENT_TIMESTAMP)\n      ", [_0x5443f8.subscribe, _0x5443f8.unsubscribe]);
      await this.databaseService.saveDatabase();
      return {
        success: true,
        message: "Auto-response messages updated successfully"
      };
    } catch (_0x1a0ebc) {
      console.error("❌ Error updating auto-response messages:", _0x1a0ebc);
      return {
        success: false,
        error: _0x1a0ebc.message
      };
    }
  }
  normalizePhoneNumber(_0x270a00) {
    let _0x4377b4 = String(_0x270a00).split("@")[0].split(":")[0];
    return _0x4377b4.replace(/[^\d]/g, "");
  }
  async getStatistics() {
    try {
      const _0x144add = await this.databaseService.get("\n        SELECT \n          COUNT(*) as total_contacts,\n          SUM(CASE WHEN opt_out_status = 'opted_out' THEN 1 ELSE 0 END) as opted_out_count,\n          SUM(CASE WHEN opt_out_status = 'opted_in' THEN 1 ELSE 0 END) as opted_in_count,\n          SUM(CASE WHEN marketing_consent = 0 THEN 1 ELSE 0 END) as marketing_opt_out,\n          SUM(CASE WHEN promotional_consent = 0 THEN 1 ELSE 0 END) as promotional_opt_out,\n          SUM(CASE WHEN transactional_consent = 0 THEN 1 ELSE 0 END) as transactional_opt_out,\n          SUM(CASE WHEN reminder_consent = 0 THEN 1 ELSE 0 END) as reminder_opt_out\n        FROM communication_preferences\n      ");
      if (_0x144add.success && _0x144add.data) {
        return {
          success: true,
          stats: _0x144add.data
        };
      } else {
        return {
          success: true,
          stats: {
            total_contacts: 0,
            opted_out_count: 0,
            opted_in_count: 0,
            marketing_opt_out: 0,
            promotional_opt_out: 0,
            transactional_opt_out: 0,
            reminder_opt_out: 0
          }
        };
      }
    } catch (_0x2333dd) {
      this.logger.error("Error getting opt-out statistics:", _0x2333dd);
      return {
        success: false,
        error: _0x2333dd.message
      };
    }
  }
  async getAutoResponseMessages() {
    try {
      const _0x30590c = await this.databaseService.get("\n        SELECT subscribe_message, unsubscribe_message\n        FROM opt_out_settings\n        WHERE id = 1\n      ");
      if (_0x30590c && _0x30590c.subscribe_message && _0x30590c.unsubscribe_message) {
        return {
          success: true,
          messages: {
            subscribe: _0x30590c.subscribe_message,
            unsubscribe: _0x30590c.unsubscribe_message
          }
        };
      } else {
        return {
          success: true,
          messages: {
            subscribe: "You have been subscribed to our messages. Reply UNSUBSCRIBE to unsubscribe.",
            unsubscribe: "You have been unsubscribed from our messages. Reply SUBSCRIBE to opt back in."
          }
        };
      }
    } catch (_0x457da3) {
      console.error("❌ Error getting auto-response messages:", _0x457da3);
      this.logger.error("Error getting auto-response messages:", _0x457da3);
      return {
        success: false,
        error: _0x457da3.message
      };
    }
  }
}
module.exports = OptOutService;