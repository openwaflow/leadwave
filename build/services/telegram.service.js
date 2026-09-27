const {
  TelegramClient
} = require("telegram");
const {
  StringSession
} = require("telegram/sessions");
const {
  NewMessage
} = require("telegram/events");
const path = require("path");
const fs = require("fs");
const DEFAULT_API_ID = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || "";
class TelegramService {
  constructor(_0xbfbe5c, _0x4728ad) {
    this.db = _0xbfbe5c;
    this.logger = _0x4728ad || console;
    this.clients = new Map();
    this.sessions = new Map();
    this.pendingLogins = new Map();
    this.messageHandlers = new Map();
    this.apiId = DEFAULT_API_ID;
    this.apiHash = DEFAULT_API_HASH;
  }
  setApiCredentials(_0x1805bd, _0x44c235) {
    this.apiId = parseInt(_0x1805bd, 10);
    this.apiHash = _0x44c235;
  }
  async _loadSessionsFromDB() {
    try {
      const _0x155247 = await this.db.query("SELECT * FROM telegram_sessions WHERE is_active = 1");
      if (_0x155247 && _0x155247.data) {
        return _0x155247.data;
      } else {
        return [];
      }
    } catch (_0x4ffbdf) {
      this.logger.error("[Telegram] Failed to load sessions:", _0x4ffbdf.message);
      return [];
    }
  }
  async _saveSessionToDB(_0x3ac3da, _0x4beed0, _0x591537, _0x238c74, _0x40ce1a) {
    const _0xc9cbc4 = await this.db.query("INSERT INTO telegram_sessions\n         (session_id, name, phone_number, session_string, status, user_id, username,\n          first_name, last_name, api_id, api_hash, updated_at)\n       VALUES (?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n       ON CONFLICT(session_id) DO UPDATE SET\n         session_string = excluded.session_string,\n         status         = 'connected',\n         user_id        = excluded.user_id,\n         username       = excluded.username,\n         first_name     = excluded.first_name,\n         last_name      = excluded.last_name,\n         api_id         = excluded.api_id,\n         api_hash       = excluded.api_hash,\n         updated_at     = CURRENT_TIMESTAMP", [_0x3ac3da, _0x591537.displayName || _0x3ac3da, _0x591537.phone || "", _0x4beed0, String(_0x591537.id || ""), _0x591537.username || "", _0x591537.firstName || "", _0x591537.lastName || "", _0x238c74 || this.apiId || 0, _0x40ce1a || this.apiHash || ""]);
    if (!_0xc9cbc4 || !_0xc9cbc4.success) {
      throw new Error("Failed to save Telegram session: " + (_0xc9cbc4?.error || "unknown DB error"));
    }
  }
  async _updateSessionStatus(_0x46f793, _0x57593f) {
    await this.db.query("UPDATE telegram_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?", [_0x57593f, _0x46f793]);
  }
  async initialize() {
    this.logger.info("[Telegram] Initializing stored sessions...");
    try {
      await this.db.query("ALTER TABLE telegram_sessions ADD COLUMN api_id INTEGER DEFAULT 0");
    } catch (_0x2d3b6d) {}
    try {
      await this.db.query("ALTER TABLE telegram_sessions ADD COLUMN api_hash TEXT DEFAULT \"\"");
    } catch (_0x16ca06) {}
    const _0x51515c = await this._loadSessionsFromDB();
    for (const _0x4d0832 of _0x51515c) {
      if (_0x4d0832.session_string) {
        try {
          await this.reconnectSession(_0x4d0832.session_id, _0x4d0832.session_string, _0x4d0832.api_id, _0x4d0832.api_hash);
        } catch (_0x5db19e) {
          this.logger.warn("[Telegram] Could not reconnect " + _0x4d0832.session_id + ": " + _0x5db19e.message);
          await this._updateSessionStatus(_0x4d0832.session_id, "disconnected");
        }
      }
    }
  }
  async reconnectSessionById(_0x50c873) {
    const _0x3c8397 = await this.db.query("SELECT * FROM telegram_sessions WHERE session_id = ? AND is_active = 1", [_0x50c873]);
    const _0x196d66 = _0x3c8397 && _0x3c8397.data && _0x3c8397.data[0] ? _0x3c8397.data[0] : null;
    if (!_0x196d66) {
      throw new Error("Session " + _0x50c873 + " not found");
    }
    if (!_0x196d66.session_string) {
      throw new Error("Session " + _0x50c873 + " has no session string — please add the account again");
    }
    const _0x3aa9c2 = this.clients.get(_0x50c873);
    if (_0x3aa9c2) {
      try {
        await _0x3aa9c2.disconnect();
      } catch (_0x26d8ab) {}
      this.clients.delete(_0x50c873);
    }
    await this.reconnectSession(_0x50c873, _0x196d66.session_string, _0x196d66.api_id, _0x196d66.api_hash);
  }
  async reconnectSession(_0x4c912f, _0x37892d, _0x5a8b6c, _0x5a03b0) {
    const _0x5a42c2 = parseInt(_0x5a8b6c || this.apiId, 10);
    const _0x3330fb = _0x5a03b0 || this.apiHash;
    for (const [_0x4e802e, _0x1c4bef] of [[1, true], [2, false]]) {
      const _0x5323e7 = new StringSession(_0x37892d);
      const _0x3bae18 = new TelegramClient(_0x5323e7, _0x5a42c2, _0x3330fb, {
        connectionRetries: 2,
        retryDelay: 1500,
        useWSS: _0x1c4bef
      });
      try {
        await Promise.race([_0x3bae18.connect(), new Promise((_0x52a1a6, _0x20aa1d) => setTimeout(() => _0x20aa1d(new Error("Reconnect timeout (attempt " + _0x4e802e + ")")), _0x4e802e === 1 ? 15000 : 20000))]);
        if (!(await _0x3bae18.isUserAuthorized())) {
          throw new Error("Session expired");
        }
        this.clients.set(_0x4c912f, _0x3bae18);
        if (_0x5a42c2) {
          this.apiId = _0x5a42c2;
        }
        if (_0x3330fb) {
          this.apiHash = _0x3330fb;
        }
        await this._updateSessionStatus(_0x4c912f, "connected");
        this._attachMessageHandler(_0x4c912f, _0x3bae18);
        this.logger.info("[Telegram] ✅ Reconnected session: " + _0x4c912f + " (useWSS=" + _0x1c4bef + ")");
        return;
      } catch (_0x10b60b) {
        try {
          _0x3bae18.disconnect();
        } catch (_0x262bf7) {}
        if (_0x4e802e === 2 || _0x10b60b.message === "Session expired") {
          throw _0x10b60b;
        }
        this.logger.warn("[Telegram] reconnect attempt " + _0x4e802e + " failed: " + _0x10b60b.message + ", retrying...");
      }
    }
  }
  _buildLoginSession(_0x5e9333, _0x247deb) {
    const _0x2b8d2b = new StringSession("");
    const _0x3f5c57 = new TelegramClient(_0x2b8d2b, this.apiId, this.apiHash, {
      connectionRetries: 3,
      retryDelay: 1500,
      useWSS: _0x247deb
    });
    let _0x224a50;
    let _0x1fa236;
    let _0x388e2f;
    let _0x173bef;
    let _0xba9783;
    const _0x2d3567 = new Promise(_0x1ec1a7 => {
      _0x224a50 = _0x1ec1a7;
    });
    const _0x290e8b = new Promise(_0x3e791b => {
      _0x1fa236 = _0x3e791b;
    });
    const _0x53abe7 = new Promise(_0x4bfb81 => {
      _0x388e2f = _0x4bfb81;
    });
    const _0x39433b = new Promise((_0x229878, _0x58abce) => {
      _0x173bef = _0x229878;
      _0xba9783 = _0x58abce;
    });
    const _0x594063 = _0x3f5c57.start({
      phoneNumber: () => Promise.resolve(_0x5e9333),
      phoneCode: () => {
        _0x173bef();
        return _0x2d3567;
      },
      password: () => {
        _0x388e2f();
        return _0x290e8b;
      },
      onError: _0x4f2acc => {
        this.logger.error("[Telegram] start() error:", _0x4f2acc.message);
        _0xba9783(_0x4f2acc);
      }
    });
    _0x594063.catch(_0x1a40be => _0xba9783(_0x1a40be));
    return {
      client: _0x3f5c57,
      loginPromise: _0x594063,
      resolveCode: _0x224a50,
      resolvePassword: _0x1fa236,
      needs2FAPromise: _0x53abe7,
      codeRequestedPromise: _0x39433b
    };
  }
  async sendPhoneCode(_0x5098d4, _0x8de793, _0x2174c1, _0x2efe42) {
    if (_0x2174c1) {
      this.apiId = parseInt(_0x2174c1, 10);
    }
    if (_0x2efe42) {
      this.apiHash = _0x2efe42;
    }
    for (const [_0x1daa5a, _0x55edb2] of [[1, true], [2, false]]) {
      this.logger.info("[Telegram] sendPhoneCode attempt " + _0x1daa5a + " (useWSS=" + _0x55edb2 + ")");
      const _0x22f69d = this._buildLoginSession(_0x8de793, _0x55edb2);
      try {
        await Promise.race([_0x22f69d.codeRequestedPromise, new Promise((_0x5e87d3, _0x116a6c) => setTimeout(() => _0x116a6c(new Error("Attempt " + _0x1daa5a + " timed out")), _0x1daa5a === 1 ? 20000 : 25000))]);
        this.pendingLogins.set(_0x5098d4, {
          client: _0x22f69d.client,
          phoneNumber: _0x8de793,
          loginPromise: _0x22f69d.loginPromise,
          resolveCode: _0x22f69d.resolveCode,
          resolvePassword: _0x22f69d.resolvePassword,
          needs2FAPromise: _0x22f69d.needs2FAPromise,
          awaitingPassword: false,
          apiId: this.apiId,
          apiHash: this.apiHash
        });
        return {
          success: true
        };
      } catch (_0x19a55f) {
        this.logger.warn("[Telegram] attempt " + _0x1daa5a + " failed: " + _0x19a55f.message);
        try {
          _0x22f69d.client.disconnect();
        } catch (_0x215f72) {}
        if (_0x1daa5a === 2) {
          throw new Error("Cannot reach Telegram servers. Please verify your API ID / API Hash are correct at my.telegram.org, and that your internet connection is not blocking Telegram.");
        }
      }
    }
  }
  async verifyCode(_0x384eac, _0x11d59b, _0x10c548 = null) {
    const _0x34f711 = this.pendingLogins.get(_0x384eac);
    if (!_0x34f711) {
      throw new Error("No pending login for this session");
    }
    const {
      client: _0x103db3,
      phoneNumber: _0x5a07f1,
      loginPromise: _0x3febee,
      resolveCode: _0x19b0a4,
      resolvePassword: _0x30ee9f,
      needs2FAPromise: _0x42fcdb,
      apiId: _0x43e191,
      apiHash: _0x4717d9
    } = _0x34f711;
    if (_0x34f711.awaitingPassword) {
      _0x30ee9f(_0x10c548 || _0x11d59b);
      await Promise.race([_0x3febee, new Promise((_0x5ab714, _0x229053) => setTimeout(() => _0x229053(new Error("2FA verification timed out")), 60000))]);
    } else {
      _0x19b0a4(_0x11d59b);
      const _0x3d90d6 = await Promise.race([_0x3febee.then(() => ({
        type: "done"
      })), _0x42fcdb.then(() => ({
        type: "2fa"
      })), new Promise((_0x3e17f6, _0x474bcc) => setTimeout(() => _0x474bcc(new Error("Verification timed out")), 120000))]);
      if (_0x3d90d6.type === "2fa") {
        _0x34f711.awaitingPassword = true;
        return {
          success: false,
          requires2FA: true
        };
      }
    }
    const _0x2d59d4 = await _0x103db3.getMe();
    const _0x347f9f = _0x103db3.session.save();
    const _0x5f0a61 = {
      id: _0x2d59d4.id?.toString(),
      username: _0x2d59d4.username || "",
      firstName: _0x2d59d4.firstName || "",
      lastName: _0x2d59d4.lastName || "",
      phone: _0x5a07f1,
      displayName: [_0x2d59d4.firstName, _0x2d59d4.lastName].filter(Boolean).join(" ") || _0x2d59d4.username || _0x5a07f1
    };
    await this._saveSessionToDB(_0x384eac, _0x347f9f, _0x5f0a61, _0x43e191, _0x4717d9);
    this.clients.set(_0x384eac, _0x103db3);
    this.pendingLogins.delete(_0x384eac);
    this._attachMessageHandler(_0x384eac, _0x103db3);
    return {
      success: true,
      sessionId: _0x384eac,
      userInfo: _0x5f0a61
    };
  }
  async disconnectSession(_0x126e07) {
    const _0x246989 = this.clients.get(_0x126e07);
    if (_0x246989) {
      try {
        await _0x246989.disconnect();
      } catch (_0x4ee099) {}
      this.clients.delete(_0x126e07);
    }
    await this._updateSessionStatus(_0x126e07, "disconnected");
  }
  async deleteSession(_0x27d664) {
    await this.disconnectSession(_0x27d664);
    await this.db.query("DELETE FROM telegram_sessions WHERE session_id = ?", [_0x27d664]);
  }
  async disconnectAll() {
    this.logger.info("[Telegram] Disconnecting all sessions for data reset...");
    const _0x26610a = Array.from(this.clients.keys());
    await Promise.allSettled(_0x26610a.map(_0x3be005 => {
      const _0x5ba51f = this.clients.get(_0x3be005);
      if (_0x5ba51f) {
        return _0x5ba51f.disconnect().catch(() => {});
      } else {
        return Promise.resolve();
      }
    }));
    this.clients.clear();
    this.sessions.clear();
    this.messageHandlers.clear();
    this.pendingLogins.clear();
    this.logger.info("[Telegram] All sessions disconnected and cleared.");
  }
  async getSessions() {
    const _0x3431c4 = await this.db.query("SELECT * FROM telegram_sessions ORDER BY created_at DESC");
    const _0x16c768 = _0x3431c4 && _0x3431c4.data ? _0x3431c4.data : [];
    return _0x16c768.map(_0x45d0a9 => ({
      ..._0x45d0a9,
      isConnected: this.clients.has(_0x45d0a9.session_id)
    }));
  }
  _resolvePeer(_0x2a36a6) {
    if (typeof _0x2a36a6 === "bigint") {
      return _0x2a36a6;
    }
    if (typeof _0x2a36a6 === "number") {
      return BigInt(_0x2a36a6);
    }
    if (typeof _0x2a36a6 === "string" && /^-?[0-9]+$/.test(_0x2a36a6)) {
      return BigInt(_0x2a36a6);
    }
    return _0x2a36a6;
  }
  async sendMessage(_0x5e7779, _0x2838e6, _0x1e0ac7, _0x467afc = {}) {
    const _0x3d451f = this.clients.get(_0x5e7779);
    if (!_0x3d451f) {
      throw new Error("Session " + _0x5e7779 + " not connected");
    }
    const _0x1675f0 = await _0x3d451f.sendMessage(this._resolvePeer(_0x2838e6), {
      message: _0x1e0ac7,
      ..._0x467afc
    });
    return {
      success: true,
      messageId: _0x1675f0.id
    };
  }
  async sendFile(_0x3b4ae5, _0xdb5dbd, _0x56de7e, _0x2db080 = "") {
    const _0x41005b = this.clients.get(_0x3b4ae5);
    if (!_0x41005b) {
      throw new Error("Session " + _0x3b4ae5 + " not connected");
    }
    const _0x1b7e63 = await _0x41005b.sendFile(_0xdb5dbd, {
      file: _0x56de7e,
      caption: _0x2db080
    });
    return {
      success: true,
      messageId: _0x1b7e63.id
    };
  }
  async getDialogs(_0x56a455, _0x532fc4 = 50) {
    const _0x1859d4 = this.clients.get(_0x56a455);
    if (!_0x1859d4) {
      throw new Error("Session " + _0x56a455 + " not connected");
    }
    const _0x33bec9 = await _0x1859d4.getDialogs({
      limit: _0x532fc4
    });
    return _0x33bec9.map(_0x23645a => ({
      id: _0x23645a.id?.toString(),
      title: _0x23645a.title || _0x23645a.name || "",
      type: _0x23645a.isChannel ? "channel" : _0x23645a.isGroup ? "group" : "user",
      unread: _0x23645a.unreadCount || 0,
      lastMsg: _0x23645a.message?.message || "",
      lastDate: _0x23645a.message?.date ? new Date(_0x23645a.message.date * 1000).toISOString() : null,
      username: _0x23645a.entity?.username || "",
      phone: _0x23645a.entity?.phone || ""
    }));
  }
  async getGroups(_0xfe4ece) {
    const _0x5032bc = this.clients.get(_0xfe4ece);
    if (!_0x5032bc) {
      throw new Error("Session " + _0xfe4ece + " not connected");
    }
    const _0x1755f8 = await _0x5032bc.getDialogs({
      limit: 200
    });
    return _0x1755f8.filter(_0x3e3fbc => _0x3e3fbc.isGroup || _0x3e3fbc.isChannel).map(_0x1bf146 => ({
      id: _0x1bf146.id?.toString(),
      title: _0x1bf146.title || "",
      type: _0x1bf146.isChannel ? "channel" : "group",
      members: _0x1bf146.entity?.participantsCount || 0,
      username: _0x1bf146.entity?.username || ""
    }));
  }
  async getMessages(_0xc7a506, _0x45e1f2, _0x1a591b = 50) {
    const _0xe61a28 = this.clients.get(_0xc7a506);
    if (!_0xe61a28) {
      throw new Error("Session " + _0xc7a506 + " not connected");
    }
    const _0xbe4b35 = await _0xe61a28.getMessages(this._resolvePeer(_0x45e1f2), {
      limit: _0x1a591b
    });
    return _0xbe4b35.map(_0x38bdd1 => {
      const _0x333aed = _0x38bdd1.media ? _0x38bdd1.media.className : null;
      let _0x3d8854 = null;
      let _0x4cbcd0 = null;
      if (_0x38bdd1.media?.className === "MessageMediaPhoto") {
        _0x3d8854 = "image/jpeg";
      } else if (_0x38bdd1.media?.className === "MessageMediaDocument") {
        _0x3d8854 = _0x38bdd1.media.document?.mimeType || null;
        const _0x4a3dd5 = (_0x38bdd1.media.document?.attributes || []).find(_0x106b60 => _0x106b60.className === "DocumentAttributeFilename");
        if (_0x4a3dd5) {
          _0x4cbcd0 = _0x4a3dd5.fileName;
        }
      }
      return {
        id: _0x38bdd1.id?.toString(),
        text: _0x38bdd1.message || "",
        fromId: _0x38bdd1.fromId?.toString() || "",
        date: _0x38bdd1.date ? new Date(_0x38bdd1.date * 1000).toISOString() : null,
        out: _0x38bdd1.out || false,
        mediaType: _0x333aed,
        mimeType: _0x3d8854,
        fileName: _0x4cbcd0
      };
    });
  }
  async downloadMessageMedia(_0x532f8c, _0xb6426, _0xa47aea) {
    const _0x204bf0 = this.clients.get(_0x532f8c);
    if (!_0x204bf0) {
      throw new Error("Session " + _0x532f8c + " not connected");
    }
    const _0x42b3aa = await _0x204bf0.getMessages(this._resolvePeer(_0xb6426), {
      ids: [parseInt(_0xa47aea, 10)]
    });
    const _0x112249 = _0x42b3aa[0];
    if (!_0x112249 || !_0x112249.media) {
      return null;
    }
    const _0x5e895c = await _0x204bf0.downloadMedia(_0x112249, {
      workers: 1
    });
    if (!_0x5e895c) {
      return null;
    }
    let _0x50aa20 = "application/octet-stream";
    let _0x31dc87 = null;
    if (_0x112249.media.className === "MessageMediaPhoto") {
      _0x50aa20 = "image/jpeg";
    } else if (_0x112249.media.className === "MessageMediaDocument") {
      _0x50aa20 = _0x112249.media.document?.mimeType || _0x50aa20;
      const _0x1b17b6 = (_0x112249.media.document?.attributes || []).find(_0x2c8c47 => _0x2c8c47.className === "DocumentAttributeFilename");
      if (_0x1b17b6) {
        _0x31dc87 = _0x1b17b6.fileName;
      }
    }
    const _0x4b7774 = "data:" + _0x50aa20 + ";base64," + _0x5e895c.toString("base64");
    return {
      dataUrl: _0x4b7774,
      mimeType: _0x50aa20,
      fileName: _0x31dc87
    };
  }
  async broadcastMessages(_0x2ff4b0, _0x4bb5d5, _0x1af94a, _0x577d40 = 3000, _0x2c4c53 = null) {
    const _0x4c532f = [];
    for (let _0x6d4f77 = 0; _0x6d4f77 < _0x4bb5d5.length; _0x6d4f77++) {
      const _0x27ec9c = _0x4bb5d5[_0x6d4f77];
      try {
        await this.sendMessage(_0x2ff4b0, _0x27ec9c, _0x1af94a);
        _0x4c532f.push({
          chatId: _0x27ec9c,
          status: "sent"
        });
      } catch (_0x4b0dad) {
        _0x4c532f.push({
          chatId: _0x27ec9c,
          status: "failed",
          error: _0x4b0dad.message
        });
      }
      if (_0x2c4c53) {
        _0x2c4c53(_0x6d4f77 + 1, _0x4bb5d5.length, _0x4c532f[_0x6d4f77]);
      }
      if (_0x6d4f77 < _0x4bb5d5.length - 1) {
        await new Promise(_0x13619d => setTimeout(_0x13619d, _0x577d40));
      }
    }
    return _0x4c532f;
  }
  _attachMessageHandler(_0x1ab6d6, _0x2e4631) {
    _0x2e4631.addEventHandler(async _0x2297c1 => {
      try {
        const _0x3e7d7a = _0x2297c1.message;
        if (!_0x3e7d7a) {
          return;
        }
        let _0x3e9316;
        try {
          const _0x5a509b = _0x3e7d7a.peerId;
          if (_0x5a509b?.channelId != null) {
            _0x3e9316 = _0x5a509b.channelId.toString();
          } else if (_0x5a509b?.chatId != null) {
            _0x3e9316 = _0x5a509b.chatId.toString();
          } else if (_0x5a509b?.userId != null) {
            _0x3e9316 = _0x5a509b.userId.toString();
          } else {
            _0x3e9316 = _0x3e7d7a.chatId?.toString() || "";
          }
        } catch (_0x2efa58) {
          _0x3e9316 = _0x3e7d7a.chatId?.toString() || "";
        }
        const _0x35764a = _0x3e7d7a.message || "";
        const _0x427258 = _0x3e7d7a.date ? new Date(_0x3e7d7a.date * 1000).toISOString() : new Date().toISOString();
        const _0x318026 = _0x3e7d7a.out || false;
        let _0x18d9f2 = null;
        let _0x5b5bfa = null;
        let _0x29d660 = null;
        if (_0x3e7d7a.media) {
          _0x18d9f2 = _0x3e7d7a.media.className;
          if (_0x18d9f2 === "MessageMediaPhoto") {
            _0x5b5bfa = "image/jpeg";
          } else if (_0x18d9f2 === "MessageMediaDocument") {
            _0x5b5bfa = _0x3e7d7a.media.document?.mimeType || null;
            const _0x26416d = (_0x3e7d7a.media.document?.attributes || []).find(_0x51e43d => _0x51e43d.className === "DocumentAttributeFilename");
            if (_0x26416d) {
              _0x29d660 = _0x26416d.fileName;
            }
          }
        }
        const _0x2669e5 = {
          sessionId: _0x1ab6d6,
          chatId: _0x3e9316,
          messageId: _0x3e7d7a.id?.toString(),
          text: _0x35764a,
          date: _0x427258,
          isOut: _0x318026,
          mediaType: _0x18d9f2,
          mimeType: _0x5b5bfa,
          fileName: _0x29d660
        };
        try {
          await this.db.query("INSERT OR IGNORE INTO telegram_messages (session_id, chat_id, message_id, sender_type, content, message_type, timestamp)\n             VALUES (?, ?, ?, ?, ?, 'text', ?)", [_0x1ab6d6, _0x3e9316, _0x2669e5.messageId, _0x318026 ? "agent" : "customer", _0x35764a, _0x427258]);
        } catch (_0x2c1e5d) {}
        if (!_0x318026 && _0x35764a) {
          this.processAutoReply(_0x1ab6d6, _0x3e9316, _0x35764a).catch(() => {});
        }
        const _0x41fe02 = this.messageHandlers.get(_0x1ab6d6);
        if (_0x41fe02) {
          _0x41fe02.forEach(_0x1206e5 => {
            try {
              _0x1206e5(_0x2669e5);
            } catch (_0x115e65) {}
          });
        }
      } catch (_0x492495) {
        this.logger.error("[Telegram] Handler error:", _0x492495.message);
      }
    }, new NewMessage({}));
  }
  onMessage(_0x3d7f8a, _0x52176d) {
    if (!this.messageHandlers.has(_0x3d7f8a)) {
      this.messageHandlers.set(_0x3d7f8a, new Set());
    }
    this.messageHandlers.get(_0x3d7f8a).add(_0x52176d);
    return () => this.messageHandlers.get(_0x3d7f8a).delete(_0x52176d);
  }
  async getAutoReplies(_0x2da10d) {
    const _0x54c6db = await this.db.query("SELECT * FROM telegram_auto_replies WHERE session_id = ? ORDER BY id DESC", [_0x2da10d]);
    if (_0x54c6db && _0x54c6db.data) {
      return _0x54c6db.data;
    } else {
      return [];
    }
  }
  async saveAutoReply(_0x40434b, _0x324f01) {
    if (_0x324f01.id) {
      await this.db.query("UPDATE telegram_auto_replies SET name=?, trigger_keywords=?, match_type=?, response_type=?, response_text=?, is_active=?, cooldown_minutes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [_0x324f01.name, _0x324f01.trigger_keywords, _0x324f01.match_type || "contains", _0x324f01.response_type || "text", _0x324f01.response_text, _0x324f01.is_active !== false ? 1 : 0, _0x324f01.cooldown_minutes || 0, _0x324f01.id]);
    } else {
      await this.db.query("INSERT INTO telegram_auto_replies (session_id, name, trigger_keywords, match_type, response_type, response_text, is_active, cooldown_minutes) VALUES (?,?,?,?,?,?,?,?)", [_0x40434b, _0x324f01.name, _0x324f01.trigger_keywords, _0x324f01.match_type || "contains", _0x324f01.response_type || "text", _0x324f01.response_text, _0x324f01.is_active !== false ? 1 : 0, _0x324f01.cooldown_minutes || 0]);
    }
    return {
      success: true
    };
  }
  async deleteAutoReply(_0x3e583e) {
    await this.db.query("DELETE FROM telegram_auto_replies WHERE id = ?", [_0x3e583e]);
    return {
      success: true
    };
  }
  async processAutoReply(_0x20b8f1, _0x3d6700, _0x34cd8b) {
    const _0x4b50c6 = await this.getAutoReplies(_0x20b8f1);
    const _0x1598ab = _0x4b50c6.find(_0x4ac934 => _0x4ac934.is_active && _0x4ac934.match_type === "welcome");
    if (_0x1598ab && _0x1598ab.response_text) {
      if (!this._welcomedChats) {
        this._welcomedChats = new Map();
      }
      const _0x3c7452 = this._welcomedChats.get(_0x20b8f1) || new Set();
      if (!_0x3c7452.has(String(_0x3d6700))) {
        _0x3c7452.add(String(_0x3d6700));
        this._welcomedChats.set(_0x20b8f1, _0x3c7452);
        await this.sendMessage(_0x20b8f1, _0x3d6700, _0x1598ab.response_text).catch(() => {});
      }
    }
    for (const _0x392cc3 of _0x4b50c6) {
      if (!_0x392cc3.is_active || _0x392cc3.match_type === "welcome") {
        continue;
      }
      const _0x35423d = (_0x392cc3.trigger_keywords || "").split(",").map(_0x299513 => _0x299513.trim().toLowerCase());
      const _0x345b95 = (_0x34cd8b || "").toLowerCase();
      const _0x4b4e5b = _0x392cc3.match_type === "exact" ? _0x35423d.includes(_0x345b95) : _0x35423d.some(_0x222b41 => _0x345b95.includes(_0x222b41));
      if (_0x4b4e5b && _0x392cc3.response_text) {
        await this.sendMessage(_0x20b8f1, _0x3d6700, _0x392cc3.response_text);
        return true;
      }
    }
    try {
      const _0x1137e7 = await this.getAISettings(_0x20b8f1);
      if (_0x1137e7 && Number(_0x1137e7.is_active) === 1 && _0x1137e7.api_key) {
        const _0xb8b832 = await this.callAI(_0x34cd8b, _0x1137e7);
        if (_0xb8b832) {
          await this.sendMessage(_0x20b8f1, _0x3d6700, _0xb8b832);
          return true;
        }
      }
    } catch (_0x860026) {
      this.logger.error("[Telegram AI] callAI failed:", _0x860026.message);
    }
    return false;
  }
  async callAI(_0x16b213, _0x4c05b1) {
    const {
      provider: _0x402306,
      api_key: _0x21c8a9,
      model: _0x2f22a7,
      system_prompt: _0x234c2d
    } = _0x4c05b1;
    if (_0x402306 === "openai" || _0x402306 === "groq") {
      const _0xc1e87d = require("openai");
      const _0x26ecc4 = {
        apiKey: _0x21c8a9
      };
      if (_0x402306 === "groq") {
        _0x26ecc4.baseURL = "https://api.groq.com/openai/v1";
      }
      const _0x3508b5 = new _0xc1e87d(_0x26ecc4);
      const _0x5ca839 = [];
      if (_0x234c2d) {
        _0x5ca839.push({
          role: "system",
          content: _0x234c2d
        });
      }
      _0x5ca839.push({
        role: "user",
        content: _0x16b213
      });
      const _0x208758 = await _0x3508b5.chat.completions.create({
        model: _0x2f22a7 || (_0x402306 === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini"),
        messages: _0x5ca839,
        max_tokens: 500
      });
      return _0x208758.choices?.[0]?.message?.content?.trim() || "";
    }
    if (_0x402306 === "anthropic") {
      const _0x493ee4 = require("node-fetch");
      const _0x2708b0 = {
        model: _0x2f22a7 || "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: _0x16b213
        }]
      };
      if (_0x234c2d) {
        _0x2708b0.system = _0x234c2d;
      }
      const _0x4ed25e = await _0x493ee4("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": _0x21c8a9,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify(_0x2708b0)
      });
      const _0x157d29 = await _0x4ed25e.json();
      return _0x157d29.content?.[0]?.text?.trim() || "";
    }
    return "";
  }
  async getAISettings(_0x4e8261) {
    const _0x2af105 = await this.db.query("SELECT * FROM telegram_ai_settings WHERE session_id = ?", [_0x4e8261]);
    const _0x201a10 = _0x2af105 && _0x2af105.data ? _0x2af105.data : [];
    return _0x201a10[0] || null;
  }
  async saveAISettings(_0x52481d, _0x29199f) {
    await this.db.query("INSERT INTO telegram_ai_settings (session_id, is_active, provider, api_key, model, system_prompt, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n       ON CONFLICT(session_id) DO UPDATE SET\n         is_active=excluded.is_active, provider=excluded.provider, api_key=excluded.api_key,\n         model=excluded.model, system_prompt=excluded.system_prompt, updated_at=CURRENT_TIMESTAMP", [_0x52481d, _0x29199f.is_active ? 1 : 0, _0x29199f.provider || "openai", _0x29199f.api_key || "", _0x29199f.model || "gpt-4o-mini", _0x29199f.system_prompt || ""]);
    return {
      success: true
    };
  }
  async getConversations(_0x3cb9d8) {
    const _0x5e1d5a = await this.db.query("SELECT * FROM telegram_conversations WHERE session_id = ? ORDER BY last_message_at DESC", [_0x3cb9d8]);
    if (_0x5e1d5a && _0x5e1d5a.data) {
      return _0x5e1d5a.data;
    } else {
      return [];
    }
  }
  async getChatMessages(_0x1331b4, _0xfa7806, _0x23a106 = 50, _0x1896ee = 0) {
    const _0x37932d = await this.db.query("SELECT * FROM telegram_messages WHERE session_id = ? AND chat_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?", [_0x1331b4, _0xfa7806, _0x23a106, _0x1896ee]);
    if (_0x37932d && _0x37932d.data) {
      return _0x37932d.data;
    } else {
      return [];
    }
  }
  async upsertConversation(_0x29ba7b, _0x39b50a, _0x15cd37) {
    await this.db.query("INSERT INTO telegram_conversations (session_id, chat_id, chat_type, title, username, last_message, last_message_at)\n       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n       ON CONFLICT(session_id, chat_id) DO UPDATE SET\n         title=excluded.title, last_message=excluded.last_message, last_message_at=CURRENT_TIMESTAMP", [_0x29ba7b, _0x39b50a, _0x15cd37.type || "user", _0x15cd37.title || _0x39b50a, _0x15cd37.username || "", _0x15cd37.lastMessage || ""]);
  }
}
module.exports = TelegramService;