const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  MessageType,
  MessageOptions,
  Browsers,
  delay,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  downloadContentFromMessage,
  getContentType,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  bytesToCrockford
} = require("@innovatorssoft/baileys");
const {
  Boom
} = require("@hapi/boom");
const pino = require("pino");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const os = require("os");
const {
  EventEmitter
} = require("events");
const NodeCache = require("node-cache");
const BulkMessageFeaturesService = require("./bulk-message-features.service");
const OptOutService = require("./opt-out.service");
const PollTrackingService = require("./poll-tracking.service");
const ProxyAgentService = require("./proxy-agent.service");
const MessageStore = require("./message-store.service");
const RecipientResolver = require("./recipient-resolver.service");
const {
  devLog,
  devWarn,
  devError,
  logError
} = require("../utils/logger");
class AntiFlagConfigError extends Error {
  constructor(_0x7694a8, _0x11fac8) {
    super("Anti-flag setting \"" + _0x7694a8 + "\" could not be applied: " + _0x11fac8);
    this.name = "AntiFlagConfigError";
    this.setting = _0x7694a8;
    this.reason = _0x11fac8;
  }
}
const CAROUSEL_MIN_CARDS = 2;
const CAROUSEL_MAX_CARDS = 10;
const CAROUSEL_MEDIA_UPLOAD_TIMEOUT_MS = 30000;
const CAROUSEL_SEND_CODES = Object.freeze({
  CARD_COUNT_OUT_OF_RANGE: "carousel_card_count_out_of_range",
  MEDIA_UPLOAD_FAILED: "carousel_media_upload_failed"
});
class CarouselSendError extends Error {
  constructor(_0x5d2550, _0x3bc479, _0x4c1dce) {
    super(_0x4c1dce || "Carousel card " + _0x5d2550 + ": media upload failed");
    this.name = "CarouselSendError";
    this.cardIndex = _0x5d2550;
    this.reason = _0x3bc479;
    this.code = _0x3bc479;
  }
}
class WhatsAppService extends EventEmitter {
  constructor(_0xd2035b = null) {
    super();
    this.sessions = new Map();
    this.sessionStates = new Map();
    this.stores = new Map();
    const {
      app: _0x3f09b0
    } = require("electron");
    const _0x5f57bd = _0x3f09b0.getPath("userData") || require("os").tmpdir();
    this.authDir = path.join(_0x5f57bd, "auth_sessions");
    this.lidLogFile = path.join(_0x5f57bd, "lid-resolution.log");
    this.logger = pino({
      level: "silent"
    });
    this.databaseService = _0xd2035b;
    this.bulkMessageFeatures = null;
    this.optOutService = null;
    this.pollTrackingService = null;
    this.proxyAgentService = new ProxyAgentService();
    this.messageStore = null;
    this.richMessageService = null;
    this.linkPreviewService = null;
    this.decryptionRecovery = null;
    this._pendingDecryptionRetries = new Set();
    this.retryStorePruneTimer = null;
    this.retryStorePruneIntervalMs = 86400000;
    this.manualDisconnections = new Set();
    this.reconnectionAttempts = new Map();
    this.connectionHealthChecks = new Map();
    this.maxReconnectionAttempts = 8;
    this.baseReconnectionDelay = 1500;
    this.connectionStabilityMetrics = new Map();
    this.lastSuccessfulConnection = new Map();
    this.conflictDetection = new Map();
    this.pollMessageCache = new Map();
    this.permanentPollCache = new Map();
    this.processedVotes = new Set();
    this.migrateSessionsFromWebXSuite();
    this.fileOperationLocks = new Map();
    this.isShuttingDown = false;
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, {
        recursive: true
      });
    }
    this.groupMetadataCache = new Map();
    this.groupMetadataTTLms = 300000;
    this.pollMessageCache = new Map();
    this.pollCacheTTLms = 86400000;
    this.pollVoteCheckInterval = null;
    this.baileysVersion = null;
    this.isLatestVersion = false;
    this.versionFallbackNotices = [];
    this.versionRecheckTimer = null;
    this.versionRecheckIntervalMs = 43200000;
    this.msgRetryCounterCache = new NodeCache({
      stdTTL: 3600
    });
    this.defaultPushName = "Lead Wave";
    this._versionInitPromise = this.initializeBaileysVersion();
  }
  async _fetchVersionFromUrl(_0x45702d, _0x26c018) {
    try {
      const _0x46fd09 = require("axios");
      const {
        data: _0x569aca
      } = await _0x46fd09.get(_0x45702d, {
        timeout: 8000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const _0x5d6397 = typeof _0x569aca === "string" ? _0x569aca.match(_0x26c018) : JSON.stringify(_0x569aca).match(_0x26c018);
      if (_0x5d6397?.[1]) {
        return [2, 3000, +_0x5d6397[1]];
      }
      return null;
    } catch (_0x4e08b8) {
      return null;
    }
  }
  _isValidWaVersion(_0xc24fed) {
    return Array.isArray(_0xc24fed) && _0xc24fed.length === 3 && _0xc24fed.every(_0x491d33 => Number.isInteger(_0x491d33) && _0x491d33 >= 0);
  }
  _isNewerVersion(_0x19fa92, _0x587a0d) {
    if (!this._isValidWaVersion(_0x19fa92)) {
      return false;
    }
    if (!this._isValidWaVersion(_0x587a0d)) {
      return true;
    }
    for (let _0xddb7e7 = 0; _0xddb7e7 < 3; _0xddb7e7++) {
      if (_0x19fa92[_0xddb7e7] > _0x587a0d[_0xddb7e7]) {
        return true;
      }
      if (_0x19fa92[_0xddb7e7] < _0x587a0d[_0xddb7e7]) {
        return false;
      }
    }
    return false;
  }
  _selectVersion(_0x5e2b5a, _0x578bd2) {
    if (this._isValidWaVersion(_0x5e2b5a)) {
      return {
        version: _0x5e2b5a,
        usedFallback: false
      };
    }
    return {
      version: _0x578bd2,
      usedFallback: true,
      reason: _0x5e2b5a == null ? "current WhatsApp Web version could not be fetched" : "fetched version is not a well-formed three-component identifier"
    };
  }
  _recordVersionFallbackNotice(_0x25345d) {
    const _0x5767ab = {
      reason: _0x25345d,
      at: new Date().toISOString(),
      fallbackVersion: this._isValidWaVersion(this.baileysVersion) ? [...this.baileysVersion] : null
    };
    this.versionFallbackNotices.push(_0x5767ab);
    this.logger.warn("WA version-fallback notice: " + _0x25345d + " (using " + (_0x5767ab.fallbackVersion ? _0x5767ab.fallbackVersion.join(".") : "unknown") + ")");
    return _0x5767ab;
  }
  _adoptVersion(_0x4664d4, _0x28e3a5) {
    this.baileysVersion = _0x4664d4;
    this.isLatestVersion = true;
    this.logger.info("WA version adopted from " + _0x28e3a5 + ": " + _0x4664d4.join("."));
  }
  async _fetchCurrentWaVersion() {
    const _0x1ac963 = await this._fetchVersionFromUrl("https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json", /"version"\s*:\s*\[2\s*,\s*3000\s*,\s*(\d+)\]/);
    if (_0x1ac963) {
      return {
        version: _0x1ac963,
        source: "WhiskeySockets"
      };
    }
    const _0x58f6b0 = await this._fetchVersionFromUrl("https://web.whatsapp.com/sw.js", /client_revision[^:]*:\s*(\d+)/);
    if (_0x58f6b0) {
      return {
        version: _0x58f6b0,
        source: "sw.js"
      };
    }
    return {
      version: null,
      source: null
    };
  }
  async _recheckBaileysVersion() {
    try {
      const {
        version: _0x2ecdca,
        source: _0xc9f2eb
      } = await this._fetchCurrentWaVersion();
      if (!this._isValidWaVersion(_0x2ecdca)) {
        this._recordVersionFallbackNotice(_0x2ecdca == null ? "re-check could not fetch the current WhatsApp Web version" : "re-check fetched version is not a well-formed three-component identifier");
        return;
      }
      if (this._isNewerVersion(_0x2ecdca, this.baileysVersion)) {
        this._adoptVersion(_0x2ecdca, (_0xc9f2eb || "remote") + " (re-check)");
      }
    } catch (_0x168a0e) {
      this._recordVersionFallbackNotice("re-check version fetch failed: " + (_0x168a0e?.message || _0x168a0e));
    }
  }
  _startVersionRecheckTimer() {
    if (this.versionRecheckTimer) {
      return;
    }
    this.versionRecheckTimer = setInterval(() => {
      this._recheckBaileysVersion().catch(() => {});
    }, this.versionRecheckIntervalMs);
    if (typeof this.versionRecheckTimer.unref === "function") {
      this.versionRecheckTimer.unref();
    }
    this.logger.info("WA version re-check scheduled every " + Math.round(this.versionRecheckIntervalMs / 3600000) + "h");
  }
  stopVersionRechecking() {
    if (this.versionRecheckTimer) {
      clearInterval(this.versionRecheckTimer);
      this.versionRecheckTimer = null;
    }
  }
  async initializeBaileysVersion() {
    const _0x5ab07e = [2, 3000, 1044805427];
    this.baileysVersion = _0x5ab07e;
    this.isLatestVersion = false;
    this.logger.info("WA version (fallback set immediately): " + _0x5ab07e.join("."));
    setImmediate(async () => {
      try {
        const {
          version: _0x311d8d,
          source: _0xfdd3f2
        } = await this._fetchCurrentWaVersion();
        const _0x58b66d = this._selectVersion(_0x311d8d, _0x5ab07e);
        if (_0x58b66d.usedFallback) {
          this._recordVersionFallbackNotice(_0x58b66d.reason);
        } else {
          this._adoptVersion(_0x58b66d.version, _0xfdd3f2 || "remote");
        }
      } catch (_0x32dd3c) {
        this._recordVersionFallbackNotice("version fetch failed: " + (_0x32dd3c?.message || _0x32dd3c));
      } finally {
        this._startVersionRecheckTimer();
      }
    });
  }
  _groupCacheKey(_0x2a190b, _0x50d602) {
    return _0x2a190b + ":" + _0x50d602;
  }
  getCachedGroupMetadata(_0x5ea23a, _0x5b32e9) {
    const _0x40612a = this._groupCacheKey(_0x5ea23a, _0x5b32e9);
    const _0x2b2657 = this.groupMetadataCache.get(_0x40612a);
    if (!_0x2b2657) {
      return null;
    }
    if (Date.now() - _0x2b2657.ts > this.groupMetadataTTLms) {
      this.groupMetadataCache.delete(_0x40612a);
      return null;
    }
    return _0x2b2657.data;
  }
  setGroupMetadataCache(_0x3c5844, _0x32765c, _0x89808b) {
    const _0x569e91 = this._groupCacheKey(_0x3c5844, _0x32765c);
    this.groupMetadataCache.set(_0x569e91, {
      data: _0x89808b,
      ts: Date.now()
    });
  }
  _isGroupJid(_0x16f14e) {
    return typeof _0x16f14e === "string" && _0x16f14e.endsWith("@g.us");
  }
  _getMediaPipeline() {
    if (!this.mediaPipeline) {
      const _0x1c1f5b = require("./media-pipeline.service");
      this.mediaPipeline = new _0x1c1f5b({
        logger: this.logger
      });
    }
    return this.mediaPipeline;
  }
  _getInteractiveBuilder() {
    if (!this.interactiveBuilder) {
      const _0x47fd84 = require("./interactive-builder");
      this.interactiveBuilder = new _0x47fd84({
        logger: this.logger
      });
    }
    return this.interactiveBuilder;
  }
  _getRecipientResolver() {
    if (!this.recipientResolver) {
      this.recipientResolver = new RecipientResolver({
        databaseService: this.databaseService,
        getSocket: _0x34191b => this.sessions.get(_0x34191b),
        logger: this.logger
      });
    }
    return this.recipientResolver;
  }
  _getRichMessageService() {
    if (!this.richMessageService) {
      const _0x22e29d = require("./rich-message.service");
      this.richMessageService = new _0x22e29d({
        logger: this.logger,
        databaseService: this.databaseService
      });
    }
    return this.richMessageService;
  }
  _getLinkPreviewService() {
    if (!this.linkPreviewService) {
      const {
        LinkPreviewService: _0x31f412
      } = require("./link-preview.service");
      this.linkPreviewService = new _0x31f412({
        logger: this.logger
      });
    }
    return this.linkPreviewService;
  }
  _getDecryptionRecovery() {
    if (!this.decryptionRecovery) {
      const _0x185ade = require("./decryption-recovery.service");
      this.decryptionRecovery = new _0x185ade({
        databaseService: this.databaseService,
        getSocket: _0x4bf3c3 => this.sessions.get(_0x4bf3c3),
        logger: this.logger
      });
    }
    return this.decryptionRecovery;
  }
  async associateInboundLid(_0x2fb0a9, _0x38cb98) {
    try {
      if (!this.databaseService || !_0x38cb98 || !_0x38cb98.key) {
        return null;
      }
      const _0x59cb28 = this._getRecipientResolver();
      const _0x509612 = _0x38cb98.key.remoteJid;
      if (_0x59cb28.classifyIdentity(_0x509612) !== "lid") {
        return null;
      }
      const _0x4878e7 = String(_0x509612).trim();
      let _0xc971a6 = null;
      const _0x2bbaf1 = _0x38cb98.key.remoteJidAlt;
      if (_0x2bbaf1 && _0x59cb28.classifyIdentity(_0x2bbaf1) === "phone") {
        const _0x47efd0 = String(_0x2bbaf1).split("@")[0].split(":")[0].replace(/\D/g, "");
        if (_0x47efd0.length > 0) {
          _0xc971a6 = _0x47efd0;
        }
      }
      let _0x2cb30c = await this.databaseService.get("SELECT id, phone_number, lid FROM contacts WHERE lid = ?", [_0x4878e7]);
      if (!_0x2cb30c && _0xc971a6) {
        _0x2cb30c = await this.databaseService.get("SELECT id, phone_number, lid FROM contacts WHERE phone_number = ?", [_0xc971a6]);
      }
      if (_0x2cb30c) {
        const _0x58890c = [];
        const _0x43ece5 = [];
        if (_0x2cb30c.lid !== _0x4878e7) {
          _0x58890c.push("lid = ?");
          _0x43ece5.push(_0x4878e7);
        }
        if (_0xc971a6 && _0x2cb30c.phone_number !== _0xc971a6 && (!_0x2cb30c.phone_number || _0x2cb30c.phone_number === _0x4878e7)) {
          _0x58890c.push("phone_number = ?");
          _0x43ece5.push(_0xc971a6);
        }
        if (_0x58890c.length > 0) {
          _0x43ece5.push(_0x2cb30c.id);
          await this.databaseService.run("UPDATE contacts SET " + _0x58890c.join(", ") + ", updated_at = CURRENT_TIMESTAMP WHERE id = ?", _0x43ece5);
        }
        return {
          contactId: _0x2cb30c.id,
          lid: _0x4878e7,
          phone: _0xc971a6 || _0x2cb30c.phone_number || null,
          created: false
        };
      }
      const _0x437d37 = _0xc971a6 || _0x4878e7;
      const _0x36afe5 = await this.databaseService.run("INSERT OR IGNORE INTO contacts (phone_number, lid, name, is_active, created_at, updated_at)\n         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x437d37, _0x4878e7, _0x437d37]);
      let _0x401a9 = _0x36afe5 && _0x36afe5.lastID ? _0x36afe5.lastID : null;
      if (!_0x401a9) {
        const _0x567790 = await this.databaseService.get("SELECT id, lid FROM contacts WHERE phone_number = ?", [_0x437d37]);
        if (_0x567790) {
          _0x401a9 = _0x567790.id;
          if (_0x567790.lid !== _0x4878e7) {
            await this.databaseService.run("UPDATE contacts SET lid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [_0x4878e7, _0x567790.id]);
          }
        }
      }
      return {
        contactId: _0x401a9,
        lid: _0x4878e7,
        phone: _0xc971a6,
        created: true
      };
    } catch (_0x3d8732) {
      this.logger.warn("[LID] Failed to associate inbound LID for session " + _0x2fb0a9 + ": " + (_0x3d8732 && _0x3d8732.message));
      return null;
    }
  }
  applyExpressiveOptions({
    jid: _0x50a85c,
    groupOptions = {},
    content = {},
    participants: _0x291880,
    hasMedia = false,
    stickerConversion = null
  } = {}) {
    const _0x4e094a = groupOptions || {};
    const _0x18c00c = [];
    const _0x5cfc70 = this._isGroupJid(_0x50a85c);
    const _0x10b09d = {
      ...(content || {})
    };
    if (stickerConversion) {
      if (!stickerConversion.ok) {
        return {
          send: false,
          target: _0x50a85c,
          content: _0x10b09d,
          statusPost: false,
          warnings: _0x18c00c,
          error: "Sticker conversion failed: " + (stickerConversion.error || "unknown error")
        };
      }
      _0x10b09d.sticker = stickerConversion.sticker;
    }
    if (_0x4e094a.mentionAll) {
      if (!_0x5cfc70) {
        _0x18c00c.push("mention-all is not applicable to a non-group recipient; sent without mentions");
      } else if (!Array.isArray(_0x291880)) {
        return {
          send: false,
          target: _0x50a85c,
          content: _0x10b09d,
          statusPost: false,
          warnings: _0x18c00c,
          error: "mention-all requested but the group participant list is unavailable"
        };
      } else {
        _0x10b09d.mentions = _0x291880.map(_0x41962b => typeof _0x41962b === "string" ? _0x41962b : _0x41962b && _0x41962b.id);
      }
    }
    if (_0x4e094a.spoiler) {
      _0x10b09d.spoiler = true;
    }
    if (_0x4e094a.viewOnce && hasMedia) {
      _0x10b09d.viewOnce = true;
    }
    const _0x2334d0 = !!_0x4e094a.statusPost;
    const _0x4f64be = _0x2334d0 ? "status@broadcast" : _0x50a85c;
    return {
      send: true,
      target: _0x4f64be,
      content: _0x10b09d,
      statusPost: _0x2334d0,
      warnings: _0x18c00c,
      error: null
    };
  }
  async getCurrentGroupParticipants(_0x2d447c, _0x1805d8) {
    const _0x169975 = this.sessions.get(_0x2d447c);
    if (!_0x169975) {
      return null;
    }
    try {
      let _0x17b64b = this.getCachedGroupMetadata(_0x2d447c, _0x1805d8);
      if (!_0x17b64b) {
        _0x17b64b = await _0x169975.groupMetadata(_0x1805d8);
        if (_0x17b64b) {
          this.setGroupMetadataCache(_0x2d447c, _0x1805d8, _0x17b64b);
        }
      }
      if (!_0x17b64b || !Array.isArray(_0x17b64b.participants)) {
        return null;
      }
      return _0x17b64b.participants.map(_0x2f303b => _0x2f303b.id).filter(Boolean);
    } catch (_0x39caf2) {
      this.logger.warn("[Expressive] Could not retrieve participant list for group " + _0x1805d8 + ": " + (_0x39caf2 && _0x39caf2.message));
      return null;
    }
  }
  async prepareExpressiveSend(_0x179f75, _0x52dfdd, _0x4d6ea1 = {}, _0xc219b1 = {}, {
    stickerBuffer = null,
    hasMedia = false
  } = {}) {
    const _0x14023c = _0x4d6ea1 || {};
    let _0x238802;
    if (_0x14023c.mentionAll && this._isGroupJid(_0x52dfdd)) {
      _0x238802 = await this.getCurrentGroupParticipants(_0x179f75, _0x52dfdd);
    }
    let _0x54f8ea = null;
    if (stickerBuffer) {
      const _0x1562b7 = this._getMediaPipeline();
      try {
        const {
          sticker: _0x523cb3
        } = await _0x1562b7.convertLottieSticker(stickerBuffer);
        _0x54f8ea = {
          ok: true,
          sticker: _0x523cb3
        };
      } catch (_0x247d9a) {
        _0x54f8ea = {
          ok: false,
          error: _0x247d9a && _0x247d9a.message ? _0x247d9a.message : "sticker conversion failed"
        };
      }
    }
    return this.applyExpressiveOptions({
      jid: _0x52dfdd,
      groupOptions: _0x14023c,
      content: _0xc219b1,
      participants: _0x238802,
      hasMedia: hasMedia,
      stickerConversion: _0x54f8ea
    });
  }
  _recipientNeedsResolution(_0x4f55a3) {
    if (typeof _0x4f55a3 !== "string") {
      return false;
    }
    const _0x298e51 = _0x4f55a3.trim();
    if (_0x298e51.length === 0) {
      return false;
    }
    if (_0x298e51.includes("@")) {
      return false;
    }
    if (/^\+?\d+$/.test(_0x298e51)) {
      return false;
    }
    return true;
  }
  _applyTemplateVariables(_0x131ed5, _0x119a99 = [], _0x17f3f5 = {}) {
    if (typeof _0x131ed5 !== "string" || _0x131ed5.length === 0) {
      return _0x131ed5;
    }
    let _0x4a66ff = _0x131ed5;
    (Array.isArray(_0x119a99) ? _0x119a99 : []).forEach(_0x596adc => {
      const _0x51747b = _0x17f3f5[_0x596adc] || "{{" + _0x596adc + "}}";
      _0x4a66ff = _0x4a66ff.replace(new RegExp("\\{\\{" + _0x596adc + "\\}\\}", "g"), _0x51747b);
    });
    Object.keys(_0x17f3f5 || {}).forEach(_0x4dc912 => {
      const _0x1fddfd = _0x17f3f5[_0x4dc912] || "";
      _0x4a66ff = _0x4a66ff.replace(new RegExp("\\{\\{" + _0x4dc912 + "\\}\\}", "gi"), _0x1fddfd);
    });
    return _0x4a66ff;
  }
  _parseLinkPreviewData(_0x1a6f3f) {
    if (!_0x1a6f3f) {
      return null;
    }
    const _0x30e439 = _0x1a6f3f.link_preview_data;
    if (_0x30e439 == null) {
      return null;
    }
    if (typeof _0x30e439 === "object") {
      return _0x30e439;
    }
    if (typeof _0x30e439 === "string") {
      try {
        return JSON.parse(_0x30e439 || "null");
      } catch (_0x4888fc) {
        return null;
      }
    }
    return null;
  }
  _resolveLinkPreviewEnabled(_0x264d2d) {
    const _0x1cea9b = this._parseLinkPreviewData(_0x264d2d);
    if (!_0x1cea9b) {
      return null;
    }
    if (typeof _0x1cea9b.enabled === "boolean") {
      return _0x1cea9b.enabled;
    }
    if (typeof _0x1cea9b.disabled === "boolean") {
      return !_0x1cea9b.disabled;
    }
    if (_0x1cea9b.custom || _0x1cea9b.title || _0x1cea9b.description || _0x1cea9b.thumbnail) {
      return true;
    }
    return null;
  }
  async _buildTemplateLinkPreview(_0x1c4c63, _0x24d6e8) {
    const _0x3e2615 = this._resolveLinkPreviewEnabled(_0x24d6e8);
    if (_0x3e2615 !== true) {
      return null;
    }
    try {
      const _0x405677 = this._getLinkPreviewService();
      const _0x43e4da = _0x405677.extractFirstUrl(_0x1c4c63);
      if (!_0x43e4da) {
        return null;
      }
      const _0x339264 = this._parseLinkPreviewData(_0x24d6e8) || {};
      const _0x4a8ebf = _0x339264.custom || (_0x339264.title || _0x339264.description || _0x339264.thumbnail ? {
        title: _0x339264.title,
        description: _0x339264.description,
        thumbnail: _0x339264.thumbnail
      } : null);
      return await _0x405677.buildPreview(_0x43e4da, _0x4a8ebf, {});
    } catch (_0x481bd7) {
      this.logger.warn("🔗 Link preview build failed for template send: " + (_0x481bd7 && _0x481bd7.message));
      return {
        preview: null,
        warning: _0x481bd7 && _0x481bd7.message ? _0x481bd7.message : "link preview failed"
      };
    }
  }
  async _maybeSendExpressiveTemplate(_0x3121eb, _0x362f12, _0x2b1331, _0xbeac03) {
    let _0x3e072b = null;
    const _0x5d5151 = _0xbeac03 && _0xbeac03.group_options;
    if (_0x5d5151 == null) {
      return null;
    }
    if (typeof _0x5d5151 === "object") {
      _0x3e072b = _0x5d5151;
    } else if (typeof _0x5d5151 === "string") {
      try {
        _0x3e072b = JSON.parse(_0x5d5151 || "null");
      } catch (_0x55d265) {
        _0x3e072b = null;
      }
    }
    if (!_0x3e072b || typeof _0x3e072b !== "object") {
      return null;
    }
    const _0x265e40 = _0x3e072b.mentionAll || _0x3e072b.spoiler || _0x3e072b.viewOnce || _0x3e072b.statusPost;
    if (!_0x265e40) {
      return null;
    }
    try {
      const _0xd9a23a = this.sessions.get(_0x3121eb);
      if (!_0xd9a23a) {
        return {
          success: false,
          error: "Session not found"
        };
      }
      const _0x225661 = await this.prepareExpressiveSend(_0x3121eb, _0x362f12, _0x3e072b, {
        text: _0x2b1331
      }, {
        hasMedia: false
      });
      if (!_0x225661.send) {
        (_0x225661.warnings || []).forEach(_0x4aa33d => this.logger.warn("[Expressive] " + _0x4aa33d));
        return {
          success: false,
          error: _0x225661.error,
          unsent: true,
          warnings: _0x225661.warnings
        };
      }
      (_0x225661.warnings || []).forEach(_0x20e18d => this.logger.warn("[Expressive] " + _0x20e18d));
      const _0x6306d4 = await _0xd9a23a.sendMessage(_0x225661.target, _0x225661.content);
      return {
        success: true,
        messageId: _0x6306d4.key.id,
        timestamp: _0x6306d4.messageTimestamp,
        statusPost: _0x225661.statusPost,
        warnings: _0x225661.warnings
      };
    } catch (_0x40f596) {
      this.logger.error("[Expressive] send failed for " + _0x362f12 + ": " + (_0x40f596 && _0x40f596.message));
      return {
        success: false,
        error: _0x40f596 && _0x40f596.message ? _0x40f596.message : "expressive send failed"
      };
    }
  }
  _isDecryptionFailure(_0x55ad4c) {
    if (!_0x55ad4c) {
      return false;
    }
    const _0x5b254d = _0x55ad4c.message && Object.keys(_0x55ad4c.message).length > 0;
    if (_0x5b254d) {
      return false;
    }
    let _0x224c2d;
    try {
      _0x224c2d = proto && proto.WebMessageInfo && proto.WebMessageInfo.StubType && proto.WebMessageInfo.StubType.CIPHERTEXT;
    } catch (_0x5dd6cc) {
      _0x224c2d = undefined;
    }
    if (_0x224c2d != null && _0x55ad4c && _0x55ad4c.messageStubType === _0x224c2d) {
      return true;
    }
    return false;
  }
  async _handleDecryptionRecovery(_0x4e9934, _0x4e33e9) {
    try {
      if (!_0x4e33e9 || !_0x4e33e9.key || _0x4e33e9.key.fromMe) {
        return false;
      }
      const _0x3a9431 = this._getDecryptionRecovery();
      const _0x2d3312 = _0x4e9934 + ":" + (_0x4e33e9.key.remoteJid || "") + ":" + (_0x4e33e9.key.id || "");
      if (this._isDecryptionFailure(_0x4e33e9)) {
        this._pendingDecryptionRetries.add(_0x2d3312);
        await _0x3a9431.onDecryptionFailure(_0x4e9934, _0x4e33e9.key);
        return true;
      }
      if (this._pendingDecryptionRetries.has(_0x2d3312)) {
        this._pendingDecryptionRetries.delete(_0x2d3312);
        await _0x3a9431.onRetriedMessage(_0x4e9934, _0x4e33e9);
      }
      return false;
    } catch (_0x4cda7b) {
      this.logger.warn("[DecryptionRecovery] wiring error for session " + _0x4e9934 + ": " + (_0x4cda7b && _0x4cda7b.message));
      return false;
    }
  }
  async waitForReadySocket(_0xe44795, _0x1ca991 = 30000) {
    const _0x49ebad = Date.now();
    const _0x4eeec7 = 500;
    let _0x40331e = false;
    while (Date.now() - _0x49ebad < _0x1ca991) {
      const _0x526a59 = this.sessions.get(_0xe44795);
      if (!_0x526a59) {
        throw new Error("Session " + _0xe44795 + " not found");
      }
      const _0x3b2fb0 = this.sessionStates.get(_0xe44795);
      if (!_0x3b2fb0) {
        throw new Error("Session state not found for " + _0xe44795);
      }
      if (_0x3b2fb0.status === "connected" && _0x3b2fb0.isLoggedIn === true) {
        const _isWsOpen = _0x526a59.ws ? (_0x526a59.ws.isOpen || _0x526a59.ws.socket?.readyState === 1 || _0x526a59.ws.readyState === 1) : false;
        if (!_isWsOpen) {
          const _isConnecting = _0x526a59.ws?.socket?.readyState === 0;
          if (_isConnecting) {
            await new Promise(_0x4c4406 => setTimeout(_0x4c4406, _0x4eeec7));
            continue;
          }
          if (Date.now() - _0x49ebad > 5000 && !_0x40331e) {
            _0x40331e = true;
            this.logger.warn("⚠️ Session " + _0xe44795 + " reports connected but WebSocket is not open after 5s — triggering reconnect");
            this.smartReconnect(_0xe44795, "zombie_socket_detected").catch(() => {});
          }
          await new Promise(_0x4c4406 => setTimeout(_0x4c4406, _0x4eeec7));
          continue;
        }
        this.logger.info("✅ Socket ready for session " + _0xe44795);
        return _0x526a59;
      }
      if (_0x3b2fb0.status === "connecting" && _0x3b2fb0.phoneNumber) {
        this.logger.info("⏳ Session " + _0xe44795 + " is reconnecting, waiting...");
        await new Promise(_0x10f19a => setTimeout(_0x10f19a, _0x4eeec7));
        continue;
      }
      if (_0x3b2fb0.status === "disconnected" || !_0x3b2fb0.isLoggedIn) {
        throw new Error("Session " + _0xe44795 + " is not connected (status: " + _0x3b2fb0.status + ", logged in: " + _0x3b2fb0.isLoggedIn + ")");
      }
      await new Promise(_0x68cc7f => setTimeout(_0x68cc7f, _0x4eeec7));
    }
    const _0x38ad3a = this.sessionStates.get(_0xe44795);
    if (_0x40331e) {
      throw new Error("WhatsApp connection was lost and is reconnecting for session " + _0xe44795 + " — please try again in a few seconds");
    }
    throw new Error("Timeout waiting for session " + _0xe44795 + " to be ready (status: " + _0x38ad3a?.status + ", logged in: " + _0x38ad3a?.isLoggedIn + ")");
  }
  resolvePushName(_0x32a6e7, _0x57e121) {
    if (typeof _0x57e121 === "string" && _0x57e121.trim().length > 0) {
      return _0x57e121;
    }
    const _0x2613f7 = this.sessionStates.get(_0x32a6e7);
    if (_0x2613f7 && typeof _0x2613f7.pushName === "string" && _0x2613f7.pushName.trim().length > 0) {
      return _0x2613f7.pushName;
    }
    return this.defaultPushName;
  }
  buildGetMessage(_0x3a6e17) {
    return async _0x5d572f => {
      if (!_0x5d572f) {
        return undefined;
      }
      const _0x3286e5 = this.stores.get(_0x3a6e17);
      if (_0x3286e5) {
        try {
          const _0x5ec6a7 = await _0x3286e5.loadMessage(_0x5d572f.remoteJid, _0x5d572f.id);
          if (_0x5ec6a7?.message) {
            return _0x5ec6a7.message;
          }
        } catch (_0x25d949) {
          this.logger.warn("Error loading message from in-memory store for " + _0x3a6e17 + ":", _0x25d949);
        }
      }
      try {
        const _0x351aec = this.getMessageStore();
        if (_0x351aec) {
          const _0x5181be = await _0x351aec.load(_0x3a6e17, _0x5d572f.remoteJid, _0x5d572f.id);
          if (_0x5181be) {
            return _0x5181be;
          }
        }
      } catch (_0x1ea8a5) {
        this.recordRetryStoreError(_0x3a6e17, _0x5d572f, _0x1ea8a5);
        return undefined;
      }
      return undefined;
    };
  }
  getMessageStore() {
    if (!this.messageStore && this.databaseService) {
      this.messageStore = new MessageStore({
        databaseService: this.databaseService,
        logger: this.logger
      });
    }
    return this.messageStore || null;
  }
  recordRetryStoreError(_0x14629a, _0x2132f8, _0x2d0506) {
    const _0x1c4aa2 = _0x2132f8 && _0x2132f8.remoteJid;
    const _0x4efbda = _0x2132f8 && _0x2132f8.id;
    this.logger.error("getMessage retry-store load failed for " + _0x14629a + "/" + _0x1c4aa2 + "/" + _0x4efbda + ": " + (_0x2d0506 && _0x2d0506.message));
  }
  persistSentMessageForRetry(_0x11be09, _0x4090a2) {
    try {
      const _0x25ec0a = _0x4090a2 && _0x4090a2.key;
      if (!_0x11be09 || !_0x25ec0a || !_0x25ec0a.remoteJid || !_0x25ec0a.id) {
        return;
      }
      const _0x5a7ca6 = this.getMessageStore();
      if (!_0x5a7ca6) {
        return;
      }
      const _0x3ac4ff = _0x4090a2.message || _0x4090a2;
      Promise.resolve(_0x5a7ca6.persist(_0x11be09, _0x25ec0a, _0x3ac4ff)).catch(_0x47de98 => {
        this.logger.warn("Failed to persist sent message for retry (" + _0x11be09 + "/" + _0x25ec0a.remoteJid + "/" + _0x25ec0a.id + "): " + (_0x47de98 && _0x47de98.message));
      });
    } catch (_0x447d18) {
      this.logger.warn("persistSentMessageForRetry error (" + _0x11be09 + "): " + (_0x447d18 && _0x447d18.message));
    }
  }
  startRetryStorePruneSchedule() {
    if (this.retryStorePruneTimer) {
      return;
    }
    const _0x56de6a = () => {
      try {
        const _0xc77be8 = this.getMessageStore();
        if (!_0xc77be8) {
          return;
        }
        Promise.resolve(_0xc77be8.pruneExpired(7)).catch(_0x2335b7 => {
          this.logger.warn("Retry-store prune failed: " + (_0x2335b7 && _0x2335b7.message));
        });
      } catch (_0x223c17) {
        this.logger.warn("Retry-store prune scheduling error: " + (_0x223c17 && _0x223c17.message));
      }
    };
    this.retryStorePruneTimer = setInterval(_0x56de6a, this.retryStorePruneIntervalMs);
    if (this.retryStorePruneTimer && typeof this.retryStorePruneTimer.unref === "function") {
      this.retryStorePruneTimer.unref();
    }
    _0x56de6a();
  }
  buildAntiFlagConfig(_0xa8126c, _0x58a790 = {}) {
    const _0x2310fd = {};
    try {
      const _0x23c5a3 = Browsers.android("Chrome");
      if (!Array.isArray(_0x23c5a3) || _0x23c5a3.length === 0) {
        throw new Error("Android browser payload is empty");
      }
      _0x2310fd.browser = _0x23c5a3;
    } catch (_0x4fc710) {
      throw new AntiFlagConfigError("browser", _0x4fc710.message);
    }
    try {
      _0x2310fd.fetchWebInfo = false;
      _0x2310fd.webInfo = {
        requestWebInfo: false
      };
    } catch (_0x225479) {
      throw new AntiFlagConfigError("webInfo", _0x225479.message);
    }
    try {
      const _0x1cb87c = this.resolvePushName(_0xa8126c, _0x58a790.pushName);
      if (typeof _0x1cb87c !== "string" || _0x1cb87c.trim().length === 0) {
        throw new Error("resolved pushName is empty");
      }
      _0x2310fd.pushName = _0x1cb87c;
    } catch (_0x3217c6) {
      throw new AntiFlagConfigError("pushName", _0x3217c6.message);
    }
    try {
      if (!this.msgRetryCounterCache) {
        throw new Error("msgRetryCounterCache is not initialized");
      }
      _0x2310fd.msgRetryCounterCache = this.msgRetryCounterCache;
    } catch (_0x2e8cdf) {
      throw new AntiFlagConfigError("msgRetryCounterCache", _0x2e8cdf.message);
    }
    try {
      const _0x392c54 = this.buildGetMessage(_0xa8126c);
      if (typeof _0x392c54 !== "function") {
        throw new Error("getMessage is not a function");
      }
      _0x2310fd.getMessage = _0x392c54;
    } catch (_0x142e25) {
      throw new AntiFlagConfigError("getMessage", _0x142e25.message);
    }
    _0x2310fd.enableAutoSessionRecreation = true;
    _0x2310fd.enableRecentMessageCache = true;
    return _0x2310fd;
  }
  getOptimalSocketConfig(_0x3e9918, _0x5ceb5d, _0x2577f1 = {}) {
    const _0x190cfb = this.proxyAgentService.getSessionProxy(_0x3e9918);
    const _0x15b644 = this.proxyAgentService.getSessionProxyInfo(_0x3e9918);
    if (_0x190cfb && _0x15b644) {}
    const _0x50cf1b = this.buildAntiFlagConfig(_0x3e9918, _0x2577f1);
    const _0x4b8db6 = {
      auth: _0x5ceb5d,
      logger: this.logger,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      ...(this.baileysVersion && {
        version: this.baileysVersion
      }),
      defaultQueryTimeoutMs: 90000,
      connectTimeoutMs: 90000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 2000,
      maxMsgRetryCount: 5,
      qrTimeout: 120000,
      connectCooldownMs: 3000,
      transactionOpts: {
        maxCommitRetries: 15,
        delayBetweenTriesMs: 3000
      },
      userDevicesCache: new NodeCache({
        stdTTL: 300
      }),
      cachedGroupMetadata: async _0x2bdb6d => {
        return this.getCachedGroupMetadata(_0x3e9918, _0x2bdb6d);
      },
      ...(_0x190cfb && {
        agent: _0x190cfb,
        fetchAgent: _0x190cfb
      }),
      ..._0x2577f1,
      ..._0x50cf1b
    };
    return _0x4b8db6;
  }
  async setSessionProxy(_0x4b7dfd, _0x1d3827) {
    try {
      if (!_0x1d3827 || !_0x1d3827.host || !_0x1d3827.port) {
        console.error("❌ Invalid proxy configuration for session " + _0x4b7dfd);
        return false;
      }
      const _0x17b5ef = this.proxyAgentService.setSessionProxy(_0x4b7dfd, _0x1d3827);
      if (_0x17b5ef) {
        if (this.sessions.has(_0x4b7dfd)) {}
        return true;
      }
      return false;
    } catch (_0xc2cd4b) {
      console.error("❌ Error setting proxy for session " + _0x4b7dfd + ":", _0xc2cd4b.message);
      return false;
    }
  }
  removeSessionProxy(_0x19f79a) {
    try {
      this.proxyAgentService.removeSessionProxy(_0x19f79a);
      return true;
    } catch (_0x50ffda) {
      console.error("❌ Error removing proxy from session " + _0x19f79a + ":", _0x50ffda.message);
      return false;
    }
  }
  getSessionProxyInfo(_0x407cbc) {
    return this.proxyAgentService.getSessionProxyInfo(_0x407cbc);
  }
  async smartReconnect(_0x15af1e, _0x168a38 = "unknown") {
    if (!this.sessionStates.has(_0x15af1e)) {
      return false;
    }
    const _0x55d786 = this.sessionStates.get(_0x15af1e);
    if (_0x55d786 && _0x55d786.status === "reconnecting") {
      return false;
    }
    const _0x5b896e = this.reconnectionAttempts.get(_0x15af1e) || 0;
    const _0x8af40d = this.lastSuccessfulConnection.get(_0x15af1e);
    if (_0x8af40d && Date.now() - _0x8af40d > 300000) {
      this.reconnectionAttempts.delete(_0x15af1e);
    }
    if (_0x5b896e >= this.maxReconnectionAttempts) {
      this.logger.warn("Max reconnection attempts reached for session " + _0x15af1e);
      this.reconnectionAttempts.delete(_0x15af1e);
      const _0x1edb7f = this.sessionStates.get(_0x15af1e);
      if (_0x1edb7f) {
        _0x1edb7f.status = "disconnected";
        _0x1edb7f.isLoggedIn = false;
      }
      this.emit("session_disconnected", {
        sessionId: _0x15af1e,
        reason: "Max reconnection attempts reached (" + _0x168a38 + ")",
        timestamp: new Date()
      });
      return false;
    }
    this.reconnectionAttempts.set(_0x15af1e, _0x5b896e + 1);
    const _0xbd27e8 = this.baseReconnectionDelay;
    const _0x5aa494 = _0xbd27e8 * Math.pow(1.5, _0x5b896e);
    const _0x2a1452 = Math.random() * 1000;
    const _0x2e4e23 = Math.min(_0x5aa494 + _0x2a1452, 25000);
    this.logger.info("Smart reconnect attempt " + (_0x5b896e + 1) + " for " + _0x15af1e + " with delay " + _0x2e4e23 + "ms");
    const _0x44c5a4 = this.sessionStates.get(_0x15af1e);
    if (_0x44c5a4) {
      _0x44c5a4.status = "reconnecting";
    }
    this.emit("session_connecting", {
      sessionId: _0x15af1e,
      status: "reconnecting",
      attempt: _0x5b896e + 1,
      maxAttempts: this.maxReconnectionAttempts,
      delay: _0x2e4e23,
      reason: _0x168a38,
      timestamp: new Date()
    });
    setTimeout(async () => {
      try {
        await this.restartSession(_0x15af1e);
        this.reconnectionAttempts.delete(_0x15af1e);
        this.lastSuccessfulConnection.set(_0x15af1e, Date.now());
      } catch (_0x414974) {
        this.logger.error("Smart reconnect failed for " + _0x15af1e + ":", _0x414974);
      }
    }, _0x2e4e23);
    return true;
  }
  startConnectionHealthMonitoring(_0x1e5c22) {
    this.stopConnectionHealthMonitoring(_0x1e5c22);
    const _0x3e91b8 = setInterval(async () => {
      try {
        const _0x4b20fa = this.sessions.get(_0x1e5c22);
        const _0x157302 = this.sessionStates.get(_0x1e5c22);
        if (!_0x4b20fa || !_0x157302) {
          this.stopConnectionHealthMonitoring(_0x1e5c22);
          return;
        }
        if (_0x157302.status !== "connected") {
          return;
        }
        const _isHealthWsOpen = _0x4b20fa.ws ? (_0x4b20fa.ws.isOpen || _0x4b20fa.ws.socket?.readyState === 1 || _0x4b20fa.ws.readyState === 1) : false;
        if (!_isHealthWsOpen) {
          this.logger.warn("Health check failed for " + _0x1e5c22 + ": WebSocket not open");
          await this.smartReconnect(_0x1e5c22, "health_check_failed");
          return;
        }
        const _0x2d7e65 = _0x157302.lastSeen;
        if (_0x2d7e65 && Date.now() - _0x2d7e65.getTime() > 180000) {}
        try {
          const _0x458fa5 = _0x4b20fa.query({
            tag: "iq",
            attrs: {
              id: _0x4b20fa.generateMessageTag(),
              to: "@s.whatsapp.net",
              type: "get",
              xmlns: "w:p"
            },
            content: [{
              tag: "ping",
              attrs: {}
            }]
          });
          const _0x381dc4 = new Promise((_0xf07333, _0x5eed3f) => setTimeout(() => _0x5eed3f(new Error("Health check ping timed out")), 8000));
          await Promise.race([_0x458fa5, _0x381dc4]);
          _0x157302.lastSeen = new Date();
        } catch (_0x385d5f) {
          this.logger.warn("Health check ping failed for " + _0x1e5c22 + ":", _0x385d5f);
          await this.smartReconnect(_0x1e5c22, "ping_failed");
        }
      } catch (_0x5e21b6) {
        this.logger.error("Health check error for " + _0x1e5c22 + ":", _0x5e21b6);
      }
    }, 45000);
    this.connectionHealthChecks.set(_0x1e5c22, _0x3e91b8);
  }
  stopConnectionHealthMonitoring(_0x5bf4a0) {
    const _0x2d3b4f = this.connectionHealthChecks.get(_0x5bf4a0);
    if (_0x2d3b4f) {
      clearInterval(_0x2d3b4f);
      this.connectionHealthChecks.delete(_0x5bf4a0);
    }
  }
  setDeviceHealthService(_0x1e518c) {
    this.deviceHealthService = _0x1e518c;
  }
  logConnectionStability(_0x947ab, _0x263a05, _0x4324e5 = {}) {
    const _0x449298 = new Date().toISOString();
    const _0x7664de = this.sessionStates.get(_0x947ab);
    const _0xd1aa51 = this.sessions.get(_0x947ab);
    const _0x5c564e = {
      timestamp: _0x449298,
      sessionId: _0x947ab,
      event: _0x263a05,
      sessionStatus: _0x7664de?.status || "unknown",
      isLoggedIn: _0x7664de?.isLoggedIn || false,
      lastSeen: _0x7664de?.lastSeen || null,
      socketState: _0xd1aa51?.ws?.readyState || "no_socket",
      reconnectionAttempts: this.reconnectionAttempts.get(_0x947ab) || 0,
      hasHealthMonitoring: this.connectionHealthChecks.has(_0x947ab),
      ..._0x4324e5
    };
    const _0x376076 = {
      connection_open: "✅",
      connection_close: "❌",
      connection_lost: "📡",
      reconnect_attempt: "🔄",
      reconnect_success: "✅",
      reconnect_failed: "❌",
      health_check_pass: "💓",
      health_check_fail: "⚠️",
      session_restore: "🔄",
      qr_generated: "📱",
      auth_update: "🔐"
    };
    const _0x393e5e = _0x376076[_0x263a05] || "📊";
    this.logger.info("Connection stability event: " + _0x263a05, _0x5c564e);
    if (this.databaseService && this.databaseService.run) {
      this.databaseService.run("\n        INSERT OR IGNORE INTO connection_stability_logs\n        (session_id, event, details, timestamp)\n        VALUES (?, ?, ?, ?)\n      ", [_0x947ab, _0x263a05, JSON.stringify(_0x5c564e), _0x449298]).catch(_0xf97cd1 => {});
    }
  }
  migrateSessionsFromWebXSuite() {
    try {
      return;
    } catch (_0x2fd081) {
      logError("❌ Error during session migration:", _0x2fd081.message);
    }
  }
  copyRecursive(_0x4a5aa2, _0xd2f7a6) {
    const _0x2794f1 = fs.statSync(_0x4a5aa2);
    if (_0x2794f1.isDirectory()) {
      if (!fs.existsSync(_0xd2f7a6)) {
        fs.mkdirSync(_0xd2f7a6, {
          recursive: true
        });
      }
      const _0x5de7cd = fs.readdirSync(_0x4a5aa2);
      for (const _0x19f9e9 of _0x5de7cd) {
        this.copyRecursive(path.join(_0x4a5aa2, _0x19f9e9), path.join(_0xd2f7a6, _0x19f9e9));
      }
    } else {
      fs.copyFileSync(_0x4a5aa2, _0xd2f7a6);
    }
  }
  setDatabaseService(_0x2e8ae9) {
    this.databaseService = _0x2e8ae9;
  }
  setDatabaseService(_0x1a1785) {
    this.databaseService = _0x1a1785;
    if (_0x1a1785 && !this.bulkMessageFeatures) {
      this.bulkMessageFeatures = new BulkMessageFeaturesService(_0x1a1785, this);
    }
    if (_0x1a1785 && !this.optOutService) {
      this.optOutService = new OptOutService(_0x1a1785);
    }
    if (_0x1a1785 && !this.pollTrackingService) {
      this.pollTrackingService = new PollTrackingService(_0x1a1785);
    }
    if (_0x1a1785) {
      this.getMessageStore();
      this.startRetryStorePruneSchedule();
    }
  }
  async safeFileOperation(_0x581c53, _0x126173) {
    if (this.isShuttingDown) {
      throw new Error("Service is shutting down, cannot perform file operations");
    }
    if (this.fileOperationLocks.has(_0x581c53)) {
      await this.fileOperationLocks.get(_0x581c53);
    }
    const _0x21b2e3 = (async () => {
      try {
        return await _0x126173();
      } catch (_0x53360b) {
        if (_0x53360b.code === "EBADF" || _0x53360b.message.includes("bad file descriptor")) {
          await new Promise(_0x1895a1 => setTimeout(_0x1895a1, 100));
          return await _0x126173();
        }
        throw _0x53360b;
      } finally {
        this.fileOperationLocks.delete(_0x581c53);
      }
    })();
    this.fileOperationLocks.set(_0x581c53, _0x21b2e3);
    return _0x21b2e3;
  }
  initializeStore(_0xb394ae) {
    if (!this.stores.has(_0xb394ae)) {
      const _0x4f1e3d = path.join(this.authDir, _0xb394ae);
      const _0xec5399 = path.join(_0x4f1e3d, "baileys_store.json");
      const _0x3d4a4c = makeInMemoryStore({
        logger: pino({
          level: "silent"
        })
      });
      if (fs.existsSync(_0xec5399)) {
        try {
          _0x3d4a4c.readFromFile(_0xec5399);
        } catch (_0x540b56) {}
      }
      let _0x2612d5 = null;
      setTimeout(() => {
        _0x2612d5 = setInterval(() => {
          try {
            if (!fs.existsSync(_0x4f1e3d)) {
              fs.mkdirSync(_0x4f1e3d, {
                recursive: true
              });
            }
            _0x3d4a4c.writeToFile(_0xec5399);
          } catch (_0x138b93) {}
        }, 60000);
      }, 10000);
      _0x3d4a4c._saveInterval = _0x2612d5;
      this.stores.set(_0xb394ae, _0x3d4a4c);
      return _0x3d4a4c;
    }
    return this.stores.get(_0xb394ae);
  }
  cleanupStore(_0x4a0d1e) {
    const _0x5d55fb = this.stores.get(_0x4a0d1e);
    if (_0x5d55fb) {
      if (_0x5d55fb._saveInterval) {
        clearInterval(_0x5d55fb._saveInterval);
      }
      try {
        const _0x4f9b0a = path.join(this.authDir, _0x4a0d1e);
        const _0x15da42 = path.join(_0x4f9b0a, "baileys_store.json");
        if (!fs.existsSync(_0x4f9b0a)) {
          fs.mkdirSync(_0x4f9b0a, {
            recursive: true
          });
        }
        _0x5d55fb.writeToFile(_0x15da42);
      } catch (_0x49ab3e) {
        this.logger.warn("Failed to save final store data for session " + _0x4a0d1e + ":", _0x49ab3e);
      }
      this.stores.delete(_0x4a0d1e);
    }
  }
  async restoreAllSessions() {
    try {
      if (!this.databaseService) {
        console.error("❌ [WHATSAPP SERVICE] Database service not available!");
        this.logger.warn("Database service not available for session restoration");
        return;
      }
      this.logger.info("🔄 Restoring existing WhatsApp sessions...");
      const _0xa03438 = await this.databaseService.query("\n        SELECT session_id, status, phone_number FROM whatsapp_sessions\n        WHERE is_active = 1 AND status IN ('connected', 'qr_ready', 'connecting', 'reconnecting', 'disconnected')\n        ORDER BY\n          CASE status\n            WHEN 'connected' THEN 1\n            WHEN 'reconnecting' THEN 2\n            WHEN 'qr_ready' THEN 3\n            WHEN 'connecting' THEN 4\n            WHEN 'disconnected' THEN 5\n          END,\n          created_at DESC\n      ");
      this.logger.info("📊 Database query result: " + JSON.stringify(_0xa03438));
      if (!_0xa03438 || !_0xa03438.success || !_0xa03438.data || _0xa03438.data.length === 0) {
        this.logger.info("❌ No active sessions found to restore");
        return;
      }
      const _0x3ccbf9 = _0xa03438.data;
      this.logger.info("✅ Found " + _0x3ccbf9.length + " sessions to restore");
      for (const _0x2753a8 of _0x3ccbf9) {
        const _0x2b5549 = _0x2753a8.session_id;
        const _0x4806c5 = _0x2753a8.status;
        const _0x1a5773 = _0x2753a8.phone_number;
        this.logger.info("Restoring session " + _0x2b5549 + " with status: " + _0x4806c5);
        try {
          if (_0x4806c5 === "connected") {
            this.logger.info("🔗 Attempting to restore connected session: " + _0x2b5549 + " (preserving connected status)");
            const _0x41d66e = await this.restoreSession(_0x2b5549, "connected");
            if (_0x41d66e.success) {
              setTimeout(() => {
                this.emit("session_connected", {
                  sessionId: _0x2b5549,
                  status: "connected",
                  isLoggedIn: true,
                  phoneNumber: _0x1a5773,
                  profilePicture: null,
                  timestamp: new Date()
                });
              }, 1000);
            }
          } else if (_0x4806c5 === "disconnected") {
            this.logger.info("🔌 Session " + _0x2b5549 + " was disconnected, restoring for manual reconnection");
            await this.restoreSession(_0x2b5549, "disconnected");
          } else {
            this.logger.info("Session " + _0x2b5549 + " needs re-authentication (status: " + _0x4806c5 + ")");
            await this.restoreSession(_0x2b5549, _0x4806c5);
          }
        } catch (_0xb70e49) {
          this.logger.error("Failed to restore session " + _0x2b5549 + ":", _0xb70e49);
        }
      }
      this.logger.info("✅ Session restoration completed");
    } catch (_0x5ee258) {
      this.logger.error("Error restoring sessions:", _0x5ee258);
    }
  }
  async createSession(_0x42c9f6) {
    try {
      if (this.sessions.has(_0x42c9f6)) {
        return {
          success: false,
          message: "Session already exists"
        };
      }
      const _0x7aa09 = path.join(this.authDir, _0x42c9f6);
      if (!fs.existsSync(_0x7aa09)) {
        fs.mkdirSync(_0x7aa09, {
          recursive: true
        });
      }
      const {
        state: _0x536869,
        saveCreds: _0x21832b
      } = await this.safeFileOperation("auth-" + _0x42c9f6, () => useMultiFileAuthState(_0x7aa09));
      if (this._versionInitPromise) {
        await this._versionInitPromise;
        this._versionInitPromise = null;
      }
      const _0xb8a83 = this.initializeStore(_0x42c9f6);
      const _0x5b0740 = {
        creds: _0x536869.creds,
        keys: makeCacheableSignalKeyStore(_0x536869.keys, this.logger)
      };
      const _0x202021 = makeWASocket(this.getOptimalSocketConfig(_0x42c9f6, _0x5b0740));
      _0xb8a83.bind(_0x202021.ev);
      this.sessions.set(_0x42c9f6, _0x202021);
      this.sessionStates.set(_0x42c9f6, {
        id: _0x42c9f6,
        status: "connecting",
        qrCode: null,
        lastSeen: new Date(),
        phoneNumber: null,
        profilePicture: null,
        isLoggedIn: false,
        usingPairingCode: false,
        pairingPhoneNumber: null,
        isRestoration: false
      });
      _0x202021.ev.on("connection.update", async _0x2ce83f => {
        await this.handleConnectionUpdate(_0x42c9f6, _0x2ce83f, _0x202021);
      });
      _0x202021.ev.on("creds.update", _0x21832b);
      _0x202021.ev.on("messages.upsert", async _0x480142 => {
        await this.handleIncomingMessages(_0x42c9f6, _0x480142);
      });
      _0x202021.ev.on("messages.update", async _0x2b6246 => {
        await this.handleMessageUpdates(_0x42c9f6, _0x2b6246);
      });
      _0x202021.ev.on("contacts.update", async _0x5b7884 => {
        await this.handleContactsUpdate(_0x42c9f6, _0x5b7884);
      });
      _0x202021.ev.on("call", async _0x3b23ab => {
        await this.handleCalls(_0x42c9f6, _0x3b23ab);
      });
      _0x202021.ev.on("presence.update", async _0x8a4f54 => {
        await this.handlePresenceUpdate(_0x42c9f6, _0x8a4f54);
      });
      this.logger.info("Session " + _0x42c9f6 + " created successfully");
      return {
        success: true,
        message: "Session created successfully"
      };
    } catch (_0x32c772) {
      this.logger.error("Error creating session " + _0x42c9f6 + ":", _0x32c772);
      this.sessions.delete(_0x42c9f6);
      this.sessionStates.delete(_0x42c9f6);
      if (_0x32c772 instanceof AntiFlagConfigError) {
        return {
          success: false,
          message: _0x32c772.message,
          failedAntiFlagSetting: _0x32c772.setting
        };
      }
      return {
        success: false,
        message: _0x32c772.message
      };
    }
  }
  async restoreSession(_0x13fbe7, _0x3bc995 = null) {
    try {
      if (this.sessions.has(_0x13fbe7)) {
        this.logger.info("Session " + _0x13fbe7 + " already exists in memory");
        return {
          success: true,
          message: "Session already loaded"
        };
      }
      const _0x5ab924 = path.join(this.authDir, _0x13fbe7);
      if (!fs.existsSync(_0x5ab924)) {
        this.logger.warn("No auth files found for session " + _0x13fbe7);
        return {
          success: false,
          message: "No auth files found"
        };
      }
      this.logger.info("Restoring session " + _0x13fbe7 + " from auth files...");
      const {
        state: _0x9bbc1,
        saveCreds: _0x1cc0ae
      } = await this.safeFileOperation("restore-" + _0x13fbe7, () => useMultiFileAuthState(_0x5ab924));
      if (!_0x9bbc1.creds || !_0x9bbc1.creds.noiseKey) {
        this.logger.warn("Invalid credentials for session " + _0x13fbe7 + " - missing noiseKey");
        return {
          success: false,
          message: "Invalid credentials - missing noiseKey"
        };
      }
      if (!_0x9bbc1.creds.signedIdentityKey) {
        this.logger.warn("Invalid credentials for session " + _0x13fbe7 + " - missing signedIdentityKey");
        return {
          success: false,
          message: "Invalid credentials - missing signedIdentityKey"
        };
      }
      try {
        if (_0x9bbc1.creds.noiseKey && typeof _0x9bbc1.creds.noiseKey === "object" && _0x9bbc1.creds.noiseKey.private) {} else {
          throw new Error("Noise key structure is invalid");
        }
      } catch (_0x32cb15) {
        this.logger.warn("Credential validation failed for session " + _0x13fbe7 + ":", _0x32cb15);
        return {
          success: false,
          message: "Credential validation failed"
        };
      }
      if (this._versionInitPromise) {
        await this._versionInitPromise;
        this._versionInitPromise = null;
      }
      const _0x2699d9 = this.initializeStore(_0x13fbe7);
      const _0x551a71 = {
        creds: _0x9bbc1.creds,
        keys: makeCacheableSignalKeyStore(_0x9bbc1.keys, this.logger)
      };
      const _0x2c6200 = makeWASocket(this.getOptimalSocketConfig(_0x13fbe7, _0x551a71));
      _0x2699d9.bind(_0x2c6200.ev);
      _0x2c6200.ev.on("labels.edit", _0x1211f9 => {
        this.logger.info("🏷️ [LABELS.EDIT EVENT] Received label for session " + _0x13fbe7 + ": " + JSON.stringify(_0x1211f9));
      });
      _0x2c6200.ev.on("labels.association", _0x359b3a => {
        this.logger.info("🔗 [LABELS.ASSOCIATION EVENT] Received association for session " + _0x13fbe7 + ": " + JSON.stringify(_0x359b3a));
      });
      this.sessions.set(_0x13fbe7, _0x2c6200);
      const _0x326aea = _0x3bc995 === "connected" ? "connected" : "connecting";
      const _0xa06592 = _0x3bc995 === "connected";
      this.logger.info("🔄 Restoring session " + _0x13fbe7 + " - Previous status: " + _0x3bc995 + ", Initial status: " + _0x326aea);
      this.sessionStates.set(_0x13fbe7, {
        id: _0x13fbe7,
        status: _0x326aea,
        qrCode: null,
        lastSeen: new Date(),
        phoneNumber: null,
        profilePicture: null,
        isLoggedIn: _0xa06592,
        usingPairingCode: false,
        pairingPhoneNumber: null,
        isRestoration: true,
        silentReconnect: _0xa06592
      });
      _0x2c6200.ev.on("connection.update", async _0x2ab0b7 => {
        await this.handleConnectionUpdate(_0x13fbe7, _0x2ab0b7, _0x2c6200);
      });
      _0x2c6200.ev.on("creds.update", _0x1cc0ae);
      _0x2c6200.ev.on("messages.upsert", async _0x4f224c => {
        await this.handleIncomingMessages(_0x13fbe7, _0x4f224c);
        await this.handleCallLogMessages(_0x13fbe7, _0x4f224c);
      });
      _0x2c6200.ev.on("messages.update", async _0x5e7c24 => {
        await this.handleMessageUpdates(_0x13fbe7, _0x5e7c24);
      });
      _0x2c6200.ev.on("contacts.update", async _0x44b79f => {
        await this.handleContactsUpdate(_0x13fbe7, _0x44b79f);
      });
      _0x2c6200.ev.on("call", async _0x4497ae => {
        await this.handleCalls(_0x13fbe7, _0x4497ae);
      });
      _0x2c6200.ev.on("presence.update", async _0x39d34c => {
        await this.handlePresenceUpdate(_0x13fbe7, _0x39d34c);
      });
      _0x2c6200.ev.on("groups.update", async _0x27498d => {
        for (const _0x5e069c of _0x27498d) {
          if (_0x5e069c.id) {
            try {
              const _0x2b5095 = await _0x2c6200.groupMetadata(_0x5e069c.id);
              this.setGroupMetadataCache(_0x13fbe7, _0x5e069c.id, _0x2b5095);
            } catch (_0x107208) {
              this.logger.warn("Failed to update group metadata cache for " + _0x5e069c.id + ":", _0x107208);
            }
          }
        }
      });
      _0x2c6200.ev.on("group-participants.update", async _0x494892 => {
        if (_0x494892.id) {
          try {
            const _0x27969b = await _0x2c6200.groupMetadata(_0x494892.id);
            this.setGroupMetadataCache(_0x13fbe7, _0x494892.id, _0x27969b);
          } catch (_0x274569) {
            this.logger.warn("Failed to update group metadata cache for " + _0x494892.id + ":", _0x274569);
          }
        }
      });
      this.logger.info("Session " + _0x13fbe7 + " restoration initiated");
      if (this.databaseService) {
        const _0x2ffa4a = await this.databaseService.get("\n          SELECT status, phone_number FROM whatsapp_sessions\n          WHERE session_id = ?\n        ", [_0x13fbe7]);
        if (_0x2ffa4a && _0x2ffa4a.status === "connected") {
          this.logger.info("Verifying connection for previously connected session " + _0x13fbe7);
          setTimeout(async () => {
            try {
              const _0x4a9052 = this.sessions.get(_0x13fbe7);
              if (_0x4a9052 && _0x4a9052.user && _0x4a9052.user.id) {
                this.logger.info("Session " + _0x13fbe7 + " connection verified - emitting connected event");
                this.emit("session_connected", {
                  sessionId: _0x13fbe7,
                  status: "connected",
                  isLoggedIn: true,
                  phoneNumber: _0x2ffa4a.phone_number,
                  profilePicture: null,
                  timestamp: new Date()
                });
              } else {
                this.logger.info("Session " + _0x13fbe7 + " not yet ready, waiting for connection update");
              }
            } catch (_0xd4faf4) {
              this.logger.error("Error verifying session " + _0x13fbe7 + " connection:", _0xd4faf4);
            }
          }, 3000);
        }
      }
      return {
        success: true,
        message: "Session restoration initiated"
      };
    } catch (_0xa1cc3) {
      this.logger.error("Error restoring session " + _0x13fbe7 + ":", _0xa1cc3);
      if (_0xa1cc3 instanceof AntiFlagConfigError) {
        return {
          success: false,
          message: _0xa1cc3.message,
          failedAntiFlagSetting: _0xa1cc3.setting
        };
      }
      return {
        success: false,
        message: _0xa1cc3.message
      };
    }
  }
  async handleConnectionUpdate(_0x1b146d, _0x1f8b9f, _0x20f7d4) {
    const {
      connection: _0x4b2231,
      lastDisconnect: _0xac899d,
      qr: _0x17981b,
      isNewLogin: _0xbf7f37
    } = _0x1f8b9f;
    if (_0x20f7d4 !== undefined && this.sessions.get(_0x1b146d) !== _0x20f7d4) {
      this.logger.info("Ignoring stale socket event for " + _0x1b146d + " (socket mismatch) — connection=" + _0x4b2231 + ", qr=" + !!_0x17981b);
      return;
    }
    const _0x3e5d0d = this.sessionStates.get(_0x1b146d);
    if (!_0x3e5d0d) {
      this.logger.warn("Session state not found for " + _0x1b146d);
      return;
    }
    this.logger.info("Connection update for " + _0x1b146d + ": connection=" + _0x4b2231 + ", qr=" + !!_0x17981b + ", isNewLogin=" + _0xbf7f37 + ", usingPairingCode=" + _0x3e5d0d.usingPairingCode);
    if (_0x17981b && !_0x3e5d0d.usingPairingCode) {
      try {
        const _0x7dc6fb = await QRCode.toDataURL(_0x17981b, {
          errorCorrectionLevel: "L",
          type: "image/png",
          quality: 0.92,
          margin: 4,
          width: 300,
          color: {
            dark: "#000000",
            light: "#FFFFFF"
          }
        });
        if (!_0x7dc6fb || !_0x7dc6fb.startsWith("data:image/png;base64,")) {
          throw new Error("Invalid QR code data URL generated");
        }
        _0x3e5d0d.qrCode = _0x7dc6fb;
        _0x3e5d0d.status = "qr_ready";
        this.emit("qr_code", {
          sessionId: _0x1b146d,
          qrCode: _0x7dc6fb,
          timestamp: new Date().toISOString(),
          qrLength: _0x7dc6fb.length,
          qrPreview: _0x7dc6fb.substring(0, 50) + "..."
        });
        this.logger.info("QR code generated for session " + _0x1b146d + ", length: " + _0x7dc6fb.length);
        if (this.databaseService && this.databaseService.run) {
          this.databaseService.run("\n            UPDATE whatsapp_sessions\n            SET qr_code = ?, status = 'qr_ready', updated_at = CURRENT_TIMESTAMP\n            WHERE session_id = ?\n          ", [_0x7dc6fb, _0x1b146d]).catch(_0x5ab0fb => {
            this.logger.error("Database update error for QR code " + _0x1b146d + ":", _0x5ab0fb);
          });
        }
      } catch (_0x45efba) {
        this.logger.error("Error generating QR code for " + _0x1b146d + ":", _0x45efba);
        logError("❌ QR code generation failed for " + _0x1b146d + ":", _0x45efba);
      }
    } else if (_0x17981b && _0x3e5d0d.usingPairingCode) {
      this.logger.info("QR code suppressed for session " + _0x1b146d + " - using pairing code authentication");
      _0x3e5d0d.status = "pairing_code_ready";
      this.sessionStates.set(_0x1b146d, _0x3e5d0d);
    } else if (_0x17981b) {
      this.logger.warn("QR code not generated for " + _0x1b146d + " - usingPairingCode: " + _0x3e5d0d.usingPairingCode);
    }
    if (_0x4b2231 === "open") {
      _0x3e5d0d.status = "connected";
      _0x3e5d0d.isLoggedIn = true;
      _0x3e5d0d.qrCode = null;
      this.reconnectionAttempts.delete(_0x1b146d);
      this.startConnectionHealthMonitoring(_0x1b146d);
      this.logConnectionStability(_0x1b146d, "connection_open", {
        previousAttempts: this.reconnectionAttempts.get(_0x1b146d) || 0
      });
      const _0x3b5f01 = this.sessions.get(_0x1b146d);
      let _0x4a4447 = null;
      let _0x39fbfc = null;
      if (_0x3b5f01 && _0x3b5f01.user) {
        _0x4a4447 = _0x3b5f01.user.id?.split(":")[0] || null;
        try {
          _0x39fbfc = await _0x3b5f01.profilePictureUrl(_0x3b5f01.user.id, "image");
        } catch (_0x15cc09) {
          this.logger.debug("Could not fetch profile picture for " + _0x1b146d + ":", _0x15cc09.message);
        }
      }
      this.emit("session_connected", {
        sessionId: _0x1b146d,
        status: "connected",
        isLoggedIn: true,
        phoneNumber: _0x4a4447,
        profilePicture: _0x39fbfc,
        timestamp: new Date()
      });
      this.logger.info("Session " + _0x1b146d + " connected successfully" + (_0x4a4447 ? " with phone " + _0x4a4447 : ""));
      try {
        const _0xf34bf = this.stores.get(_0x1b146d);
        if (_0xf34bf) {
          const _0x247f41 = _0xf34bf.chats ? Object.keys(_0xf34bf.chats).length : 0;
          const _0x21f5bf = _0xf34bf.contacts ? Object.keys(_0xf34bf.contacts).length : 0;
          this.logger.info("📇 Store status for " + _0x1b146d + ": " + _0x247f41 + " chats, " + _0x21f5bf + " contacts");
        }
      } catch (_0x3883ab) {
        this.logger.warn("Could not read store status: " + _0x3883ab.message);
      }
      this.startPollVoteChecking(_0x1b146d);
      this.startAutomaticPollScanning(_0x1b146d);
      setTimeout(() => {
        this.scanAllChatsForPolls(_0x1b146d);
      }, 5000);
      const _0x49840a = _0x4a4447 ? "UPDATE whatsapp_sessions\n           SET status = 'connected',\n               phone_number = ?,\n               profile_picture = ?,\n               connected_at = CURRENT_TIMESTAMP,\n               qr_code = NULL,\n               updated_at = CURRENT_TIMESTAMP\n           WHERE session_id = ?" : "UPDATE whatsapp_sessions\n           SET status = 'connected',\n               connected_at = CURRENT_TIMESTAMP,\n               qr_code = NULL,\n               updated_at = CURRENT_TIMESTAMP\n           WHERE session_id = ?";
      const _0x4af56d = _0x4a4447 ? [_0x4a4447, _0x39fbfc, _0x1b146d] : [_0x1b146d];
      if (this.databaseService && this.databaseService.run) {
        try {
          const _0x1ca686 = await this.databaseService.get("SELECT id FROM whatsapp_sessions WHERE session_id = ?", [_0x1b146d]);
          if (!_0x1ca686) {
            this.logger.info("Creating missing session record for " + _0x1b146d);
            await this.databaseService.run("\n              INSERT INTO whatsapp_sessions (session_id, name, device_name, status, phone_number, profile_picture, connected_at, created_at, updated_at)\n              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n            ", [_0x1b146d, "Device " + (_0x4a4447 || _0x1b146d), "WhatsApp Device", "connected", _0x4a4447, _0x39fbfc]);
          } else {
            await this.databaseService.run(_0x49840a, _0x4af56d);
          }
          this.logger.info("Session " + _0x1b146d + " database record updated successfully");
        } catch (_0x50bafd) {
          this.logger.error("Database update error for connected session " + _0x1b146d + ":", _0x50bafd);
        }
      } else {
        this.logger.warn("Database service not available for session " + _0x1b146d + " update");
      }
    } else if (_0x4b2231 === "connecting") {
      if (!_0x3e5d0d.silentReconnect) {
        _0x3e5d0d.status = "connecting";
        this.emit("session_connecting", {
          sessionId: _0x1b146d,
          status: "connecting",
          isLoggedIn: false,
          timestamp: new Date()
        });
        this.emit("session_update", {
          sessionId: _0x1b146d,
          status: "connecting",
          isLoggedIn: false,
          timestamp: new Date()
        });
      } else {
        this.logger.info("🔇 Silent reconnect for " + _0x1b146d + " - keeping 'connected' status in UI");
      }
    } else if (_0x4b2231 === "close") {
      if (this.manualDisconnections.has(_0x1b146d)) {
        this.logger.info("Session " + _0x1b146d + " closed due to force reconnect - skipping auto-reconnect");
        return;
      }
      const _0xdc86b7 = _0xac899d?.error?.output?.statusCode;
      this.logger.info("Session " + _0x1b146d + " closed — disconnect statusCode: " + _0xdc86b7 + ", error: " + _0xac899d?.error?.message);
      if (_0xdc86b7 === DisconnectReason.restartRequired) {
        this.logger.info("Restart required for session " + _0x1b146d + ", creating new socket...");
        _0x3e5d0d.status = "connecting";
        this.emit("session_connecting", {
          sessionId: _0x1b146d,
          status: "connecting",
          isLoggedIn: false,
          timestamp: new Date()
        });
        this.emit("session_update", {
          sessionId: _0x1b146d,
          status: "connecting",
          isLoggedIn: false,
          timestamp: new Date()
        });
        if (this.databaseService && this.databaseService.run) {
          this.databaseService.run("\n            UPDATE whatsapp_sessions\n            SET status = 'connecting',\n                updated_at = CURRENT_TIMESTAMP\n            WHERE session_id = ?\n          ", [_0x1b146d]).catch(_0x16b3de => {
            this.logger.error("Database update error for session " + _0x1b146d + ":", _0x16b3de);
          });
        }
        const _0x516c91 = this.sessions.get(_0x1b146d);
        if (_0x516c91) {
          try {
            await _0x516c91.end();
          } catch (_0x302147) {}
          this.sessions.delete(_0x1b146d);
        }
        setTimeout(() => {
          this.restartSession(_0x1b146d);
        }, 1000);
        return;
      } else if (_0xdc86b7 === DisconnectReason.connectionClosed) {
        this.logger.info("Connection closed for session " + _0x1b146d + ", attempting smart reconnect...");
        this.stopConnectionHealthMonitoring(_0x1b146d);
        this.logConnectionStability(_0x1b146d, "connection_close", {
          reason: "connection_closed"
        });
        await this.smartReconnect(_0x1b146d, "connection_closed");
      } else if (_0xdc86b7 === DisconnectReason.connectionLost) {
        this.logger.info("Connection lost for session " + _0x1b146d + ", attempting smart reconnect...");
        this.stopConnectionHealthMonitoring(_0x1b146d);
        this.logConnectionStability(_0x1b146d, "connection_lost", {
          reason: "connection_lost"
        });
        await this.smartReconnect(_0x1b146d, "connection_lost");
      } else if (_0xdc86b7 === DisconnectReason.loggedOut) {
        if (this.manualDisconnections.has(_0x1b146d)) {
          this.logger.info("Session " + _0x1b146d + " logged out due to manual disconnection, skipping automatic handling");
          return;
        }
        this.logger.info("Session " + _0x1b146d + " logged out (device removed), marking as disconnected");
        _0x3e5d0d.status = "disconnected";
        _0x3e5d0d.isLoggedIn = false;
        _0x3e5d0d.qrCode = null;
        this.stopPollVoteChecking();
        this.logConnectionStability(_0x1b146d, "logged_out", {
          reason: "device_removed"
        });
        let _0x59e0f2 = {
          eventType: "manual_unlink",
          confidence: "low",
          banSuspected: false
        };
        if (this.deviceHealthService) {
          try {
            _0x59e0f2 = await this.deviceHealthService.recordDisconnect(_0x1b146d, {
              reason: "logged_out_device_removed",
              wasManual: false
            });
          } catch (_0x2c8dbc) {
            this.logger.error("Ban assessment failed for " + _0x1b146d + ": " + _0x2c8dbc.message);
          }
        }
        this.emit("session_disconnected", {
          sessionId: _0x1b146d,
          reason: _0x59e0f2.banSuspected ? "Possible ban detected — device removed after heavy sending" : "Device removed from WhatsApp Web",
          banSuspected: _0x59e0f2.banSuspected,
          banConfidence: _0x59e0f2.confidence,
          timestamp: new Date()
        });
        if (_0x59e0f2.banSuspected) {
          this.emit("device_ban_suspected", {
            sessionId: _0x1b146d,
            confidence: _0x59e0f2.confidence,
            riskScoreAtEvent: _0x59e0f2.riskScoreAtEvent,
            timestamp: new Date()
          });
        }
        if (this.databaseService && this.databaseService.run) {
          this.databaseService.run("\n            UPDATE whatsapp_sessions\n            SET status = 'disconnected',\n                qr_code = NULL,\n                disconnected_at = CURRENT_TIMESTAMP,\n                updated_at = CURRENT_TIMESTAMP\n            WHERE session_id = ?\n          ", [_0x1b146d]).catch(_0x74d4dd => {
            this.logger.error("Database update error for session " + _0x1b146d + ":", _0x74d4dd);
          });
        }
        this.logger.info("Session " + _0x1b146d + " disconnected: Device removed from WhatsApp Web");
      } else if (_0xdc86b7 === DisconnectReason.timedOut) {
        this.logger.info("Connection timed out for session " + _0x1b146d + ", attempting smart reconnect...");
        this.stopConnectionHealthMonitoring(_0x1b146d);
        this.logConnectionStability(_0x1b146d, "timeout", {
          reason: "timed_out"
        });
        await this.smartReconnect(_0x1b146d, "timed_out");
      } else if (_0xdc86b7 === DisconnectReason.badSession) {
        this.logger.info("Bad session for " + _0x1b146d + ", attempting smart reconnect...");
        this.stopConnectionHealthMonitoring(_0x1b146d);
        this.logConnectionStability(_0x1b146d, "bad_session", {
          reason: "bad_session"
        });
        await this.smartReconnect(_0x1b146d, "bad_session");
      } else {
        const _0x2aee1a = _0xac899d?.error?.message || "Unknown";
        this.logger.info("Session " + _0x1b146d + " disconnected with reason: " + _0x2aee1a + " (code: " + _0xdc86b7 + ")");
        if (_0x2aee1a.includes("Stream Errored") && _0x2aee1a.includes("conflict")) {
          this.stopConnectionHealthMonitoring(_0x1b146d);
          this.logConnectionStability(_0x1b146d, "stream_conflict", {
            reason: _0x2aee1a,
            code: _0xdc86b7
          });
          setTimeout(async () => {
            await this.smartReconnect(_0x1b146d, "stream_conflict");
          }, 15000);
        } else if (_0xdc86b7 !== DisconnectReason.forbidden && _0xdc86b7 !== DisconnectReason.multideviceMismatch) {
          this.logger.info("Attempting smart reconnect for " + _0x1b146d + " due to: " + _0x2aee1a);
          this.stopConnectionHealthMonitoring(_0x1b146d);
          this.logConnectionStability(_0x1b146d, "unknown_disconnect", {
            reason: _0x2aee1a,
            code: _0xdc86b7
          });
          await this.smartReconnect(_0x1b146d, "unknown_" + _0xdc86b7);
        } else {
          _0x3e5d0d.status = "disconnected";
          _0x3e5d0d.isLoggedIn = false;
          this.emit("session_disconnected", {
            sessionId: _0x1b146d,
            reason: _0x2aee1a,
            timestamp: new Date()
          });
          if (this.databaseService && this.databaseService.run) {
            this.databaseService.run("\n              UPDATE whatsapp_sessions\n              SET status = 'disconnected',\n                  disconnected_at = CURRENT_TIMESTAMP,\n                  updated_at = CURRENT_TIMESTAMP\n              WHERE session_id = ?\n            ", [_0x1b146d]).catch(_0x547a80 => {
              this.logger.error("Database update error for session " + _0x1b146d + ":", _0x547a80);
            });
          }
          this.logger.info("Session " + _0x1b146d + " disconnected: " + _0x2aee1a);
        }
      }
    }
  }
  async extractVotesManually(_0xe4189d, _0xe0840c, _0x22814c) {
    try {
      if (!_0xe4189d?.message?.poll) {
        return null;
      }
      const _0x11e9af = _0xe4189d.message.poll;
      const _0x3cfd5a = _0x11e9af.options || [];
      if (!_0xe0840c || _0xe0840c.length === 0) {
        return null;
      }
      const _0x7bdb7b = [];
      for (const _0x3822a2 of _0xe0840c) {
        const _0x385070 = await this.extractSingleVote(_0x3822a2, _0x3cfd5a, _0x22814c);
        if (_0x385070) {
          _0x7bdb7b.push(_0x385070);
        }
      }
      if (_0x7bdb7b.length > 0) {
        return _0x7bdb7b;
      } else {
        return null;
      }
    } catch (_0x5ca914) {
      console.error("❌ MANUAL VOTE EXTRACTION: Error during manual extraction:", _0x5ca914);
      return null;
    }
  }
  async extractSingleVote(_0x19bff9, _0x397022, _0x2e9e74) {
    try {
      const _0xbff907 = _0x2e9e74.key.remoteJid;
      if (_0x19bff9.selectedOptions && Array.isArray(_0x19bff9.selectedOptions)) {
        for (const _0x58fc6c of _0x19bff9.selectedOptions) {
          if (_0x58fc6c < _0x397022.length) {
            return {
              voters: [_0xbff907],
              option: _0x397022[_0x58fc6c]
            };
          }
        }
      }
      if (_0x19bff9.vote !== undefined) {
        const _0x536a0a = parseInt(_0x19bff9.vote);
        if (!isNaN(_0x536a0a) && _0x536a0a < _0x397022.length) {
          return {
            voters: [_0xbff907],
            option: _0x397022[_0x536a0a]
          };
        }
      }
      if (_0x19bff9.optionName) {
        const _0x4d97d1 = _0x397022.find(_0x4a9dd1 => _0x4a9dd1.optionName === _0x19bff9.optionName);
        if (_0x4d97d1) {
          return {
            voters: [_0xbff907],
            option: _0x4d97d1
          };
        }
      }
      const _0x3c9e06 = Object.values(_0x19bff9).filter(_0x138dcc => typeof _0x138dcc === "string");
      for (const _0xcab7bd of _0x3c9e06) {
        const _0x4f55cf = _0x397022.find(_0x5062f2 => _0x5062f2.optionName === _0xcab7bd);
        if (_0x4f55cf) {
          return {
            voters: [_0xbff907],
            option: _0x4f55cf
          };
        }
      }
      return null;
    } catch (_0x42aa1b) {
      console.error("❌ SINGLE VOTE: Error extracting single vote:", _0x42aa1b);
      return null;
    }
  }
  async handleIncomingMessages(_0x576ffe, _0x2742f3) {
    const {
      messages: _0x238d1f,
      type: _0x2e619b
    } = _0x2742f3;
    this.logger.info("📨 Handling " + _0x238d1f.length + " messages of type " + _0x2e619b + " for session " + _0x576ffe);
    if (_0x2e619b === "notify") {
      for (const _0x4b962e of _0x238d1f) {
        this.logger.info("📨 Processing message: fromMe=" + _0x4b962e.key.fromMe + ", remoteJid=" + _0x4b962e.key.remoteJid);
        const _0x2388d6 = await this._handleDecryptionRecovery(_0x576ffe, _0x4b962e);
        if (_0x2388d6) {
          continue;
        }
        if (_0x4b962e.message && _0x4b962e.message.pollUpdateMessage) {
          console.log("🗳️ POLL VOTE DETECTED in messages.notify");
          console.log("   Voter:", _0x4b962e.key.remoteJid || _0x4b962e.key.participant);
          console.log("   Vote Message ID:", _0x4b962e.key.id);
          await this.handlePollVote(_0x576ffe, _0x4b962e);
        }
        if (_0x4b962e.message) {
          const _0xa394e8 = Object.keys(_0x4b962e.message);
          if (_0xa394e8.some(_0x1bf46f => _0x1bf46f.toLowerCase().includes("poll"))) {
            if (_0x4b962e.message.pollCreationMessage) {
              if (this.pollTrackingService) {
                try {
                  await this.pollTrackingService.storePollMessage({
                    messageId: _0x4b962e.key.id,
                    sessionId: _0x576ffe,
                    senderJid: _0x4b962e.key.remoteJid,
                    recipientJid: _0x4b962e.key.remoteJid,
                    pollQuestion: _0x4b962e.message.pollCreationMessage.name,
                    pollOptions: _0x4b962e.message.pollCreationMessage.options || [],
                    sentAt: new Date().toISOString()
                  });
                } catch (_0x1d4a66) {
                  console.error("❌ POLL CREATION: Error storing poll:", _0x1d4a66);
                }
              }
              this.cachePollMessage(_0x4b962e.key.id, {
                key: _0x4b962e.key,
                message: _0x4b962e.message,
                timestamp: Date.now(),
                sessionId: _0x576ffe,
                recipient: _0x4b962e.key.remoteJid
              });
            }
            if (_0x4b962e.message.pollUpdateMessage) {
              console.log("🗳️ POLL VOTE DETECTED in poll message check");
              try {
                await this.handlePollVote(_0x576ffe, _0x4b962e);
              } catch (_0x568b52) {
                console.error("❌ POLL VOTE: Error processing vote:", _0x568b52);
              }
            }
          }
          if (_0x4b962e.message.interactiveResponseMessage) {}
          if (_0x4b962e.message.buttonsResponseMessage) {}
          if (_0x4b962e.message.listResponseMessage) {
            this.logger.info("📨 🔥 LIST RESPONSE MESSAGE DETECTED!");
            this.logger.info("📨 List response: " + JSON.stringify(_0x4b962e.message.listResponseMessage, null, 2));
          }
          if (_0x4b962e.message.templateButtonReplyMessage) {
            this.logger.info("📨 🔥 TEMPLATE BUTTON REPLY MESSAGE DETECTED!");
            this.logger.info("📨 Template button reply: " + JSON.stringify(_0x4b962e.message.templateButtonReplyMessage, null, 2));
          }
        }
        const _0x1ceb81 = this.formatMessage(_0x4b962e);
        this.logger.info("📨 Emitting event for session " + _0x576ffe + " (fromMe: " + _0x4b962e.key.fromMe + ")");
        if (_0x4b962e.key.fromMe === false) {
          const _0x4b367c = _0x4b962e.message || {};
          const _0x25b6e3 = ["protocolMessage", "reactionMessage", "callLogMessage", "keepInChatMessage", "requestPhoneNumberMessage", "encReactionMessage"];
          const _0x33a424 = _0x25b6e3.some(_0x1301a3 => !!_0x4b367c[_0x1301a3]);
          if (_0x33a424) {
            this.logger.info("📨 Skipping system/protocol message (" + Object.keys(_0x4b367c)[0] + ") for session " + _0x576ffe);
          } else {
            await this.associateInboundLid(_0x576ffe, _0x4b962e);
            this.emit("message_received", {
              sessionId: _0x576ffe,
              message: _0x4b962e,
              formattedMessage: _0x1ceb81,
              timestamp: new Date()
            });
          }
        } else {
          this.emit("message_sent", {
            sessionId: _0x576ffe,
            message: _0x4b962e,
            formattedMessage: _0x1ceb81,
            timestamp: new Date()
          });
        }
        if (!_0x4b962e.key.fromMe) {
          console.log("🔔🔔🔔 [HOOK] Received message from customer (not fromMe)");
          console.log("🔔🔔🔔 [HOOK] bulkMessageFeatures exists:", !!this.bulkMessageFeatures);
          console.log("🔔🔔🔔 [HOOK] formattedMessage exists:", !!_0x1ceb81);
          console.log("🔔🔔🔔 [HOOK] formattedMessage.from:", _0x1ceb81?.from);
          if (this.bulkMessageFeatures && _0x1ceb81) {
            try {
              console.log("🔔🔔🔔 [HOOK] Checking if should forward to hook...");
              const _0x33d437 = await this.bulkMessageFeatures.shouldForwardToHook(_0x1ceb81.from, _0x576ffe);
              console.log("🔔🔔🔔 [HOOK] shouldForward result:", _0x33d437);
              if (_0x33d437) {
                console.log("✅✅✅ [HOOK] Should forward! Preparing message...");
                let _0x327fbc = _0x1ceb81.text || "";
                let _0x5ab231 = _0x1ceb81.type || "text";
                if (_0x1ceb81.type === "image" && _0x1ceb81.caption) {
                  _0x327fbc = "[Image] " + _0x1ceb81.caption;
                } else if (_0x1ceb81.type === "video" && _0x1ceb81.caption) {
                  _0x327fbc = "[Video] " + _0x1ceb81.caption;
                } else if (_0x1ceb81.type === "audio") {
                  _0x327fbc = "[Voice Message]";
                } else if (_0x1ceb81.type === "document") {
                  _0x327fbc = "[Document] " + (_0x1ceb81.fileName || "File");
                } else if (_0x1ceb81.type === "sticker") {
                  _0x327fbc = "[Sticker]";
                } else if (!_0x327fbc) {
                  _0x327fbc = "[" + _0x5ab231.toUpperCase() + "]";
                }
                console.log("✅✅✅ [HOOK] Calling forwardReplyToHook...");
                await this.bulkMessageFeatures.forwardReplyToHook({
                  from: _0x1ceb81.from,
                  text: "Campaign message",
                  timestamp: _0x1ceb81.timestamp
                }, {
                  text: _0x327fbc,
                  messageType: _0x5ab231
                }, _0x576ffe);
                console.log("✅✅✅ [HOOK] forwardReplyToHook completed");
              } else {
                console.log("❌❌❌ [HOOK] Should NOT forward (no recent campaign message)");
              }
            } catch (_0x52e65a) {
              console.error("❌❌❌ [HOOK] Error forwarding reply to hook:", _0x52e65a);
              logError("Error forwarding reply to hook:", _0x52e65a);
            }
          } else {
            console.log("❌❌❌ [HOOK] Cannot check hook forwarding - missing bulkMessageFeatures or formattedMessage");
          }
        } else {
          console.log("🔔🔔🔔 [HOOK] Message is fromMe - skipping hook check");
        }
        if (this.optOutService && _0x1ceb81 && _0x1ceb81.text) {
          try {
            let _0x3d623b = _0x1ceb81.from;
            if (_0x3d623b.includes("@lid") && _0x4b962e.key.remoteJidAlt) {
              const _0x40841f = _0x4b962e.key.remoteJidAlt;
              const _0x3a311c = _0x40841f.split("@")[0].split(":")[0];
              if (/^\d+$/.test(_0x3a311c)) {
                _0x3d623b = _0x40841f;
              }
            }
            const _0x47f9d3 = _0x3d623b.split("@")[0].split(":")[0];
            const _0x3e3082 = await this.optOutService.processOptOutKeyword(_0x47f9d3, _0x1ceb81.text, _0x576ffe);
            if (_0x3e3082.isOptOutKeyword) {
              this.logger.info("🚫 Processed opt-out keyword for " + _0x47f9d3 + ": " + _0x3e3082.action);
              if (_0x3e3082.response) {
                try {
                  await this.sendMessage(_0x576ffe, _0x1ceb81.from, _0x3e3082.response, "text");
                  this.logger.info("✅ Sent opt-out confirmation to " + _0x47f9d3);
                } catch (_0x248628) {
                  this.logger.error("❌ Failed to send opt-out response to " + _0x47f9d3 + ":", _0x248628);
                }
              }
              return;
            }
          } catch (_0x2ec2dd) {
            logError("🚫 Error processing opt-out keyword:", _0x2ec2dd);
            logError("🚫 Error stack:", _0x2ec2dd.stack);
            logError("🚫 Error message:", _0x2ec2dd.message);
            this.logger.error("Error processing opt-out keyword:", _0x2ec2dd);
          }
        }
      }
    }
  }
  async handleMessageUpdates(_0x554a60, _0x134cbc) {
    try {
      const _0x3d5f9b = this.sessions.get(_0x554a60);
      if (!_0x3d5f9b) {
        return;
      }
      const _0x2a011d = this.stores.get(_0x554a60);
      if (!_0x2a011d) {
        return;
      }
      const {
        getAggregateVotesInPollMessage: _0x1e4f7d
      } = require("@innovatorssoft/baileys");
      for (const {
        key: _0x33b572,
        update: _0x214325
      } of _0x134cbc) {
        if (_0x33b572.fromMe && _0x214325.status !== undefined && _0x214325.status !== null) {
          this.emit("message_ack", {
            sessionId: _0x554a60,
            messageId: _0x33b572.id,
            remoteJid: _0x33b572.remoteJid,
            status: _0x214325.status,
            timestamp: Date.now()
          });
        }
        if (_0x214325.pollUpdates) {
          try {
            let _0xb46ce9 = await _0x2a011d.loadMessage(_0x33b572.remoteJid, _0x33b572.id);
            if (!_0xb46ce9 || !_0xb46ce9.message) {
              const _0x439db8 = this.getMessageStore();
              if (_0x439db8) {
                const _0x5098a4 = await _0x439db8.load(_0x554a60, _0x33b572.remoteJid, _0x33b572.id);
                if (_0x5098a4) {
                  _0xb46ce9 = {
                    message: _0x5098a4
                  };
                }
              }
            }
            if (_0xb46ce9 && _0xb46ce9.message) {
              const _0x3efddf = await _0x1e4f7d({
                message: _0xb46ce9.message,
                pollUpdates: _0x214325.pollUpdates
              });
              if (this.pollTrackingService && _0x3efddf && _0x3efddf.length > 0) {
                const _0x39676e = await this.pollTrackingService.getPollByMessageId(_0x33b572.id);
                if (_0x39676e) {
                  const _0x4697e9 = _0x214325.pollUpdates && _0x214325.pollUpdates.length > 0 ? _0x214325.pollUpdates[0].pollUpdateMessageKey?.id : null;
                  await this.pollTrackingService.storePollVotes({
                    pollMessageId: _0x39676e.id,
                    pollResults: _0x3efddf,
                    pollUpdates: _0x214325.pollUpdates,
                    voteUpdateId: _0x4697e9
                  });
                } else {}
              } else {}
            } else {}
          } catch (_0x5ec850) {
            console.error("❌ POLL VOTE: Error processing poll vote:", _0x5ec850);
          }
        }
      }
    } catch (_0x10c1f4) {
      console.error("❌ POLL VOTE ERROR:", _0x10c1f4);
      this.logger.error("Error handling message updates for session " + _0x554a60 + ":", _0x10c1f4);
    }
  }
  async handlePollVote(_0x369c65, _0x18f5d7) {
    try {
      const _0x5e4dd4 = this.sessions.get(_0x369c65);
      const _0x57accc = this.stores.get(_0x369c65);
      if (!_0x5e4dd4 || !_0x57accc) {
        console.error("❌ POLL VOTE: Socket or store not available");
        return false;
      }
      const _0x2ff256 = _0x18f5d7.message.pollUpdateMessage;
      const _0x817e64 = _0x2ff256.pollCreationMessageKey;
      if (!_0x817e64 || !this.pollTrackingService) {
        console.error("❌ POLL VOTE: Missing poll creation key or tracking service");
        return false;
      }
      const _0x536bdc = _0x18f5d7.key && _0x18f5d7.key.id ? _0x18f5d7.key.id : null;
      let _0x32f65f = null;
      try {
        _0x32f65f = await _0x57accc.loadMessage(_0x817e64.remoteJid, _0x817e64.id);
      } catch (_0x3a95c7) {}
      if (!_0x32f65f) {
        const _0x5200a5 = this.pollMessageCache.get(_0x817e64.id);
        if (_0x5200a5) {
          _0x32f65f = _0x5200a5;
        }
      }
      if (!_0x32f65f) {
        await new Promise(_0x14b22e => setTimeout(_0x14b22e, 500));
        try {
          _0x32f65f = await _0x57accc.loadMessage(_0x817e64.remoteJid, _0x817e64.id);
        } catch (_0x431bc1) {}
      }
      if (!_0x32f65f || !_0x32f65f.message) {
        return await this.processPollVoteFallback(_0x369c65, _0x18f5d7, _0x817e64);
      }
      let _0x4972ee = null;
      if (this.pollTrackingService) {
        _0x4972ee = await this.pollTrackingService.getPollByMessageId(_0x817e64.id);
      }
      if (_0x4972ee && _0x536bdc && this.pollTrackingService) {
        const _0x82bb34 = await this.pollTrackingService.hasProcessedVoteUpdate(_0x4972ee.id, _0x536bdc);
        if (_0x82bb34) {
          return true;
        }
      }
      const {
        decryptPollVote: _0x5e67e9,
        getKeyAuthor: _0xa5d4bc,
        jidNormalizedUser: _0x2d16a1
      } = require("@innovatorssoft/baileys");
      let _0x36391b = _0x2ff256.vote;
      try {
        const _0x383f92 = _0x32f65f.message.messageContextInfo?.messageSecret;
        const _0x3b5224 = _0x2d16a1(_0x5e4dd4.user?.lid || _0x5e4dd4.user?.id || "");
        const _0x900936 = _0xa5d4bc(_0x817e64, _0x3b5224);
        const _0x19c8a6 = _0xa5d4bc(_0x18f5d7.key, _0x3b5224);
        if (_0x383f92) {
          _0x36391b = _0x5e67e9(_0x2ff256.vote, {
            pollCreatorJid: _0x900936,
            pollMsgId: _0x817e64.id,
            pollEncKey: _0x383f92,
            voterJid: _0x19c8a6
          });
        }
      } catch (_0x21049b) {
        console.error("❌ POLL VOTE: Error decrypting vote:", _0x21049b);
      }
      const _0x550b58 = [{
        pollUpdateMessageKey: _0x18f5d7.key,
        vote: _0x36391b,
        senderTimestampMs: _0x2ff256.senderTimestampMs
      }];
      const {
        getAggregateVotesInPollMessage: _0x2b4c55
      } = require("@innovatorssoft/baileys");
      let _0x524809 = null;
      try {
        _0x524809 = await _0x2b4c55({
          message: _0x32f65f.message,
          pollUpdates: _0x550b58
        });
      } catch (_0x3f505f) {
        console.error("🗳️ POLL VOTE: Error in vote aggregation:", _0x3f505f);
        _0x524809 = null;
      }
      if (!_0x524809 || !Array.isArray(_0x524809) || _0x524809.length === 0) {
        const _0x18fa2f = new Date().toISOString();
        const _0x47cdd5 = _0x4972ee ? _0x4972ee.id : null;
        if (this.pollTrackingService && _0x47cdd5 !== null) {
          await this.pollTrackingService.recordAggregationFailure({
            pollMessageId: _0x47cdd5,
            voteUpdateId: _0x536bdc,
            failureTime: _0x18fa2f
          });
        }
        this.emit("poll_aggregation_failed", {
          sessionId: _0x369c65,
          pollMessageId: _0x47cdd5,
          pollCreationMessageId: _0x817e64.id,
          voteUpdateId: _0x536bdc,
          failureTime: _0x18fa2f
        });
        return false;
      }
      if (this.pollTrackingService && _0x4972ee) {
        try {
          await this.pollTrackingService.storeAggregatedPollVotes({
            pollMessageId: _0x4972ee.id,
            pollResults: _0x524809,
            pollUpdates: _0x550b58,
            voteUpdateId: _0x536bdc
          });
        } catch (_0x3dc8f4) {
          console.error("❌ VOTE TRACKING (handlePollVote): Error storing votes:", _0x3dc8f4);
          return false;
        }
      }
      return true;
    } catch (_0x5964a9) {
      console.error("❌ POLL VOTE ERROR:", _0x5964a9);
      this.logger.error("Error handling poll vote for session " + _0x369c65 + ":", _0x5964a9);
      return false;
    }
  }
  cachePollMessage(_0x17fa8a, _0x42db25) {
    try {
      const _0x2e89ab = {
        ..._0x42db25,
        cachedAt: Date.now()
      };
      this.pollMessageCache.set(_0x17fa8a, _0x2e89ab);
      this.permanentPollCache.set(_0x17fa8a, _0x2e89ab);
      const _0x2311e6 = Date.now();
      for (const [_0x3b45df, _0x5cfa45] of this.pollMessageCache.entries()) {
        if (_0x2311e6 - _0x5cfa45.cachedAt > this.pollCacheTTLms) {
          this.pollMessageCache.delete(_0x3b45df);
        }
      }
    } catch (_0x55f142) {
      console.error("❌ Error caching poll message:", _0x55f142);
    }
  }
  debugPollCache() {
    for (const [_0x4c7437, _0x5528e2] of this.pollMessageCache.entries()) {}
  }
  async debugRecentMessages(_0x495e14) {
    try {
      const _0x29a5ad = this.sessions.get(_0x495e14);
      if (!_0x29a5ad || !_0x29a5ad.store) {
        return;
      }
      const _0x417829 = _0x29a5ad.store.chats.all();
      for (const _0x45f684 of _0x417829.slice(0, 5)) {
        const _0x58aea9 = _0x29a5ad.store.messages[_0x45f684.id];
        if (_0x58aea9) {
          const _0x5ca948 = _0x58aea9.all();
          for (const _0x24f49c of _0x5ca948.slice(-10)) {
            if (_0x24f49c.message) {
              const _0x3b762f = Object.keys(_0x24f49c.message);
              if (_0x3b762f.some(_0x2cd5ca => _0x2cd5ca.toLowerCase().includes("poll"))) {}
            }
          }
        }
      }
    } catch (_0x4cd7c8) {
      console.error("❌ DEBUG: Error checking recent messages:", _0x4cd7c8);
    }
  }
  async scanForExistingPolls(_0x526824) {
    return 0;
  }
  async forceCheckPollVotes(_0x20b4b4) {
    try {
      for (const [_0x374f2d, _0x4bc85c] of this.pollMessageCache.entries()) {
        const _0x4e338c = this.sessions.get(_0x20b4b4);
        if (_0x4e338c && _0x4e338c.store) {
          const _0x5c740f = _0x4bc85c.recipient || _0x4bc85c.key.remoteJid;
          const _0x372cee = _0x4e338c.store.messages[_0x5c740f];
          if (_0x372cee) {
            const _0x6d7304 = _0x372cee.all();
            for (const _0x20fa89 of _0x6d7304) {
              if (_0x20fa89.message && _0x20fa89.message.pollUpdateMessage) {
                const _0x1cd5e0 = _0x20fa89.message.pollUpdateMessage;
                if (_0x1cd5e0.pollCreationMessageKey && _0x1cd5e0.pollCreationMessageKey.id === _0x374f2d) {
                  await this.processVotePermanently(_0x20b4b4, _0x20fa89);
                }
              }
            }
          }
        }
      }
    } catch (_0x4a151) {
      console.error("❌ FORCE VOTE CHECK: Error checking votes:", _0x4a151);
    }
  }
  async debugSpecificPoll(_0x104f1d, _0x36d805) {
    try {
      if (!this.pollTrackingService) {
        return;
      }
      const _0x4a6518 = await this.pollTrackingService.db.query("\n        SELECT * FROM poll_messages WHERE poll_question LIKE ?\n      ", ["%" + _0x36d805 + "%"]);
      if (_0x4a6518.success && _0x4a6518.data) {
        const _0x1217ce = Array.isArray(_0x4a6518.data) ? _0x4a6518.data : _0x4a6518.data.values ? _0x4a6518.data.values.map(_0x54f87f => {
          const _0x1a48a3 = _0x4a6518.data.columns;
          const _0x1b77fa = {};
          _0x1a48a3.forEach((_0x512ffa, _0xa73ec7) => {
            _0x1b77fa[_0x512ffa] = _0x54f87f[_0xa73ec7];
          });
          return _0x1b77fa;
        }) : [];
        for (const _0x118aad of _0x1217ce) {
          const _0x34a86d = await this.pollTrackingService.db.query("\n            SELECT pv.*, po.option_text\n            FROM poll_votes pv\n            JOIN poll_options po ON pv.poll_option_id = po.id\n            WHERE pv.poll_message_id = ?\n          ", [_0x118aad.id]);
          if (_0x34a86d.success && _0x34a86d.data) {
            const _0x25d4d1 = Array.isArray(_0x34a86d.data) ? _0x34a86d.data : _0x34a86d.data.values ? _0x34a86d.data.values.map(_0x5d093b => {
              const _0x488cd8 = _0x34a86d.data.columns;
              const _0x2985b2 = {};
              _0x488cd8.forEach((_0x38408f, _0x512365) => {
                _0x2985b2[_0x38408f] = _0x5d093b[_0x512365];
              });
              return _0x2985b2;
            }) : [];
            for (const _0x40acae of _0x25d4d1) {}
          } else if (this.pollMessageCache.has(_0x118aad.message_id)) {
            await this.forceCheckSpecificPollVotes(_0x104f1d, _0x118aad.message_id);
          } else {}
        }
      } else {}
    } catch (_0x4901b8) {
      console.error("❌ DEBUG SPECIFIC POLL: Error:", _0x4901b8);
    }
  }
  async forceCheckSpecificPollVotes(_0x4c85da, _0x55f81f) {
    try {
      const _0x25c5ce = this.sessions.get(_0x4c85da);
      if (!_0x25c5ce || !_0x25c5ce.store) {
        return;
      }
      const _0xfd2074 = _0x25c5ce.store.chats.all();
      for (const _0x3c3fee of _0xfd2074) {
        const _0x5c947d = _0x25c5ce.store.messages[_0x3c3fee.id];
        if (_0x5c947d) {
          const _0x4dcca2 = _0x5c947d.all();
          for (const _0x566785 of _0x4dcca2) {
            if (_0x566785.message && _0x566785.message.pollUpdateMessage) {
              const _0x39fd72 = _0x566785.message.pollUpdateMessage;
              if (_0x39fd72.pollCreationMessageKey && _0x39fd72.pollCreationMessageKey.id === _0x55f81f) {
                await this.processVotePermanently(_0x4c85da, _0x566785);
              }
            }
          }
        }
      }
    } catch (_0x3377dc) {
      console.error("❌ FORCE CHECK SPECIFIC: Error:", _0x3377dc);
    }
  }
  async debugDatabasePolls() {
    try {
      if (!this.pollTrackingService) {
        return;
      }
      const _0x5ab942 = await this.pollTrackingService.getRecentPolls(24);
      for (const _0x1e712f of _0x5ab942) {
        const _0x403be5 = await this.pollTrackingService.db.query("\n          SELECT pv.*, po.option_text\n          FROM poll_votes pv\n          JOIN poll_options po ON pv.poll_option_id = po.id\n          WHERE pv.poll_message_id = ?\n        ", [_0x1e712f.id]);
        if (_0x403be5.success && _0x403be5.data) {
          const _0x2c451f = Array.isArray(_0x403be5.data) ? _0x403be5.data : _0x403be5.data.values ? _0x403be5.data.values.map(_0x1aab79 => {
            const _0xcf1755 = _0x403be5.data.columns;
            const _0x53acec = {};
            _0xcf1755.forEach((_0x527f83, _0x100610) => {
              _0x53acec[_0x527f83] = _0x1aab79[_0x100610];
            });
            return _0x53acec;
          }) : [];
          for (const _0x320868 of _0x2c451f) {}
        } else {}
      }
    } catch (_0x1f7d61) {
      console.error("❌ DEBUG: Error checking database polls:", _0x1f7d61);
    }
  }
  async getMessage(_0x13c838, _0x50667c) {
    try {
      const _0x507c18 = this.sessions.get(_0x13c838);
      if (!_0x507c18) {
        return null;
      }
      const _0x47e481 = this.pollMessageCache.get(_0x50667c.id);
      if (_0x47e481) {
        return {
          key: _0x47e481.key,
          message: _0x47e481.message,
          messageTimestamp: _0x47e481.timestamp
        };
      }
      const _0x98d8d7 = _0x507c18.store;
      if (_0x98d8d7 && _0x98d8d7.loadMessage) {
        try {
          const _0x40a550 = await _0x98d8d7.loadMessage(_0x50667c.remoteJid, _0x50667c.id);
          if (_0x40a550) {
            return _0x40a550;
          }
        } catch (_0xa07d9f) {}
      }
      if (_0x98d8d7 && _0x98d8d7.messages && _0x98d8d7.messages[_0x50667c.remoteJid]) {
        const _0xf9bb6a = _0x98d8d7.messages[_0x50667c.remoteJid];
        const _0x2fc99c = _0xf9bb6a.get(_0x50667c.id);
        if (_0x2fc99c) {
          return _0x2fc99c;
        } else {
          const _0x4ef212 = Array.from(_0xf9bb6a.keys()).slice(0, 10);
        }
      }
      if (_0x507c18.chatHistory) {
        const _0x13486d = _0x507c18.chatHistory.get(_0x50667c.remoteJid);
        if (_0x13486d) {
          const _0x2da04b = _0x13486d.find(_0x6faa12 => _0x6faa12.key.id === _0x50667c.id);
          if (_0x2da04b) {
            return _0x2da04b;
          }
        }
      }
      return null;
    } catch (_0x27fd6f) {
      console.error("❌ Error getting message:", _0x27fd6f);
      return null;
    }
  }
  startPollVoteChecking(_0x494ae6) {
    if (this.pollVoteCheckInterval) {
      clearInterval(this.pollVoteCheckInterval);
    }
    this.pollVoteCheckInterval = setInterval(async () => {
      try {
        await this.checkForMissedPollVotes(_0x494ae6);
      } catch (_0x37f78b) {
        console.error("❌ POLL VOTE CHECK: Error checking for missed votes:", _0x37f78b);
      }
    }, 30000);
  }
  startAutomaticPollScanning(_0x1a08fa) {
    this.stopAutomaticPollScanning(_0x1a08fa);
    const _0x130ec8 = setInterval(() => {}, 60000);
    if (!this.pollScanIntervals) {
      this.pollScanIntervals = new Map();
    }
    this.pollScanIntervals.set(_0x1a08fa, {
      monitorInterval: _0x130ec8
    });
  }
  stopPollVoteChecking() {
    if (this.pollVoteCheckInterval) {
      clearInterval(this.pollVoteCheckInterval);
      this.pollVoteCheckInterval = null;
    }
  }
  stopAutomaticPollScanning(_0x2a719d) {
    if (this.pollScanIntervals && this.pollScanIntervals.has(_0x2a719d)) {
      const _0x1489c3 = this.pollScanIntervals.get(_0x2a719d);
      if (_0x1489c3.monitorInterval) {
        clearInterval(_0x1489c3.monitorInterval);
      }
      if (_0x1489c3.scanInterval) {
        clearInterval(_0x1489c3.scanInterval);
      }
      if (_0x1489c3.chatScanInterval) {
        clearInterval(_0x1489c3.chatScanInterval);
      }
      this.pollScanIntervals.delete(_0x2a719d);
    }
  }
  async scanAllChatsForPolls(_0x7832e1) {
    return {
      pollsFound: 0,
      votesFound: 0
    };
  }
  async processVotePermanently(_0x1e7782, _0x5df1db) {
    try {
      const _0x5bdfab = _0x5df1db.message.pollUpdateMessage;
      const _0x45fce5 = _0x5bdfab.pollCreationMessageKey;
      const _0x1d9ffe = _0x5df1db.key.id;
      if (this.processedVotes && this.processedVotes.has(_0x1d9ffe)) {
        return true;
      }
      if (!this.processedVotes) {
        this.processedVotes = new Set();
      }
      this.processedVotes.add(_0x1d9ffe);
      if (!_0x45fce5) {
        return false;
      }
      const _0x2322ad = _0x5df1db.key.remoteJid || _0x5df1db.key.participant;
      const _0xc3c210 = _0x5bdfab.senderTimestampMs || Date.now();
      let _0x30fffc = null;
      if (this.pollTrackingService) {
        _0x30fffc = await this.pollTrackingService.getPollByMessageId(_0x45fce5.id);
      }
      if (!_0x30fffc) {
        await this.createPollFromVote(_0x1e7782, _0x45fce5, _0x2322ad);
        if (this.pollTrackingService) {
          _0x30fffc = await this.pollTrackingService.getPollByMessageId(_0x45fce5.id);
        }
      }
      if (!_0x30fffc) {
        return false;
      }
      const _0x39c71b = this.sessions.get(_0x1e7782);
      const _0x66f4bb = this.stores.get(_0x1e7782);
      if (_0x39c71b && _0x66f4bb && _0x5bdfab.vote) {
        try {
          const _0x385702 = await this.getPollCreationMessage(_0x1e7782, _0x45fce5);
          if (_0x385702 && _0x385702.message) {
            const {
              getAggregateVotesInPollMessage: _0x1816cf
            } = require("@innovatorssoft/baileys");
            const _0x4774bf = [{
              pollUpdateMessageKey: _0x5df1db.key,
              vote: _0x5bdfab.vote,
              senderTimestampMs: _0xc3c210
            }];
            const _0x3de630 = _0x39c71b.user?.id;
            const _0xee5fe6 = _0x1816cf({
              message: _0x385702.message,
              pollUpdates: _0x4774bf
            }, _0x3de630);
            if (_0xee5fe6 && _0xee5fe6.length > 0) {
              const _0x262dc8 = _0x5df1db.key?.id || null;
              const _0x58341d = await this.storeBaileysVoteResult(_0x30fffc.id, _0xee5fe6, _0x2322ad, _0x1d9ffe, _0xc3c210, _0x262dc8);
              if (_0x58341d) {
                return true;
              } else {
                console.error("❌ PERMANENT VOTE: Failed to store decrypted vote");
                return false;
              }
            } else {
              console.error("❌ PERMANENT VOTE: Baileys decryption returned empty/null - storing as undecryptable vote");
              const _0x4c0db8 = _0x5df1db.key?.id || null;
              const _0x311492 = await this.pollTrackingService.db.query("\n                INSERT INTO poll_votes (\n                  poll_message_id, poll_option_id, voter_jid, vote_message_id,\n                  voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback, vote_update_id\n                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n              ", [_0x30fffc.id, null, _0x2322ad, _0x1d9ffe, new Date(_0xc3c210).toISOString(), _0xc3c210 || Date.now(), 0, 1, _0x4c0db8]);
              if (_0x311492.success) {
                console.warn("⚠️ PERMANENT VOTE: Stored as undecryptable vote (not counted in results)");
                return true;
              } else {
                console.error("❌ PERMANENT VOTE: Failed to store undecryptable vote");
                return false;
              }
            }
          } else {
            console.error("❌ PERMANENT VOTE: Poll creation message not found");
            return false;
          }
        } catch (_0x521cfd) {
          console.error("❌ PERMANENT VOTE: Error decrypting vote:", _0x521cfd);
          const _0x15fb52 = _0x5df1db.key?.id || null;
          const _0x26f95c = await this.pollTrackingService.db.query("\n            INSERT INTO poll_votes (\n              poll_message_id, poll_option_id, voter_jid, vote_message_id,\n              voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback, vote_update_id\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n          ", [_0x30fffc.id, null, _0x2322ad, _0x1d9ffe, new Date(_0xc3c210).toISOString(), _0xc3c210 || Date.now(), 0, 1, _0x15fb52]);
          if (_0x26f95c.success) {
            console.warn("⚠️ PERMANENT VOTE: Stored as undecryptable vote due to error");
            return true;
          }
          return false;
        }
      } else {
        console.error("❌ PERMANENT VOTE: No session or store available - storing as undecryptable vote");
        const _0x573235 = _0x5df1db.key?.id || null;
        const _0x5868ad = await this.pollTrackingService.db.query("\n          INSERT INTO poll_votes (\n            poll_message_id, poll_option_id, voter_jid, vote_message_id,\n            voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback, vote_update_id\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [_0x30fffc.id, null, _0x2322ad, _0x1d9ffe, new Date(_0xc3c210).toISOString(), _0xc3c210 || Date.now(), 0, 1, _0x573235]);
        if (_0x5868ad.success) {
          console.warn("⚠️ PERMANENT VOTE: Stored as undecryptable vote (no session/store)");
          return true;
        }
        return false;
      }
    } catch (_0x43b981) {
      console.error("❌ PERMANENT VOTE: Error in permanent processing:", _0x43b981);
      return false;
    }
  }
  async processVoteDirectly(_0x55a87b, _0x487e38) {
    try {
      const _0x2118e4 = _0x487e38.message.pollUpdateMessage;
      const _0x5c9a12 = _0x2118e4.pollCreationMessageKey;
      if (!_0x5c9a12 || !this.pollTrackingService) {
        return false;
      }
      const _0x3803ab = await this.pollTrackingService.getPollByMessageId(_0x5c9a12.id);
      if (!_0x3803ab) {
        return false;
      }
      const _0xfd9a23 = _0x487e38.key.remoteJid || _0x487e38.key.participant;
      const _0x231449 = _0x487e38.key.id;
      const _0x2d473a = _0x2118e4.senderTimestampMs || Date.now();
      const _0x4296de = {
        pollMessageId: _0x3803ab.id,
        voterJid: _0xfd9a23,
        voteMessageId: _0x231449,
        senderTimestampMs: _0x2d473a,
        encPayload: _0x2118e4.vote?.encPayload
      };
      await this.storeVoteDirectly(_0x3803ab.id, _0x487e38.key, _0x2118e4);
      return true;
    } catch (_0x374eae) {
      console.error("❌ DIRECT VOTE: Error in direct processing:", _0x374eae);
      return false;
    }
  }
  async createPollFromVote(_0x83cffc, _0x52033e, _0x3a036c) {
    try {
      const _0x489b22 = {
        message_id: _0x52033e.id,
        session_id: _0x83cffc,
        sender_jid: _0x3a036c,
        poll_question: "Manual Poll",
        sent_at: new Date().toISOString(),
        is_active: 1
      };
      if (this.pollTrackingService) {
        const _0x59017f = await this.pollTrackingService.storePollMessage(_0x489b22);
        const _0x124b12 = ["Yes", "No", "Maybe"];
        for (let _0x382f84 = 0; _0x382f84 < _0x124b12.length; _0x382f84++) {
          await this.pollTrackingService.storePollOption({
            poll_message_id: _0x59017f,
            option_text: _0x124b12[_0x382f84],
            option_index: _0x382f84
          });
        }
        return _0x59017f;
      }
      return null;
    } catch (_0x55fbf1) {
      console.error("❌ PERMANENT VOTE: Error creating poll from vote:", _0x55fbf1);
      return null;
    }
  }
  async insertVoteDirectly(_0x5d4f20, _0x1cd47a) {
    try {
      const _0x128596 = await this.pollTrackingService.getPollOptions(_0x1cd47a.id);
      if (!_0x128596 || _0x128596.length === 0) {
        return false;
      }
      let _0x22d1df = null;
      if (_0x5d4f20.enc_payload) {
        _0x22d1df = await this.tryDecryptVotePayload(_0x5d4f20.enc_payload, _0x128596, _0x1cd47a);
      }
      if (!_0x22d1df) {
        _0x22d1df = this.guessSelectedOption(_0x5d4f20, _0x128596, _0x1cd47a);
        if (_0x22d1df) {
          _0x22d1df.is_fallback = true;
        } else {
          _0x22d1df = _0x128596[0];
          _0x22d1df.is_fallback = true;
        }
      }
      const _0x41c5c1 = {
        poll_message_id: _0x5d4f20.poll_message_id,
        voter_jid: _0x5d4f20.voter_jid,
        poll_option_id: _0x22d1df.id,
        vote_message_id: _0x5d4f20.vote_message_id,
        voted_at: _0x5d4f20.voted_at,
        is_valid: 1,
        is_encrypted_fallback: _0x22d1df.is_fallback ? 1 : 0
      };
      const _0x572904 = await this.pollTrackingService.db.query("\n        INSERT INTO poll_votes (\n          poll_message_id, poll_option_id, voter_jid, vote_message_id,\n          voted_at, is_valid, is_encrypted_fallback\n        ) VALUES (?, ?, ?, ?, ?, ?, ?)\n      ", [_0x41c5c1.poll_message_id, _0x41c5c1.poll_option_id, _0x41c5c1.voter_jid, _0x41c5c1.vote_message_id, _0x41c5c1.voted_at, _0x41c5c1.is_valid, _0x41c5c1.is_encrypted_fallback]);
      if (_0x572904.success) {} else {
        console.error("❌ PERMANENT VOTE: Error storing vote:", _0x572904.error);
      }
      return true;
    } catch (_0x245fb7) {
      console.error("❌ PERMANENT VOTE: Error inserting vote:", _0x245fb7);
      return false;
    }
  }
  async storeBaileysVoteResult(_0x201934, _0x55fff8, _0x19b7e5, _0x2fba99, _0x2effeb, _0x32703f = null) {
    try {
      const _0x47cee6 = await this.pollTrackingService.getPollOptions(_0x201934);
      if (!_0x47cee6 || _0x47cee6.length === 0) {
        console.error("❌ BAILEYS STORE: No poll options found");
        return false;
      }
      let _0x478b2e = null;
      for (const _0x11d69a of _0x55fff8) {
        if (_0x11d69a.voters && _0x11d69a.voters.includes(_0x19b7e5)) {
          _0x478b2e = _0x47cee6.find(_0x35873f => _0x35873f.option_text === _0x11d69a.name);
          if (_0x478b2e) {
            break;
          }
        }
      }
      if (!_0x478b2e) {
        console.error("❌ BAILEYS STORE: Could not find selected option for voter");
        return false;
      }
      const _0xdc9bac = await this.pollTrackingService.db.query("\n        SELECT id FROM poll_votes\n        WHERE poll_message_id = ? AND voter_jid = ?\n      ", [_0x201934, _0x19b7e5]);
      const _0x5b6ac2 = _0xdc9bac.success && _0xdc9bac.data && (Array.isArray(_0xdc9bac.data) && _0xdc9bac.data.length > 0 || !Array.isArray(_0xdc9bac.data) && _0xdc9bac.data.values?.length > 0);
      if (_0x5b6ac2) {
        return true;
      }
      const _0x1564ff = await this.pollTrackingService.db.query("\n        INSERT INTO poll_votes (\n          poll_message_id, poll_option_id, voter_jid, vote_message_id,\n          voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback, vote_update_id\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [_0x201934, _0x478b2e.id, _0x19b7e5, _0x2fba99, new Date(_0x2effeb).toISOString(), _0x2effeb || Date.now(), 1, 0, _0x32703f]);
      if (_0x1564ff.success) {
        return true;
      } else {
        console.error("❌ BAILEYS STORE: Error storing vote:", _0x1564ff.error);
        return false;
      }
    } catch (_0x348f6d) {
      console.error("❌ BAILEYS STORE: Error storing Baileys vote result:", _0x348f6d);
      return false;
    }
  }
  async extractVoteSimply(_0x55b187, _0x43c212, _0x50efac, _0x2f482f) {
    try {
      if (!_0x55b187.poll_options || _0x55b187.poll_options.length === 0) {
        return false;
      }
      const _0x2ffd4c = await this.pollTrackingService.getVotesByPollId(_0x55b187.id);
      const _0xbef848 = _0x2ffd4c.length % _0x55b187.poll_options.length;
      const _0x641813 = _0x55b187.poll_options[_0xbef848];
      const _0x47c249 = {
        poll_id: _0x55b187.id,
        voter_jid: _0x43c212,
        selected_option: _0x641813,
        vote_message_id: _0x50efac,
        voted_at: new Date().toISOString(),
        extraction_method: "simple_fallback"
      };
      const _0x23a39d = await this.pollTrackingService.storeVote(_0x47c249);
      if (_0x23a39d) {
        return true;
      } else {
        return false;
      }
    } catch (_0x9071ea) {
      console.error("❌ SIMPLE VOTE: Error in simple vote extraction:", _0x9071ea);
      return false;
    }
  }
  async getPollCreationMessage(_0x47ae66, _0x1d0b6e) {
    try {
      const _0x3256a5 = this.stores.get(_0x47ae66);
      if (!_0x3256a5) {
        return null;
      }
      try {
        const _0x5053e9 = await _0x3256a5.loadMessage(_0x1d0b6e.remoteJid, _0x1d0b6e.id);
        if (_0x5053e9 && _0x5053e9.message) {
          return _0x5053e9;
        }
      } catch (_0x1cc5e6) {}
      const _0x41c153 = this.pollMessageCache.get(_0x1d0b6e.id);
      if (_0x41c153) {
        return _0x41c153;
      }
      const _0x4a5fef = this.permanentPollCache.get(_0x1d0b6e.id);
      if (_0x4a5fef) {
        return _0x4a5fef;
      }
      try {
        const _0x2035dd = _0x3256a5.messages[_0x1d0b6e.remoteJid];
        if (_0x2035dd) {
          const _0x99244f = _0x2035dd.all();
          const _0x2715bf = _0x99244f.find(_0x22564b => _0x22564b.key.id === _0x1d0b6e.id);
          if (_0x2715bf && _0x2715bf.message) {
            return _0x2715bf;
          }
        }
      } catch (_0x57ea69) {}
      return null;
    } catch (_0x236e21) {
      console.error("❌ POLL CREATION: Error getting poll creation message:", _0x236e21);
      return null;
    }
  }
  extractVoteSelectionDirect(_0xa0489c, _0x2874bc) {
    try {
      if (_0xa0489c.vote && _0xa0489c.vote.selectedOptions) {
        const _0xf1b388 = _0xa0489c.vote.selectedOptions;
        if (Array.isArray(_0xf1b388) && _0xf1b388.length > 0) {
          const _0x39155a = _0xf1b388[0];
          if (_0x39155a >= 0 && _0x39155a < _0x2874bc.length) {
            const _0x373c2b = _0x2874bc[_0x39155a];
            return _0x373c2b;
          }
        }
      }
      if (_0xa0489c.vote && _0xa0489c.vote.optionName) {
        const _0x1ca531 = _0xa0489c.vote.optionName;
        const _0x1facb4 = _0x2874bc.find(_0x451706 => _0x451706.option_text === _0x1ca531);
        if (_0x1facb4) {
          return _0x1facb4;
        }
      }
      if (_0xa0489c.pollUpdates && Array.isArray(_0xa0489c.pollUpdates)) {
        for (const _0x5811e2 of _0xa0489c.pollUpdates) {
          if (_0x5811e2.optionName) {
            const _0x34c8ca = _0x2874bc.find(_0x487788 => _0x487788.option_text === _0x5811e2.optionName);
            if (_0x34c8ca) {
              return _0x34c8ca;
            }
          }
          if (_0x5811e2.selectedOptions && Array.isArray(_0x5811e2.selectedOptions)) {
            const _0xbc7868 = _0x5811e2.selectedOptions[0];
            if (_0xbc7868 >= 0 && _0xbc7868 < _0x2874bc.length) {
              return _0x2874bc[_0xbc7868];
            }
          }
        }
      }
      if (_0xa0489c.vote) {
        if (_0xa0489c.vote.encPayload) {
          const _0x4081a3 = _0xa0489c.vote.encPayload;
          const _0x202b2b = this.hashString(_0x4081a3.toString());
          const _0x1a3d76 = this.matchVoteWithOptionHashes(_0x4081a3, _0x2874bc);
          if (_0x1a3d76) {
            return _0x1a3d76;
          }
          const _0x2f6996 = _0x202b2b % _0x2874bc.length;
          if (_0x2874bc[_0x2f6996]) {
            return _0x2874bc[_0x2f6996];
          }
        }
      }
      return null;
    } catch (_0x487600) {
      console.error("❌ DIRECT EXTRACT: Error during direct extraction:", _0x487600);
      return null;
    }
  }
  async tryDecryptVotePayload(_0xd8b22b, _0x14136e, _0x14eee8) {
    try {
      return null;
    } catch (_0x3b33f4) {
      console.error("❌ VOTE DECRYPT: Error during decryption:", _0x3b33f4);
      return null;
    }
  }
  matchVoteWithOptionHashes(_0x4a8589, _0x4d581d) {
    try {
      const _0x153f60 = _0x4a8589.toString();
      const _0x1c8a54 = Buffer.from(_0x4a8589).toString("hex");
      const _0xa53d89 = Buffer.from(_0x4a8589).toString("base64");
      for (const _0x3f2538 of _0x4d581d) {
        if (_0x3f2538.option_hash) {
          if (_0x153f60.includes(_0x3f2538.option_hash) || _0x1c8a54.includes(_0x3f2538.option_hash) || _0xa53d89.includes(_0x3f2538.option_hash)) {
            return _0x3f2538;
          }
          const _0x1d530a = _0x3f2538.option_hash.substring(0, 16);
          if (_0x153f60.includes(_0x1d530a) || _0x1c8a54.includes(_0x1d530a) || _0xa53d89.includes(_0x1d530a)) {
            return _0x3f2538;
          }
        }
      }
      return null;
    } catch (_0x4a936c) {
      console.error("❌ HASH MATCH: Error during hash matching:", _0x4a936c);
      return null;
    }
  }
  hashString(_0x109c7e) {
    let _0x16f15c = 0;
    if (_0x109c7e.length === 0) {
      return _0x16f15c;
    }
    for (let _0x4d3ea1 = 0; _0x4d3ea1 < _0x109c7e.length; _0x4d3ea1++) {
      const _0x1f026e = _0x109c7e.charCodeAt(_0x4d3ea1);
      _0x16f15c = (_0x16f15c << 5) - _0x16f15c + _0x1f026e;
      _0x16f15c = _0x16f15c & _0x16f15c;
    }
    return Math.abs(_0x16f15c);
  }
  guessSelectedOption(_0xbaada2, _0x54232a, _0x279524) {
    try {
      if (_0xbaada2.enc_payload) {
        const _0x3d43aa = _0xbaada2.enc_payload.length;
        const _0x542b7c = _0x3d43aa % _0x54232a.length;
        if (_0x54232a[_0x542b7c]) {
          return _0x54232a[_0x542b7c];
        }
      }
      const _0x81ef5c = _0xbaada2.voter_jid;
      if (_0x81ef5c) {
        const _0x437701 = _0x81ef5c.match(/(\d+)/);
        if (_0x437701) {
          const _0x28d9e3 = _0x437701[1];
          const _0x4ae602 = parseInt(_0x28d9e3.slice(-1));
          const _0x4ab8bc = _0x4ae602 % _0x54232a.length;
          if (_0x54232a[_0x4ab8bc]) {
            return _0x54232a[_0x4ab8bc];
          }
        }
      }
      const _0x3ce1e1 = new Date(_0xbaada2.voted_at).getTime();
      const _0xa7a980 = Math.floor(_0x3ce1e1 / 1000) % _0x54232a.length;
      if (_0x54232a[_0xa7a980]) {
        return _0x54232a[_0xa7a980];
      }
      const _0x10b08f = this.hashString(_0xbaada2.voter_jid + _0xbaada2.vote_message_id);
      const _0xc5ff8e = _0x10b08f % _0x54232a.length;
      return _0x54232a[_0xc5ff8e] || _0x54232a[0];
    } catch (_0x2adec9) {
      console.error("❌ VOTE GUESS: Error in guessing logic:", _0x2adec9);
      return _0x54232a[0];
    }
  }
  async processPollVoteFallback(_0x56a87b, _0x32947a, _0x252bd4) {
    try {
      const _0x3c3d3d = _0x32947a.message.pollUpdateMessage;
      const _0x50d617 = _0x32947a.key.remoteJid || _0x32947a.key.participant;
      if (this.pollTrackingService) {
        const _0x49eb3b = await this.pollTrackingService.getPollByMessageId(_0x252bd4.id);
        if (_0x49eb3b) {
          const _0x4e7cdb = {
            pollMessageId: _0x49eb3b.id,
            voterJid: _0x50d617,
            voteMessageId: _0x32947a.key.id,
            senderTimestampMs: _0x3c3d3d.senderTimestampMs || Date.now(),
            encPayload: _0x3c3d3d.vote?.encPayload
          };
          await this.storeVoteDirectly(_0x49eb3b.id, _0x32947a.key, _0x3c3d3d);
          return true;
        } else {}
      }
      return false;
    } catch (_0x17972c) {
      console.error("❌ FALLBACK VOTE: Error in fallback processing:", _0x17972c);
      return false;
    }
  }
  async storeVoteDirectly(_0x79f2fb, _0x308065, _0x2d47ed) {
    try {
      const _0x472d65 = _0x308065.remoteJid;
      const _0x4d7061 = _0x308065.id;
      const _0x5dffb0 = _0x2d47ed.senderTimestampMs;
      const _0x37b3d3 = await this.pollTrackingService.db.query("\n        SELECT id, option_text FROM poll_options\n        WHERE poll_message_id = ?\n        ORDER BY option_index\n        LIMIT 1\n      ", [_0x79f2fb]);
      if (!_0x37b3d3.success || !_0x37b3d3.data || _0x37b3d3.data.length === 0) {
        console.error("❌ DIRECT VOTE: Could not find poll options for poll:", _0x79f2fb);
        return false;
      }
      const _0x422b2d = Array.isArray(_0x37b3d3.data) ? _0x37b3d3.data[0] : _0x37b3d3.data;
      const _0x48eb35 = await this.pollTrackingService.db.query("\n        INSERT OR REPLACE INTO poll_votes (\n          poll_message_id, poll_option_id, voter_jid, vote_message_id,\n          voted_at, sender_timestamp_ms, is_valid\n        ) VALUES (?, ?, ?, ?, ?, ?, ?)\n      ", [_0x79f2fb, _0x422b2d.id, _0x472d65, _0x4d7061, new Date().toISOString(), _0x5dffb0, 1]);
      if (_0x48eb35.success) {
        return true;
      } else {
        console.error("❌ DIRECT VOTE: Error storing vote:", _0x48eb35.error);
        return false;
      }
    } catch (_0x135c19) {
      console.error("❌ DIRECT VOTE: Error in direct vote storage:", _0x135c19);
      return false;
    }
  }
  extractVoteManually(_0x11f992, _0x31d2bf, _0x2215e5) {
    try {
      const _0x3f4d08 = _0x11f992.message?.pollCreationMessage;
      if (!_0x3f4d08) {
        return null;
      }
      let _0x5badd4 = _0x3f4d08.options || _0x3f4d08.poll?.values || [];
      if (_0x5badd4.length === 0) {
        return null;
      }
      const _0x244484 = _0x31d2bf.vote;
      if (!_0x244484) {
        return null;
      }
      const _0x371bab = _0x2215e5.remoteJid;
      let _0x363530 = 0;
      if (_0x244484.encPayload && _0x244484.encPayload.length > 0) {
        try {
          const _0x4d51a0 = Array.from(_0x244484.encPayload);
          if (_0x4d51a0.length > 0) {
            const _0x27549d = _0x4d51a0.reduce((_0x10005a, _0x1defec) => _0x10005a + _0x1defec, 0);
            const _0x5bac45 = _0x27549d % _0x5badd4.length;
            const _0x411d91 = _0x4d51a0.reduce((_0x113224, _0x56417a) => _0x113224 ^ _0x56417a, 0);
            const _0x1dff82 = _0x411d91 % _0x5badd4.length;
            const _0x40964e = Math.floor(_0x4d51a0.length / 2);
            const _0x21391b = _0x4d51a0[_0x40964e] || 0;
            const _0x2c9edb = _0x21391b % _0x5badd4.length;
            const _0x2e968a = _0x4d51a0[0];
            const _0x3b90c6 = _0x4d51a0[_0x4d51a0.length - 1];
            const _0x27b3c3 = (_0x2e968a + _0x3b90c6) % _0x5badd4.length;
            const _0xb4f154 = [_0x5bac45, _0x1dff82, _0x2c9edb, _0x27b3c3];
            const _0x3e5e26 = new Array(_0x5badd4.length).fill(0);
            _0xb4f154.forEach(_0x39a9e8 => _0x3e5e26[_0x39a9e8]++);
            const _0x634e07 = Math.max(..._0x3e5e26);
            const _0x4b2094 = _0x3e5e26.map((_0x5eb75d, _0x5b996c) => _0x5eb75d === _0x634e07 ? _0x5b996c : -1).filter(_0x205582 => _0x205582 !== -1);
            _0x363530 = _0x4b2094.length === 1 ? _0x4b2094[0] : _0x5bac45;
          }
        } catch (_0x143dd4) {
          _0x363530 = 0;
        }
      }
      if (_0x363530 >= _0x5badd4.length) {
        _0x363530 = 0;
      }
      const _0x3ee4d4 = _0x5badd4[_0x363530];
      const _0x27f89c = _0x3ee4d4.optionName || _0x3ee4d4.name || _0x3ee4d4;
      const _0x5bbbdb = {
        voters: [_0x371bab],
        selectedOption: _0x3ee4d4,
        selectedOptionIndex: _0x363530,
        optionName: _0x27f89c,
        timestamp: Date.now(),
        isHeuristic: true
      };
      return _0x5bbbdb;
    } catch (_0x14a264) {
      console.error("❌ MANUAL EXTRACTION: Error in manual extraction:", _0x14a264);
      return null;
    }
  }
  async checkForMissedPollVotes(_0x2c19d3) {
    try {
      const _0x18a432 = this.sessions.get(_0x2c19d3);
      if (!_0x18a432 || !this.pollTrackingService) {
        return;
      }
      const _0x41c6ce = await this.pollTrackingService.getRecentPolls(24);
      for (const _0x37aba5 of _0x41c6ce) {
        try {
          const _0x5a7c83 = await this.getMessage(_0x2c19d3, {
            id: _0x37aba5.message_id,
            remoteJid: _0x37aba5.recipient_jid,
            fromMe: true
          });
          if (_0x5a7c83 && _0x5a7c83.message && _0x5a7c83.message.pollCreationMessage) {}
        } catch (_0x29215f) {
          console.error("❌ POLL VOTE CHECK: Error checking poll", _0x37aba5.id, ":", _0x29215f.message);
        }
      }
    } catch (_0x35ac12) {
      console.error("❌ POLL VOTE CHECK: Error in checkForMissedPollVotes:", _0x35ac12);
    }
  }
  async sendPollVoteNotification(_0x56e5b5, _0x224f58, _0x53f1e3, _0x41900c, _0x40e902 = null) {
    try {
      const _0x2bf6c7 = this.sessions.get(_0x56e5b5);
      if (!_0x2bf6c7) {
        return;
      }
      const _0x53c392 = _0x2bf6c7.user?.id;
      if (!_0x53c392) {
        return;
      }
      let _0x26c284;
      let _0x8dd24c;
      if (_0x40e902) {
        _0x26c284 = _0x40e902.participant || _0x40e902.remoteJid;
        _0x8dd24c = _0x26c284.replace("@s.whatsapp.net", "").replace("@g.us", "");
      } else {
        const _0x450096 = _0x41900c[_0x41900c.length - 1];
        _0x26c284 = _0x450096.pollUpdateMessageKey.participant || _0x450096.pollUpdateMessageKey.remoteJid;
        _0x8dd24c = _0x26c284.replace("@s.whatsapp.net", "").replace("@g.us", "");
      }
      let _0x22a33b = [];
      for (const _0x184c59 of _0x53f1e3) {
        if (_0x184c59.voters && _0x184c59.voters.length > 0) {
          const _0x40632b = _0x184c59.voters.some(_0x25eac4 => _0x25eac4.replace("@s.whatsapp.net", "") === _0x8dd24c);
          if (_0x40632b) {
            _0x22a33b.push(_0x184c59.name);
          }
        }
      }
      let _0x312426 = "🗳️ *POLL VOTE RECEIVED*\n\n";
      _0x312426 += "👤 *Voter:* " + _0x8dd24c + "\n";
      _0x312426 += "📊 *Poll ID:* " + _0x224f58.id + "\n";
      if (_0x22a33b.length > 0) {
        _0x312426 += "✅ *Selected Option(s):*\n";
        _0x22a33b.forEach(_0x42d975 => {
          _0x312426 += "   • " + _0x42d975 + "\n";
        });
      } else {
        _0x312426 += "❓ *Vote details could not be determined*\n";
      }
      _0x312426 += "\n📈 *Current Results:*\n";
      _0x53f1e3.forEach(_0x3e5c1e => {
        const _0x5da2ac = _0x3e5c1e.voters ? _0x3e5c1e.voters.length : 0;
        _0x312426 += "   " + _0x3e5c1e.name + ": " + _0x5da2ac + " vote(s)\n";
      });
      _0x312426 += "\n⏰ *Time:* " + new Date().toLocaleString();
      await _0x2bf6c7.sendMessage(_0x53c392, {
        text: _0x312426
      });
    } catch (_0x56e2e8) {
      console.error("❌ POLL VOTE NOTIFICATION ERROR:", _0x56e2e8);
      this.logger.error("Error sending poll vote notification:", _0x56e2e8);
    }
  }
  async handleContactsUpdate(_0x49350a, _0x5efd6d) {
    try {
      const _0x13934d = this.stores.get(_0x49350a);
      if (_0x13934d && _0x13934d.contacts) {
        for (const _0x145c46 of _0x5efd6d) {
          _0x13934d.contacts[_0x145c46.id] = _0x145c46;
          if (_0x145c46.lid && _0x145c46.id && _0x145c46.id !== _0x145c46.lid) {
            try {
              await this.databaseService.run("INSERT OR REPLACE INTO lid_mappings (session_id, lid, jid, contact_name, updated_at)\n                 VALUES (?, ?, ?, ?, datetime('now'))", [_0x49350a, _0x145c46.lid, _0x145c46.id, _0x145c46.name || _0x145c46.notify || null]);
            } catch (_0xb2ba09) {
              this.logger.warn("Could not save LID mapping to database: " + _0xb2ba09.message);
            }
          }
        }
      }
    } catch (_0x4b9acf) {
      this.logger.error("Error processing contacts update:", _0x4b9acf);
    }
    this.emit("contacts_update", {
      sessionId: _0x49350a,
      contacts: _0x5efd6d
    });
  }
  async triggerOutgoingCallResponse(_0x3c864e, _0x14e51f) {
    try {
      this.logger.info("📞 MANUAL OUTGOING CALL TRIGGER: " + _0x14e51f);
      const _0x472822 = {
        id: "manual_" + Date.now(),
        from: _0x14e51f,
        chatId: _0x14e51f,
        status: "outgoing_manual",
        isVideo: false,
        isGroup: false,
        date: new Date(),
        offline: false,
        timestamp: new Date(),
        isOutgoing: true,
        manual: true
      };
      await this.processCallResponderRules(_0x3c864e, _0x472822);
      return {
        success: true,
        message: "Outgoing call response triggered"
      };
    } catch (_0x24b086) {
      this.logger.error("Error triggering outgoing call response:", _0x24b086);
      return {
        success: false,
        error: _0x24b086.message
      };
    }
  }
  async handleCallLogMessages(_0x3d2a92, _0x4792c5) {
    const {
      messages: _0x1688a6,
      type: _0x1731d6
    } = _0x4792c5;
    if (_0x1731d6 === "notify") {
      for (const _0x596af1 of _0x1688a6) {
        if (_0x596af1.message && _0x596af1.message.callLogMessage) {
          const _0x4ad9a3 = _0x596af1.message.callLogMessage;
          this.logger.info("📞 OUTGOING CALL LOG DETECTED: " + JSON.stringify(_0x4ad9a3));
          const _0x358c3c = {
            id: _0x596af1.key.id,
            from: _0x596af1.key.remoteJid,
            chatId: _0x596af1.key.remoteJid,
            status: "outgoing_complete",
            isVideo: _0x4ad9a3.isVideo || false,
            isGroup: false,
            date: new Date(_0x596af1.messageTimestamp * 1000),
            offline: false,
            timestamp: new Date(),
            isOutgoing: true,
            callOutcome: _0x4ad9a3.callOutcome,
            durationSecs: _0x4ad9a3.durationSecs
          };
          this.logger.info("📞 SYNTHETIC OUTGOING CALL: " + JSON.stringify(_0x358c3c));
          this.emit("call_received", {
            sessionId: _0x3d2a92,
            call: _0x358c3c
          });
          await this.processCallResponderRules(_0x3d2a92, _0x358c3c);
        }
      }
    }
  }
  async handleCalls(_0x3c1768, _0x467f4d) {
    for (const _0x3b6b75 of _0x467f4d) {
      const _0x36448 = this.sessions.get(_0x3c1768);
      let _0x11452f = _0x36448?.phoneNumber;
      if (!_0x11452f) {
        try {
          const _0x61e42f = await this.databaseService.get("SELECT phone_number FROM whatsapp_sessions WHERE session_id = ?", [_0x3c1768]);
          _0x11452f = _0x61e42f?.phone_number;
        } catch (_0x52114b) {
          this.logger.error("Error retrieving session phone from DB:", _0x52114b);
        }
      }
      const _0xc046 = {
        id: _0x3b6b75.id,
        from: _0x3b6b75.from,
        chatId: _0x3b6b75.chatId,
        status: _0x3b6b75.status,
        isVideo: _0x3b6b75.isVideo,
        isGroup: _0x3b6b75.isGroup,
        groupJid: _0x3b6b75.groupJid,
        date: _0x3b6b75.date,
        offline: _0x3b6b75.offline,
        timestamp: new Date()
      };
      const _0x2aad99 = _0x11452f && _0x3b6b75.from && _0x3b6b75.from.includes(_0x11452f.replace(/\+/g, ""));
      this.logger.info("📞 Call event: " + _0x3b6b75.status + " | From: " + _0x3b6b75.from + " | Direction: " + (_0x2aad99 ? "OUTGOING" : "INCOMING"));
      this.emit("call_received", {
        sessionId: _0x3c1768,
        call: {
          ..._0xc046,
          isOutgoing: _0x2aad99
        }
      });
      if (!_0x2aad99) {
        await this.processCallResponderRules(_0x3c1768, _0xc046);
      }
    }
  }
  async processCallResponderRules(_0x3b2f14, _0x30ba25) {
    try {
      if (!this.databaseService) {
        return;
      }
      if (!this.callTracker) {
        this.callTracker = new Map();
      }
      const _0x10fc40 = _0x3b2f14 + "_" + _0x30ba25.id + "_" + _0x30ba25.from;
      if (!this.callTracker.has(_0x10fc40)) {
        this.callTracker.set(_0x10fc40, {
          sessionId: _0x3b2f14,
          callId: _0x30ba25.id,
          from: _0x30ba25.from,
          statuses: [],
          processed: false,
          firstSeen: Date.now(),
          lastUpdate: Date.now()
        });
      }
      const _0x5f09b8 = this.callTracker.get(_0x10fc40);
      _0x5f09b8.statuses.push(_0x30ba25.status);
      _0x5f09b8.lastUpdate = Date.now();
      if (["terminate", "accept", "reject"].includes(_0x30ba25.status)) {
        setTimeout(async () => {
          await this.processFinalCall(_0x10fc40);
        }, 1000);
        return;
      }
      const _0x1dbb39 = Date.now() - 120000;
      for (const [_0x37a9e6, _0x4eea5b] of this.callTracker.entries()) {
        if (_0x4eea5b.lastUpdate < _0x1dbb39) {
          this.callTracker.delete(_0x37a9e6);
        }
      }
      this.logger.info("📞 Setting up 10-second timeout for call stabilization");
      setTimeout(async () => {
        this.logger.info("📞 Timeout triggered - checking call stabilization");
        try {
          const _0x4ccdf1 = this.callTracker.get(_0x10fc40);
          if (!_0x4ccdf1 || _0x4ccdf1.processed) {
            this.logger.info("📞 Call already processed or cleaned up");
            return;
          }
          const _0x419b94 = Date.now() - _0x4ccdf1.lastUpdate;
          if (_0x419b94 < 10000) {
            this.logger.info("📞 Still receiving updates, waiting more...");
            return;
          }
          _0x4ccdf1.processed = true;
          this.logger.info("📞 Marking call as processed");
          const _0x18c6f7 = _0x4ccdf1.statuses;
          this.logger.info("📞 Raw statuses array: [" + _0x18c6f7.join(", ") + "]");
          const _0x48cbc5 = _0x18c6f7.includes("offer");
          const _0x133f57 = _0x18c6f7.includes("ringing");
          const _0x565bb9 = _0x18c6f7.includes("accept");
          const _0x34d816 = _0x18c6f7.includes("reject");
          const _0x2cdd1c = _0x18c6f7.includes("terminate");
          this.logger.info("📞 Call sequence analysis: offer=" + _0x48cbc5 + ", ringing=" + _0x133f57 + ", accept=" + _0x565bb9 + ", reject=" + _0x34d816 + ", terminate=" + _0x2cdd1c);
          let _0x3fd49d = null;
          const _0x8c1c8f = this.sessions.get(_0x4ccdf1.sessionId);
          let _0x5294b8 = _0x8c1c8f?.phoneNumber;
          if (!_0x5294b8) {
            try {
              const _0x17f495 = await this.databaseService.get("SELECT phone_number FROM whatsapp_sessions WHERE session_id = ?", [_0x4ccdf1.sessionId]);
              _0x5294b8 = _0x17f495?.phone_number;
            } catch (_0xedc1cb) {
              this.logger.error("TIMEOUT: Error retrieving session phone from DB:", _0xedc1cb);
            }
          }
          const _0x4b2841 = _0x5294b8 && _0x4ccdf1.from && _0x4ccdf1.from.includes(_0x5294b8.replace(/\+/g, ""));
          this.logger.info("📞 TIMEOUT: Call direction check - Session Phone: " + _0x5294b8 + ", From: " + _0x4ccdf1.from + ", IsOutgoing: " + _0x4b2841);
          if (_0x4b2841 || _0x4ccdf1.manual) {
            if (_0x2cdd1c || _0x4ccdf1.manual) {
              _0x3fd49d = "outgoing";
              this.logger.info("📞 TIMEOUT: Final call type: OUTGOING (call made by user) - " + (_0x4ccdf1.manual ? "MANUAL" : "AUTO"));
            }
          } else if (_0x34d816) {
            _0x3fd49d = "rejected";
            this.logger.info("📞 TIMEOUT: Final call type: REJECTED (user rejected the call)");
          } else if (_0x565bb9) {
            _0x3fd49d = "received";
            this.logger.info("📞 TIMEOUT: Final call type: RECEIVED (call was answered)");
          } else if (_0x48cbc5 && _0x133f57 && _0x2cdd1c && !_0x565bb9) {
            _0x3fd49d = "missed";
            this.logger.info("📞 TIMEOUT: Final call type: MISSED (call rang but wasn't answered)");
          }
          if (!_0x3fd49d) {
            this.logger.info("📞 TIMEOUT: Call incomplete, waiting for final events: " + _0x18c6f7.join(" -> "));
            this.logger.info("📞 TIMEOUT: Sequence details: offer=" + _0x48cbc5 + ", ringing=" + _0x133f57 + ", accept=" + _0x565bb9 + ", reject=" + _0x34d816 + ", terminate=" + _0x2cdd1c);
            _0x4ccdf1.processed = false;
            return;
          }
          if (_0x3fd49d) {
            this.logger.info("📞 Processing final call responder for type: " + _0x3fd49d);
            await this.processFinalCallResponder(_0x3b2f14, {
              ..._0x30ba25,
              status: _0x3fd49d,
              originalSequence: _0x18c6f7.join(" -> ")
            });
          }
        } catch (_0x531f71) {
          this.logger.error("📞 Error in timeout callback:", _0x531f71);
          return;
        }
      }, 10000);
    } catch (_0x511ce1) {
      this.logger.error("❌ ERROR in processCallResponderRules for " + _0x3b2f14 + ":", _0x511ce1);
      this.logger.error("❌ Error stack:", _0x511ce1.stack);
    }
  }
  async processFinalCall(_0x56dda7) {
    try {
      if (!this.callTracker || !this.callTracker.has(_0x56dda7)) {
        return;
      }
      const _0x19f9c7 = this.callTracker.get(_0x56dda7);
      if (_0x19f9c7.processed) {
        return;
      }
      _0x19f9c7.processed = true;
      const _0x4cbca4 = _0x19f9c7.statuses;
      this.logger.info("📞 IMMEDIATE: Raw statuses array: [" + _0x4cbca4.join(", ") + "]");
      const _0xbb11be = _0x4cbca4.includes("offer");
      const _0x44a7cd = _0x4cbca4.includes("ringing");
      const _0x310c77 = _0x4cbca4.includes("accept");
      const _0x58dafe = _0x4cbca4.includes("reject");
      const _0xbcfd62 = _0x4cbca4.includes("terminate");
      this.logger.info("📞 IMMEDIATE: Call sequence analysis: offer=" + _0xbb11be + ", ringing=" + _0x44a7cd + ", accept=" + _0x310c77 + ", reject=" + _0x58dafe + ", terminate=" + _0xbcfd62);
      let _0x36e27b = null;
      const _0x42f3e8 = this.sessions.get(_0x19f9c7.sessionId);
      let _0x20cf5a = _0x42f3e8?.phoneNumber;
      if (!_0x20cf5a) {
        try {
          const _0x422ea5 = await this.databaseService.get("SELECT phone_number FROM whatsapp_sessions WHERE session_id = ?", [_0x19f9c7.sessionId]);
          _0x20cf5a = _0x422ea5?.phone_number;
        } catch (_0x286182) {
          this.logger.error("IMMEDIATE: Error retrieving session phone from DB:", _0x286182);
        }
      }
      const _0x518e4c = _0x20cf5a && _0x19f9c7.from && _0x19f9c7.from.includes(_0x20cf5a.replace(/\+/g, ""));
      this.logger.info("📞 IMMEDIATE: Call direction check - IsOutgoing: " + _0x518e4c);
      if (_0x518e4c || _0x19f9c7.manual) {
        if (_0xbcfd62 || _0x19f9c7.manual) {
          _0x36e27b = "outgoing";
          this.logger.info("📞 IMMEDIATE: Final call type: OUTGOING (call made by user) - " + (_0x19f9c7.manual ? "MANUAL" : "AUTO"));
        }
      } else if (_0x58dafe) {
        _0x36e27b = "rejected";
        this.logger.info("📞 IMMEDIATE: Final call type: REJECTED (user rejected the call)");
      } else if (_0x310c77) {
        _0x36e27b = "received";
        this.logger.info("📞 IMMEDIATE: Final call type: RECEIVED (call was answered)");
      } else if (_0xbb11be && _0x44a7cd && _0xbcfd62 && !_0x310c77) {
        _0x36e27b = "missed";
        this.logger.info("📞 IMMEDIATE: Final call type: MISSED (call rang but wasn't answered)");
      }
      if (!_0x36e27b) {
        this.logger.info("📞 IMMEDIATE: Unable to determine call type from sequence: " + _0x4cbca4.join(" -> "));
        return;
      }
      if (_0x36e27b) {
        this.logger.info("📞 IMMEDIATE: Processing final call responder for type: " + _0x36e27b);
        await this.processFinalCallResponder(_0x19f9c7.sessionId, {
          id: _0x19f9c7.callId,
          from: _0x19f9c7.from,
          status: _0x36e27b,
          originalSequence: _0x4cbca4.join(" -> ")
        });
      }
    } catch (_0x21e38e) {
      this.logger.error("❌ ERROR in processFinalCall:", _0x21e38e);
    }
  }
  async processFinalCallResponder(_0x7904bd, _0x358191) {
    try {
      const _0x370e76 = await this.databaseService.query("SELECT * FROM call_responses\n         WHERE session_id = ? AND is_active = 1\n         ORDER BY created_at ASC", [_0x7904bd]);
      if (!_0x370e76.success || !_0x370e76.data.length) {
        this.logger.info("📞 No active call responder rules found for session " + _0x7904bd);
        return;
      }
      for (const _0x538d96 of _0x370e76.data) {
        const _0x3528b0 = JSON.parse(_0x538d96.call_types || "[]");
        if (_0x3528b0.includes(_0x358191.status)) {
          this.logger.info("📞 Call responder rule \"" + _0x538d96.name + "\" triggered for " + _0x358191.status + " call from " + _0x358191.from);
          if (_0x538d96.cooldown_minutes && _0x538d96.cooldown_minutes > 0) {
            const _0x18ca8e = await this.databaseService.query("SELECT last_triggered FROM call_response_cooldowns\n               WHERE rule_id = ? AND contact_jid = ?", [_0x538d96.id, _0x358191.from]);
            if (_0x18ca8e.success && _0x18ca8e.data.length > 0) {
              const _0x520505 = new Date(_0x18ca8e.data[0].last_triggered);
              const _0x2df695 = new Date();
              const _0x11507d = (_0x2df695 - _0x520505) / 60000;
              if (_0x11507d < _0x538d96.cooldown_minutes) {
                this.logger.info("Call responder rule \"" + _0x538d96.name + "\" is in cooldown for " + _0x358191.from);
                continue;
              }
            }
          }
          if (_0x538d96.cooldown_minutes && _0x538d96.cooldown_minutes > 0) {
            const _0x3f7734 = new Date().toISOString();
            const _0x4ab50d = await this.databaseService.query("INSERT INTO call_response_cooldowns (rule_id, contact_jid, last_triggered)\n               VALUES (?, ?, ?)\n               ON CONFLICT(rule_id, contact_jid)\n               DO UPDATE SET last_triggered = ?", [_0x538d96.id, _0x358191.from, _0x3f7734, _0x3f7734]);
            if (_0x4ab50d.success) {
              await this.databaseService.saveDatabase();
            }
          }
          const _0x4b8966 = _0x538d96.delay_seconds || _0x538d96.delay_minutes * 60 || 60;
          setTimeout(() => {
            this.sendCallResponse(_0x7904bd, _0x358191, _0x538d96).catch(_0x4181b1 => {
              this.logger.error("Error in delayed call response:", _0x4181b1);
            });
          }, _0x4b8966 * 1000);
        }
      }
    } catch (_0x5aca9a) {
      this.logger.error("Error processing final call responder for " + _0x7904bd + ":", _0x5aca9a);
    }
  }
  async sendCallResponse(_0x5f3fde, _0xc74492, _0x5d17b0) {
    try {
      let _0x2003ff;
      if (_0x5d17b0.message_type === "template" && _0x5d17b0.template_id) {
        const _0x643eb6 = await this.databaseService.query("SELECT * FROM message_templates WHERE id = ?", [_0x5d17b0.template_id]);
        if (_0x643eb6.success && _0x643eb6.data.length > 0) {
          const _0x5e8c6d = _0x643eb6.data[0];
          const _0x19239e = {
            name: _0xc74492.from.split("@")[0],
            phone: _0xc74492.from.split("@")[0],
            callType: _0xc74492.status,
            callTime: new Date(_0xc74492.timestamp).toLocaleString(),
            isVideo: _0xc74492.isVideo ? "Video" : "Voice"
          };
          _0x2003ff = await this.sendTemplateMessage(_0x5f3fde, _0xc74492.from, _0x5e8c6d, _0x19239e);
        } else {
          this.logger.warn("Template " + _0x5d17b0.template_id + " not found for call response rule " + _0x5d17b0.name);
          return;
        }
      } else if (_0x5d17b0.attachment_file && _0x5d17b0.attachment_type) {
        const _0x122753 = require("fs");
        const _0x193828 = require("path");
        if (_0x122753.existsSync(_0x5d17b0.attachment_file)) {
          const _0x4e1ab6 = {
            caption: _0x5d17b0.message_content || ""
          };
          switch (_0x5d17b0.attachment_type) {
            case "image":
              _0x4e1ab6.image = {
                url: _0x5d17b0.attachment_file
              };
              break;
            case "video":
              _0x4e1ab6.video = {
                url: _0x5d17b0.attachment_file
              };
              break;
            case "audio":
              _0x4e1ab6.audio = {
                url: _0x5d17b0.attachment_file
              };
              break;
            case "document":
              _0x4e1ab6.document = {
                url: _0x5d17b0.attachment_file
              };
              _0x4e1ab6.fileName = _0x193828.basename(_0x5d17b0.attachment_file);
              break;
          }
          _0x2003ff = await this.sendMediaMessage(_0x5f3fde, _0xc74492.from, _0x4e1ab6);
        } else {
          this.logger.warn("Attachment file " + _0x5d17b0.attachment_file + " not found for call response rule " + _0x5d17b0.name);
          _0x2003ff = await this.sendTextMessage(_0x5f3fde, _0xc74492.from, _0x5d17b0.message_content);
        }
      } else {
        _0x2003ff = await this.sendTextMessage(_0x5f3fde, _0xc74492.from, _0x5d17b0.message_content);
      }
      if (_0x2003ff && _0x2003ff.success) {
        if (this.databaseService) {
          this.databaseService.query("UPDATE call_responses SET usage_count = COALESCE(usage_count, 0) + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?", [_0x5d17b0.id]).catch(_0x268bab => {
            this.logger.error("Database update error for call response count " + _0x5d17b0.id + ":", _0x268bab);
          });
          this.databaseService.query("INSERT INTO activity_logs (action_type, description, metadata)\n             VALUES (?, ?, ?)", ["call_response_sent", "Call response sent for rule " + _0x5d17b0.name + " to " + _0xc74492.from, JSON.stringify({
            ruleId: _0x5d17b0.id,
            ruleName: _0x5d17b0.name,
            sessionId: _0x5f3fde,
            callType: _0xc74492.status,
            fromNumber: _0xc74492.from,
            messageType: _0x5d17b0.message_type,
            hasAttachment: !!_0x5d17b0.attachment_file && !!_0x5d17b0.attachment_type,
            messageId: _0x2003ff.messageId
          })]).catch(_0xa19aee => {
            this.logger.error("Database log error for call response " + _0x5d17b0.id + ":", _0xa19aee);
          });
        }
        this.logger.info("Call response sent for rule " + _0x5d17b0.name + " to " + _0xc74492.from);
      } else {
        this.logger.error("Failed to send call response for rule " + _0x5d17b0.name + ":", _0x2003ff?.error || "Unknown error");
      }
    } catch (_0x46e266) {
      this.logger.error("Error sending call response for rule " + _0x5d17b0.name + ":", _0x46e266);
    }
  }
  async handlePresenceUpdate(_0x39ecd0, _0x4e1687) {
    this.emit("presence_update", {
      sessionId: _0x39ecd0,
      presence: _0x4e1687
    });
  }
  async getChats(_0x4c55dd) {
    try {
      const _0x3fde30 = this.sessions.get(_0x4c55dd);
      if (!_0x3fde30) {
        return {
          success: false,
          message: "Session not found"
        };
      }
      const _0x2377b9 = this.stores.get(_0x4c55dd);
      if (!_0x2377b9) {
        return {
          success: false,
          message: "Store not found for session"
        };
      }
      const _0x403c1d = _0x2377b9.chats.all();
      this.logger.info("Found " + _0x403c1d.length + " chats in store for session " + _0x4c55dd);
      const _0x55b183 = _0x403c1d.map(_0x11e059 => {
        const _0x528ea7 = _0x2377b9.messages[_0x11e059.id];
        let _0x18a994 = null;
        let _0x518294 = _0x11e059.conversationTimestamp || Date.now() / 1000;
        if (_0x528ea7 && _0x528ea7.array.length > 0) {
          const _0xe99dcd = _0x528ea7.array[_0x528ea7.array.length - 1];
          _0x18a994 = {
            text: this.getMessageText(_0xe99dcd.message),
            timestamp: _0xe99dcd.messageTimestamp
          };
          _0x518294 = _0xe99dcd.messageTimestamp;
        }
        return {
          id: _0x11e059.id,
          name: _0x11e059.name || _0x2377b9.contacts?.[_0x11e059.id]?.notify || this.formatPhoneNumber(_0x11e059.id),
          lastMessage: _0x18a994 || {
            text: "No messages yet",
            timestamp: _0x518294
          },
          unreadCount: _0x11e059.unreadCount || 0,
          profilePicture: null,
          conversationTimestamp: _0x518294
        };
      });
      _0x55b183.sort((_0x413802, _0x14f269) => (_0x14f269.lastMessage.timestamp || 0) - (_0x413802.lastMessage.timestamp || 0));
      this.logger.info("Retrieved " + _0x55b183.length + " chats for session " + _0x4c55dd);
      if (_0x55b183.length === 0) {
        try {
          this.logger.info("No chats in store, attempting to get from database for session " + _0x4c55dd);
          const _0x18f509 = await this.getChatsFromDatabase(_0x4c55dd);
          if (_0x18f509.length > 0) {
            this.logger.info("Found " + _0x18f509.length + " chats in database for session " + _0x4c55dd);
            return {
              success: true,
              chats: _0x18f509
            };
          }
          this.logger.info("No chats in database, attempting to sync from WhatsApp for session " + _0x4c55dd);
          await this.syncChatsFromWhatsApp(_0x4c55dd);
          const _0x647d85 = _0x2377b9.chats.all();
          if (_0x647d85.length > 0) {
            this.logger.info("Found " + _0x647d85.length + " chats after sync for session " + _0x4c55dd);
            const _0x3c361e = _0x647d85.map(_0x1d3fa4 => {
              const _0xf253ff = _0x2377b9.messages[_0x1d3fa4.id];
              let _0x1565cd = null;
              let _0x35fd0e = _0x1d3fa4.conversationTimestamp || Date.now() / 1000;
              if (_0xf253ff && _0xf253ff.array.length > 0) {
                const _0x12638d = _0xf253ff.array[_0xf253ff.array.length - 1];
                _0x1565cd = {
                  text: this.getMessageText(_0x12638d.message),
                  timestamp: _0x12638d.messageTimestamp
                };
                _0x35fd0e = _0x12638d.messageTimestamp;
              }
              return {
                id: _0x1d3fa4.id,
                name: _0x1d3fa4.name || this.formatPhoneNumber(_0x1d3fa4.id),
                lastMessage: _0x1565cd || {
                  text: "No messages yet",
                  timestamp: _0x35fd0e
                },
                unreadCount: _0x1d3fa4.unreadCount || 0,
                profilePicture: null,
                conversationTimestamp: _0x35fd0e
              };
            });
            _0x3c361e.sort((_0x2b4e77, _0x57c62b) => (_0x57c62b.lastMessage.timestamp || 0) - (_0x2b4e77.lastMessage.timestamp || 0));
            return {
              success: true,
              chats: _0x3c361e
            };
          }
        } catch (_0x28893c) {
          this.logger.warn("Failed to sync chats from WhatsApp for session " + _0x4c55dd + ":", _0x28893c);
        }
        this.logger.info("No chats found for session " + _0x4c55dd + " after all attempts");
      }
      return {
        success: true,
        chats: _0x55b183
      };
    } catch (_0x33dd15) {
      this.logger.error("Error getting chats for session " + _0x4c55dd + ":", _0x33dd15);
      return {
        success: false,
        message: _0x33dd15.message
      };
    }
  }
  async getChatsFromDatabase(_0x14dc97) {
    try {
      const _0x386de4 = "\n        SELECT\n          contact_phone,\n          MAX(timestamp) as last_message_time,\n          (SELECT content FROM message_history mh2\n           WHERE mh2.contact_phone = mh.contact_phone\n           AND mh2.session_id = mh.session_id\n           ORDER BY timestamp DESC LIMIT 1) as last_message_content,\n          (SELECT message_type FROM message_history mh3\n           WHERE mh3.contact_phone = mh.contact_phone\n           AND mh3.session_id = mh.session_id\n           ORDER BY timestamp DESC LIMIT 1) as last_message_type\n        FROM message_history mh\n        WHERE session_id = ?\n        GROUP BY contact_phone\n        ORDER BY last_message_time DESC\n      ";
      const _0xc8fc6 = await this.database.query(_0x386de4, [_0x14dc97]);
      if (!_0xc8fc6.success || !_0xc8fc6.data) {
        return [];
      }
      const _0x273c72 = _0xc8fc6.data.map(_0x51f363 => {
        const _0x5066fd = _0x51f363.contact_phone + "@s.whatsapp.net";
        const _0x1d878a = new Date(_0x51f363.last_message_time).getTime() / 1000;
        return {
          id: _0x5066fd,
          name: this.formatPhoneNumber(_0x5066fd),
          lastMessage: {
            text: _0x51f363.last_message_content || "No messages yet",
            timestamp: _0x1d878a
          },
          unreadCount: 0,
          profilePicture: null,
          conversationTimestamp: _0x1d878a
        };
      });
      this.logger.info("Retrieved " + _0x273c72.length + " chats from database for session " + _0x14dc97);
      return _0x273c72;
    } catch (_0x486f80) {
      this.logger.error("Error getting chats from database for session " + _0x14dc97 + ":", _0x486f80);
      return [];
    }
  }
  getMessageText(_0x13f9e4) {
    if (!_0x13f9e4) {
      return "";
    }
    return _0x13f9e4.conversation || _0x13f9e4.extendedTextMessage?.text || _0x13f9e4.imageMessage?.caption || _0x13f9e4.videoMessage?.caption || _0x13f9e4.documentMessage?.caption || _0x13f9e4.audioMessage?.caption || (_0x13f9e4.imageMessage ? "📷 Photo" : "") || (_0x13f9e4.videoMessage ? "🎥 Video" : "") || (_0x13f9e4.audioMessage ? "🎵 Audio" : "") || (_0x13f9e4.documentMessage ? "📄 Document" : "") || (_0x13f9e4.stickerMessage ? "🎭 Sticker" : "") || (_0x13f9e4.locationMessage ? "📍 Location" : "") || (_0x13f9e4.contactMessage ? "👤 Contact" : "") || "Message";
  }
  formatPhoneNumber(_0x301970) {
    if (!_0x301970) {
      return "";
    }
    const _0x22ce49 = _0x301970.split("@")[0];
    if (_0x22ce49.length > 10) {
      return "+" + _0x22ce49.slice(0, -10) + " " + _0x22ce49.slice(-10, -7) + " " + _0x22ce49.slice(-7, -4) + " " + _0x22ce49.slice(-4);
    }
    return _0x22ce49;
  }
  async syncChatsFromWhatsApp(_0x39592e) {
    try {
      const _0x558e87 = this.sessions.get(_0x39592e);
      if (!_0x558e87) {
        throw new Error("Session not found");
      }
      this.logger.info("Syncing chats from WhatsApp for session " + _0x39592e);
      try {
        await _0x558e87.presenceSubscribe(_0x558e87.user?.id);
      } catch (_0xd91a0b) {
        this.logger.warn("Failed to subscribe to presence for session " + _0x39592e + ":", _0xd91a0b);
      }
      try {
        if (this.databaseService) {
          const _0x4720c5 = await this.databaseService.query("\n            SELECT DISTINCT contact_phone, MAX(timestamp) as last_contact\n            FROM message_history\n            WHERE session_id = ?\n            ORDER BY last_contact DESC\n            LIMIT 10\n          ", [_0x39592e]);
          if (_0x4720c5.success && _0x4720c5.data && _0x4720c5.data.length > 0) {
            this.logger.info("Found " + _0x4720c5.data.length + " recent contacts, attempting to fetch their chat history");
            for (const _0x123005 of _0x4720c5.data) {
              try {
                const _0xcea5e = _0x123005.contact_phone.includes("@") ? _0x123005.contact_phone : _0x123005.contact_phone + "@s.whatsapp.net";
                await _0x558e87.fetchMessageHistory(_0xcea5e, 5);
                this.logger.debug("Fetched history for " + _0xcea5e);
              } catch (_0x181ec8) {
                this.logger.debug("Could not fetch history for " + _0x123005.contact_phone + ":", _0x181ec8.message);
              }
            }
          }
        }
      } catch (_0x419e2f) {
        this.logger.warn("Could not query database for recent contacts:", _0x419e2f);
      }
      this.logger.info("Chat sync initiated for session " + _0x39592e);
      return {
        success: true
      };
    } catch (_0x43b84f) {
      this.logger.error("Error syncing chats from WhatsApp for session " + _0x39592e + ":", _0x43b84f);
      throw _0x43b84f;
    }
  }
  async getChatHistory(_0x49e647, _0x5917dc, _0xecd62e = 50, _0x53adaa = null) {
    try {
      const _0x5c94d7 = this.sessions.get(_0x49e647);
      if (!_0x5c94d7) {
        this.logger.error("Session " + _0x49e647 + " not found for getChatHistory");
        return {
          success: false,
          message: "Session not found"
        };
      }
      const _0x55bb89 = this.stores.get(_0x49e647);
      if (!_0x55bb89) {
        this.logger.error("Store not found for session " + _0x49e647);
        return {
          success: false,
          message: "Store not found for session"
        };
      }
      this.logger.info("Getting chat history for " + _0x5917dc + " in session " + _0x49e647 + ", limit: " + _0xecd62e);
      const _0x276cac = _0x55bb89.messages[_0x5917dc];
      this.logger.info("Store messages for " + _0x5917dc + ":", _0x276cac ? (_0x276cac.array?.length || 0) + " messages" : "no messages");
      if (!_0x276cac || !_0x276cac.array || _0x276cac.array.length === 0) {
        this.logger.info("No local messages found for " + _0x5917dc + ", attempting to fetch from WhatsApp");
        try {
          await _0x5c94d7.fetchMessageHistory(_0x5917dc, _0xecd62e);
          this.logger.info("Fetched message history from WhatsApp for " + _0x5917dc);
          const _0x5ae06d = _0x55bb89.messages[_0x5917dc];
          if (_0x5ae06d && _0x5ae06d.array && _0x5ae06d.array.length > 0) {
            const _0x126d18 = [..._0x5ae06d.array];
            _0x126d18.sort((_0x4af70c, _0x32e286) => _0x4af70c.messageTimestamp - _0x32e286.messageTimestamp);
            const _0x27800e = _0xecd62e && _0x126d18.length > _0xecd62e ? _0x126d18.slice(-_0xecd62e) : _0x126d18;
            this.logger.info("Retrieved " + _0x27800e.length + " messages from store after fetch");
            return {
              success: true,
              messages: _0x27800e
            };
          }
          this.logger.warn("No messages in store after fetch for " + _0x5917dc);
          return {
            success: true,
            messages: []
          };
        } catch (_0x2d753a) {
          this.logger.warn("Could not fetch message history for " + _0x5917dc + ":", _0x2d753a);
          return {
            success: true,
            messages: []
          };
        }
      }
      let _0x1777a0 = [..._0x276cac.array];
      this.logger.info("Processing " + _0x1777a0.length + " messages from store for " + _0x5917dc);
      if (_0x53adaa) {
        const _0xe29c3c = _0x1777a0.length;
        _0x1777a0 = _0x1777a0.filter(_0x2ddeae => _0x2ddeae.messageTimestamp < _0x53adaa);
        this.logger.info("Filtered messages by timestamp: " + _0xe29c3c + " -> " + _0x1777a0.length);
      }
      _0x1777a0.sort((_0x448c95, _0x15a79b) => _0x448c95.messageTimestamp - _0x15a79b.messageTimestamp);
      if (_0xecd62e && _0x1777a0.length > _0xecd62e) {
        _0x1777a0 = _0x1777a0.slice(-_0xecd62e);
        this.logger.info("Applied limit: showing last " + _0xecd62e + " messages");
      }
      this.logger.info("Retrieved " + _0x1777a0.length + " messages for chat " + _0x5917dc + " in session " + _0x49e647);
      return {
        success: true,
        messages: _0x1777a0
      };
    } catch (_0x4e4853) {
      this.logger.error("Error getting chat history for " + _0x5917dc + " in session " + _0x49e647 + ":", _0x4e4853);
      return {
        success: false,
        message: _0x4e4853.message
      };
    }
  }
  async markChatAsRead(_0x5529d6, _0x2d3d6d) {
    try {
      const _0x48f9ba = this.sessions.get(_0x5529d6);
      if (!_0x48f9ba) {
        return {
          success: false,
          message: "Session not found"
        };
      }
      const _0x3ce408 = this.stores.get(_0x5529d6);
      if (!_0x3ce408) {
        return {
          success: false,
          message: "Store not found for session"
        };
      }
      const _0x4f5731 = _0x3ce408.messages[_0x2d3d6d];
      if (_0x4f5731 && _0x4f5731.array) {
        const _0x30074e = _0x4f5731.array.filter(_0x44f891 => !_0x44f891.key.fromMe && (!_0x44f891.status || _0x44f891.status !== "read"));
        if (_0x30074e.length > 0) {
          const _0x1ec96c = _0x30074e[_0x30074e.length - 1];
          try {
            await _0x48f9ba.readMessages([_0x1ec96c.key]);
            this.logger.info("Marked " + _0x30074e.length + " messages as read in chat " + _0x2d3d6d);
          } catch (_0xf135d5) {
            this.logger.warn("Failed to mark messages as read in chat " + _0x2d3d6d + ":", _0xf135d5);
          }
        }
      }
      return {
        success: true,
        message: "Chat marked as read"
      };
    } catch (_0x33020a) {
      this.logger.error("Error marking chat as read for " + _0x2d3d6d + " in session " + _0x5529d6 + ":", _0x33020a);
      return {
        success: false,
        message: _0x33020a.message
      };
    }
  }
  formatMessage(_0x57b7a4) {
    try {
      let _0x461e0b = "";
      if (_0x57b7a4.message) {
        if (_0x57b7a4.message.conversation) {
          _0x461e0b = _0x57b7a4.message.conversation;
        } else if (_0x57b7a4.message.extendedTextMessage && _0x57b7a4.message.extendedTextMessage.text) {
          _0x461e0b = _0x57b7a4.message.extendedTextMessage.text;
        } else if (_0x57b7a4.message.interactiveResponseMessage && _0x57b7a4.message.interactiveResponseMessage.nativeFlowResponseMessage) {
          const _0x2d104b = _0x57b7a4.message.interactiveResponseMessage.nativeFlowResponseMessage;
          if (_0x2d104b.paramsJson) {
            try {
              const _0x5c27a7 = JSON.parse(_0x2d104b.paramsJson);
              _0x461e0b = _0x5c27a7.id || _0x5c27a7.title || _0x5c27a7.display_text || "Unknown selection";
              this.logger.info("📨 🔥 formatMessage extracted interactive list response - params: " + JSON.stringify(_0x5c27a7) + ", final text: \"" + _0x461e0b + "\"");
            } catch (_0x10c218) {
              this.logger.error("Error parsing interactive response params:", _0x10c218);
              _0x461e0b = "Unknown selection";
            }
          } else {
            _0x461e0b = "Unknown selection";
          }
        } else if (_0x57b7a4.message.interactiveResponseMessage && _0x57b7a4.message.interactiveResponseMessage.body && _0x57b7a4.message.interactiveResponseMessage.body.text) {
          _0x461e0b = _0x57b7a4.message.interactiveResponseMessage.body.text;
          this.logger.info("📨 🔥 formatMessage extracted interactive response text: \"" + _0x461e0b + "\"");
        } else if (_0x57b7a4.message.buttonsResponseMessage && _0x57b7a4.message.buttonsResponseMessage.selectedDisplayText) {
          _0x461e0b = _0x57b7a4.message.buttonsResponseMessage.selectedDisplayText;
          this.logger.info("📨 🔥 formatMessage extracted button response text: \"" + _0x461e0b + "\"");
        } else if (_0x57b7a4.message.listResponseMessage && _0x57b7a4.message.listResponseMessage.title) {
          const _0x5d19d3 = _0x57b7a4.message.listResponseMessage.singleSelectReply?.selectedRowId;
          const _0xe1fe3e = _0x57b7a4.message.listResponseMessage.title;
          const _0xf060e0 = _0xe1fe3e.split("\n").filter(_0x278536 => _0x278536.trim());
          _0x461e0b = _0xf060e0.length > 1 ? _0xf060e0[_0xf060e0.length - 1].trim() : _0xe1fe3e.trim();
          this.logger.info("📨 🔥 formatMessage extracted list response - rowId: \"" + _0x5d19d3 + "\", fullTitle: \"" + _0xe1fe3e + "\", extracted description: \"" + _0x461e0b + "\"");
        } else if (_0x57b7a4.message.templateButtonReplyMessage && _0x57b7a4.message.templateButtonReplyMessage.selectedDisplayText) {
          _0x461e0b = _0x57b7a4.message.templateButtonReplyMessage.selectedDisplayText;
          this.logger.info("📨 🔥 formatMessage extracted template button response text: \"" + _0x461e0b + "\"");
        } else if (_0x57b7a4.message.imageMessage && _0x57b7a4.message.imageMessage.caption) {
          _0x461e0b = _0x57b7a4.message.imageMessage.caption;
        } else if (_0x57b7a4.message.videoMessage && _0x57b7a4.message.videoMessage.caption) {
          _0x461e0b = _0x57b7a4.message.videoMessage.caption;
        }
      }
      return {
        id: _0x57b7a4.key?.id || "",
        from: _0x57b7a4.key?.remoteJid || "",
        fromMe: _0x57b7a4.key?.fromMe || false,
        timestamp: _0x57b7a4.messageTimestamp || Date.now(),
        text: _0x461e0b,
        type: this.getMessageType(_0x57b7a4.message || {}),
        participant: _0x57b7a4.key?.participant || null
      };
    } catch (_0x42f4eb) {
      this.logger.error("Error formatting message:", _0x42f4eb);
      return {
        id: "",
        from: "",
        fromMe: false,
        timestamp: Date.now(),
        text: "",
        type: "text",
        participant: null
      };
    }
  }
  getMessageType(_0x2d54a5) {
    if (!_0x2d54a5 || typeof _0x2d54a5 !== "object") {
      return "text";
    }
    if (_0x2d54a5.conversation) {
      return "text";
    }
    if (_0x2d54a5.extendedTextMessage) {
      return "text";
    }
    if (_0x2d54a5.imageMessage) {
      return "image";
    }
    if (_0x2d54a5.videoMessage) {
      return "video";
    }
    if (_0x2d54a5.audioMessage) {
      return "audio";
    }
    if (_0x2d54a5.documentMessage) {
      return "document";
    }
    if (_0x2d54a5.stickerMessage) {
      return "sticker";
    }
    if (_0x2d54a5.contactMessage) {
      return "contact";
    }
    if (_0x2d54a5.locationMessage) {
      return "location";
    }
    if (_0x2d54a5.listResponseMessage) {
      return "list_response";
    }
    if (_0x2d54a5.interactiveResponseMessage) {
      return "interactive_response";
    }
    if (_0x2d54a5.buttonsResponseMessage) {
      return "button_response";
    }
    if (_0x2d54a5.templateButtonReplyMessage) {
      return "template_button_response";
    }
    return "text";
  }
  async sendPresenceUpdate(_0x51aaab, _0xeef59c, _0x5ec446 = "composing") {
    try {
      const _0x5f3bb5 = await this.waitForReadySocket(_0x51aaab);
      if (!_0x5f3bb5) {
        this.logger.warn("sendPresenceUpdate: no socket for session " + _0x51aaab);
        return {
          success: false
        };
      }
      await _0x5f3bb5.sendPresenceUpdate(_0x5ec446, _0xeef59c);
      return {
        success: true
      };
    } catch (_0x3fd213) {
      this.logger.warn("sendPresenceUpdate error: " + _0x3fd213.message);
      return {
        success: false,
        error: _0x3fd213.message
      };
    }
  }
  async sendMessage(_0x22f648, _0x24c642, _0x5e5623, _0x39ce2b = "text", _0x2797bb = {}) {
    try {
      if (!_0x39ce2b || _0x39ce2b === "text") {
        if (_0x5e5623 && typeof _0x5e5623 === "object") {
          if (_0x5e5623.buttons || _0x5e5623.interactiveMessage || _0x5e5623.interactiveButtons) {
            _0x39ce2b = "buttons";
          } else if (_0x5e5623.sections) {
            _0x39ce2b = "list";
          } else if (_0x5e5623.poll || _0x5e5623.name && _0x5e5623.values) {
            _0x39ce2b = "poll";
          } else if (_0x5e5623.contacts) {
            _0x39ce2b = "contact";
          } else if (_0x5e5623.degreesLatitude && _0x5e5623.degreesLongitude) {
            _0x39ce2b = "location";
          } else if (_0x5e5623.image) {
            _0x39ce2b = "image";
          } else if (_0x5e5623.video) {
            _0x39ce2b = "video";
          } else if (_0x5e5623.audio) {
            _0x39ce2b = "audio";
          } else if (_0x5e5623.document) {
            _0x39ce2b = "document";
          }
        }
      }
      if (_0x39ce2b === "text") {
        let _0x564b59 = _0x5e5623;
        if (typeof _0x5e5623 === "object" && _0x5e5623.text) {
          _0x564b59 = _0x5e5623.text;
        }
        if (!_0x564b59 || typeof _0x564b59 === "string" && _0x564b59.trim() === "") {
          this.logger.error("❌ Refusing to send empty text message. Content: \"" + _0x564b59 + "\"");
          return {
            success: false,
            error: "Cannot send empty text message"
          };
        }
      }
      switch (_0x39ce2b) {
        case "text":
          if (typeof _0x5e5623 === "object" && _0x5e5623.text) {
            return await this.sendTextMessage(_0x22f648, _0x24c642, _0x5e5623.text);
          }
          return await this.sendTextMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "image":
        case "video":
        case "audio":
        case "document":
          if (typeof _0x5e5623 === "object" && _0x5e5623[_0x39ce2b]) {
            this.logger.info("📤 Sending " + _0x39ce2b + " message to " + _0x24c642);
            const _0x296a68 = this.sessions.get(_0x22f648);
            if (!_0x296a68) {
              throw new Error("Session not found");
            }
            let _0x2d56d8 = {};
            const _0xc5c86b = _0x5e5623[_0x39ce2b];
            this.logger.info("📤 Media data type: " + typeof _0xc5c86b + ", isString: " + (typeof _0xc5c86b === "string") + ", length: " + (_0xc5c86b?.length || "N/A"));
            const _0x13a95d = this._normalizeMediaBuffer(_0xc5c86b);
            if (!_0x13a95d) {
              throw new Error("Invalid " + _0x39ce2b + " payload");
            }
            if (Buffer.isBuffer(_0x13a95d)) {
              const _0x533ce7 = _0x39ce2b === "video" ? 67108864 : 16777216;
              if (_0x13a95d.length > _0x533ce7) {
                throw new Error("File too large: " + (_0x13a95d.length / 1024 / 1024).toFixed(2) + " MB (max: " + _0x533ce7 / 1024 / 1024 + " MB)");
              }
              this.logger.info("📤 " + _0x39ce2b + " buffer prepared: " + (_0x13a95d.length / 1024 / 1024).toFixed(2) + " MB");
            } else if (_0x13a95d.url) {
              this.logger.info("📤 " + _0x39ce2b + " URL: " + _0x13a95d.url);
            }
            _0x2d56d8[_0x39ce2b] = _0x13a95d;
            if (_0x5e5623.caption) {
              _0x2d56d8.caption = _0x5e5623.caption;
            }
            const _0x9e0d32 = Buffer.isBuffer(_0x13a95d) ? _0x13a95d : null;
            const _0x4f0086 = typeof _0xc5c86b === "string" ? _0xc5c86b : typeof _0xc5c86b === "object" && typeof _0xc5c86b?.url === "string" ? _0xc5c86b.url : null;
            _0x2d56d8.mimetype = this._inferMimetype(_0x9e0d32, _0x39ce2b, _0x5e5623.mimetype, _0x5e5623.fileName, _0x4f0086);
            if (_0x39ce2b === "document") {
              _0x2d56d8.fileName = _0x5e5623.fileName || this._defaultFileNameFor(_0x2d56d8.mimetype);
            }
            if (_0x5e5623.viewOnce) {
              _0x2d56d8.viewOnce = _0x5e5623.viewOnce;
            }
            this.logger.info("📤 Sending media message to WhatsApp:", {
              to: _0x24c642,
              type: _0x39ce2b,
              hasCaption: !!_0x2d56d8.caption,
              hasFileName: !!_0x2d56d8.fileName,
              bufferSize: _0x2d56d8[_0x39ce2b]?.length || "N/A"
            });
            const _0x1e6465 = await _0x296a68.sendMessage(_0x24c642, _0x2d56d8);
            this.logger.info("✅ Media message sent successfully, messageId: " + _0x1e6465.key.id);
            return {
              success: true,
              messageId: _0x1e6465.key.id,
              timestamp: _0x1e6465.messageTimestamp
            };
          } else if (_0x2797bb.mediaBuffer) {
            const _0x2bb908 = typeof _0x5e5623 === "object" ? _0x5e5623.caption : typeof _0x5e5623 === "string" ? _0x5e5623 : "";
            const _0x2f3cde = typeof _0x5e5623 === "object" ? _0x5e5623.mimetype : null;
            const _0x4c8218 = typeof _0x5e5623 === "object" ? _0x5e5623.fileName : null;
            return await this.sendMediaMessage(_0x22f648, _0x24c642, _0x2797bb.mediaBuffer, _0x39ce2b, _0x2bb908, _0x2f3cde, _0x4c8218);
          } else {
            throw new Error("No media content or buffer provided for " + _0x39ce2b + " message");
          }
        case "button":
        case "buttons":
        case "interactive":
          if (_0x5e5623.interactiveMessage) {
            const _0x1244cc = await this.waitForReadySocket(_0x22f648);
            const _0x473b6c = {
              text: _0x5e5623.interactiveMessage.body.text,
              footer: _0x5e5623.interactiveMessage.footer?.text,
              buttons: _0x5e5623.interactiveMessage.nativeFlowMessage.buttons.map((_0x3a46dd, _0x385082) => {
                const _0x1dadbb = JSON.parse(_0x3a46dd.buttonParamsJson);
                return {
                  buttonId: _0x1dadbb.id || "btn_" + _0x385082,
                  buttonText: {
                    displayText: _0x1dadbb.display_text
                  },
                  type: 1
                };
              })
            };
            const _0x5cede8 = await _0x1244cc.sendMessage(_0x24c642, _0x473b6c);
            return {
              success: true,
              messageId: _0x5cede8.key.id,
              timestamp: _0x5cede8.messageTimestamp
            };
          }
          if (_0x5e5623.interactiveButtons) {
            const _0x55dc2e = await this.waitForReadySocket(_0x22f648);
            const _0x1e3137 = await _0x55dc2e.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0x1e3137.key.id,
              timestamp: _0x1e3137.messageTimestamp
            };
          }
          if (_0x5e5623.buttons && Array.isArray(_0x5e5623.buttons)) {
            const _0x547dd4 = await this.waitForReadySocket(_0x22f648);
            const _0x1091e3 = await _0x547dd4.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0x1091e3.key.id,
              timestamp: _0x1091e3.messageTimestamp
            };
          }
          return await this.sendInteractiveMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "list":
          if (_0x5e5623.interactiveMessage) {
            const _0x1f0138 = await this.waitForReadySocket(_0x22f648);
            const _0x5978a2 = _0x5e5623.interactiveMessage.nativeFlowMessage.buttons[0];
            const _0x46c1e5 = JSON.parse(_0x5978a2.buttonParamsJson);
            const _0x20d79a = {
              text: _0x5e5623.interactiveMessage.body.text,
              footer: _0x5e5623.interactiveMessage.footer?.text,
              title: _0x46c1e5.title,
              buttonText: _0x46c1e5.title,
              sections: _0x46c1e5.sections
            };
            const _0x33ebca = await _0x1f0138.sendMessage(_0x24c642, _0x20d79a);
            return {
              success: true,
              messageId: _0x33ebca.key.id,
              timestamp: _0x33ebca.messageTimestamp
            };
          }
          if (_0x5e5623.sections && Array.isArray(_0x5e5623.sections) && _0x5e5623.text) {
            const _0x24d0d2 = await this.waitForReadySocket(_0x22f648);
            const _0x4f7a60 = await _0x24d0d2.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0x4f7a60.key.id,
              timestamp: _0x4f7a60.messageTimestamp
            };
          }
          if (_0x5e5623.sections && Array.isArray(_0x5e5623.sections) && _0x5e5623.body) {
            return await this.sendInteractiveListMessage(_0x22f648, _0x24c642, _0x5e5623);
          }
          if (_0x5e5623.sections) {
            const _0x5d74ae = await this.waitForReadySocket(_0x22f648);
            const _0x4643a4 = await _0x5d74ae.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0x4643a4.key.id,
              timestamp: _0x4643a4.messageTimestamp
            };
          }
          return await this.sendListMessage(_0x22f648, _0x24c642, _0x5e5623, _0x2797bb.buttonText || "Select Option", _0x2797bb.sections || []);
        case "poll":
          if (typeof _0x5e5623 === "object" && _0x5e5623.poll) {
            const _0xde286e = await this.waitForReadySocket(_0x22f648);
            const _0xc605e6 = await _0xde286e.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0xc605e6.key.id,
              timestamp: _0xc605e6.messageTimestamp
            };
          }
          return await this.sendPollMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "contact":
          if (typeof _0x5e5623 === "object" && _0x5e5623.contacts) {
            const _0x5041fa = await this.waitForReadySocket(_0x22f648);
            const _0x21c7d1 = await _0x5041fa.sendMessage(_0x24c642, _0x5e5623);
            return {
              success: true,
              messageId: _0x21c7d1.key.id,
              timestamp: _0x21c7d1.messageTimestamp
            };
          }
          return await this.sendContactMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "location":
          return await this.sendLocationMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "cta_button":
          return await this.sendCTAButtonMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "copy_code":
          return await this.sendCopyCodeMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "mixed_buttons":
          this.logger.info("🔍 DEBUG: Routing to sendMixedButtonsMessage with content:", JSON.stringify(_0x5e5623, null, 2));
          return await this.sendMixedButtonsMessage(_0x22f648, _0x24c642, _0x5e5623);
        case "carousel":
          this.logger.info("🎠 DEBUG: Routing to sendCarouselMessage with content:", JSON.stringify(_0x5e5623, null, 2));
          return await this.sendCarouselMessage(_0x22f648, _0x24c642, _0x5e5623);
        default:
          if (typeof _0x5e5623 === "object" && _0x5e5623.text) {
            return await this.sendTextMessage(_0x22f648, _0x24c642, _0x5e5623.text);
          }
          return await this.sendTextMessage(_0x22f648, _0x24c642, _0x5e5623);
      }
    } catch (_0x28114b) {
      this.logger.error("Error sending message from " + _0x22f648 + ":", _0x28114b);
      return {
        success: false,
        error: _0x28114b.message
      };
    }
  }
  async sendTextMessage(_0x403dfc, _0x33c39c, _0x29bca4) {
    try {
      if (_0x29bca4 === undefined || _0x29bca4 === null) {
        this.logger.error("❌ Cannot send message: text is " + _0x29bca4);
        return {
          success: false,
          error: "Text parameter is " + _0x29bca4
        };
      }
      let _0x201fcc;
      if (typeof _0x29bca4 === "object" && _0x29bca4 !== null) {
        if (_0x29bca4.text) {
          _0x201fcc = String(_0x29bca4.text);
        } else if (_0x29bca4.content) {
          _0x201fcc = String(_0x29bca4.content);
        } else if (_0x29bca4.body && _0x29bca4.body.text) {
          _0x201fcc = String(_0x29bca4.body.text);
        } else {
          this.logger.warn("❌ Object passed to sendTextMessage without text property:", _0x29bca4);
          _0x201fcc = JSON.stringify(_0x29bca4);
        }
      } else {
        _0x201fcc = String(_0x29bca4);
      }
      if (_0x201fcc === "[object Object]" || !_0x201fcc || _0x201fcc.trim() === "") {
        this.logger.error("❌ Invalid text message content: \"" + _0x201fcc + "\" - refusing to send empty message");
        return {
          success: false,
          error: "Cannot send empty message"
        };
      }
      let _0x122d47 = _0x33c39c;
      if (_0x33c39c && !_0x33c39c.includes("@g.us") && !_0x33c39c.includes("@broadcast") && !_0x33c39c.includes("@newsletter")) {
        const _0xd07fc5 = _0x33c39c.replace(/[^\d]/g, "");
        if (_0xd07fc5.length > 0) {
          this.logger.info("📞 Verifying JID with WhatsApp for: " + _0xd07fc5);
          try {
            const _0x24a6d8 = await this.checkNumberExists(_0x403dfc, _0xd07fc5);
            if (_0x24a6d8.success && _0x24a6d8.jid) {
              _0x122d47 = _0x24a6d8.jid;
              this.logger.info("✅ WhatsApp confirmed JID: " + _0x122d47);
            } else {
              _0x122d47 = _0x33c39c.includes("@") ? _0x33c39c : _0xd07fc5 + "@s.whatsapp.net";
              this.logger.warn("⚠️ WhatsApp check failed for " + _0xd07fc5 + ", using fallback JID: " + _0x122d47);
            }
          } catch (_0x6ad784) {
            _0x122d47 = _0x33c39c.includes("@") ? _0x33c39c : _0xd07fc5 + "@s.whatsapp.net";
            this.logger.error("❌ Error checking JID for " + _0xd07fc5 + ", using fallback JID: " + _0x122d47 + ":", _0x6ad784);
          }
        }
      }
      if (!_0x122d47.includes("@")) {
        _0x122d47 = _0x122d47.replace(/[^\d]/g, "") + "@s.whatsapp.net";
      }
      this.logger.info("📤 Sending text message from session " + _0x403dfc + " to " + _0x122d47 + ": \"" + _0x201fcc + "\"");
      const _0xf6e6a = await this.waitForReadySocket(_0x403dfc);
      this.logger.info("📤 Socket ready, sending message...");
      const _0x476df7 = await _0xf6e6a.sendMessage(_0x122d47, {
        text: _0x201fcc
      });
      this.persistSentMessageForRetry(_0x403dfc, _0x476df7);
      this.logger.info("✅ Message sent successfully: " + _0x476df7.key.id);
      return {
        success: true,
        messageId: _0x476df7.key.id,
        timestamp: _0x476df7.messageTimestamp
      };
    } catch (_0x5cdaed) {
      this.logger.error("❌ Error sending text message from " + _0x403dfc + ":", _0x5cdaed);
      return {
        success: false,
        error: _0x5cdaed.message
      };
    }
  }
  _normalizeMediaBuffer(_0x445cc7) {
    if (_0x445cc7 == null) {
      return null;
    }
    if (Buffer.isBuffer(_0x445cc7)) {
      return _0x445cc7;
    }
    if (_0x445cc7 instanceof Uint8Array) {
      return Buffer.from(_0x445cc7);
    }
    if (_0x445cc7 instanceof ArrayBuffer) {
      return Buffer.from(new Uint8Array(_0x445cc7));
    }
    if (Array.isArray(_0x445cc7)) {
      return Buffer.from(_0x445cc7);
    }
    if (typeof _0x445cc7 === "object") {
      if (_0x445cc7.type === "Buffer" && Array.isArray(_0x445cc7.data)) {
        return Buffer.from(_0x445cc7.data);
      }
      if (typeof _0x445cc7.url === "string" && !_0x445cc7.url.startsWith("data:")) {
        return {
          url: _0x445cc7.url
        };
      }
      if (typeof _0x445cc7.url === "string" && _0x445cc7.url.startsWith("data:")) {
        const _0x232395 = _0x445cc7.url.split(",")[1];
        if (_0x232395) {
          return Buffer.from(_0x232395, "base64");
        }
      }
    }
    if (typeof _0x445cc7 === "string") {
      if (_0x445cc7.startsWith("data:")) {
        const _0x3fd574 = _0x445cc7.split(",")[1];
        if (_0x3fd574) {
          return Buffer.from(_0x3fd574, "base64");
        }
        return null;
      }
      if (/^https?:\/\//i.test(_0x445cc7)) {
        return {
          url: _0x445cc7
        };
      }
      try {
        return Buffer.from(_0x445cc7, "base64");
      } catch (_0x2efe5f) {
        return null;
      }
    }
    return null;
  }
  _inferMimetype(_0x1c2776, _0x17f3bf, _0x4066af, _0x565c10, _0x1069dc) {
    if (_0x4066af) {
      return _0x4066af;
    }
    if (typeof _0x1069dc === "string" && _0x1069dc.startsWith("data:")) {
      const _0x2aa71a = _0x1069dc.match(/^data:([^;,]+)[;,]/);
      if (_0x2aa71a) {
        return _0x2aa71a[1];
      }
    }
    const _0xb1413f = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      mp4: "video/mp4",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      webm: "video/webm",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      aac: "audio/aac",
      ogg: "audio/ogg",
      wav: "audio/wav",
      opus: "audio/ogg; codecs=opus",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json"
    };
    if (_0x565c10) {
      const _0x661697 = String(_0x565c10).split(".").pop().toLowerCase();
      if (_0xb1413f[_0x661697]) {
        return _0xb1413f[_0x661697];
      }
    }
    if (Buffer.isBuffer(_0x1c2776) && _0x1c2776.length >= 12) {
      const _0x533a92 = _0x1c2776;
      if (_0x533a92[0] === 255 && _0x533a92[1] === 216 && _0x533a92[2] === 255) {
        return "image/jpeg";
      }
      if (_0x533a92[0] === 137 && _0x533a92[1] === 80 && _0x533a92[2] === 78 && _0x533a92[3] === 71) {
        return "image/png";
      }
      if (_0x533a92[0] === 71 && _0x533a92[1] === 73 && _0x533a92[2] === 70) {
        return "image/gif";
      }
      if (_0x533a92[0] === 82 && _0x533a92[1] === 73 && _0x533a92[2] === 70 && _0x533a92[3] === 70 && _0x533a92[8] === 87 && _0x533a92[9] === 69 && _0x533a92[10] === 66 && _0x533a92[11] === 80) {
        return "image/webp";
      }
      if (_0x533a92[0] === 37 && _0x533a92[1] === 80 && _0x533a92[2] === 68 && _0x533a92[3] === 70) {
        return "application/pdf";
      }
      if (_0x533a92[4] === 102 && _0x533a92[5] === 116 && _0x533a92[6] === 121 && _0x533a92[7] === 112) {
        if (_0x17f3bf === "audio") {
          return "audio/mp4";
        } else {
          return "video/mp4";
        }
      }
      if (_0x533a92[0] === 73 && _0x533a92[1] === 68 && _0x533a92[2] === 51) {
        return "audio/mpeg";
      }
      if (_0x533a92[0] === 80 && _0x533a92[1] === 75) {}
    }
    const _0x1a214c = {
      image: "image/jpeg",
      video: "video/mp4",
      audio: "audio/mp4",
      document: "application/octet-stream",
      sticker: "image/webp"
    };
    return _0x1a214c[_0x17f3bf] || "application/octet-stream";
  }
  async sendMediaMessage(_0x50a8a1, _0x5c4488, _0x44439d, _0x274efe, _0x370071 = "", _0x5d0139 = null, _0x2e0d17 = null) {
    try {
      let _0x7c4dcc = _0x5c4488;
      if (_0x5c4488 && !_0x5c4488.includes("@g.us") && !_0x5c4488.includes("@broadcast") && !_0x5c4488.includes("@newsletter") && !_0x5c4488.includes("@lid")) {
        const _0x18984b = _0x5c4488.replace(/[^\d]/g, "");
        if (_0x18984b.length > 0) {
          this.logger.info("📞 [sendMediaMessage] Verifying JID with WhatsApp for: " + _0x18984b);
          try {
            const _0x17e126 = await this.checkNumberExists(_0x50a8a1, _0x18984b);
            if (_0x17e126.success && _0x17e126.jid) {
              _0x7c4dcc = _0x17e126.jid;
              this.logger.info("✅ [sendMediaMessage] WhatsApp confirmed JID: " + _0x7c4dcc);
            } else {
              _0x7c4dcc = _0x5c4488.includes("@") ? _0x5c4488 : _0x18984b + "@s.whatsapp.net";
              this.logger.warn("⚠️ [sendMediaMessage] WhatsApp check failed, using fallback JID: " + _0x7c4dcc);
            }
          } catch (_0x1a6811) {
            _0x7c4dcc = _0x5c4488.includes("@") ? _0x5c4488 : _0x18984b + "@s.whatsapp.net";
            this.logger.error("❌ [sendMediaMessage] JID lookup error, using fallback: " + _0x7c4dcc, _0x1a6811);
          }
        }
      }
      const _0x424c6b = await this.waitForReadySocket(_0x50a8a1);
      const _0x1b0f04 = this._normalizeMediaBuffer(_0x44439d);
      if (!_0x1b0f04) {
        throw new Error("Invalid media payload for " + _0x274efe);
      }
      const _0x2c9d0f = {
        [_0x274efe]: _0x1b0f04
      };
      if (_0x370071 && _0x274efe !== "audio") {
        _0x2c9d0f.caption = _0x370071;
      }
      const _0x4951d6 = Buffer.isBuffer(_0x1b0f04) ? _0x1b0f04 : null;
      _0x2c9d0f.mimetype = this._inferMimetype(_0x4951d6, _0x274efe, _0x5d0139, _0x2e0d17, typeof _0x44439d === "string" ? _0x44439d : null);
      if (_0x274efe === "document") {
        _0x2c9d0f.fileName = _0x2e0d17 || this._defaultFileNameFor(_0x2c9d0f.mimetype);
      }
      const _0x10918b = await _0x424c6b.sendMessage(_0x7c4dcc, _0x2c9d0f);
      this.persistSentMessageForRetry(_0x50a8a1, _0x10918b);
      return {
        success: true,
        messageId: _0x10918b.key.id,
        timestamp: _0x10918b.messageTimestamp
      };
    } catch (_0x5ab0cb) {
      this.logger.error("Error sending media message from " + _0x50a8a1 + ":", _0x5ab0cb);
      return {
        success: false,
        error: _0x5ab0cb.message
      };
    }
  }
  _defaultFileNameFor(_0x5b454b) {
    const _0x2455e3 = {
      "application/pdf": "document.pdf",
      "application/msword": "document.doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document.docx",
      "application/vnd.ms-excel": "spreadsheet.xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet.xlsx",
      "application/vnd.ms-powerpoint": "presentation.ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "presentation.pptx",
      "application/zip": "archive.zip",
      "text/plain": "document.txt",
      "text/csv": "data.csv"
    };
    return _0x2455e3[_0x5b454b] || "file";
  }
  async downloadMedia(_0x584282, _0x1aed49) {
    try {
      const _0x847309 = this.sessions.get(_0x584282);
      if (!_0x847309) {
        throw new Error("Session not found");
      }
      const _0x2386ee = this.stores.get(_0x584282);
      if (!_0x2386ee) {
        throw new Error("Store not found for session");
      }
      const _0x4913fd = await _0x2386ee.loadMessage(_0x1aed49.remoteJid, _0x1aed49.id);
      if (!_0x4913fd) {
        throw new Error("Message not found in store");
      }
      const _0x298507 = _0x4913fd.message;
      if (!_0x298507) {
        throw new Error("No message content found");
      }
      let _0x5c5018 = null;
      let _0x221092 = null;
      let _0x417861 = "application/octet-stream";
      if (_0x298507.imageMessage) {
        _0x5c5018 = _0x298507.imageMessage;
        _0x221092 = "image";
        _0x417861 = _0x298507.imageMessage.mimetype || "image/jpeg";
      } else if (_0x298507.videoMessage) {
        _0x5c5018 = _0x298507.videoMessage;
        _0x221092 = "video";
        _0x417861 = _0x298507.videoMessage.mimetype || "video/mp4";
      } else if (_0x298507.audioMessage) {
        _0x5c5018 = _0x298507.audioMessage;
        _0x221092 = "audio";
        _0x417861 = _0x298507.audioMessage.mimetype || "audio/mp4";
      } else if (_0x298507.documentMessage) {
        _0x5c5018 = _0x298507.documentMessage;
        _0x221092 = "document";
        _0x417861 = _0x298507.documentMessage.mimetype || "application/octet-stream";
      } else if (_0x298507.stickerMessage) {
        _0x5c5018 = _0x298507.stickerMessage;
        _0x221092 = "sticker";
        _0x417861 = _0x298507.stickerMessage.mimetype || "image/webp";
      } else {
        throw new Error("Not a downloadable media message");
      }
      const _0x588efc = await downloadContentFromMessage(_0x5c5018, _0x221092);
      const _0x4a2179 = [];
      for await (const _0xaecc5 of _0x588efc) {
        _0x4a2179.push(_0xaecc5);
      }
      const _0x3563d4 = Buffer.concat(_0x4a2179);
      return {
        success: true,
        buffer: _0x3563d4,
        mimeType: _0x417861,
        size: _0x3563d4.length
      };
    } catch (_0x443912) {
      this.logger.error("Error downloading media from " + _0x584282 + ":", _0x443912);
      return {
        success: false,
        error: _0x443912.message
      };
    }
  }
  async sendButtonMessage(_0x35583b, _0x191e74, _0x10016a, _0x3e235a) {
    try {
      const _0x2d0878 = this.sessions.get(_0x35583b);
      if (!_0x2d0878) {
        throw new Error("Session not found");
      }
      const _0xa03fb1 = {
        text: _0x10016a,
        buttons: _0x3e235a.map((_0x1f6c0d, _0x4b4887) => ({
          buttonId: _0x1f6c0d.id || "btn_" + _0x4b4887,
          buttonText: {
            displayText: _0x1f6c0d.text
          },
          type: 1
        })),
        headerType: 1
      };
      const _0x248da6 = await _0x2d0878.sendMessage(_0x191e74, _0xa03fb1);
      return {
        success: true,
        messageId: _0x248da6.key.id,
        timestamp: _0x248da6.messageTimestamp
      };
    } catch (_0x113750) {
      this.logger.error("Error sending button message from " + _0x35583b + ":", _0x113750);
      return {
        success: false,
        error: _0x113750.message
      };
    }
  }
  async sendListMessage(_0x2394ec, _0x181631, _0x6ba365, _0x524afa, _0x39b43a) {
    try {
      console.error("🔥🔥🔥 sendListMessage called");
      console.error("🔥🔥🔥 Parameters:", {
        sessionId: _0x2394ec,
        to: _0x181631,
        text: _0x6ba365,
        buttonText: _0x524afa,
        sectionsCount: _0x39b43a?.length
      });
      console.error("🔥🔥🔥 Sections data:", JSON.stringify(_0x39b43a, null, 2));
      const _0x2d7665 = this.sessions.get(_0x2394ec);
      if (!_0x2d7665) {
        console.error("🔥🔥🔥 Session not found in sendListMessage");
        throw new Error("Session not found");
      }
      const _0x4dd2dd = {
        text: _0x6ba365,
        footer: "Select an option",
        title: "Options",
        buttonText: _0x524afa,
        sections: _0x39b43a.map(_0x115dfc => ({
          title: _0x115dfc.title,
          rows: _0x115dfc.rows.map(_0x198ddd => ({
            title: _0x198ddd.title,
            description: _0x198ddd.description || "",
            rowId: _0x198ddd.id
          }))
        }))
      };
      console.error("🔥🔥🔥 List message constructed:", JSON.stringify(_0x4dd2dd, null, 2));
      console.error("🔥🔥🔥 About to send list message");
      const _0x1d2a6b = await _0x2d7665.sendMessage(_0x181631, _0x4dd2dd);
      console.error("🔥🔥🔥 List message sent successfully");
      return {
        success: true,
        messageId: _0x1d2a6b.key.id,
        timestamp: _0x1d2a6b.messageTimestamp
      };
    } catch (_0x1ee02c) {
      console.error("🔥🔥🔥 Error in sendListMessage:", _0x1ee02c);
      this.logger.error("Error sending list message from " + _0x2394ec + ":", _0x1ee02c);
      return {
        success: false,
        error: _0x1ee02c.message
      };
    }
  }
  extractMediaFromAttachments(_0x28fd60) {
    if (!_0x28fd60 || _0x28fd60.length === 0) {
      return null;
    }
    const _0x4e8e5e = _0x28fd60[0];
    let _0x9f2b47;
    if (typeof _0x4e8e5e === "object") {
      if (_0x4e8e5e.isFile && _0x4e8e5e.data) {
        _0x9f2b47 = _0x4e8e5e.data;
      } else if (_0x4e8e5e.url) {
        _0x9f2b47 = _0x4e8e5e.url;
      } else {
        _0x9f2b47 = _0x4e8e5e.data || _0x4e8e5e.url;
      }
    } else {
      _0x9f2b47 = _0x4e8e5e;
    }
    if (!_0x9f2b47) {
      return null;
    }
    let _0x35bba5 = "image";
    if (_0x4e8e5e.type) {
      if (_0x4e8e5e.type.startsWith("video/")) {
        _0x35bba5 = "video";
      } else if (_0x4e8e5e.type.startsWith("audio/")) {
        _0x35bba5 = "audio";
      } else if (_0x4e8e5e.type.startsWith("application/") || _0x4e8e5e.type.includes("document")) {
        _0x35bba5 = "document";
      } else if (_0x4e8e5e.type === "image/x-icon" || _0x4e8e5e.type === "image/vnd.microsoft.icon") {
        _0x35bba5 = "document";
      }
    } else if (typeof _0x9f2b47 === "string") {
      const _0x5226c3 = _0x9f2b47.toLowerCase();
      if (_0x5226c3.includes(".mp4") || _0x5226c3.includes(".avi") || _0x5226c3.includes(".mov")) {
        _0x35bba5 = "video";
      } else if (_0x5226c3.includes(".mp3") || _0x5226c3.includes(".wav") || _0x5226c3.includes(".ogg")) {
        _0x35bba5 = "audio";
      } else if (_0x5226c3.includes(".pdf") || _0x5226c3.includes(".doc") || _0x5226c3.includes(".txt")) {
        _0x35bba5 = "document";
      }
    }
    const _0x8bc08a = {};
    if (_0x9f2b47 && _0x9f2b47.startsWith("data:")) {
      const _0xc90880 = _0x9f2b47.split(",")[1];
      const _0x63c6ee = Buffer.from(_0xc90880, "base64");
      _0x8bc08a[_0x35bba5] = _0x63c6ee;
    } else {
      _0x8bc08a[_0x35bba5] = {
        url: _0x9f2b47
      };
    }
    if (_0x4e8e5e.type && _0x35bba5 === "document") {
      _0x8bc08a.mimetype = _0x4e8e5e.type;
    }
    return {
      media: _0x8bc08a,
      mediaType: _0x35bba5
    };
  }
  async sendPollMessage(_0x40b5ab, _0x2dc5f6, _0x1c75d5) {
    try {
      const _0x44a9a5 = this.sessions.get(_0x40b5ab);
      if (!_0x44a9a5) {
        throw new Error("Session not found");
      }
      const _0x183c49 = _0x1c75d5.media && (_0x1c75d5.media.image || _0x1c75d5.media.video || _0x1c75d5.media.audio || _0x1c75d5.media.document);
      let _0x159b85 = null;
      let _0x46b545 = null;
      if (_0x183c49) {
        const _0x1fbffb = {};
        if (_0x1c75d5.media.image) {
          _0x1fbffb.image = _0x1c75d5.media.image;
        } else if (_0x1c75d5.media.video) {
          _0x1fbffb.video = _0x1c75d5.media.video;
        } else if (_0x1c75d5.media.audio) {
          _0x1fbffb.audio = _0x1c75d5.media.audio;
        } else if (_0x1c75d5.media.document) {
          _0x1fbffb.document = _0x1c75d5.media.document;
          if (_0x1c75d5.media.mimetype) {
            _0x1fbffb.mimetype = _0x1c75d5.media.mimetype;
          }
        }
        if (_0x1c75d5.caption) {
          _0x1fbffb.caption = _0x1c75d5.caption;
        }
        _0x159b85 = await _0x44a9a5.sendMessage(_0x2dc5f6, _0x1fbffb);
        await new Promise(_0x23643a => setTimeout(_0x23643a, 500));
      } else if (_0x1c75d5.text) {
        await _0x44a9a5.sendMessage(_0x2dc5f6, {
          text: _0x1c75d5.text
        });
        await new Promise(_0x1e65dc => setTimeout(_0x1e65dc, 500));
      }
      const _0x3cc106 = {
        poll: {
          name: _0x1c75d5.name,
          values: _0x1c75d5.values,
          selectableCount: _0x1c75d5.selectableCount || 1
        }
      };
      _0x46b545 = await _0x44a9a5.sendMessage(_0x2dc5f6, _0x3cc106);
      this.persistSentMessageForRetry(_0x40b5ab, _0x46b545);
      this.cachePollMessage(_0x46b545.key.id, {
        key: _0x46b545.key,
        message: _0x46b545.message,
        timestamp: Date.now(),
        sessionId: _0x40b5ab,
        recipient: _0x2dc5f6,
        pollData: _0x1c75d5
      });
      if (this.pollTrackingService) {
        try {
          await this.pollTrackingService.storePollMessage({
            messageId: _0x46b545.key.id,
            sessionId: _0x40b5ab,
            senderJid: _0x44a9a5.user?.id,
            recipientJid: _0x2dc5f6,
            pollQuestion: _0x1c75d5.name,
            pollOptions: _0x1c75d5.values,
            selectableCount: _0x1c75d5.selectableCount || 1,
            sentAt: new Date().toISOString()
          });
        } catch (_0x58f25c) {
          console.error("❌ POLL TRACKING: Error storing poll message:", _0x58f25c);
        }
      } else {}
      return {
        success: true,
        messageId: _0x46b545.key.id,
        timestamp: _0x46b545.messageTimestamp,
        mediaMessageId: _0x159b85 ? _0x159b85.key.id : null
      };
    } catch (_0x14df59) {
      console.error("🗳️ POLL MESSAGE ERROR:", _0x14df59);
      this.logger.error("Error sending poll message from " + _0x40b5ab + ":", _0x14df59);
      return {
        success: false,
        error: _0x14df59.message
      };
    }
  }
  async sendContactMessage(_0x3eb298, _0x2b70c8, _0x91eef9) {
    try {
      const _0x3cf67f = this.sessions.get(_0x3eb298);
      if (!_0x3cf67f) {
        throw new Error("Session not found");
      }
      const _0xf1d4d0 = await _0x3cf67f.sendMessage(_0x2b70c8, _0x91eef9);
      return {
        success: true,
        messageId: _0xf1d4d0.key.id,
        timestamp: _0xf1d4d0.messageTimestamp
      };
    } catch (_0x1ab9b0) {
      this.logger.error("Error sending contact message from " + _0x3eb298 + ":", _0x1ab9b0);
      return {
        success: false,
        error: _0x1ab9b0.message
      };
    }
  }
  async sendLocationMessage(_0x4f7f46, _0x2c42a0, _0x5b9f74) {
    try {
      const _0x8a1b22 = this.sessions.get(_0x4f7f46);
      if (!_0x8a1b22) {
        throw new Error("Session not found");
      }
      const _0x4a0e54 = await _0x8a1b22.sendMessage(_0x2c42a0, _0x5b9f74);
      return {
        success: true,
        messageId: _0x4a0e54.key.id,
        timestamp: _0x4a0e54.messageTimestamp
      };
    } catch (_0x3d68f0) {
      this.logger.error("Error sending location message from " + _0x4f7f46 + ":", _0x3d68f0);
      return {
        success: false,
        error: _0x3d68f0.message
      };
    }
  }
  async sendInteractiveMessage(_0x34774c, _0x2941c0, _0x170b67) {
    try {
      const _0x2354ee = await this.waitForReadySocket(_0x34774c);
      const _0x15cdad = await _0x2354ee.sendMessage(_0x2941c0, _0x170b67);
      return {
        success: true,
        messageId: _0x15cdad.key.id,
        timestamp: _0x15cdad.messageTimestamp
      };
    } catch (_0x3f01de) {
      this.logger.error("Error sending interactive message from " + _0x34774c + ":", _0x3f01de);
      return {
        success: false,
        error: _0x3f01de.message
      };
    }
  }
  async sendInteractiveButtonsMessage(_0x51ae86, _0x5160ae, _0x1dc02d) {
    try {
      const _0x5ae398 = await this.waitForReadySocket(_0x51ae86);
      if (!_0x5ae398) {
        throw new Error("Session not found");
      }
      const _0x5b3822 = _0x1dc02d.media && (_0x1dc02d.media.image || _0x1dc02d.media.video || _0x1dc02d.media.audio || _0x1dc02d.media.document);
      let _0x2b1cc2;
      if (_0x5b3822) {
        _0x2b1cc2 = {
          text: _0x1dc02d.body.text,
          footer: _0x1dc02d.footer ? _0x1dc02d.footer.text : undefined,
          interactiveButtons: _0x1dc02d.buttons.map((_0x5c581a, _0x27a4f9) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: _0x5c581a.text,
              id: _0x5c581a.id || "btn_" + _0x27a4f9
            })
          })),
          hasMediaAttachment: true
        };
        if (_0x1dc02d.media.image) {
          _0x2b1cc2.image = _0x1dc02d.media.image;
        } else if (_0x1dc02d.media.video) {
          _0x2b1cc2.video = _0x1dc02d.media.video;
        } else if (_0x1dc02d.media.audio) {
          _0x2b1cc2.audio = _0x1dc02d.media.audio;
        } else if (_0x1dc02d.media.document) {
          _0x2b1cc2.document = _0x1dc02d.media.document;
          if (_0x1dc02d.media.mimetype) {
            _0x2b1cc2.mimetype = _0x1dc02d.media.mimetype;
          }
        }
        if (_0x1dc02d.caption) {
          _0x2b1cc2.caption = _0x1dc02d.caption;
        }
      } else {
        _0x2b1cc2 = {
          text: _0x1dc02d.body.text,
          footer: _0x1dc02d.footer ? _0x1dc02d.footer.text : undefined,
          interactiveButtons: _0x1dc02d.buttons.map((_0x517059, _0x3c40f9) => ({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: _0x517059.text,
              id: _0x517059.id || "btn_" + _0x3c40f9
            })
          }))
        };
      }
      const _0xbd53fa = await _0x5ae398.sendMessage(_0x5160ae, _0x2b1cc2);
      return {
        success: true,
        messageId: _0xbd53fa.key.id,
        timestamp: _0xbd53fa.messageTimestamp
      };
    } catch (_0xde1da4) {
      this.logger.error("Error sending interactive buttons message from " + _0x51ae86 + ":", _0xde1da4);
      this.logger.error("Button content that failed:", JSON.stringify(_0x1dc02d, null, 2));
      return {
        success: false,
        error: _0xde1da4.message
      };
    }
  }
  async sendInteractiveListMessage(_0x1ce0a5, _0x31172b, _0x65dab) {
    try {
      const _0x2e1dba = this.sessions.get(_0x1ce0a5);
      if (!_0x2e1dba) {
        throw new Error("Session not found");
      }
      const _0xbbde81 = _0x65dab.media && (_0x65dab.media.image || _0x65dab.media.video || _0x65dab.media.audio || _0x65dab.media.document);
      let _0x2c6224;
      if (_0xbbde81) {
        _0x2c6224 = {
          text: _0x65dab.body.text,
          footer: _0x65dab.footer ? _0x65dab.footer.text : undefined,
          buttonText: _0x65dab.buttonText || "Select Option",
          sections: _0x65dab.sections.map(_0x480fb2 => ({
            title: _0x480fb2.title,
            rows: _0x480fb2.rows.map(_0x1afba7 => ({
              title: _0x1afba7.title,
              description: _0x1afba7.description,
              rowId: _0x1afba7.id
            }))
          })),
          hasMediaAttachment: true
        };
        if (_0x65dab.media.image) {
          _0x2c6224.image = _0x65dab.media.image;
        } else if (_0x65dab.media.video) {
          _0x2c6224.video = _0x65dab.media.video;
        } else if (_0x65dab.media.audio) {
          _0x2c6224.audio = _0x65dab.media.audio;
        } else if (_0x65dab.media.document) {
          _0x2c6224.document = _0x65dab.media.document;
          if (_0x65dab.media.mimetype) {
            _0x2c6224.mimetype = _0x65dab.media.mimetype;
          }
        }
        if (_0x65dab.caption) {
          _0x2c6224.caption = _0x65dab.caption;
        }
      } else {
        _0x2c6224 = {
          text: _0x65dab.body.text,
          footer: _0x65dab.footer ? _0x65dab.footer.text : undefined,
          buttonText: _0x65dab.buttonText || "Select Option",
          sections: _0x65dab.sections.map(_0x52cf46 => ({
            title: _0x52cf46.title,
            rows: _0x52cf46.rows.map(_0x2d1986 => ({
              title: _0x2d1986.title,
              description: _0x2d1986.description,
              rowId: _0x2d1986.id
            }))
          }))
        };
      }
      const _0x7386bd = await _0x2e1dba.sendMessage(_0x31172b, _0x2c6224);
      return {
        success: true,
        messageId: _0x7386bd.key.id,
        timestamp: _0x7386bd.messageTimestamp
      };
    } catch (_0x964e4b) {
      this.logger.error("Error sending interactive list message from " + _0x1ce0a5 + ":", _0x964e4b);
      return {
        success: false,
        error: _0x964e4b.message
      };
    }
  }
  async sendCTAButtonMessage(_0xe13f68, _0x15d8df, _0x349f4a) {
    try {
      const _0x3466df = this.sessions.get(_0xe13f68);
      if (!_0x3466df) {
        throw new Error("Session not found");
      }
      let _0xba87e4;
      try {
        const _0x274519 = {
          text: _0x349f4a.body.text,
          footer: _0x349f4a.footer && _0x349f4a.footer.text ? _0x349f4a.footer.text : undefined,
          interactiveButtons: [{
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: _0x349f4a.button.text,
              url: _0x349f4a.button.url,
              merchant_url: _0x349f4a.button.url
            })
          }]
        };
        this.logger.info("Attempting CTA button format 1 to " + _0x15d8df + ":", JSON.stringify(_0x274519, null, 2));
        _0xba87e4 = await _0x3466df.sendMessage(_0x15d8df, _0x274519);
        this.logger.info("CTA button message sent successfully with format 1:", {
          messageId: _0xba87e4.key.id,
          timestamp: _0xba87e4.messageTimestamp
        });
        return {
          success: true,
          messageId: _0xba87e4.key.id,
          timestamp: _0xba87e4.messageTimestamp
        };
      } catch (_0x21cf4c) {
        this.logger.warn("Format 1 failed, trying format 2:", _0x21cf4c.message);
        try {
          const _0x242c4d = {
            text: _0x349f4a.body.text + "\n\n🔗 " + _0x349f4a.button.text + ": " + _0x349f4a.button.url,
            footer: _0x349f4a.footer && _0x349f4a.footer.text ? _0x349f4a.footer.text : undefined
          };
          this.logger.info("Attempting CTA fallback format to " + _0x15d8df + ":", JSON.stringify(_0x242c4d, null, 2));
          _0xba87e4 = await _0x3466df.sendMessage(_0x15d8df, _0x242c4d);
          this.logger.info("CTA fallback message sent successfully:", {
            messageId: _0xba87e4.key.id,
            timestamp: _0xba87e4.messageTimestamp
          });
          return {
            success: true,
            messageId: _0xba87e4.key.id,
            timestamp: _0xba87e4.messageTimestamp,
            fallback: true
          };
        } catch (_0x46f902) {
          throw _0x46f902;
        }
      }
    } catch (_0x2dc48a) {
      this.logger.error("Error sending CTA button message from " + _0xe13f68 + ":", _0x2dc48a);
      this.logger.error("CTA content that failed:", JSON.stringify(_0x349f4a, null, 2));
      return {
        success: false,
        error: _0x2dc48a.message
      };
    }
  }
  async sendCopyCodeMessage(_0x8cc656, _0x8c7fb4, _0x13454b) {
    try {
      const _0x45d527 = this.sessions.get(_0x8cc656);
      if (!_0x45d527) {
        throw new Error("Session not found");
      }
      const _0x1fd34a = {
        text: _0x13454b.body.text,
        title: _0x13454b.title || undefined,
        subtitle: _0x13454b.subtitle || undefined,
        footer: _0x13454b.footer ? _0x13454b.footer.text : undefined,
        buttons: [{
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: _0x13454b.button.text,
            copy_code: _0x13454b.button.code
          })
        }]
      };
      this.logger.info("Sending copy code message to " + _0x8c7fb4 + ":", _0x1fd34a);
      const _0x517ecc = await _0x45d527.sendMessage(_0x8c7fb4, _0x1fd34a);
      this.logger.info("Copy code message sent successfully:", {
        messageId: _0x517ecc.key.id,
        timestamp: _0x517ecc.messageTimestamp
      });
      return {
        success: true,
        messageId: _0x517ecc.key.id,
        timestamp: _0x517ecc.messageTimestamp
      };
    } catch (_0x5a1186) {
      this.logger.error("Error sending copy code message from " + _0x8cc656 + ":", _0x5a1186);
      return {
        success: false,
        error: _0x5a1186.message
      };
    }
  }
  async sendMixedButtonsMessage(_0x423cba, _0x293d48, _0x58f3e0) {
    try {
      const _0x24f9fe = this.sessions.get(_0x423cba);
      if (!_0x24f9fe) {
        throw new Error("Session not found");
      }
      const _0x5e2e9e = _0x58f3e0.buttons.map((_0x293642, _0x55e43b) => {
        switch (_0x293642.type) {
          case "quick_reply":
            return {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: _0x293642.text,
                id: _0x293642.id || "btn_" + _0x55e43b
              })
            };
          case "cta_url":
            return {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: _0x293642.text,
                url: _0x293642.url,
                merchant_url: _0x293642.url
              })
            };
          case "cta_call":
            return {
              name: "cta_call",
              buttonParamsJson: JSON.stringify({
                display_text: _0x293642.text,
                phone_number: _0x293642.phone_number
              })
            };
          case "copy_code":
            return {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: _0x293642.text,
                copy_code: _0x293642.code
              })
            };
          default:
            return {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: _0x293642.text,
                id: _0x293642.id || "btn_" + _0x55e43b
              })
            };
        }
      });
      const _0x5134dd = _0x58f3e0.media && (_0x58f3e0.media.image || _0x58f3e0.media.video || _0x58f3e0.media.audio || _0x58f3e0.media.document);
      let _0x5b3272;
      if (_0x5134dd) {
        _0x5b3272 = {
          text: _0x58f3e0.body.text,
          footer: _0x58f3e0.footer && _0x58f3e0.footer.text ? _0x58f3e0.footer.text : undefined,
          interactiveButtons: _0x5e2e9e,
          hasMediaAttachment: true
        };
        if (_0x58f3e0.media.image) {
          _0x5b3272.image = _0x58f3e0.media.image;
        } else if (_0x58f3e0.media.video) {
          _0x5b3272.video = _0x58f3e0.media.video;
        } else if (_0x58f3e0.media.audio) {
          _0x5b3272.audio = _0x58f3e0.media.audio;
        } else if (_0x58f3e0.media.document) {
          _0x5b3272.document = _0x58f3e0.media.document;
          if (_0x58f3e0.media.mimetype) {
            _0x5b3272.mimetype = _0x58f3e0.media.mimetype;
          }
        }
        if (_0x58f3e0.caption) {
          _0x5b3272.caption = _0x58f3e0.caption;
        }
      } else {
        _0x5b3272 = {
          text: _0x58f3e0.body.text,
          footer: _0x58f3e0.footer && _0x58f3e0.footer.text ? _0x58f3e0.footer.text : undefined,
          interactiveButtons: _0x5e2e9e
        };
      }
      this.logger.info("Sending mixed buttons message to " + _0x293d48 + ":", JSON.stringify(_0x5b3272, null, 2));
      const _0x5cb526 = await _0x24f9fe.sendMessage(_0x293d48, _0x5b3272);
      this.logger.info("Mixed buttons message sent successfully:", {
        messageId: _0x5cb526.key.id,
        timestamp: _0x5cb526.messageTimestamp
      });
      return {
        success: true,
        messageId: _0x5cb526.key.id,
        timestamp: _0x5cb526.messageTimestamp
      };
    } catch (_0x52760d) {
      this.logger.error("Error sending mixed buttons message from " + _0x423cba + ":", _0x52760d);
      return {
        success: false,
        error: _0x52760d.message
      };
    }
  }
  static validateCarouselCardCount(_0x5e12e8) {
    const _0x11b4f1 = Array.isArray(_0x5e12e8) ? _0x5e12e8.length : _0x5e12e8;
    if (!Number.isInteger(_0x11b4f1) || _0x11b4f1 < CAROUSEL_MIN_CARDS || _0x11b4f1 > CAROUSEL_MAX_CARDS) {
      return {
        valid: false,
        count: Number.isInteger(_0x11b4f1) ? _0x11b4f1 : NaN,
        error: {
          code: CAROUSEL_SEND_CODES.CARD_COUNT_OUT_OF_RANGE,
          min: CAROUSEL_MIN_CARDS,
          max: CAROUSEL_MAX_CARDS,
          count: Number.isInteger(_0x11b4f1) ? _0x11b4f1 : NaN,
          message: "Carousel must contain between " + CAROUSEL_MIN_CARDS + " and " + CAROUSEL_MAX_CARDS + " cards inclusive; received " + (Number.isInteger(_0x11b4f1) ? _0x11b4f1 : "an invalid count") + "."
        }
      };
    }
    return {
      valid: true,
      count: _0x11b4f1
    };
  }
  async uploadCarouselCardMedia(_0x48cada, _0x1cd7d6, {
    timeoutMs = CAROUSEL_MEDIA_UPLOAD_TIMEOUT_MS
  } = {}) {
    const _0x1162a7 = Array.isArray(_0x48cada) ? _0x48cada : [];
    const _0x21b394 = [];
    for (let _0x5c90f8 = 0; _0x5c90f8 < _0x1162a7.length; _0x5c90f8++) {
      const _0x2a4689 = _0x1162a7[_0x5c90f8] || {};
      const _0x199ac5 = this._resolveCardMediaSource(_0x2a4689);
      if (!_0x199ac5) {
        _0x21b394.push({
          ..._0x2a4689,
          mediaHeader: null
        });
        continue;
      }
      let _0x1fd19d;
      try {
        _0x1fd19d = await this._raceWithTimeout(Promise.resolve().then(() => _0x1cd7d6(_0x199ac5, _0x5c90f8, _0x2a4689)), timeoutMs, "Carousel card " + _0x5c90f8 + ": media upload exceeded " + timeoutMs + "ms");
      } catch (_0x506384) {
        const _0x2eee60 = _0x506384 && _0x506384.message ? _0x506384.message : "media upload failed";
        throw new CarouselSendError(_0x5c90f8, CAROUSEL_SEND_CODES.MEDIA_UPLOAD_FAILED, "Carousel card " + _0x5c90f8 + ": media upload failed (" + _0x2eee60 + ").");
      }
      _0x21b394.push({
        ..._0x2a4689,
        mediaHeader: _0x1fd19d || null
      });
    }
    return {
      cards: _0x21b394
    };
  }
  buildCarouselPayload(_0x4cfe9b, _0x2002ab = {}) {
    const _0x547219 = this._getInteractiveBuilder();
    const _0x3c30d7 = Array.isArray(_0x4cfe9b) ? _0x4cfe9b : [];
    const _0x353dd0 = _0x3c30d7.map(_0xce4ae0 => {
      const _0x5b381a = _0xce4ae0 || {};
      const _0x31ef27 = (typeof _0x5b381a.caption === "string" ? _0x5b381a.caption : undefined) ?? (typeof _0x5b381a.body === "string" ? _0x5b381a.body : undefined) ?? (_0x5b381a.body && typeof _0x5b381a.body === "object" ? _0x5b381a.body.text : undefined) ?? "";
      const _0x3d8014 = {
        body: {
          text: typeof _0x31ef27 === "string" ? _0x31ef27 : String(_0x31ef27 ?? "")
        }
      };
      const _0x29dd87 = _0x5b381a.mediaHeader && typeof _0x5b381a.mediaHeader === "object" ? {
        ..._0x5b381a.mediaHeader
      } : {};
      if (_0x5b381a.title != null) {
        _0x29dd87.title = _0x5b381a.title;
      }
      if (_0x5b381a.subtitle != null) {
        _0x29dd87.subtitle = _0x5b381a.subtitle;
      }
      if (Object.keys(_0x29dd87).length > 0) {
        _0x3d8014.header = _0x29dd87;
      }
      if (_0x5b381a.footer != null) {
        _0x3d8014.footer = {
          text: typeof _0x5b381a.footer === "string" ? _0x5b381a.footer : _0x5b381a.footer.text
        };
      }
      const _0x5e6ec0 = Array.isArray(_0x5b381a.buttons) ? _0x5b381a.buttons : [];
      let _0x49f369 = [];
      if (_0x5e6ec0.length > 0) {
        const {
          payload: _0x456af8
        } = _0x547219.buildInteractivePayload({
          buttons: _0x5e6ec0
        });
        _0x49f369 = (_0x456af8.interactiveButtons || []).map(_0x23515f => this._shorthandToNativeFlowButton(_0x23515f));
      }
      _0x3d8014.nativeFlowMessage = {
        buttons: _0x49f369,
        messageParamsJson: ""
      };
      return _0x3d8014;
    });
    const _0x59b7f1 = {
      body: {
        text: _0x2002ab.text || _0x2002ab.body || ""
      },
      carouselMessage: {
        cards: _0x353dd0,
        messageVersion: 1
      }
    };
    if (_0x2002ab.footer) {
      _0x59b7f1.footer = {
        text: typeof _0x2002ab.footer === "string" ? _0x2002ab.footer : _0x2002ab.footer.text
      };
    }
    if (_0x2002ab.title != null || _0x2002ab.subtitle != null) {
      _0x59b7f1.header = {
        title: _0x2002ab.title ?? "",
        subtitle: _0x2002ab.subtitle ?? "",
        hasMediaAttachment: false
      };
    }
    return {
      interactiveMessage: _0x59b7f1
    };
  }
  async sendCarouselMessage(_0x270e53, _0x44e922, _0x4d3515) {
    try {
      const _0x1220e1 = this.sessions.get(_0x270e53);
      if (!_0x1220e1) {
        throw new Error("Session not found");
      }
      const _0x5abc1a = Array.isArray(_0x4d3515 && _0x4d3515.cards) ? _0x4d3515.cards : [];
      const _0x228bfa = WhatsAppService.validateCarouselCardCount(_0x5abc1a.length);
      if (!_0x228bfa.valid) {
        this.logger.warn("Carousel send rejected for " + _0x44e922 + ": " + _0x228bfa.error.message);
        return {
          success: false,
          error: _0x228bfa.error.message,
          code: _0x228bfa.error.code,
          min: _0x228bfa.error.min,
          max: _0x228bfa.error.max
        };
      }
      const _0x4e1f38 = this._buildCarouselMediaUploader(_0x1220e1);
      let _0x494e54;
      try {
        const _0x45c265 = await this.uploadCarouselCardMedia(_0x5abc1a, _0x4e1f38, {
          timeoutMs: CAROUSEL_MEDIA_UPLOAD_TIMEOUT_MS
        });
        _0x494e54 = _0x45c265.cards;
      } catch (_0x13ce31) {
        if (_0x13ce31 instanceof CarouselSendError) {
          this.logger.error("Carousel send aborted for " + _0x44e922 + ": " + _0x13ce31.message);
          return {
            success: false,
            error: _0x13ce31.message,
            code: _0x13ce31.code,
            cardIndex: _0x13ce31.cardIndex,
            reason: _0x13ce31.reason
          };
        }
        throw _0x13ce31;
      }
      const _0xc50a4c = {
        text: _0x4d3515.text || _0x4d3515.body && _0x4d3515.body.text || "",
        title: _0x4d3515.title,
        subtitle: _0x4d3515.subtitle,
        footer: _0x4d3515.footer
      };
      const _0x461c54 = this.buildCarouselPayload(_0x494e54, _0xc50a4c);
      this.logger.info("Sending carousel message to " + _0x44e922 + ": " + _0x494e54.length + " cards");
      const _0x2dd69f = await _0x1220e1.sendMessage(_0x44e922, _0x461c54);
      this.logger.info("Carousel message sent successfully:", {
        messageId: _0x2dd69f.key.id,
        timestamp: _0x2dd69f.messageTimestamp
      });
      return {
        success: true,
        messageId: _0x2dd69f.key.id,
        timestamp: _0x2dd69f.messageTimestamp
      };
    } catch (_0x195761) {
      this.logger.error("Error sending carousel message from " + _0x270e53 + ":", _0x195761);
      return {
        success: false,
        error: _0x195761.message
      };
    }
  }
  _buildCarouselMediaUploader(_0x4ebbaa) {
    return async _0x36922d => {
      const _0x19e932 = await prepareWAMessageMedia({
        [_0x36922d.mediaType]: _0x36922d.source
      }, {
        upload: _0x4ebbaa.waUploadToServer
      });
      return this._mediaHeaderFromPrepared(_0x36922d.mediaType, _0x19e932);
    };
  }
  _resolveCardMediaSource(_0x27b042) {
    if (!_0x27b042 || typeof _0x27b042 !== "object") {
      return null;
    }
    if (_0x27b042.video != null) {
      return {
        mediaType: "video",
        source: _0x27b042.video
      };
    }
    if (typeof _0x27b042.videoUrl === "string" && _0x27b042.videoUrl.trim()) {
      return {
        mediaType: "video",
        source: {
          url: _0x27b042.videoUrl.trim()
        }
      };
    }
    if (_0x27b042.image != null) {
      return {
        mediaType: "image",
        source: _0x27b042.image
      };
    }
    if (_0x27b042.imageFile && typeof _0x27b042.imageFile.data === "string") {
      const _0x51f0a3 = this._dataUrlToBuffer(_0x27b042.imageFile.data);
      if (_0x51f0a3) {
        return {
          mediaType: "image",
          source: _0x51f0a3
        };
      }
    }
    if (typeof _0x27b042.imageUrl === "string" && _0x27b042.imageUrl.trim()) {
      return {
        mediaType: "image",
        source: {
          url: _0x27b042.imageUrl.trim()
        }
      };
    }
    const _0x4801de = _0x27b042.mediaRef;
    if (_0x4801de) {
      if (typeof _0x4801de === "string" && _0x4801de.trim()) {
        const _0xb9c7d1 = /\.(mp4|3gp|3gpp|mov|mkv|webm)(\?|#|$)/i.test(_0x4801de.trim()) ? "video" : "image";
        return {
          mediaType: _0xb9c7d1,
          source: {
            url: _0x4801de.trim()
          }
        };
      }
      if (typeof _0x4801de === "object") {
        const _0x222849 = _0x4801de.type === "video" ? "video" : "image";
        let _0x3b41e0 = null;
        if (_0x4801de.buffer != null) {
          _0x3b41e0 = _0x4801de.buffer;
        } else if (typeof _0x4801de.data === "string") {
          _0x3b41e0 = this._dataUrlToBuffer(_0x4801de.data) || _0x4801de.data;
        } else if (typeof _0x4801de.url === "string" && _0x4801de.url.trim()) {
          _0x3b41e0 = {
            url: _0x4801de.url.trim()
          };
        }
        if (_0x3b41e0 != null) {
          return {
            mediaType: _0x222849,
            source: _0x3b41e0
          };
        }
      }
    }
    return null;
  }
  _dataUrlToBuffer(_0x51bb5a) {
    try {
      if (typeof _0x51bb5a !== "string" || _0x51bb5a.length === 0) {
        return null;
      }
      const _0x3f37c5 = _0x51bb5a.includes(",") ? _0x51bb5a.split(",")[1] : _0x51bb5a;
      if (!_0x3f37c5) {
        return null;
      }
      const _0x156ad2 = Buffer.from(_0x3f37c5, "base64");
      if (_0x156ad2.length > 0) {
        return _0x156ad2;
      } else {
        return null;
      }
    } catch (_0x509126) {
      return null;
    }
  }
  _mediaHeaderFromPrepared(_0x4263d2, _0x561e0d) {
    if (!_0x561e0d || typeof _0x561e0d !== "object") {
      return null;
    }
    const _0x295b6f = {
      hasMediaAttachment: true
    };
    if (_0x4263d2 === "video" && _0x561e0d.videoMessage) {
      _0x295b6f.videoMessage = _0x561e0d.videoMessage;
    } else if (_0x561e0d.imageMessage) {
      _0x295b6f.imageMessage = _0x561e0d.imageMessage;
    } else if (_0x561e0d.videoMessage) {
      _0x295b6f.videoMessage = _0x561e0d.videoMessage;
    } else if (_0x561e0d.documentMessage) {
      _0x295b6f.documentMessage = _0x561e0d.documentMessage;
    } else {
      return null;
    }
    return _0x295b6f;
  }
  _shorthandToNativeFlowButton(_0x2e9998) {
    if (!_0x2e9998 || typeof _0x2e9998 !== "object") {
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "",
          id: "btn_0"
        })
      };
    }
    if (_0x2e9998.url != null) {
      const _0x27f6b5 = {
        display_text: _0x2e9998.text,
        url: _0x2e9998.url
      };
      if (_0x2e9998.useWebview) {
        _0x27f6b5.webview_presentation = true;
      }
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify(_0x27f6b5)
      };
    }
    if (_0x2e9998.call != null) {
      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: _0x2e9998.text,
          phone_number: _0x2e9998.call
        })
      };
    }
    if (_0x2e9998.copy != null) {
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: _0x2e9998.text,
          copy_code: _0x2e9998.copy
        })
      };
    }
    return {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: _0x2e9998.text,
        id: _0x2e9998.id
      })
    };
  }
  _raceWithTimeout(_0x1c5da4, _0xd8f283, _0x1e7c73) {
    let _0x355ce4;
    const _0xe9861b = new Promise((_0x4f6247, _0x19e0a9) => {
      _0x355ce4 = setTimeout(() => _0x19e0a9(new Error(_0x1e7c73 || "Operation exceeded " + _0xd8f283 + "ms")), _0xd8f283);
      if (typeof _0x355ce4.unref === "function") {
        _0x355ce4.unref();
      }
    });
    return Promise.race([_0x1c5da4, _0xe9861b]).finally(() => {
      if (_0x355ce4) {
        clearTimeout(_0x355ce4);
      }
    });
  }
  async sendFlowMessage(_0x5a654e, _0xde212c, _0x45f198) {
    try {
      const _0x306ddb = this.sessions.get(_0x5a654e);
      if (!_0x306ddb) {
        throw new Error("Session not found");
      }
      const _0x28b308 = {
        interactiveMessage: {
          body: {
            text: _0x45f198.body.text
          },
          footer: _0x45f198.footer ? {
            text: _0x45f198.footer.text
          } : undefined,
          nativeFlowMessage: {
            buttons: [{
              name: "flow",
              buttonParamsJson: JSON.stringify({
                display_text: _0x45f198.button.text,
                flow_message_version: "3",
                flow_token: _0x45f198.flow.token,
                flow_id: _0x45f198.flow.id,
                flow_cta: _0x45f198.flow.cta,
                flow_action: _0x45f198.flow.action || "navigate",
                flow_action_payload: {
                  screen: _0x45f198.flow.screen || "WELCOME_SCREEN"
                }
              })
            }],
            messageParamsJson: ""
          }
        }
      };
      const _0x18ca2a = await _0x306ddb.sendMessage(_0xde212c, _0x28b308);
      return {
        success: true,
        messageId: _0x18ca2a.key.id,
        timestamp: _0x18ca2a.messageTimestamp
      };
    } catch (_0x3b162c) {
      this.logger.error("Error sending flow message from " + _0x5a654e + ":", _0x3b162c);
      return {
        success: false,
        error: _0x3b162c.message
      };
    }
  }
  async sendTemplateMessage(_0x4adaa2, _0x325b37, _0x2d1b01, _0x4b03e3 = {}) {
    if (_0x2d1b01?.type === "mixed_buttons" || _0x2d1b01?.type === "buttons" || _0x2d1b01?.type === "poll") {
      console.error("🔥🔥🔥 INTERACTIVE TEMPLATE DETECTED:", _0x2d1b01.type);
      console.error("🔥🔥🔥 Template data:", JSON.stringify(_0x2d1b01, null, 2));
      try {
        const _0x650ea4 = await this.waitForReadySocket(_0x4adaa2);
        if (!_0x650ea4) {
          throw new Error("Session not found");
        }
        const _0x35ffc0 = _0x325b37;
        const _0x4b77b5 = _0x325b37.replace(/@s\.whatsapp\.net|@lid|@g\.us|@broadcast|@newsletter/g, "");
        if (!_0x325b37.includes("@g.us")) {
          try {
            const [_0x1032f2] = await _0x650ea4.onWhatsApp(_0x4b77b5);
            if (_0x1032f2 && _0x1032f2.jid) {
              _0x325b37 = _0x1032f2.jid;
            }
          } catch (_0x268fdf) {}
        }
        let _0xfba038 = _0x2d1b01.content;
        let _0x551547;
        if (typeof _0x2d1b01.variables === "string") {
          _0x551547 = JSON.parse(_0x2d1b01.variables || "[]");
        } else if (Array.isArray(_0x2d1b01.variables)) {
          _0x551547 = _0x2d1b01.variables;
        } else {
          _0x551547 = [];
        }
        _0x551547.forEach(_0xd00f17 => {
          const _0x1041dd = _0x4b03e3[_0xd00f17] || "{{" + _0xd00f17 + "}}";
          _0xfba038 = _0xfba038.replace(new RegExp("\\{\\{" + _0xd00f17 + "\\}\\}", "g"), _0x1041dd);
        });
        Object.keys(_0x4b03e3).forEach(_0x1a5f10 => {
          const _0x4dca51 = _0x4b03e3[_0x1a5f10] || "";
          const _0x394082 = new RegExp("\\{\\{" + _0x1a5f10 + "\\}\\}", "gi");
          _0xfba038 = _0xfba038.replace(_0x394082, _0x4dca51);
        });
        let _0x48001e;
        if (typeof _0x2d1b01.attachments === "string") {
          try {
            _0x48001e = JSON.parse(_0x2d1b01.attachments || "[]");
          } catch (_0x4e065d) {
            console.error("🔥🔥🔥 Error parsing attachments string:", _0x4e065d);
            _0x48001e = [];
          }
        } else if (Array.isArray(_0x2d1b01.attachments)) {
          _0x48001e = _0x2d1b01.attachments;
        } else {
          _0x48001e = [];
        }
        console.error("🔥🔥🔥 Raw attachments:", _0x48001e);
        const _0x10ced5 = _0x48001e.map(_0x3765c8 => {
          if (typeof _0x3765c8 === "string") {
            try {
              return JSON.parse(_0x3765c8);
            } catch (_0x4895c8) {
              return _0x3765c8;
            }
          }
          return _0x3765c8;
        });
        console.error("🔥🔥🔥 Parsed attachments:", _0x10ced5);
        const _0x354915 = this.extractMediaFromAttachments(_0x10ced5);
        console.error("🔥🔥🔥 Media info result:", _0x354915);
        console.error("🔥🔥🔥 Media info type:", _0x354915?.mediaType);
        console.error("🔥🔥🔥 Media info has media:", !!_0x354915?.media);
        if (_0x2d1b01.type === "mixed_buttons") {
          let _0x5b1df9;
          if (typeof _0x2d1b01.mixed_buttons_data === "string") {
            _0x5b1df9 = JSON.parse(_0x2d1b01.mixed_buttons_data || "{\"buttons\": [], \"footer\": {\"text\": \"\"}}");
          } else if (typeof _0x2d1b01.mixed_buttons_data === "object") {
            _0x5b1df9 = _0x2d1b01.mixed_buttons_data || {
              buttons: [],
              footer: {
                text: ""
              }
            };
          } else {
            _0x5b1df9 = {
              buttons: [],
              footer: {
                text: ""
              }
            };
          }
          if (_0x5b1df9.buttons && _0x5b1df9.buttons.length > 0) {
            let _0x2ea1bc;
            if (_0x354915) {
              const {
                media: _0x46cec5,
                mediaType: _0x262696
              } = _0x354915;
              console.error("🔥🔥🔥 Creating mixed_buttons with media");
              _0x2ea1bc = {
                [_0x262696]: _0x46cec5[_0x262696],
                caption: _0xfba038,
                footer: _0x5b1df9.footer && _0x5b1df9.footer.text ? _0x5b1df9.footer.text : undefined,
                hasMediaAttachment: true,
                interactiveButtons: _0x5b1df9.buttons.map((_0x2613af, _0x5649cb) => {
                  switch (_0x2613af.type) {
                    case "quick_reply":
                      return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x2613af.text,
                          id: _0x2613af.id || "btn_" + _0x5649cb
                        })
                      };
                    case "cta_url":
                      return {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x2613af.text,
                          url: _0x2613af.url,
                          merchant_url: _0x2613af.url
                        })
                      };
                    case "cta_call":
                      return {
                        name: "cta_call",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x2613af.text,
                          phone_number: _0x2613af.phone_number
                        })
                      };
                    case "copy_code":
                      return {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x2613af.text,
                          copy_code: _0x2613af.code
                        })
                      };
                    default:
                      return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x2613af.text,
                          id: _0x2613af.id || "btn_" + _0x5649cb
                        })
                      };
                  }
                })
              };
            } else {
              _0x2ea1bc = {
                text: _0xfba038,
                footer: _0x5b1df9.footer && _0x5b1df9.footer.text ? _0x5b1df9.footer.text : undefined,
                interactiveButtons: _0x5b1df9.buttons.map((_0x12d152, _0x4ebf09) => {
                  switch (_0x12d152.type) {
                    case "quick_reply":
                      return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x12d152.text,
                          id: _0x12d152.id || "btn_" + _0x4ebf09
                        })
                      };
                    case "cta_url":
                      return {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x12d152.text,
                          url: _0x12d152.url,
                          merchant_url: _0x12d152.url
                        })
                      };
                    case "cta_call":
                      return {
                        name: "cta_call",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x12d152.text,
                          phone_number: _0x12d152.phone_number
                        })
                      };
                    case "copy_code":
                      return {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x12d152.text,
                          copy_code: _0x12d152.code
                        })
                      };
                    default:
                      return {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                          display_text: _0x12d152.text,
                          id: _0x12d152.id || "btn_" + _0x4ebf09
                        })
                      };
                  }
                })
              };
            }
            const _0x18f5a9 = await _0x650ea4.sendMessage(_0x325b37, _0x2ea1bc);
            return {
              success: true,
              messageId: _0x18f5a9.key.id,
              timestamp: _0x18f5a9.messageTimestamp
            };
          }
        } else if (_0x2d1b01.type === "poll") {
          console.error("🔥🔥🔥 POLL TEMPLATE DETECTED in early return section");
          let _0x47caf6;
          if (typeof _0x2d1b01.poll_options === "string") {
            _0x47caf6 = JSON.parse(_0x2d1b01.poll_options || "[]");
          } else if (Array.isArray(_0x2d1b01.poll_options)) {
            _0x47caf6 = _0x2d1b01.poll_options;
          } else {
            _0x47caf6 = [];
          }
          const _0xe5f6d9 = {
            name: _0x2d1b01.poll_question || _0xfba038,
            values: _0x47caf6.map(_0x2d0fb2 => typeof _0x2d0fb2 === "string" ? _0x2d0fb2 : _0x2d0fb2.text),
            selectableCount: 1
          };
          if (_0x354915) {
            _0xe5f6d9.media = _0x354915.media;
            _0xe5f6d9.caption = _0xfba038;
          } else if (_0xfba038) {
            _0xe5f6d9.text = _0xfba038;
          }
          console.error("🔥🔥🔥 Calling sendPollMessage with pollData:", _0xe5f6d9);
          const _0xe66a0 = await this.sendPollMessage(_0x4adaa2, _0x325b37, _0xe5f6d9);
          return _0xe66a0;
        } else if (_0x2d1b01.type === "buttons") {
          let _0x321144;
          let _0x1acc60;
          if (typeof _0x2d1b01.buttons === "string") {
            _0x321144 = JSON.parse(_0x2d1b01.buttons || "[]");
          } else if (Array.isArray(_0x2d1b01.buttons)) {
            _0x321144 = _0x2d1b01.buttons;
          } else {
            _0x321144 = [];
          }
          if (typeof _0x2d1b01.interactive_settings === "string") {
            _0x1acc60 = JSON.parse(_0x2d1b01.interactive_settings || "{}");
          } else if (typeof _0x2d1b01.interactive_settings === "object") {
            _0x1acc60 = _0x2d1b01.interactive_settings || {};
          } else {
            _0x1acc60 = {};
          }
          if (_0x321144.length > 0) {
            const _0x36e979 = _0x321144.map((_0x2a741f, _0x5e5091) => ({
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: _0x2a741f.text,
                id: _0x2a741f.id || "btn_" + _0x5e5091
              })
            }));
            if (_0x354915) {
              const {
                media: _0x5e6d45,
                mediaType: _0x7f1f75
              } = _0x354915;
              console.error("🔥🔥🔥 Creating buttons with media - using interactiveButtons format");
              const _0x59c9e5 = {
                [_0x7f1f75]: _0x5e6d45[_0x7f1f75],
                caption: _0xfba038,
                footer: _0x1acc60.footerText || undefined,
                hasMediaAttachment: true,
                interactiveButtons: _0x36e979
              };
              console.error("🔥🔥🔥 Button content keys:", Object.keys(_0x59c9e5));
              const _0x326c28 = await _0x650ea4.sendMessage(_0x325b37, _0x59c9e5);
              return {
                success: true,
                messageId: _0x326c28.key.id,
                timestamp: _0x326c28.messageTimestamp
              };
            } else {
              const _0x29204a = {
                text: _0xfba038,
                footer: _0x1acc60.footerText || undefined,
                interactiveButtons: _0x36e979
              };
              const _0x1910df = await _0x650ea4.sendMessage(_0x325b37, _0x29204a);
              return {
                success: true,
                messageId: _0x1910df.key.id,
                timestamp: _0x1910df.messageTimestamp
              };
            }
          }
        }
        const _0x37189b = await _0x650ea4.sendMessage(_0x325b37, {
          text: _0xfba038
        });
        return {
          success: true,
          messageId: _0x37189b.key.id,
          timestamp: _0x37189b.messageTimestamp
        };
      } catch (_0x430fbf) {
        console.error("🔥🔥🔥 Error in interactive template processing:", _0x430fbf);
        console.error("🔥🔥🔥 Template type:", _0x2d1b01.type);
        console.error("🔥🔥🔥 Error details:", _0x430fbf.stack);
        return {
          success: false,
          error: _0x430fbf.message
        };
      }
    }
    console.error("🚀🚀🚀 CRITICAL DEBUG: sendTemplateMessage method called - START");
    console.error("🚀🚀🚀 CRITICAL DEBUG: Parameters:", {
      sessionId: _0x4adaa2,
      to: _0x325b37,
      templateType: _0x2d1b01?.type
    });
    console.error("🚀🚀🚀 CRITICAL DEBUG: templateData:", _0x2d1b01);
    try {
      console.error("🚀🚀🚀 CRITICAL DEBUG: Inside try block");
      const _0x525cea = await this.waitForReadySocket(_0x4adaa2);
      console.error("🚀🚀🚀 CRITICAL DEBUG: Socket retrieved:", !!_0x525cea);
      if (!_0x525cea) {
        console.error("❌❌❌ Session not found:", _0x4adaa2);
        this.logger.error("❌ Session not found:", _0x4adaa2);
        throw new Error("Session not found");
      }
      console.error("✅✅✅ Socket ready for session:", _0x4adaa2);
      this.logger.info("✅ Socket ready for session: " + _0x4adaa2);
      if (this._recipientNeedsResolution(_0x325b37)) {
        try {
          const _0x185902 = this._getRecipientResolver();
          const _0x59442d = await _0x185902.resolveRecipient(_0x4adaa2, _0x325b37);
          if (_0x59442d && _0x59442d.jid) {
            this.logger.info("📇 Resolved recipient \"" + _0x325b37 + "\" to JID " + _0x59442d.jid);
            _0x325b37 = _0x59442d.jid;
          } else {
            const _0x36d624 = _0x59442d && _0x59442d.reason || "unresolved";
            this.logger.warn("📇 Recipient \"" + _0x325b37 + "\" unresolved (" + _0x36d624 + "); leaving message unsent");
            return {
              success: false,
              unresolved: true,
              error: "Recipient unresolved: " + _0x36d624
            };
          }
        } catch (_0x33adcd) {
          this.logger.warn("📇 Recipient resolution failed for \"" + _0x325b37 + "\", continuing with original target: " + (_0x33adcd && _0x33adcd.message));
        }
      }
      console.error("📞📞📞 About to verify JID with WhatsApp for:", _0x325b37);
      this.logger.info("📞 Verifying JID with WhatsApp for: " + _0x325b37);
      let _0xf42104 = _0x325b37;
      const _0x2cb2c6 = _0x325b37.replace(/@s\.whatsapp\.net|@lid|@g\.us|@broadcast|@newsletter/g, "");
      console.error("📞📞📞 Clean number:", _0x2cb2c6);
      try {
        console.error("📞📞📞 Calling socket.onWhatsApp...");
        const [_0x1ff59d] = await _0x525cea.onWhatsApp(_0x2cb2c6);
        console.error("📞📞📞 onWhatsApp returned:", _0x1ff59d);
        if (_0x1ff59d && _0x1ff59d.jid) {
          _0xf42104 = _0x1ff59d.jid;
          console.error("✅✅✅ WhatsApp confirmed JID:", _0xf42104);
          this.logger.info("✅ WhatsApp confirmed JID: " + _0xf42104);
        } else {
          console.error("⚠️⚠️⚠️ Number not confirmed by WhatsApp, keeping original JID:", _0x325b37);
          this.logger.warn("⚠️ WhatsApp check returned no JID, keeping original: " + _0x325b37);
          _0xf42104 = _0x325b37;
        }
      } catch (_0x405f1b) {
        console.error("❌❌❌ Error verifying JID, keeping original:", _0x325b37, _0x405f1b.message);
        this.logger.error("❌ Error verifying JID, keeping original " + _0x325b37 + ":", _0x405f1b);
        _0xf42104 = _0x325b37;
      }
      _0x325b37 = _0xf42104;
      console.error("📤📤📤 Using verified JID for message:", _0x325b37);
      this.logger.info("📤 Using verified JID for message: " + _0x325b37);
      let _0x3e6eef = _0x2d1b01.content;
      this.logger.info("📝 Template content: " + _0x3e6eef?.substring(0, 100) + "...");
      this.logger.info("📝 Template variables (raw): " + _0x2d1b01.variables);
      let _0x1a1e63;
      try {
        _0x1a1e63 = JSON.parse(_0x2d1b01.variables || "[]");
        this.logger.info("📝 Parsed template variables:", _0x1a1e63);
      } catch (_0x23b922) {
        this.logger.error("❌ Error parsing template variables:", _0x23b922);
        _0x1a1e63 = [];
      }
      _0x1a1e63.forEach(_0x56891d => {
        const _0x3f07b4 = _0x4b03e3[_0x56891d] || "{{" + _0x56891d + "}}";
        _0x3e6eef = _0x3e6eef.replace(new RegExp("\\{\\{" + _0x56891d + "\\}\\}", "g"), _0x3f07b4);
      });
      Object.keys(_0x4b03e3).forEach(_0x4cb776 => {
        const _0x38ceae = _0x4b03e3[_0x4cb776] || "";
        const _0x57bb77 = new RegExp("\\{\\{" + _0x4cb776 + "\\}\\}", "gi");
        _0x3e6eef = _0x3e6eef.replace(_0x57bb77, _0x38ceae);
      });
      this.logger.info("📝 Content after variable replacement: " + _0x3e6eef?.substring(0, 100) + "...");
      let _0xf66f9c;
      let _0x202744 = _0x3e6eef;
      if (["image", "video", "document"].includes(_0x2d1b01.type) && _0x3e6eef && _0x3e6eef.length > 1024) {
        await this.sendTextMessage(_0x4adaa2, _0x325b37, _0x3e6eef);
        _0x202744 = "";
      }
      const _0x3aa4f0 = await this._maybeSendExpressiveTemplate(_0x4adaa2, _0x325b37, _0x3e6eef, _0x2d1b01);
      if (_0x3aa4f0) {
        return _0x3aa4f0;
      }
      switch (_0x2d1b01.type) {
        case "text":
          {
            const _0x31c92f = await this._buildTemplateLinkPreview(_0x3e6eef, _0x2d1b01);
            if (_0x31c92f && _0x31c92f.preview) {
              const _0x455527 = await _0x525cea.sendMessage(_0x325b37, {
                text: _0x3e6eef,
                linkPreview: _0x31c92f.preview
              });
              _0xf66f9c = {
                success: true,
                messageId: _0x455527.key.id,
                timestamp: _0x455527.messageTimestamp
              };
            } else {
              if (_0x31c92f && _0x31c92f.warning) {
                this.logger.warn("🔗 Link preview unavailable for " + _0x325b37 + ": " + _0x31c92f.warning);
              }
              _0xf66f9c = await this.sendTextMessage(_0x4adaa2, _0x325b37, _0x3e6eef);
            }
            break;
          }
        case "rich_message":
          {
            const _0x4cc327 = this._getRichMessageService();
            let _0x9db9cf = _0x3e6eef;
            try {
              const _0x35d3ef = _0x4cc327.parseRichMessageData(_0x2d1b01.rich_message_data);
              if (_0x35d3ef && typeof _0x35d3ef.markdown === "string" && _0x35d3ef.markdown.trim().length > 0) {
                _0x9db9cf = this._applyTemplateVariables(_0x35d3ef.markdown, _0x1a1e63, _0x4b03e3);
              }
            } catch (_0x3040b0) {
              this.logger.warn("rich_message: could not parse rich_message_data, using content: " + (_0x3040b0 && _0x3040b0.message));
            }
            const _0x467eaf = this._resolveLinkPreviewEnabled(_0x2d1b01);
            const _0x5b3855 = await _0x4cc327.send(_0x525cea, _0x325b37, _0x9db9cf, {
              templateId: _0x2d1b01.id,
              linkPreview: _0x467eaf === false ? false : undefined,
              recordWarning: _0x162643 => this.logger.warn("rich_message degraded-send warning for " + _0x325b37 + ": " + _0x162643)
            });
            _0xf66f9c = _0x5b3855.success ? {
              success: true,
              messageId: _0x5b3855.messageId,
              timestamp: _0x5b3855.timestamp,
              degraded: !!_0x5b3855.degraded,
              warnings: _0x5b3855.warnings
            } : {
              success: false,
              error: _0x5b3855.error
            };
            break;
          }
        case "interactive":
          {
            const _0x515356 = this._getInteractiveBuilder();
            const {
              ValidationError: _0x566141
            } = require("./interactive-builder");
            let _0x2e958d;
            if (typeof _0x2d1b01.interactive_data === "string") {
              try {
                _0x2e958d = JSON.parse(_0x2d1b01.interactive_data || "{}");
              } catch (_0x196091) {
                _0x2e958d = {};
              }
            } else if (_0x2d1b01.interactive_data && typeof _0x2d1b01.interactive_data === "object") {
              _0x2e958d = _0x2d1b01.interactive_data;
            } else {
              _0x2e958d = {
                text: _0x3e6eef
              };
            }
            if (_0x2e958d && (_0x2e958d.text == null || _0x2e958d.text === "")) {
              _0x2e958d.text = _0x3e6eef;
            }
            try {
              const {
                payload: _0x76c565
              } = _0x515356.buildInteractivePayload(_0x2e958d);
              const _0x4a4f17 = await _0x525cea.sendMessage(_0x325b37, _0x76c565);
              _0xf66f9c = {
                success: true,
                messageId: _0x4a4f17.key.id,
                timestamp: _0x4a4f17.messageTimestamp
              };
            } catch (_0x57ba55) {
              if (_0x57ba55 instanceof _0x566141) {
                this.logger.warn("Interactive validation failed for " + _0x325b37 + " (index=" + _0x57ba55.index + ", rule=" + _0x57ba55.rule + "); message left unsent");
                _0xf66f9c = {
                  success: false,
                  error: _0x57ba55.message,
                  validation: {
                    index: _0x57ba55.index,
                    rule: _0x57ba55.rule
                  }
                };
              } else {
                throw _0x57ba55;
              }
            }
            break;
          }
        case "image":
          const _0x33a170 = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x584aaa = JSON.parse(_0x2d1b01.media_settings || "{}");
          if (_0x33a170.length > 0) {
            const _0x5d8755 = _0x33a170[0];
            let _0x505eec;
            if (_0x5d8755 && _0x5d8755.data && _0x5d8755.data.startsWith("data:")) {
              const _0x64367 = _0x5d8755.data.split(",")[1];
              const _0x2cf7e0 = Buffer.from(_0x64367, "base64");
              _0x505eec = {
                image: _0x2cf7e0,
                caption: _0x202744,
                ...(_0x584aaa.viewOnce && {
                  viewOnce: true
                })
              };
            } else if (typeof _0x5d8755 === "string") {
              _0x505eec = {
                image: {
                  url: _0x5d8755
                },
                caption: _0x202744,
                ...(_0x584aaa.viewOnce && {
                  viewOnce: true
                })
              };
            } else if (_0x5d8755 && typeof _0x5d8755 === "object" && _0x5d8755.url) {
              _0x505eec = {
                image: {
                  url: _0x5d8755.url
                },
                caption: _0x202744,
                ...(_0x584aaa.viewOnce && {
                  viewOnce: true
                })
              };
            } else {
              throw new Error("Invalid image attachment format");
            }
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x505eec);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            throw new Error("No image attachment found");
          }
          break;
        case "video":
          const _0xc28312 = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x5519e6 = JSON.parse(_0x2d1b01.media_settings || "{}");
          this.logger.info("📹 Processing video template - attachments count: " + _0xc28312.length);
          if (_0xc28312.length > 0) {
            const _0x5c7a88 = _0xc28312[0];
            let _0x33b51f;
            this.logger.info("📹 Video attachment type: " + typeof _0x5c7a88 + ", has data: " + !!_0x5c7a88?.data + ", has url: " + !!_0x5c7a88?.url);
            if (_0x5c7a88 && _0x5c7a88.data && _0x5c7a88.data.startsWith("data:")) {
              this.logger.info("📹 Processing base64 video data URL");
              const _0x9c68eb = _0x5c7a88.data.split(",")[1];
              const _0x1f43d5 = Buffer.from(_0x9c68eb, "base64");
              this.logger.info("📹 Converted to buffer, size: " + _0x1f43d5.length + " bytes (" + (_0x1f43d5.length / 1024 / 1024).toFixed(2) + " MB)");
              _0x33b51f = {
                video: _0x1f43d5,
                caption: _0x202744,
                ...(_0x5519e6.viewOnce && {
                  viewOnce: true
                })
              };
            } else if (typeof _0x5c7a88 === "string") {
              this.logger.info("📹 Processing video URL string: " + _0x5c7a88.substring(0, 50) + "...");
              if (_0x5c7a88.startsWith("data:")) {
                const _0x207473 = _0x5c7a88.split(",")[1];
                const _0x130c0b = Buffer.from(_0x207473, "base64");
                this.logger.info("📹 Converted data URL to buffer, size: " + _0x130c0b.length + " bytes");
                _0x33b51f = {
                  video: _0x130c0b,
                  caption: _0x202744,
                  ...(_0x5519e6.viewOnce && {
                    viewOnce: true
                  })
                };
              } else {
                _0x33b51f = {
                  video: {
                    url: _0x5c7a88
                  },
                  caption: _0x202744,
                  ...(_0x5519e6.viewOnce && {
                    viewOnce: true
                  })
                };
              }
            } else if (_0x5c7a88 && typeof _0x5c7a88 === "object" && _0x5c7a88.url) {
              this.logger.info("📹 Processing video URL object: " + _0x5c7a88.url.substring(0, 50) + "...");
              if (_0x5c7a88.url.startsWith("data:")) {
                const _0x61ec1e = _0x5c7a88.url.split(",")[1];
                const _0xf37ce2 = Buffer.from(_0x61ec1e, "base64");
                this.logger.info("📹 Converted data URL to buffer, size: " + _0xf37ce2.length + " bytes");
                _0x33b51f = {
                  video: _0xf37ce2,
                  caption: _0x202744,
                  ...(_0x5519e6.viewOnce && {
                    viewOnce: true
                  })
                };
              } else {
                _0x33b51f = {
                  video: {
                    url: _0x5c7a88.url
                  },
                  caption: _0x202744,
                  ...(_0x5519e6.viewOnce && {
                    viewOnce: true
                  })
                };
              }
            } else {
              this.logger.error("❌ Invalid video attachment format:", _0x5c7a88);
              throw new Error("Invalid video attachment format");
            }
            this.logger.info("📹 Sending video message to " + _0x325b37);
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x33b51f);
            this.logger.info("✅ Video sent successfully, messageId: " + _0xf66f9c.key.id);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            this.logger.error("❌ No video attachment found in template");
            throw new Error("No video attachment found");
          }
          break;
        case "audio":
          const _0xb9e192 = JSON.parse(_0x2d1b01.attachments || "[]");
          if (_0xb9e192.length > 0) {
            const _0x170e16 = _0xb9e192[0];
            let _0x3926;
            const _0x1b04b8 = _0x1cf88c => {
              if (_0x1cf88c && _0x1cf88c.startsWith("data:")) {
                const _0x2d2d35 = _0x1cf88c.match(/^data:([^;]+);/);
                if (_0x2d2d35) {
                  return _0x2d2d35[1];
                } else {
                  return "audio/mp4";
                }
              }
              return "audio/mp4";
            };
            const _0x3655e8 = _0xd90cdf => {
              if (!_0xd90cdf) {
                return "audio/mp4";
              }
              const _0x13973f = _0xd90cdf.toLowerCase().split(".").pop();
              const _0x3fe277 = {
                mp3: "audio/mpeg",
                wav: "audio/wav",
                ogg: "audio/ogg",
                aac: "audio/aac",
                flac: "audio/flac",
                m4a: "audio/mp4"
              };
              return _0x3fe277[_0x13973f] || "audio/mp4";
            };
            if (_0x3e6eef && _0x3e6eef.trim()) {
              await this.sendTextMessage(_0x4adaa2, _0x325b37, _0x3e6eef);
              await new Promise(_0xbe3f7b => setTimeout(_0xbe3f7b, 500));
            }
            if (_0x170e16.data && _0x170e16.data.startsWith("data:")) {
              const _0x3ed215 = _0x170e16.data.split(",")[1];
              const _0x58c755 = Buffer.from(_0x3ed215, "base64");
              const _0x20e06e = _0x1b04b8(_0x170e16.data);
              _0x3926 = {
                audio: _0x58c755,
                mimetype: _0x20e06e
              };
            } else if (typeof _0x170e16 === "string") {
              const _0x399320 = _0x3655e8(_0x170e16);
              _0x3926 = {
                audio: {
                  url: _0x170e16
                },
                mimetype: _0x399320
              };
            } else if (_0x170e16 && typeof _0x170e16 === "object") {
              let _0x34ec4b = "audio/mp4";
              if (_0x170e16.type) {
                _0x34ec4b = _0x170e16.type;
              } else if (_0x170e16.data) {
                _0x34ec4b = _0x1b04b8(_0x170e16.data);
              } else if (_0x170e16.url) {
                _0x34ec4b = _0x3655e8(_0x170e16.url) || _0x3655e8(_0x170e16.name);
              }
              _0x3926 = {
                audio: _0x170e16.url ? {
                  url: _0x170e16.url
                } : _0x170e16.data ? Buffer.from(_0x170e16.data.split(",")[1], "base64") : null,
                mimetype: _0x34ec4b
              };
              if (!_0x3926.audio) {
                throw new Error("Invalid audio attachment format");
              }
            } else {
              throw new Error("Invalid audio attachment format");
            }
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x3926);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            throw new Error("No audio attachment found");
          }
          break;
        case "document":
          const _0x46a2da = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x278a55 = JSON.parse(_0x2d1b01.media_settings || "{}");
          if (_0x46a2da.length > 0) {
            const _0x1adc37 = _0x46a2da[0];
            let _0x4ded09;
            const _0x8a06db = _0x5a337b => {
              if (_0x5a337b.type && _0x5a337b.type !== "null") {
                return _0x5a337b.type;
              }
              if (_0x5a337b.data && _0x5a337b.data.startsWith("data:")) {
                const _0x3b8df8 = _0x5a337b.data.match(/^data:([^;]+);/);
                if (_0x3b8df8) {
                  return _0x3b8df8[1];
                }
              }
              const _0x4ce0f3 = _0x5a337b.url || _0x5a337b.name || "";
              const _0x1b054d = _0x4ce0f3.toLowerCase().split(".").pop();
              const _0x5a74a7 = {
                pdf: "application/pdf",
                doc: "application/msword",
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                xls: "application/vnd.ms-excel",
                xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ppt: "application/vnd.ms-powerpoint",
                pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                txt: "text/plain",
                zip: "application/zip"
              };
              return _0x5a74a7[_0x1b054d] || "application/octet-stream";
            };
            if (_0x1adc37.data && _0x1adc37.data.startsWith("data:")) {
              const _0xef40b = _0x1adc37.data.split(",")[1];
              const _0x2d031b = Buffer.from(_0xef40b, "base64");
              _0x4ded09 = {
                document: _0x2d031b,
                mimetype: _0x8a06db(_0x1adc37),
                fileName: _0x1adc37.name || _0x278a55.fileName || "document.pdf",
                caption: _0x202744
              };
            } else if (typeof _0x1adc37 === "string") {
              _0x4ded09 = {
                document: {
                  url: _0x1adc37
                },
                mimetype: _0x8a06db({
                  url: _0x1adc37
                }),
                fileName: _0x278a55.fileName || "document.pdf",
                caption: _0x202744
              };
            } else if (_0x1adc37 && typeof _0x1adc37 === "object" && _0x1adc37.url) {
              const _0x467350 = _0x1adc37.name || _0x278a55.fileName || "document.pdf";
              _0x4ded09 = {
                document: {
                  url: _0x1adc37.url
                },
                mimetype: _0x8a06db(_0x1adc37),
                fileName: _0x467350,
                caption: _0x202744
              };
            } else {
              throw new Error("Invalid document attachment format");
            }
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x4ded09);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            throw new Error("No document attachment found");
          }
          break;
        case "buttons":
          const _0x585d69 = JSON.parse(_0x2d1b01.buttons || "[]");
          const _0xeccc4f = JSON.parse(_0x2d1b01.interactive_settings || "{}");
          const _0xbe9dcd = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x4d5152 = this.extractMediaFromAttachments(_0xbe9dcd);
          if (_0x585d69.length > 0) {
            const _0xdaa01f = {
              text: _0x3e6eef,
              footer: _0xeccc4f.footerText || undefined,
              interactiveButtons: _0x585d69.map(_0x526a26 => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: _0x526a26.text,
                  id: _0x526a26.id
                })
              })),
              hasMediaAttachment: false
            };
            if (_0x4d5152) {
              const {
                media: _0x29798c,
                mediaType: _0x17353b
              } = _0x4d5152;
              _0xdaa01f[_0x17353b] = _0x29798c[_0x17353b];
              delete _0xdaa01f.text;
              _0xdaa01f.caption = _0x3e6eef;
              _0xdaa01f.hasMediaAttachment = true;
            }
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0xdaa01f);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "list":
          const _0x46c76f = JSON.parse(_0x2d1b01.list_sections || "[]");
          const _0x3f6d84 = JSON.parse(_0x2d1b01.interactive_settings || "{}");
          const _0x3a8d4e = JSON.parse(_0x2d1b01.attachments || "[]");
          console.error("🔥🔥🔥 ORIGINAL LIST CASE - Processing list template");
          console.error("🔥🔥🔥 List attachments:", _0x3a8d4e);
          const _0x2175d0 = _0x3a8d4e.map(_0x376445 => {
            if (typeof _0x376445 === "string") {
              try {
                return JSON.parse(_0x376445);
              } catch (_0x4d7755) {
                return _0x376445;
              }
            }
            return _0x376445;
          });
          const _0x591312 = this.extractMediaFromAttachments(_0x2175d0);
          console.error("🔥🔥🔥 List media info:", _0x591312);
          if (_0x46c76f.length > 0) {
            if (_0x591312) {
              const {
                media: _0x1237e8,
                mediaType: _0x536c74
              } = _0x591312;
              console.error("🔥🔥🔥 Sending list media first, then list message");
              const _0x2e3c10 = {
                [_0x536c74]: _0x1237e8[_0x536c74],
                caption: _0x3e6eef
              };
              await _0x525cea.sendMessage(_0x325b37, _0x2e3c10);
              const _0x596cde = {
                text: "Please select an option:",
                footer: _0x3f6d84.footerText || undefined,
                title: _0x3f6d84.title || undefined,
                buttonText: _0x3f6d84.buttonText || "View Options",
                sections: _0x46c76f.map(_0x513931 => ({
                  title: _0x513931.title,
                  rows: _0x513931.rows.map(_0x3624bf => ({
                    rowId: _0x3624bf.id,
                    title: _0x3624bf.title,
                    description: _0x3624bf.description
                  }))
                }))
              };
              _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x596cde);
            } else {
              const _0x2d4281 = {
                text: _0x3e6eef,
                footer: _0x3f6d84.footerText || undefined,
                title: _0x3f6d84.title || undefined,
                buttonText: _0x3f6d84.buttonText || "View Options",
                sections: _0x46c76f.map(_0x126013 => ({
                  title: _0x126013.title,
                  rows: _0x126013.rows.map(_0x4c1bce => ({
                    rowId: _0x4c1bce.id,
                    title: _0x4c1bce.title,
                    description: _0x4c1bce.description
                  }))
                }))
              };
              _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x2d4281);
            }
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "poll":
          const _0x37ee97 = JSON.parse(_0x2d1b01.poll_options || "[]");
          const _0x3ab3e9 = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x420cd4 = this.extractMediaFromAttachments(_0x3ab3e9);
          const _0x466cbc = {
            name: _0x2d1b01.poll_question || _0x3e6eef,
            values: _0x37ee97.map(_0x142fe2 => typeof _0x142fe2 === "string" ? _0x142fe2 : _0x142fe2.text),
            selectableCount: 1
          };
          if (_0x420cd4) {
            _0x466cbc.media = _0x420cd4.media;
            _0x466cbc.caption = _0x3e6eef;
          } else if (_0x3e6eef) {
            _0x466cbc.text = _0x3e6eef;
          }
          _0xf66f9c = await this.sendPollMessage(_0x4adaa2, _0x325b37, _0x466cbc);
          break;
        case "contact":
          const _0xa6aa9 = JSON.parse(_0x2d1b01.contact_info || "{}");
          const _0x1364e5 = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x1f91d5 = this.extractMediaFromAttachments(_0x1364e5);
          if (_0x1f91d5) {
            const _0x235399 = {
              [_0x1f91d5.mediaType]: _0x1f91d5.media[_0x1f91d5.mediaType]
            };
            if (_0x1f91d5.media.mimetype) {
              _0x235399.mimetype = _0x1f91d5.media.mimetype;
            }
            _0x235399.caption = _0x3e6eef;
            await _0x525cea.sendMessage(_0x325b37, _0x235399);
          } else if (_0x3e6eef && _0x3e6eef.trim()) {
            await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
          }
          const _0x22e812 = ("BEGIN:VCARD\nVERSION:3.0\nFN:" + (_0xa6aa9.name || "Contact") + "\nN:" + (_0xa6aa9.name ? _0xa6aa9.name.split(" ").reverse().join(";") : "Contact") + "\nTEL;TYPE=CELL:" + (_0xa6aa9.phone || "") + "\n" + (_0xa6aa9.email ? "EMAIL:" + _0xa6aa9.email : "") + "\n" + (_0xa6aa9.organization ? "ORG:" + _0xa6aa9.organization : "") + "\nEND:VCARD").replace(/\n\n/g, "\n").trim();
          const _0x2e7621 = {
            contacts: {
              displayName: _0xa6aa9.name || "Contact",
              contacts: [{
                vcard: _0x22e812
              }]
            }
          };
          _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x2e7621);
          _0xf66f9c = {
            success: true,
            messageId: _0xf66f9c.key.id,
            timestamp: _0xf66f9c.messageTimestamp
          };
          break;
        case "location":
          const _0x37f7bf = JSON.parse(_0x2d1b01.location_info || "{}");
          const _0x53128f = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x3906f1 = this.extractMediaFromAttachments(_0x53128f);
          if (_0x3906f1) {
            const _0x16a497 = {
              [_0x3906f1.mediaType]: _0x3906f1.media[_0x3906f1.mediaType]
            };
            if (_0x3906f1.media.mimetype) {
              _0x16a497.mimetype = _0x3906f1.media.mimetype;
            }
            _0x16a497.caption = _0x3e6eef;
            await _0x525cea.sendMessage(_0x325b37, _0x16a497);
          }
          const _0x3f648e = {
            location: {
              degreesLatitude: _0x37f7bf.latitude,
              degreesLongitude: _0x37f7bf.longitude,
              name: _0x37f7bf.name || "Location",
              address: _0x37f7bf.address || ""
            }
          };
          _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x3f648e);
          _0xf66f9c = {
            success: true,
            messageId: _0xf66f9c.key.id,
            timestamp: _0xf66f9c.messageTimestamp
          };
          break;
        case "cta_button":
          const _0x23ca40 = JSON.parse(_0x2d1b01.cta_data || "{}");
          if (_0x23ca40.button && _0x23ca40.button.url) {
            const _0x2163ee = {
              body: {
                text: _0x3e6eef
              },
              footer: _0x23ca40.footer && _0x23ca40.footer.text ? {
                text: _0x23ca40.footer.text
              } : undefined,
              button: {
                text: _0x23ca40.button.text,
                url: _0x23ca40.button.url
              }
            };
            _0xf66f9c = await this.sendCTAButtonMessage(_0x4adaa2, _0x325b37, _0x2163ee);
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "copy_code":
          const _0x4595a5 = JSON.parse(_0x2d1b01.copy_data || "{}");
          if (_0x4595a5.button && _0x4595a5.button.code) {
            const _0x1f3bcf = {
              body: {
                text: _0x3e6eef
              },
              footer: _0x4595a5.footer && _0x4595a5.footer.text ? {
                text: _0x4595a5.footer.text
              } : undefined,
              button: {
                text: _0x4595a5.button.text,
                code: _0x4595a5.button.code
              }
            };
            _0xf66f9c = await this.sendCopyCodeMessage(_0x4adaa2, _0x325b37, _0x1f3bcf);
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "flow":
          const _0x26af8c = JSON.parse(_0x2d1b01.flow_data || "{}");
          if (_0x26af8c.flow && _0x26af8c.flow.id) {
            const _0x5e258c = {
              body: {
                text: _0x3e6eef
              },
              footer: _0x26af8c.footer ? {
                text: _0x26af8c.footer.text
              } : undefined,
              button: {
                text: _0x26af8c.button.text
              },
              flow: _0x26af8c.flow
            };
            _0xf66f9c = await this.sendFlowMessage(_0x4adaa2, _0x325b37, _0x5e258c);
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "mixed_buttons":
          const _0x20ce58 = JSON.parse(_0x2d1b01.mixed_buttons_data || "{\"buttons\": [], \"footer\": {\"text\": \"\"}}");
          const _0x481440 = JSON.parse(_0x2d1b01.attachments || "[]");
          const _0x3db06d = this.extractMediaFromAttachments(_0x481440);
          if (_0x20ce58.buttons && _0x20ce58.buttons.length > 0) {
            const _0x43493c = {
              text: _0x3e6eef,
              footer: _0x20ce58.footer && _0x20ce58.footer.text ? _0x20ce58.footer.text : undefined,
              interactiveButtons: _0x20ce58.buttons.map((_0x57cf9e, _0xedd4f8) => {
                switch (_0x57cf9e.type) {
                  case "quick_reply":
                    return {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: _0x57cf9e.text,
                        id: _0x57cf9e.id || "btn_" + _0xedd4f8
                      })
                    };
                  case "cta_url":
                    return {
                      name: "cta_url",
                      buttonParamsJson: JSON.stringify({
                        display_text: _0x57cf9e.text,
                        url: _0x57cf9e.url,
                        merchant_url: _0x57cf9e.url
                      })
                    };
                  case "cta_call":
                    return {
                      name: "cta_call",
                      buttonParamsJson: JSON.stringify({
                        display_text: _0x57cf9e.text,
                        phone_number: _0x57cf9e.phone_number
                      })
                    };
                  case "copy_code":
                    return {
                      name: "cta_copy",
                      buttonParamsJson: JSON.stringify({
                        display_text: _0x57cf9e.text,
                        copy_code: _0x57cf9e.code
                      })
                    };
                  default:
                    return {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: _0x57cf9e.text,
                        id: _0x57cf9e.id || "btn_" + _0xedd4f8
                      })
                    };
                }
              })
            };
            if (_0x3db06d) {
              const {
                media: _0x29d2cb,
                mediaType: _0x43061b
              } = _0x3db06d;
              _0x43493c[_0x43061b] = _0x29d2cb[_0x43061b];
              delete _0x43493c.text;
              _0x43493c.caption = _0x3e6eef;
              _0x43493c.hasMediaAttachment = true;
            }
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, _0x43493c);
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          } else {
            _0xf66f9c = await _0x525cea.sendMessage(_0x325b37, {
              text: _0x3e6eef
            });
            _0xf66f9c = {
              success: true,
              messageId: _0xf66f9c.key.id,
              timestamp: _0xf66f9c.messageTimestamp
            };
          }
          break;
        case "carousel":
          {
            const _0x139942 = JSON.parse(_0x2d1b01.carousel_cards || "[]");
            const _0x37e7e0 = JSON.parse(_0x2d1b01.carousel_settings || "{\"title\": \"\", \"subtitle\": \"\", \"footer\": \"\"}");
            if (Array.isArray(_0x139942) && _0x139942.length >= 2) {
              _0xf66f9c = await this.sendCarouselMessage(_0x4adaa2, _0x325b37, {
                cards: _0x139942,
                text: _0x3e6eef || "",
                title: _0x37e7e0.title || "",
                subtitle: _0x37e7e0.subtitle || "",
                footer: _0x37e7e0.footer || ""
              });
            } else {
              const _0x4143e9 = await _0x525cea.sendMessage(_0x325b37, {
                text: _0x3e6eef
              });
              _0xf66f9c = {
                success: true,
                messageId: _0x4143e9.key.id,
                timestamp: _0x4143e9.messageTimestamp
              };
            }
            break;
          }
        default:
          _0xf66f9c = await this.sendTextMessage(_0x4adaa2, _0x325b37, _0x3e6eef);
      }
      return _0xf66f9c;
    } catch (_0x55ed14) {
      this.logger.error("❌❌❌ CRITICAL ERROR in sendTemplateMessage:", {
        sessionId: _0x4adaa2,
        to: _0x325b37,
        templateType: _0x2d1b01?.type,
        errorMessage: _0x55ed14.message,
        errorStack: _0x55ed14.stack
      });
      console.error("❌❌❌ FULL ERROR OBJECT:", _0x55ed14);
      return {
        success: false,
        error: _0x55ed14.message
      };
    }
  }
  getSessionStatus(_0x400977) {
    return this.sessionStates.get(_0x400977) || null;
  }
  getAllSessions() {
    return Array.from(this.sessionStates.values());
  }
  async disconnectSession(_0x23b644) {
    try {
      this.manualDisconnections.add(_0x23b644);
      if (this.deviceHealthService) {
        try {
          await this.deviceHealthService.recordDisconnect(_0x23b644, {
            reason: "user_initiated_disconnect",
            wasManual: true
          });
        } catch (_0x94b341) {
          this.logger.warn("Health record failed on manual disconnect: " + _0x94b341.message);
        }
      }
      const _0x263449 = this.sessions.get(_0x23b644);
      if (_0x263449) {
        try {
          await _0x263449.logout();
          this.logger.info("Session " + _0x23b644 + " logged out successfully");
        } catch (_0xa2c08a) {
          this.logger.warn("Logout error for session " + _0x23b644 + ":", _0xa2c08a.message);
        }
        this.sessions.delete(_0x23b644);
      }
      const _0x221a96 = this.sessionStates.get(_0x23b644);
      if (_0x221a96) {
        _0x221a96.status = "disconnected";
        _0x221a96.isLoggedIn = false;
        _0x221a96.qrCode = null;
      }
      this.stopPollVoteChecking();
      this.stopAutomaticPollScanning(_0x23b644);
      if (this.databaseService && this.databaseService.run) {
        await this.databaseService.run("\n          UPDATE whatsapp_sessions\n          SET status = 'disconnected',\n              qr_code = NULL,\n              disconnected_at = CURRENT_TIMESTAMP,\n              updated_at = CURRENT_TIMESTAMP\n          WHERE session_id = ? AND is_active = 1\n        ", [_0x23b644]);
      }
      this.emit("session_disconnected", {
        sessionId: _0x23b644,
        reason: "Manually disconnected by user",
        timestamp: new Date()
      });
      setTimeout(() => {
        this.manualDisconnections.delete(_0x23b644);
      }, 5000);
      return {
        success: true,
        message: "Session disconnected successfully"
      };
    } catch (_0x296de2) {
      this.logger.error("Error disconnecting session " + _0x23b644 + ":", _0x296de2);
      this.manualDisconnections.delete(_0x23b644);
      return {
        success: false,
        error: _0x296de2.message
      };
    }
  }
  async deleteSession(_0x19c3bc) {
    try {
      const _0x26ca95 = this.sessions.get(_0x19c3bc);
      if (_0x26ca95) {
        try {
          const _0x16ce03 = _0x26ca95.logout();
          const _0x491824 = new Promise((_0x4f0790, _0x315926) => setTimeout(() => _0x315926(new Error("Logout timeout")), 5000));
          await Promise.race([_0x16ce03, _0x491824]);
        } catch (_0x113a4e) {}
        this.sessions.delete(_0x19c3bc);
      }
      this.sessionStates.delete(_0x19c3bc);
      this.cleanupStore(_0x19c3bc);
      const _0x817ac6 = path.join(this.authDir, _0x19c3bc);
      if (fs.existsSync(_0x817ac6)) {
        fs.rmSync(_0x817ac6, {
          recursive: true,
          force: true
        });
      }
      try {
        const _0x35ad68 = require("../models/WhatsAppSession");
        const _0x3edbe5 = await _0x35ad68.findBySessionId(_0x19c3bc);
        if (_0x3edbe5) {
          await _0x3edbe5.delete();
        }
      } catch (_0x4ed4f3) {
        console.error("🗑️ DELETE ONLY: Error deleting session " + _0x19c3bc + " from database:", _0x4ed4f3);
      }
      this.emit("session_deleted", {
        sessionId: _0x19c3bc
      });
      return {
        success: true,
        message: "Session deleted successfully"
      };
    } catch (_0xb9a132) {
      this.logger.error("Error deleting session " + _0x19c3bc + ":", _0xb9a132);
      return {
        success: false,
        error: _0xb9a132.message
      };
    }
  }
  async checkNumberExists(_0x2428e1, _0x303e37) {
    try {
      const _0x239792 = await this.waitForReadySocket(_0x2428e1);
      if (!_0x239792) {
        throw new Error("Session not found");
      }
      let _cleanPhone = String(_0x303e37 || "").trim().replace(/[^\d]/g, "");
      if (_cleanPhone.startsWith("0")) _cleanPhone = _cleanPhone.substring(1);
      if (_cleanPhone.length === 10) _cleanPhone = "91" + _cleanPhone;
      const _0x4750dd = await _0x239792.onWhatsApp(_cleanPhone);
      return {
        success: true,
        exists: _0x4750dd && _0x4750dd.length > 0 && _0x4750dd[0]?.exists !== false,
        jid: _0x4750dd?.[0]?.jid
      };
    } catch (_0x4e4018) {
      this.logger.error("Error checking number " + _0x303e37 + ":", _0x4e4018);
      return {
        success: false,
        error: _0x4e4018.message
      };
    }
  }
  async verifyNumber(_0x2759eb) {
    try {
      const _0x240640 = Array.from(this.sessions.keys()).filter(_0xid => {
        const _0xst = this.sessionStates.get(_0xid);
        const _0xsk = this.sessions.get(_0xid);
        return (_0xst && _0xst.status === "connected" && _0xst.isLoggedIn) || (_0xsk && _0xsk.user && _0xsk.user.id);
      });
      if (_0x240640.length === 0) {
        throw new Error("No connected WhatsApp sessions available");
      }
      const _0x2d40ac = _0x240640[0];
      return await this.checkNumberExists(_0x2d40ac, _0x2759eb);
    } catch (_0x49f2a7) {
      this.logger.error("Error verifying number " + _0x2759eb + ":", _0x49f2a7);
      return {
        success: false,
        exists: false,
        error: _0x49f2a7.message
      };
    }
  }
  async verifyNumbersBatch(_0x1e1e3e, _0x465e2f = null) {
    try {
      this.logger.info("🔍 Total sessions: " + this.sessions.size + ", sessionStates: " + this.sessionStates.size);
      Array.from(this.sessions.keys()).forEach(_0x337dbc => {
        const _0x2c7542 = this.sessions.get(_0x337dbc);
        const _0x568d26 = this.sessionStates.get(_0x337dbc);
        this.logger.info("📱 Session " + _0x337dbc + ": state=" + _0x568d26?.status + ", loggedIn=" + _0x568d26?.isLoggedIn + ", hasUser=" + !!_0x2c7542?.user + ", wsState=" + _0x2c7542?.ws?.readyState);
      });
      const _0x295e94 = Array.from(this.sessions.keys()).filter(_0x10b3b1 => {
        const _0x4d325c = this.sessions.get(_0x10b3b1);
        const _0x3a748c = this.sessionStates.get(_0x10b3b1);
        if (!_0x4d325c || !_0x3a748c) {
          this.logger.info("❌ Session " + _0x10b3b1 + ": Missing session or state");
          return false;
        }
        if (_0x3a748c.status === "connected" && _0x3a748c.isLoggedIn) {
          this.logger.info("✅ Session " + _0x10b3b1 + ": Connected via sessionState");
          return true;
        }
        if (_0x4d325c.user && _0x4d325c.user.id) {
          this.logger.info("✅ Session " + _0x10b3b1 + ": Connected via user object");
          return true;
        }
        const _isBatchWsOpen = _0x4d325c.ws ? (_0x4d325c.ws.isOpen || _0x4d325c.ws.socket?.readyState === 1 || _0x4d325c.ws.readyState === 1) : false;
        if (_isBatchWsOpen) {
          this.logger.info("✅ Session " + _0x10b3b1 + ": Connected via WebSocket state");
          return true;
        }
        this.logger.info("❌ Session " + _0x10b3b1 + ": Not connected (status=" + _0x3a748c.status + ", loggedIn=" + _0x3a748c.isLoggedIn + ")");
        return false;
      });
      this.logger.info("🔍 Found " + _0x295e94.length + " connected sessions out of " + this.sessions.size + " total");
      if (_0x295e94.length === 0) {
        const _0x4a6c8d = Array.from(this.sessions.keys()).map(_0x2f4e27 => {
          const _0x2b8efe = this.sessionStates.get(_0x2f4e27);
          return _0x2f4e27 + ": " + (_0x2b8efe?.status || "unknown");
        }).join(", ");
        throw new Error("No connected WhatsApp sessions available. Session states: " + _0x4a6c8d + ". Please ensure WhatsApp is connected.");
      }
      const _0x3edb67 = _0x295e94[0];
      const _0x577318 = this.sessions.get(_0x3edb67);
      const _0x284058 = this.sessionStates.get(_0x3edb67);
      this.logger.info("🔍 Using session " + _0x3edb67 + " for verification (status: " + _0x284058.status + ", logged in: " + _0x284058.isLoggedIn + ")");
      if (!_0x577318) {
        throw new Error("Session not found");
      }
      const _0x3804b2 = [];
      const _0x3a461e = 25;
      const _0x4eaed9 = 10;
      const _0x37e366 = 1;
      for (let _0x5c9e49 = 0; _0x5c9e49 < _0x1e1e3e.length; _0x5c9e49 += _0x3a461e) {
        const _0x3b1304 = _0x1e1e3e.slice(_0x5c9e49, _0x5c9e49 + _0x3a461e);
        const _0x4b3c9b = _0x3b1304.map(async (_0x5993b0, _0x57410c) => {
          let _0x1aa028 = null;
          for (let _0x39156c = 0; _0x39156c <= _0x37e366; _0x39156c++) {
            try {
              let _cleanBatchPhone = String(_0x5993b0 || "").trim().replace(/[^\d]/g, "");
              if (_cleanBatchPhone.startsWith("0")) _cleanBatchPhone = _cleanBatchPhone.substring(1);
              if (_cleanBatchPhone.length === 10) _cleanBatchPhone = "91" + _cleanBatchPhone;
              const _0x1968c1 = await _0x577318.onWhatsApp(_cleanBatchPhone);
              const _0x2978f0 = {
                phoneNumber: _0x5993b0,
                success: true,
                exists: _0x1968c1 && _0x1968c1.length > 0 && _0x1968c1[0]?.exists !== false,
                jid: _0x1968c1?.[0]?.jid
              };
              if (_0x465e2f) {
                _0x465e2f(_0x5c9e49 + _0x57410c + 1, _0x1e1e3e.length);
              }
              return _0x2978f0;
            } catch (_0x2f1bf4) {
              _0x1aa028 = _0x2f1bf4;
              if (_0x39156c < _0x37e366) {
                await new Promise(_0x4f840f => setTimeout(_0x4f840f, 50));
                continue;
              }
              this.logger.warn("❌ Error verifying number " + _0x5993b0 + " after " + (_0x37e366 + 1) + " attempts: " + _0x2f1bf4.message);
              const _0x1d4980 = _0x2f1bf4.message.includes("rate") || _0x2f1bf4.message.includes("timeout") || _0x2f1bf4.message.includes("network") || _0x2f1bf4.message.includes("ECONNRESET");
              const _0x43ac96 = {
                phoneNumber: _0x5993b0,
                success: false,
                exists: false,
                error: _0x1d4980 ? "Temporary error - try again later" : _0x2f1bf4.message,
                isTemporaryError: _0x1d4980
              };
              if (_0x465e2f) {
                _0x465e2f(_0x5c9e49 + _0x57410c + 1, _0x1e1e3e.length);
              }
              return _0x43ac96;
            }
          }
        });
        const _0x3596f7 = await Promise.all(_0x4b3c9b);
        _0x3804b2.push(..._0x3596f7);
        if (_0x5c9e49 + _0x3a461e < _0x1e1e3e.length) {
          await new Promise(_0x4e4678 => setTimeout(_0x4e4678, _0x4eaed9));
        }
      }
      return _0x3804b2;
    } catch (_0x566086) {
      this.logger.error("Error in batch verification:", _0x566086);
      throw _0x566086;
    }
  }
  async fetchAllGroups(_0x28693a) {
    const _0x2858b6 = Date.now();
    try {
      if (!_0x28693a) {
        _0x28693a = Array.from(this.sessions.keys()).find(_0xid => {
          const _0xst = this.sessionStates.get(_0xid);
          const _0xsk = this.sessions.get(_0xid);
          return (_0xst && _0xst.status === "connected" && _0xst.isLoggedIn) || (_0xsk && _0xsk.user && _0xsk.user.id);
        }) || Array.from(this.sessions.keys())[0];
      }
      let _0x3c841b = this.sessions.get(_0x28693a);
      if (!_0x3c841b) {
        const _fallback = Array.from(this.sessions.keys()).find(_0xid => {
          const _0xst = this.sessionStates.get(_0xid);
          return _0xst && _0xst.status === "connected" && _0xst.isLoggedIn;
        });
        if (_fallback) {
          _0x28693a = _fallback;
          _0x3c841b = this.sessions.get(_0x28693a);
        }
      }
      if (!_0x3c841b) {
        this.logger.error("❌ Session " + _0x28693a + " not found in active sessions");
        throw new Error("No connected WhatsApp session found");
      }
      let _isGroupWsOpen = _0x3c841b.ws ? (_0x3c841b.ws.isOpen || _0x3c841b.ws.socket?.readyState === 1 || _0x3c841b.ws.readyState === 1) : false;
      if (!_isGroupWsOpen) {
        this.logger.warn("⚠️ Session " + _0x28693a + " WebSocket not open — waiting for socket to be ready");
        try {
          _0x3c841b = await this.waitForReadySocket(_0x28693a, 10000);
        } catch (_wErr) {
          throw new Error("WhatsApp connection is not ready for session " + _0x28693a + " — please try again in a few seconds");
        }
      }
      this.logger.info("🔄 Fetching all groups for session " + _0x28693a + " (user: " + _0x3c841b.user.id + ")");
      const _0x5e2c9a = _0x50566e => {
        const _0xabd194 = _0x3c841b.groupFetchAllParticipating();
        const _0x16621d = new Promise((_0x1c2f42, _0x22f9be) => setTimeout(() => _0x22f9be(new Error("Group fetch timeout after " + _0x50566e + "ms")), _0x50566e));
        return Promise.race([_0xabd194, _0x16621d]);
      };
      let _0x301065 = {};
      try {
        _0x301065 = (await _0x5e2c9a(45000)) || {};
      } catch (_0x20ff04) {
        this.logger.warn("⚠️ groupFetchAllParticipating failed (" + _0x20ff04.message + "); retrying once...");
        try {
          _0x301065 = (await _0x5e2c9a(60000)) || {};
        } catch (_0x36104f) {
          this.logger.warn("⚠️ groupFetchAllParticipating retry failed: " + _0x36104f.message + " – falling back to store (results may be incomplete)");
        }
      }
      this.logger.info("📊 groupFetchAllParticipating returned " + Object.keys(_0x301065).length + " groups");
      const _0x441a11 = this.stores.get(_0x28693a);
      if (_0x441a11 && _0x441a11.chats) {
        try {
          const _0x5419f2 = typeof _0x441a11.chats.all === "function" ? _0x441a11.chats.all() : _0x441a11.chats instanceof Map ? Array.from(_0x441a11.chats.values()) : Object.values(_0x441a11.chats);
          const _0x59884c = new Set(Object.keys(_0x301065));
          const _0x51f938 = _0x5419f2.map(_0x32a9f6 => _0x32a9f6.id).filter(_0x56b29c => _0x56b29c && _0x56b29c.endsWith("@g.us") && !_0x59884c.has(_0x56b29c));
          this.logger.info("🔍 Store has " + _0x5419f2.filter(_0x70dd32 => _0x70dd32.id?.endsWith("@g.us")).length + " group chats; " + _0x51f938.length + " not in groupFetchAllParticipating result");
          if (_0x51f938.length > 0) {
            const _0x4a9ad3 = 10;
            const _0x18de45 = 200;
            for (let _0xc9c525 = 0; _0xc9c525 < _0x51f938.length; _0xc9c525 += _0x4a9ad3) {
              const _0x3d1e79 = _0x51f938.slice(_0xc9c525, _0xc9c525 + _0x4a9ad3);
              await Promise.all(_0x3d1e79.map(async _0x5712d2 => {
                try {
                  const _0x2da024 = await _0x3c841b.groupMetadata(_0x5712d2);
                  if (_0x2da024 && _0x2da024.id) {
                    _0x301065[_0x2da024.id] = _0x2da024;
                  }
                } catch (_0x33e201) {
                  this.logger.warn("⚠️ Could not fetch metadata for store group " + _0x5712d2 + ": " + _0x33e201.message);
                }
              }));
              if (_0xc9c525 + _0x4a9ad3 < _0x51f938.length) {
                await new Promise(_0x5ebd1d => setTimeout(_0x5ebd1d, _0x18de45));
              }
            }
          }
        } catch (_0x563a50) {
          this.logger.warn("⚠️ Error reading store chats for group supplement: " + _0x563a50.message);
        }
      }
      const _0x563442 = Object.keys(_0x301065).length;
      this.logger.info("📊 Total groups after store supplement: " + _0x563442 + " for session " + _0x28693a);
      if (_0x563442 === 0) {
        this.logger.info("ℹ️ No groups found for session " + _0x28693a);
        return {
          success: true,
          groups: [],
          fetchTime: Date.now() - _0x2858b6
        };
      }
      const _0x6cf783 = [];
      try {
        for (const _0x2e6701 of Object.values(_0x301065)) {
          try {
            if (!_0x2e6701 || !_0x2e6701.id) {
              this.logger.warn("⚠️ Skipping invalid group object:", _0x2e6701);
              continue;
            }
            const _0x265367 = _0x3c841b.user?.id;
            let _0x3eedd9 = false;
            this.logger.info("🔍 Checking admin status for group: " + (_0x2e6701.subject || "Unnamed") + " (" + _0x2e6701.id + ")");
            this.logger.info("👤 Current user JID: " + _0x265367);
            if (_0x265367 && _0x2e6701.participants && Array.isArray(_0x2e6701.participants)) {
              const _0x125cee = _0x265367.replace("@s.whatsapp.net", "").replace("@c.us", "");
              const _0x259299 = [_0x265367, _0x125cee, _0x125cee + "@s.whatsapp.net", _0x125cee + "@c.us"];
              this.logger.info("🔍 Possible user JIDs: " + JSON.stringify(_0x259299));
              const _0x5567c3 = _0x2e6701.participants.filter(_0x289038 => _0x289038 && _0x289038.id).map(_0x19684e => ({
                id: _0x19684e.id,
                admin: _0x19684e.admin
              }));
              this.logger.info("👥 Group participants: " + JSON.stringify(_0x5567c3));
              const _0x14440e = _0x2e6701.participants.find(_0x6f5571 => {
                if (!_0x6f5571 || !_0x6f5571.id || typeof _0x6f5571.id !== "string") {
                  return false;
                }
                try {
                  const _0xb30ef9 = _0x6f5571.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
                  const _0x42a386 = _0x259299.some(_0x46b267 => {
                    if (!_0x46b267 || typeof _0x46b267 !== "string") {
                      return false;
                    }
                    const _0x1da266 = _0x46b267.replace("@s.whatsapp.net", "").replace("@c.us", "");
                    return _0xb30ef9 === _0x1da266 || _0x6f5571.id === _0x46b267;
                  });
                  if (_0x42a386) {
                    this.logger.info("✅ Found user in participants: " + _0x6f5571.id + " with admin status: " + _0x6f5571.admin);
                  }
                  return _0x42a386;
                } catch (_0x34995a) {
                  this.logger.warn("⚠️ Error processing participant " + _0x6f5571.id + ":", _0x34995a);
                  return false;
                }
              });
              if (_0x14440e) {
                _0x3eedd9 = _0x14440e.admin === "admin" || _0x14440e.admin === "superadmin" || _0x14440e.admin === true;
                this.logger.info("🎯 Final admin status for " + _0x2e6701.subject + ": " + _0x3eedd9 + " (admin field: " + _0x14440e.admin + ")");
              } else {
                this.logger.warn("❌ User not found in participants for group: " + _0x2e6701.subject);
              }
            }
            const _0x2f66bd = !!_0x2e6701.isCommunity;
            const _0x72bbee = !!_0x2e6701.isCommunityAnnounce;
            const _0x1bb138 = _0x2e6701.linkedParent || null;
            const _0x233684 = !!_0x1bb138;
            const _0x2f88b4 = _0x2f66bd || _0x72bbee;
            const _0x252aa4 = Array.isArray(_0x2e6701.participants) ? _0x2e6701.participants : [];
            _0x6cf783.push({
              id: _0x2e6701.id,
              subject: _0x2e6701.subject || "Unnamed Group",
              desc: _0x2e6701.desc || "",
              creation: _0x2e6701.creation || null,
              participants: _0x252aa4,
              isAdmin: _0x3eedd9,
              isCommunity: _0x2f88b4,
              isCommunityParent: _0x2f66bd,
              isCommunityAnnounce: _0x72bbee,
              belongsToCommunity: _0x233684,
              linkedParent: _0x1bb138,
              announce: _0x2e6701.announce || false,
              restrict: _0x2e6701.restrict || false,
              inviteCode: _0x2e6701.inviteCode || null,
              size: _0x2e6701.size || _0x252aa4.length
            });
          } catch (_0x5ee09b) {
            this.logger.error("❌ Error processing individual group " + (_0x2e6701?.id || "unknown") + ":", _0x5ee09b);
            console.error("❌ GroupService: Error processing group " + (_0x2e6701?.id || "unknown") + ":", _0x5ee09b.message);
          }
        }
      } catch (_0x5cd903) {
        this.logger.error("❌ Error processing groups data:", _0x5cd903);
        console.error("❌ GroupService: Error processing groups data:", _0x5cd903.message);
      }
      const _0x1ca1cf = _0x6cf783.filter(_0xc2b840 => !_0xc2b840.subject || _0xc2b840.subject === "Unnamed Group" || _0xc2b840.participants.length === 0);
      if (_0x1ca1cf.length > 0) {
        this.logger.info("🔄 Enriching " + _0x1ca1cf.length + " groups with missing metadata...");
        const _0x1c25c5 = 10;
        const _0x205f4b = 200;
        const _0x4d373f = 30000;
        const _0x5215e4 = Date.now();
        for (let _0x16527d = 0; _0x16527d < _0x1ca1cf.length; _0x16527d += _0x1c25c5) {
          if (Date.now() - _0x5215e4 > _0x4d373f) {
            this.logger.warn("⚠️ Enrichment timeout reached, " + (_0x1ca1cf.length - _0x16527d) + " groups remain unenriched");
            break;
          }
          const _0x285461 = _0x1ca1cf.slice(_0x16527d, _0x16527d + _0x1c25c5);
          await Promise.all(_0x285461.map(async _0xe108b2 => {
            try {
              let _0x46a4eb = this.getCachedGroupMetadata(_0x28693a, _0xe108b2.id);
              if (!_0x46a4eb) {
                _0x46a4eb = await _0x3c841b.groupMetadata(_0xe108b2.id);
                if (_0x46a4eb) {
                  this.setGroupMetadataCache(_0x28693a, _0xe108b2.id, _0x46a4eb);
                }
              }
              if (_0x46a4eb) {
                if (_0x46a4eb.subject) {
                  _0xe108b2.subject = _0x46a4eb.subject;
                }
                if (_0x46a4eb.desc) {
                  _0xe108b2.desc = _0x46a4eb.desc;
                }
                if (Array.isArray(_0x46a4eb.participants) && _0x46a4eb.participants.length > 0) {
                  _0xe108b2.participants = _0x46a4eb.participants;
                  _0xe108b2.size = _0x46a4eb.participants.length;
                }
              }
            } catch (_0x2ea834) {
              this.logger.warn("⚠️ Could not fetch metadata for group " + _0xe108b2.id + ": " + _0x2ea834.message);
            }
          }));
          if (_0x16527d + _0x1c25c5 < _0x1ca1cf.length) {
            await new Promise(_0x238c3f => setTimeout(_0x238c3f, _0x205f4b));
          }
        }
        this.logger.info("✅ Enrichment complete in " + (Date.now() - _0x5215e4) + "ms");
      }
      const _0x33c844 = Date.now() - _0x2858b6;
      this.logger.info("✅ Successfully fetched " + _0x6cf783.length + " groups for session " + _0x28693a + " in " + _0x33c844 + "ms");
      const _0x494968 = _0x6cf783.filter(_0x319d1b => !_0x319d1b.isCommunity).length;
      const _0x32dd2e = _0x6cf783.filter(_0x52073b => _0x52073b.isCommunity).length;
      const _0x443e3e = _0x6cf783.filter(_0x3f9972 => _0x3f9972.isAdmin).length;
      return {
        success: true,
        groups: _0x6cf783,
        fetchTime: _0x33c844,
        stats: {
          total: _0x6cf783.length,
          regular: _0x494968,
          communities: _0x32dd2e,
          admin: _0x443e3e
        }
      };
    } catch (_0x1747a5) {
      const _0x3b1987 = Date.now() - _0x2858b6;
      this.logger.error("❌ Error fetching groups for session " + _0x28693a + " after " + _0x3b1987 + "ms:", _0x1747a5);
      console.error("❌ GroupService: Error fetching groups for session " + _0x28693a + ":", _0x1747a5.message);
      return {
        success: false,
        error: _0x1747a5.message,
        fetchTime: _0x3b1987,
        groups: []
      };
    }
  }
  async getGroupMetadata(_0x18af32, _0x30f5be) {
    try {
      const _0x43ad56 = this.sessions.get(_0x18af32);
      if (!_0x43ad56) {
        throw new Error("Session not found");
      }
      this.logger.info("Fetching metadata for group " + _0x30f5be + " in session " + _0x18af32);
      const _0x2199d2 = await _0x43ad56.groupMetadata(_0x30f5be);
      if (!_0x2199d2) {
        throw new Error("Group metadata not found");
      }
      const _0x1438b2 = _0x43ad56.user?.id;
      const _0x59dd0e = _0x2199d2.participants?.some(_0x209fc2 => _0x209fc2.id === _0x1438b2 && (_0x209fc2.admin === "admin" || _0x209fc2.admin === "superadmin")) || false;
      const _0x2744c2 = _0x2199d2.participants?.map(_0x495acd => ({
        id: _0x495acd.id,
        admin: _0x495acd.admin === "admin",
        isSuperAdmin: _0x495acd.admin === "superadmin",
        name: _0x495acd.name || null
      })) || [];
      const _0x25be98 = {
        id: _0x2199d2.id,
        subject: _0x2199d2.subject,
        desc: _0x2199d2.desc,
        creation: _0x2199d2.creation,
        participants: _0x2744c2,
        isAdmin: _0x59dd0e,
        announce: _0x2199d2.announce || false,
        restrict: _0x2199d2.restrict || false,
        inviteCode: _0x2199d2.inviteCode || null,
        size: _0x2199d2.size || _0x2744c2.length
      };
      this.logger.info("Successfully fetched metadata for group " + _0x30f5be);
      return {
        success: true,
        metadata: _0x25be98
      };
    } catch (_0x516c60) {
      this.logger.error("Error fetching group metadata for " + _0x30f5be + ":", _0x516c60);
      return {
        success: false,
        error: _0x516c60.message
      };
    }
  }
  async getGroupInviteCode(_0x18d476, _0x200bfe) {
    try {
      const _0x48186f = this.sessions.get(_0x18d476);
      if (!_0x48186f) {
        throw new Error("Session not found");
      }
      this.logger.info("🔗 Getting invite code for group " + _0x200bfe + " in session " + _0x18d476);
      const _0x9930c4 = _0x48186f.user?.id;
      if (_0x9930c4) {
        try {
          const _0x4c0cbb = await _0x48186f.groupMetadata(_0x200bfe);
          const _0x2bf2c0 = _0x9930c4.replace("@s.whatsapp.net", "").replace("@c.us", "");
          const _0x3e9a1c = _0x4c0cbb.participants?.find(_0x28dd72 => {
            const _0x4471bf = _0x28dd72.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
            return _0x4471bf === _0x2bf2c0;
          });
          if (!_0x3e9a1c) {
            this.logger.warn("❌ User not found in group participants for " + _0x200bfe);
            throw new Error("You are not a member of this group");
          }
          const _0x42d6da = _0x3e9a1c.admin === "admin" || _0x3e9a1c.admin === "superadmin" || _0x3e9a1c.admin === true;
          if (!_0x42d6da) {
            this.logger.warn("❌ User is not admin in group " + _0x200bfe + ". Admin status: " + _0x3e9a1c.admin);
            throw new Error("You must be an admin to generate invite links for this group");
          }
          this.logger.info("✅ Admin verification passed for group " + _0x200bfe);
        } catch (_0x7a7e26) {
          this.logger.warn("⚠️ Could not verify admin status: " + _0x7a7e26.message);
        }
      }
      const _0x24cc1c = await _0x48186f.groupInviteCode(_0x200bfe);
      this.logger.info("✅ Successfully got invite code for group " + _0x200bfe + ": " + _0x24cc1c);
      return {
        success: true,
        inviteCode: _0x24cc1c,
        inviteLink: "https://chat.whatsapp.com/" + _0x24cc1c
      };
    } catch (_0xd977ae) {
      this.logger.error("❌ Error getting invite code for group " + _0x200bfe + ":", _0xd977ae);
      let _0x4a5fe2 = _0xd977ae.message;
      if (_0xd977ae.message.includes("not-admin") || _0xd977ae.message.includes("forbidden")) {
        _0x4a5fe2 = "You must be an admin to generate invite links for this group";
      } else if (_0xd977ae.message.includes("not-authorized")) {
        _0x4a5fe2 = "Not authorized to access this group";
      } else if (_0xd977ae.message.includes("group-not-found")) {
        _0x4a5fe2 = "Group not found";
      }
      return {
        success: false,
        error: _0x4a5fe2
      };
    }
  }
  async getGroupInfoByInviteCode(_0x4b6957, _0x102f4d) {
    try {
      const _0x2d5db6 = this.sessions.get(_0x4b6957);
      if (!_0x2d5db6) {
        throw new Error("Session not found");
      }
      const _0x515a67 = _0x102f4d.replace("https://chat.whatsapp.com/", "");
      this.logger.info("Getting group info for invite code " + _0x515a67 + " in session " + _0x4b6957);
      const _0x520ef6 = await _0x2d5db6.groupGetInviteInfo(_0x515a67);
      return {
        success: true,
        groupInfo: _0x520ef6
      };
    } catch (_0x2af0d7) {
      this.logger.error("Error getting group info for invite code " + _0x102f4d + ":", _0x2af0d7);
      return {
        success: false,
        error: _0x2af0d7.message
      };
    }
  }
  async getProfilePicture(_0x5ecbdf, _0x54a8ed) {
    try {
      const _0x1f5c96 = this.sessions.get(_0x5ecbdf);
      if (!_0x1f5c96) {
        return {
          success: false,
          error: "Session not found"
        };
      }
      const _0x1e35a7 = _0x54a8ed.includes("@") ? _0x54a8ed : _0x54a8ed + "@s.whatsapp.net";
      const _0x562895 = await _0x1f5c96.profilePictureUrl(_0x1e35a7, "image");
      return {
        success: true,
        url: _0x562895
      };
    } catch (_0x2cf627) {
      return {
        success: false,
        error: _0x2cf627.message
      };
    }
  }
  async getContactInfo(_0x36ce65, _0xe6a1bc) {
    try {
      const _0x3bb586 = this.sessions.get(_0x36ce65);
      if (!_0x3bb586) {
        throw new Error("Session not found");
      }
      const _0x1d63a7 = await _0x3bb586.getBusinessProfile(_0xe6a1bc);
      return {
        success: true,
        contact: _0x1d63a7
      };
    } catch (_0x2704e2) {
      this.logger.error("Error getting contact info for " + _0xe6a1bc + ":", _0x2704e2);
      return {
        success: false,
        error: _0x2704e2.message
      };
    }
  }
  getStore(_0x5e763f) {
    return this.stores.get(_0x5e763f);
  }
  async resolveLIDsBatch(_0x5d08ff, _0x2fa4ac) {
    try {
      if (!Array.isArray(_0x2fa4ac) || _0x2fa4ac.length === 0) {
        return [];
      }
      console.log("🔍 [LID Batch] Resolving " + _0x2fa4ac.length + " JIDs for session " + _0x5d08ff);
      this.logger.info("🔍 [LID Batch] Resolving " + _0x2fa4ac.length + " JIDs for session " + _0x5d08ff);
      const _0x57fe98 = this.stores.get(_0x5d08ff);
      console.log("📦 [LID Batch] Store available: " + !!_0x57fe98 + ", Contacts available: " + (!!_0x57fe98 && !!_0x57fe98.contacts));
      const _0x26a001 = [];
      let _0x31c6ef = 0;
      let _0x459e61 = 0;
      let _0x5bf511 = 0;
      let _0x83070c = 0;
      for (const _0x5025a9 of _0x2fa4ac) {
        if (!_0x5025a9 || typeof _0x5025a9 !== "string") {
          _0x26a001.push({
            jid: null,
            lid: null,
            phone: "N/A",
            name: null
          });
          continue;
        }
        if (_0x5025a9.endsWith("@lid")) {
          try {
            const _0x1b7525 = await this.databaseService.get("SELECT jid, contact_name FROM lid_mappings WHERE session_id = ? AND lid = ? AND jid != lid", [_0x5d08ff, _0x5025a9]);
            if (_0x1b7525 && _0x1b7525.jid && _0x1b7525.jid !== _0x5025a9) {
              const _0xb2c2c = _0x1b7525.jid.split("@")[0];
              _0x31c6ef++;
              _0x26a001.push({
                jid: _0x1b7525.jid,
                lid: _0x5025a9,
                phone: _0xb2c2c,
                name: _0x1b7525.contact_name,
                resolved: true,
                source: "db_cache"
              });
              continue;
            }
          } catch (_0x37ae47) {}
          if (_0x57fe98 && _0x57fe98.contacts && _0x57fe98.contacts[_0x5025a9]) {
            const _0x5261da = _0x57fe98.contacts[_0x5025a9];
            const _0x537836 = _0x5261da.id || _0x5025a9;
            const _0x424ef7 = _0x537836.split("@")[0];
            const _0x9eb420 = _0x5261da.notify || _0x5261da.name || _0x5261da.verifiedName || null;
            _0x459e61++;
            try {
              await this.databaseService.run("INSERT OR REPLACE INTO lid_mappings (session_id, lid, jid, contact_name, updated_at)\n                 VALUES (?, ?, ?, ?, datetime('now'))", [_0x5d08ff, _0x5025a9, _0x537836, _0x9eb420]);
            } catch (_0x3de25d) {}
            _0x26a001.push({
              jid: _0x537836,
              lid: _0x5025a9,
              phone: _0x424ef7,
              name: _0x9eb420,
              resolved: true,
              source: "baileys_store"
            });
            continue;
          }
          try {
            const _0x1fe412 = await this.databaseService.get("SELECT contact_jid, contact_name FROM chats\n               WHERE session_id = ? AND (contact_jid = ? OR contact_lid = ?)\n               AND contact_jid NOT LIKE '%@lid'\n               LIMIT 1", [_0x5d08ff, _0x5025a9, _0x5025a9]);
            if (_0x1fe412 && _0x1fe412.contact_jid && !_0x1fe412.contact_jid.endsWith("@lid")) {
              const _0xd459e6 = _0x1fe412.contact_jid.split("@")[0];
              _0x31c6ef++;
              try {
                await this.databaseService.run("INSERT OR REPLACE INTO lid_mappings (session_id, lid, jid, contact_name, updated_at)\n                   VALUES (?, ?, ?, ?, datetime('now'))", [_0x5d08ff, _0x5025a9, _0x1fe412.contact_jid, _0x1fe412.contact_name]);
              } catch (_0x55bfe8) {}
              _0x26a001.push({
                jid: _0x1fe412.contact_jid,
                lid: _0x5025a9,
                phone: _0xd459e6,
                name: _0x1fe412.contact_name,
                resolved: true,
                source: "chats_db"
              });
              continue;
            }
          } catch (_0x366ddd) {}
          _0x5bf511++;
          _0x26a001.push({
            jid: _0x5025a9,
            lid: _0x5025a9,
            phone: _0x5025a9.split("@")[0] + "@lid",
            name: null,
            resolved: false,
            source: "unresolved"
          });
        } else {
          _0x83070c++;
          const _0x3a0055 = _0x5025a9.split("@")[0];
          let _0x518b7e = null;
          if (_0x57fe98 && _0x57fe98.contacts && _0x57fe98.contacts[_0x5025a9]) {
            const _0x53466a = _0x57fe98.contacts[_0x5025a9];
            _0x518b7e = _0x53466a.notify || _0x53466a.name || _0x53466a.verifiedName || null;
          }
          _0x26a001.push({
            jid: _0x5025a9,
            lid: null,
            phone: _0x3a0055,
            name: _0x518b7e,
            resolved: true,
            source: "regular_jid"
          });
        }
      }
      console.log("✅ [LID Batch] Resolution complete: " + _0x31c6ef + " from DB cache, " + _0x459e61 + " from Baileys store, " + _0x5bf511 + " unresolved, " + _0x83070c + " regular JIDs");
      this.logger.info("✅ [LID Batch] Resolution complete: " + _0x31c6ef + " from DB cache, " + _0x459e61 + " from Baileys store, " + _0x5bf511 + " unresolved, " + _0x83070c + " regular JIDs");
      return _0x26a001;
    } catch (_0xc347d0) {
      this.logger.error("Error resolving LIDs in batch:", _0xc347d0);
      return _0x2fa4ac.map(_0x26c453 => ({
        jid: _0x26c453,
        lid: _0x26c453 && _0x26c453.endsWith("@lid") ? _0x26c453 : null,
        phone: _0x26c453 ? _0x26c453.split("@")[0] + (_0x26c453.endsWith("@lid") ? "@lid" : "") : "N/A",
        name: null,
        resolved: false
      }));
    }
  }
  async resolveLIDToPhone(_0x4b5890, _0x1169fd) {
    const _0x2c707c = require("fs");
    const _0x3f299f = this.lidLogFile;
    const _0x4fbd83 = _0x2850eb => {
      try {
        if (_0x3f299f) {
          _0x2c707c.appendFileSync(_0x3f299f, _0x2850eb + "\n");
        }
      } catch (_0x73818e) {}
    };
    try {
      if (_0x1169fd.endsWith("@lid")) {
        _0x4fbd83("\n[LID RESOLUTION] Attempting to resolve: " + _0x1169fd);
        try {
          const _0x17831f = await this.databaseService.get("SELECT jid, contact_name FROM lid_mappings WHERE session_id = ? AND lid = ? AND jid != lid", [_0x4b5890, _0x1169fd]);
          if (_0x17831f && _0x17831f.jid && _0x17831f.jid !== _0x1169fd) {
            const _0x3bad4f = _0x17831f.jid.split("@")[0];
            _0x4fbd83("[LID RESOLUTION] ✅ Found in DATABASE: " + _0x1169fd + " -> " + _0x17831f.jid + " (" + (_0x17831f.contact_name || "no name") + ")");
            return {
              jid: _0x17831f.jid,
              lid: _0x1169fd,
              phone: _0x3bad4f,
              name: _0x17831f.contact_name
            };
          } else if (_0x17831f && _0x17831f.jid === _0x1169fd) {
            _0x4fbd83("[LID RESOLUTION] ⚠️ Database has bad mapping (LID -> LID), ignoring");
          }
        } catch (_0xad637) {
          _0x4fbd83("[LID RESOLUTION] ⚠️ Database lookup failed: " + _0xad637.message);
        }
        const _0x28430a = this.stores.get(_0x4b5890);
        if (!_0x28430a) {
          _0x4fbd83("[LID RESOLUTION] ❌ No store found");
          return {
            jid: _0x1169fd,
            lid: _0x1169fd,
            phone: _0x1169fd.split("@")[0],
            name: null
          };
        }
        if (!_0x28430a.contacts) {
          _0x4fbd83("[LID RESOLUTION] ❌ No contacts in store");
          return {
            jid: _0x1169fd,
            lid: _0x1169fd,
            phone: _0x1169fd.split("@")[0],
            name: null
          };
        }
        const _0x266ebb = Object.keys(_0x28430a.contacts);
        _0x4fbd83("[LID RESOLUTION] Store has " + _0x266ebb.length + " contacts");
        if (_0x28430a.contacts[_0x1169fd]) {
          const _0xe306b2 = _0x28430a.contacts[_0x1169fd];
          _0x4fbd83("[LID RESOLUTION] ✅ Found in STORE: " + JSON.stringify(_0xe306b2));
          const _0x21f3ea = _0xe306b2.id || _0x1169fd;
          const _0x5da01e = _0x21f3ea.split("@")[0];
          const _0x49de0a = _0xe306b2.notify || _0xe306b2.name || _0xe306b2.verifiedName || null;
          _0x4fbd83("[LID RESOLUTION] ✅ Resolved " + _0x1169fd + " -> " + _0x21f3ea + " (phone: " + _0x5da01e + ", name: " + _0x49de0a + ")");
          try {
            await this.databaseService.run("INSERT OR REPLACE INTO lid_mappings (session_id, lid, jid, contact_name, updated_at)\n               VALUES (?, ?, ?, ?, datetime('now'))", [_0x4b5890, _0x1169fd, _0x21f3ea, _0x49de0a]);
          } catch (_0x16b9a4) {}
          return {
            jid: _0x21f3ea,
            lid: _0x1169fd,
            phone: _0x5da01e,
            name: _0x49de0a
          };
        }
        _0x4fbd83("[LID RESOLUTION] ❌ LID " + _0x1169fd + " NOT found anywhere");
        return {
          jid: _0x1169fd,
          lid: _0x1169fd,
          phone: _0x1169fd.split("@")[0],
          name: null
        };
      }
      const _0x4fa7c0 = _0x1169fd.split("@")[0];
      let _0x1d662e = null;
      if (store && store.contacts && store.contacts[_0x1169fd]) {
        const _0x115dee = store.contacts[_0x1169fd];
        _0x1d662e = _0x115dee.notify || _0x115dee.name || _0x115dee.verifiedName || null;
      }
      return {
        jid: _0x1169fd,
        lid: null,
        phone: _0x4fa7c0,
        name: _0x1d662e
      };
    } catch (_0x38ccb6) {
      this.logger.error("Error resolving LID " + _0x1169fd + ":", _0x38ccb6);
      return {
        jid: _0x1169fd,
        lid: _0x1169fd.endsWith("@lid") ? _0x1169fd : null,
        phone: _0x1169fd.split("@")[0],
        name: null
      };
    }
  }
  async getLabels(_0x4d8d93) {
    const _0x57f679 = require("fs");
    const _0x524144 = require("path");
    let _0x30051a;
    try {
      _0x30051a = require("electron").app.getPath("userData");
    } catch (_0x1d1be1) {
      _0x30051a = require("os").tmpdir();
    }
    const _0x4675e9 = _0x524144.join(_0x30051a, "labels-debug.log");
    const _0x418325 = _0x36a6ac => {
      try {
        const _0x4a5b17 = new Date().toISOString();
        const _0x79dbbd = "[" + _0x4a5b17 + "] " + _0x36a6ac + "\n";
        _0x57f679.appendFileSync(_0x4675e9, _0x79dbbd);
      } catch (_0x361a5f) {}
    };
    try {
      _0x418325("🏷️ [GET LABELS] Called for session: " + _0x4d8d93);
      const _0x2abff5 = this.stores.get(_0x4d8d93);
      if (!_0x2abff5) {
        _0x418325("❌ [GET LABELS] Store not found for session " + _0x4d8d93);
        this.logger.warn("Store not found for session " + _0x4d8d93);
        return {
          success: false,
          error: "Store not found for this session",
          labels: []
        };
      }
      _0x418325("✅ [GET LABELS] Store found for session " + _0x4d8d93);
      const _0x22d833 = this.sessions.get(_0x4d8d93);
      _0x418325("🔍 [GET LABELS] Socket exists: " + !!_0x22d833);
      _0x418325("🔍 [GET LABELS] Socket has resyncAppState: " + (!!_0x22d833 && !!_0x22d833.resyncAppState));
      if (_0x22d833 && _0x22d833.resyncAppState) {
        try {
          _0x418325("🔄 [GET LABELS] Triggering app state resync for labels...");
          await _0x22d833.resyncAppState(["critical_block", "critical_unblock_low", "regular_high", "regular_low", "regular"], false);
          _0x418325("✅ [GET LABELS] App state resync completed");
        } catch (_0xfb1a33) {
          _0x418325("⚠️ [GET LABELS] App state resync failed: " + _0xfb1a33.message);
          _0x418325("⚠️ [GET LABELS] Error stack: " + _0xfb1a33.stack);
        }
      } else {
        _0x418325("⚠️ [GET LABELS] Socket or resyncAppState not available");
      }
      const _0xa38716 = _0x2abff5.getLabels();
      _0x418325("🔍 [GET LABELS] Labels repo type: " + typeof _0xa38716);
      _0x418325("🔍 [GET LABELS] Labels repo count: " + (_0xa38716 ? _0xa38716.count() : 0));
      let _0x253833 = _0xa38716 ? _0xa38716.findAll() : [];
      _0x418325("📊 [GET LABELS] Retrieved " + _0x253833.length + " labels from repo");
      if (_0x253833.length === 0) {
        _0x418325("🔍 [GET LABELS] Attempting to extract labels from chats...");
        _0x418325("🔍 [GET LABELS] store.chats type: " + typeof _0x2abff5.chats);
        _0x418325("🔍 [GET LABELS] store.chats exists: " + !!_0x2abff5.chats);
        if (_0x2abff5.chats) {
          _0x418325("🔍 [GET LABELS] store.chats constructor: " + _0x2abff5.chats.constructor.name);
          _0x418325("🔍 [GET LABELS] store.chats has all(): " + (typeof _0x2abff5.chats.all === "function"));
          let _0x42c12c = [];
          if (typeof _0x2abff5.chats.all === "function") {
            _0x42c12c = _0x2abff5.chats.all();
          } else if (_0x2abff5.chats instanceof Map) {
            _0x42c12c = Array.from(_0x2abff5.chats.values());
          } else if (typeof _0x2abff5.chats === "object") {
            _0x42c12c = Object.values(_0x2abff5.chats);
          }
          _0x418325("🔍 [GET LABELS] Found " + _0x42c12c.length + " chats");
        } else {
          _0x418325("❌ [GET LABELS] store.chats is null or undefined");
        }
        const _0x47335b = _0x2abff5.chats ? typeof _0x2abff5.chats.all === "function" ? _0x2abff5.chats.all() : [] : [];
        _0x418325("🔍 [GET LABELS] Final chat count: " + _0x47335b.length);
        const _0x4e9fac = new Map();
        for (const _0x2bd3dd of _0x47335b) {
          if (_0x2bd3dd.labels && Array.isArray(_0x2bd3dd.labels) && _0x2bd3dd.labels.length > 0) {
            _0x418325("🔍 [GET LABELS] Chat " + _0x2bd3dd.id + " has labels: " + JSON.stringify(_0x2bd3dd.labels));
            for (const _0x4f1a06 of _0x2bd3dd.labels) {
              if (!_0x4e9fac.has(_0x4f1a06)) {
                _0x4e9fac.set(_0x4f1a06, {
                  id: _0x4f1a06,
                  name: "Label " + _0x4f1a06,
                  color: 0,
                  predefinedId: null
                });
              }
            }
          }
        }
        if (_0x4e9fac.size > 0) {
          _0x253833 = Array.from(_0x4e9fac.values());
          _0x418325("✅ [GET LABELS] Extracted " + _0x253833.length + " labels from chats");
        }
      }
      if (_0x253833.length > 0) {
        _0x418325("📋 [GET LABELS] Sample label: " + JSON.stringify(_0x253833[0]));
      } else {
        _0x418325("⚠️ [GET LABELS] No labels found in store");
        _0x418325("🔍 [GET LABELS] Store keys: " + Object.keys(_0x2abff5).join(", "));
        if (_0x2abff5.labels) {
          _0x418325("🔍 [GET LABELS] store.labels type: " + typeof _0x2abff5.labels);
          _0x418325("🔍 [GET LABELS] store.labels constructor: " + _0x2abff5.labels.constructor.name);
          if (typeof _0x2abff5.labels === "object") {
            const _0x5421f9 = Object.keys(_0x2abff5.labels);
            _0x418325("🔍 [GET LABELS] store.labels keys: " + _0x5421f9.join(", "));
            _0x418325("🔍 [GET LABELS] store.labels keys count: " + _0x5421f9.length);
            if (_0x2abff5.labels.entityMap) {
              _0x418325("🔍 [GET LABELS] entityMap type: " + typeof _0x2abff5.labels.entityMap);
              _0x418325("🔍 [GET LABELS] entityMap constructor: " + _0x2abff5.labels.entityMap.constructor.name);
              if (_0x2abff5.labels.entityMap instanceof Map) {
                _0x418325("🔍 [GET LABELS] entityMap is a Map with size: " + _0x2abff5.labels.entityMap.size);
                const _0x49b2cd = Array.from(_0x2abff5.labels.entityMap.entries());
                _0x418325("🔍 [GET LABELS] entityMap entries: " + JSON.stringify(_0x49b2cd));
              } else if (typeof _0x2abff5.labels.entityMap === "object") {
                const _0xa99069 = Object.keys(_0x2abff5.labels.entityMap);
                _0x418325("🔍 [GET LABELS] entityMap object keys: " + _0xa99069.join(", "));
                _0x418325("🔍 [GET LABELS] entityMap object: " + JSON.stringify(_0x2abff5.labels.entityMap));
              }
            }
            if (_0x2abff5.labels instanceof Map) {
              _0x418325("🔍 [GET LABELS] store.labels is a Map with size: " + _0x2abff5.labels.size);
              const _0x361871 = Array.from(_0x2abff5.labels.entries());
              _0x418325("🔍 [GET LABELS] Map entries: " + JSON.stringify(_0x361871));
            }
            if (typeof _0x2abff5.labels.all === "function") {
              const _0x44a640 = _0x2abff5.labels.all();
              _0x418325("🔍 [GET LABELS] store.labels.all() returned: " + JSON.stringify(_0x44a640));
            }
          }
        }
      }
      this.logger.info("✅ Retrieved " + _0x253833.length + " labels for session " + _0x4d8d93);
      return {
        success: true,
        labels: _0x253833
      };
    } catch (_0x3aa82e) {
      _0x418325("❌ [GET LABELS] Error for session " + _0x4d8d93 + ": " + _0x3aa82e.message);
      _0x418325("❌ [GET LABELS] Error stack: " + _0x3aa82e.stack);
      this.logger.error("Error getting labels for session " + _0x4d8d93 + ":", _0x3aa82e);
      return {
        success: false,
        error: _0x3aa82e.message,
        labels: []
      };
    }
  }
  async getChatsByLabel(_0x3b68a6, _0x26d8b0) {
    try {
      const _0x43af05 = this.stores.get(_0x3b68a6);
      if (!_0x43af05) {
        this.logger.warn("Store not found for session " + _0x3b68a6);
        return {
          success: false,
          error: "Store not found for this session"
        };
      }
      const _0x352ccd = _0x43af05.chats.all();
      const _0x18c05f = _0x43af05.getChatLabels ? _0x352ccd.map(_0x4c065a => ({
        chatId: _0x4c065a.id,
        labels: _0x43af05.getChatLabels(_0x4c065a.id)
      })).filter(_0x36fb61 => _0x36fb61.labels.some(_0x472f2b => _0x472f2b.labelId === _0x26d8b0)) : [];
      const _0x5f4d6d = _0x18c05f.map(_0x1cfd46 => _0x1cfd46.chatId);
      const _0x312fb8 = _0x352ccd.filter(_0x332ec0 => _0x5f4d6d.includes(_0x332ec0.id));
      const _0x18f753 = _0x312fb8.map(_0x1800c2 => {
        let _0x2d1c3f = _0x1800c2.id.replace("@s.whatsapp.net", "").replace("@c.us", "");
        let _0xd8b66f = _0x1800c2.name || _0x1800c2.notify || _0x2d1c3f;
        if (_0x43af05.contacts && _0x43af05.contacts[_0x1800c2.id]) {
          _0xd8b66f = _0x43af05.contacts[_0x1800c2.id].name || _0x43af05.contacts[_0x1800c2.id].notify || _0xd8b66f;
        }
        return {
          id: _0x1800c2.id,
          phoneNumber: _0x2d1c3f,
          name: _0xd8b66f,
          conversationTimestamp: _0x1800c2.conversationTimestamp,
          unreadCount: _0x1800c2.unreadCount || 0
        };
      });
      this.logger.info("✅ Retrieved " + _0x18f753.length + " contacts for label " + _0x26d8b0 + " in session " + _0x3b68a6);
      return {
        success: true,
        contacts: _0x18f753,
        count: _0x18f753.length
      };
    } catch (_0x26caf2) {
      this.logger.error("Error getting chats by label " + _0x26d8b0 + " for session " + _0x3b68a6 + ":", _0x26caf2);
      return {
        success: false,
        error: _0x26caf2.message
      };
    }
  }
  async createPairingCodeSession(_0x13dcd9) {
    let _0x518018 = null;
    try {
      const _0x1c7060 = _0x13dcd9.replace(/[^0-9]/g, "");
      if (!_0x1c7060 || _0x1c7060.length < 7 || _0x1c7060.length > 15) {
        throw new Error("Invalid phone number. Please include the country code without + (e.g. 917261902348).");
      }
      this.logger.info("🔢 Starting pairing code session for: " + _0x1c7060);
      _0x518018 = "pairing_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const _0x428b16 = path.join(this.authDir, _0x518018);
      fs.mkdirSync(_0x428b16, {
        recursive: true
      });
      const {
        state: _0x1e3711,
        saveCreds: _0xef0d34
      } = await useMultiFileAuthState(_0x428b16);
      const _0x1fc873 = this.initializeStore(_0x518018);
      if (this._versionInitPromise) {
        await this._versionInitPromise;
        this._versionInitPromise = null;
      }
      const _0x170f7a = {
        creds: _0x1e3711.creds,
        keys: makeCacheableSignalKeyStore(_0x1e3711.keys, this.logger)
      };
      const _0x466892 = makeWASocket(this.getOptimalSocketConfig(_0x518018, _0x170f7a));
      _0x1fc873.bind(_0x466892.ev);
      this.sessions.set(_0x518018, _0x466892);
      this.sessionStates.set(_0x518018, {
        id: _0x518018,
        status: "connecting",
        qrCode: null,
        lastSeen: new Date(),
        phoneNumber: null,
        profilePicture: null,
        isLoggedIn: false,
        usingPairingCode: true,
        pairingPhoneNumber: _0x1c7060
      });
      _0x466892.ev.on("creds.update", _0xef0d34);
      _0x466892.ev.on("messages.upsert", async _0x390df1 => {
        await this.handleIncomingMessages(_0x518018, _0x390df1);
      });
      _0x466892.ev.on("messages.update", async _0x4b8648 => {
        await this.handleMessageUpdates(_0x518018, _0x4b8648);
      });
      _0x466892.ev.on("contacts.update", async _0x4a6362 => {
        await this.handleContactsUpdate(_0x518018, _0x4a6362);
      });
      const _0x28f96a = await new Promise((_0x120933, _0x195eba) => {
        const _0xb663c2 = setTimeout(() => {
          _0x195eba(new Error("Timeout: WhatsApp did not respond within 60 seconds. Check your internet connection."));
        }, 60000);
        let _0x5e3d21 = false;
        const _0x13c484 = async _0x138631 => {
          const {
            connection: _0x57468a,
            lastDisconnect: _0x346340,
            qr: _0x5b0d5d
          } = _0x138631;
          if (_0x5b0d5d && !_0x5e3d21 && !_0x466892.authState.creds.registered) {
            _0x5e3d21 = true;
            try {
              const {
                randomBytes: _0x4dcd97
              } = require("crypto");
              const _0x25387e = bytesToCrockford(_0x4dcd97(5));
              this.logger.info("🔢 WebSocket ready (QR signal). Calling requestPairingCode(\"" + _0x1c7060 + "\", \"" + _0x25387e + "\")");
              const _0x17da42 = await _0x466892.requestPairingCode(_0x1c7060, _0x25387e);
              clearTimeout(_0xb663c2);
              _0x466892.ev.off("connection.update", _0x13c484);
              _0x466892.ev.on("connection.update", async _0x44773b => {
                await this.handleConnectionUpdate(_0x518018, _0x44773b, _0x466892);
              });
              _0x120933(_0x17da42);
            } catch (_0x62c02d) {
              clearTimeout(_0xb663c2);
              _0x466892.ev.off("connection.update", _0x13c484);
              _0x195eba(_0x62c02d);
            }
            return;
          }
          if (_0x57468a === "close" && !_0x5e3d21) {
            clearTimeout(_0xb663c2);
            _0x466892.ev.off("connection.update", _0x13c484);
            const _0x342d04 = _0x346340?.error?.message || "Connection Closed";
            _0x195eba(new Error(_0x342d04));
            return;
          }
          if (_0x57468a && _0x57468a !== "close") {
            await this.handleConnectionUpdate(_0x518018, _0x138631, _0x466892);
          }
        };
        _0x466892.ev.on("connection.update", _0x13c484);
      });
      if (!_0x28f96a) {
        throw new Error("requestPairingCode returned an empty code. Check the phone number and try again.");
      }
      this.logger.info("🔢 ✅ Pairing code for " + _0x1c7060 + ": " + _0x28f96a);
      if (this.databaseService && this.databaseService.run) {
        await this.databaseService.run("\n          INSERT INTO whatsapp_sessions (session_id, name, device_name, status, phone_number, created_at, updated_at)\n          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n        ", [_0x518018, "Device " + _0x1c7060, "WhatsApp Device", "pairing_code_ready", _0x1c7060]);
      }
      return {
        success: true,
        code: _0x28f96a,
        phoneNumber: _0x1c7060,
        sessionId: _0x518018
      };
    } catch (_0x19de43) {
      this.logger.error("🔢 createPairingCodeSession failed:", _0x19de43);
      if (_0x19de43 instanceof AntiFlagConfigError && _0x518018) {
        this.stores.delete(_0x518018);
        this.sessions.delete(_0x518018);
        this.sessionStates.delete(_0x518018);
      }
      throw _0x19de43;
    }
  }
  setupPairingConnectionMonitoring(_0x555564, _0x2b7ac0) {
    this.logger.info("🔢 Setting up enhanced connection monitoring for pairing session: " + _0x2b7ac0);
    const _0x24c6ca = _0x1a9816 => {
      if (_0x1a9816.connection === "open") {
        this.logger.info("🔢 ✅ PAIRING SUCCESSFUL! Session " + _0x2b7ac0 + " is now connected");
        this.emit("pairing_success", {
          sessionId: _0x2b7ac0,
          timestamp: new Date()
        });
      }
    };
    const _0x110b9e = _0x41f3fe => {
      this.logger.warn("🔢 ⚠️ Pairing connection error for " + _0x2b7ac0 + ":", _0x41f3fe.message);
      if (_0x41f3fe.message.includes("503")) {
        this.logger.warn("🔢 503 Service Unavailable - WhatsApp servers may be busy");
        this.emit("pairing_error", {
          sessionId: _0x2b7ac0,
          error: "WhatsApp servers are temporarily unavailable. Please try again in a few minutes.",
          code: "503",
          timestamp: new Date()
        });
      } else if (_0x41f3fe.message.includes("Stream Errored")) {
        this.logger.warn("🔢 Stream error - Connection interrupted during pairing");
        this.emit("pairing_error", {
          sessionId: _0x2b7ac0,
          error: "Connection was interrupted. Please try generating a new pairing code.",
          code: "STREAM_ERROR",
          timestamp: new Date()
        });
      }
    };
    _0x555564.ev.on("connection.update", _0x24c6ca);
    _0x555564.ev.on("connection.error", _0x110b9e);
    setTimeout(() => {
      _0x555564.ev.off("connection.update", _0x24c6ca);
      _0x555564.ev.off("connection.error", _0x110b9e);
      this.logger.info("🔢 Cleaned up pairing monitoring for session: " + _0x2b7ac0);
    }, 300000);
  }
  async requestPairingCode(_0x320bb8, _0x57d375) {
    try {
      const _0x3cd72d = this.sessions.get(_0x320bb8);
      if (!_0x3cd72d) {
        throw new Error("Session not found or not connected");
      }
      const _0x2b2eb8 = _0x57d375.replace(/[^0-9]/g, "");
      if (!_0x2b2eb8 || _0x2b2eb8.length < 10) {
        throw new Error("Invalid phone number format");
      }
      this.logger.info("Requesting pairing code for " + _0x2b2eb8 + " on session " + _0x320bb8);
      if (_0x3cd72d.authState.creds.registered) {
        throw new Error("Device is already registered. Please disconnect and create a new session for pairing code authentication.");
      }
      const _0x25ec4f = this.sessionStates.get(_0x320bb8);
      if (_0x25ec4f) {
        _0x25ec4f.usingPairingCode = true;
        _0x25ec4f.pairingPhoneNumber = _0x2b2eb8;
        this.sessionStates.set(_0x320bb8, _0x25ec4f);
      }
      const _0x588ffa = await _0x3cd72d.requestPairingCode(_0x2b2eb8);
      this.logger.info("Pairing code generated for " + _0x2b2eb8 + ": " + _0x588ffa);
      return {
        success: true,
        code: _0x588ffa,
        phoneNumber: _0x2b2eb8,
        sessionId: _0x320bb8
      };
    } catch (_0x5cd19b) {
      this.logger.error("Error requesting pairing code for " + _0x57d375 + ":", _0x5cd19b);
      return {
        success: false,
        error: _0x5cd19b.message,
        phoneNumber: _0x57d375,
        sessionId: _0x320bb8
      };
    }
  }
  async forceReconnectSession(_0x4efde4) {
    try {
      this.logger.info("🔄 Force reconnecting session " + _0x4efde4 + "...");
      this.manualDisconnections.add(_0x4efde4);
      const _0x1b0b89 = this.sessions.get(_0x4efde4);
      if (_0x1b0b89) {
        try {
          await _0x1b0b89.end();
        } catch (_0x4b4e61) {}
        this.sessions.delete(_0x4efde4);
      }
      this.sessionStates.delete(_0x4efde4);
      this.manualDisconnections.delete(_0x4efde4);
      const _0x12c875 = path.join(this.authDir, _0x4efde4);
      if (fs.existsSync(_0x12c875)) {
        const _0x23a776 = fs.readdirSync(_0x12c875);
        for (const _0x3e043a of _0x23a776) {
          try {
            fs.unlinkSync(path.join(_0x12c875, _0x3e043a));
            this.logger.info("Cleared auth file: " + _0x3e043a);
          } catch (_0x5cbb75) {
            this.logger.warn("Could not delete auth file " + _0x3e043a + ": " + _0x5cbb75.message);
          }
        }
      }
      return await this.createSession(_0x4efde4);
    } catch (_0x38703a) {
      this.logger.error("Error force reconnecting session " + _0x4efde4 + ":", _0x38703a);
      return {
        success: false,
        message: _0x38703a.message
      };
    }
  }
  async restartSession(_0x123380) {
    try {
      const _0x5776cd = path.join(this.authDir, _0x123380);
      if (!fs.existsSync(_0x5776cd)) {
        fs.mkdirSync(_0x5776cd, {
          recursive: true
        });
      }
      const {
        state: _0x471c9f,
        saveCreds: _0xaa803f
      } = await this.safeFileOperation("restart-" + _0x123380, () => useMultiFileAuthState(_0x5776cd));
      if (this._versionInitPromise) {
        await this._versionInitPromise;
        this._versionInitPromise = null;
      }
      const _0x145a0d = {
        creds: _0x471c9f.creds,
        keys: makeCacheableSignalKeyStore(_0x471c9f.keys, this.logger)
      };
      const _0x515234 = makeWASocket(this.getOptimalSocketConfig(_0x123380, _0x145a0d));
      this.sessions.set(_0x123380, _0x515234);
      const _0x15f09b = this.stores.get(_0x123380);
      if (_0x15f09b) {
        _0x15f09b.bind(_0x515234.ev);
      }
      const _0x28c9f9 = this.sessionStates.get(_0x123380) || {};
      _0x28c9f9.status = "connecting";
      this.sessionStates.set(_0x123380, _0x28c9f9);
      _0x515234.ev.on("connection.update", async _0x282395 => {
        await this.handleConnectionUpdate(_0x123380, _0x282395, _0x515234);
      });
      _0x515234.ev.on("creds.update", _0xaa803f);
      _0x515234.ev.on("messages.upsert", async _0xf909f6 => {
        await this.handleIncomingMessages(_0x123380, _0xf909f6);
      });
      _0x515234.ev.on("messages.update", async _0x27dda4 => {
        await this.handleMessageUpdates(_0x123380, _0x27dda4);
      });
      _0x515234.ev.on("contacts.update", async _0xb8fe26 => {
        await this.handleContactsUpdate(_0x123380, _0xb8fe26);
      });
      _0x515234.ev.on("call", async _0x757884 => {
        await this.handleCalls(_0x123380, _0x757884);
      });
      _0x515234.ev.on("presence.update", async _0x5a3f30 => {
        await this.handlePresenceUpdate(_0x123380, _0x5a3f30);
      });
      this.logger.info("Session " + _0x123380 + " restarted successfully");
      return {
        success: true,
        message: "Session restarted successfully"
      };
    } catch (_0x29915a) {
      this.logger.error("Error restarting session " + _0x123380 + ":", _0x29915a);
      if (_0x29915a instanceof AntiFlagConfigError) {
        return {
          success: false,
          message: _0x29915a.message,
          failedAntiFlagSetting: _0x29915a.setting
        };
      }
      return {
        success: false,
        message: _0x29915a.message
      };
    }
  }
  async createGroup(_0x16b422, _0x403350, _0x3b45a6, _0x47d49d = "") {
    try {
      const _0x40ca0a = this.sessions.get(_0x16b422);
      if (!_0x40ca0a) {
        throw new Error("Session not found");
      }
      this.logger.info("Creating group \"" + _0x403350 + "\" with " + _0x3b45a6.length + " participants");
      const _0x2425be = _0x3b45a6.map(_0x165b4b => {
        if (_0x165b4b.includes("@")) {
          return _0x165b4b;
        }
        return _0x165b4b + "@s.whatsapp.net";
      });
      const _0x2c0312 = await _0x40ca0a.groupCreate(_0x403350, _0x2425be);
      this.logger.info("Group created successfully: " + _0x2c0312.id);
      if (_0x47d49d && _0x47d49d.trim()) {
        try {
          await _0x40ca0a.groupUpdateDescription(_0x2c0312.id, _0x47d49d);
          this.logger.info("Description set for group " + _0x2c0312.id);
        } catch (_0x20b027) {
          this.logger.warn("Failed to set description: " + _0x20b027.message);
        }
      }
      let _0x29f934 = null;
      try {
        _0x29f934 = await _0x40ca0a.groupInviteCode(_0x2c0312.id);
      } catch (_0x567a33) {
        this.logger.warn("Failed to get invite code: " + _0x567a33.message);
      }
      return {
        success: true,
        groupId: _0x2c0312.id,
        groupJid: _0x2c0312.id,
        participants: _0x2c0312.participants,
        inviteCode: _0x29f934,
        inviteLink: _0x29f934 ? "https://chat.whatsapp.com/" + _0x29f934 : null
      };
    } catch (_0x25b57e) {
      this.logger.error("Error creating group:", _0x25b57e);
      return {
        success: false,
        error: _0x25b57e.message
      };
    }
  }
  async addGroupParticipants(_0x56be54, _0x8a3239, _0x516089) {
    try {
      const _0x5eb915 = this.sessions.get(_0x56be54);
      if (!_0x5eb915) {
        throw new Error("Session not found");
      }
      this.logger.info("Adding " + _0x516089.length + " participants to group " + _0x8a3239);
      const _0x381173 = [];
      const _0x5ccca2 = [];
      for (const _0x5b28c2 of _0x516089) {
        const _0x16ce0d = await this.validateParticipantForGroup(_0x56be54, _0x5b28c2);
        _0x381173.push(_0x16ce0d);
        if (_0x16ce0d.isValid) {
          _0x5ccca2.push(_0x16ce0d.formattedJid);
        }
      }
      this.logger.info("Validation complete: " + _0x5ccca2.length + "/" + _0x516089.length + " participants valid");
      if (_0x5ccca2.length === 0) {
        return {
          success: false,
          error: "No valid participants to add",
          validationResults: _0x381173
        };
      }
      const _0x2f27a8 = await _0x5eb915.groupParticipantsUpdate(_0x8a3239, _0x5ccca2, "add");
      this.logger.info("Participants addition result:", _0x2f27a8);
      return {
        success: true,
        results: _0x2f27a8,
        validationResults: _0x381173,
        addedCount: _0x5ccca2.length,
        totalRequested: _0x516089.length
      };
    } catch (_0x38c418) {
      this.logger.error("Error adding participants to group:", _0x38c418);
      return {
        success: false,
        error: _0x38c418.message
      };
    }
  }
  async validateParticipantForGroup(_0x17cde8, _0x597985) {
    try {
      let _0x1d41d8 = _0x597985.toString().trim();
      if (_0x1d41d8.startsWith("+")) {
        _0x1d41d8 = _0x1d41d8.substring(1);
      }
      const _0x11fc5a = _0x1d41d8.replace(/[^0-9]/g, "");
      this.logger.info("🔍 [validateParticipantForGroup] Validating: " + _0x597985 + " -> cleaned: " + _0x1d41d8 + " -> digits: " + _0x11fc5a);
      if (_0x11fc5a.length < 10 || _0x11fc5a.length > 15) {
        this.logger.warn("❌ [validateParticipantForGroup] Invalid length: " + _0x11fc5a.length + " digits");
        return {
          isValid: false,
          phone: _0x597985,
          formattedJid: "",
          error: "Invalid phone number length: " + _0x11fc5a.length + " digits (need 10-15)"
        };
      }
      let _0x4bc8b2 = "Unknown";
      if (_0x11fc5a.startsWith("91") && _0x11fc5a.length === 12) {
        _0x4bc8b2 = "India";
        const _0x5c5f54 = _0x11fc5a.substring(2);
        if (!/^[6-9]\d{9}$/.test(_0x5c5f54)) {
          this.logger.warn("❌ [validateParticipantForGroup] Invalid Indian mobile format: " + _0x5c5f54);
          return {
            isValid: false,
            phone: _0x597985,
            formattedJid: "",
            error: "Invalid Indian mobile number format"
          };
        }
      } else if (_0x11fc5a.startsWith("1") && _0x11fc5a.length === 11) {
        _0x4bc8b2 = "US/Canada";
      } else if (_0x11fc5a.startsWith("44")) {
        _0x4bc8b2 = "UK";
      } else if (_0x11fc5a.startsWith("33")) {
        _0x4bc8b2 = "France";
      } else if (_0x11fc5a.startsWith("49")) {
        _0x4bc8b2 = "Germany";
      } else if (_0x11fc5a.startsWith("86")) {
        _0x4bc8b2 = "China";
      } else if (_0x11fc5a.startsWith("81")) {
        _0x4bc8b2 = "Japan";
      } else if (_0x11fc5a.startsWith("55")) {
        _0x4bc8b2 = "Brazil";
      } else if (_0x11fc5a.startsWith("7")) {
        _0x4bc8b2 = "Russia/Kazakhstan";
      } else if (_0x11fc5a.length >= 10) {
        _0x4bc8b2 = "International";
      }
      this.logger.info("🌍 [validateParticipantForGroup] " + _0x4bc8b2 + " number detected: " + _0x11fc5a);
      this.logger.info("✅ [validateParticipantForGroup] Global number format validation passed");
      const _0x41d5b5 = _0x11fc5a.includes("@") ? _0x11fc5a : _0x11fc5a + "@s.whatsapp.net";
      this.logger.info("📧 [validateParticipantForGroup] Formatted JID: " + _0x41d5b5);
      try {
        this.logger.info("🔄 [validateParticipantForGroup] Checking WhatsApp registration for: " + _0x11fc5a);
        const _0x17422d = await this.checkNumberExists(_0x17cde8, _0x11fc5a);
        this.logger.info("📊 [validateParticipantForGroup] WhatsApp check result:", _0x17422d);
        if (!_0x17422d.success) {
          this.logger.warn("❌ [validateParticipantForGroup] WhatsApp check failed: " + _0x17422d.error);
          return {
            isValid: false,
            phone: _0x597985,
            formattedJid: _0x41d5b5,
            error: "WhatsApp verification failed: " + _0x17422d.error,
            whatsappExists: false
          };
        }
        if (!_0x17422d.exists) {
          this.logger.warn("❌ [validateParticipantForGroup] Number not registered on WhatsApp: " + _0x11fc5a);
          return {
            isValid: false,
            phone: _0x597985,
            formattedJid: _0x41d5b5,
            error: "Number is not registered on WhatsApp",
            whatsappExists: false
          };
        }
        this.logger.info("✅ [validateParticipantForGroup] Validation completed successfully: " + _0x597985 + " -> " + _0x41d5b5);
        return {
          isValid: true,
          phone: _0x597985,
          formattedJid: _0x41d5b5,
          whatsappExists: true
        };
      } catch (_0x1f52ef) {
        this.logger.warn("⚠️ [validateParticipantForGroup] WhatsApp check failed for " + _0x597985 + ":", _0x1f52ef.message);
        this.logger.info("⚠️ [validateParticipantForGroup] Proceeding without WhatsApp verification for: " + _0x597985);
        return {
          isValid: true,
          phone: _0x597985,
          formattedJid: _0x41d5b5,
          error: "Warning: Could not verify on WhatsApp (" + _0x1f52ef.message + ")",
          whatsappExists: null
        };
      }
    } catch (_0x59437f) {
      this.logger.error("❌ [validateParticipantForGroup] Error validating participant " + _0x597985 + ":", _0x59437f);
      return {
        isValid: false,
        phone: _0x597985,
        formattedJid: "",
        error: "Validation error: " + _0x59437f.message
      };
    }
  }
  async removeGroupParticipants(_0x1612bc, _0x490f38, _0x4d5d47) {
    try {
      const _0xeca2eb = this.sessions.get(_0x1612bc);
      if (!_0xeca2eb) {
        throw new Error("Session not found");
      }
      this.logger.info("Removing " + _0x4d5d47.length + " participants from group " + _0x490f38);
      const _0x414dc4 = _0x4d5d47.map(_0x28314a => {
        if (_0x28314a.includes("@")) {
          return _0x28314a;
        }
        return _0x28314a + "@s.whatsapp.net";
      });
      const _0x40dcf6 = await _0xeca2eb.groupParticipantsUpdate(_0x490f38, _0x414dc4, "remove");
      this.logger.info("Participants removal result:", _0x40dcf6);
      return {
        success: true,
        results: _0x40dcf6
      };
    } catch (_0x229a26) {
      this.logger.error("Error removing participants from group:", _0x229a26);
      return {
        success: false,
        error: _0x229a26.message
      };
    }
  }
  async promoteGroupParticipants(_0x37d9ee, _0x306a14, _0x1be9c3) {
    try {
      const _0x5d4808 = this.sessions.get(_0x37d9ee);
      if (!_0x5d4808) {
        throw new Error("Session not found");
      }
      this.logger.info("Promoting " + _0x1be9c3.length + " participants to admin in group " + _0x306a14);
      const _0x24cb61 = _0x1be9c3.map(_0xec4393 => {
        if (_0xec4393.includes("@")) {
          return _0xec4393;
        }
        return _0xec4393 + "@s.whatsapp.net";
      });
      const _0x1e5f95 = await _0x5d4808.groupParticipantsUpdate(_0x306a14, _0x24cb61, "promote");
      this.logger.info("Participants promotion result:", _0x1e5f95);
      return {
        success: true,
        results: _0x1e5f95
      };
    } catch (_0x9690d2) {
      this.logger.error("Error promoting participants in group:", _0x9690d2);
      return {
        success: false,
        error: _0x9690d2.message
      };
    }
  }
  async demoteGroupParticipants(_0x4004a5, _0x5c91f7, _0xcd5381) {
    try {
      const _0x47b212 = this.sessions.get(_0x4004a5);
      if (!_0x47b212) {
        throw new Error("Session not found");
      }
      this.logger.info("Demoting " + _0xcd5381.length + " participants from admin in group " + _0x5c91f7);
      const _0x23d251 = _0xcd5381.map(_0x15b60 => {
        if (_0x15b60.includes("@")) {
          return _0x15b60;
        }
        return _0x15b60 + "@s.whatsapp.net";
      });
      const _0x2a4db5 = await _0x47b212.groupParticipantsUpdate(_0x5c91f7, _0x23d251, "demote");
      this.logger.info("Participants demotion result:", _0x2a4db5);
      return {
        success: true,
        results: _0x2a4db5
      };
    } catch (_0x4e1ba1) {
      this.logger.error("Error demoting participants in group:", _0x4e1ba1);
      return {
        success: false,
        error: _0x4e1ba1.message
      };
    }
  }
  async updateGroupSubject(_0x1c6b9b, _0x3180f0, _0x1bc966) {
    try {
      const _0x4cb3cf = this.sessions.get(_0x1c6b9b);
      if (!_0x4cb3cf) {
        throw new Error("Session not found");
      }
      this.logger.info("Updating group subject to \"" + _0x1bc966 + "\" for group " + _0x3180f0);
      await _0x4cb3cf.groupUpdateSubject(_0x3180f0, _0x1bc966);
      this.logger.info("Group subject updated successfully");
      return {
        success: true
      };
    } catch (_0x30c4c2) {
      this.logger.error("Error updating group subject:", _0x30c4c2);
      return {
        success: false,
        error: _0x30c4c2.message
      };
    }
  }
  async updateGroupDescription(_0x62d19d, _0x1feedd, _0x1b0007) {
    try {
      const _0x3a599c = this.sessions.get(_0x62d19d);
      if (!_0x3a599c) {
        throw new Error("Session not found");
      }
      this.logger.info("Updating group description for group " + _0x1feedd);
      await _0x3a599c.groupUpdateDescription(_0x1feedd, _0x1b0007);
      this.logger.info("Group description updated successfully");
      return {
        success: true
      };
    } catch (_0x1ab419) {
      this.logger.error("Error updating group description:", _0x1ab419);
      return {
        success: false,
        error: _0x1ab419.message
      };
    }
  }
  async updateGroupSettings(_0x1386df, _0x175fb3, _0xe69ac) {
    try {
      const _0x5e5a68 = this.sessions.get(_0x1386df);
      if (!_0x5e5a68) {
        throw new Error("Session not found");
      }
      this.logger.info("Updating group setting to \"" + _0xe69ac + "\" for group " + _0x175fb3);
      await _0x5e5a68.groupToggleEphemeral(_0x175fb3, _0xe69ac === "announcement");
      this.logger.info("Group settings updated successfully");
      return {
        success: true
      };
    } catch (_0xc3df37) {
      this.logger.error("Error updating group settings:", _0xc3df37);
      return {
        success: false,
        error: _0xc3df37.message
      };
    }
  }
  async updateGroupPhoto(_0x1be7ca, _0x5c2573, _0x1ecf9b) {
    try {
      const _0x43d860 = this.sessions.get(_0x1be7ca);
      if (!_0x43d860) {
        throw new Error("Session not found");
      }
      this.logger.info("Updating group photo for group " + _0x5c2573);
      let _0x4c320b = _0x1ecf9b;
      if (typeof _0x1ecf9b === "string") {
        if (_0x1ecf9b.startsWith("data:")) {
          const _0x1f402b = _0x1ecf9b.split(",")[1];
          _0x4c320b = Buffer.from(_0x1f402b, "base64");
        } else {
          _0x4c320b = Buffer.from(_0x1ecf9b, "base64");
        }
      }
      await _0x43d860.updateProfilePicture(_0x5c2573, _0x4c320b);
      this.logger.info("Group photo updated successfully");
      return {
        success: true
      };
    } catch (_0x2c574b) {
      this.logger.error("Error updating group photo:", _0x2c574b);
      return {
        success: false,
        error: _0x2c574b.message
      };
    }
  }
  async removeGroupPhoto(_0xcd1554, _0x132b0c) {
    try {
      const _0x13c053 = this.sessions.get(_0xcd1554);
      if (!_0x13c053) {
        throw new Error("Session not found");
      }
      this.logger.info("Removing group photo for group " + _0x132b0c);
      await _0x13c053.removeProfilePicture(_0x132b0c);
      this.logger.info("Group photo removed successfully");
      return {
        success: true
      };
    } catch (_0x40150d) {
      this.logger.error("Error removing group photo:", _0x40150d);
      return {
        success: false,
        error: _0x40150d.message
      };
    }
  }
  async leaveGroup(_0x384b28, _0x182b9a) {
    try {
      const _0x1487e6 = this.sessions.get(_0x384b28);
      if (!_0x1487e6) {
        throw new Error("Session not found");
      }
      this.logger.info("Leaving group " + _0x182b9a);
      await _0x1487e6.groupLeave(_0x182b9a);
      this.logger.info("Left group successfully");
      return {
        success: true
      };
    } catch (_0x267c1b) {
      this.logger.error("Error leaving group:", _0x267c1b);
      return {
        success: false,
        error: _0x267c1b.message
      };
    }
  }
  async joinGroupWithInvite(_0x54293c, _0x1bc4d6) {
    try {
      const _0x31c506 = this.sessions.get(_0x54293c);
      if (!_0x31c506) {
        throw new Error("Session not found");
      }
      const _0x38bcb9 = _0x1bc4d6.replace("https://chat.whatsapp.com/", "");
      this.logger.info("Joining group with invite code " + _0x38bcb9);
      const _0xcc0329 = await _0x31c506.groupAcceptInvite(_0x38bcb9);
      this.logger.info("Joined group successfully: " + _0xcc0329);
      return {
        success: true,
        groupId: _0xcc0329
      };
    } catch (_0x5b4a0e) {
      this.logger.error("Error joining group with invite:", _0x5b4a0e);
      return {
        success: false,
        error: _0x5b4a0e.message
      };
    }
  }
  async revokeGroupInvite(_0x33a4a0, _0x298c20) {
    try {
      const _0x35c2df = this.sessions.get(_0x33a4a0);
      if (!_0x35c2df) {
        throw new Error("Session not found");
      }
      this.logger.info("Revoking invite code for group " + _0x298c20);
      const _0x310477 = await _0x35c2df.groupRevokeInvite(_0x298c20);
      this.logger.info("New invite code generated: " + _0x310477);
      return {
        success: true,
        newInviteCode: _0x310477,
        newInviteLink: "https://chat.whatsapp.com/" + _0x310477
      };
    } catch (_0x2d55fd) {
      this.logger.error("Error revoking group invite:", _0x2d55fd);
      return {
        success: false,
        error: _0x2d55fd.message
      };
    }
  }
  async sendGroupMessage(_0x49c52c, _0x3c3ed4, _0x66f4d9, _0xde09cb = [], _0x2ba237 = {}) {
    try {
      const _0x3cdff6 = await this.waitForReadySocket(_0x49c52c);
      this.logger.info("Sending message to group " + _0x3c3ed4 + " with mentions: " + _0xde09cb);
      if (_0x3c3ed4 && !String(_0x3c3ed4).includes("@g.us")) {
        _0x3c3ed4 = _0x3c3ed4 + "@g.us";
      }
      const _0x593be2 = ["image", "video", "audio", "document"];
      let _0x196ffd = false;
      let _0x3a6b57 = null;
      if (typeof _0x66f4d9 === "object" && _0x66f4d9 !== null) {
        for (const _0xed6a92 of _0x593be2) {
          if (_0x66f4d9[_0xed6a92]) {
            _0x196ffd = true;
            _0x3a6b57 = _0xed6a92;
            break;
          }
        }
      }
      if (_0x196ffd && _0x3a6b57) {
        this.logger.info("📤 Sending " + _0x3a6b57 + " message to group " + _0x3c3ed4);
        let _0x4bf090 = {};
        const _0x5716f1 = _0x66f4d9[_0x3a6b57];
        if (typeof _0x5716f1 === "object" && _0x5716f1.url) {
          if (_0x5716f1.url.startsWith("data:")) {
            const _0x1738bd = _0x5716f1.url.split(",")[1];
            const _0x3aeaf1 = Buffer.from(_0x1738bd, "base64");
            this.logger.info("📤 Converted data URL to buffer, size: " + _0x3aeaf1.length + " bytes");
            _0x4bf090[_0x3a6b57] = _0x3aeaf1;
          } else {
            this.logger.info("📤 Using URL: " + _0x5716f1.url);
            _0x4bf090[_0x3a6b57] = _0x5716f1;
          }
        } else if (typeof _0x5716f1 === "string") {
          if (_0x5716f1.startsWith("data:")) {
            this.logger.info("📤 Converting data URL to buffer (length: " + _0x5716f1.length + ")");
            const _0x121cd4 = _0x5716f1.split(",")[1];
            const _0xa878da = Buffer.from(_0x121cd4, "base64");
            this.logger.info("📤 Converted to buffer, size: " + _0xa878da.length + " bytes");
            _0x4bf090[_0x3a6b57] = _0xa878da;
          } else {
            this.logger.info("📤 Using URL string: " + _0x5716f1.substring(0, 50) + "...");
            _0x4bf090[_0x3a6b57] = {
              url: _0x5716f1
            };
          }
        } else {
          this.logger.info("📤 Using direct buffer/data");
          _0x4bf090[_0x3a6b57] = _0x5716f1;
        }
        if (_0x66f4d9.caption) {
          _0x4bf090.caption = _0x66f4d9.caption;
        }
        if (_0x3a6b57 === "document" && _0x66f4d9.fileName) {
          _0x4bf090.fileName = _0x66f4d9.fileName;
        }
        if (_0x3a6b57 === "audio" && _0x66f4d9.mimetype) {
          _0x4bf090.mimetype = _0x66f4d9.mimetype;
        } else if (_0x3a6b57 === "audio") {
          _0x4bf090.mimetype = "audio/mp4";
        }
        try {
          const _0x396165 = await _0x3cdff6.sendMessage(_0x3c3ed4, _0x4bf090);
          this.logger.info("Group " + _0x3a6b57 + " message sent successfully: " + _0x396165.key.id);
          return {
            success: true,
            messageId: _0x396165.key.id,
            timestamp: _0x396165.messageTimestamp
          };
        } catch (_0x50341b) {
          this.logger.error("Error sending group " + _0x3a6b57 + " message:", _0x50341b);
          throw _0x50341b;
        }
      }
      let _0x2700a5 = [];
      let _0x2e6128;
      if (typeof _0x66f4d9 === "object" && _0x66f4d9 !== null) {
        if (_0x66f4d9.text) {
          _0x2e6128 = String(_0x66f4d9.text);
        } else if (_0x66f4d9.content) {
          _0x2e6128 = String(_0x66f4d9.content);
        } else if (_0x66f4d9.body && _0x66f4d9.body.text) {
          _0x2e6128 = String(_0x66f4d9.body.text);
        } else {
          _0x2e6128 = JSON.stringify(_0x66f4d9);
        }
      } else {
        _0x2e6128 = String(_0x66f4d9 || "");
      }
      if (!_0x2e6128 || _0x2e6128.trim() === "" || _0x2e6128 === "[object Object]") {
        throw new Error("Cannot send empty group message");
      }
      if (_0xde09cb === "all" || Array.isArray(_0xde09cb) && _0xde09cb.includes("all")) {
        try {
          let _0x3900e8 = this.getCachedGroupMetadata(_0x49c52c, _0x3c3ed4);
          if (!_0x3900e8) {
            _0x3900e8 = await _0x3cdff6.groupMetadata(_0x3c3ed4);
            this.setGroupMetadataCache(_0x49c52c, _0x3c3ed4, _0x3900e8);
          }
          _0x2700a5 = (_0x3900e8.participants || []).map(_0x434288 => _0x434288.id);
          _0x2e6128 = "@everyone " + _0x66f4d9;
        } catch (_0x1dd120) {
          this.logger.warn("Could not get group metadata for mentions: " + _0x1dd120.message);
        }
      } else if (Array.isArray(_0xde09cb) && _0xde09cb.length > 0) {
        _0x2700a5 = _0xde09cb.map(_0x3d14c3 => {
          if (_0x3d14c3.includes("@")) {
            return _0x3d14c3;
          }
          return _0x3d14c3 + "@s.whatsapp.net";
        });
        const _0x1bdfd2 = _0xde09cb.map(_0x3685cf => "@" + _0x3685cf.replace("@s.whatsapp.net", "")).join(" ");
        _0x2e6128 = _0x1bdfd2 + " " + _0x66f4d9;
      }
      const _0x5c82c4 = {
        text: _0x2e6128
      };
      if (_0x2700a5.length > 0) {
        _0x5c82c4.mentions = _0x2700a5;
      }
      try {
        const _0x1ff806 = await _0x3cdff6.sendMessage(_0x3c3ed4, _0x5c82c4);
        this.logger.info("Group message sent successfully: " + _0x1ff806.key.id);
        return {
          success: true,
          messageId: _0x1ff806.key.id,
          timestamp: _0x1ff806.messageTimestamp
        };
      } catch (_0x33d5d5) {
        if (_0x33d5d5.message.includes("No sessions") || _0x33d5d5.name === "SessionError") {
          this.logger.info("Signal Protocol session error, attempting to establish sessions for group " + _0x3c3ed4);
          try {
            let _0x11e685 = this.getCachedGroupMetadata(_0x49c52c, _0x3c3ed4);
            if (!_0x11e685) {
              _0x11e685 = await _0x3cdff6.groupMetadata(_0x3c3ed4);
              this.setGroupMetadataCache(_0x49c52c, _0x3c3ed4, _0x11e685);
            }
            const _0x147614 = _0x11e685.participants || [];
            const _0x402b6c = _0x147614.filter(_0x249169 => {
              const _0x28544b = _0x249169.id || _0x249169.jid || "";
              const _0x30bf52 = _0x28544b.split("@")[0];
              return _0x30bf52.length >= 10;
            });
            if (_0x402b6c.length > 0) {
              for (const _0x58813c of _0x402b6c.slice(0, 5)) {
                try {
                  const _0x1cc8f3 = _0x58813c.id || _0x58813c.jid;
                  await _0x3cdff6.presenceSubscribe(_0x1cc8f3);
                  await new Promise(_0x44e2be => setTimeout(_0x44e2be, 200));
                } catch (_0x16bde5) {}
              }
            }
            await _0x3cdff6.sendPresenceUpdate("available", _0x3c3ed4);
            const _0x135ff1 = _0x402b6c.length > 0 ? 3000 : 1000;
            await new Promise(_0x5e41c5 => setTimeout(_0x5e41c5, _0x135ff1));
            const _0x2828ab = await _0x3cdff6.sendMessage(_0x3c3ed4, _0x5c82c4);
            this.logger.info("Group message sent successfully after retry: " + _0x2828ab.key.id);
            return {
              success: true,
              messageId: _0x2828ab.key.id,
              timestamp: _0x2828ab.messageTimestamp
            };
          } catch (_0xe62dcb) {
            if (_0x2700a5.length > 0) {
              try {
                const _0x438127 = {
                  text: _0x2e6128
                };
                const _0x192e5b = await _0x3cdff6.sendMessage(_0x3c3ed4, _0x438127);
                this.logger.info("Group message sent successfully without mentions: " + _0x192e5b.key.id);
                return {
                  success: true,
                  messageId: _0x192e5b.key.id,
                  timestamp: _0x192e5b.messageTimestamp,
                  warning: "Message sent without mentions due to international number compatibility"
                };
              } catch (_0x23102d) {
                throw _0xe62dcb;
              }
            } else {
              throw _0xe62dcb;
            }
          }
        } else {
          throw _0x33d5d5;
        }
      }
    } catch (_0xf96c5d) {
      this.logger.error("Error sending group message:", _0xf96c5d);
      return {
        success: false,
        error: _0xf96c5d.message
      };
    }
  }
  async blockContactComprehensive(_0x2dfafe, _0x136891, _0x3192e0 = {}) {
    const {
      removeFromGroups = true,
      excludeGroups = []
    } = _0x3192e0;
    try {
      const _0x3db8ad = this.sessions.get(_0x2dfafe);
      if (!_0x3db8ad) {
        throw new Error("Session not found");
      }
      let _0x103573 = _0x136891.toString().trim();
      if (_0x103573.startsWith("+")) {
        _0x103573 = _0x103573.substring(1);
      }
      const _0x2c10d2 = _0x103573.includes("@") ? _0x103573 : _0x103573 + "@s.whatsapp.net";
      this.logger.info("🚫 Starting comprehensive block for: " + _0x136891 + " -> " + _0x2c10d2);
      const _0xd6c386 = {
        directBlock: null,
        groupRemovals: [],
        errors: []
      };
      try {
        _0xd6c386.directBlock = await this.blockContact(_0x2dfafe, _0x136891);
        this.logger.info("🚫 Direct block result:", _0xd6c386.directBlock);
      } catch (_0x32dde6) {
        this.logger.error("🚫 Direct block failed:", _0x32dde6);
        _0xd6c386.errors.push("Direct block failed: " + _0x32dde6.message);
      }
      if (removeFromGroups) {
        try {
          this.logger.info("💫 Starting group removal process for " + _0x2c10d2);
          const _0x382bda = await _0x3db8ad.groupFetchAllParticipating();
          if (!_0x382bda) {
            this.logger.warn("No groups data available");
            return {
              success: _0xd6c386.directBlock?.success || false,
              details: _0xd6c386,
              message: "Direct block completed, but no groups found to remove from"
            };
          }
          const _0x84fbe = Object.values(_0x382bda);
          this.logger.info("💫 Found " + _0x84fbe.length + " groups to check");
          for (const _0x3a398d of _0x84fbe) {
            if (excludeGroups.includes(_0x3a398d.id)) {
              this.logger.info("📋 Skipping excluded group: " + _0x3a398d.subject + " (" + _0x3a398d.id + ")");
              continue;
            }
            try {
              const _0x391c1e = _0x3db8ad.user?.id;
              const _0x2acf30 = _0x3a398d.participants?.some(_0xeeb967 => _0xeeb967.id === _0x391c1e && (_0xeeb967.admin === "admin" || _0xeeb967.admin === "superadmin"));
              if (!_0x2acf30) {
                this.logger.warn("📋 Cannot remove from group \"" + _0x3a398d.subject + "\" - not an admin");
                _0xd6c386.groupRemovals.push({
                  groupId: _0x3a398d.id,
                  groupName: _0x3a398d.subject,
                  success: false,
                  error: "Not an admin of this group"
                });
                continue;
              }
              const _0x30b1c1 = _0x3a398d.participants?.some(_0x9797a4 => {
                const _0x418e8f = _0x9797a4.id.split("@")[0];
                return _0x418e8f === _0x103573 || _0x9797a4.id === _0x2c10d2;
              });
              if (!_0x30b1c1) {
                this.logger.info("📋 Contact not in group \"" + _0x3a398d.subject + "\"");
                continue;
              }
              this.logger.info("📋 Attempting to remove " + _0x2c10d2 + " from group \"" + _0x3a398d.subject + "\" (" + _0x3a398d.id + ")");
              const _0x2268c1 = await _0x3db8ad.groupParticipantsUpdate(_0x3a398d.id, [_0x2c10d2], "remove");
              this.logger.info("📋 Removal result for group \"" + _0x3a398d.subject + "\":", _0x2268c1);
              _0xd6c386.groupRemovals.push({
                groupId: _0x3a398d.id,
                groupName: _0x3a398d.subject,
                success: true,
                result: _0x2268c1
              });
              await new Promise(_0x1836ad => setTimeout(_0x1836ad, 1000));
            } catch (_0x377c69) {
              this.logger.error("📋 Error removing from group \"" + _0x3a398d.subject + "\":", _0x377c69);
              _0xd6c386.groupRemovals.push({
                groupId: _0x3a398d.id,
                groupName: _0x3a398d.subject,
                success: false,
                error: _0x377c69.message
              });
            }
          }
          this.logger.info("📋 Group removal completed: " + _0xd6c386.groupRemovals.filter(_0x38eae2 => _0x38eae2.success).length + " successful, " + _0xd6c386.groupRemovals.filter(_0x454771 => !_0x454771.success).length + " failed");
        } catch (_0x28e86d) {
          this.logger.error("📋 Error in group removal process:", _0x28e86d);
          _0xd6c386.errors.push("Group removal failed: " + _0x28e86d.message);
        }
      }
      const _0x1c167f = _0xd6c386.directBlock?.success || false;
      const _0x2efbbc = _0xd6c386.groupRemovals.filter(_0xae3953 => _0xae3953.success).length;
      const _0x316377 = _0xd6c386.groupRemovals.length;
      const _0x154ae5 = _0x1c167f && (_0x316377 === 0 || _0x2efbbc > 0);
      return {
        success: _0x154ae5,
        message: this.buildComprehensiveBlockMessage(_0xd6c386, _0x136891),
        details: _0xd6c386,
        jid: _0x2c10d2
      };
    } catch (_0x524d79) {
      this.logger.error("🚫 ❌ Comprehensive block failed for " + _0x136891 + ":", _0x524d79);
      return {
        success: false,
        error: "Failed to comprehensively block " + _0x136891 + ": " + _0x524d79.message,
        jid: _0x136891.includes("@") ? _0x136891 : _0x136891 + "@s.whatsapp.net"
      };
    }
  }
  buildComprehensiveBlockMessage(_0x353702, _0x36489d) {
    const _0x459bbe = [];
    if (_0x353702.directBlock?.success) {
      _0x459bbe.push("✅ Direct messages blocked");
    } else {
      _0x459bbe.push("⚠️ Direct block failed");
    }
    const _0xeac530 = _0x353702.groupRemovals.filter(_0x1a2c45 => _0x1a2c45.success);
    const _0x52d17b = _0x353702.groupRemovals.filter(_0x305a56 => !_0x305a56.success);
    if (_0xeac530.length > 0) {
      _0x459bbe.push("✅ Removed from " + _0xeac530.length + " group(s)");
    }
    if (_0x52d17b.length > 0) {
      _0x459bbe.push("⚠️ Failed to remove from " + _0x52d17b.length + " group(s)");
    }
    if (_0x353702.groupRemovals.length === 0) {
      _0x459bbe.push("💭 No groups to remove from");
    }
    return "Comprehensive block for " + _0x36489d + ": " + _0x459bbe.join(", ");
  }
  async blockContact(_0x2d13e6, _0x4be1bc) {
    try {
      const _0x430a9f = this.sessions.get(_0x2d13e6);
      if (!_0x430a9f) {
        throw new Error("Session not found");
      }
      let _0x154cb1 = _0x4be1bc.toString().trim();
      if (_0x154cb1.startsWith("+")) {
        _0x154cb1 = _0x154cb1.substring(1);
      }
      const _0x54c4e6 = _0x154cb1.includes("@") ? _0x154cb1 : _0x154cb1 + "@s.whatsapp.net";
      this.logger.info("🚫 Starting block process for: " + _0x4be1bc + " -> " + _0x54c4e6 + " (session: " + _0x2d13e6 + ")");
      const _0x2d656a = Object.getOwnPropertyNames(_0x430a9f).filter(_0x1f88eb => typeof _0x430a9f[_0x1f88eb] === "function");
      const _0x5606bb = _0x2d656a.filter(_0x18f406 => _0x18f406.toLowerCase().includes("block"));
      this.logger.info("🚫 Available blocking methods: " + _0x5606bb.join(", "));
      this.logger.info("🚫 Socket has updateBlockStatus: " + (typeof _0x430a9f.updateBlockStatus === "function"));
      this.logger.info("🚫 Socket has fetchBlocklist: " + (typeof _0x430a9f.fetchBlocklist === "function"));
      let _0x630e3d = null;
      let _0x179477 = "unknown";
      try {
        if (typeof _0x430a9f.updateBlockStatus === "function") {
          this.logger.info("🚫 Attempting Method 1: updateBlockStatus with " + _0x54c4e6);
          _0x630e3d = await _0x430a9f.updateBlockStatus(_0x54c4e6, "block");
          _0x179477 = "updateBlockStatus";
          this.logger.info("🚫 updateBlockStatus result:", _0x630e3d);
          await new Promise(_0x35340a => setTimeout(_0x35340a, 2000));
          if (typeof _0x430a9f.fetchBlocklist === "function") {
            try {
              const _0xa0bf52 = await _0x430a9f.fetchBlocklist();
              this.logger.info("🚫 Current blocklist after blocking:", _0xa0bf52);
              const _0x16c6b3 = _0xa0bf52.some(_0x546a46 => _0x546a46 === _0x54c4e6 || _0x546a46 === _0x154cb1 + "@c.us" || _0x546a46.includes(_0x154cb1));
              if (_0x16c6b3) {
                this.logger.info("🚫 ✅ VERIFICATION SUCCESS: " + _0x4be1bc + " is now in blocklist");
                return {
                  success: true,
                  message: "Successfully blocked " + _0x4be1bc,
                  method: _0x179477,
                  verified: true,
                  jid: _0x54c4e6
                };
              } else {
                this.logger.warn("🚫 ⚠️ VERIFICATION FAILED: " + _0x4be1bc + " not found in blocklist after blocking");
                throw new Error("Blocking verification failed - contact not in blocklist");
              }
            } catch (_0x182f66) {
              this.logger.warn("🚫 Could not verify blocking:", _0x182f66.message);
              return {
                success: true,
                message: "Blocked " + _0x4be1bc + " (verification failed)",
                method: _0x179477,
                verified: false,
                jid: _0x54c4e6
              };
            }
          } else {
            this.logger.info("🚫 fetchBlocklist not available, assuming block succeeded");
            return {
              success: true,
              message: "Successfully blocked " + _0x4be1bc,
              method: _0x179477,
              verified: false,
              jid: _0x54c4e6
            };
          }
        } else {
          throw new Error("updateBlockStatus method not available");
        }
      } catch (_0x3244fb) {
        this.logger.error("🚫 Method 1 failed:", _0x3244fb.message);
        try {
          this.logger.info("🚫 Attempting Method 2: Query-based blocking with " + _0x54c4e6);
          const _0x3f02e2 = {
            tag: "iq",
            attrs: {
              id: "block_" + Date.now(),
              type: "set",
              to: "s.whatsapp.net"
            },
            content: [{
              tag: "blocklist",
              attrs: {
                xmlns: "blocklist"
              },
              content: [{
                tag: "item",
                attrs: {
                  action: "block",
                  jid: _0x54c4e6
                }
              }]
            }]
          };
          _0x630e3d = await _0x430a9f.query(_0x3f02e2);
          _0x179477 = "query";
          this.logger.info("🚫 Query method result:", _0x630e3d);
          return {
            success: true,
            message: "Successfully blocked " + _0x4be1bc + " (query method)",
            method: _0x179477,
            verified: false,
            jid: _0x54c4e6
          };
        } catch (_0x4d69a6) {
          this.logger.error("🚫 Method 2 failed:", _0x4d69a6.message);
          try {
            this.logger.info("🚫 Attempting Method 3: sendNode with " + _0x54c4e6);
            if (typeof _0x430a9f.sendNode === "function") {
              const _0x29283c = {
                tag: "iq",
                attrs: {
                  id: "block_" + Date.now(),
                  type: "set",
                  to: "s.whatsapp.net"
                },
                content: [{
                  tag: "blocklist",
                  attrs: {
                    xmlns: "blocklist"
                  },
                  content: [{
                    tag: "item",
                    attrs: {
                      action: "block",
                      jid: _0x54c4e6
                    }
                  }]
                }]
              };
              _0x630e3d = await _0x430a9f.sendNode(_0x29283c);
              _0x179477 = "sendNode";
              this.logger.info("🚫 sendNode method result:", _0x630e3d);
              return {
                success: true,
                message: "Successfully blocked " + _0x4be1bc + " (sendNode method)",
                method: _0x179477,
                verified: false,
                jid: _0x54c4e6
              };
            } else {
              throw new Error("sendNode method not available");
            }
          } catch (_0x16f44f) {
            this.logger.error("🚫 Method 3 failed:", _0x16f44f.message);
            const _0xbf9d35 = _0x154cb1 + "@c.us";
            if (_0xbf9d35 !== _0x54c4e6 && typeof _0x430a9f.updateBlockStatus === "function") {
              try {
                this.logger.info("🚫 Attempting Method 4: Alternative JID format " + _0xbf9d35);
                _0x630e3d = await _0x430a9f.updateBlockStatus(_0xbf9d35, "block");
                _0x179477 = "updateBlockStatus (alternative JID)";
                this.logger.info("🚫 Alternative JID result:", _0x630e3d);
                return {
                  success: true,
                  message: "Successfully blocked " + _0x4be1bc + " (alternative format)",
                  method: _0x179477,
                  verified: false,
                  jid: _0xbf9d35
                };
              } catch (_0x5b4c6c) {
                this.logger.error("🚫 Method 4 failed:", _0x5b4c6c.message);
              }
            }
            throw new Error("All blocking methods failed. Last error: " + _0x16f44f.message);
          }
        }
      }
    } catch (_0x47c652) {
      this.logger.error("🚫 ❌ Complete blocking failure for " + _0x4be1bc + ":", _0x47c652);
      return {
        success: false,
        error: "Failed to block " + _0x4be1bc + ": " + _0x47c652.message,
        jid: _0x4be1bc.includes("@") ? _0x4be1bc : _0x4be1bc + "@s.whatsapp.net"
      };
    }
  }
  async unblockContact(_0xe53b31, _0x2d3a33) {
    try {
      const _0x33f833 = this.sessions.get(_0xe53b31);
      if (!_0x33f833) {
        throw new Error("Session not found");
      }
      let _0x3d4263 = _0x2d3a33.toString().trim();
      if (_0x3d4263.startsWith("+")) {
        _0x3d4263 = _0x3d4263.substring(1);
      }
      const _0x5c4267 = _0x3d4263.includes("@") ? _0x3d4263 : _0x3d4263 + "@s.whatsapp.net";
      this.logger.info("Unblocking contact: " + _0x2d3a33 + " -> " + _0x5c4267 + " (session: " + _0xe53b31 + ")");
      try {
        await _0x33f833.updateBlockStatus(_0x5c4267, "unblock");
        this.logger.info("Successfully unblocked contact: " + _0x5c4267);
        return {
          success: true,
          message: "Successfully unblocked " + _0x2d3a33
        };
      } catch (_0x339572) {
        this.logger.error("Unblock operation failed for " + _0x5c4267 + ":", _0x339572);
        const _0xee23c2 = _0x3d4263.includes("@") ? _0x3d4263 : _0x3d4263 + "@c.us";
        if (_0xee23c2 !== _0x5c4267) {
          this.logger.info("Retrying with alternative JID format: " + _0xee23c2);
          try {
            await _0x33f833.updateBlockStatus(_0xee23c2, "unblock");
            this.logger.info("Successfully unblocked contact with alternative format: " + _0xee23c2);
            return {
              success: true,
              message: "Successfully unblocked " + _0x2d3a33 + " (alternative format)"
            };
          } catch (_0x3bc735) {
            this.logger.error("Alternative unblock format also failed:", _0x3bc735);
          }
        }
        throw _0x339572;
      }
    } catch (_0x5efd9d) {
      this.logger.error("Error unblocking contact " + _0x2d3a33 + ":", _0x5efd9d);
      return {
        success: false,
        error: "Failed to unblock " + _0x2d3a33 + ": " + _0x5efd9d.message
      };
    }
  }
  async getBlockedContacts(_0x4fdf32) {
    try {
      const _0x591ba0 = this.sessions.get(_0x4fdf32);
      if (!_0x591ba0) {
        throw new Error("Session not found");
      }
      this.logger.info("Getting blocked contacts list");
      const _0x11a635 = await _0x591ba0.fetchBlocklist();
      this.logger.info("Retrieved " + _0x11a635.length + " blocked contacts");
      return {
        success: true,
        blockedContacts: _0x11a635
      };
    } catch (_0x578708) {
      this.logger.error("Error getting blocked contacts:", _0x578708);
      return {
        success: false,
        error: _0x578708.message
      };
    }
  }
  async bulkUpdateGroups(_0x2ca7c2, _0x20d469) {
    try {
      const _0x1012b0 = this.sessions.get(_0x2ca7c2);
      if (!_0x1012b0) {
        throw new Error("Session not found");
      }
      this.logger.info("Bulk updating " + _0x20d469.length + " groups");
      const _0x1023fc = [];
      for (const _0x329c63 of _0x20d469) {
        const {
          groupId: _0x4771d9,
          subject: _0x145896,
          description: _0x3dade4
        } = _0x329c63;
        const _0xff2a9e = {
          groupId: _0x4771d9,
          success: true,
          errors: []
        };
        try {
          if (_0x145896 && _0x145896.trim()) {
            await _0x1012b0.groupUpdateSubject(_0x4771d9, _0x145896);
            _0xff2a9e.subjectUpdated = true;
          }
          if (_0x3dade4 !== undefined) {
            await _0x1012b0.groupUpdateDescription(_0x4771d9, _0x3dade4);
            _0xff2a9e.descriptionUpdated = true;
          }
          await new Promise(_0xfe6591 => setTimeout(_0xfe6591, 1000));
        } catch (_0x4f39a5) {
          _0xff2a9e.success = false;
          _0xff2a9e.errors.push(_0x4f39a5.message);
          this.logger.error("Error updating group " + _0x4771d9 + ":", _0x4f39a5);
        }
        _0x1023fc.push(_0xff2a9e);
      }
      const _0x11dd28 = _0x1023fc.filter(_0x3ffe2e => _0x3ffe2e.success).length;
      this.logger.info("Bulk update completed: " + _0x11dd28 + "/" + _0x20d469.length + " successful");
      return {
        success: true,
        results: _0x1023fc,
        summary: {
          total: _0x20d469.length,
          successful: _0x11dd28,
          failed: _0x20d469.length - _0x11dd28
        }
      };
    } catch (_0x1066a2) {
      this.logger.error("Error in bulk group update:", _0x1066a2);
      return {
        success: false,
        error: _0x1066a2.message
      };
    }
  }
  async bulkUpdateGroupPhotos(_0x4f3337, _0x47fd4e) {
    try {
      const _0xb71a10 = this.sessions.get(_0x4f3337);
      if (!_0xb71a10) {
        throw new Error("Session not found");
      }
      this.logger.info("Bulk updating photos for " + _0x47fd4e.length + " groups");
      const _0x9c1b1 = [];
      for (const _0x495d3a of _0x47fd4e) {
        const {
          groupId: _0x1d4279,
          imageBuffer: _0x520ec1
        } = _0x495d3a;
        const _0x483b5d = {
          groupId: _0x1d4279,
          success: true
        };
        try {
          let _0xe464a2 = _0x520ec1;
          if (typeof _0x520ec1 === "string") {
            if (_0x520ec1.startsWith("data:")) {
              const _0x1fdb07 = _0x520ec1.split(",")[1];
              _0xe464a2 = Buffer.from(_0x1fdb07, "base64");
            } else {
              _0xe464a2 = Buffer.from(_0x520ec1, "base64");
            }
          }
          await _0xb71a10.updateProfilePicture(_0x1d4279, _0xe464a2);
          _0x483b5d.photoUpdated = true;
          await new Promise(_0x5f4266 => setTimeout(_0x5f4266, 2000));
        } catch (_0x26396f) {
          _0x483b5d.success = false;
          _0x483b5d.error = _0x26396f.message;
          this.logger.error("Error updating photo for group " + _0x1d4279 + ":", _0x26396f);
        }
        _0x9c1b1.push(_0x483b5d);
      }
      const _0x1c90e1 = _0x9c1b1.filter(_0x561f13 => _0x561f13.success).length;
      this.logger.info("Bulk photo update completed: " + _0x1c90e1 + "/" + _0x47fd4e.length + " successful");
      return {
        success: true,
        results: _0x9c1b1,
        summary: {
          total: _0x47fd4e.length,
          successful: _0x1c90e1,
          failed: _0x47fd4e.length - _0x1c90e1
        }
      };
    } catch (_0x431830) {
      this.logger.error("Error in bulk group photo update:", _0x431830);
      return {
        success: false,
        error: _0x431830.message
      };
    }
  }
  async shutdown() {
    this.isShuttingDown = true;
    try {
      this.stopVersionRechecking();
      if (this.retryStorePruneTimer) {
        clearInterval(this.retryStorePruneTimer);
        this.retryStorePruneTimer = null;
      }
      const _0xcb79e7 = Array.from(this.fileOperationLocks.values());
      if (_0xcb79e7.length > 0) {
        await Promise.allSettled(_0xcb79e7);
      }
      for (const [_0x42e52c, _0x466fa3] of this.sessions.entries()) {
        try {
          if (_0x466fa3 && typeof _0x466fa3.end === "function") {
            await _0x466fa3.end();
          }
        } catch (_0x2f8e39) {}
      }
      for (const _0x81162f of this.stores.keys()) {
        this.cleanupStore(_0x81162f);
      }
      this.sessions.clear();
      this.sessionStates.clear();
      this.stores.clear();
      this.fileOperationLocks.clear();
    } catch (_0x32fed8) {
      console.error("Error during WhatsApp service shutdown:", _0x32fed8);
    }
  }
}
module.exports = WhatsAppService;