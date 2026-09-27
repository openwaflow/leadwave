const pino = require("pino");
const schedule = require("node-schedule");
const moment = require("moment-timezone");
class ReminderScheduler {
  constructor(_0x18a49d, _0xa6e243) {
    this.logger = pino({
      name: "ReminderScheduler"
    });
    this.databaseService = _0x18a49d;
    this.whatsappService = _0xa6e243;
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }
  async initialize() {
    try {
      this.logger.info("⏰ Initializing Reminder Scheduler...");
      await this.loadActiveReminders();
      this.setupCleanupJob();
      this.isInitialized = true;
      this.logger.info("✅ Reminder Scheduler initialized successfully");
      return {
        success: true
      };
    } catch (_0xc0cb0d) {
      this.logger.error("❌ Failed to initialize Reminder Scheduler:", _0xc0cb0d);
      return {
        success: false,
        error: _0xc0cb0d.message
      };
    }
  }
  async scheduleReminder(_0x58f094, _0x19ccae) {
    try {
      if (this.scheduledJobs.has(_0x58f094)) {
        this.scheduledJobs.get(_0x58f094).cancel();
        this.scheduledJobs.delete(_0x58f094);
      }
      const _0x3b2ad2 = schedule.scheduleJob(_0x19ccae, async () => {
        await this.executeReminder(_0x58f094);
      });
      if (_0x3b2ad2) {
        this.scheduledJobs.set(_0x58f094, _0x3b2ad2);
        this.logger.info("📅 Scheduled reminder " + _0x58f094 + " for " + moment(_0x19ccae).format());
        return {
          success: true
        };
      } else {
        throw new Error("Failed to schedule job");
      }
    } catch (_0x58456d) {
      this.logger.error("Error scheduling reminder " + _0x58f094 + ":", _0x58456d);
      return {
        success: false,
        error: _0x58456d.message
      };
    }
  }
  async cancelReminder(_0x4246cb) {
    try {
      if (this.scheduledJobs.has(_0x4246cb)) {
        this.scheduledJobs.get(_0x4246cb).cancel();
        this.scheduledJobs.delete(_0x4246cb);
        this.logger.info("❌ Cancelled scheduled reminder " + _0x4246cb);
      }
      await this.databaseService.run("UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["cancelled", _0x4246cb]);
      return {
        success: true
      };
    } catch (_0x16ca7f) {
      this.logger.error("Error cancelling reminder " + _0x4246cb + ":", _0x16ca7f);
      return {
        success: false,
        error: _0x16ca7f.message
      };
    }
  }
  async executeReminder(_0x56a5b5) {
    try {
      this.logger.info("🔔 Executing reminder " + _0x56a5b5);
      const _0x1bc0f2 = await this.databaseService.get("SELECT * FROM reminders WHERE id = ? AND status = ?", [_0x56a5b5, "active"]);
      if (!_0x1bc0f2) {
        this.logger.warn("Reminder " + _0x56a5b5 + " not found or not active");
        return;
      }
      const _0x4223e4 = _0x1bc0f2;
      const _0x464afb = this.formatReminderMessage(_0x4223e4);
      const _0x3c377e = await this.whatsappService.sendMessage(_0x4223e4.session_id, _0x4223e4.user_jid, _0x464afb, "text");
      if (_0x3c377e.success) {
        await this.databaseService.run("\n          UPDATE reminders \n          SET reminder_sent = 1, reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP\n          WHERE id = ?\n        ", [_0x56a5b5]);
        await this.logReminderActivity(_0x4223e4.session_id, _0x4223e4.user_jid, _0x56a5b5, "reminder_sent", "Reminder sent: \"" + _0x4223e4.reminder_text + "\"");
        if (_0x4223e4.recurrence_type) {
          await this.handleRecurrence(_0x4223e4);
        } else {
          await this.databaseService.run("UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["completed", _0x56a5b5]);
        }
        this.logger.info("✅ Reminder " + _0x56a5b5 + " executed successfully");
      } else {
        await this.databaseService.run("UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["failed", _0x56a5b5]);
        await this.logReminderActivity(_0x4223e4.session_id, _0x4223e4.user_jid, _0x56a5b5, "reminder_failed", "Failed to send reminder: " + _0x3c377e.error);
        this.logger.error("❌ Failed to send reminder " + _0x56a5b5 + ":", _0x3c377e.error);
      }
      this.scheduledJobs.delete(_0x56a5b5);
    } catch (_0x2890cc) {
      this.logger.error("Error executing reminder " + _0x56a5b5 + ":", _0x2890cc);
      try {
        await this.databaseService.run("UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["failed", _0x56a5b5]);
      } catch (_0x19818f) {
        this.logger.error("Error updating failed reminder status:", _0x19818f);
      }
    }
  }
  formatReminderMessage(_0x22ac97) {
    const _0x456903 = moment(_0x22ac97.scheduled_time).tz(_0x22ac97.timezone);
    const _0x30a437 = ["🔔 *Hey there!* Time for your reminder!\n\n💡 Don't forget to " + _0x22ac97.reminder_text + "\n\n⏰ You asked me to remind you at " + _0x456903.format("h:mm A") + " and here I am! 😊", "⏰ *Ding ding!* Reminder time!\n\n📝 Time to " + _0x22ac97.reminder_text + "\n\n🎯 Just like you asked - right on time at " + _0x456903.format("h:mm A") + "! Hope I'm not interrupting anything important! 😄", "🔔 *Knock knock!* Your reminder is here!\n\n✨ Time to " + _0x22ac97.reminder_text + "\n\n⏰ Scheduled for " + _0x456903.format("h:mm A") + " and delivered fresh! 🚀", "🎵 *Reminder alert!* 🎵\n\n📋 Don't forget to " + _0x22ac97.reminder_text + "\n\n⏰ You set this for " + _0x456903.format("h:mm A") + " and I never forget! That's what I'm here for! 💪", "🔔 *Beep beep!* Your personal reminder assistant reporting for duty!\n\n📝 Time to " + _0x22ac97.reminder_text + "\n\n⏰ Right on schedule at " + _0x456903.format("h:mm A") + "! Hope this helps! 🤝"];
    let _0x279dcb = _0x30a437[Math.floor(Math.random() * _0x30a437.length)];
    if (_0x22ac97.recurrence_type) {
      _0x279dcb += "\n\n🔄 P.S. This reminder repeats " + _0x22ac97.recurrence_type + ", so I'll be back! 📅";
    }
    _0x279dcb += "\n\n_Your friendly Recall Bot 🤖_";
    return _0x279dcb;
  }
  async handleRecurrence(_0x298c77) {
    try {
      const _0x1dc9aa = moment(_0x298c77.scheduled_time).tz(_0x298c77.timezone);
      let _0x1ed60e;
      switch (_0x298c77.recurrence_type) {
        case "daily":
          _0x1ed60e = _0x1dc9aa.add(_0x298c77.recurrence_interval || 1, "days");
          break;
        case "weekly":
          _0x1ed60e = _0x1dc9aa.add(_0x298c77.recurrence_interval || 1, "weeks");
          break;
        case "monthly":
          _0x1ed60e = _0x1dc9aa.add(_0x298c77.recurrence_interval || 1, "months");
          break;
        case "yearly":
          _0x1ed60e = _0x1dc9aa.add(_0x298c77.recurrence_interval || 1, "years");
          break;
        default:
          this.logger.warn("Unknown recurrence type: " + _0x298c77.recurrence_type);
          return;
      }
      if (_0x298c77.recurrence_end_date && _0x1ed60e.isAfter(moment(_0x298c77.recurrence_end_date))) {
        await this.databaseService.run("UPDATE reminders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", ["completed", _0x298c77.id]);
        this.logger.info("Recurring reminder " + _0x298c77.id + " completed (reached end date)");
        return;
      }
      await this.databaseService.run("\n        UPDATE reminders \n        SET scheduled_time = ?, reminder_sent = 0, reminder_sent_at = NULL, updated_at = CURRENT_TIMESTAMP\n        WHERE id = ?\n      ", [_0x1ed60e.toISOString(), _0x298c77.id]);
      await this.scheduleReminder(_0x298c77.id, _0x1ed60e.toDate());
      this.logger.info("🔄 Scheduled next occurrence of reminder " + _0x298c77.id + " for " + _0x1ed60e.format());
    } catch (_0x4f8f09) {
      this.logger.error("Error handling recurrence for reminder " + _0x298c77.id + ":", _0x4f8f09);
    }
  }
  async loadActiveReminders() {
    try {
      const _0x1b3084 = await this.databaseService.all("\n        SELECT * FROM reminders \n        WHERE status = 'active' AND scheduled_time > datetime('now')\n      ");
      let _0x1b7f3f = 0;
      for (const _0x1d0e01 of _0x1b3084) {
        const _0x127b94 = moment(_0x1d0e01.scheduled_time).toDate();
        const _0x2f78c6 = await this.scheduleReminder(_0x1d0e01.id, _0x127b94);
        if (_0x2f78c6.success) {
          _0x1b7f3f++;
        }
      }
      this.logger.info("📅 Loaded and scheduled " + _0x1b7f3f + " active reminders");
    } catch (_0x1cbcd8) {
      this.logger.error("Error loading active reminders:", _0x1cbcd8);
    }
  }
  setupCleanupJob() {
    schedule.scheduleJob("0 2 * * *", async () => {
      await this.cleanupOldReminders();
    });
  }
  async cleanupOldReminders() {
    try {
      const _0x552d5d = await this.databaseService.run("\n        DELETE FROM reminders \n        WHERE status IN ('completed', 'failed') \n        AND updated_at < datetime('now', '-30 days')\n      ");
      this.logger.info("🗑️ Cleaned up " + _0x552d5d.changes + " old reminders");
    } catch (_0x5ad650) {
      this.logger.error("Error cleaning up old reminders:", _0x5ad650);
    }
  }
  async getReminderStats(_0x5dd973) {
    try {
      const _0xef4565 = await this.databaseService.get("\n        SELECT \n          COUNT(*) as total_reminders,\n          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_reminders,\n          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reminders,\n          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_reminders,\n          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_reminders,\n          COUNT(CASE WHEN reminder_sent = 1 THEN 1 END) as sent_reminders\n        FROM reminders \n        WHERE session_id = ?\n      ", [_0x5dd973]);
      return _0xef4565?.data || _0xef4565 || {
        total_reminders: 0,
        active_reminders: 0,
        completed_reminders: 0,
        cancelled_reminders: 0,
        failed_reminders: 0,
        sent_reminders: 0
      };
    } catch (_0xf8f64e) {
      this.logger.error("Error getting reminder stats:", _0xf8f64e);
      return null;
    }
  }
  async logReminderActivity(_0x25c826, _0x4b2443, _0x47047b, _0x4eb2da, _0x79d8f0, _0x7e558b = null) {
    try {
      await this.databaseService.run("\n        INSERT INTO recall_bot_logs (session_id, user_jid, reminder_id, action_type, message, metadata)\n        VALUES (?, ?, ?, ?, ?, ?)\n      ", [_0x25c826, _0x4b2443, _0x47047b, _0x4eb2da, _0x79d8f0, _0x7e558b ? JSON.stringify(_0x7e558b) : null]);
    } catch (_0x1ec844) {
      this.logger.error("Error logging reminder activity:", _0x1ec844);
    }
  }
  getScheduledJobsCount() {
    return this.scheduledJobs.size;
  }
  cancelAllJobs() {
    for (const [_0x57bf3f, _0x1ccb29] of this.scheduledJobs) {
      _0x1ccb29.cancel();
      this.logger.info("Cancelled job for reminder " + _0x57bf3f);
    }
    this.scheduledJobs.clear();
  }
}
module.exports = ReminderScheduler;