const TITLE_MIN = 1;
const TITLE_MAX = 100;
const DESC_MIN = 0;
const DESC_MAX = 300;
const THUMB_MAX_BYTES = 5242880;
const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>()"']+/i;
class LinkPreviewValidationError extends Error {
  constructor(_0x3d50fe) {
    super("Invalid link preview metadata: " + _0x3d50fe);
    this.name = "LinkPreviewValidationError";
    this.code = "INVALID_LINK_PREVIEW_METADATA";
    this.field = _0x3d50fe;
  }
}
class LinkPreviewService {
  constructor({
    logger: _0x44561f,
    urlInfoFetcher: _0x36f32e
  } = {}) {
    this.logger = _0x44561f || console;
    this._urlInfoFetcher = _0x36f32e || null;
  }
  extractFirstUrl(_0x9b78a2) {
    if (typeof _0x9b78a2 !== "string" || _0x9b78a2.length === 0) {
      return null;
    }
    const _0x830939 = _0x9b78a2.match(URL_REGEX);
    if (!_0x830939) {
      return null;
    }
    let _0x2205cc = _0x830939[0];
    _0x2205cc = _0x2205cc.replace(/[).,!?;:'"\]]+$/, "");
    if (_0x2205cc.length > 0) {
      return _0x2205cc;
    } else {
      return null;
    }
  }
  validateCustomMetadata(_0x3d1a9e) {
    if (_0x3d1a9e === null || _0x3d1a9e === undefined) {
      return {
        valid: true
      };
    }
    const _0x49a335 = _0x3d1a9e.title;
    if (typeof _0x49a335 !== "string") {
      return {
        valid: false,
        field: "title"
      };
    }
    if (_0x49a335.length < TITLE_MIN || _0x49a335.length > TITLE_MAX) {
      return {
        valid: false,
        field: "title"
      };
    }
    const _0x4b0c0a = _0x3d1a9e.description;
    if (_0x4b0c0a !== null && _0x4b0c0a !== undefined) {
      if (typeof _0x4b0c0a !== "string") {
        return {
          valid: false,
          field: "description"
        };
      }
      if (_0x4b0c0a.length < DESC_MIN || _0x4b0c0a.length > DESC_MAX) {
        return {
          valid: false,
          field: "description"
        };
      }
    }
    const _0x29e30b = _0x3d1a9e.thumbnail;
    if (_0x29e30b !== null && _0x29e30b !== undefined) {
      const _0x416283 = this._thumbnailByteSize(_0x29e30b);
      if (_0x416283 === null || _0x416283 > THUMB_MAX_BYTES) {
        return {
          valid: false,
          field: "thumbnail"
        };
      }
    }
    return {
      valid: true
    };
  }
  async buildPreview(_0x538b4b, _0x5e0cb5, {
    timeoutMs = 10000
  } = {}) {
    if (typeof _0x538b4b !== "string" || _0x538b4b.length === 0) {
      return {
        preview: null,
        warning: "No URL available for link preview"
      };
    }
    if (_0x5e0cb5 !== null && _0x5e0cb5 !== undefined) {
      const {
        valid: _0x2f76f1,
        field: _0x50ff44
      } = this.validateCustomMetadata(_0x5e0cb5);
      if (!_0x2f76f1) {
        throw new LinkPreviewValidationError(_0x50ff44);
      }
      return {
        preview: this._buildCustomPreview(_0x538b4b, _0x5e0cb5)
      };
    }
    try {
      const _0x4647c1 = await this._fetchWithTimeout(_0x538b4b, timeoutMs);
      if (!_0x4647c1) {
        return {
          preview: null,
          warning: "Link preview unavailable: no metadata could be fetched for the URL"
        };
      }
      return {
        preview: _0x4647c1
      };
    } catch (_0x4ad58c) {
      const _0x2103d9 = _0x4ad58c && _0x4ad58c.code === "LINK_PREVIEW_TIMEOUT" ? "Link preview unavailable: fetch exceeded " + timeoutMs + "ms" : "Link preview unavailable: " + (_0x4ad58c && _0x4ad58c.message ? _0x4ad58c.message : "fetch failed");
      if (this.logger && typeof this.logger.debug === "function") {
        this.logger.debug({
          url: _0x538b4b,
          err: _0x4ad58c && _0x4ad58c.stack
        }, "Link preview auto-fetch failed");
      }
      return {
        preview: null,
        warning: _0x2103d9
      };
    }
  }
  _buildCustomPreview(_0x874ba9, _0x4d5d71) {
    const _0x468edb = {
      "canonical-url": _0x874ba9,
      "matched-text": _0x874ba9,
      title: _0x4d5d71.title,
      description: typeof _0x4d5d71.description === "string" ? _0x4d5d71.description : ""
    };
    if (_0x4d5d71.thumbnail !== null && _0x4d5d71.thumbnail !== undefined) {
      _0x468edb.jpegThumbnail = _0x4d5d71.thumbnail;
    }
    return _0x468edb;
  }
  async _fetchWithTimeout(_0x4da988, _0x3f5dca) {
    const _0x16433e = this._getFetcher();
    if (!_0x16433e) {
      return undefined;
    }
    let _0x7d4f40;
    const _0xc04aa1 = new Promise((_0x4a7d26, _0x3f5cf5) => {
      _0x7d4f40 = setTimeout(() => {
        const _0x402bf6 = new Error("Link preview fetch timed out after " + _0x3f5dca + "ms");
        _0x402bf6.code = "LINK_PREVIEW_TIMEOUT";
        _0x3f5cf5(_0x402bf6);
      }, _0x3f5dca);
      if (_0x7d4f40 && typeof _0x7d4f40.unref === "function") {
        _0x7d4f40.unref();
      }
    });
    try {
      return await Promise.race([Promise.resolve().then(() => _0x16433e(_0x4da988, {
        timeoutMs: _0x3f5dca
      })), _0xc04aa1]);
    } finally {
      clearTimeout(_0x7d4f40);
    }
  }
  _getFetcher() {
    if (this._urlInfoFetcher) {
      return this._urlInfoFetcher;
    }
    try {
      const {
        getUrlInfo: _0x2f1664
      } = require("@innovatorssoft/baileys/lib/Utils/link-preview");
      if (typeof _0x2f1664 === "function") {
        this._urlInfoFetcher = (_0x135bc1, {
          timeoutMs: _0x5c0c1e
        }) => _0x2f1664(_0x135bc1, {
          thumbnailWidth: 192,
          fetchOpts: {
            timeout: _0x5c0c1e
          },
          logger: this.logger
        });
        return this._urlInfoFetcher;
      }
    } catch (_0x1885f0) {
      if (this.logger && typeof this.logger.debug === "function") {
        this.logger.debug({
          err: _0x1885f0 && _0x1885f0.message
        }, "WA_Library link preview helper unavailable");
      }
    }
    return null;
  }
  _thumbnailByteSize(_0x280faa) {
    if (typeof _0x280faa === "number" && Number.isFinite(_0x280faa)) {
      if (_0x280faa >= 0) {
        return _0x280faa;
      } else {
        return null;
      }
    }
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(_0x280faa)) {
      return _0x280faa.length;
    }
    if (_0x280faa instanceof ArrayBuffer) {
      return _0x280faa.byteLength;
    }
    if (ArrayBuffer.isView(_0x280faa)) {
      return _0x280faa.byteLength;
    }
    if (typeof _0x280faa === "object" && _0x280faa !== null) {
      if (typeof _0x280faa.size === "number") {
        return _0x280faa.size;
      }
      if (typeof _0x280faa.byteLength === "number") {
        return _0x280faa.byteLength;
      }
      if (typeof _0x280faa.length === "number") {
        return _0x280faa.length;
      }
    }
    return null;
  }
}
module.exports = LinkPreviewService;
module.exports.LinkPreviewService = LinkPreviewService;
module.exports.LinkPreviewValidationError = LinkPreviewValidationError;