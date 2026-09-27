const SpintaxService = require("./spintax.service");
class BulkMessageFeaturesService {
  constructor(_0x444e5e = null, _0x482d11 = null) {
    this.databaseService = _0x444e5e;
    this.whatsappService = _0x482d11;
    this.spintaxService = new SpintaxService(_0x444e5e);
    this.campaignSleepState = new Map();
  }
  async getSettings() {
    try {
      const _0x16f1ac = await this.databaseService.query("SELECT * FROM bulk_message_settings ORDER BY id DESC LIMIT 1");
      if (_0x16f1ac.success && _0x16f1ac.data.length > 0) {
        const _0x1458f4 = _0x16f1ac.data[0];
        _0x1458f4.family_numbers = JSON.parse(_0x1458f4.family_numbers || "[]");
        return _0x1458f4;
      }
      return {
        spintax_enabled: true,
        random_enabled: true,
        random_prefix: "REF",
        family_numbers_enabled: true,
        family_numbers: [],
        family_message_interval: 50,
        hook_number_enabled: true,
        hook_number: "",
        sleep_timing_enabled: true,
        sleep_after_messages: 50,
        sleep_duration_seconds: 30,
        delivery_delay_min: 3,
        delivery_delay_max: 9,
        allow_unverified_contacts: false
      };
    } catch (_0x568393) {
      console.error("Error getting bulk message settings:", _0x568393);
      return null;
    }
  }
  async updateSettings(_0x307161) {
    try {
      if (Array.isArray(_0x307161.family_numbers)) {
        _0x307161.family_numbers = JSON.stringify(_0x307161.family_numbers);
      }
      const _0xcb51db = await this.databaseService.query("UPDATE bulk_message_settings SET\n         spintax_enabled = ?, random_enabled = ?, random_prefix = ?,\n         family_numbers_enabled = ?, family_numbers = ?, family_message_interval = ?,\n         hook_number_enabled = ?, hook_number = ?, sleep_timing_enabled = ?,\n         sleep_after_messages = ?, sleep_duration_seconds = ?,\n         delivery_delay_min = ?, delivery_delay_max = ?, updated_at = CURRENT_TIMESTAMP\n         WHERE id = (SELECT id FROM bulk_message_settings ORDER BY id DESC LIMIT 1)", [_0x307161.spintax_enabled ? 1 : 0, _0x307161.random_enabled ? 1 : 0, _0x307161.random_prefix || "LW", _0x307161.family_numbers_enabled ? 1 : 0, _0x307161.family_numbers, _0x307161.family_message_interval || 50, _0x307161.hook_number_enabled ? 1 : 0, _0x307161.hook_number || "", _0x307161.sleep_timing_enabled ? 1 : 0, _0x307161.sleep_after_messages || 50, _0x307161.sleep_duration_seconds || 30, _0x307161.delivery_delay_min || 3, _0x307161.delivery_delay_max || 9]);
      return _0xcb51db;
    } catch (_0x5adead) {
      console.error("Error updating bulk message settings:", _0x5adead);
      return {
        success: false,
        error: _0x5adead.message
      };
    }
  }
  async processMessageContent(_0x13ae5b, _0x10c9be) {
    try {
      const _0x197299 = await this.getSettings();
      if (!_0x197299) {
        return _0x10c9be;
      }
      let _0x2af601 = _0x10c9be;
      if (_0x197299.spintax_enabled) {
        _0x2af601 = await this.spintaxService.processMessageContent(_0x13ae5b, _0x2af601);
      }
      if (_0x197299.random_enabled) {
        _0x2af601 = this.processRandomNumbers(_0x2af601, _0x197299.random_prefix);
      }
      return _0x2af601;
    } catch (_0x3ab066) {
      console.error("Error processing message content:", _0x3ab066);
      return _0x10c9be;
    }
  }
  processRandomNumbers(_0x597e9d, _0x1f1b1c = "REF") {
    if (!_0x597e9d || typeof _0x597e9d !== "string") {
      return _0x597e9d;
    }
    const _0xc7d11f = /(\{\{random\}\}|\[random\])/gi;
    return _0x597e9d.replace(_0xc7d11f, () => {
      const _0x71827c = Math.floor(Math.random() * 900000) + 100000;
      return "" + _0x1f1b1c + _0x71827c;
    });
  }
  async shouldSendToFamilyNumbers(_0x490d8a, _0xb076e4) {
    try {
      const _0x4766a9 = await this.getSettings();
      if (!_0x4766a9 || !_0x4766a9.family_numbers_enabled || _0x4766a9.family_numbers.length === 0) {
        return false;
      }
      if (!this.databaseService) {
        const _0x36faa9 = _0xb076e4 > 0 && _0xb076e4 % _0x4766a9.family_message_interval === 0;
        return _0x36faa9;
      }
      const _0x38b09c = await this.databaseService.query("SELECT last_family_send_count FROM campaign_message_counts WHERE campaign_id = ?", [_0x490d8a]);
      let _0x535e50 = 0;
      if (_0x38b09c.success && _0x38b09c.data.length > 0) {
        _0x535e50 = _0x38b09c.data[0].last_family_send_count || 0;
      }
      const _0xa361ad = _0xb076e4 - _0x535e50;
      const _0x5b067f = _0xa361ad >= _0x4766a9.family_message_interval;
      if (_0x5b067f && _0x535e50 === _0xb076e4) {
        return false;
      }
      return _0x5b067f;
    } catch (_0x22f3e8) {
      console.error("❌ [Family Check] Error checking family numbers:", _0x22f3e8);
      return false;
    }
  }
  async sendToFamilyNumbers(_0x4bb43b, _0x245a90, _0x18fb6d = "text", _0x3a92ae = null) {
    try {
      const _0x18be12 = await this.getSettings();
      if (!_0x18be12 || !_0x18be12.family_numbers_enabled || _0x18be12.family_numbers.length === 0) {
        return {
          success: true,
          sent: 0
        };
      }
      let _0x59434c = 0;
      const _0x76de08 = [];
      for (const _0xefef89 of _0x18be12.family_numbers) {
        try {
          let _0x45fb84 = _0xefef89.replace(/[^\d]/g, "");
          if (_0x45fb84.length < 10) {
            continue;
          }
          const _0x44204e = _0x45fb84 + "@s.whatsapp.net";
          let _0x5f30ca;
          if (_0x18fb6d === "text") {
            _0x5f30ca = {
              text: _0x245a90
            };
          } else {
            _0x5f30ca = _0x245a90;
          }
          const _0x4900b6 = await this.whatsappService.sendMessage(_0x4bb43b, _0x44204e, _0x5f30ca, _0x18fb6d);
          if (_0x4900b6.success) {
            _0x59434c++;
          } else {
            console.error("❌ [Family Send] Failed to send to " + _0xefef89 + ":", _0x4900b6.error);
          }
          _0x76de08.push({
            number: _0xefef89,
            result: _0x4900b6
          });
          await new Promise(_0x12c6a6 => setTimeout(_0x12c6a6, 1000));
        } catch (_0x53c345) {
          console.error("❌ [Family Send] Error sending to family number " + _0xefef89 + ":", _0x53c345);
          _0x76de08.push({
            number: _0xefef89,
            error: _0x53c345.message
          });
        }
      }
      if (_0x3a92ae && this.databaseService && _0x59434c > 0) {
        try {
          const _0x23f52b = await this.getMessageCount(_0x3a92ae);
          const _0x39462b = await this.databaseService.query("\n            UPDATE campaign_message_counts\n            SET last_family_send_count = ?, updated_at = CURRENT_TIMESTAMP\n            WHERE campaign_id = ?\n          ", [_0x23f52b, _0x3a92ae]);
        } catch (_0x119e37) {
          console.error("Error updating last family send count:", _0x119e37);
        }
      }
      return {
        success: true,
        sent: _0x59434c,
        results: _0x76de08
      };
    } catch (_0x587d7e) {
      console.error("Error sending to family numbers:", _0x587d7e);
      return {
        success: false,
        error: _0x587d7e.message
      };
    }
  }
  async shouldCampaignSleep(_0x10da2c) {
    try {
      const _0x12d010 = await this.getSettings();
      if (!_0x12d010 || !_0x12d010.sleep_timing_enabled) {
        return false;
      }
      const _0x57760f = await this.getMessageCount(_0x10da2c);
      const _0xe2d33b = _0x57760f > 0 && _0x57760f % _0x12d010.sleep_after_messages === 0;
      return _0xe2d33b;
    } catch (_0x10a983) {
      console.error("Error checking campaign sleep:", _0x10a983);
      return false;
    }
  }
  async sleepCampaign(_0x5114ea) {
    try {
      const _0x461ebc = await this.getSettings();
      if (!_0x461ebc || !_0x461ebc.sleep_timing_enabled) {
        return;
      }
      const _0x282aba = _0x461ebc.sleep_duration_seconds * 1000;
      const _0x29551d = new Date().toLocaleTimeString();
      this.campaignSleepState.set(_0x5114ea, true);
      const _0x246938 = Date.now();
      await new Promise(_0x55d59c => setTimeout(_0x55d59c, _0x282aba));
      const _0x4a8af4 = Date.now();
      const _0x54e39b = _0x4a8af4 - _0x246938;
      this.campaignSleepState.delete(_0x5114ea);
      const _0x5e30d4 = new Date().toLocaleTimeString();
    } catch (_0x1333e0) {
      console.error("Error sleeping campaign:", _0x1333e0);
      this.campaignSleepState.delete(_0x5114ea);
    }
  }
  async incrementMessageCount(_0x151d33) {
    try {
      if (!this.databaseService) {
        return 1;
      }
      const _0x2d51db = await this.databaseService.query("SELECT message_count FROM campaign_message_counts WHERE campaign_id = ?", [_0x151d33]);
      if (_0x2d51db.success && _0x2d51db.data.length > 0) {
        await this.databaseService.query("\n          UPDATE campaign_message_counts\n          SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP\n          WHERE campaign_id = ?\n        ", [_0x151d33]);
      } else {
        await this.databaseService.query("\n          INSERT INTO campaign_message_counts (campaign_id, message_count, updated_at)\n          VALUES (?, 1, CURRENT_TIMESTAMP)\n        ", [_0x151d33]);
      }
      const _0x2b39f8 = await this.databaseService.query("SELECT message_count FROM campaign_message_counts WHERE campaign_id = ?", [_0x151d33]);
      if (_0x2b39f8.success && _0x2b39f8.data.length > 0) {
        const _0x227e2c = _0x2b39f8.data[0].message_count;
        return _0x227e2c;
      }
      return 1;
    } catch (_0x2e9823) {
      console.error("Error incrementing message count:", _0x2e9823);
      return 1;
    }
  }
  async getMessageCount(_0x70901c) {
    try {
      if (!this.databaseService) {
        return 0;
      }
      const _0x3a256f = await this.databaseService.query("SELECT message_count FROM campaign_message_counts WHERE campaign_id = ?", [_0x70901c]);
      if (_0x3a256f.success && _0x3a256f.data.length > 0) {
        return _0x3a256f.data[0].message_count;
      }
      return 0;
    } catch (_0x15d2ed) {
      console.error("Error getting message count:", _0x15d2ed);
      return 0;
    }
  }
  async resetMessageCount(_0x7a0513) {
    try {
      if (!this.databaseService) {
        return;
      }
      await this.databaseService.query("DELETE FROM campaign_message_counts WHERE campaign_id = ?", [_0x7a0513]);
      this.campaignSleepState.delete(_0x7a0513);
    } catch (_0x81248f) {
      console.error("Error resetting message count:", _0x81248f);
    }
  }
  async shouldForwardToHook(_0x160b0f, _0x32a378) {
    try {
      console.log("🔍🔍🔍 [HOOK] Checking if should forward to hook for:", _0x160b0f);
      const _0xd1bd08 = await this.getSettings();
      console.log("🔍🔍🔍 [HOOK] Settings:", {
        hook_number_enabled: _0xd1bd08?.hook_number_enabled,
        hook_number: _0xd1bd08?.hook_number
      });
      if (!_0xd1bd08 || !_0xd1bd08.hook_number_enabled || !_0xd1bd08.hook_number) {
        console.log("🔍🔍🔍 [HOOK] Hook forwarding disabled or not configured");
        return false;
      }
      const _0x2f632e = _0x160b0f.replace(/@s\.whatsapp\.net|@lid/g, "");
      console.log("🔍🔍🔍 [HOOK] Extracted phone number:", _0x2f632e);
      if (this.databaseService) {
        const _0x35af21 = _0x2f632e.replace(/^\+/, "");
        const _0x385323 = "+" + _0x35af21;
        const _0x43c752 = [...new Set([_0x2f632e, _0x35af21, _0x385323])];
        console.log("🔍🔍🔍 [HOOK] Checking phone variants:", _0x43c752);
        for (const _0x5440b4 of _0x43c752) {
          const _0x1943b0 = await this.databaseService.query("\n            SELECT COUNT(*) as count\n            FROM message_history\n            WHERE contact_phone = ?\n              AND direction = 'outgoing'\n              AND campaign_id IS NOT NULL\n              AND timestamp > datetime('now', '-7 days')\n          ", [_0x5440b4]);
          console.log("🔍🔍🔍 [HOOK] Variant " + _0x5440b4 + " - count:", _0x1943b0.data?.[0]?.count);
          if (_0x1943b0.success && _0x1943b0.data && _0x1943b0.data[0] && _0x1943b0.data[0].count > 0) {
            console.log("✅✅✅ [HOOK] Found campaign message for this sender - should forward!");
            return true;
          }
        }
      }
      console.log("❌❌❌ [HOOK] No campaign message found for this sender - will not forward");
      return false;
    } catch (_0x5041e9) {
      console.error("❌❌❌ [HOOK] Error checking if should forward to hook:", _0x5041e9);
      return false;
    }
  }
  async forwardReplyToHook(_0x34a95a, _0x5a5038, _0x327a28) {
    try {
      console.log("📨📨📨 [HOOK] forwardReplyToHook called");
      console.log("📨📨📨 [HOOK] Original message from:", _0x34a95a.from);
      console.log("📨📨📨 [HOOK] Reply message:", _0x5a5038.text?.substring(0, 100));
      const _0x2506ea = await this.getSettings();
      if (!_0x2506ea || !_0x2506ea.hook_number_enabled || !_0x2506ea.hook_number) {
        console.log("📨📨📨 [HOOK] Hook forwarding disabled or not configured");
        return {
          success: true,
          forwarded: false
        };
      }
      console.log("📨📨📨 [HOOK] Hook number from settings:", _0x2506ea.hook_number);
      let _0x36b6ad = _0x2506ea.hook_number;
      if (!_0x36b6ad.includes("@")) {
        const _0x2b342a = _0x36b6ad.replace(/[^\d]/g, "");
        _0x36b6ad = _0x2b342a + "@s.whatsapp.net";
      }
      console.log("📨📨📨 [HOOK] Formatted hook JID:", _0x36b6ad);
      const _0x58a67a = new Date().toLocaleString();
      const _0x40fb75 = _0x34a95a.from.replace(/@s\.whatsapp\.net|@lid/g, "");
      let _0x1489c9 = "📨 *Customer Reply Received*\n\n";
      _0x1489c9 += "👤 *From:* " + _0x40fb75 + "\n";
      _0x1489c9 += "⏰ *Time:* " + _0x58a67a + "\n";
      _0x1489c9 += "💬 *Message Type:* " + (_0x5a5038.messageType || "text") + "\n\n";
      _0x1489c9 += "*Customer Message:*\n\"" + _0x5a5038.text + "\"\n\n";
      _0x1489c9 += "---\n";
      _0x1489c9 += "*Note:* This customer received a campaign message and has replied.";
      console.log("📨📨📨 [HOOK] Sending forward message to hook number...");
      const _0x4290ef = await this.whatsappService.sendMessage(_0x327a28, _0x36b6ad, {
        text: _0x1489c9
      }, "text");
      if (_0x4290ef.success) {
        console.log("✅✅✅ [HOOK] Successfully forwarded reply to hook number!");
      } else {
        console.error("❌❌❌ [HOOK] Failed to forward reply to hook number:", _0x4290ef.error);
      }
      return {
        success: true,
        forwarded: _0x4290ef.success,
        result: _0x4290ef
      };
    } catch (_0xa474de) {
      console.error("❌❌❌ [HOOK] Error forwarding reply to hook:", _0xa474de);
      return {
        success: false,
        error: _0xa474de.message
      };
    }
  }
  async testHookNumber(_0x266ca0, _0x10c46d = null) {
    try {
      const _0x368397 = await this.getSettings();
      if (!_0x368397 || !_0x368397.hook_number_enabled || !_0x368397.hook_number) {
        return {
          success: false,
          error: "Hook number not enabled or configured",
          settings: _0x368397
        };
      }
      const _0x124776 = _0x10c46d || "919876543210";
      const _0xcad30 = await this.shouldForwardToHook(_0x124776 + "@s.whatsapp.net", _0x266ca0);
      const _0x40160c = {
        from: _0x124776 + "@s.whatsapp.net",
        text: "Test campaign message",
        timestamp: new Date()
      };
      const _0x128372 = {
        text: "This is a test reply to verify hook number functionality.",
        messageType: "text"
      };
      const _0x3ec5e8 = await this.forwardReplyToHook(_0x40160c, _0x128372, _0x266ca0);
      return {
        success: true,
        shouldForward: _0xcad30,
        forwardResult: _0x3ec5e8,
        settings: {
          enabled: _0x368397.hook_number_enabled,
          hookNumber: _0x368397.hook_number
        }
      };
    } catch (_0x1fc25a) {
      console.error("Error testing hook number:", _0x1fc25a);
      return {
        success: false,
        error: _0x1fc25a.message
      };
    }
  }
  isCampaignSleeping(_0x20579e) {
    return this.campaignSleepState.has(_0x20579e);
  }
  async getCampaignStats(_0x1fc1ba) {
    try {
      const _0xc78d31 = await this.spintaxService.getSpintaxStats(_0x1fc1ba);
      const _0x5da136 = await this.getMessageCount(_0x1fc1ba);
      const _0x214811 = this.campaignSleepState.has(_0x1fc1ba);
      const _0x96e2d2 = await this.getSettings();
      return {
        messageCount: _0x5da136,
        isSleeping: _0x214811,
        sleepSettings: {
          enabled: _0x96e2d2?.sleep_timing_enabled || false,
          sleepAfter: _0x96e2d2?.sleep_after_messages || 50,
          sleepDuration: _0x96e2d2?.sleep_duration_seconds || 30
        },
        spintax: _0xc78d31
      };
    } catch (_0xabad79) {
      console.error("Error getting campaign stats:", _0xabad79);
      return {
        messageCount: 0,
        isSleeping: false,
        sleepSettings: {
          enabled: false,
          sleepAfter: 50,
          sleepDuration: 30
        },
        spintax: null
      };
    }
  }
}
module.exports = BulkMessageFeaturesService;