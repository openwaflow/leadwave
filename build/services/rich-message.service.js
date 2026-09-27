const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 65536;
const DEFAULT_LATEX_TIMEOUT_MS = 10000;
const SUPPORTED_HIGHLIGHT_LANGUAGES = new Set(["bash", "c", "cpp", "csharp", "css", "diff", "go", "graphql", "html", "ini", "java", "javascript", "js", "json", "jsx", "kotlin", "less", "lua", "makefile", "markdown", "md", "objectivec", "perl", "php", "python", "py", "ruby", "rb", "rust", "rs", "scala", "scss", "shell", "sh", "sql", "swift", "typescript", "ts", "tsx", "xml", "yaml", "yml"]);
const LANGUAGE_ALIASES = {
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  node: "javascript",
  nodejs: "javascript",
  zsh: "shell",
  yml: "yaml",
  py3: "python",
  golang: "go"
};
class RichMessageService {
  constructor({
    logger: _0x398063,
    databaseService: _0x41612d,
    latexRenderer: _0x344c56
  } = {}) {
    this.logger = _0x398063 || console;
    this.db = _0x41612d || null;
    this.latexRenderer = _0x344c56 || null;
  }
  validateContent(_0x22d741) {
    if (typeof _0x22d741 !== "string") {
      return {
        valid: false,
        reason: "Rich message content must be text of " + MIN_CONTENT_LENGTH + " to " + MAX_CONTENT_LENGTH + " characters."
      };
    }
    const _0x5daf0d = _0x22d741.length;
    if (_0x5daf0d < MIN_CONTENT_LENGTH || _0x5daf0d > MAX_CONTENT_LENGTH) {
      return {
        valid: false,
        reason: "Rich message content length " + _0x5daf0d + " is outside the permitted range of " + MIN_CONTENT_LENGTH + " to " + MAX_CONTENT_LENGTH + " characters."
      };
    }
    return {
      valid: true
    };
  }
  detectCodeBlocks(_0x387791) {
    if (typeof _0x387791 !== "string" || _0x387791.length === 0) {
      return [];
    }
    const _0x124f0d = [];
    const _0x4fe377 = /^([ \t]*)(`{3,}|~{3,})[ \t]*([^\r\n`]*)\r?\n([\s\S]*?)^\1\2[ \t]*$/gm;
    let _0x54fd37;
    while ((_0x54fd37 = _0x4fe377.exec(_0x387791)) !== null) {
      const _0x494cfe = (_0x54fd37[3] || "").trim();
      const _0x91e82f = _0x494cfe ? _0x494cfe.split(/\s+/)[0] : null;
      _0x124f0d.push({
        language: _0x91e82f || null,
        code: _0x54fd37[4] != null ? _0x54fd37[4].replace(/\r?\n$/, "") : ""
      });
    }
    return _0x124f0d;
  }
  isHighlightSupported(_0x3b6d42) {
    if (typeof _0x3b6d42 !== "string") {
      return false;
    }
    const _0x3d8b51 = _0x3b6d42.trim().toLowerCase();
    if (_0x3d8b51.length === 0) {
      return false;
    }
    const _0x2b8303 = LANGUAGE_ALIASES[_0x3d8b51] || _0x3d8b51;
    return SUPPORTED_HIGHLIGHT_LANGUAGES.has(_0x2b8303);
  }
  detectLatexExpressions(_0x4aed93) {
    if (typeof _0x4aed93 !== "string" || _0x4aed93.length === 0) {
      return [];
    }
    const _0x1f54db = [];
    const _0x219685 = [{
      regex: /\$\$([\s\S]+?)\$\$/g,
      display: true
    }, {
      regex: /\\\[([\s\S]+?)\\\]/g,
      display: true
    }, {
      regex: /\\\(([\s\S]+?)\\\)/g,
      display: false
    }, {
      regex: /(?<![\\$])\$(?!\$)([^\r\n$]+?)\$(?!\$)/g,
      display: false
    }];
    for (const {
      regex: _0x55adec,
      display: _0x15039e
    } of _0x219685) {
      let _0x247bde;
      while ((_0x247bde = _0x55adec.exec(_0x4aed93)) !== null) {
        _0x1f54db.push({
          raw: _0x247bde[0],
          expr: _0x247bde[1].trim(),
          display: _0x15039e
        });
      }
    }
    return _0x1f54db;
  }
  async renderLatexToPng(_0x543923, {
    timeoutMs = DEFAULT_LATEX_TIMEOUT_MS
  } = {}) {
    if (typeof _0x543923 !== "string" || _0x543923.trim().length === 0) {
      return {
        png: null,
        degraded: true,
        reason: "Empty or invalid LaTeX expression."
      };
    }
    if (!this.latexRenderer || typeof this.latexRenderer.renderToPng !== "function") {
      return {
        png: null,
        degraded: true,
        reason: "LaTeX renderer is unavailable; falling back to raw expression text."
      };
    }
    let _0x219155 = null;
    try {
      const _0x8863dc = new Promise((_0x526a8e, _0x1cdd8b) => {
        _0x219155 = setTimeout(() => {
          _0x1cdd8b(new Error("LaTeX rendering exceeded the " + timeoutMs + "ms budget."));
        }, timeoutMs);
      });
      const _0x54fa72 = await Promise.race([Promise.resolve().then(() => this.latexRenderer.renderToPng(_0x543923)), _0x8863dc]);
      if (!_0x54fa72 || !(_0x54fa72 instanceof Buffer) && !(_0x54fa72 instanceof Uint8Array)) {
        return {
          png: null,
          degraded: true,
          reason: "LaTeX renderer did not return a valid PNG image."
        };
      }
      return {
        png: Buffer.isBuffer(_0x54fa72) ? _0x54fa72 : Buffer.from(_0x54fa72),
        degraded: false
      };
    } catch (_0x36a7c0) {
      return {
        png: null,
        degraded: true,
        reason: "LaTeX rendering failed: " + _0x36a7c0.message
      };
    } finally {
      if (_0x219155) {
        clearTimeout(_0x219155);
      }
    }
  }
  async send(_0x57ace3, _0x3f4e58, _0x946919, _0x272566 = {}) {
    const _0x3bb3a5 = [];
    const _0x12f958 = _0x48527d => {
      _0x3bb3a5.push(_0x48527d);
      if (typeof _0x272566.recordWarning === "function") {
        try {
          _0x272566.recordWarning(_0x48527d);
        } catch (_0x3615e1) {
          this.logger.warn?.("recordWarning callback threw: " + _0x3615e1.message);
        }
      }
    };
    if (!_0x57ace3) {
      return {
        success: false,
        degraded: false,
        representation: "none",
        warnings: _0x3bb3a5,
        error: "No active socket available to send the rich message."
      };
    }
    let _0x225178 = typeof _0x946919 === "string" ? _0x946919 : String(_0x946919 ?? "");
    for (const _0x19795b of this.detectCodeBlocks(_0x225178)) {
      if (_0x19795b.language && !this.isHighlightSupported(_0x19795b.language)) {
        _0x12f958("Code block language \"" + _0x19795b.language + "\" is not supported for syntax highlighting; rendered as unformatted monospaced text.");
      }
    }
    const _0x479a2b = this.detectLatexExpressions(_0x225178);
    for (const _0x497f1b of _0x479a2b) {
      const _0x313905 = await this.renderLatexToPng(_0x497f1b.expr, _0x272566.latex || {});
      if (_0x313905.degraded || !_0x313905.png) {
        _0x12f958("LaTeX expression could not be rendered to an image (" + (_0x313905.reason || "render failed") + "); raw expression text was sent instead.");
      }
    }
    const _0x19c748 = {};
    if (_0x272566.linkPreview === false) {
      _0x19c748.linkPreview = null;
    }
    try {
      if (typeof _0x57ace3.sendMarkdown === "function") {
        const _0x39db85 = await _0x57ace3.sendMarkdown(_0x3f4e58, _0x225178, _0x19c748);
        return {
          success: true,
          messageId: _0x39db85?.key?.id,
          timestamp: _0x39db85?.messageTimestamp,
          degraded: _0x3bb3a5.length > 0,
          representation: "markdown",
          warnings: _0x3bb3a5
        };
      }
      const _0x3cd696 = await _0x57ace3.sendMessage(_0x3f4e58, {
        text: _0x225178,
        ..._0x19c748
      });
      return {
        success: true,
        messageId: _0x3cd696?.key?.id,
        timestamp: _0x3cd696?.messageTimestamp,
        degraded: _0x3bb3a5.length > 0,
        representation: "markdown",
        warnings: _0x3bb3a5
      };
    } catch (_0x448a06) {
      _0x12f958("Markdown rendering failed (" + _0x448a06.message + "); the raw markdown text was sent as a plain text message.");
      try {
        const _0x1d3fe5 = await _0x57ace3.sendMessage(_0x3f4e58, {
          text: _0x225178
        });
        return {
          success: true,
          messageId: _0x1d3fe5?.key?.id,
          timestamp: _0x1d3fe5?.messageTimestamp,
          degraded: true,
          representation: "raw_text",
          warnings: _0x3bb3a5
        };
      } catch (_0x638a6) {
        return {
          success: false,
          degraded: true,
          representation: "raw_text",
          warnings: _0x3bb3a5,
          error: "Failed to send rich message even as raw text: " + _0x638a6.message
        };
      }
    } finally {
      if (_0x3bb3a5.length > 0 && _0x272566.templateId != null) {
        await this.recordDeliveryWarnings(_0x272566.templateId, _0x3bb3a5);
      }
    }
  }
  buildRichMessageData(_0x454e01, {
    linkPreview: _0x4189a6
  } = {}) {
    const _0x673a1b = {
      markdown: typeof _0x454e01 === "string" ? _0x454e01 : String(_0x454e01 ?? "")
    };
    if (typeof _0x4189a6 === "boolean") {
      _0x673a1b.linkPreview = _0x4189a6;
    }
    return _0x673a1b;
  }
  parseRichMessageData(_0x32d4b9) {
    if (_0x32d4b9 == null) {
      return null;
    }
    if (typeof _0x32d4b9 === "object") {
      return _0x32d4b9;
    }
    try {
      return JSON.parse(_0x32d4b9);
    } catch (_0x59bcf7) {
      this.logger.warn?.("Failed to parse rich_message_data: " + _0x59bcf7.message);
      return null;
    }
  }
  async persistRichMessageData(_0x4b6fdf, _0x2c71c4) {
    if (!this.db || typeof this.db.run !== "function") {
      return {
        success: false,
        error: "No database service available for persistence."
      };
    }
    try {
      const _0x5d156c = JSON.stringify(_0x2c71c4);
      const _0x9cc2e3 = await this.db.run("UPDATE message_templates SET rich_message_data = ? WHERE id = ?", [_0x5d156c, _0x4b6fdf]);
      if (_0x9cc2e3 && _0x9cc2e3.success === false) {
        return {
          success: false,
          error: _0x9cc2e3.error
        };
      }
      return {
        success: true
      };
    } catch (_0x4d0bdf) {
      this.logger.error?.("Failed to persist rich_message_data: " + _0x4d0bdf.message);
      return {
        success: false,
        error: _0x4d0bdf.message
      };
    }
  }
  async loadRichMessageData(_0x581f43) {
    if (!this.db || typeof this.db.get !== "function") {
      return null;
    }
    try {
      const _0x2c8f24 = await this.db.get("SELECT rich_message_data FROM message_templates WHERE id = ?", [_0x581f43]);
      if (!_0x2c8f24 || _0x2c8f24.rich_message_data == null) {
        return null;
      }
      return this.parseRichMessageData(_0x2c8f24.rich_message_data);
    } catch (_0x29a411) {
      this.logger.error?.("Failed to load rich_message_data: " + _0x29a411.message);
      return null;
    }
  }
  async recordDeliveryWarnings(_0x5e4dae, _0x24497b) {
    if (!this.db || typeof this.db.run !== "function" || typeof this.db.get !== "function") {
      return {
        success: false,
        error: "No database service available for warning persistence."
      };
    }
    try {
      const _0x599113 = await this.db.get("SELECT delivery_warnings FROM message_templates WHERE id = ?", [_0x5e4dae]);
      let _0x12ecf3 = [];
      if (_0x599113 && _0x599113.delivery_warnings) {
        try {
          const _0x57e516 = JSON.parse(_0x599113.delivery_warnings);
          if (Array.isArray(_0x57e516)) {
            _0x12ecf3 = _0x57e516;
          }
        } catch (_0x1e4304) {
          _0x12ecf3 = [];
        }
      }
      const _0x2bc694 = new Date().toISOString();
      const _0x289105 = _0x24497b.map(_0x4c7879 => ({
        type: "degraded_send",
        message: _0x4c7879,
        at: _0x2bc694
      }));
      const _0x24e292 = _0x12ecf3.concat(_0x289105);
      const _0x46acf6 = await this.db.run("UPDATE message_templates SET delivery_warnings = ? WHERE id = ?", [JSON.stringify(_0x24e292), _0x5e4dae]);
      if (_0x46acf6 && _0x46acf6.success === false) {
        return {
          success: false,
          error: _0x46acf6.error
        };
      }
      return {
        success: true
      };
    } catch (_0x2f473f) {
      this.logger.error?.("Failed to record delivery warnings: " + _0x2f473f.message);
      return {
        success: false,
        error: _0x2f473f.message
      };
    }
  }
}
module.exports = RichMessageService;