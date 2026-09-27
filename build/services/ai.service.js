const {
  EventEmitter
} = require("events");
const OpenAI = require("openai");
const {
  GoogleGenerativeAI
} = require("@google/generative-ai");
class AIService extends EventEmitter {
  constructor(_0x124840) {
    super();
    this.databaseService = _0x124840;
    this.activeConversations = new Map();
    this.rateLimits = new Map();
    this.logger = require("pino")({
      level: "info"
    });
    this.documentService = null;
  }
  async initialize(_0x3743eb) {
    this.database = _0x3743eb;
    try {
      const _0x46d8a3 = require("./document.service");
      this.documentService = new _0x46d8a3();
      await this.documentService.initialize(_0x3743eb);
    } catch (_0x1e1020) {
      console.error("❌ AI SERVICE INIT: Failed to initialize document service:", _0x1e1020);
      this.documentService = null;
    }
  }
  async processMessage(_0xb01ae5, _0xeb8304, _0xda426c, _0x5a050e) {
    try {
      this.logger.info("🔍 Starting processMessage with chatbot: " + _0x5a050e.name + " (ID: " + _0x5a050e.id + ")");
      if (!_0xda426c || !_0xda426c.text || _0xda426c.text.trim().length === 0) {
        return {
          success: false,
          error: "Invalid message: Message text is required"
        };
      }
      if (_0xda426c.text.length > 4000) {
        return {
          success: false,
          error: "Message too long. Please keep messages under 4000 characters."
        };
      }
      if (!this.checkRateLimit(_0xeb8304)) {
        return {
          success: false,
          error: "Rate limit exceeded. Please wait before sending another message."
        };
      }
      this.logger.info("🤖 Using provided chatbot: " + (_0x5a050e ? "Found" : "Not found"));
      if (_0x5a050e) {
        this.logger.info("🤖 Chatbot active: " + _0x5a050e.is_active + ", Provider: " + _0x5a050e.provider + ", API Key: " + (_0x5a050e.api_key ? "Present" : "Missing"));
      } else {
        this.logger.error("🤖 No chatbot provided");
      }
      if (!_0x5a050e || !_0x5a050e.is_active) {
        return {
          success: false,
          error: "Chatbot not found or inactive"
        };
      }
      if (!_0x5a050e.api_key || _0x5a050e.api_key.trim().length === 0) {
        return {
          success: false,
          error: "API key not configured for this chatbot"
        };
      }
      const _0x5722da = await this.getOrCreateConversation(_0x5a050e.id, _0xb01ae5, _0xeb8304);
      const _0x3edaf9 = await this.getConversationContext(_0x5722da.id);
      let _0x5f50ef = _0x5a050e.language;
      if (JSON.parse(_0x5a050e.features || "{}").multiLanguage) {
        _0x5f50ef = await this.detectLanguage(_0xda426c.text);
      }
      let _0xce84d2 = null;
      if (JSON.parse(_0x5a050e.features || "{}").sentimentAnalysis) {
        _0xce84d2 = await this.analyzeSentiment(_0xda426c.text);
      }
      const _0x5a001a = await this.recognizeIntent(_0x5a050e.id, _0xda426c.text);
      let _0x52ad21;
      try {
        _0x52ad21 = await this.generateResponse(_0x5a050e, _0xda426c.text, _0x3edaf9, {
          language: _0x5f50ef,
          sentiment: _0xce84d2,
          intent: _0x5a001a
        });
      } catch (_0x1dbe6f) {
        this.logger.error("🚨 AI SERVICE ERROR in generateResponse:", _0x1dbe6f);
        this.logger.error("🚨 ERROR MESSAGE:", _0x1dbe6f.message);
        this.logger.error("🚨 ERROR STACK:", _0x1dbe6f.stack);
        return {
          success: false,
          error: "AI processing failed: " + (_0x1dbe6f.message || "Unknown error"),
          details: _0x1dbe6f.stack
        };
      }
      await this.saveMessage(_0x5722da.id, "user", _0xda426c.text, {
        language: _0x5f50ef,
        sentiment: _0xce84d2,
        intent: _0x5a001a?.name
      });
      await this.saveMessage(_0x5722da.id, "bot", _0x52ad21.content, {
        tokens_used: _0x52ad21.tokensUsed,
        processing_time: _0x52ad21.processingTime,
        confidence_score: _0x52ad21.confidence
      });
      await this.updateConversation(_0x5722da.id, {
        message_count: _0x3edaf9.messageCount + 2,
        language_detected: _0x5f50ef,
        sentiment_score: _0xce84d2?.score,
        intent_detected: _0x5a001a?.name
      });
      return {
        success: true,
        response: _0x52ad21.content,
        metadata: {
          conversationId: _0x5722da.id,
          language: _0x5f50ef,
          sentiment: _0xce84d2,
          intent: _0x5a001a,
          confidence: _0x52ad21.confidence
        }
      };
    } catch (_0x3f4419) {
      if (process.env.NODE_ENV === "development") {
        console.error("🚨 AI SERVICE MAIN CATCH:", _0x3f4419);
        console.error("🚨 ERROR MESSAGE:", _0x3f4419.message);
        console.error("🚨 ERROR STACK:", _0x3f4419.stack);
        console.error("🚨 ERROR NAME:", _0x3f4419.name);
      }
      this.logger.error("Error processing AI message:", _0x3f4419.message || String(_0x3f4419));
      this.logger.error("Error stack:", _0x3f4419.stack || "No stack trace");
      return {
        success: false,
        error: "Failed to process message with AI: " + (_0x3f4419.message || String(_0x3f4419))
      };
    }
  }
  async generateResponse(_0x5fe8f6, _0x32bb1e, _0x5008b1, _0x5d96cc) {
    const _0x1b7c3c = Date.now();
    try {
      let _0x25bf06;
      if (_0x5fe8f6.provider === "openai") {
        _0x25bf06 = await this.generateOpenAIResponse(_0x5fe8f6, _0x32bb1e, _0x5008b1, _0x5d96cc);
      } else if (_0x5fe8f6.provider === "gemini") {
        _0x25bf06 = await this.generateGeminiResponse(_0x5fe8f6, _0x32bb1e, _0x5008b1, _0x5d96cc);
      } else {
        throw new Error("Unsupported AI provider: " + _0x5fe8f6.provider + ". Supported providers: OpenAI, Gemini");
      }
      const _0x508112 = (Date.now() - _0x1b7c3c) / 1000;
      return {
        content: _0x25bf06.content,
        tokensUsed: _0x25bf06.tokensUsed || 0,
        processingTime: _0x508112,
        confidence: _0x25bf06.confidence || 0.8
      };
    } catch (_0x3118fb) {
      console.error("🚨 Error generating AI response:", _0x3118fb.message);
      console.error("🚨 Error stack:", _0x3118fb.stack);
      console.error("🚨 Error details:", {
        message: _0x3118fb.message,
        response: _0x3118fb.response?.data,
        status: _0x3118fb.response?.status,
        chatbotProvider: _0x5fe8f6.provider,
        chatbotModel: _0x5fe8f6.model
      });
      this.logger.error("Error generating AI response:", _0x3118fb.message);
      this.logger.error("Error details:", {
        message: _0x3118fb.message,
        stack: _0x3118fb.stack,
        response: _0x3118fb.response?.data,
        status: _0x3118fb.response?.status,
        chatbotProvider: _0x5fe8f6.provider,
        chatbotModel: _0x5fe8f6.model
      });
      return {
        content: _0x5fe8f6.fallback_message || "I apologize, but I'm having trouble understanding. Could you please rephrase your question?",
        tokensUsed: 0,
        processingTime: (Date.now() - _0x1b7c3c) / 1000,
        confidence: 0.1
      };
    }
  }
  async generateOpenAIResponse(_0x3d6a53, _0x43cb9f, _0x4dd351, _0x1ba9da) {
    try {
      if (!_0x3d6a53.api_key || _0x3d6a53.api_key.trim().length === 0) {
        throw new Error("OpenAI API key is missing or invalid");
      }
      const _0x22a338 = new OpenAI({
        apiKey: _0x3d6a53.api_key
      });
      const _0x3a6d52 = [{
        role: "system",
        content: this.buildSystemPrompt(_0x3d6a53, _0x1ba9da)
      }];
      if (_0x4dd351.messages && _0x4dd351.messages.length > 0) {
        const _0x4a41a5 = _0x4dd351.messages.slice(-10);
        _0x4a41a5.forEach(_0x339955 => {
          _0x3a6d52.push({
            role: _0x339955.message_type === "user" ? "user" : "assistant",
            content: _0x339955.content
          });
        });
      }
      if (this.documentService && _0x3d6a53.use_documents) {
        try {
          const _0x2fd747 = await this.documentService.getDocumentContext(_0x3d6a53.id, _0x43cb9f);
          if (_0x2fd747.length > 0) {
            let _0x35f55c = "Relevant information from uploaded documents:\n\n";
            _0x2fd747.forEach((_0x4ae34f, _0x51b4d0) => {
              const _0x396ea4 = _0x4ae34f.content.substring(0, 500);
              _0x35f55c += "[Document " + (_0x51b4d0 + 1) + ": " + _0x4ae34f.original_filename + "]\n" + _0x396ea4 + "\n\n";
            });
            _0x35f55c += "Use this information to provide accurate answers when relevant.";
            _0x3a6d52.push({
              role: "system",
              content: _0x35f55c
            });
          }
        } catch (_0x2660bc) {
          this.logger.error("⚠️ Document context error:", _0x2660bc.message);
        }
      }
      _0x3a6d52.push({
        role: "user",
        content: _0x43cb9f
      });
      let _0x53ea10 = _0x3d6a53.model || "gpt-4o-mini";
      if (_0x53ea10 === "gpt-3.5-turbo") {
        _0x53ea10 = "gpt-4o-mini";
      } else if (_0x53ea10 === "gpt-4") {
        _0x53ea10 = "gpt-4o";
      } else if (_0x53ea10 === "gpt-4-turbo") {
        _0x53ea10 = "gpt-4o";
      }
      const _0x7b2980 = await _0x22a338.chat.completions.create({
        model: _0x53ea10,
        messages: _0x3a6d52,
        temperature: _0x3d6a53.temperature || 0.7,
        max_tokens: _0x3d6a53.max_tokens || 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });
      if (!_0x7b2980 || !_0x7b2980.choices || _0x7b2980.choices.length === 0) {
        throw new Error("OpenAI returned empty response");
      }
      return {
        content: _0x7b2980.choices[0].message.content,
        tokensUsed: _0x7b2980.usage?.total_tokens || 0,
        confidence: 0.9
      };
    } catch (_0x17d26f) {
      if (_0x17d26f.status === 401) {
        throw new Error("Invalid OpenAI API key. Please check your API key configuration.");
      } else if (_0x17d26f.status === 429) {
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      } else if (_0x17d26f.status === 500 || _0x17d26f.status === 503) {
        throw new Error("OpenAI service is temporarily unavailable. Please try again later.");
      } else if (_0x17d26f.code === "insufficient_quota") {
        throw new Error("OpenAI API quota exceeded. Please check your billing.");
      } else {
        throw new Error("OpenAI API error: " + (_0x17d26f.message || "Unknown error"));
      }
    }
  }
  async generateGeminiResponse(_0x425d93, _0x3786bf, _0x4de9a3, _0x39ea56) {
    try {
      if (!_0x425d93.api_key || _0x425d93.api_key.trim().length === 0) {
        throw new Error("Gemini API key is missing or invalid");
      }
      const _0x4c140a = new GoogleGenerativeAI(_0x425d93.api_key);
      let _0x1abe96 = _0x425d93.model || "gemini-2.5-flash";
      const _0x1ae008 = {
        "gemini-1.5-flash": "gemini-2.5-flash",
        "gemini-1.5-pro": "gemini-2.5-pro",
        "gemini-1.0-pro": "gemini-2.5-flash",
        "gemini-pro": "gemini-2.5-flash",
        "gemini-flash": "gemini-2.5-flash",
        "gemini-2.5-flash": "gemini-2.5-flash",
        "gemini-2.5-pro": "gemini-2.5-pro"
      };
      _0x1abe96 = _0x1ae008[_0x1abe96] || "gemini-2.5-flash";
      const _0x27387b = this.buildSystemPrompt(_0x425d93, _0x39ea56);
      const _0x391c78 = _0x4c140a.getGenerativeModel({
        model: _0x1abe96,
        systemInstruction: _0x27387b
      });
      const _0x4870db = [];
      if (_0x4de9a3.messages && _0x4de9a3.messages.length > 0) {
        const _0x1ae3ca = _0x4de9a3.messages.slice(-10);
        _0x1ae3ca.forEach(_0x523e56 => {
          _0x4870db.push({
            role: _0x523e56.message_type === "user" ? "user" : "model",
            parts: [{
              text: _0x523e56.content
            }]
          });
        });
      }
      if (this.documentService && _0x425d93.use_documents) {
        try {
          const _0x1e0a60 = await this.documentService.getDocumentContext(_0x425d93.id, _0x3786bf);
          if (_0x1e0a60.length > 0) {
            let _0x29043f = "Relevant information from uploaded documents:\n\n";
            _0x1e0a60.forEach((_0x5148b9, _0x2d20cf) => {
              const _0x38530c = _0x5148b9.content.substring(0, 500);
              _0x29043f += "[Document " + (_0x2d20cf + 1) + ": " + _0x5148b9.original_filename + "]\n" + _0x38530c + "\n\n";
            });
            _0x29043f += "Use this information to provide accurate answers when relevant.";
            _0x4870db.push({
              role: "user",
              parts: [{
                text: _0x29043f
              }]
            });
            _0x4870db.push({
              role: "model",
              parts: [{
                text: "I have reviewed the document information and will use it to answer questions."
              }]
            });
          }
        } catch (_0x58d624) {
          this.logger.error("⚠️ Document context error:", _0x58d624.message);
        }
      }
      const _0x426d02 = _0x391c78.startChat({
        history: _0x4870db,
        generationConfig: {
          temperature: _0x425d93.temperature || 0.7,
          maxOutputTokens: _0x425d93.max_tokens || 1000
        }
      });
      const _0x177b5e = await _0x426d02.sendMessage(_0x3786bf);
      const _0x39569a = await _0x177b5e.response;
      const _0x4013a4 = _0x39569a.text();
      if (!_0x4013a4 || _0x4013a4.trim().length === 0) {
        throw new Error("Gemini returned empty response");
      }
      return {
        content: _0x4013a4,
        tokensUsed: 0,
        confidence: 0.9
      };
    } catch (_0x2a84e5) {
      if (_0x2a84e5.message && _0x2a84e5.message.includes("API_KEY_INVALID")) {
        throw new Error("Invalid Gemini API key. Please check your API key configuration.");
      } else if (_0x2a84e5.message && _0x2a84e5.message.includes("RATE_LIMIT_EXCEEDED")) {
        throw new Error("Gemini rate limit exceeded. Please try again later.");
      } else if (_0x2a84e5.message && _0x2a84e5.message.includes("QUOTA_EXCEEDED")) {
        throw new Error("Gemini API quota exceeded. Please check your billing.");
      } else {
        throw new Error("Gemini API error: " + (_0x2a84e5.message || "Unknown error"));
      }
    }
  }
  buildSystemPrompt(_0x340189, _0x422a66) {
    let _0x55a81d = _0x340189.system_prompt || _0x340189.description || "You are a helpful AI assistant.";
    const _0x191990 = {
      professional: "Maintain a professional and courteous tone.",
      friendly: "Be warm, friendly, and approachable in your responses.",
      casual: "Use a casual, relaxed tone like talking to a friend.",
      formal: "Use formal language and maintain proper etiquette.",
      enthusiastic: "Be energetic, positive, and enthusiastic."
    };
    if (_0x191990[_0x340189.personality]) {
      _0x55a81d += " " + _0x191990[_0x340189.personality];
    }
    const _0x1c8c37 = {
      healthcare: "You are assisting in a healthcare context. Be empathetic and provide helpful health-related information while noting that you cannot replace professional medical advice.",
      education: "You are helping in an educational context. Be patient, encouraging, and focus on helping users learn.",
      ecommerce: "You are assisting customers with their shopping needs. Be helpful with product information, orders, and customer service.",
      restaurant: "You are helping customers with restaurant services including menu information, reservations, and orders.",
      business: "You are assisting with business-related inquiries. Be professional and focus on business solutions."
    };
    if (_0x1c8c37[_0x340189.industry]) {
      _0x55a81d += " " + _0x1c8c37[_0x340189.industry];
    }
    if (_0x422a66.language && _0x422a66.language !== "en") {
      _0x55a81d += " Please respond in " + this.getLanguageName(_0x422a66.language) + ".";
    }
    if (_0x422a66.sentiment) {
      if (_0x422a66.sentiment.label === "negative") {
        _0x55a81d += " The user seems upset or frustrated. Be extra empathetic and helpful.";
      } else if (_0x422a66.sentiment.label === "positive") {
        _0x55a81d += " The user seems happy or satisfied. Match their positive energy.";
      }
    }
    return _0x55a81d;
  }
  async detectLanguage(_0x515491) {
    const _0x1428b6 = {
      es: /\b(hola|gracias|por favor|sí|no|cómo|qué|dónde)\b/i,
      fr: /\b(bonjour|merci|s'il vous plaît|oui|non|comment|que|où)\b/i,
      de: /\b(hallo|danke|bitte|ja|nein|wie|was|wo)\b/i,
      pt: /\b(olá|obrigado|por favor|sim|não|como|que|onde)\b/i,
      it: /\b(ciao|grazie|per favore|sì|no|come|che|dove)\b/i
    };
    for (const [_0x1956a9, _0x9ca1af] of Object.entries(_0x1428b6)) {
      if (_0x9ca1af.test(_0x515491)) {
        return _0x1956a9;
      }
    }
    return "en";
  }
  async analyzeSentiment(_0x4ad5c6) {
    const _0x40a944 = ["good", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "like", "happy", "satisfied"];
    const _0x150ca7 = ["bad", "terrible", "awful", "horrible", "hate", "dislike", "angry", "frustrated", "disappointed", "upset"];
    const _0x46e7e8 = _0x4ad5c6.toLowerCase().split(/\s+/);
    let _0x102222 = 0;
    let _0x4dbcb7 = 0;
    _0x46e7e8.forEach(_0x19a9cd => {
      if (_0x40a944.includes(_0x19a9cd)) {
        _0x102222++;
      }
      if (_0x150ca7.includes(_0x19a9cd)) {
        _0x4dbcb7++;
      }
    });
    let _0x33990e = "neutral";
    let _0x127d8b = 0;
    if (_0x102222 > _0x4dbcb7) {
      _0x33990e = "positive";
      _0x127d8b = Math.min(_0x102222 / _0x46e7e8.length * 10, 1);
    } else if (_0x4dbcb7 > _0x102222) {
      _0x33990e = "negative";
      _0x127d8b = Math.max(-_0x4dbcb7 / _0x46e7e8.length * 10, -1);
    }
    return {
      label: _0x33990e,
      score: _0x127d8b
    };
  }
  checkRateLimit(_0x58eed9) {
    const _0x183033 = Date.now();
    const _0x2684f8 = this.rateLimits.get(_0x58eed9);
    if (!_0x2684f8) {
      this.rateLimits.set(_0x58eed9, {
        count: 1,
        resetTime: _0x183033 + 60000
      });
      return true;
    }
    if (_0x183033 > _0x2684f8.resetTime) {
      this.rateLimits.set(_0x58eed9, {
        count: 1,
        resetTime: _0x183033 + 60000
      });
      return true;
    }
    if (_0x2684f8.count >= 10) {
      return false;
    }
    _0x2684f8.count++;
    return true;
  }
  getLanguageName(_0x21ca53) {
    const _0x519776 = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      pt: "Portuguese",
      it: "Italian"
    };
    return _0x519776[_0x21ca53] || "English";
  }
  async getChatbot(_0xf702bd) {
    try {
      this.logger.info("🔍 Getting chatbot with ID: " + _0xf702bd);
      const _0x49cd91 = await this.databaseService.get("\n        SELECT c.*, p.name as provider_name, p.type as provider, p.api_key, p.model, p.temperature, p.max_tokens\n        FROM ai_chatbots c\n        LEFT JOIN ai_providers p ON c.provider_id = p.id\n        WHERE c.id = ? AND c.is_active = 1 AND p.is_active = 1\n      ", [_0xf702bd]);
      this.logger.info("🔍 Database result:", JSON.stringify(_0x49cd91, null, 2));
      return _0x49cd91;
    } catch (_0x2c4df9) {
      this.logger.error("Error getting chatbot:", _0x2c4df9);
      return null;
    }
  }
  async getOrCreateConversation(_0x308ff8, _0x5eaa29, _0x1b0eac) {
    try {
      this.logger.info("🔍 [CONVERSATION] Checking for active conversation: chatbot=" + _0x308ff8 + ", session=" + _0x5eaa29 + ", user=" + _0x1b0eac);
      let _0x129163 = await this.databaseService.get("\n        SELECT * FROM ai_conversations\n        WHERE chatbot_id = ? AND session_id = ? AND user_phone = ? AND status = 'active'\n        ORDER BY created_at DESC LIMIT 1\n      ", [_0x308ff8, _0x5eaa29, _0x1b0eac]);
      if (!_0x129163) {
        this.logger.info("🔍 [CONVERSATION] No active conversation found, creating new one for user " + _0x1b0eac);
        const _0x58c08f = "conv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const _0x3a402c = await this.databaseService.run("\n          INSERT INTO ai_conversations (\n            chatbot_id, session_id, user_phone, conversation_id, status, created_at, updated_at\n          ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n        ", [_0x308ff8, _0x5eaa29, _0x1b0eac, _0x58c08f]);
        this.logger.info("✅ [CONVERSATION] Created new conversation ID: " + _0x3a402c.data.lastID + " for user " + _0x1b0eac);
        _0x129163 = {
          id: _0x3a402c.data.lastID,
          chatbot_id: _0x308ff8,
          session_id: _0x5eaa29,
          user_phone: _0x1b0eac,
          conversation_id: _0x58c08f,
          status: "active",
          message_count: 0
        };
      } else {
        this.logger.info("✅ [CONVERSATION] Found existing active conversation ID: " + _0x129163.id + " for user " + _0x1b0eac);
      }
      return _0x129163;
    } catch (_0x5cdd80) {
      this.logger.error("❌ [CONVERSATION] Error getting/creating conversation:", _0x5cdd80);
      this.logger.error("❌ [CONVERSATION] Error details:", _0x5cdd80.message, _0x5cdd80.stack);
      throw _0x5cdd80;
    }
  }
  async getConversationContext(_0x1bafd3) {
    try {
      const _0x3e9c4f = await this.databaseService.all("\n        SELECT * FROM ai_messages\n        WHERE conversation_id = ?\n        ORDER BY created_at ASC\n      ", [_0x1bafd3]);
      const _0x2ee8b7 = await this.databaseService.get("\n        SELECT * FROM ai_conversations WHERE id = ?\n      ", [_0x1bafd3]);
      return {
        messages: _0x3e9c4f || [],
        messageCount: _0x3e9c4f?.length || 0,
        conversation: _0x2ee8b7
      };
    } catch (_0x20371d) {
      this.logger.error("Error getting conversation context:", _0x20371d);
      return {
        messages: [],
        messageCount: 0
      };
    }
  }
  async saveMessage(_0xaf39cb, _0xb0e263, _0x484478, _0xb716a4 = {}) {
    try {
      await this.databaseService.run("\n        INSERT INTO ai_messages (\n          conversation_id, message_type, content, metadata,\n          tokens_used, processing_time, confidence_score,\n          intent, sentiment, language, created_at\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n      ", [_0xaf39cb, _0xb0e263, _0x484478, JSON.stringify(_0xb716a4), _0xb716a4.tokens_used || null, _0xb716a4.processing_time || null, _0xb716a4.confidence_score || null, _0xb716a4.intent || null, _0xb716a4.sentiment || null, _0xb716a4.language || null]);
    } catch (_0x1cc279) {
      this.logger.error("Error saving message:", _0x1cc279);
    }
  }
  async updateConversation(_0x2ddd1d, _0xc41179) {
    try {
      const _0x599a2f = Object.keys(_0xc41179).map(_0x223609 => _0x223609 + " = ?").join(", ");
      const _0x52f3a5 = Object.values(_0xc41179);
      _0x52f3a5.push(_0x2ddd1d);
      await this.databaseService.run("\n        UPDATE ai_conversations\n        SET " + _0x599a2f + ", updated_at = CURRENT_TIMESTAMP\n        WHERE id = ?\n      ", _0x52f3a5);
    } catch (_0x2fee49) {
      this.logger.error("Error updating conversation:", _0x2fee49);
    }
  }
  async recognizeIntent(_0x12929f, _0xe648c3) {
    try {
      const _0x14edb5 = await this.databaseService.all("\n        SELECT * FROM ai_intents\n        WHERE chatbot_id = ? AND is_active = 1\n        ORDER BY confidence_threshold DESC\n      ", [_0x12929f]);
      for (const _0x332ce0 of _0x14edb5) {
        const _0x11fa57 = JSON.parse(_0x332ce0.training_phrases || "[]");
        for (const _0x46d03e of _0x11fa57) {
          if (this.calculateSimilarity(_0xe648c3.toLowerCase(), _0x46d03e.toLowerCase()) > _0x332ce0.confidence_threshold) {
            return {
              id: _0x332ce0.id,
              name: _0x332ce0.name,
              confidence: this.calculateSimilarity(_0xe648c3.toLowerCase(), _0x46d03e.toLowerCase()),
              action_type: _0x332ce0.action_type,
              action_data: JSON.parse(_0x332ce0.action_data || "{}")
            };
          }
        }
      }
      return null;
    } catch (_0x124461) {
      this.logger.error("Error recognizing intent:", _0x124461);
      return null;
    }
  }
  calculateSimilarity(_0x261fe6, _0x366648) {
    const _0x182535 = _0x261fe6.split(/\s+/);
    const _0x2ba467 = _0x366648.split(/\s+/);
    let _0x420e41 = 0;
    _0x182535.forEach(_0x496b8b => {
      if (_0x2ba467.includes(_0x496b8b)) {
        _0x420e41++;
      }
    });
    return _0x420e41 / Math.max(_0x182535.length, _0x2ba467.length);
  }
  async getChatbotsForSession(_0x3d4493) {
    try {
      const _0x2c17ed = await this.databaseService.all("\n        SELECT c.*, p.name as provider_name, p.type as provider, p.api_key, p.model, p.temperature, p.max_tokens\n        FROM ai_chatbots c\n        LEFT JOIN ai_providers p ON c.provider_id = p.id\n        WHERE c.is_active = 1 AND p.is_active = 1 AND (\n          c.session_ids LIKE '%\"" + _0x3d4493 + "\"%' OR\n          c.session_ids = '[]' OR\n          c.session_ids IS NULL\n        )\n        ORDER BY c.created_at DESC\n      ");
      const _0x117511 = _0x2c17ed.data || [];
      this.logger.info("🤖 AI Service: Found " + _0x117511.length + " active chatbots for session " + _0x3d4493);
      _0x117511.forEach(_0x31dce4 => {
        this.logger.info("🤖 AI Service: Active chatbot: " + _0x31dce4.name + " (ID: " + _0x31dce4.id + ")");
      });
      return _0x117511;
    } catch (_0x9c021e) {
      this.logger.error("Error getting chatbots for session:", _0x9c021e);
      return [];
    }
  }
  clearChatbotCache(_0x22982e) {
    this.logger.info("🧹 AI Service: Clearing cache for deleted chatbot " + _0x22982e);
  }
  async endConversation(_0x2d9b2f, _0x4a86dd = "completed") {
    try {
      await this.databaseService.run("\n        UPDATE ai_conversations\n        SET status = ?, updated_at = CURRENT_TIMESTAMP\n        WHERE id = ?\n      ", [_0x4a86dd, _0x2d9b2f]);
    } catch (_0x206def) {
      this.logger.error("Error ending conversation:", _0x206def);
    }
  }
  async recordFeedback(_0x36aaaf, _0x5da082, _0x564283 = null) {
    try {
      const _0x114739 = await this.databaseService.get("\n        SELECT * FROM ai_conversations WHERE id = ?\n      ", [_0x36aaaf]);
      if (_0x114739) {
        const _0x42a75a = await this.databaseService.get("\n          SELECT * FROM ai_messages\n          WHERE conversation_id = ? AND message_type = 'bot'\n          ORDER BY created_at DESC LIMIT 1\n        ", [_0x36aaaf]);
        const _0xe29986 = await this.databaseService.get("\n          SELECT * FROM ai_messages\n          WHERE conversation_id = ? AND message_type = 'user'\n          ORDER BY created_at DESC LIMIT 1\n        ", [_0x36aaaf]);
        if (_0x42a75a && _0xe29986) {
          await this.databaseService.run("\n            INSERT INTO ai_learning_data (\n              chatbot_id, conversation_id, user_input, bot_response,\n              user_feedback, correction, context, created_at\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n          ", [_0x114739.chatbot_id, _0x36aaaf, _0xe29986.content, _0x42a75a.content, _0x5da082, _0x564283, JSON.stringify({
            conversation_context: _0x114739.context
          })]);
        }
      }
    } catch (_0x367fc9) {
      this.logger.error("Error recording feedback:", _0x367fc9);
    }
  }
}
module.exports = AIService;