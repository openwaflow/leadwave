const RETRY_REQUEST_TIMEOUT_MS = 5000;
const WAITING_PLACEHOLDER = "Waiting for this message";
const UNRECOVERABLE_MARKER = "⚠️ Message could not be recovered";
const Outcome = Object.freeze({
  REQUESTED: "requested",
  UNRECOVERABLE: "unrecoverable",
  ERROR: "error",
  RECOVERED: "recovered",
  SKIPPED: "skipped"
});
class DecryptionRecovery {
  constructor({
    databaseService: _0x44ed21,
    getSocket: _0x334448,
    maxAttempts = 3,
    logger: _0x190d3a
  } = {}) {
    this.db = _0x44ed21;
    this.getSocket = _0x334448;
    this.maxAttempts = maxAttempts;
    this.logger = _0x190d3a || console;
    this._attempts = new Map();
  }
  async onDecryptionFailure(_0x5ca95a, _0x4947de) {
    if (!_0x5ca95a || !_0x4947de || !_0x4947de.id) {
      this.logger.warn("DecryptionRecovery.onDecryptionFailure called without a valid sessionId/messageKey");
      return {
        status: Outcome.SKIPPED,
        attempts: 0,
        reason: "invalid-arguments"
      };
    }
    const _0x4e75f8 = this.getMaxAttempts();
    const _0x5f58fb = this._trackingKey(_0x5ca95a, _0x4947de);
    const _0x1d84fd = this._attempts.get(_0x5f58fb) || 0;
    if (_0x1d84fd >= _0x4e75f8) {
      await this.markUnrecoverable(_0x5ca95a, _0x4947de);
      this._attempts.delete(_0x5f58fb);
      return {
        status: Outcome.UNRECOVERABLE,
        attempts: _0x1d84fd
      };
    }
    const _0x27034e = _0x1d84fd + 1;
    this._attempts.set(_0x5f58fb, _0x27034e);
    const _0x17fdc5 = this._resolveSocket(_0x5ca95a);
    if (!_0x17fdc5 || typeof _0x17fdc5.requestPlaceholderResend !== "function") {
      this._recordError(_0x5ca95a, _0x4947de, "retry request could not be delivered: no active socket for session");
      return {
        status: Outcome.ERROR,
        attempts: _0x27034e,
        reason: "socket-unavailable"
      };
    }
    try {
      await this._withTimeout(Promise.resolve().then(() => _0x17fdc5.requestPlaceholderResend(_0x4947de)), RETRY_REQUEST_TIMEOUT_MS, "requestPlaceholderResend");
      return {
        status: Outcome.REQUESTED,
        attempts: _0x27034e
      };
    } catch (_0x56f0b8) {
      this._recordError(_0x5ca95a, _0x4947de, "retry request could not be delivered: " + (_0x56f0b8 && _0x56f0b8.message ? _0x56f0b8.message : _0x56f0b8));
      return {
        status: Outcome.ERROR,
        attempts: _0x27034e,
        reason: "request-failed"
      };
    }
  }
  async onRetriedMessage(_0x4ca9f2, _0xbb776f) {
    const _0x1c8682 = _0xbb776f && _0xbb776f.key;
    if (!_0x4ca9f2 || !_0x1c8682 || !_0x1c8682.id) {
      return {
        status: Outcome.SKIPPED,
        reason: "invalid-arguments"
      };
    }
    const _0xcb4c82 = this._extractText(_0xbb776f);
    if (_0xcb4c82 == null) {
      return {
        status: Outcome.SKIPPED,
        reason: "not-decrypted"
      };
    }
    const _0x3da32d = this._trackingKey(_0x4ca9f2, _0x1c8682);
    try {
      const _0x511341 = await this._run("UPDATE incoming_messages\n           SET text = ?, type = ?\n         WHERE id = ? AND session_id = ?", [_0xcb4c82, this._messageType(_0xbb776f), _0x1c8682.id, _0x4ca9f2]);
      this._attempts.delete(_0x3da32d);
      if (_0x511341 && _0x511341.success === false) {
        this.logger.warn("DecryptionRecovery.onRetriedMessage: placeholder update reported failure for " + _0x1c8682.id + ": " + _0x511341.error);
      }
      return {
        status: Outcome.RECOVERED
      };
    } catch (_0x4d7fc9) {
      this._attempts.delete(_0x3da32d);
      this.logger.error("DecryptionRecovery.onRetriedMessage: failed to replace placeholder for " + _0x1c8682.id + ": " + (_0x4d7fc9 && _0x4d7fc9.message ? _0x4d7fc9.message : _0x4d7fc9));
      return {
        status: Outcome.ERROR,
        reason: "update-failed"
      };
    }
  }
  getMaxAttempts() {
    const _0x4c805c = 3;
    const _0x544444 = 1;
    const _0x10e1db = 5;
    const _0x22ad68 = Number(this.maxAttempts);
    if (!Number.isFinite(_0x22ad68)) {
      return _0x4c805c;
    }
    const _0x168e5e = Math.floor(_0x22ad68);
    if (_0x168e5e < _0x544444) {
      return _0x544444;
    }
    if (_0x168e5e > _0x10e1db) {
      return _0x10e1db;
    }
    return _0x168e5e;
  }
  async markUnrecoverable(_0x2e85e2, _0x2e0a8e) {
    const _0x41ee0f = _0x2e0a8e && _0x2e0a8e.id;
    this.logger.warn("DecryptionRecovery: message " + (_0x41ee0f || "<unknown>") + " in session " + _0x2e85e2 + " is unrecoverable after " + this.getMaxAttempts() + " retry attempt(s)");
    if (!_0x2e85e2 || !_0x41ee0f) {
      return {
        status: Outcome.UNRECOVERABLE
      };
    }
    try {
      const _0x4867e9 = await this._run("UPDATE incoming_messages\n           SET text = ?\n         WHERE id = ? AND session_id = ? AND (text IS NULL OR text LIKE ?)", [UNRECOVERABLE_MARKER, _0x41ee0f, _0x2e85e2, "%" + WAITING_PLACEHOLDER + "%"]);
      if (_0x4867e9 && _0x4867e9.success === false) {
        this.logger.warn("DecryptionRecovery.markUnrecoverable: record update reported failure for " + _0x41ee0f + ": " + _0x4867e9.error);
      }
    } catch (_0x3a0788) {
      this.logger.error("DecryptionRecovery.markUnrecoverable: failed to mark " + _0x41ee0f + " unrecoverable: " + (_0x3a0788 && _0x3a0788.message ? _0x3a0788.message : _0x3a0788));
    }
    return {
      status: Outcome.UNRECOVERABLE
    };
  }
  _trackingKey(_0x3eba30, _0x4727ff) {
    const _0x2f13a2 = _0x4727ff.remoteJid || "";
    const _0x4469ce = _0x4727ff.fromMe ? "1" : "0";
    const _0x58a1d0 = _0x4727ff.participant || "";
    return _0x3eba30 + "|" + _0x2f13a2 + "|" + _0x4727ff.id + "|" + _0x4469ce + "|" + _0x58a1d0;
  }
  _resolveSocket(_0x1dc9f2) {
    if (typeof this.getSocket !== "function") {
      return null;
    }
    try {
      return this.getSocket(_0x1dc9f2) || null;
    } catch (_0x1e3fe4) {
      this.logger.warn("DecryptionRecovery: getSocket threw for session " + _0x1dc9f2 + ": " + (_0x1e3fe4 && _0x1e3fe4.message ? _0x1e3fe4.message : _0x1e3fe4));
      return null;
    }
  }
  _recordError(_0x3d6caf, _0x4b3270, _0x47d567) {
    const _0x5149b5 = _0x4b3270 && _0x4b3270.id;
    this.logger.error("DecryptionRecovery: " + _0x47d567 + " (session " + _0x3d6caf + ", message " + (_0x5149b5 || "<unknown>") + "); message left undecryptable");
  }
  async _run(_0xb51b9a, _0x3dd506) {
    if (!this.db) {
      return {
        success: false,
        error: "database service unavailable"
      };
    }
    if (typeof this.db.run === "function") {
      return this.db.run(_0xb51b9a, _0x3dd506);
    }
    if (typeof this.db.query === "function") {
      return this.db.query(_0xb51b9a, _0x3dd506);
    }
    return {
      success: false,
      error: "database service has no run/query method"
    };
  }
  _withTimeout(_0x17f97f, _0x38a4ed, _0x1463a9) {
    let _0x496bef;
    const _0xe9674d = new Promise((_0x1938b3, _0x1fc61c) => {
      _0x496bef = setTimeout(() => _0x1fc61c(new Error(_0x1463a9 + " timed out after " + _0x38a4ed + "ms")), _0x38a4ed);
    });
    return Promise.race([_0x17f97f, _0xe9674d]).finally(() => clearTimeout(_0x496bef));
  }
  _extractText(_0x4f914e) {
    const _0x38253c = _0x4f914e && _0x4f914e.message || null;
    if (!_0x38253c) {
      return null;
    }
    if (typeof _0x38253c.conversation === "string") {
      return _0x38253c.conversation;
    }
    if (_0x38253c.extendedTextMessage && typeof _0x38253c.extendedTextMessage.text === "string") {
      return _0x38253c.extendedTextMessage.text;
    }
    if (_0x38253c.imageMessage) {
      return _0x38253c.imageMessage.caption || "[image]";
    }
    if (_0x38253c.videoMessage) {
      return _0x38253c.videoMessage.caption || "[video]";
    }
    if (_0x38253c.documentMessage) {
      return _0x38253c.documentMessage.fileName || _0x38253c.documentMessage.caption || "[document]";
    }
    if (_0x38253c.audioMessage) {
      return "[voice note]";
    }
    if (_0x38253c.stickerMessage) {
      return "[sticker]";
    }
    return "[message]";
  }
  _messageType(_0x4dcf32) {
    const _0x130214 = _0x4dcf32 && _0x4dcf32.message || {};
    if (_0x130214.imageMessage) {
      return "image";
    }
    if (_0x130214.videoMessage) {
      return "video";
    }
    if (_0x130214.documentMessage) {
      return "document";
    }
    if (_0x130214.audioMessage) {
      return "audio";
    }
    if (_0x130214.stickerMessage) {
      return "sticker";
    }
    return "text";
  }
}
module.exports = DecryptionRecovery;