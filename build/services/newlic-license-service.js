const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  app
} = require("electron");
const {
  LICENSE_PUBLIC_KEY
} = require("../security/license-public-key");
class NewLicLicenseService {
  constructor() {
    const _0x54ef75 = (app && typeof app.getPath === "function") ? app.getPath("userData") : path.join(require("os").homedir(), ".config", "WAGrow");
    this.storePath = path.join(_0x54ef75, "newlic-license.enc");
    this.machineIdPath = path.join(_0x54ef75, "machine-id.enc");
    this.apiUrl = process.env.NEWLIC_API_URL || "https://license.getleadwave.in/api";
    this.LICENSE_SECRET = "LEADWAVE-2025-ULTRA-SECURE-LICENSE-KEY-CHANGE-THIS-IN-PRODUCTION-XYZ789";
    this.encryptionKey = this._deriveEncryptionKey();
    this.algorithm = "aes-256-gcm";
    this.ivLength = 16;
    this.store = this._loadStore();
  }
  detectKeyFormat(_0xdf7e27) {
    const _0x365ed8 = (_0xdf7e27 || "").replace(/\s+/g, "");
    if (_0x365ed8.startsWith("LW2.")) {
      return "legacy_blocked";
    }
    if (_0x365ed8.startsWith("LW-")) {
      return "gas";
    }
    return "unknown";
  }
  _b64urlDecode(_0x2bcbc9) {
    const _0x3908a1 = _0x2bcbc9.length % 4 === 0 ? "" : "=".repeat(4 - _0x2bcbc9.length % 4);
    return Buffer.from(_0x2bcbc9.replace(/-/g, "+").replace(/_/g, "/") + _0x3908a1, "base64");
  }
  _validateLicenseKeyV2(_0x49f873) {
    return {
      valid: false,
      error: "Legacy LW2 license format is deprecated and permanently disabled.",
      error_code: "LEGACY_KEY_DEPRECATED"
    };
  }
  async _migrateLegacyKey(_0x422677, _0x1e57f8) {
    return null;
  }
  _deriveEncryptionKey() {
    if (this._cachedKey) {
      return this._cachedKey;
    }
    try {
      const _0x5d785f = crypto.pbkdf2Sync(this.LICENSE_SECRET, "LEADWAVE_NEWLIC_SALT_2025", 10000, 32, "sha512");
      this._cachedKey = _0x5d785f;
      return _0x5d785f;
    } catch (_0x4b4316) {
      console.error("Error deriving encryption key:", _0x4b4316);
      const _0x44289e = crypto.pbkdf2Sync("LEADWAVE-FALLBACK-KEY-2025", "LEADWAVE_NEWLIC_SALT_2025", 10000, 32, "sha512");
      this._cachedKey = _0x44289e;
      return _0x44289e;
    }
  }
  _getHardwareFingerprint() {
    if (this._cachedFingerprint) {
      return this._cachedFingerprint;
    }
    const _0x55d60f = require("os");
    const {
      execSync: _0x4899fc
    } = require("child_process");
    const _0x6441de = [];
    try {
      if (process.platform === "win32") {
        try {
          const _0x209474 = _0x4899fc("wmic cpu get processorid", {
            encoding: "utf8",
            timeout: 2000
          }).split("\n")[1].trim();
          _0x6441de.push(_0x209474);
        } catch (_0x1fa684) {}
        try {
          const _0x1532c2 = _0x4899fc("wmic baseboard get serialnumber", {
            encoding: "utf8",
            timeout: 2000
          }).split("\n")[1].trim();
          _0x6441de.push(_0x1532c2);
        } catch (_0x256450) {}
      } else if (process.platform === "darwin") {
        try {
          const _0x1b2d55 = _0x4899fc("system_profiler SPHardwareDataType | grep \"Hardware UUID\"", {
            encoding: "utf8",
            timeout: 2000
          }).split(":")[1].trim();
          _0x6441de.push(_0x1b2d55);
        } catch (_0x3d0606) {}
      } else {
        try {
          const _0x3a2c4 = _0x4899fc("cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null", {
            encoding: "utf8",
            timeout: 2000
          }).trim();
          _0x6441de.push(_0x3a2c4);
        } catch (_0xb7f5ce) {}
      }
    } catch (_0x3d4391) {}
    _0x6441de.push(_0x55d60f.hostname(), _0x55d60f.platform(), _0x55d60f.arch());
    const _0x22c99f = crypto.createHash("sha256").update(_0x6441de.join("|")).digest("hex");
    this._cachedFingerprint = _0x22c99f;
    return _0x22c99f;
  }
  _encrypt(_0x2360a9) {
    try {
      const _0x40cfe5 = typeof _0x2360a9 === "string" ? _0x2360a9 : JSON.stringify(_0x2360a9);
      const _0x38f3c6 = crypto.randomBytes(this.ivLength);
      const _0x4bce0c = crypto.createCipheriv(this.algorithm, this.encryptionKey, _0x38f3c6);
      let _0xf092e9 = _0x4bce0c.update(_0x40cfe5, "utf8", "base64");
      _0xf092e9 += _0x4bce0c.final("base64");
      const _0x48df94 = _0x4bce0c.getAuthTag();
      const _0x510b25 = {
        iv: _0x38f3c6.toString("base64"),
        data: _0xf092e9,
        tag: _0x48df94.toString("base64"),
        version: "1.0"
      };
      return Buffer.from(JSON.stringify(_0x510b25)).toString("base64");
    } catch (_0xdbde0d) {
      throw new Error("Encryption failed: " + _0xdbde0d.message);
    }
  }
  _decrypt(_0x3b8daa) {
    try {
      const _0x498b82 = JSON.parse(Buffer.from(_0x3b8daa, "base64").toString("utf8"));
      const _0x5efa20 = Buffer.from(_0x498b82.iv, "base64");
      const _0x592907 = Buffer.from(_0x498b82.tag, "base64");
      const _0x5154c1 = _0x498b82.data;
      const _0x48c808 = crypto.createDecipheriv(this.algorithm, this.encryptionKey, _0x5efa20);
      _0x48c808.setAuthTag(_0x592907);
      let _0x325cb5 = _0x48c808.update(_0x5154c1, "base64", "utf8");
      _0x325cb5 += _0x48c808.final("utf8");
      try {
        return JSON.parse(_0x325cb5);
      } catch {
        return _0x325cb5;
      }
    } catch (_0xb7727d) {
      throw new Error("TAMPER_DETECTED");
    }
  }
  _loadStore() {
    try {
      if (fs.existsSync(this.storePath)) {
        const _0x90b00d = fs.readFileSync(this.storePath, "utf8");
        return this._decrypt(_0x90b00d);
      }
    } catch (_0x39b97b) {
      if (_0x39b97b.message === "TAMPER_DETECTED") {
        console.error("🚨 LICENSE TAMPERING DETECTED! Deleting corrupted file and starting fresh.");
        try {
          fs.unlinkSync(this.storePath);
        } catch (_0x133c99) {}
        return {};
      }
      console.error("Error loading license store:", _0x39b97b);
    }
    return {};
  }
  _saveStore() {
    try {
      const _0x53cd29 = this._encrypt(this.store);
      fs.writeFileSync(this.storePath, _0x53cd29, "utf8");
    } catch (_0x3770de) {
      console.error("Error saving license store:", _0x3770de);
    }
  }
  get(_0x2b406a) {
    return this.store[_0x2b406a];
  }
  set(_0x129278, _0x1da697) {
    this.store[_0x129278] = _0x1da697;
    this._saveStore();
  }
  delete(_0x522686) {
    delete this.store[_0x522686];
    this._saveStore();
  }
  validateLicenseKey(_0x8657f8) {
    _0x8657f8 = (_0x8657f8 || "").replace(/\s+/g, "");
    const _0x4c33af = this.detectKeyFormat(_0x8657f8);
    if (_0x4c33af === "v2") {
      const _0x2d31a4 = this._validateLicenseKeyV2(_0x8657f8);
      _0x2d31a4.format = "v2";
      return _0x2d31a4;
    }
    if (_0x4c33af !== "v1") {
      return {
        valid: false,
        error: "Invalid license key format",
        format: "unknown"
      };
    }
    try {
      const _0x4700ad = _0x8657f8.split("-");
      const [_0x1c12e5, _0x39eedc, _0x46f7cc, _0x450c24, _0x583c93] = _0x4700ad;
      const _0x4589c8 = _0x39eedc + "-" + _0x46f7cc;
      const _0x30b35b = crypto.createHash("md5").update(_0x4589c8).digest("hex").substring(0, 4).toUpperCase();
      if (_0x450c24 !== _0x30b35b) {
        return {
          valid: false,
          error: "License checksum verification failed",
          format: "v1"
        };
      }
      const _0xa4912 = Buffer.from(_0x39eedc, "hex").toString("utf8");
      const _0x21701c = JSON.parse(_0xa4912);
      const _0x590c54 = parseInt(_0x46f7cc, 16) * 1000;
      if (Date.now() > _0x590c54) {
        return {
          valid: false,
          error: "License has expired",
          data: _0x21701c,
          expires_at: new Date(_0x590c54),
          format: "v1"
        };
      }
      return {
        valid: true,
        data: _0x21701c,
        expires_at: new Date(_0x590c54),
        format: "v1"
      };
    } catch (_0x4272f4) {
      return {
        valid: false,
        error: "License validation error: " + _0x4272f4.message,
        format: "v1"
      };
    }
  }
  async validateLicenseWithAPI(_0x25ceba, _0x17e898) {
    _0x25ceba = String(_0x25ceba || "").trim();

    // 1. Explicitly reject any old LW2 format
    if (_0x25ceba.startsWith("LW2.")) {
      return {
        valid: false,
        error: "Legacy LW2 license format is deprecated and permanently disabled.",
        error_code: "LEGACY_KEY_DEPRECATED"
      };
    }

    // 2. Reject anything that is not LW- format
    if (!_0x25ceba.startsWith("LW-")) {
      return {
        valid: false,
        error: "Invalid license format. License keys must begin with LW-.",
        error_code: "INVALID_FORMAT"
      };
    }

    // 3. Exclusively validate against Google Apps Script database
    try {
      const gasUrl = "https://script.google.com/macros/s/AKfycbynPdf4uikZeryEdTVTm8Ymc26CtSwLzvGZ7QuVCxVENotWhy_lUM7TES2XTd4JMe4/exec";
      const m = String(_0x17e898 || "").trim().toUpperCase();
      const userCode = m.startsWith("USER-") ? m : (m.length >= 16 ? ("USER-" + m.slice(0, 8) + "-" + m.slice(8, 16)) : ("USER-" + m));
      const gasRes = await axios.post(gasUrl, JSON.stringify({
        action: "validateLicense",
        key: _0x25ceba,
        machine_id: userCode
      }), {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        maxRedirects: 5,
        timeout: 25000
      });

      if (gasRes.data && gasRes.data.valid && gasRes.data.data) {
        const d = gasRes.data.data;
        const allModules = [
          "proxies", "single-message", "templates", "contacts", "bulk-messages",
          "warmer", "opt-out-management", "auto-reply", "chatbot", "support-bot",
          "ai-chatbot", "call-responder", "follow-up", "recall-bot", "group-grabber",
          "manage-group", "reports", "devices", "REST API", "incoming-messages",
          "live-chat", "tg-dashboard", "tg-accounts", "tg-live-chat", "tg-broadcast",
          "tg-groups", "tg-auto-responder", "tg-ai-agent"
        ];
        const formatted = {
          valid: true,
          data: {
            name: d.customer_name || "Valued Client",
            mobile: d.mobile || "",
            plan: (d.plan_type || "pro").toLowerCase(),
            max_devices: d.max_devices || 1,
            max_tg_accounts: 100,
            modules: allModules,
            issued: Date.now() / 1000,
            company_info: null,
            machine_id: _0x17e898,
            license_id: d.license_key
          },
          expires_at: new Date(d.expires_at)
        };
        this._cacheValidationResult(_0x25ceba, formatted);
        return formatted;
      } else if (gasRes.data && !gasRes.data.valid && gasRes.data.error_code) {
        return {
          valid: false,
          error: gasRes.data.error || "License not valid",
          error_code: gasRes.data.error_code
        };
      }
    } catch (gasErr) {
      console.error("⚠️ GAS validation error in NewLicService:", gasErr.message);
      const cached = this._getCachedValidationResult(_0x25ceba);
      if (cached) return cached;
    }

    return {
      valid: false,
      error: "License validation failed. Key is not registered in Google Sheets database.",
      error_code: "LICENSE_NOT_FOUND"
    };
  }
  _cacheValidationResult(_0x206d0c, _0x4a1637) {
    try {
      const _0x4a620e = {
        validationData: _0x4a1637,
        cachedAt: Date.now(),
        expiresAt: Date.now() + 28800000
      };
      this.set("validationCache", _0x4a620e);
    } catch (_0x456425) {
      console.error("Failed to cache validation result:", _0x456425);
    }
  }
  _getCachedValidationResult(_0x230569) {
    try {
      const _0x3d73b3 = this.get("validationCache");
      if (!_0x3d73b3) {
        return null;
      }
      const _0x3ebc1a = Date.now();
      if (_0x3ebc1a > _0x3d73b3.expiresAt) {
        this.set("validationCache", null);
        return null;
      }
      const _0x573158 = ((_0x3d73b3.expiresAt - _0x3ebc1a) / 3600000).toFixed(1);
      return _0x3d73b3.validationData;
    } catch (_0x126500) {
      console.error("Failed to get cached validation:", _0x126500);
      return null;
    }
  }
  async activateLicense(_0x16fe25, _0x409032) {
    try {
      _0x16fe25 = (_0x16fe25 || "").replace(/\s+/g, "");
      if (!_0x409032) {
        _0x409032 = this.loadMachineId();
      }
      const _0x4ae466 = await this.validateLicenseWithAPI(_0x16fe25, _0x409032);
      if (!_0x4ae466.valid) {
        console.error("❌ NewLic: Validation failed:", _0x4ae466.error);
        return {
          success: false,
          message: _0x4ae466.error || "License validation failed"
        };
      }
      this.set("license", {
        key: _0x16fe25,
        machineId: _0x409032,
        activatedAt: new Date().toISOString(),
        data: _0x4ae466.data,
        expiresAt: _0x4ae466.expires_at
      });
      const _0x13cba1 = new Date(_0x4ae466.expires_at);
      const _0x41913a = _0x13cba1.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const _0x5276fb = {
        monthly: "Monthly Plan",
        quarterly: "Quarterly Plan",
        semi_annual: "Semi-Annual Plan",
        annual: "Annual Plan",
        lifetime: "Lifetime Plan",
        custom: "Custom Plan",
        trial_2_days: "2 Days Trial",
        trial_7_days: "7 Days Trial"
      };
      const _0x4d6986 = _0x5276fb[_0x4ae466.data.plan] || _0x4ae466.data.plan;
      let _0x3f6f81;
      try {
        const { app: _0xfa5d35 } = require("electron");
        if (_0xfa5d35 && typeof _0xfa5d35.getPath === "function") {
          _0x3f6f81 = _0xfa5d35.getPath("userData");
        }
      } catch (_err) {}
      if (!_0x3f6f81) {
        _0x3f6f81 = path.join(require("os").homedir(), ".config", "WAGrow");
      }
      if (!fs.existsSync(_0x3f6f81)) {
        fs.mkdirSync(_0x3f6f81, {
          recursive: true
        });
      }
      const _0x42ecb6 = {
        license_key: _0x16fe25,
        customer_name: _0x4ae466.data.name,
        mobile: _0x4ae466.data.mobile,
        plan_name: _0x4d6986,
        plan: _0x4ae466.data.plan,
        expires_at: _0x4ae466.expires_at,
        machine_id: _0x409032,
        activated_at: new Date().toISOString(),
        status: "active",
        modules: _0x4ae466.data.modules || [],
        max_devices: _0x4ae466.data.max_devices || 1,
        isTrial: _0x4ae466.data.plan?.includes("trial") || false,
        company_info: _0x4ae466.data.company_info || null,
        source: "newlic"
      };
      const _0x46bf27 = path.join(_0x3f6f81, "license.enc");
      const _0x3e74f6 = this._encrypt(_0x42ecb6);
      fs.writeFileSync(_0x46bf27, _0x3e74f6, "utf8");
      const _0x4fe79a = path.join(_0x3f6f81, "license.json");
      if (fs.existsSync(_0x4fe79a)) {
        fs.unlinkSync(_0x4fe79a);
      }
      return {
        success: true,
        message: "License activated successfully",
        data: {
          customer_name: _0x4ae466.data.name,
          mobile: _0x4ae466.data.mobile,
          plan: _0x4ae466.data.plan,
          plan_name: _0x4d6986,
          modules: _0x4ae466.data.modules,
          expires_at: _0x4ae466.expires_at,
          expires_at_formatted: _0x41913a,
          license_key: _0x16fe25,
          company_info: _0x4ae466.data.company_info
        }
      };
    } catch (_0x2f18a6) {
      console.error("License activation error:", _0x2f18a6);
      return {
        success: false,
        message: "Failed to activate license"
      };
    }
  }
  async checkLicense(_0x47851d) {
    try {
      let _0x178721;
      try {
        _0x178721 = this.get("license");
      } catch (_0x918b64) {
        if (_0x918b64.message === "TAMPER_DETECTED") {
          console.error("🚨 LICENSE TAMPERING DETECTED during check!");
          await this._reportTampering(_0x178721?.key, _0x47851d);
          this.clearLicense();
          return {
            valid: false,
            message: "License tampering detected. Please contact support.",
            error_code: "TAMPER_DETECTED"
          };
        }
        throw _0x918b64;
      }
      if (!_0x178721 || !_0x178721.key) {
        return {
          valid: false,
          message: "No license found"
        };
      }
      const _0x25d7cf = await this.validateLicenseWithAPI(_0x178721.key, _0x47851d);
      return _0x25d7cf;
    } catch (_0x1e99ec) {
      console.error("License check error:", _0x1e99ec);
      return {
        valid: false,
        message: "License check failed"
      };
    }
  }
  getLicenseInfo() {
    try {
      return this.get("license");
    } catch (_0x800a71) {
      if (_0x800a71.message === "TAMPER_DETECTED") {
        console.error("🚨 LICENSE TAMPERING DETECTED!");
        this.clearLicense();
        throw new Error("TAMPER_DETECTED");
      }
      return null;
    }
  }
  async _reportTampering(_0x374e96, _0x55c0b) {
    try {
      await axios.post(this.apiUrl + "/report-tampering", {
        licenseKey: _0x374e96,
        machineId: _0x55c0b,
        timestamp: new Date().toISOString()
      }, {
        timeout: 3000
      });
    } catch (_0x27c450) {
      console.error("Failed to report tampering:", _0x27c450.message);
    }
  }
  clearLicense() {
    try {
      this.delete("license");
      this.set("validationCache", null);
      if (fs.existsSync(this.storePath)) {
        fs.unlinkSync(this.storePath);
      }
    } catch (_0x3e8149) {
      console.error("Error clearing license:", _0x3e8149);
    }
  }
  saveMachineId(_0x4749e3) {
    try {
      const _0x18efa8 = {
        machineId: _0x4749e3,
        createdAt: new Date().toISOString(),
        version: "1.0"
      };
      const _0x2b664c = this._encrypt(_0x18efa8);
      fs.writeFileSync(this.machineIdPath, _0x2b664c, "utf8");
      return true;
    } catch (_0x49c872) {
      console.error("Error saving machine ID:", _0x49c872);
      return false;
    }
  }
  loadMachineId() {
    try {
      if (fs.existsSync(this.machineIdPath)) {
        const _0x54b8f7 = fs.readFileSync(this.machineIdPath, "utf8");
        const _0x13e406 = this._decrypt(_0x54b8f7);
        if (_0x13e406.machineId && /^[A-F0-9]{16}$/.test(_0x13e406.machineId)) {
          return _0x13e406.machineId;
        }
      }
    } catch (_0x365577) {
      if (_0x365577.message === "TAMPER_DETECTED") {
        console.warn("⚠️  machine-id.enc unreadable (key mismatch). Deleting and re-deriving.");
        try {
          fs.unlinkSync(this.machineIdPath);
        } catch (_0x54591f) {}
        return null;
      }
      console.error("Error loading machine ID:", _0x365577);
    }
    return null;
  }
}
module.exports = new NewLicLicenseService();