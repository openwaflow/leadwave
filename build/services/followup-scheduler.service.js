const {
  EventEmitter
} = require("events");
class FollowUpSchedulerService extends EventEmitter {
  constructor() {
    super();
    this.databaseService = null;
    this.whatsappService = null;
    this.messageProcessor = null;
    this.isRunning = false;
    this.schedulerInterval = null;
    this.checkInterval = 30000;
    this.activeProcesses = 0;
  }
  async initialize(_0x3d9d0f, _0x164c6, _0x527060) {
    this.databaseService = _0x3d9d0f;
    this.whatsappService = _0x164c6;
    this.messageProcessor = _0x527060;
    return this;
  }
  start() {
    console.log("🚀 Follow-up scheduler: Starting...");
    if (this.isRunning) {
      console.log("⚠️ Follow-up scheduler: Already running");
      return;
    }
    this.isRunning = true;
    console.log("✅ Follow-up scheduler: Started successfully");
    this.schedulerInterval = setInterval(() => {
      console.log("⏰ Follow-up scheduler: Running scheduled check...");
      this.checkScheduledFollowUps();
    }, this.checkInterval);
    console.log("🔄 Follow-up scheduler: Running initial check...");
    this.checkScheduledFollowUps();
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
  async checkScheduledFollowUps() {
    if (!this.databaseService || !this.whatsappService) {
      console.log("⚠️ Follow-up scheduler: Missing dependencies", {
        hasDatabaseService: !!this.databaseService,
        hasWhatsappService: !!this.whatsappService
      });
      return;
    }
    try {
      console.log("🔍 Follow-up scheduler: Checking for scheduled follow-ups...");
      const _0x34fbfe = Date.now();
      console.log("⏰ Current timestamp:", _0x34fbfe, "(", new Date(_0x34fbfe).toISOString(), ")");
      const _0x59c29b = await this.databaseService.query("\n        SELECT fu.*, ws.device_name, ws.status as session_status\n        FROM follow_up_messages fu\n        LEFT JOIN whatsapp_sessions ws ON fu.session_id = ws.session_id\n        WHERE fu.status = 'scheduled'\n        AND (ws.status = 'connected' OR ws.status IS NULL)\n        ORDER BY fu.priority DESC, fu.scheduled_at ASC\n      ");
      if (!_0x59c29b.success) {
        console.error("⚠️ Failed to fetch scheduled follow-ups:", _0x59c29b.error);
        return;
      }
      const _0x39159c = _0x59c29b.data || [];
      console.log("📋 Found " + _0x39159c.length + " total scheduled follow-ups in database");
      const _0x368f4d = _0x39159c.filter(_0x361ef6 => {
        try {
          const _0x117b20 = new Date(_0x361ef6.scheduled_at).getTime();
          const _0x2f07eb = _0x117b20 <= _0x34fbfe;
          if (_0x2f07eb) {
            console.log("  ✓ " + _0x361ef6.name + " (ID: " + _0x361ef6.id + ") is due:", {
              scheduled: _0x361ef6.scheduled_at,
              scheduledTimestamp: _0x117b20,
              currentTimestamp: _0x34fbfe,
              diff: (_0x34fbfe - _0x117b20) / 1000 / 60
            });
          }
          return _0x2f07eb;
        } catch (_0x4ee9ab) {
          console.error("  ✗ Error parsing date for follow-up " + _0x361ef6.id + ":", _0x4ee9ab.message);
          return false;
        }
      }).slice(0, 10);
      console.log("📬 Found " + _0x368f4d.length + " follow-ups ready to send");
      if (_0x368f4d.length === 0) {
        return;
      }
      for (const _0x19a408 of _0x368f4d) {
        try {
          console.log("📤 Processing follow-up: " + _0x19a408.name + " (ID: " + _0x19a408.id + ")");
          await this.processFollowUp(_0x19a408);
        } catch (_0x3fe352) {
          console.error("⚠️ Error processing follow-up " + _0x19a408.id + ":", _0x3fe352);
          await this.markFollowUpFailed(_0x19a408.id, _0x3fe352.message);
        }
      }
    } catch (_0x402e2f) {
      console.error("⚠️ Error in checkScheduledFollowUps:", _0x402e2f);
    }
  }
  async processFollowUp(_0x4f50ac) {
    this.activeProcesses++;
    this.emit("process-started", {
      followUpId: _0x4f50ac.id,
      name: _0x4f50ac.name
    });
    try {
      console.log("🔍 Follow-up " + _0x4f50ac.id + " - Session ID: " + _0x4f50ac.session_id + ", Session Status: " + _0x4f50ac.session_status + ", Device: " + _0x4f50ac.device_name);
      console.log("🔍 Follow-up " + _0x4f50ac.id + " - Full details:", JSON.stringify({
        id: _0x4f50ac.id,
        name: _0x4f50ac.name,
        session_id: _0x4f50ac.session_id,
        session_status: _0x4f50ac.session_status,
        device_name: _0x4f50ac.device_name,
        scheduled_at: _0x4f50ac.scheduled_at,
        contact_phone: _0x4f50ac.contact_phone
      }, null, 2));
      if (_0x4f50ac.session_status !== "connected") {
        console.error("❌ Follow-up " + _0x4f50ac.id + " FAILED: Session " + _0x4f50ac.session_id + " is not connected (status: " + (_0x4f50ac.session_status || "NULL") + ")");
        throw new Error("Session " + _0x4f50ac.session_id + " is not connected (status: " + (_0x4f50ac.session_status || "NULL") + ")");
      }
      await this.databaseService.query("UPDATE follow_up_messages SET status = ?, last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", ["sending", _0x4f50ac.id]);
      if (!_0x4f50ac.send_if_replied) {
        const _0x381181 = await this.checkIfContactReplied(_0x4f50ac.contact_phone, _0x4f50ac.created_at);
        if (_0x381181) {
          await this.markFollowUpSkipped(_0x4f50ac.id, "Contact has replied");
          return;
        }
      }
      const _0x2aa702 = await this.sendFollowUpMessage(_0x4f50ac);
      if (_0x2aa702.success) {
        await this.databaseService.query("UPDATE follow_up_messages SET status = ?, sent_at = CURRENT_TIMESTAMP, message_id = ? WHERE id = ?", ["sent", _0x2aa702.messageId || null, _0x4f50ac.id]);
        await this.databaseService.query("\n          INSERT INTO message_history (\n            session_id, contact_phone, message_id, direction, message_type,\n            content, timestamp, status, template_id, created_at\n          ) VALUES (?, ?, ?, 'outgoing', ?, ?, CURRENT_TIMESTAMP, 'sent', ?, CURRENT_TIMESTAMP)", [_0x4f50ac.session_id, _0x4f50ac.contact_phone, _0x2aa702.messageId || null, _0x4f50ac.message_type || "text", _0x4f50ac.message_content, _0x4f50ac.template_id || null]);
        this.emit("followup-sent", {
          followUpId: _0x4f50ac.id,
          messageId: _0x2aa702.messageId
        });
        if (_0x4f50ac.is_recurring) {
          await this.scheduleNextRecurrence(_0x4f50ac);
        }
      } else {
        throw new Error(_0x2aa702.error || "Failed to send message");
      }
    } catch (_0x297356) {
      console.error("⚠️ Error sending follow-up " + _0x4f50ac.id + ":", _0x297356);
      console.error("⚠️ Error details:", {
        followUpId: _0x4f50ac.id,
        name: _0x4f50ac.name,
        errorMessage: _0x297356.message,
        errorStack: _0x297356.stack,
        currentRetryCount: _0x4f50ac.retry_count || 0,
        maxRetries: _0x4f50ac.max_retries
      });
      const _0x1b594a = (_0x4f50ac.retry_count || 0) + 1;
      if (_0x1b594a < _0x4f50ac.max_retries) {
        const _0x233c19 = Math.min(_0x1b594a * 5, 30);
        const _0x18caa0 = new Date();
        _0x18caa0.setMinutes(_0x18caa0.getMinutes() + _0x233c19);
        console.log("🔄 Rescheduling follow-up " + _0x4f50ac.id + " for retry " + _0x1b594a + "/" + _0x4f50ac.max_retries + " in " + _0x233c19 + " minutes at " + _0x18caa0.toISOString());
        await this.databaseService.query("UPDATE follow_up_messages SET status = ?, retry_count = ?, scheduled_at = ?, last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", ["scheduled", _0x1b594a, _0x18caa0.toISOString(), _0x4f50ac.id]);
        this.emit("followup-retry-scheduled", {
          followUpId: _0x4f50ac.id,
          retryCount: _0x1b594a,
          retryTime: _0x18caa0
        });
      } else {
        console.log("❌ Follow-up " + _0x4f50ac.id + " exceeded max retries (" + _0x4f50ac.max_retries + "), marking as failed");
        await this.markFollowUpFailed(_0x4f50ac.id, _0x297356.message);
      }
    } finally {
      this.activeProcesses--;
      this.emit("process-completed", {
        followUpId: _0x4f50ac.id
      });
    }
  }
  async sendFollowUpMessage(_0x178860) {
    try {
      let _0xc69834 = _0x178860.message_content;
      let _0x493374 = _0x178860.message_type || "text";
      if (_0x178860.template_id) {
        const _0x1cd73d = await this.databaseService.query("SELECT * FROM message_templates WHERE id = ?", [_0x178860.template_id]);
        if (_0x1cd73d.success && _0x1cd73d.data.length > 0) {
          const _0x28a6ca = _0x1cd73d.data[0];
          const _0x5e9f6c = JSON.parse(_0x178860.variables || "{}");
          const _0x216746 = {
            ..._0x5e9f6c,
            contact_name: _0x178860.contact_name || _0x178860.contact_phone.split("@")[0],
            contact_phone: _0x178860.contact_phone.split("@")[0],
            followup_name: _0x178860.name
          };
          return await this.whatsappService.sendTemplateMessage(_0x178860.session_id, _0x178860.contact_phone, _0x28a6ca, _0x216746);
        }
      }
      if (!_0x178860.template_id) {
        const _0xa8a4d4 = JSON.parse(_0x178860.variables || "{}");
        _0xc69834 = this.processTemplateVariables(_0xc69834, _0xa8a4d4, _0x178860);
      }
      return await this.whatsappService.sendMessage(_0x178860.session_id, _0x178860.contact_phone, _0xc69834, _0x493374);
    } catch (_0x378ba0) {
      console.error("Error in sendFollowUpMessage:", _0x378ba0);
      return {
        success: false,
        error: _0x378ba0.message
      };
    }
  }
  processTemplateVariables(_0x66b8a, _0x1f5617, _0x5c759f = null) {
    let _0xb0e827 = _0x66b8a;
    const _0x394dc2 = {
      ..._0x1f5617
    };
    if (_0x5c759f && _0x5c759f.contact_name) {
      _0x394dc2.name = _0x5c759f.contact_name;
    }
    Object.keys(_0x394dc2).forEach(_0x259e3e => {
      const _0x5bfe91 = new RegExp("\\{\\{" + _0x259e3e + "\\}\\}", "g");
      _0xb0e827 = _0xb0e827.replace(_0x5bfe91, _0x394dc2[_0x259e3e] || "");
    });
    return _0xb0e827;
  }
  async checkIfContactReplied(_0x2fbda7, _0x524eeb) {
    try {
      const _0x262dbf = await this.databaseService.query("\n        SELECT COUNT(*) as count FROM message_history\n        WHERE contact_phone = ?\n        AND direction = 'incoming'\n        AND timestamp > ?\n      ", [_0x2fbda7, _0x524eeb]);
      return _0x262dbf.success && _0x262dbf.data[0]?.count > 0;
    } catch (_0x2fe617) {
      console.error("Error checking if contact replied:", _0x2fe617);
      return false;
    }
  }
  async markFollowUpFailed(_0x940f2c, _0x20fd8c) {
    await this.databaseService.query("UPDATE follow_up_messages SET status = ?, last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", ["failed", _0x940f2c]);
    this.emit("followup-failed", {
      followUpId: _0x940f2c,
      error: _0x20fd8c
    });
  }
  async markFollowUpSkipped(_0x89a4cc, _0x472925) {
    await this.databaseService.query("UPDATE follow_up_messages SET status = ?, last_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", ["skipped", _0x89a4cc]);
    this.emit("followup-skipped", {
      followUpId: _0x89a4cc,
      reason: _0x472925
    });
  }
  async scheduleNextRecurrence(_0x805370) {
    try {
      const _0x1297ad = JSON.parse(_0x805370.recurring_pattern || "{}");
      if (_0x1297ad.type === "none") {
        return;
      }
      const _0x1801bd = this.calculateNextOccurrence(new Date(_0x805370.scheduled_at), _0x1297ad);
      if (!_0x1801bd) {
        return;
      }
      if (_0x1297ad.endType === "count") {
        const _0x298585 = await this.countOccurrences(_0x805370.parent_follow_up_id || _0x805370.id);
        if (_0x298585 >= _0x1297ad.maxOccurrences) {
          return;
        }
      }
      if (_0x1297ad.endType === "date" && _0x1297ad.endDate) {
        const _0x28d525 = new Date(_0x1297ad.endDate);
        if (_0x1801bd > _0x28d525) {
          return;
        }
      }
      const _0xa619e3 = {
        name: _0x805370.name + " (Recurring)",
        description: _0x805370.description,
        session_id: _0x805370.session_id,
        contact_phone: _0x805370.contact_phone,
        contact_name: _0x805370.contact_name,
        message_content: _0x805370.message_content,
        template_id: _0x805370.template_id,
        attachment_data: _0x805370.attachment_data,
        attachment_type: _0x805370.attachment_type,
        message_type: _0x805370.message_type,
        scheduled_at: _0x1801bd.toISOString(),
        status: "scheduled",
        priority: _0x805370.priority,
        category: _0x805370.category,
        tags: _0x805370.tags,
        variables: _0x805370.variables,
        retry_count: 0,
        max_retries: _0x805370.max_retries,
        notes: _0x805370.notes,
        created_by: _0x805370.created_by,
        is_recurring: 1,
        recurring_pattern: _0x805370.recurring_pattern,
        parent_follow_up_id: _0x805370.parent_follow_up_id || _0x805370.id,
        send_if_replied: _0x805370.send_if_replied,
        auto_reschedule: _0x805370.auto_reschedule
      };
      const _0x2f0095 = await this.databaseService.query("\n        INSERT INTO follow_up_messages (\n          name, description, session_id, contact_phone, contact_name,\n          message_content, template_id, attachment_data, attachment_type,\n          message_type, scheduled_at, status, priority, category, tags,\n          variables, retry_count, max_retries, notes, created_by,\n          is_recurring, recurring_pattern, parent_follow_up_id, send_if_replied, auto_reschedule,\n          created_at, updated_at\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n      ", [_0xa619e3.name, _0xa619e3.description, _0xa619e3.session_id, _0xa619e3.contact_phone, _0xa619e3.contact_name, _0xa619e3.message_content, _0xa619e3.template_id, _0xa619e3.attachment_data, _0xa619e3.attachment_type, _0xa619e3.message_type, _0xa619e3.scheduled_at, _0xa619e3.status, _0xa619e3.priority, _0xa619e3.category, _0xa619e3.tags, _0xa619e3.variables, _0xa619e3.retry_count, _0xa619e3.max_retries, _0xa619e3.notes, _0xa619e3.created_by, _0xa619e3.is_recurring, _0xa619e3.recurring_pattern, _0xa619e3.parent_follow_up_id, _0xa619e3.send_if_replied, _0xa619e3.auto_reschedule]);
      if (_0x2f0095.success) {
        this.emit("recurrence-scheduled", {
          originalId: _0x805370.id,
          newId: _0x2f0095.insertId,
          scheduledAt: _0x1801bd.toISOString()
        });
      } else {
        console.error("❌ Failed to schedule next occurrence for follow-up " + _0x805370.id + ":", _0x2f0095.error);
      }
    } catch (_0x4dae9b) {
      console.error("❌ Error scheduling next recurrence for follow-up " + _0x805370.id + ":", _0x4dae9b);
    }
  }
  calculateNextOccurrence(_0x148175, _0x335430) {
    const _0x6b2f02 = new Date(_0x148175);
    switch (_0x335430.type) {
      case "daily":
        _0x6b2f02.setDate(_0x6b2f02.getDate() + (_0x335430.interval || 1));
        break;
      case "weekly":
        const _0x3d50fb = _0x6b2f02.getDay();
        const _0x3b5efc = _0x335430.daysOfWeek || [];
        if (_0x3b5efc.length === 0) {
          return null;
        }
        const _0x214b12 = _0x3d50fb === 0 ? 6 : _0x3d50fb - 1;
        let _0x553293 = null;
        for (let _0x77f085 = 1; _0x77f085 <= 7; _0x77f085++) {
          const _0x5f359a = (_0x214b12 + _0x77f085) % 7;
          if (_0x3b5efc.includes(_0x5f359a)) {
            _0x553293 = _0x5f359a;
            break;
          }
        }
        if (_0x553293 !== null) {
          const _0x38475a = _0x553293 > _0x214b12 ? _0x553293 - _0x214b12 : 7 - _0x214b12 + _0x553293;
          _0x6b2f02.setDate(_0x6b2f02.getDate() + _0x38475a);
        } else {
          return null;
        }
        break;
      case "monthly":
        const _0x319408 = _0x335430.dayOfMonth || _0x6b2f02.getDate();
        _0x6b2f02.setMonth(_0x6b2f02.getMonth() + (_0x335430.interval || 1));
        const _0x4b110d = new Date(_0x6b2f02.getFullYear(), _0x6b2f02.getMonth() + 1, 0).getDate();
        _0x6b2f02.setDate(Math.min(_0x319408, _0x4b110d));
        break;
      case "custom":
        _0x6b2f02.setDate(_0x6b2f02.getDate() + (_0x335430.interval || 1));
        break;
      default:
        return null;
    }
    return _0x6b2f02;
  }
  async countOccurrences(_0xcf9dc6) {
    try {
      const _0x5d28cb = await this.databaseService.query("SELECT COUNT(*) as count FROM follow_up_messages WHERE parent_follow_up_id = ? OR id = ?", [_0xcf9dc6, _0xcf9dc6]);
      if (_0x5d28cb.success) {
        return _0x5d28cb.data[0]?.count || 0;
      } else {
        return 0;
      }
    } catch (_0x1b24df) {
      console.error("Error counting occurrences:", _0x1b24df);
      return 0;
    }
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeProcesses: this.activeProcesses,
      checkInterval: this.checkInterval
    };
  }
}
module.exports = FollowUpSchedulerService;