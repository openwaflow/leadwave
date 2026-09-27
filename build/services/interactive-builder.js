const MAX_BUTTONS = 3;
const BUTTON_TYPES = Object.freeze({
  QUICK_REPLY: "quick_reply",
  CTA_URL: "cta_url",
  CTA_CALL: "cta_call",
  COPY_CODE: "copy_code"
});
const RULES = Object.freeze({
  MISSING_DISPLAY_TEXT: "missing_display_text",
  MISSING_URL: "missing_url",
  INVALID_URL: "invalid_url",
  MISSING_COPY_CODE: "missing_copy_code",
  MISSING_PHONE_NUMBER: "missing_phone_number",
  MAX_BUTTONS: "max_buttons"
});
class ValidationError extends Error {
  constructor(_0x222ae5, _0x3d2781, _0x32f907) {
    super(_0x32f907 || "Interactive button validation failed (index=" + _0x222ae5 + ", rule=" + _0x3d2781 + ")");
    this.name = "ValidationError";
    this.index = _0x222ae5;
    this.rule = _0x3d2781;
  }
}
class InteractiveBuilder {
  constructor({
    logger: _0x1655b3
  } = {}) {
    this.logger = _0x1655b3 || console;
  }
  _displayText(_0x5bb815) {
    if (!_0x5bb815 || typeof _0x5bb815 !== "object") {
      return undefined;
    }
    const _0x260c2e = _0x5bb815.text ?? _0x5bb815.buttonText ?? _0x5bb815.displayText ?? _0x5bb815.display_text;
    if (typeof _0x260c2e !== "string") {
      return undefined;
    }
    const _0x3c5dfd = _0x260c2e.trim();
    if (_0x3c5dfd.length > 0) {
      return _0x260c2e;
    } else {
      return undefined;
    }
  }
  _inferType(_0x2ff48a) {
    if (!_0x2ff48a || typeof _0x2ff48a !== "object") {
      return BUTTON_TYPES.QUICK_REPLY;
    }
    if (_0x2ff48a.type) {
      if (_0x2ff48a.type === "url") {
        return BUTTON_TYPES.CTA_URL;
      }
      if (_0x2ff48a.type === "call") {
        return BUTTON_TYPES.CTA_CALL;
      }
      if (_0x2ff48a.type === "copy" || _0x2ff48a.type === "cta_copy") {
        return BUTTON_TYPES.COPY_CODE;
      }
      if (_0x2ff48a.type === "reply") {
        return BUTTON_TYPES.QUICK_REPLY;
      }
      return _0x2ff48a.type;
    }
    if (_0x2ff48a.url != null) {
      return BUTTON_TYPES.CTA_URL;
    }
    if (_0x2ff48a.phone_number != null || _0x2ff48a.phoneNumber != null || _0x2ff48a.call != null) {
      return BUTTON_TYPES.CTA_CALL;
    }
    if (_0x2ff48a.code != null || _0x2ff48a.copyCode != null || _0x2ff48a.copy != null) {
      return BUTTON_TYPES.COPY_CODE;
    }
    return BUTTON_TYPES.QUICK_REPLY;
  }
  _isValidUrl(_0x532927) {
    if (typeof _0x532927 !== "string" || _0x532927.trim().length === 0) {
      return false;
    }
    try {
      new URL(_0x532927.trim());
      return true;
    } catch (_0x40bc90) {
      return false;
    }
  }
  validateButtons(_0x47a551) {
    const _0x345bb1 = [];
    const _0x5f3509 = Array.isArray(_0x47a551) ? _0x47a551 : [];
    if (_0x5f3509.length > MAX_BUTTONS) {
      _0x345bb1.push({
        index: MAX_BUTTONS,
        rule: RULES.MAX_BUTTONS
      });
    }
    _0x5f3509.forEach((_0x77636b, _0x545215) => {
      const _0x42ecf7 = this._inferType(_0x77636b);
      if (!this._displayText(_0x77636b)) {
        _0x345bb1.push({
          index: _0x545215,
          rule: RULES.MISSING_DISPLAY_TEXT
        });
      }
      switch (_0x42ecf7) {
        case BUTTON_TYPES.CTA_URL:
          {
            const _0x1125c4 = _0x77636b && (_0x77636b.url ?? _0x77636b.merchant_url);
            if (_0x1125c4 == null || String(_0x1125c4).trim().length === 0) {
              _0x345bb1.push({
                index: _0x545215,
                rule: RULES.MISSING_URL
              });
            } else if (!this._isValidUrl(_0x1125c4)) {
              _0x345bb1.push({
                index: _0x545215,
                rule: RULES.INVALID_URL
              });
            }
            break;
          }
        case BUTTON_TYPES.CTA_CALL:
          {
            const _0x378f31 = _0x77636b && (_0x77636b.phone_number ?? _0x77636b.phoneNumber ?? _0x77636b.call);
            if (_0x378f31 == null || String(_0x378f31).trim().length === 0) {
              _0x345bb1.push({
                index: _0x545215,
                rule: RULES.MISSING_PHONE_NUMBER
              });
            }
            break;
          }
        case BUTTON_TYPES.COPY_CODE:
          {
            const _0x4b3012 = _0x77636b && (_0x77636b.code ?? _0x77636b.copyCode ?? _0x77636b.copy);
            if (_0x4b3012 == null || String(_0x4b3012).trim().length === 0) {
              _0x345bb1.push({
                index: _0x545215,
                rule: RULES.MISSING_COPY_CODE
              });
            }
            break;
          }
        default:
          break;
      }
    });
    return {
      valid: _0x345bb1.length === 0,
      errors: _0x345bb1
    };
  }
  mapQuickReply(_0xcd8ad5, _0xd917b6) {
    return {
      text: this._displayText(_0xcd8ad5),
      id: _0xcd8ad5 && (_0xcd8ad5.id ?? _0xcd8ad5.buttonId) || "btn_" + (_0xd917b6 ?? 0)
    };
  }
  mapCopyCode(_0x17c5bf) {
    const _0x1d3186 = _0x17c5bf && (_0x17c5bf.code ?? _0x17c5bf.copyCode ?? _0x17c5bf.copy);
    return {
      text: this._displayText(_0x17c5bf),
      copy: _0x1d3186 != null ? String(_0x1d3186) : undefined
    };
  }
  mapCtaUrl(_0x4f48ff) {
    const _0x53a3c7 = _0x4f48ff && (_0x4f48ff.url ?? _0x4f48ff.merchant_url);
    const _0x33e3e4 = {
      text: this._displayText(_0x4f48ff),
      url: _0x53a3c7 != null ? String(_0x53a3c7).trim() : undefined
    };
    if (_0x4f48ff && (_0x4f48ff.useWebview || _0x4f48ff.webview_interaction)) {
      _0x33e3e4.useWebview = true;
    }
    return _0x33e3e4;
  }
  mapCtaCall(_0x3f6238) {
    const _0x504a32 = _0x3f6238 && (_0x3f6238.phone_number ?? _0x3f6238.phoneNumber ?? _0x3f6238.call);
    return {
      text: this._displayText(_0x3f6238),
      call: _0x504a32 != null ? String(_0x504a32) : undefined
    };
  }
  _mapButton(_0x146e57, _0x3cb29b) {
    switch (this._inferType(_0x146e57)) {
      case BUTTON_TYPES.CTA_URL:
        return this.mapCtaUrl(_0x146e57);
      case BUTTON_TYPES.CTA_CALL:
        return this.mapCtaCall(_0x146e57);
      case BUTTON_TYPES.COPY_CODE:
        return this.mapCopyCode(_0x146e57);
      case BUTTON_TYPES.QUICK_REPLY:
      default:
        return this.mapQuickReply(_0x146e57, _0x3cb29b);
    }
  }
  mapMediaHeader(_0x59677e) {
    if (!_0x59677e || typeof _0x59677e !== "object") {
      return null;
    }
    const _0x457384 = {};
    if (_0x59677e.image != null) {
      _0x457384.image = _0x59677e.image;
    } else if (_0x59677e.video != null) {
      _0x457384.video = _0x59677e.video;
    } else if (_0x59677e.audio != null) {
      _0x457384.audio = _0x59677e.audio;
    } else if (_0x59677e.document != null) {
      _0x457384.document = _0x59677e.document;
      if (_0x59677e.mimetype != null) {
        _0x457384.mimetype = _0x59677e.mimetype;
      }
    } else {
      return null;
    }
    if (_0x59677e.caption != null) {
      _0x457384.caption = _0x59677e.caption;
    }
    return _0x457384;
  }
  _normalizeButtons(_0x419c8c) {
    if (!_0x419c8c || typeof _0x419c8c !== "object") {
      return [];
    }
    if (Array.isArray(_0x419c8c.buttons)) {
      return _0x419c8c.buttons;
    }
    if (Array.isArray(_0x419c8c.interactiveButtons)) {
      return _0x419c8c.interactiveButtons;
    }
    if (_0x419c8c.button && typeof _0x419c8c.button === "object") {
      return [_0x419c8c.button];
    }
    return [];
  }
  buildInteractivePayload(_0x326bf4) {
    const _0x44ed0c = this._normalizeButtons(_0x326bf4);
    const {
      valid: _0x1247af,
      errors: _0x560715
    } = this.validateButtons(_0x44ed0c);
    if (!_0x1247af) {
      const _0x5460ee = _0x560715[0];
      throw new ValidationError(_0x5460ee.index, _0x5460ee.rule);
    }
    const _0x436191 = _0x44ed0c.map((_0x46f078, _0xcf9f3e) => this._mapButton(_0x46f078, _0xcf9f3e));
    const _0x4ad382 = (_0x326bf4 && _0x326bf4.body && typeof _0x326bf4.body === "object" ? _0x326bf4.body.text : undefined) ?? (_0x326bf4 && typeof _0x326bf4.body === "string" ? _0x326bf4.body : undefined) ?? (_0x326bf4 && _0x326bf4.text) ?? "";
    const _0x594e38 = {
      text: _0x4ad382,
      interactiveButtons: _0x436191
    };
    if (_0x326bf4 && _0x326bf4.footer) {
      _0x594e38.footer = typeof _0x326bf4.footer === "string" ? _0x326bf4.footer : _0x326bf4.footer.text;
    }
    if (_0x326bf4 && _0x326bf4.title != null) {
      _0x594e38.title = _0x326bf4.title;
    }
    if (_0x326bf4 && _0x326bf4.subtitle != null) {
      _0x594e38.subtitle = _0x326bf4.subtitle;
    }
    const _0x4e066d = this.mapMediaHeader(_0x326bf4 && _0x326bf4.media);
    if (_0x4e066d) {
      Object.assign(_0x594e38, _0x4e066d);
    }
    return {
      payload: _0x594e38
    };
  }
}
module.exports = InteractiveBuilder;
module.exports.InteractiveBuilder = InteractiveBuilder;
module.exports.ValidationError = ValidationError;
module.exports.RULES = RULES;
module.exports.BUTTON_TYPES = BUTTON_TYPES;
module.exports.MAX_BUTTONS = MAX_BUTTONS;