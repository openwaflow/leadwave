const pino = require("pino");
const axios = require("axios");
const OpenAI = require("openai");
const chrono = require("chrono-node");
const moment = require("moment-timezone");
class NaturalLanguageProcessor {
  constructor() {
    this.logger = pino({
      name: "NaturalLanguageProcessor"
    });
    this.isInitialized = false;
    this.openaiClient = null;
  }
  async initialize() {
    try {
      this.logger.info("🧠 Initializing Natural Language Processor...");
      this.isInitialized = true;
      this.logger.info("✅ Natural Language Processor initialized successfully");
      return {
        success: true
      };
    } catch (_0x4c520e) {
      this.logger.error("❌ Failed to initialize Natural Language Processor:", _0x4c520e);
      return {
        success: false,
        error: _0x4c520e.message
      };
    }
  }
  async processReminderMessage(_0x19be20, _0x2e7d85, _0x4636f1) {
    try {
      this.logger.info("🧠 Processing reminder message with AI provider: " + _0x2e7d85.ai_provider);
      const _0x4d458a = _0x19be20.toLowerCase().trim();
      if (_0x4d458a === "cancel all" || _0x4d458a === "delete all" || _0x4d458a === "clear all" || _0x4d458a === "remove all" || (_0x4d458a.includes("cancel") || _0x4d458a.includes("delete") || _0x4d458a.includes("remove") || _0x4d458a.includes("clear")) && (_0x4d458a.includes("all") || _0x4d458a.includes("everything")) && !_0x4d458a.includes("remind")) {
        this.logger.info("🔍 Quick match: Detected cancel_all action");
        return {
          success: true,
          response: {
            action: "cancel_all",
            reminder_text: "",
            scheduled_time: null,
            timezone: _0x2e7d85.default_timezone || "Asia/Kolkata",
            recurrence_type: null,
            recurrence_interval: null,
            recurrence_end_date: null,
            confidence: 0.95,
            reasoning: "Quick match for cancel all keywords"
          }
        };
      }
      const _0x984a6a = chrono.parse(_0x19be20, new Date(), {
        forwardDate: true
      });
      const _0x2abda2 = this.buildReminderPrompt(_0x19be20, _0x984a6a, _0x2e7d85.default_timezone);
      let _0x3a5a53;
      switch (_0x2e7d85.ai_provider) {
        case "openai":
          _0x3a5a53 = await this.processWithOpenAI(_0x2abda2, _0x2e7d85);
          break;
        default:
          throw new Error("Unsupported AI provider: " + _0x2e7d85.ai_provider + ". Only OpenAI is supported.");
      }
      const _0x2bb686 = this.parseAIResponse(_0x3a5a53);
      this.logger.info("✅ AI processing completed. Action: " + _0x2bb686.action);
      this.logger.info("🔍 AI Response Details:", JSON.stringify(_0x2bb686, null, 2));
      if (_0x2bb686.timezone === "UTC") {
        this.logger.info("🔧 Fixing timezone from UTC to Asia/Kolkata");
        _0x2bb686.timezone = "Asia/Kolkata";
      }
      return {
        success: true,
        response: _0x2bb686
      };
    } catch (_0x186de9) {
      this.logger.error("Error processing reminder message with AI:", _0x186de9);
      return {
        success: false,
        error: _0x186de9.message
      };
    }
  }
  buildReminderPrompt(_0x46e8e1, _0x2627da, _0x16ec15) {
    const _0x3e8239 = _0x2627da.length > 0 ? "Chrono.js detected: " + JSON.stringify(_0x2627da.map(_0x9b6c6 => ({
      text: _0x9b6c6.text,
      start: _0x9b6c6.start.date()
    }))) : "No clear date/time detected by chrono.js";
    const _0x20c720 = _0x16ec15 || "Asia/Kolkata";
    const _0x524de0 = moment().tz(_0x20c720).format("YYYY-MM-DD HH:mm:ss z");
    return "You are a smart reminder assistant. Analyze the following message and extract reminder information.\n\nMessage: \"" + _0x46e8e1 + "\"\n" + _0x3e8239 + "\nDefault timezone: " + _0x20c720 + "\nCurrent time: " + _0x524de0 + "\n\nRespond with a JSON object containing:\n{\n  \"action\": \"create|update|cancel|cancel_all|list|clarify\",\n  \"reminder_text\": \"clean, concise reminder description (convert 'my' to 'your' when appropriate for bot perspective)\",\n  \"scheduled_time\": \"ISO 8601 datetime string in " + _0x20c720 + " timezone (NOT UTC!)\",\n  \"timezone\": \"" + _0x20c720 + "\",\n  \"recurrence_type\": \"daily|weekly|monthly|yearly|null\",\n  \"recurrence_interval\": \"number (e.g., 2 for every 2 days)\",\n  \"recurrence_end_date\": \"ISO 8601 datetime string or null\",\n  \"confidence\": \"0.0-1.0 confidence score\",\n  \"reasoning\": \"brief explanation of your interpretation\"\n}\n\nCRITICAL: The scheduled_time MUST be in " + _0x20c720 + " timezone, NOT UTC!\nExample: If user says \"6 pm today\" and current time is 5:30 PM " + _0x20c720 + ",\nthe scheduled_time should be \"2025-11-08T18:00:00+05:30\" (for Asia/Kolkata),\nNOT \"2025-11-08T18:00:00Z\" or \"2025-11-08T12:30:00Z\"\n\nRules:\n1. CRITICAL: If the message is ONLY \"cancel all\", \"delete all\", \"clear all\", \"remove all\" (with NO other context), set action to \"cancel_all\" - do NOT ask for clarification\n2. If the message is asking to cancel/delete ALL reminders (e.g., \"cancel all reminders\", \"delete all my reminders\", \"clear all reminders\"), set action to \"cancel_all\"\n3. If the message is asking to cancel/delete a single reminder, set action to \"cancel\"\n4. If asking to list reminders, set action to \"list\"\n5. If updating an existing reminder, set action to \"update\"\n6. If no clear time is specified for a NEW reminder, ask for clarification by setting action to \"clarify\"\n7. Always use future dates/times\n8. For relative times like \"tomorrow\", \"next week\", calculate the actual datetime relative to current time in " + _0x20c720 + "\n9. For recurring reminders, set appropriate recurrence_type and recurrence_interval\n10. Default to \"create\" for new reminders\n11. ALWAYS use " + _0x20c720 + " as the timezone in your response - this is critical for proper scheduling\n12. Be conservative - if unsure about the time for a NEW reminder, set confidence low and action to \"clarify\"\n13. When calculating future times, add the time to the current time in " + _0x20c720 + ", not UTC\n14. Recognize common abbreviations: \"mins/mnts\" = minutes, \"hrs\" = hours, \"secs\" = seconds, \"tmrw\" = tomorrow\n15. For time expressions like \"in X minutes/hours\", add that duration to current time\n16. IMPORTANT: When user says \"at X pm/am today\" or \"at X pm/am\", set the time to EXACTLY that hour, do NOT add it to current time\n17. Example: If current time is 5:30 PM and user says \"at 6 pm today\", the scheduled time should be 6:00 PM (18:00), NOT 11:30 PM\n18. \"at 6 pm\" means 18:00 hours, \"at 6 am\" means 06:00 hours - use 24-hour format internally\n\nExamples:\n- \"Remind me to call mom tomorrow at 3pm\" → reminder_text: \"call mom\", scheduled_time: tomorrow at 15:00\n- \"Set a reminder for my meeting next Monday at 10am\" → reminder_text: \"for your meeting\", scheduled_time: next Monday at 10:00\n- \"Remind me to check my emails\" → reminder_text: \"check your emails\", action: \"clarify\" (no time specified)\n- \"Remind me to take my medicine\" → reminder_text: \"take your medicine\", action: \"clarify\" (no time specified)\n- \"Remind me to call John in 5 mins\" → reminder_text: \"call John\", scheduled_time: current_time + 5 minutes\n- \"Remind me to call soham at 6 pm today\" → reminder_text: \"call soham\", scheduled_time: TODAY at 18:00 (NOT current_time + 6 hours!)\n- \"Please remind me at 9 am tomorrow\" → scheduled_time: tomorrow at 09:00\n- \"Please remind me to call Deepali in mnts\" → reminder_text: \"call Deepali\", action: \"clarify\" (need exact minutes)\n- \"Cancel my reminder\" → action: \"cancel\"\n- \"Cancel all reminders\" → action: \"cancel_all\"\n- \"Delete all my reminders\" → action: \"cancel_all\"\n- \"Clear everything\" → action: \"cancel_all\"\n- \"What are my reminders?\" → action: \"list\"\n- \"Remind me to take medicine every day at 8am\" → create with daily recurrence, scheduled_time: today/tomorrow at 08:00\n\nIMPORTANT: Always convert possessive pronouns from user's perspective to bot's perspective:\n- \"my emails\" → \"your emails\"\n- \"my medicine\" → \"your medicine\"\n- \"my meeting\" → \"your meeting\"\n\nRespond only with valid JSON.";
  }
  async processWithOpenAI(_0x2211b3, _0x3123e2) {
    try {
      this.logger.info("🔍 OpenAI API call starting...");
      this.logger.info("🔍 API Key: " + (_0x3123e2.ai_api_key ? _0x3123e2.ai_api_key.substring(0, 10) + "..." : "NOT SET"));
      this.logger.info("🔍 Model: " + (_0x3123e2.ai_model || "gpt-4o-mini"));
      if (!this.openaiClient && _0x3123e2.ai_api_key) {
        this.openaiClient = new OpenAI({
          apiKey: _0x3123e2.ai_api_key
        });
        this.logger.info("✅ OpenAI client initialized");
      }
      if (!this.openaiClient) {
        throw new Error("OpenAI API key not configured");
      }
      let _0x49cbf7 = _0x3123e2.ai_model || "gpt-4o-mini";
      if (_0x49cbf7 === "gpt-3.5-turbo") {
        _0x49cbf7 = "gpt-4o-mini";
      } else if (_0x49cbf7 === "gpt-4") {
        _0x49cbf7 = "gpt-4o";
      } else if (_0x49cbf7 === "gpt-4-turbo") {
        _0x49cbf7 = "gpt-4o";
      }
      this.logger.info("🔍 Request data:", JSON.stringify({
        model: _0x49cbf7,
        temperature: _0x3123e2.ai_temperature || 0.3,
        max_tokens: 1000,
        promptLength: _0x2211b3.length
      }, null, 2));
      const _0x1aa39d = await this.openaiClient.chat.completions.create({
        model: _0x49cbf7,
        messages: [{
          role: "user",
          content: _0x2211b3
        }],
        temperature: _0x3123e2.ai_temperature || 0.3,
        max_tokens: 1000
      });
      this.logger.info("🔍 OpenAI API response received");
      this.logger.info("🔍 Response data:", JSON.stringify({
        model: _0x1aa39d.model,
        usage: _0x1aa39d.usage,
        choices: _0x1aa39d.choices.length
      }, null, 2));
      const _0x36d361 = _0x1aa39d.choices[0].message.content;
      this.logger.info("🔍 Extracted content:", _0x36d361);
      return _0x36d361;
    } catch (_0x2d5684) {
      this.logger.error("❌ Error with OpenAI processing:", _0x2d5684);
      if (_0x2d5684.response) {
        this.logger.error("❌ Response status:", _0x2d5684.response.status);
        this.logger.error("❌ Response data:", JSON.stringify(_0x2d5684.response.data, null, 2));
        this.logger.error("❌ Response headers:", JSON.stringify(_0x2d5684.response.headers, null, 2));
      } else if (_0x2d5684.request) {
        this.logger.error("❌ Request error (no response):", _0x2d5684.request);
      } else {
        this.logger.error("❌ Error message:", _0x2d5684.message);
      }
      if (_0x2d5684.message.includes("API key") || _0x2d5684.status === 401 || !_0x3123e2.ai_api_key) {
        this.logger.warn("⚠️ OpenAI API key invalid or missing, using fallback parsing");
        return this.fallbackParsing(_0x2211b3);
      }
      this.logger.warn("⚠️ OpenAI API failed, using fallback parsing");
      return this.fallbackParsing(_0x2211b3);
    }
  }
  fallbackParsing(_0x5bfd2b) {
    const _0x137ecc = _0x5bfd2b.match(/Message: "(.+?)"/);
    const _0x4a2354 = _0x137ecc ? _0x137ecc[1] : "";
    const _0x3460cb = _0x4a2354.toLowerCase();
    if ((_0x3460cb.includes("cancel") || _0x3460cb.includes("delete") || _0x3460cb.includes("remove") || _0x3460cb.includes("clear")) && (_0x3460cb.includes("all") || _0x3460cb.includes("everything") || _0x3460cb.includes("every"))) {
      return JSON.stringify({
        action: "cancel_all",
        reminder_text: "",
        scheduled_time: null,
        timezone: "Asia/Kolkata",
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.9,
        reasoning: "Detected cancel all reminders keywords"
      });
    }
    if (_0x3460cb.includes("cancel") || _0x3460cb.includes("delete") || _0x3460cb.includes("remove")) {
      return JSON.stringify({
        action: "cancel",
        reminder_text: "",
        scheduled_time: null,
        timezone: "Asia/Kolkata",
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.8,
        reasoning: "Detected cancel/delete keywords"
      });
    }
    if (_0x3460cb.includes("list") || _0x3460cb.includes("show") || _0x3460cb.includes("what are my")) {
      return JSON.stringify({
        action: "list",
        reminder_text: "",
        scheduled_time: null,
        timezone: "Asia/Kolkata",
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.8,
        reasoning: "Detected list keywords"
      });
    }
    let _0x11a34d = _0x4a2354;
    _0x11a34d = _0x11a34d.replace(/\bmnts?\b/gi, "minutes");
    _0x11a34d = _0x11a34d.replace(/\bmins?\b/gi, "minutes");
    _0x11a34d = _0x11a34d.replace(/\bhrs?\b/gi, "hours");
    _0x11a34d = _0x11a34d.replace(/\bsecs?\b/gi, "seconds");
    _0x11a34d = _0x11a34d.replace(/\btmrw\b/gi, "tomorrow");
    const _0x2e6df3 = _0x11a34d.match(/\bin\s+(\d+)\s+(minutes?|hours?|seconds?)/i);
    if (_0x2e6df3) {
      const _0x5aa464 = parseInt(_0x2e6df3[1]);
      const _0x2baa44 = _0x2e6df3[2].toLowerCase();
      const _0x575c84 = moment().tz("Asia/Kolkata");
      let _0xa7cb02;
      if (_0x2baa44.startsWith("minute")) {
        _0xa7cb02 = _0x575c84.add(_0x5aa464, "minutes");
      } else if (_0x2baa44.startsWith("hour")) {
        _0xa7cb02 = _0x575c84.add(_0x5aa464, "hours");
      } else if (_0x2baa44.startsWith("second")) {
        _0xa7cb02 = _0x575c84.add(_0x5aa464, "seconds");
      }
      if (_0xa7cb02) {
        const _0x3721df = _0x11a34d.replace(/\bin\s+\d+\s+(minutes?|hours?|seconds?)/i, "").replace(/remind me to|please remind me to|set a reminder to/i, "").trim();
        return JSON.stringify({
          action: "create",
          reminder_text: _0x3721df || "Reminder",
          scheduled_time: _0xa7cb02.toISOString(),
          timezone: "Asia/Kolkata",
          recurrence_type: null,
          recurrence_interval: null,
          recurrence_end_date: null,
          confidence: 0.7,
          reasoning: "Parsed relative time: in " + _0x5aa464 + " " + _0x2baa44
        });
      }
    }
    const _0x140e8b = chrono.parse(_0x11a34d, new Date(), {
      forwardDate: true
    });
    if (_0x140e8b.length > 0) {
      const _0x292cad = _0x140e8b[0];
      const _0x2859d7 = "Asia/Kolkata";
      const _0x3cfd99 = _0x292cad.start.date();
      const _0x3ad441 = moment.tz({
        year: _0x3cfd99.getFullYear(),
        month: _0x3cfd99.getMonth(),
        day: _0x3cfd99.getDate(),
        hour: _0x3cfd99.getHours(),
        minute: _0x3cfd99.getMinutes(),
        second: _0x3cfd99.getSeconds()
      }, _0x2859d7).toISOString();
      return JSON.stringify({
        action: "create",
        reminder_text: _0x4a2354.replace(_0x292cad.text, "").trim() || "Reminder",
        scheduled_time: _0x3ad441,
        timezone: _0x2859d7,
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.6,
        reasoning: "Basic chrono-node parsing without AI"
      });
    }
    const _0x34e771 = _0x11a34d.match(/\bin\s+(minutes?|mins?|mnts?|hours?|hrs?|seconds?|secs?)\b/i);
    if (_0x34e771) {
      const _0x35dd2f = _0x34e771[1].toLowerCase();
      let _0x515619 = "minutes";
      if (_0x35dd2f.startsWith("hour") || _0x35dd2f === "hrs") {
        _0x515619 = "hours";
      }
      if (_0x35dd2f.startsWith("second") || _0x35dd2f === "secs") {
        _0x515619 = "seconds";
      }
      return JSON.stringify({
        action: "clarify",
        reminder_text: _0x4a2354,
        scheduled_time: null,
        timezone: "Asia/Kolkata",
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.6,
        reasoning: "Incomplete time specification: need number of " + _0x515619,
        message: "I understand you want a reminder, but could you please specify how many " + _0x515619 + "? For example: \"remind me to call Deepali in 5 " + _0x515619 + "\""
      });
    }
    return JSON.stringify({
      action: "clarify",
      reminder_text: _0x4a2354,
      scheduled_time: null,
      timezone: "Asia/Kolkata",
      recurrence_type: null,
      recurrence_interval: null,
      recurrence_end_date: null,
      confidence: 0.3,
      reasoning: "No clear date/time detected, need clarification"
    });
  }
  parseAIResponse(_0x508a3c) {
    try {
      let _0x328d68 = _0x508a3c.trim();
      if (_0x328d68.startsWith("```json")) {
        _0x328d68 = _0x328d68.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (_0x328d68.startsWith("```")) {
        _0x328d68 = _0x328d68.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const _0x39a708 = JSON.parse(_0x328d68);
      if (!_0x39a708.action) {
        throw new Error("Missing action field in AI response");
      }
      const _0x2c3360 = ["create", "update", "cancel", "list", "clarify"];
      if (!_0x2c3360.includes(_0x39a708.action)) {
        throw new Error("Invalid action: " + _0x39a708.action);
      }
      if ((_0x39a708.action === "create" || _0x39a708.action === "update") && _0x39a708.scheduled_time) {
        const _0x2501f6 = moment(_0x39a708.scheduled_time);
        if (!_0x2501f6.isValid()) {
          throw new Error("Invalid scheduled_time format");
        }
        if (_0x2501f6.isBefore(moment())) {
          throw new Error("Scheduled time must be in the future");
        }
      }
      return _0x39a708;
    } catch (_0x248fac) {
      this.logger.error("Error parsing AI response:", _0x248fac);
      this.logger.error("AI response text:", _0x508a3c);
      return {
        action: "clarify",
        reminder_text: "",
        scheduled_time: null,
        timezone: "Asia/Kolkata",
        recurrence_type: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        confidence: 0.1,
        reasoning: "Failed to parse AI response"
      };
    }
  }
}
module.exports = NaturalLanguageProcessor;