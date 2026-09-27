const PHONE_JID_RE = /^\d+@s\.whatsapp\.net$/;
const LID_JID_RE = /^[\w.-]+@lid$/;
const DIGITS_INPUT_RE = /^\+?\d+$/;
const USERNAME_MAX_LENGTH = 30;
class RecipientResolver {
  constructor({
    databaseService: _0xc46af9,
    getSocket: _0x1fc765,
    logger: _0x3495e6
  } = {}) {
    this.db = _0xc46af9;
    this.getSocket = _0x1fc765;
    this.logger = _0x3495e6 || console;
  }
  classifyIdentity(_0x357bb7) {
    if (typeof _0x357bb7 !== "string") {
      return "unknown";
    }
    const _0x19fa43 = _0x357bb7.trim();
    if (PHONE_JID_RE.test(_0x19fa43)) {
      return "phone";
    }
    if (LID_JID_RE.test(_0x19fa43)) {
      return "lid";
    }
    return "unknown";
  }
  isValidUsernameFormat(_0x1dd7e5) {
    if (typeof _0x1dd7e5 !== "string") {
      return false;
    }
    return _0x1dd7e5.length >= 1 && _0x1dd7e5.length <= USERNAME_MAX_LENGTH;
  }
  async resolveUsername(_0x54db16, _0x925938, {
    timeoutMs = 10000
  } = {}) {
    if (!this.isValidUsernameFormat(_0x925938)) {
      this.logger.warn("[RecipientResolver] Invalid username format for session " + _0x54db16 + ": rejecting without USync");
      return {
        unresolved: true,
        reason: "invalid_username_format"
      };
    }
    const _0x271518 = this._getSocket(_0x54db16);
    if (!_0x271518 || typeof _0x271518.findUserByUsername !== "function") {
      this.logger.warn("[RecipientResolver] USync capability unavailable for session " + _0x54db16);
      return {
        unresolved: true,
        reason: "usync_unavailable"
      };
    }
    try {
      const _0x52d0e = await this._withTimeout(Promise.resolve(_0x271518.findUserByUsername(_0x925938)), timeoutMs);
      if (_0x52d0e && typeof _0x52d0e.jid === "string" && _0x52d0e.jid.length > 0) {
        return {
          jid: _0x52d0e.jid
        };
      }
      this.logger.warn("[RecipientResolver] Username not found for session " + _0x54db16);
      return {
        unresolved: true,
        reason: "username_not_found"
      };
    } catch (_0x4d8235) {
      const _0x462709 = _0x4d8235 && _0x4d8235.code === "RESOLVE_TIMEOUT" ? "resolution_timeout" : "resolution_failed";
      this.logger.warn("[RecipientResolver] Username resolution " + _0x462709 + " for session " + _0x54db16 + ": " + (_0x4d8235 && _0x4d8235.message));
      return {
        unresolved: true,
        reason: _0x462709
      };
    }
  }
  async getUsernameForJid(_0x275779, _0x2f9cf0, {
    timeoutMs = 10000
  } = {}) {
    const _0x4dacd2 = this._getSocket(_0x275779);
    if (!_0x4dacd2 || typeof _0x4dacd2.fetchContactUsernames !== "function") {
      return {
        username: null
      };
    }
    try {
      const _0x3020a2 = await this._withTimeout(Promise.resolve(_0x4dacd2.fetchContactUsernames(_0x2f9cf0)), timeoutMs);
      const _0x2a2a4f = Array.isArray(_0x3020a2) ? _0x3020a2 : [];
      const _0x1d1385 = _0x2a2a4f.find(_0x3ea965 => _0x3ea965 && _0x3ea965.id === _0x2f9cf0) || _0x2a2a4f[0];
      if (_0x1d1385 && typeof _0x1d1385.username === "string" && _0x1d1385.username.length > 0) {
        return {
          username: _0x1d1385.username
        };
      }
      return {
        username: null
      };
    } catch (_0x1e2ad8) {
      this.logger.warn("[RecipientResolver] getUsernameForJid failed for session " + _0x275779 + ": " + (_0x1e2ad8 && _0x1e2ad8.message));
      return {
        username: null
      };
    }
  }
  async resolveRecipient(_0x1a9731, _0x3d3be5) {
    const _0x255def = this._parseInput(_0x3d3be5);
    if (!_0x255def) {
      return {
        unresolved: true,
        reason: "empty_recipient"
      };
    }
    if (_0x255def.phoneJid) {
      return {
        jid: _0x255def.phoneJid,
        sendable: true
      };
    }
    if (_0x255def.phoneDigits) {
      return {
        jid: _0x255def.phoneDigits + "@s.whatsapp.net",
        sendable: true
      };
    }
    if (_0x255def.lid) {
      return {
        jid: _0x255def.lid,
        sendable: true
      };
    }
    if (_0x255def.unknownJid) {
      this.logger.warn("[RecipientResolver] Unrecognized identity form for session " + _0x1a9731);
      return {
        unresolved: true,
        reason: "unrecognized_identity"
      };
    }
    if (_0x255def.username != null) {
      const _0x4f3c50 = await this.resolveUsername(_0x1a9731, _0x255def.username);
      if (_0x4f3c50 && _0x4f3c50.jid) {
        return {
          jid: _0x4f3c50.jid,
          sendable: true
        };
      }
      return {
        unresolved: true,
        reason: _0x4f3c50 && _0x4f3c50.reason || "username_not_found"
      };
    }
    return {
      unresolved: true,
      reason: "empty_recipient"
    };
  }
  mergeIdentities(_0x34f986, {
    phone: _0x4d634d,
    lid: _0x1a4bb2
  } = {}) {
    const _0x3c7b1e = {
      ...(_0x34f986 || {})
    };
    const _0x457978 = this._normalizePhoneDigits(_0x4d634d);
    if (_0x457978) {
      _0x3c7b1e.phone_number = _0x457978;
    }
    if (_0x1a4bb2 != null && String(_0x1a4bb2).length > 0) {
      _0x3c7b1e.lid = String(_0x1a4bb2);
    }
    return _0x3c7b1e;
  }
  _getSocket(_0x47d6db) {
    if (typeof this.getSocket !== "function") {
      return null;
    }
    try {
      return this.getSocket(_0x47d6db);
    } catch (_0x2fd11d) {
      this.logger.warn("[RecipientResolver] getSocket threw for session " + _0x47d6db + ": " + (_0x2fd11d && _0x2fd11d.message));
      return null;
    }
  }
  _normalizePhoneDigits(_0xaad1c3) {
    if (_0xaad1c3 == null) {
      return null;
    }
    const _0x46263a = String(_0xaad1c3);
    const _0x3680de = _0x46263a.includes("@") ? _0x46263a.split("@")[0] : _0x46263a;
    const _0x19e491 = _0x3680de.replace(/\D/g, "");
    if (_0x19e491.length > 0) {
      return _0x19e491;
    } else {
      return null;
    }
  }
  _parseInput(_0x5380ed) {
    if (_0x5380ed == null) {
      return null;
    }
    if (typeof _0x5380ed === "string") {
      const _0xebc774 = _0x5380ed.trim();
      if (_0xebc774.length === 0) {
        return null;
      }
      if (_0xebc774.includes("@")) {
        const _0x50036f = this.classifyIdentity(_0xebc774);
        if (_0x50036f === "phone") {
          return {
            phoneJid: _0xebc774
          };
        }
        if (_0x50036f === "lid") {
          return {
            lid: _0xebc774
          };
        }
        return {
          unknownJid: _0xebc774
        };
      }
      if (DIGITS_INPUT_RE.test(_0xebc774)) {
        return {
          phoneDigits: this._normalizePhoneDigits(_0xebc774)
        };
      }
      return {
        username: _0xebc774
      };
    }
    if (typeof _0x5380ed === "object") {
      const _0x4abee4 = {};
      if (_0x5380ed.phone != null && String(_0x5380ed.phone).length > 0) {
        const _0x42b20d = String(_0x5380ed.phone).trim();
        if (this.classifyIdentity(_0x42b20d) === "phone") {
          _0x4abee4.phoneJid = _0x42b20d;
        } else {
          const _0x1a64ac = this._normalizePhoneDigits(_0x42b20d);
          if (_0x1a64ac) {
            _0x4abee4.phoneDigits = _0x1a64ac;
          }
        }
      }
      if (_0x5380ed.lid != null && String(_0x5380ed.lid).length > 0) {
        const _0x7ede81 = String(_0x5380ed.lid).trim();
        if (this.classifyIdentity(_0x7ede81) === "lid") {
          _0x4abee4.lid = _0x7ede81;
        } else {
          _0x4abee4.unknownJid = _0x7ede81;
        }
      }
      if (_0x5380ed.username != null && String(_0x5380ed.username).length > 0) {
        _0x4abee4.username = String(_0x5380ed.username);
      }
      const _0x1979b1 = _0x4abee4.phoneJid || _0x4abee4.phoneDigits || _0x4abee4.lid || _0x4abee4.username != null || _0x4abee4.unknownJid;
      if (_0x1979b1) {
        return _0x4abee4;
      } else {
        return null;
      }
    }
    return null;
  }
  _withTimeout(_0xc17d3a, _0x27c60d) {
    let _0x24d158;
    const _0x578d7b = new Promise((_0x305134, _0x18ee0b) => {
      _0x24d158 = setTimeout(() => {
        const _0x3e6c90 = new Error("Operation timed out after " + _0x27c60d + "ms");
        _0x3e6c90.code = "RESOLVE_TIMEOUT";
        _0x18ee0b(_0x3e6c90);
      }, _0x27c60d);
    });
    return Promise.race([_0xc17d3a, _0x578d7b]).finally(() => {
      if (_0x24d158) {
        clearTimeout(_0x24d158);
      }
    });
  }
}
module.exports = RecipientResolver;