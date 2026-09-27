const AIService = require("./ai.service");
class AIWhatsAppIntegration {
  constructor(_0x550dcf, _0x294ae4, _0x8a65ab = null) {
    this.whatsappService = _0x550dcf;
    this.databaseService = _0x294ae4;
    this.aiService = _0x8a65ab || new AIService(_0x294ae4);
    this.logger = require("pino")({
      level: "info"
    });
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.whatsappService.on("message_received", async _0x41dafd => {
      await this.handleIncomingMessage(_0x41dafd);
    });
    this.logger.info("AI WhatsApp integration initialized");
  }
  async handleIncomingMessage(_0x497d9a) {
    try {
      const {
        sessionId: _0x26d718,
        message: _0x1c8116,
        formattedMessage: _0x3bcbda
      } = _0x497d9a;
      this.logger.info("🤖 AI Integration received message for session " + _0x26d718);
      if (_0x1c8116.key.fromMe) {
        this.logger.debug("Skipping message from bot itself");
        return;
      }
      if (_0x1c8116._flowProcessed) {
        this.logger.info("🤖 ⏭️ Skipping AI processing - message already processed by flow-based chatbot system");
        return;
      }
      const _0xf28eb4 = _0x1c8116.key.remoteJid.replace("@s.whatsapp.net", "");
      const _0x2e83ea = _0x3bcbda.text || _0x3bcbda.caption || "";
      this.logger.info("🤖 Processing message: \"" + _0x2e83ea + "\" from " + _0xf28eb4 + " in session " + _0x26d718);
      const _0x2a695c = await this.databaseService.get("\n        SELECT cc.*, cf.name as flow_name FROM chatbot_conversations cc\n        JOIN chatbot_flows cf ON cc.flow_id = cf.id\n        WHERE cc.session_id = ? AND cc.user_phone = ? AND cc.is_active = 1\n        ORDER BY cc.last_activity DESC\n        LIMIT 1\n      ", [_0x26d718, _0xf28eb4]);
      if (_0x2a695c) {
        this.logger.info("🤖 ⏭️ Skipping AI processing - active flow-based conversation found: \"" + _0x2a695c.flow_name + "\" (ID: " + _0x2a695c.id + ")");
        return;
      }
      const _0x2c60b5 = await this.aiService.getChatbotsForSession(_0x26d718);
      this.logger.info("🤖 Found " + _0x2c60b5.length + " active chatbots for session " + _0x26d718);
      if (_0x2c60b5.length === 0) {
        this.logger.debug("No active AI chatbots found for session " + _0x26d718);
        return;
      }
      let _0x1e07b8 = false;
      for (const _0x49f99e of _0x2c60b5) {
        this.logger.info("🤖 Checking chatbot: " + _0x49f99e.name + " (ID: " + _0x49f99e.id + ")");
        const _0x220820 = await this.processMessageWithChatbot(_0x26d718, _0xf28eb4, _0x3bcbda, _0x49f99e);
        if (_0x220820) {
          _0x1e07b8 = true;
          break;
        }
      }
      if (_0x1e07b8) {
        _0x3bcbda._aiProcessed = true;
        _0x1c8116._aiProcessed = true;
      }
    } catch (_0x2163f8) {
      this.logger.error("Error handling incoming message for AI:", _0x2163f8);
    }
  }
  async processMessageWithChatbot(_0x2d4650, _0x17373a, _0xda0228, _0x2e2070) {
    try {
      this.logger.info("🔍 [AI CHATBOT] Processing message from " + _0x17373a + " with chatbot \"" + _0x2e2070.name + "\" (ID: " + _0x2e2070.id + ")");
      const _0x3da32c = await this.shouldChatbotRespond(_0x2e2070, _0xda0228, _0x2d4650, _0x17373a);
      this.logger.info("🔍 [AI CHATBOT] Should respond: " + _0x3da32c);
      if (!_0x3da32c) {
        this.logger.info("🔍 [AI CHATBOT] Chatbot \"" + _0x2e2070.name + "\" will not respond to this message");
        return false;
      }
      this.logger.info("✅ [AI CHATBOT] Processing message with AI chatbot: " + _0x2e2070.name);
      this.logger.info("🤖 Chatbot details: ID=" + _0x2e2070.id + ", Provider=" + _0x2e2070.provider + ", API Key=" + (_0x2e2070.api_key ? "Present" : "Missing") + ", Model=" + _0x2e2070.model);
      let _0x495277;
      try {
        _0x495277 = await this.aiService.processMessage(_0x2d4650, _0x17373a, _0xda0228, _0x2e2070);
      } catch (_0x332ae0) {
        this.logger.error("AI processing error:", _0x332ae0.message || String(_0x332ae0));
        this.logger.error("Error stack:", _0x332ae0.stack || "No stack trace");
        this.logger.error("Error details:", {
          name: _0x332ae0.name,
          message: _0x332ae0.message,
          stack: _0x332ae0.stack,
          cause: _0x332ae0.cause,
          toString: String(_0x332ae0)
        });
        return false;
      }
      if (!_0x495277 || !_0x495277.success) {
        this.logger.error("AI processing failed:", _0x495277?.error || "Unknown error");
        this.logger.error("Full AI result:", JSON.stringify(_0x495277, null, 2));
        return false;
      }
      this.logger.info("🔍 About to add response delay and send typing indicator");
      if (_0x2e2070.response_delay > 0) {
        this.logger.info("🔍 Adding response delay: " + _0x2e2070.response_delay + "ms");
        await this.delay(_0x2e2070.response_delay);
      }
      this.logger.info("🔍 About to send typing indicator");
      try {
        await this.whatsappService.sendPresenceUpdate("composing", _0xda0228.from);
        await this.delay(1000);
        this.logger.info("🔍 Typing indicator sent successfully");
      } catch (_0x4a487e) {
        this.logger.error("🔍 Error sending typing indicator (continuing anyway):", _0x4a487e.message);
      }
      this.logger.info("🔍 About to send AI response");
      try {
        await this.sendAIResponse(_0x2d4650, _0x17373a, _0x495277, _0x2e2070);
        this.logger.info("🔍 AI response sent successfully");
      } catch (_0x49dec3) {
        this.logger.error("🚨 CRITICAL ERROR: Failed to send AI response:", {
          error: _0x49dec3.message,
          stack: _0x49dec3.stack,
          userPhone: _0x17373a,
          sessionId: _0x2d4650,
          chatbotId: _0x2e2070.id
        });
      }
      if (_0x495277.metadata.intent) {
        try {
          await this.handleIntentAction(_0x2d4650, _0x17373a, _0x495277.metadata.intent, _0x2e2070);
        } catch (_0x2fce53) {
          this.logger.error("🚨 ERROR handling intent action:", _0x2fce53.message);
        }
      }
      return true;
    } catch (_0x348d06) {
      this.logger.error("🚨 DETAILED ERROR in processMessageWithChatbot:", {
        message: _0x348d06.message,
        stack: _0x348d06.stack,
        name: _0x348d06.name,
        cause: _0x348d06.cause,
        toString: String(_0x348d06),
        userPhone: _0x17373a,
        sessionId: _0x2d4650,
        chatbotId: _0x2e2070?.id,
        chatbotName: _0x2e2070?.name
      });
      return false;
    }
  }
  async shouldChatbotRespond(_0x180f9b, _0x966919, _0x14ba40, _0xc39dec) {
    this.logger.info("🤖 Checking if chatbot \"" + _0x180f9b.name + "\" should respond");
    if (!_0x966919.text && !_0x966919.caption) {
      this.logger.debug("Message has no text or caption, skipping");
      return false;
    }
    const _0x5dbef6 = JSON.parse(_0x180f9b.session_ids || "[]");
    this.logger.info("🤖 Chatbot session IDs: " + JSON.stringify(_0x5dbef6) + ", Message session: " + _0x14ba40);
    if (_0x5dbef6.length > 0 && !_0x5dbef6.includes(_0x14ba40)) {
      this.logger.info("Session " + _0x14ba40 + " not in chatbot's allowed sessions");
      return false;
    }
    const _0x4b5ce0 = (_0x966919.text || _0x966919.caption || "").toLowerCase().trim();
    this.logger.info("🤖 Processing message text: \"" + _0x4b5ce0 + "\"");
    const _0x765491 = JSON.parse(_0x180f9b.stop_keywords || "[]");
    this.logger.info("🤖 Stop keywords: " + JSON.stringify(_0x765491));
    if (_0x765491.length > 0) {
      for (const _0x18c288 of _0x765491) {
        if (_0x4b5ce0.includes(_0x18c288.toLowerCase().trim())) {
          this.logger.info("Stop keyword \"" + _0x18c288 + "\" matched, AI will stop responding and end conversation");
          await this.endActiveConversation(_0x180f9b.id, _0x14ba40, _0xc39dec);
          return false;
        }
      }
    }
    const _0x5e2586 = await this.hasActiveConversation(_0x180f9b.id, _0x14ba40, _0xc39dec);
    this.logger.info("🔍 [SHOULD RESPOND] Has active conversation: " + _0x5e2586);
    if (_0x5e2586) {
      this.logger.info("✅ [SHOULD RESPOND] Active conversation found, AI will continue responding");
      return true;
    }
    const _0x239552 = JSON.parse(_0x180f9b.trigger_keywords || "[]");
    this.logger.info("🔍 [SHOULD RESPOND] Trigger keywords: " + JSON.stringify(_0x239552));
    this.logger.info("🔍 [SHOULD RESPOND] Message text to match: \"" + _0x4b5ce0 + "\"");
    if (_0x239552.length > 0) {
      let _0x35509c = false;
      for (const _0x55d5c7 of _0x239552) {
        const _0x5a2079 = _0x55d5c7.toLowerCase().trim();
        this.logger.info("🔍 [SHOULD RESPOND] Checking keyword: \"" + _0x5a2079 + "\" against message: \"" + _0x4b5ce0 + "\"");
        if (_0x4b5ce0.includes(_0x5a2079)) {
          this.logger.info("✅ [SHOULD RESPOND] Trigger keyword \"" + _0x55d5c7 + "\" matched, AI will respond");
          _0x35509c = true;
          break;
        } else {
          this.logger.info("❌ [SHOULD RESPOND] Trigger keyword \"" + _0x55d5c7 + "\" did NOT match");
        }
      }
      if (!_0x35509c) {
        this.logger.info("❌ [SHOULD RESPOND] No trigger keywords matched for message: \"" + _0x4b5ce0 + "\"");
        return false;
      }
    } else {
      this.logger.info("🔍 [SHOULD RESPOND] No trigger keywords defined, will respond to all messages");
    }
    this.logger.info("✅ [SHOULD RESPOND] All checks passed, AI will respond");
    return true;
  }
  async hasActiveConversation(_0x27e342, _0x35b9cc, _0x25ce87) {
    try {
      this.logger.info("🔍 Checking for active conversation: chatbot=" + _0x27e342 + ", session=" + _0x35b9cc + ", user=" + _0x25ce87);
      const _0x501bc3 = await this.databaseService.get("\n        SELECT id FROM ai_conversations\n        WHERE chatbot_id = ? AND session_id = ? AND user_phone = ? AND status = 'active'\n        LIMIT 1\n      ", [_0x27e342, _0x35b9cc, _0x25ce87]);
      this.logger.info("🔍 Active conversation query result: " + JSON.stringify(_0x501bc3));
      const _0x5c9a0a = _0x501bc3 !== null;
      this.logger.info("🔍 Has active conversation: " + _0x5c9a0a);
      return _0x5c9a0a;
    } catch (_0x19cd6e) {
      this.logger.error("Error checking active conversation:", _0x19cd6e);
      return false;
    }
  }
  async endActiveConversation(_0xb298ac, _0x295b81, _0x3c5b5a) {
    try {
      await this.databaseService.run("\n        UPDATE ai_conversations\n        SET status = 'ended', updated_at = CURRENT_TIMESTAMP\n        WHERE chatbot_id = ? AND session_id = ? AND user_phone = ? AND status = 'active'\n      ", [_0xb298ac, _0x295b81, _0x3c5b5a]);
      this.logger.info("Ended active conversation for chatbot " + _0xb298ac + ", session " + _0x295b81 + ", user " + _0x3c5b5a);
    } catch (_0x4baacf) {
      this.logger.error("Error ending active conversation:", _0x4baacf);
    }
  }
  async sendAIResponse(_0x261c34, _0x2bd7ea, _0xab681d, _0x4165ae) {
    try {
      this.logger.info("🤖 📤 Starting to send AI response to " + _0x2bd7ea);
      this.logger.info("🤖 📤 AI Response content: \"" + _0xab681d.response + "\"");
      let _0x429446;
      if (_0x2bd7ea.includes("@")) {
        _0x429446 = _0x2bd7ea;
        this.logger.info("🤖 📤 User phone already has suffix: " + _0x429446);
      } else {
        _0x429446 = _0x2bd7ea + "@s.whatsapp.net";
        this.logger.info("🤖 📤 Added @s.whatsapp.net suffix: " + _0x429446);
      }
      let _0x46ce44 = _0xab681d.response;
      if (typeof _0x46ce44 === "object") {
        if (_0x46ce44 && _0x46ce44.text) {
          _0x46ce44 = _0x46ce44.text;
        } else if (_0x46ce44 && _0x46ce44.content) {
          _0x46ce44 = _0x46ce44.content;
        } else {
          this.logger.warn("🤖 ⚠️ AI response is an object, converting to string: " + JSON.stringify(_0x46ce44));
          _0x46ce44 = JSON.stringify(_0x46ce44);
        }
      }
      if (typeof _0x46ce44 !== "string") {
        this.logger.warn("🤖 ⚠️ AI response is not a string, converting: " + _0x46ce44);
        _0x46ce44 = String(_0x46ce44);
      }
      if (!_0x46ce44 || _0x46ce44.trim() === "" || _0x46ce44 === "[object Object]") {
        this.logger.error("🤖 ❌ Invalid AI response content: \"" + _0x46ce44 + "\"");
        _0x46ce44 = "I apologize, but I'm having trouble generating a response right now. Please try again.";
      }
      this.logger.info("🤖 📤 Sanitized response text: \"" + _0x46ce44 + "\"");
      const _0x1fbbb6 = JSON.parse(_0x4165ae.features || "{}");
      let _0x43917c = {
        text: _0x46ce44
      };
      this.logger.info("🤖 📤 Message content prepared: " + JSON.stringify(_0x43917c));
      if (_0x1fbbb6.decisionTree && _0xab681d.metadata.intent?.action_type === "flow") {
        _0x43917c = await this.buildFlowResponse(_0xab681d.metadata.intent.action_data, _0x46ce44);
      } else if (_0x1fbbb6.formCollection && _0xab681d.metadata.intent?.action_type === "form") {
        _0x43917c = await this.buildFormResponse(_0xab681d.metadata.intent.action_data, _0x46ce44);
      }
      this.logger.info("🤖 📤 Calling whatsappService.sendMessage with sessionId: " + _0x261c34 + ", recipientJid: " + _0x429446);
      const _0x3950cc = this.whatsappService.sendMessage(_0x261c34, _0x429446, _0x43917c, "text");
      const _0x3ce2ec = new Promise(_0xa059c => setTimeout(() => _0xa059c({
        success: false,
        error: "Send message timeout"
      }), 10000));
      const _0x59b41d = await Promise.race([_0x3950cc, _0x3ce2ec]);
      this.logger.info("🤖 📤 WhatsApp send result: " + JSON.stringify(_0x59b41d));
      if (_0x59b41d.success) {
        this.logger.info("🤖 ✅ AI response sent successfully to " + _0x2bd7ea);
        try {
          await this.recordInteraction(_0xab681d.metadata.conversationId, "response_sent", {
            messageId: _0x59b41d.messageId,
            responseLength: _0xab681d.response.length,
            confidence: _0xab681d.metadata.confidence
          });
        } catch (_0x562e48) {
          this.logger.error("🤖 ⚠️ Failed to record interaction (message still sent):", _0x562e48.message);
        }
      } else {
        this.logger.error("🤖 ❌ Failed to send AI response: " + _0x59b41d.error);
        throw new Error("Failed to send AI response: " + _0x59b41d.error);
      }
    } catch (_0x5a8ffb) {
      this.logger.error("🚨 DETAILED ERROR in sendAIResponse:", {
        message: _0x5a8ffb.message,
        stack: _0x5a8ffb.stack,
        userPhone: _0x2bd7ea,
        sessionId: _0x261c34,
        chatbotId: _0x4165ae.id,
        chatbotName: _0x4165ae.name
      });
      throw _0x5a8ffb;
    }
  }
  async buildFlowResponse(_0xaf8f11, _0x53e49e) {
    try {
      if (!_0xaf8f11.flowId) {
        return {
          text: _0x53e49e
        };
      }
      const _0x2ec5b0 = await this.databaseService.get("\n        SELECT * FROM ai_decision_flows WHERE id = ? AND is_active = 1\n      ", [_0xaf8f11.flowId]);
      if (!_0x2ec5b0) {
        return {
          text: _0x53e49e
        };
      }
      const _0x2e1050 = JSON.parse(_0x2ec5b0.flow_data || "{}");
      if (_0x2e1050.buttons && _0x2e1050.buttons.length > 0) {
        return {
          text: _0x53e49e,
          footer: _0x2e1050.footer || "Please select an option:",
          buttons: _0x2e1050.buttons.map((_0x3732d8, _0x260b0e) => ({
            buttonId: "flow_" + _0x2ec5b0.id + "_" + _0x260b0e,
            buttonText: {
              displayText: _0x3732d8.text
            },
            type: 1
          }))
        };
      }
      return {
        text: _0x53e49e
      };
    } catch (_0x1d8856) {
      this.logger.error("Error building flow response:", _0x1d8856);
      return {
        text: _0x53e49e
      };
    }
  }
  async buildFormResponse(_0x538806, _0x5524a2) {
    try {
      if (!_0x538806.formId) {
        return {
          text: _0x5524a2
        };
      }
      const _0x5454c8 = await this.databaseService.get("\n        SELECT * FROM ai_form_templates WHERE id = ? AND is_active = 1\n      ", [_0x538806.formId]);
      if (!_0x5454c8) {
        return {
          text: _0x5524a2
        };
      }
      const _0x274bf1 = JSON.parse(_0x5454c8.fields || "[]");
      if (_0x274bf1.length > 0) {
        const _0x2352a1 = _0x274bf1[0];
        return {
          text: _0x5524a2 + "\n\n📝 Let's collect some information.\n\n" + _0x2352a1.label + ":"
        };
      }
      return {
        text: _0x5524a2
      };
    } catch (_0x1f3fc5) {
      this.logger.error("Error building form response:", _0x1f3fc5);
      return {
        text: _0x5524a2
      };
    }
  }
  async handleIntentAction(_0x5d13c3, _0x2140fc, _0x3abd18, _0x600651) {
    try {
      switch (_0x3abd18.action_type) {
        case "escalate":
          await this.escalateToHuman(_0x5d13c3, _0x2140fc, _0x3abd18.action_data);
          break;
        case "appointment":
          await this.handleAppointmentBooking(_0x5d13c3, _0x2140fc, _0x3abd18.action_data, _0x600651);
          break;
        case "form":
          await this.startFormCollection(_0x5d13c3, _0x2140fc, _0x3abd18.action_data);
          break;
        default:
          break;
      }
    } catch (_0x4e78cc) {
      this.logger.error("Error handling intent action:", _0x4e78cc);
    }
  }
  async escalateToHuman(_0xbf7794, _0x19607a, _0x271611) {
    try {
      const _0x446351 = _0x19607a + "@s.whatsapp.net";
      const _0x1a971b = _0x271611.message || "I'm connecting you with a human agent who can better assist you. Please wait a moment.";
      await this.whatsappService.sendMessage(_0xbf7794, _0x446351, {
        text: _0x1a971b
      }, "text");
      this.logger.info("Conversation escalated to human for user " + _0x19607a);
    } catch (_0x85672f) {
      this.logger.error("Error escalating to human:", _0x85672f);
    }
  }
  async handleAppointmentBooking(_0x27b420, _0x37bf0d, _0x357aef, _0x5a4713) {
    try {
      const _0x28c80a = _0x37bf0d + "@s.whatsapp.net";
      const _0x1562b7 = {
        text: "📅 I can help you book an appointment!\n\nPlease let me know:\n1. Preferred date\n2. Preferred time\n3. Type of appointment\n\nExample: \"Tomorrow at 2 PM for consultation\""
      };
      await this.whatsappService.sendMessage(_0x27b420, _0x28c80a, _0x1562b7, "text");
    } catch (_0x177966) {
      this.logger.error("Error handling appointment booking:", _0x177966);
    }
  }
  async startFormCollection(_0x223398, _0x3cf88a, _0x2993f2) {
    try {
      this.logger.info("Starting form collection for user " + _0x3cf88a);
    } catch (_0x2112cd) {
      this.logger.error("Error starting form collection:", _0x2112cd);
    }
  }
  async recordInteraction(_0x3bf0fb, _0x5eff0c, _0x2bb9d5) {
    try {
      this.logger.debug("Recording interaction: " + _0x5eff0c, _0x2bb9d5);
    } catch (_0x3d109f) {
      this.logger.error("Error recording interaction:", _0x3d109f);
    }
  }
  delay(_0x698dc4) {
    return new Promise(_0x440b77 => setTimeout(_0x440b77, _0x698dc4));
  }
  async getStatistics(_0x2251e9, _0x55dd10 = 30) {
    try {
      const _0x25242d = await this.databaseService.get("\n        SELECT \n          COUNT(DISTINCT conversation_id) as total_conversations,\n          COUNT(*) as total_messages,\n          AVG(confidence_score) as avg_confidence,\n          COUNT(CASE WHEN message_type = 'bot' THEN 1 END) as bot_messages,\n          COUNT(CASE WHEN message_type = 'user' THEN 1 END) as user_messages\n        FROM ai_messages m\n        JOIN ai_conversations c ON m.conversation_id = c.id\n        WHERE c.chatbot_id = ? AND m.created_at >= datetime('now', '-" + _0x55dd10 + " days')\n      ", [_0x2251e9]);
      return _0x25242d || {};
    } catch (_0x11f14e) {
      this.logger.error("Error getting AI statistics:", _0x11f14e);
      return {};
    }
  }
}
module.exports = AIWhatsAppIntegration;