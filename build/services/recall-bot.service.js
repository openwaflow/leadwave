const {
  EventEmitter
} = require("events");
const pino = require("pino");
const schedule = require("node-schedule");
const moment = require("moment-timezone");
const chrono = require("chrono-node");
class RecallBotService extends EventEmitter {
  constructor() {
    super();
    this.logger = pino({
      name: "RecallBotService"
    });
    this.databaseService = null;
    this.whatsappService = null;
    this.voiceTranscriptionService = null;
    this.naturalLanguageProcessor = null;
    this.reminderScheduler = null;
    this.isInitialized = false;
    this.activeReminders = new Map();
  }
  async fixNullTranscriptionProviders() {
    try {
      const _0x429379 = await this.databaseService.run("\n        UPDATE recall_bot_settings\n        SET transcription_provider = 'whisper'\n        WHERE transcription_provider IS NULL\n        AND transcription_api_key IS NOT NULL\n        AND transcription_api_key != ''\n      ");
    } catch (_0x1a2d9f) {
      console.error("🔍 Recall Bot: Error fixing transcription_provider:", _0x1a2d9f);
    }
  }
  async initialize(_0x441c45, _0x45f661) {
    try {
      this.logger.info("🤖 Initializing Recall Bot Service...");
      this.databaseService = _0x441c45;
      this.whatsappService = _0x45f661;
      await this.fixNullTranscriptionProviders();
      const _0x374a3c = require("./voice-transcription.service");
      this.voiceTranscriptionService = new _0x374a3c();
      const _0x12ce93 = await this.voiceTranscriptionService.initialize();
      const _0x23e968 = require.resolve("./natural-language-processor.service");
      delete require.cache[_0x23e968];
      const _0x12c847 = require("./natural-language-processor.service");
      this.naturalLanguageProcessor = new _0x12c847();
      const _0x701fcf = await this.naturalLanguageProcessor.initialize();
      const _0x18d269 = require("./reminder-scheduler.service");
      this.reminderScheduler = new _0x18d269(this.databaseService, this.whatsappService);
      const _0x2d0f03 = await this.reminderScheduler.initialize();
      await this.loadActiveReminders();
      this.isInitialized = true;
      this.logger.info("✅ Recall Bot Service initialized successfully");
      return {
        success: true
      };
    } catch (_0x47f6d3) {
      console.error("❌ Recall Bot Service: Initialization failed:", _0x47f6d3);
      console.error("❌ Recall Bot Service: Error stack:", _0x47f6d3.stack);
      this.logger.error("❌ Failed to initialize Recall Bot Service:", _0x47f6d3);
      return {
        success: false,
        error: _0x47f6d3.message
      };
    }
  }
  async isEnabledForSession(_0x57968c) {
    try {
      const _0x3ca547 = await this.getSessionSettings(_0x57968c);
      return _0x3ca547 && _0x3ca547.is_enabled;
    } catch (_0x4f980b) {
      this.logger.error("Error checking if Recall Bot is enabled for session " + _0x57968c + ":", _0x4f980b);
      return false;
    }
  }
  async getSessionSettings(_0xfff359) {
    try {
      const _0x4ed059 = await this.getNumericSessionId(_0xfff359);
      if (!_0x4ed059) {
        return null;
      }
      const _0x1fd01e = await this.databaseService.get("SELECT * FROM recall_bot_settings WHERE session_id = ?", [_0x4ed059]);
      return _0x1fd01e?.data || _0x1fd01e;
    } catch (_0x5d532c) {
      this.logger.error("Error getting Recall Bot settings for session " + _0xfff359 + ":", _0x5d532c);
      return null;
    }
  }
  async getNumericSessionId(_0xa756f5) {
    try {
      if (typeof _0xa756f5 === "number" || typeof _0xa756f5 === "string" && /^\d+$/.test(_0xa756f5)) {
        const _0x126875 = parseInt(_0xa756f5);
        const _0x511e63 = await this.databaseService.get("SELECT id FROM whatsapp_sessions WHERE id = ?", [_0x126875]);
        if (_0x511e63) {
          return _0x126875;
        } else {
          return null;
        }
      }
      const _0x3a6983 = await this.databaseService.get("SELECT id FROM whatsapp_sessions WHERE session_id = ?", [_0xa756f5]);
      const _0x58672e = _0x3a6983?.id || _0x3a6983?.data?.id;
      return _0x58672e;
    } catch (_0x136733) {
      this.logger.error("Error getting numeric session ID:", _0x136733);
      return null;
    }
  }
  async updateSessionSettings(_0x664443, _0x1301cc) {
    try {
      const _0x4567d9 = await this.getNumericSessionId(_0x664443);
      if (!_0x4567d9) {
        return {
          success: false,
          error: "Session not found"
        };
      }
      const _0x11a0e1 = await this.getSessionSettings(_0x664443);
      if (_0x11a0e1 && _0x11a0e1.transcription_provider === null && _0x11a0e1.transcription_api_key) {
        await this.databaseService.run("\n          UPDATE recall_bot_settings\n          SET transcription_provider = 'whisper'\n          WHERE session_id = ? AND transcription_provider IS NULL\n        ", [_0x4567d9]);
        _0x11a0e1.transcription_provider = "whisper";
      }
      if (_0x11a0e1 && _0x11a0e1.id) {
        const _0x5c14ce = _0x1301cc.transcription_provider || "whisper";
        const _0x1fb55e = await this.databaseService.run("\n          UPDATE recall_bot_settings\n          SET is_enabled = ?, ai_provider = ?, ai_api_key = ?, ai_model = ?,\n              ai_temperature = ?, default_timezone = ?, voice_transcription_enabled = ?,\n              transcription_provider = ?, transcription_api_key = ?, max_reminder_duration_days = ?,\n              reminder_confirmation_enabled = ?, auto_delete_completed = ?, updated_at = CURRENT_TIMESTAMP\n          WHERE session_id = ?\n        ", [_0x1301cc.is_enabled ? 1 : 0, _0x1301cc.ai_provider, _0x1301cc.ai_api_key, _0x1301cc.ai_model, _0x1301cc.ai_temperature, _0x1301cc.default_timezone, _0x1301cc.voice_transcription_enabled ? 1 : 0, _0x5c14ce, _0x1301cc.transcription_api_key, _0x1301cc.max_reminder_duration_days, _0x1301cc.reminder_confirmation_enabled ? 1 : 0, _0x1301cc.auto_delete_completed ? 1 : 0, _0x4567d9]);
      } else {
        const _0x486e07 = _0x1301cc.transcription_provider || "whisper";
        const _0x178276 = await this.databaseService.run("\n          INSERT INTO recall_bot_settings (\n            session_id, is_enabled, ai_provider, ai_api_key, ai_model, ai_temperature,\n            default_timezone, voice_transcription_enabled, transcription_provider, transcription_api_key,\n            max_reminder_duration_days, reminder_confirmation_enabled, auto_delete_completed\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [_0x4567d9, _0x1301cc.is_enabled ? 1 : 0, _0x1301cc.ai_provider, _0x1301cc.ai_api_key, _0x1301cc.ai_model, _0x1301cc.ai_temperature, _0x1301cc.default_timezone, _0x1301cc.voice_transcription_enabled ? 1 : 0, _0x486e07, _0x1301cc.transcription_api_key, _0x1301cc.max_reminder_duration_days, _0x1301cc.reminder_confirmation_enabled ? 1 : 0, _0x1301cc.auto_delete_completed ? 1 : 0]);
      }
      this.logger.info("✅ Updated Recall Bot settings for session " + _0x664443);
      return {
        success: true
      };
    } catch (_0x467269) {
      this.logger.error("Error updating Recall Bot settings for session " + _0x664443 + ":", _0x467269);
      console.error("🔍 Recall Bot: Error saving settings:", _0x467269);
      return {
        success: false,
        error: _0x467269.message
      };
    }
  }
  async processMessage(_0x376267, _0x180bcb) {
    try {
      if (!(await this.isEnabledForSession(_0x376267))) {
        return {
          success: false,
          reason: "Recall Bot not enabled for this session"
        };
      }
      const _0x54cb8c = await this.getSessionSettings(_0x376267);
      let _0xa69932 = "";
      const _0x11af4e = _0x180bcb.message?.audioMessage || _0x180bcb.message?.ptt || _0x180bcb.messageType && _0x180bcb.messageType.includes("audio") || _0x180bcb.type && _0x180bcb.type.includes("audio");
      let _0x569579 = _0x180bcb.from;
      if (!_0x569579) {
        _0x569579 = _0x180bcb.key?.remoteJid || _0x180bcb.key?.participant || _0x180bcb.key?.from;
      }
      if (_0x11af4e && _0x54cb8c.voice_transcription_enabled) {
        this.logger.info("🎤 Processing voice message for recall bot in session " + _0x376267);
        const _0x4d431d = await this.voiceTranscriptionService.transcribeVoiceMessage(_0x376267, _0x180bcb, _0x54cb8c);
        if (!_0x4d431d.success) {
          const _0x513092 = "🎤 Voice messages are not supported. Please send your reminder as a text message instead.\n\nFor example: 'Remind me to call John in 30 minutes'";
          try {
            if (_0x569579) {
              await this.whatsappService.sendMessage(_0x376267, _0x569579, _0x513092, "text");
              this.logger.info("✅ Sent help message to user " + _0x569579);
            } else {
              this.logger.warn("Could not extract userJid to send help message");
            }
          } catch (_0x4840ae) {
            this.logger.error("Failed to send help message:", _0x4840ae);
          }
          await this.logActivity(_0x376267, _0x180bcb.from, null, "voice_transcription_failed", "Failed to transcribe voice message: " + _0x4d431d.error);
          return {
            success: false,
            error: "Voice transcription not available - user notified to send text"
          };
        }
        if (_0x4d431d.transcription === "TRANSCRIPTION_FAILED_PLEASE_SEND_TEXT") {
          const _0x535174 = "🎤 Voice messages are not supported. Please send your reminder as a text message instead.\n\nFor example: 'Remind me to call John in 30 minutes'";
          try {
            if (_0x569579) {
              await this.whatsappService.sendMessage(_0x376267, _0x569579, _0x535174, "text");
              this.logger.info("✅ Sent help message to user " + _0x569579);
            } else {
              this.logger.warn("Could not extract userJid to send help message");
            }
          } catch (_0x6f95a7) {
            this.logger.error("Failed to send help message:", _0x6f95a7);
          }
          return {
            success: false,
            error: "Voice transcription not available - user notified to send text"
          };
        }
        _0xa69932 = _0x4d431d.transcription;
        await this.logActivity(_0x376267, _0x180bcb.from, null, "voice_transcribed", "Voice message transcribed: \"" + _0xa69932 + "\"");
      } else {
        _0xa69932 = _0x180bcb.message?.conversation || _0x180bcb.message?.extendedTextMessage?.text || "";
        if (!_0xa69932.trim() && !_0x11af4e) {
          return {
            success: false,
            reason: "Unsupported message type for recall bot"
          };
        }
        if (!_0xa69932.trim() && _0x11af4e && !_0x54cb8c.voice_transcription_enabled) {
          return {
            success: false,
            reason: "Voice transcription is disabled"
          };
        }
      }
      if (!_0xa69932.trim()) {
        return {
          success: false,
          reason: "No text content to process"
        };
      }
      this.logger.info("🧠 Processing message with AI: \"" + _0xa69932 + "\"");
      this.logger.info("🔧 Settings:", JSON.stringify({
        ai_provider: _0x54cb8c.ai_provider,
        ai_model: _0x54cb8c.ai_model,
        has_api_key: !!_0x54cb8c.ai_api_key,
        api_key_preview: _0x54cb8c.ai_api_key ? _0x54cb8c.ai_api_key.substring(0, 10) + "..." : "NOT SET"
      }, null, 2));
      const _0x288fe4 = await this.naturalLanguageProcessor.processReminderMessage(_0xa69932, _0x54cb8c, _0x180bcb.from);
      this.logger.info("🤖 AI Result:", JSON.stringify(_0x288fe4, null, 2));
      if (!_0x288fe4.success) {
        this.logger.error("❌ AI processing failed: " + _0x288fe4.error);
        await this.logActivity(_0x376267, _0x180bcb.from, null, "ai_processing_failed", "Failed to process message with AI: " + _0x288fe4.error);
        return {
          success: false,
          error: "Failed to process message with AI"
        };
      }
      this.logger.info("🎯 Handling AI response action: " + _0x288fe4.response?.action);
      return await this.handleAIResponse(_0x376267, _0x180bcb, _0xa69932, _0x288fe4.response, _0x54cb8c);
    } catch (_0x40aa0c) {
      this.logger.error("Error processing message for recall bot in session " + _0x376267 + ":", _0x40aa0c);
      await this.logActivity(_0x376267, _0x180bcb.from, null, "processing_error", "Error processing message: " + _0x40aa0c.message);
      return {
        success: false,
        error: _0x40aa0c.message
      };
    }
  }
  async handleAIResponse(_0x342c5a, _0x49a425, _0x2b5983, _0x2ad19d, _0x455a7f) {
    try {
      const {
        action: _0x52ed15,
        reminder_text: _0x42668f,
        scheduled_time: _0x1006fc,
        timezone: _0x145b0e,
        recurrence_type: _0x4c9cfe,
        recurrence_interval: _0x207174,
        recurrence_end_date: _0x52b3c6
      } = _0x2ad19d;
      switch (_0x52ed15) {
        case "create":
          return await this.createReminder(_0x342c5a, _0x49a425, {
            reminder_text: _0x42668f,
            original_message: _0x2b5983,
            scheduled_time: _0x1006fc,
            timezone: _0x145b0e || _0x455a7f.default_timezone,
            recurrence_type: _0x4c9cfe,
            recurrence_interval: _0x207174,
            recurrence_end_date: _0x52b3c6,
            metadata: JSON.stringify(_0x2ad19d)
          });
        case "update":
          return await this.updateReminder(_0x342c5a, _0x49a425, _0x2ad19d);
        case "cancel":
          return await this.cancelReminder(_0x342c5a, _0x49a425, _0x2ad19d);
        case "cancel_all":
          return await this.cancelAllReminders(_0x342c5a, _0x49a425);
        case "list":
          return await this.listReminders(_0x342c5a, _0x49a425);
        case "clarify":
          const _0x6a7caf = _0x2ad19d.message || "👋 Hi! I'm your Recall Bot - I help you set up reminders so you never miss important tasks! 🤖\n\nYou can ask me to:\n• ⏰ Set reminders (e.g., \"remind me to call John at 5 PM\")\n• 📋 List your reminders (\"show my reminders\")\n• ❌ Cancel reminders (\"cancel all\" or \"delete reminder\")\n\nJust tell me what you'd like to be reminded about and when! 😊";
          await this.whatsappService.sendMessage(_0x342c5a, _0x49a425.from || _0x49a425.key?.remoteJid, {
            text: _0x6a7caf
          }, "text");
          await this.logActivity(_0x342c5a, _0x49a425.from, null, "clarification_sent", "Sent clarification message: " + _0x6a7caf);
          return {
            success: true,
            action: "clarification_sent"
          };
        default:
          await this.logActivity(_0x342c5a, _0x49a425.from, null, "unknown_action", "Unknown action from AI: " + _0x52ed15);
          return {
            success: false,
            error: "Unknown action requested"
          };
      }
    } catch (_0x553957) {
      this.logger.error("Error handling AI response:", _0x553957);
      return {
        success: false,
        error: _0x553957.message
      };
    }
  }
  async createReminder(_0x1a76a8, _0x2c83ca, _0x284be0) {
    try {
      let _0x61dddf = _0x2c83ca.from;
      if (!_0x61dddf) {
        _0x61dddf = _0x2c83ca.key?.remoteJid;
      }
      if (!_0x61dddf) {
        _0x61dddf = _0x2c83ca.key?.participant || _0x2c83ca.key?.from;
      }
      if (!_0x61dddf) {
        console.error("❌ Recall Bot createReminder: Could not extract user JID from message");
        return {
          success: false,
          error: "Could not identify message sender"
        };
      }
      let _0x4a90e7;
      const _0x55bf8f = _0x284be0.scheduled_time;
      if (_0x55bf8f.endsWith("Z") || _0x55bf8f.includes("+") || _0x55bf8f.includes("T")) {
        const _0x1a309d = moment.utc(_0x55bf8f);
        _0x4a90e7 = moment.tz({
          year: _0x1a309d.year(),
          month: _0x1a309d.month(),
          day: _0x1a309d.date(),
          hour: _0x1a309d.hour(),
          minute: _0x1a309d.minute(),
          second: _0x1a309d.second()
        }, _0x284be0.timezone);
      } else {
        _0x4a90e7 = moment.tz(_0x55bf8f, _0x284be0.timezone);
      }
      if (!_0x4a90e7.isValid() || _0x4a90e7.isBefore(moment())) {
        return await this.sendErrorResponse(_0x1a76a8, _0x61dddf, "Invalid or past date/time. Please provide a future date and time for your reminder.");
      }
      const _0x1dd0fd = await this.databaseService.run("\n        INSERT INTO reminders (\n          session_id, user_jid, user_name, reminder_text, original_message,\n          scheduled_time, timezone, recurrence_type, recurrence_interval,\n          recurrence_end_date, metadata\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [_0x1a76a8, _0x61dddf, _0x2c83ca.pushName || "Unknown", _0x284be0.reminder_text, _0x284be0.original_message, _0x4a90e7.toISOString(), _0x284be0.timezone, _0x284be0.recurrence_type, _0x284be0.recurrence_interval, _0x284be0.recurrence_end_date, _0x284be0.metadata]);
      const _0x4d5eb1 = _0x1dd0fd.lastID || _0x1dd0fd.insertId || _0x1dd0fd.lastInsertRowid;
      const _0x2123c9 = new Date(_0x4a90e7.year(), _0x4a90e7.month(), _0x4a90e7.date(), _0x4a90e7.hour(), _0x4a90e7.minute(), _0x4a90e7.second());
      const _0x4a4afc = await this.reminderScheduler.scheduleReminder(_0x4d5eb1, _0x2123c9);
      await this.logActivity(_0x1a76a8, _0x61dddf, _0x4d5eb1, "reminder_created", "Reminder created: \"" + _0x284be0.reminder_text + "\" scheduled for " + _0x4a90e7.format());
      const _0x53ee99 = _0x4a90e7.tz(_0x284be0.timezone);
      const _0x8f2894 = ["🎯 Got it Boss! I'll remind you to " + _0x284be0.reminder_text + " at " + _0x53ee99.format("h:mm A") + " on " + _0x53ee99.format("MMM Do") + ". Consider it done! 💪", "👍 No worries! I've set a reminder for you to " + _0x284be0.reminder_text + " at " + _0x53ee99.format("h:mm A, MMM Do") + ". I won't let you forget! 🔔", "✨ Perfect! Your reminder to " + _0x284be0.reminder_text + " is locked and loaded for " + _0x53ee99.format("h:mm A") + " on " + _0x53ee99.format("MMM Do") + ". I got your back! 🚀", "🤝 Consider it handled! I'll ping you to " + _0x284be0.reminder_text + " at " + _0x53ee99.format("h:mm A, MMM Do") + ". You can count on me! ⏰", "💯 Boom! Reminder set for you to " + _0x284be0.reminder_text + " at " + _0x53ee99.format("h:mm A") + " on " + _0x53ee99.format("MMM Do") + ". I'll make sure you don't miss it! 🎯"];
      let _0x5e5ed8 = _0x8f2894[Math.floor(Math.random() * _0x8f2894.length)];
      if (_0x284be0.recurrence_type) {
        _0x5e5ed8 += "\n\n🔄 And hey, this will repeat " + _0x284be0.recurrence_type + " - so you're all set for the long run! 📅";
      }
      await this.whatsappService.sendMessage(_0x1a76a8, _0x61dddf, _0x5e5ed8, "text");
      this.logger.info("✅ Reminder created successfully for session " + _0x1a76a8 + ", reminder ID: " + _0x4d5eb1);
      return {
        success: true,
        reminderId: _0x4d5eb1,
        scheduledTime: _0x4a90e7.toISOString()
      };
    } catch (_0x4028b6) {
      this.logger.error("Error creating reminder:", _0x4028b6);
      await this.sendErrorResponse(_0x1a76a8, _0x2c83ca.from, "Sorry, I encountered an error while creating your reminder. Please try again.");
      return {
        success: false,
        error: _0x4028b6.message
      };
    }
  }
  async loadActiveReminders() {
    try {
      const _0x19b8df = await this.databaseService.all("\n        SELECT * FROM reminders \n        WHERE status = 'active' AND scheduled_time > datetime('now')\n      ");
      for (const _0x4df40 of _0x19b8df) {
        const _0x523f81 = moment(_0x4df40.scheduled_time).toDate();
        await this.reminderScheduler.scheduleReminder(_0x4df40.id, _0x523f81);
      }
      this.logger.info("📅 Loaded and scheduled " + _0x19b8df.length + " active reminders");
    } catch (_0xa4d99b) {
      this.logger.error("Error loading active reminders:", _0xa4d99b);
    }
  }
  async sendErrorResponse(_0x32c848, _0x2f6ea3, _0x3578b1) {
    try {
      await this.whatsappService.sendMessage(_0x32c848, _0x2f6ea3, "❌ " + _0x3578b1, "text");
    } catch (_0x3308b5) {
      this.logger.error("Error sending error response:", _0x3308b5);
    }
  }
  async updateReminder(_0x223a34, _0x9e5c1e, _0x3ef1cc) {
    try {
      await this.sendErrorResponse(_0x223a34, _0x9e5c1e.from, "Reminder updates are not yet implemented. Please cancel the old reminder and create a new one.");
      return {
        success: false,
        error: "Update functionality not implemented"
      };
    } catch (_0xce2aa1) {
      this.logger.error("Error updating reminder:", _0xce2aa1);
      return {
        success: false,
        error: _0xce2aa1.message
      };
    }
  }
  async cancelAllReminders(_0x2f708b, _0x1de4fe) {
    try {
      let _0x1cf673 = _0x1de4fe.from;
      if (!_0x1cf673) {
        _0x1cf673 = _0x1de4fe.key?.remoteJid;
      }
      if (!_0x1cf673) {
        _0x1cf673 = _0x1de4fe.key?.participant || _0x1de4fe.key?.from;
      }
      const _0xaa2ba9 = await this.databaseService.all("\n        SELECT * FROM reminders\n        WHERE session_id = ? AND user_jid = ? AND status = 'active'\n        ORDER BY created_at DESC\n      ", [_0x2f708b, _0x1cf673]);
      const _0x55419c = Array.isArray(_0xaa2ba9) ? _0xaa2ba9 : _0xaa2ba9.data || [];
      if (_0x55419c.length === 0) {
        await this.whatsappService.sendMessage(_0x2f708b, _0x1cf673, "❌ You don't have any active reminders to cancel.", "text");
        return {
          success: true,
          message: "No active reminders found"
        };
      }
      let _0x5e001b = 0;
      for (const _0xa8e5ac of _0x55419c) {
        const _0x530070 = await this.reminderScheduler.cancelReminder(_0xa8e5ac.id);
        if (_0x530070.success) {
          _0x5e001b++;
          await this.logActivity(_0x2f708b, _0x1cf673, _0xa8e5ac.id, "reminder_cancelled", "Reminder cancelled (bulk): \"" + _0xa8e5ac.reminder_text + "\"");
        }
      }
      const _0x32c529 = ["🗑️ All done! I've cancelled all " + _0x5e001b + " of your reminders. Your schedule is now clear! 🎯", "✅ Perfect! Cancelled all " + _0x5e001b + " reminders for you. Fresh start! 💪", "🧹 Boom! All " + _0x5e001b + " reminders wiped clean. You're all set! 🚀", "👍 Got it! I've removed all " + _0x5e001b + " reminders from your list. Clean slate! ✨", "💯 Done deal! All " + _0x5e001b + " reminders have been cancelled. You're free! 🎉"];
      const _0x4b1eeb = _0x32c529[Math.floor(Math.random() * _0x32c529.length)];
      await this.whatsappService.sendMessage(_0x2f708b, _0x1cf673, _0x4b1eeb, "text");
      return {
        success: true,
        cancelledCount: _0x5e001b
      };
    } catch (_0x5105cd) {
      this.logger.error("Error cancelling all reminders:", _0x5105cd);
      await this.sendErrorResponse(_0x2f708b, userJid, "Sorry, I encountered an error while cancelling your reminders. Please try again.");
      return {
        success: false,
        error: _0x5105cd.message
      };
    }
  }
  async cancelReminder(_0xe20a45, _0x31d9d7, _0xd7e81b) {
    try {
      const _0x78ea55 = await this.databaseService.all("\n        SELECT * FROM reminders\n        WHERE session_id = ? AND user_jid = ? AND status = 'active'\n        ORDER BY created_at DESC\n      ", [_0xe20a45, _0x31d9d7.from]);
      if (_0x78ea55.length === 0) {
        await this.whatsappService.sendMessage(_0xe20a45, _0x31d9d7.from, "❌ You don't have any active reminders to cancel.", "text");
        return {
          success: true,
          message: "No active reminders found"
        };
      }
      if (_0x78ea55.length === 1) {
        const _0x1b2e95 = _0x78ea55[0];
        await this.reminderScheduler.cancelReminder(_0x1b2e95.id);
        await this.whatsappService.sendMessage(_0xe20a45, _0x31d9d7.from, "✅ Cancelled reminder: \"" + _0x1b2e95.reminder_text + "\"", "text");
        await this.logActivity(_0xe20a45, _0x31d9d7.from, _0x1b2e95.id, "reminder_cancelled", "Reminder cancelled: \"" + _0x1b2e95.reminder_text + "\"");
        return {
          success: true,
          cancelledReminderId: _0x1b2e95.id
        };
      } else {
        let _0x5995e6 = "📋 You have multiple active reminders:\n\n";
        _0x78ea55.forEach((_0xfb34b9, _0x26a4e6) => {
          const _0x4748ec = moment(_0xfb34b9.scheduled_time).tz(_0xfb34b9.timezone);
          _0x5995e6 += _0x26a4e6 + 1 + ". " + _0xfb34b9.reminder_text + "\n";
          _0x5995e6 += "   ⏰ " + _0x4748ec.format("MMM Do, h:mm A z") + "\n\n";
        });
        _0x5995e6 += "Please reply with the number of the reminder you want to cancel (e.g., \"1\" or \"2\").\n\n";
        _0x5995e6 += "💡 _Tip: You can also say \"cancel all reminders\" to clear everything!_";
        await this.whatsappService.sendMessage(_0xe20a45, _0x31d9d7.from, _0x5995e6, "text");
        return {
          success: true,
          message: "Multiple reminders found, awaiting user selection"
        };
      }
    } catch (_0x451741) {
      this.logger.error("Error cancelling reminder:", _0x451741);
      await this.sendErrorResponse(_0xe20a45, _0x31d9d7.from, "Sorry, I encountered an error while cancelling your reminder. Please try again.");
      return {
        success: false,
        error: _0x451741.message
      };
    }
  }
  async listReminders(_0x5cf0b6, _0x17292c) {
    try {
      const _0x4962b9 = await this.databaseService.all("\n        SELECT * FROM reminders\n        WHERE session_id = ? AND user_jid = ? AND status = 'active'\n        ORDER BY scheduled_time ASC\n      ", [_0x5cf0b6, _0x17292c.from]);
      if (_0x4962b9.length === 0) {
        await this.whatsappService.sendMessage(_0x5cf0b6, _0x17292c.from, "📋 You don't have any active reminders.", "text");
        return {
          success: true,
          count: 0
        };
      }
      let _0x29c51d = "📋 *Your Active Reminders* (" + _0x4962b9.length + ")\n\n";
      _0x4962b9.forEach((_0x48cf8b, _0x20f440) => {
        const _0x16a869 = moment(_0x48cf8b.scheduled_time).tz(_0x48cf8b.timezone);
        _0x29c51d += _0x20f440 + 1 + ". *" + _0x48cf8b.reminder_text + "*\n";
        _0x29c51d += "   ⏰ " + _0x16a869.format("MMMM Do YYYY, h:mm A z") + "\n";
        if (_0x48cf8b.recurrence_type) {
          _0x29c51d += "   🔄 Repeats: " + _0x48cf8b.recurrence_type + "\n";
        }
        _0x29c51d += "\n";
      });
      await this.whatsappService.sendMessage(_0x5cf0b6, _0x17292c.from, _0x29c51d, "text");
      await this.logActivity(_0x5cf0b6, _0x17292c.from, null, "reminders_listed", "Listed " + _0x4962b9.length + " active reminders");
      return {
        success: true,
        count: _0x4962b9.length
      };
    } catch (_0xbdbee3) {
      this.logger.error("Error listing reminders:", _0xbdbee3);
      await this.sendErrorResponse(_0x5cf0b6, _0x17292c.from, "Sorry, I encountered an error while retrieving your reminders. Please try again.");
      return {
        success: false,
        error: _0xbdbee3.message
      };
    }
  }
  async getSessionStats(_0x2f5a74) {
    try {
      const _0x2fdacf = await this.reminderScheduler.getReminderStats(_0x2f5a74);
      const _0x3fe602 = await this.voiceTranscriptionService.getTranscriptionStats(_0x2f5a74);
      return {
        reminders: _0x2fdacf,
        transcriptions: _0x3fe602,
        scheduledJobs: this.reminderScheduler.getScheduledJobsCount()
      };
    } catch (_0x58ae65) {
      this.logger.error("Error getting session stats:", _0x58ae65);
      return null;
    }
  }
  async shutdown() {
    try {
      this.logger.info("🛑 Shutting down Recall Bot Service...");
      if (this.reminderScheduler) {
        this.reminderScheduler.cancelAllJobs();
      }
      this.isInitialized = false;
      this.logger.info("✅ Recall Bot Service shut down successfully");
    } catch (_0x3970ff) {
      this.logger.error("Error shutting down Recall Bot Service:", _0x3970ff);
    }
  }
  async logActivity(_0x44b1ce, _0xcdd929, _0xf5ebf8, _0xcc8139, _0x1cf325, _0xaa8414 = null) {
    try {
      await this.databaseService.run("\n        INSERT INTO recall_bot_logs (session_id, user_jid, reminder_id, action_type, message, metadata)\n        VALUES (?, ?, ?, ?, ?, ?)\n      ", [_0x44b1ce, _0xcdd929, _0xf5ebf8, _0xcc8139, _0x1cf325, _0xaa8414 ? JSON.stringify(_0xaa8414) : null]);
    } catch (_0x27cd52) {
      this.logger.error("Error logging activity:", _0x27cd52);
    }
  }
}
module.exports = RecallBotService;