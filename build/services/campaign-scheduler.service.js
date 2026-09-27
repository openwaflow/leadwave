const {
  EventEmitter
} = require("events");
const BulkMessageFeaturesService = require("./bulk-message-features.service");
const OptOutService = require("./opt-out.service");
class CampaignSchedulerService extends EventEmitter {
  constructor() {
    super();
    this.schedulerInterval = null;
    this.isRunning = false;
    this.checkInterval = 30000;
    this.activeProcesses = new Map();
    this.databaseService = null;
    this.whatsappService = null;
    this.messageProcessor = null;
    this.bulkMessageFeatures = null;
    this.optOutService = null;
    this.debugMode = false;
    this.logger = {
      info: (..._0x1f8f92) => console.log(..._0x1f8f92),
      warn: (..._0x1d5607) => console.warn(..._0x1d5607),
      error: (..._0x439e23) => console.error(..._0x439e23)
    };
  }
  debugLog(..._0x19f3e7) {
    if (this.debugMode) {}
  }
  async initialize(_0x7d51ff, _0x90d42e, _0x486b20) {
    try {
      this.databaseService = _0x7d51ff;
      this.whatsappService = _0x90d42e;
      this.messageProcessor = _0x486b20;
      this.bulkMessageFeatures = new BulkMessageFeaturesService(_0x7d51ff, _0x90d42e);
      this.optOutService = new OptOutService(_0x7d51ff);
      return {
        success: true
      };
    } catch (_0x4fbfac) {
      console.error("❌ Failed to initialize Campaign Scheduler Service:", _0x4fbfac);
      throw _0x4fbfac;
    }
  }
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledCampaigns();
    }, this.checkInterval);
    this.checkScheduledCampaigns();
    this.emit("scheduler-started");
  }
  stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.emit("scheduler-stopped");
  }
  async triggerCheck() {
    await this.checkScheduledCampaigns();
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      activeProcesses: this.activeProcesses.size,
      activeProcessIds: Array.from(this.activeProcesses.keys())
    };
  }
  async stopAllCampaigns() {
    try {
      const _0x44ae4a = await this.databaseService.query("SELECT id, name FROM bulk_campaigns WHERE status = ?", ["running"]);
      if (_0x44ae4a.success && _0x44ae4a.data.length > 0) {
        for (const _0x3770b4 of _0x44ae4a.data) {
          await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?", ["stopped", _0x3770b4.id]);
        }
      }
      this.activeProcesses.clear();
      return {
        success: true,
        stoppedCount: _0x44ae4a.data?.length || 0
      };
    } catch (_0x47b39f) {
      console.error("❌ Error stopping campaigns:", _0x47b39f);
      return {
        success: false,
        error: _0x47b39f.message
      };
    }
  }
  async checkScheduledCampaigns() {
    if (!this.databaseService || !this.isRunning) {
      this.debugLog("⚠️ Scheduler check skipped - database not available or scheduler not running");
      return;
    }
    try {
      const _0x13833f = new Date().toISOString();
      this.debugLog("🔍 Checking for scheduled campaigns at " + _0x13833f);
      const _0x1948f0 = await this.databaseService.query("\n        SELECT id, name, status, scheduled_at FROM bulk_campaigns\n        WHERE status = 'scheduled'\n        AND scheduled_at IS NOT NULL\n        ORDER BY scheduled_at ASC\n      ");
      this.debugLog("📊 All scheduled campaigns:", _0x1948f0);
      const _0x4b06f6 = await this.databaseService.query("\n        SELECT * FROM bulk_campaigns\n        WHERE status = 'scheduled'\n        AND scheduled_at <= ?\n        AND scheduled_at IS NOT NULL\n        ORDER BY scheduled_at ASC\n      ", [_0x13833f]);
      this.debugLog("📊 Scheduler query result:", _0x4b06f6);
      if (_0x4b06f6.success) {
        if (_0x4b06f6.data.length > 0) {
          this.debugLog("📅 Found " + _0x4b06f6.data.length + " campaigns ready to start");
          for (const _0x5afc39 of _0x4b06f6.data) {
            this.debugLog("🚀 Processing campaign: " + _0x5afc39.name + " (ID: " + _0x5afc39.id + ") scheduled for " + _0x5afc39.scheduled_at);
            await this.startScheduledCampaign(_0x5afc39);
          }
        } else {
          this.debugLog("📅 No campaigns ready to start at this time");
        }
      } else {
        console.error("❌ Database query failed:", _0x4b06f6.error);
      }
      const _0x4d0a67 = await this.databaseService.query("SELECT * FROM bulk_campaigns WHERE status = 'running' ORDER BY started_at ASC");
      if (_0x4d0a67.success && _0x4d0a67.data.length > 0) {
        for (const _0x5f0560 of _0x4d0a67.data) {
          if (!this.activeProcesses.has(_0x5f0560.id)) {
            console.log("🔄 Resuming orphaned running campaign: \"" + _0x5f0560.name + "\" (ID: " + _0x5f0560.id + ")");
            this.processCampaign(_0x5f0560.id);
          }
        }
      }
    } catch (_0x52a830) {
      console.error("❌ Error checking scheduled campaigns:", _0x52a830);
    }
  }
  async startScheduledCampaign(_0x4a284d) {
    try {
      const _0xdf2425 = await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?", ["running", _0x4a284d.id]);
      if (!_0xdf2425.success) {
        console.error("❌ Failed to update campaign status for ID " + _0x4a284d.id + ":", _0xdf2425.error);
        return;
      }
      this.processCampaign(_0x4a284d.id);
      this.emit("campaign-started", {
        campaignId: _0x4a284d.id,
        campaignName: _0x4a284d.name
      });
    } catch (_0xfc47f7) {
      console.error("❌ Error starting scheduled campaign " + _0x4a284d.id + ":", _0xfc47f7);
      await this.databaseService.query("UPDATE bulk_campaigns SET status = ? WHERE id = ?", ["failed", _0x4a284d.id]);
    }
  }
  async processCampaign(_0x424bff) {
    this.debugLog("🚀 *** VARIABLE FIX VERSION *** Processing campaign " + _0x424bff);
    if (this.activeProcesses.has(_0x424bff)) {
      return;
    }
    const _0x309532 = await this.databaseService.query("SELECT status FROM bulk_campaigns WHERE id = ?", [_0x424bff]);
    if (!_0x309532.success || _0x309532.data.length === 0) {
      return;
    }
    const _0x294c29 = _0x309532.data[0].status;
    if (_0x294c29 !== "running" && _0x294c29 !== "pending" && _0x294c29 !== "paused") {
      return;
    }
    if (_0x294c29 === "paused") {
      await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["running", _0x424bff]);
    }
    this.activeProcesses.set(_0x424bff, true);
    this.debugLog("📊 Active campaigns: " + this.activeProcesses.size);
    this.debugLog("📊 Active campaign IDs: " + Array.from(this.activeProcesses.keys()).join(", "));
    try {
      this.debugLog("📤 Processing campaign messages for ID: " + _0x424bff);
      if (this.bulkMessageFeatures) {
        await this.bulkMessageFeatures.resetMessageCount(_0x424bff);
      }
      const _0x51d036 = await this.databaseService.query("SELECT * FROM bulk_campaigns WHERE id = ?", [_0x424bff]);
      if (!_0x51d036.success || _0x51d036.data.length === 0) {
        console.error("❌ Campaign not found: " + _0x424bff);
        return;
      }
      const _0x3885d8 = _0x51d036.data[0];
      const _0x1334b1 = JSON.parse(_0x3885d8.session_ids || "[]");
      const _0xc8f409 = JSON.parse(_0x3885d8.proxy_ids || "[]");
      this.debugLog("🔍 CAMPAIGN DEBUG: Campaign " + _0x424bff + " details:");
      this.debugLog("🔍 CAMPAIGN DEBUG: - Name: " + _0x3885d8.name);
      this.debugLog("🔍 CAMPAIGN DEBUG: - Status: " + _0x3885d8.status);
      this.debugLog("🔍 CAMPAIGN DEBUG: - Device rotation: " + _0x3885d8.device_rotation);
      this.debugLog("🔍 CAMPAIGN DEBUG: - Session IDs: " + JSON.stringify(_0x1334b1));
      this.debugLog("🔍 CAMPAIGN DEBUG: - Session count: " + _0x1334b1.length);
      this.debugLog("🔍 CAMPAIGN DEBUG: - Proxy IDs: " + JSON.stringify(_0xc8f409));
      this.debugLog("🔍 CAMPAIGN DEBUG: - Proxy count: " + _0xc8f409.length);
      if (_0x1334b1.length === 0) {
        console.error("❌ No sessions configured for campaign " + _0x424bff);
        await this.databaseService.query("UPDATE bulk_campaigns SET status = ? WHERE id = ?", ["failed", _0x424bff]);
        return;
      }
      const _0xbb89e8 = await this.databaseService.query("\n        SELECT bcr.*,\n               COALESCE(c.phone_number, bcr.contact_id) as phone_number,\n               COALESCE(c.name, bcr.contact_id) as name,\n               c.email, c.company, c.position,\n               c.var1, c.var2, c.var3, c.var4, c.var5,\n               c.var6, c.var7, c.var8, c.var9, c.var10\n        FROM bulk_campaign_recipients bcr\n        LEFT JOIN contacts c ON bcr.contact_id = c.id\n        WHERE bcr.campaign_id = ? AND bcr.status = ?\n        ORDER BY bcr.id ASC\n      ", [_0x424bff, "pending"]);
      if (!_0xbb89e8.success || _0xbb89e8.data.length === 0) {
        const _0x321b51 = await this.databaseService.query("\n          SELECT\n            COUNT(CASE WHEN status IN ('sent', 'delivered') THEN 1 END) as sent_count,\n            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count\n          FROM bulk_campaign_recipients\n          WHERE campaign_id = ?\n        ", [_0x424bff]);
        let _0xbf9a3c = 0;
        let _0x868626 = 0;
        if (_0x321b51.success && _0x321b51.data.length > 0) {
          _0xbf9a3c = _0x321b51.data[0].sent_count || 0;
          _0x868626 = _0x321b51.data[0].failed_count || 0;
        }
        await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP, sent_count = ?, failed_count = ? WHERE id = ?", ["completed", _0x424bff, _0xbf9a3c, _0x868626]);
        return;
      }
      const _0x4e5ceb = _0xbb89e8.data;
      this.debugLog("📧 Found " + _0x4e5ceb.length + " pending recipients for campaign " + _0x424bff);
      if (_0x4e5ceb.length > 0) {
        this.debugLog("🔍 SCHEDULER - First recipient data:", {
          id: _0x4e5ceb[0].id,
          name: _0x4e5ceb[0].name,
          phone: _0x4e5ceb[0].phone_number,
          var1: _0x4e5ceb[0].var1,
          var2: _0x4e5ceb[0].var2,
          var3: _0x4e5ceb[0].var3
        });
      }
      let _0x57021f = 0;
      const _0x29c30b = new Set();
      const _0x157ea5 = new Map();
      const _0x21d7dc = 8;
      const _0x1e2eb4 = new Map();
      let _0x5e6dfd = 0;
      const _0x2847c1 = 6;
      const _0x58cc22 = 90000;
      const _0x3bbb6b = new Map();
      const _0x3c8062 = 10;
      let _0x197827 = 0;
      let _0x8943a5 = [];
      if (_0xc8f409.length > 0) {
        const _0x5c0e3c = await this.databaseService.query("SELECT * FROM proxies WHERE id IN (" + _0xc8f409.map(() => "?").join(",") + ") AND is_active = 1", _0xc8f409);
        if (_0x5c0e3c.success && _0x5c0e3c.data.length > 0) {
          _0x8943a5 = _0x5c0e3c.data;
        } else {}
      }
      this.debugLog("🔧 SESSION ROTATION DEBUG: Starting campaign with " + _0x1334b1.length + " sessions, rotation enabled: " + _0x3885d8.device_rotation);
      this.debugLog("🔧 SESSION ROTATION DEBUG: Session IDs: " + _0x1334b1.join(", "));
      this.debugLog("🌐 PROXY ROTATION DEBUG: Starting campaign with " + _0x8943a5.length + " proxies");
      this.debugLog("🚀 STARTING RECIPIENT PROCESSING LOOP: " + _0x4e5ceb.length + " recipients to process");
      for (let _0x3e0fba = 0; _0x3e0fba < _0x4e5ceb.length; _0x3e0fba++) {
        const _0x3149ec = await this.databaseService.query("SELECT status FROM bulk_campaigns WHERE id = ?", [_0x424bff]);
        if (!_0x3149ec.success || _0x3149ec.data[0]?.status !== "running") {
          break;
        }
        if (_0x3e0fba > 0 && _0x3e0fba % 10 === 0) {
          for (const _0x4e7ec6 of _0x1334b1) {
            const _0x1f8486 = await this.isSessionUsableForSending(_0x4e7ec6);
            if (!_0x1f8486.usable && _0x1f8486.permanent) {
              if (!_0x29c30b.has(_0x4e7ec6)) {
                _0x29c30b.add(_0x4e7ec6);
              }
            }
          }
        }
        const _0x14aabe = _0x4e5ceb[_0x3e0fba];
        const _0x29ebb4 = _0x1334b1.filter(_0x313f3b => !_0x29c30b.has(_0x313f3b));
        this.debugLog("🔧 SESSION ROTATION DEBUG: Recipient " + (_0x3e0fba + 1) + "/" + _0x4e5ceb.length + " - Available sessions: " + _0x29ebb4.length + "/" + _0x1334b1.length);
        this.debugLog("🔧 SESSION ROTATION DEBUG: Blocked sessions: " + (Array.from(_0x29c30b).join(", ") || "None"));
        if (_0x29ebb4.length === 0) {
          let _0x5197af = 0;
          for (const _0x1e3e65 of _0x1334b1) {
            if (_0x29c30b.has(_0x1e3e65)) {
              const _0xaf197b = await this.isSessionUsableForSending(_0x1e3e65);
              if (_0xaf197b.usable) {
                _0x29c30b.delete(_0x1e3e65);
                _0x5197af++;
              }
            }
          }
          if (_0x5197af > 0) {
            _0x3e0fba--;
            continue;
          }
          await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE campaign_id = ? AND status = ?", ["failed", "All sessions permanently blocked or disconnected", _0x424bff, "pending"]);
          const _0x305160 = await this.databaseService.query("\n            SELECT\n              COUNT(CASE WHEN status IN ('sent', 'delivered') THEN 1 END) as sent_count,\n              COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count\n            FROM bulk_campaign_recipients\n            WHERE campaign_id = ?\n          ", [_0x424bff]);
          let _0x3cf123 = 0;
          let _0x5f1035 = 0;
          if (_0x305160.success && _0x305160.data.length > 0) {
            _0x3cf123 = _0x305160.data[0].sent_count || 0;
            _0x5f1035 = _0x305160.data[0].failed_count || 0;
          }
          const _0x154072 = _0x3cf123 > 0 ? "completed" : "failed";
          await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP, sent_count = ?, failed_count = ? WHERE id = ?", [_0x154072, _0x3cf123, _0x5f1035, _0x424bff]);
          this.emit("campaign-completed", {
            campaignId: _0x424bff
          });
          break;
        }
        let _0x3b75dc;
        if (_0x3885d8.device_rotation && _0x29ebb4.length > 1) {
          _0x3b75dc = _0x29ebb4[_0x57021f % _0x29ebb4.length];
          _0x57021f++;
          this.debugLog("🔄 SESSION ROTATION DEBUG: Using rotation - selected session " + _0x3b75dc + " (index " + (_0x57021f - 1) + ")");
        } else {
          _0x3b75dc = _0x29ebb4[0];
          this.debugLog("🔧 SESSION ROTATION DEBUG: Using first available session " + _0x3b75dc + " (rotation disabled or single session)");
        }
        this.debugLog("📱 Using session " + _0x3b75dc + " for recipient " + (_0x3e0fba + 1) + "/" + _0x4e5ceb.length + " (Available: " + _0x29ebb4.length + "/" + _0x1334b1.length + ")");
        let _0x89c1ff = null;
        if (_0x8943a5.length > 0) {
          _0x89c1ff = _0x8943a5[_0x197827 % _0x8943a5.length];
          _0x197827++;
          this.debugLog("🌐 PROXY ROTATION DEBUG: Selected proxy " + _0x89c1ff.id + " - " + _0x89c1ff.host + ":" + _0x89c1ff.port);
          try {
            await this.whatsappService.setSessionProxy(_0x3b75dc, _0x89c1ff);
          } catch (_0x31ab92) {
            console.error("❌ Failed to set proxy for session " + _0x3b75dc + ":", _0x31ab92.message);
          }
          try {
            await this.databaseService.query("UPDATE bulk_campaign_recipients SET proxy_id = ? WHERE id = ?", [_0x89c1ff.id, _0x14aabe.id]);
          } catch (_0x2a28b6) {
            console.error("❌ Failed to store proxy assignment:", _0x2a28b6.message);
          }
        } else {
          try {
            this.whatsappService.removeSessionProxy(_0x3b75dc);
          } catch (_0x106163) {}
        }
        const _0x458b47 = await this.isSessionUsableForSending(_0x3b75dc);
        if (!_0x458b47.usable) {
          if (_0x458b47.permanent) {
            _0x29c30b.add(_0x3b75dc);
            _0x1e2eb4.set(_0x3b75dc, "permanent");
            _0x3bbb6b.delete(_0x3b75dc);
          } else {
            const _0x3cbbb5 = (_0x3bbb6b.get(_0x3b75dc) || 0) + 1;
            _0x3bbb6b.set(_0x3b75dc, _0x3cbbb5);
            if (_0x3cbbb5 >= _0x3c8062) {
              _0x29c30b.add(_0x3b75dc);
              _0x1e2eb4.set(_0x3b75dc, "timeout");
              _0x3bbb6b.delete(_0x3b75dc);
              console.log("⏰ Session " + _0x3b75dc + " escalated to blocked after " + _0x3cbbb5 + " consecutive unavailability checks");
            } else {
              console.log("⏳ Session " + _0x3b75dc + " temporarily unavailable (check " + _0x3cbbb5 + "/" + _0x3c8062 + "), waiting 5s... Reason: " + _0x458b47.reason);
              await new Promise(_0x4ee51f => setTimeout(_0x4ee51f, 5000));
            }
          }
          const _0x224e1f = _0x1334b1.filter(_0x3bf683 => !_0x29c30b.has(_0x3bf683));
          if (_0x224e1f.length === 0) {
            const _0x29a260 = [..._0x29c30b].every(_0x42fb63 => _0x1e2eb4.get(_0x42fb63) === "timeout");
            if (_0x29a260 && _0x5e6dfd < _0x2847c1) {
              _0x5e6dfd++;
              console.log("⏳ All sessions temporarily unavailable. Cooling down for 60s (" + _0x5e6dfd + "/" + _0x2847c1 + ")...");
              await new Promise(_0x43a763 => setTimeout(_0x43a763, _0x58cc22));
              for (const _0x53bb57 of [..._0x29c30b]) {
                if (_0x1e2eb4.get(_0x53bb57) === "timeout") {
                  _0x29c30b.delete(_0x53bb57);
                  _0x157ea5.delete(_0x53bb57);
                  _0x1e2eb4.delete(_0x53bb57);
                  _0x3bbb6b.delete(_0x53bb57);
                }
              }
              console.log("🔄 Cooldown complete, resuming campaign " + _0x424bff);
              _0x3e0fba--;
              continue;
            }
            await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE id = ?", ["failed", "No usable sessions: " + _0x458b47.reason, _0x14aabe.id]);
            await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["paused", _0x424bff]);
            this.emit("campaign-paused", {
              campaignId: _0x424bff,
              reason: "All sessions unavailable. Last reason: " + _0x458b47.reason,
              sessionId: _0x3b75dc
            });
            break;
          }
          _0x3e0fba--;
          continue;
        }
        _0x3bbb6b.delete(_0x3b75dc);
        let _0x355a84 = false;
        if (_0x3885d8.template_id) {
          const _0x5729ec = await this.databaseService.query("SELECT type FROM message_templates WHERE id = ?", [_0x3885d8.template_id]);
          if (_0x5729ec.success && _0x5729ec.data.length > 0) {
            _0x355a84 = _0x5729ec.data[0].type === "video";
          }
        }
        if (_0x355a84) {
          const _0x3b14d4 = await this.whatsappService.getSessionStatus(_0x3b75dc);
          if (!_0x3b14d4 || _0x3b14d4.status !== "connected") {
            await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE id = ?", ["failed", "Session disconnected before video send", _0x14aabe.id]);
            continue;
          }
        }
        const _0x5af4ac = await this.sendMessageToRecipient(_0x3885d8, _0x14aabe, _0x3b75dc, _0x3e0fba, _0x4e5ceb.length);
        if (!_0x5af4ac.success) {
          const _0x5799db = _0x5af4ac.error || "";
          const _0x412e7a = this.isSocketDisconnectionError(_0x5799db);
          const _0x4c93b8 = this.isPermanentlyBlockedError(_0x5799db);
          if (_0x412e7a || _0x4c93b8) {
            _0x29c30b.add(_0x3b75dc);
            _0x1e2eb4.set(_0x3b75dc, _0x4c93b8 ? "permanent" : "timeout");
            const _0x26348f = _0x1334b1.filter(_0x20144f => !_0x29c30b.has(_0x20144f));
            if (_0x26348f.length === 0) {
              await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["paused", _0x424bff]);
              this.emit("campaign-paused", {
                campaignId: _0x424bff,
                reason: "All sessions blocked or disconnected. Last error: " + _0x5799db,
                sessionId: _0x3b75dc
              });
              break;
            } else {
              await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE id = ?", ["failed", "Session " + _0x3b75dc + " blocked: " + _0x5799db, _0x14aabe.id]);
              _0x3e0fba--;
              continue;
            }
          }
          const _0x137ead = _0x157ea5.get(_0x3b75dc) || 0;
          _0x157ea5.set(_0x3b75dc, _0x137ead + 1);
          if (_0x137ead + 1 >= _0x21d7dc) {
            const _0x546f5e = this.isRetryableError(_0x5799db) ? "timeout" : "permanent";
            _0x29c30b.add(_0x3b75dc);
            _0x1e2eb4.set(_0x3b75dc, _0x546f5e);
            const _0x4be327 = _0x1334b1.filter(_0x18dc12 => !_0x29c30b.has(_0x18dc12));
            if (_0x4be327.length === 0) {
              const _0x340614 = [..._0x29c30b].every(_0x315201 => _0x1e2eb4.get(_0x315201) === "timeout");
              if (_0x340614 && _0x5e6dfd < _0x2847c1) {
                _0x5e6dfd++;
                console.log("⏳ All sessions timed out (temporary network issue). Cooling down for 60s before retry (" + _0x5e6dfd + "/" + _0x2847c1 + ")...");
                await new Promise(_0x16ee7b => setTimeout(_0x16ee7b, _0x58cc22));
                for (const _0x3d3021 of [..._0x29c30b]) {
                  if (_0x1e2eb4.get(_0x3d3021) === "timeout") {
                    _0x29c30b.delete(_0x3d3021);
                    _0x157ea5.delete(_0x3d3021);
                    _0x1e2eb4.delete(_0x3d3021);
                  }
                }
                console.log("🔄 Cooldown complete, resuming campaign " + _0x424bff);
                _0x3e0fba--;
                continue;
              }
              await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["paused", _0x424bff]);
              this.emit("campaign-paused", {
                campaignId: _0x424bff,
                reason: "All sessions failed multiple times. Last error: " + _0x5799db,
                sessionId: _0x3b75dc
              });
              break;
            } else {
              _0x3e0fba--;
              continue;
            }
          }
        } else {
          _0x157ea5.set(_0x3b75dc, 0);
        }
        let _0x3a0ff2 = 0;
        this.debugLog("🔧 BULK FEATURES DEBUG: bulkMessageFeatures available: " + !!this.bulkMessageFeatures);
        if (this.bulkMessageFeatures) {
          try {
            _0x3a0ff2 = await this.bulkMessageFeatures.incrementMessageCount(_0x3885d8.id);
            this.debugLog("🔢 BULK FEATURES DEBUG: Message count for campaign " + _0x3885d8.id + ": " + _0x3a0ff2);
            const _0x34129e = await this.bulkMessageFeatures.shouldSendToFamilyNumbers(_0x3885d8.id, _0x3a0ff2);
            this.debugLog("👨‍👩‍👧‍👦 BULK FEATURES DEBUG: Should send to family numbers: " + _0x34129e);
            if (_0x34129e) {
              let _0x16debe = _0x3885d8.message_content || "Campaign message";
              const _0xd072ab = {
                name: "Family Member",
                phone: "",
                email: "",
                company: "",
                position: "",
                var1: "",
                var2: "",
                var3: "",
                var4: "",
                var5: "",
                var6: "",
                var7: "",
                var8: "",
                var9: "",
                var10: ""
              };
              for (let _0x418cf3 = 1; _0x418cf3 <= 10; _0x418cf3++) {
                const _0x14ca45 = "var" + _0x418cf3;
                const _0x12d040 = _0xd072ab[_0x14ca45] || "";
                _0x16debe = _0x16debe.replace(new RegExp("\\{\\{" + _0x14ca45 + "\\}\\}", "g"), _0x12d040);
              }
              _0x16debe = _0x16debe.replace(/\{\{name\}\}/g, _0xd072ab.name);
              _0x16debe = _0x16debe.replace(/\{\{phone\}\}/g, _0xd072ab.phone);
              _0x16debe = _0x16debe.replace(/\{\{email\}\}/g, _0xd072ab.email);
              _0x16debe = _0x16debe.replace(/\{\{company\}\}/g, _0xd072ab.company);
              _0x16debe = _0x16debe.replace(/\{\{position\}\}/g, _0xd072ab.position);
              const _0x49fcbf = _0x3885d8.id + 1000000;
              _0x16debe = await this.bulkMessageFeatures.processMessageContent(_0x49fcbf, _0x16debe);
              const _0x143bc6 = await this.bulkMessageFeatures.sendToFamilyNumbers(_0x3b75dc, _0x16debe, _0x3885d8.message_type || "text", _0x3885d8.id);
            }
            if (await this.bulkMessageFeatures.shouldCampaignSleep(_0x3885d8.id)) {
              await this.bulkMessageFeatures.sleepCampaign(_0x3885d8.id);
            }
          } catch (_0x2b46fa) {
            console.error("❌ BULK FEATURES ERROR:", _0x2b46fa);
          }
        } else {}
        if (_0x3e0fba < _0x4e5ceb.length - 1) {
          const _0x39fc10 = _0x3885d8.delivery_delay_min || _0x3885d8.delivery_delay || 3;
          const _0xfd6810 = _0x3885d8.delivery_delay_max || _0x3885d8.delivery_delay || 9;
          this.debugLog("🔍 DELAY DEBUG: Campaign " + _0x424bff + " delay settings from database - min: " + _0x3885d8.delivery_delay_min + ", max: " + _0x3885d8.delivery_delay_max + ", legacy: " + _0x3885d8.delivery_delay);
          this.debugLog("🔍 DELAY DEBUG: Campaign " + _0x424bff + " calculated delays - minDelay: " + _0x39fc10 + ", maxDelay: " + _0xfd6810);
          const _0x4647d4 = Math.floor(Math.random() * (_0xfd6810 - _0x39fc10 + 1)) + _0x39fc10;
          let _0xfd67b = _0x4647d4 * 1000;
          if (_0x355a84) {
            _0xfd67b = Math.max(_0xfd67b, 15000);
            this.debugLog("📹 Using extended delay of " + _0xfd67b / 1000 + "s for video template");
          } else {
            this.debugLog("⏱️ Using random delay of " + _0xfd67b / 1000 + "s (range: " + _0x39fc10 + "-" + _0xfd6810 + "s)");
          }
          const _0x36d483 = new Date();
          this.debugLog("⏰ DELAY DEBUG: Starting delay at " + _0x36d483.toISOString() + " - Waiting " + _0xfd67b + "ms before next message...");
          await new Promise(_0x170d84 => setTimeout(_0x170d84, _0xfd67b));
          const _0x2a4b1d = new Date();
          const _0x193b64 = _0x2a4b1d.getTime() - _0x36d483.getTime();
          this.debugLog("✅ DELAY DEBUG: Delay completed at " + _0x2a4b1d.toISOString() + " - Actual delay was " + _0x193b64 + "ms (expected " + _0xfd67b + "ms)");
        }
      }
      const _0x2dc188 = await this.databaseService.query("SELECT COUNT(*) as count FROM bulk_campaign_recipients WHERE campaign_id = ? AND status = ?", [_0x424bff, "pending"]);
      if (_0x2dc188.success && _0x2dc188.data[0].count === 0) {
        const _0x33e123 = await this.databaseService.query("\n          SELECT\n            COUNT(CASE WHEN status IN ('sent', 'delivered') THEN 1 END) as sent_count,\n            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count\n          FROM bulk_campaign_recipients\n          WHERE campaign_id = ?\n        ", [_0x424bff]);
        let _0x2a4103 = 0;
        let _0x1d18ec = 0;
        if (_0x33e123.success && _0x33e123.data.length > 0) {
          _0x2a4103 = _0x33e123.data[0].sent_count || 0;
          _0x1d18ec = _0x33e123.data[0].failed_count || 0;
        }
        await this.databaseService.query("UPDATE bulk_campaigns SET status = ?, completed_at = CURRENT_TIMESTAMP, sent_count = ?, failed_count = ? WHERE id = ?", ["completed", _0x424bff, _0x2a4103, _0x1d18ec]);
        this.emit("campaign-completed", {
          campaignId: _0x424bff
        });
      }
    } catch (_0x1b466b) {
      console.error("❌ Error processing campaign " + _0x424bff + ":", _0x1b466b);
      console.error("❌ Error stack:", _0x1b466b.stack);
      console.error("❌ Error details:", {
        message: _0x1b466b.message,
        name: _0x1b466b.name,
        campaignId: _0x424bff
      });
      await this.databaseService.query("UPDATE bulk_campaigns SET status = ? WHERE id = ?", ["failed", _0x424bff]);
      this.emit("campaign-failed", {
        campaignId: _0x424bff,
        error: _0x1b466b.message
      });
    } finally {
      this.activeProcesses.delete(_0x424bff);
    }
  }
  async sendMessageToRecipient(_0x45134c, _0x5c5aaf, _0x50fa95, _0x139afa = 0, _0x3d9d8e = 1) {
    try {
      let _0xc513f4 = _0x5c5aaf.phone_number;
      if (_0xc513f4) {
        _0xc513f4 = String(_0xc513f4);
        if (!_0xc513f4.includes("@")) {
          const _0x3660c8 = _0xc513f4.replace(/\D/g, "");
          let _0x453259 = _0x3660c8;
          this.logger.info("📞 Formatting phone number: " + _0x3660c8 + " → " + _0x453259);
          try {
            const _0x2c7841 = await this.whatsappService.checkNumberExists(_0x50fa95, _0x453259);
            if (_0x2c7841.success && _0x2c7841.jid) {
              _0xc513f4 = _0x2c7841.jid;
              this.logger.info("✅ WhatsApp returned JID: " + _0xc513f4 + " for number " + _0x453259);
            } else if (_0x2c7841.success && _0x2c7841.exists === false) {
              this.logger.warn("🚫 Number " + _0x453259 + " is not registered on WhatsApp. Marking as failed.");
              await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["failed", "Number is not registered on WhatsApp", _0x5c5aaf.id]);
              return {
                success: false,
                error: "Number is not registered on WhatsApp",
                processedContent: null
              };
            } else {
              this.logger.warn("⚠️ WhatsApp check inconclusive for " + _0x453259 + ", using fallback detection");
              if (_0x453259.length > 15) {
                _0xc513f4 = _0x453259 + "@lid";
              } else {
                _0xc513f4 = _0x453259 + "@s.whatsapp.net";
              }
              this.logger.info("📱 Fallback JID: " + _0xc513f4);
            }
          } catch (_0x5cea30) {
            this.logger.error("❌ Error checking number " + _0x453259 + ":", _0x5cea30);
            if (_0x453259.length > 15) {
              _0xc513f4 = _0x453259 + "@lid";
            } else {
              _0xc513f4 = _0x453259 + "@s.whatsapp.net";
            }
            this.logger.info("📱 Error fallback JID: " + _0xc513f4);
          }
        } else {
          this.logger.info("📱 Phone number already has JID suffix: " + _0xc513f4);
        }
      }
      const _0x5e25ba = _0xc513f4 && _0xc513f4.endsWith("@g.us");
      if (this.optOutService && !_0x5e25ba) {
        const _0x8e207d = _0xc513f4.replace("@s.whatsapp.net", "").replace("@lid", "");
        const _0x114dee = this.determineMessageType(_0x45134c);
        const _0x4bf84d = await this.optOutService.checkComplianceBeforeSending(_0x8e207d, _0x114dee, _0x45134c.id);
        if (!_0x4bf84d.canSend) {
          await this.databaseService.run("\n            UPDATE bulk_campaign_recipients\n            SET status = 'skipped', error_message = ?, updated_at = CURRENT_TIMESTAMP\n            WHERE id = ?\n          ", [_0x4bf84d.reason, _0x5c5aaf.id]);
          return {
            success: false,
            error: _0x4bf84d.reason,
            skipped: true,
            complianceStatus: _0x4bf84d.complianceStatus
          };
        }
      }
      const _0x4a9dd0 = new Date();
      let _0x4b8cda;
      let _0x306f4d = null;
      const _0x3f5ec4 = 3;
      const _0x427c97 = 5000;
      let _0x531acb = 0;
      let _0x28cf81 = null;
      while (_0x531acb <= _0x3f5ec4) {
        try {
          let _0x4493a8 = await this.whatsappService.getSessionStatus(_0x50fa95);
          if (_0x4493a8 && (_0x4493a8.status === "disconnected" || _0x4493a8.status === "connecting") && _0x4493a8.isLoggedIn !== false) {
            const _0x151c46 = Date.now() + 30000;
            while (Date.now() < _0x151c46) {
              await new Promise(_0x17016b => setTimeout(_0x17016b, 3000));
              _0x4493a8 = await this.whatsappService.getSessionStatus(_0x50fa95);
              if (_0x4493a8 && _0x4493a8.status === "connected" && _0x4493a8.isLoggedIn) {
                this.logger.info("✅ Session " + _0x50fa95 + " recovered from temporary disconnect — proceeding with send");
                break;
              }
            }
          }
          if (!_0x4493a8 || _0x4493a8.status !== "connected" || !_0x4493a8.isLoggedIn) {
            throw new Error("Session " + _0x50fa95 + " not connected (status: " + _0x4493a8?.status + ", logged in: " + _0x4493a8?.isLoggedIn + ")");
          }
          if (_0x45134c.template_id) {
            const _0x16dfa8 = {
              user_phone: _0xc513f4.replace("@s.whatsapp.net", ""),
              campaign_name: _0x45134c.name,
              name: _0x5c5aaf.name || "",
              phone: _0x5c5aaf.phone_number || "",
              email: _0x5c5aaf.email || "",
              company: _0x5c5aaf.company || "",
              position: _0x5c5aaf.position || "",
              var1: _0x5c5aaf.var1 || "",
              var2: _0x5c5aaf.var2 || "",
              var3: _0x5c5aaf.var3 || "",
              var4: _0x5c5aaf.var4 || "",
              var5: _0x5c5aaf.var5 || "",
              var6: _0x5c5aaf.var6 || "",
              var7: _0x5c5aaf.var7 || "",
              var8: _0x5c5aaf.var8 || "",
              var9: _0x5c5aaf.var9 || "",
              var10: _0x5c5aaf.var10 || ""
            };
            const _0x180556 = await this.databaseService.get("SELECT * FROM message_templates WHERE id = ?", [_0x45134c.template_id]);
            if (_0x180556) {
              let _0x55ecf2 = _0x16dfa8;
              if (this.bulkMessageFeatures && _0x180556.content) {
                const _0x30cfb9 = await this.bulkMessageFeatures.processMessageContent(_0x45134c.id, _0x180556.content);
                _0x180556.content = _0x30cfb9;
              }
              _0x4b8cda = await this.whatsappService.sendTemplateMessage(_0x50fa95, _0xc513f4, _0x180556, _0x55ecf2);
            } else {
              _0x4b8cda = {
                success: false,
                error: "Template not found: " + _0x45134c.template_id
              };
            }
          } else {
            let _0x416f60 = _0x45134c.message_content || "";
            this.debugLog("🔍 SCHEDULER - Message content before replacement:", _0x416f60);
            this.debugLog("🔍 SCHEDULER - Recipient data for replacement:", {
              name: _0x5c5aaf.name,
              var1: _0x5c5aaf.var1,
              var2: _0x5c5aaf.var2,
              var3: _0x5c5aaf.var3
            });
            for (let _0x46bf90 = 1; _0x46bf90 <= 10; _0x46bf90++) {
              const _0x5b3103 = "var" + _0x46bf90;
              const _0x313826 = _0x5c5aaf[_0x5b3103] || "";
              _0x416f60 = _0x416f60.replace(new RegExp("\\{\\{" + _0x5b3103 + "\\}\\}", "g"), _0x313826);
            }
            _0x416f60 = _0x416f60.replace(/\{\{name\}\}/g, _0x5c5aaf.name || "");
            _0x416f60 = _0x416f60.replace(/\{\{phone\}\}/g, _0x5c5aaf.phone_number || "");
            _0x416f60 = _0x416f60.replace(/\{\{email\}\}/g, _0x5c5aaf.email || "");
            _0x416f60 = _0x416f60.replace(/\{\{company\}\}/g, _0x5c5aaf.company || "");
            _0x416f60 = _0x416f60.replace(/\{\{position\}\}/g, _0x5c5aaf.position || "");
            this.debugLog("🔍 SCHEDULER - Message content after replacement:", _0x416f60);
            if (this.bulkMessageFeatures) {
              _0x416f60 = await this.bulkMessageFeatures.processMessageContent(_0x45134c.id, _0x416f60);
            }
            _0x306f4d = _0x416f60;
            this.debugLog("🔍 SCHEDULER - Message content after bulk features processing:", _0x416f60);
            let _0x547343 = null;
            try {
              if (_0x45134c.attachment_data) {
                _0x547343 = JSON.parse(_0x45134c.attachment_data);
              }
            } catch (_0x51b4ea) {}
            if (_0x547343 && _0x547343.file && _0x547343.type) {
              _0x4b8cda = await this.whatsappService.sendMessage(_0x50fa95, _0xc513f4, {
                [_0x547343.type]: {
                  url: _0x547343.file
                },
                caption: _0x416f60
              }, _0x547343.type);
            } else {
              _0x4b8cda = await this.whatsappService.sendMessage(_0x50fa95, _0xc513f4, _0x416f60, "text");
            }
          }
          if (_0x4b8cda && _0x4b8cda.success) {
            break;
          } else {
            _0x28cf81 = _0x4b8cda?.error || "Unknown error";
            throw new Error(_0x28cf81);
          }
        } catch (_0x672a41) {
          _0x28cf81 = _0x672a41.message;
          console.error("❌ Attempt " + (_0x531acb + 1) + "/" + (_0x3f5ec4 + 1) + " failed for " + _0xc513f4 + ": " + _0x672a41.message);
          const _0x32ad1d = this.isRetryableError(_0x672a41.message);
          if (!_0x32ad1d || _0x531acb >= _0x3f5ec4) {
            _0x4b8cda = {
              success: false,
              error: _0x28cf81
            };
            break;
          }
          _0x531acb++;
          if (_0x531acb <= _0x3f5ec4) {
            await new Promise(_0x1107bc => setTimeout(_0x1107bc, _0x427c97));
          }
        }
      }
      if (_0x4b8cda && _0x4b8cda.success) {
        await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, sent_at = CURRENT_TIMESTAMP, message_id = ? WHERE id = ?", ["sent", _0x4b8cda.messageId || null, _0x5c5aaf.id]);
        await this.databaseService.query("\n          INSERT INTO message_history (\n            session_id, contact_phone, message_id, direction, message_type,\n            content, timestamp, status, campaign_id, template_id, created_at\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n        ", [_0x50fa95, _0x5c5aaf.phone_number, _0x4b8cda.messageId || null, "outgoing", _0x45134c.message_type || "text", _0x45134c.message_content, new Date().toISOString(), "sent", _0x45134c.id, _0x45134c.template_id || null]);
        const _0x3d6d7e = new Date();
        const _0x426fc5 = _0x3d6d7e.getTime() - _0x4a9dd0.getTime();
        return {
          ..._0x4b8cda,
          processedContent: _0x306f4d
        };
      } else {
        await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE id = ?", ["failed", _0x28cf81 || "Unknown error", _0x5c5aaf.id]);
        return {
          success: false,
          error: _0x28cf81,
          processedContent: _0x306f4d
        };
      }
    } catch (_0x6dbaa4) {
      console.error("❌ Error sending message to recipient " + _0x5c5aaf.id + ":", _0x6dbaa4);
      await this.databaseService.query("UPDATE bulk_campaign_recipients SET status = ?, error_message = ? WHERE id = ?", ["failed", _0x6dbaa4.message, _0x5c5aaf.id]);
      return {
        success: false,
        error: _0x6dbaa4.message,
        processedContent: null
      };
    }
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeProcesses: this.activeProcesses.size,
      checkInterval: this.checkInterval
    };
  }
  async triggerCheck() {
    this.debugLog("🔄 Manually triggering campaign check...");
    await this.checkScheduledCampaigns();
  }
  determineMessageType(_0x3180cd) {
    const _0x1b4735 = (_0x3180cd.name || "").toLowerCase();
    if (_0x1b4735.includes("promotional") || _0x1b4735.includes("offer") || _0x1b4735.includes("sale")) {
      return "promotional";
    } else if (_0x1b4735.includes("reminder") || _0x1b4735.includes("follow-up")) {
      return "reminder";
    } else if (_0x1b4735.includes("transactional") || _0x1b4735.includes("receipt") || _0x1b4735.includes("confirmation")) {
      return "transactional";
    } else {
      return "marketing";
    }
  }
  async isSessionUsableForSending(_0x4fac92) {
    try {
      const _0x1de764 = await this.whatsappService.getSessionStatus(_0x4fac92);
      if (!_0x1de764) {
        return {
          usable: false,
          reason: "Session status unavailable",
          permanent: true
        };
      }
      if (_0x1de764.status === "connected" && _0x1de764.isLoggedIn === true) {
        return {
          usable: true,
          reason: "Session fully connected"
        };
      }
      if (_0x1de764.status === "connecting" && _0x1de764.phoneNumber) {
        return {
          usable: true,
          reason: "Session reconnecting but previously authenticated"
        };
      }
      const _0x467488 = this.whatsappService.sessions?.get(_0x4fac92);
      if (_0x467488 && _0x467488.user && _0x467488.user.id) {
        return {
          usable: true,
          reason: "Session has authenticated user"
        };
      }
      const _isCampWsOpen = _0x467488 && _0x467488.ws && (_0x467488.ws.isOpen || _0x467488.ws.socket?.readyState === 1 || _0x467488.ws.readyState === 1);
      if (_isCampWsOpen) {
        return {
          usable: true,
          reason: "Session has open WebSocket connection"
        };
      }
      if (_0x1de764.status === "disconnected") {
        return {
          usable: false,
          reason: "Session temporarily disconnected, may be reconnecting",
          permanent: false
        };
      }
      if (_0x1de764.isLoggedIn === false) {
        return {
          usable: false,
          reason: "Session logged out (device unpaired or account banned)",
          permanent: true
        };
      }
      return {
        usable: false,
        reason: "Session in " + _0x1de764.status + " state",
        permanent: false
      };
    } catch (_0x5b5b73) {
      console.error("Error checking session " + _0x4fac92 + " usability:", _0x5b5b73);
      return {
        usable: false,
        reason: "Error checking session: " + _0x5b5b73.message,
        permanent: false
      };
    }
  }
  isSocketDisconnectionError(_0x20a8b9) {
    if (!_0x20a8b9) {
      return false;
    }
    const _0x1d184e = _0x20a8b9.toLowerCase();
    if (_0x1d184e.includes("reconnecting") || _0x1d184e.includes("status: reconnecting")) {
      return false;
    }
    const _0x19013b = ["session.*not found", "socket.*not found", "logged out", "device removed", "session ended"];
    return _0x19013b.some(_0x49b6bd => {
      const _0x5c7106 = new RegExp(_0x49b6bd, "i");
      return _0x5c7106.test(_0x1d184e);
    });
  }
  isRetryableError(_0x289ad2) {
    if (!_0x289ad2) {
      return false;
    }
    const _0x213888 = _0x289ad2.toLowerCase();
    const _0x241d44 = ["timeout", "timed out", "network", "econnreset", "enotfound", "etimedout", "temporarily unavailable", "service unavailable", "503", "reconnecting", "status: reconnecting", "connecting", "status: connecting", "status: disconnected", "not connected", "stream errored", "connection closed", "connection lost", "socket closed", "websocket"];
    if (this.isSocketDisconnectionError(_0x289ad2)) {
      return false;
    }
    return _0x241d44.some(_0x2e4e70 => {
      const _0x22af1a = new RegExp(_0x2e4e70, "i");
      return _0x22af1a.test(_0x213888);
    });
  }
  isPermanentlyBlockedError(_0x1ae396) {
    if (!_0x1ae396) {
      return false;
    }
    const _0xb0b138 = _0x1ae396.toLowerCase();
    const _0x49179e = ["this account has been banned", "account has been restricted", "your account is temporarily banned", "account violation", "business account restricted", "permanently banned", "account suspended", "account blocked", "number blocked", "phone blocked", "authentication failed", "invalid session", "session expired", "bad session", "device removed", "logged out", "multidevice mismatch"];
    return _0x49179e.some(_0x2b5306 => _0xb0b138.includes(_0x2b5306));
  }
  isSessionBlockedError(_0x445c2e) {
    if (!_0x445c2e) {
      return false;
    }
    const _0x49215b = _0x445c2e.toLowerCase();
    const _0x37937e = ["blocked", "banned", "restricted", "suspended", "account limited", "temporarily banned", "permanently banned", "account suspended", "account blocked", "number blocked", "phone blocked", "spam", "violation", "policy", "forbidden", "unauthorized", "access denied", "not allowed", "permission denied", "this account has been banned", "account has been restricted", "your account is temporarily banned", "account violation", "business account restricted", "message could not be sent", "recipient unavailable", "number not on whatsapp", "invalid number", "rate limit", "too many requests", "rate exceeded", "quota exceeded", "throttled", "service unavailable", "connection refused", "disconnected", "session closed", "session ended", "session terminated", "authentication failed", "invalid session", "session expired", "session not found", "session invalid", "not connected", "connection lost", "connection closed", "connection failed", "connection timeout", "timed out", "timeout", "network error", "socket closed", "socket error", "websocket closed", "websocket error", "bad session", "restart required", "device removed", "logged out", "multidevice mismatch", "stream errored", "conflict", "connection update", "qr timeout", "pairing timeout", "unavailable", "unreachable", "failed to send", "send failed", "delivery failed", "message failed", "cannot send", "unable to send", "not available", "offline", "inactive"];
    return _0x37937e.some(_0x82fb83 => _0x49215b.includes(_0x82fb83));
  }
}
module.exports = CampaignSchedulerService;