const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
class ConfigEncryption {
  constructor() {
    this.algorithm = "aes-256-cbc";
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 32;
    this.masterKey = this.getMasterKey();
  }
  getMasterKey() {
    try {
      const _0x111116 = this.getMachineFingerprint();
      const _0x1d3ce8 = "LEADWAVE_CONFIG_SECRET_2025_SECURE";
      const _0x1bf3c8 = _0x111116 + _0x1d3ce8;
      const _0x55701c = crypto.createHash("sha256").update("LEADWAVE_SALT").digest();
      const _0x36e11a = crypto.pbkdf2Sync(_0x1bf3c8, _0x55701c, 100000, this.keyLength, "sha256");
      return _0x36e11a;
    } catch (_0x44a7a3) {
      console.error("Error generating master key:", _0x44a7a3);
      return crypto.createHash("sha256").update("LEADWAVE_FALLBACK_KEY_2025").digest();
    }
  }
  getMachineFingerprint() {
    try {
      const _0x3c31b5 = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuModel: os.cpus()[0]?.model || "unknown",
        totalMemory: os.totalmem(),
        userInfo: os.userInfo().username
      };
      return JSON.stringify(_0x3c31b5);
    } catch (_0x454111) {
      return "fallback_fingerprint";
    }
  }
  encryptConfig(_0x2ea09f) {
    try {
      const _0x2f5089 = JSON.stringify(_0x2ea09f);
      const _0x22b9b9 = crypto.randomBytes(this.ivLength);
      const _0x5b1940 = crypto.createCipher(this.algorithm, this.masterKey);
      let _0x1c0d1c = _0x5b1940.update(_0x2f5089, "utf8", "hex");
      _0x1c0d1c += _0x5b1940.final("hex");
      const _0x2240d3 = crypto.createHmac("sha256", this.masterKey);
      _0x2240d3.update(_0x1c0d1c);
      const _0x4549ef = _0x2240d3.digest("hex");
      const _0x3438b7 = {
        iv: _0x22b9b9.toString("hex"),
        tag: _0x4549ef,
        encrypted: _0x1c0d1c,
        algorithm: this.algorithm,
        timestamp: Date.now()
      };
      return _0x3438b7;
    } catch (_0x51a1d4) {
      console.error("Encryption error:", _0x51a1d4);
      throw new Error("Failed to encrypt configuration");
    }
  }
  decryptConfig(_0x1854e0) {
    try {
      if (!_0x1854e0 || typeof _0x1854e0 !== "object") {
        throw new Error("Invalid encrypted data format");
      }
      const {
        iv: _0x5e99cd,
        tag: _0x55ba85,
        encrypted: _0x5b67e5,
        algorithm: _0x32a568
      } = _0x1854e0;
      if (!_0x5e99cd || !_0x55ba85 || !_0x5b67e5) {
        throw new Error("Missing encryption components");
      }
      if (_0x32a568 !== this.algorithm) {
        throw new Error("Unsupported encryption algorithm");
      }
      const _0x3cd09b = crypto.createHmac("sha256", this.masterKey);
      _0x3cd09b.update(_0x5b67e5);
      const _0x209363 = _0x3cd09b.digest("hex");
      if (_0x55ba85 !== _0x209363) {
        throw new Error("Data integrity check failed");
      }
      const _0x2dc108 = crypto.createDecipher(this.algorithm, this.masterKey);
      let _0x6f2894 = _0x2dc108.update(_0x5b67e5, "hex", "utf8");
      _0x6f2894 += _0x2dc108.final("utf8");
      return JSON.parse(_0x6f2894);
    } catch (_0x52247a) {
      console.error("Decryption error:", _0x52247a);
      throw new Error("Failed to decrypt configuration");
    }
  }
  saveEncryptedConfig(_0x310bcd, _0x4ebff5) {
    try {
      const _0x2e29f4 = this.encryptConfig(_0x310bcd);
      const _0x940de9 = this.generateIntegrityHash(_0x2e29f4);
      const _0x170d61 = {
        ..._0x2e29f4,
        integrity: _0x940de9,
        version: "1.0",
        created: Date.now()
      };
      const _0x4c62cc = path.dirname(_0x4ebff5);
      if (!fs.existsSync(_0x4c62cc)) {
        fs.mkdirSync(_0x4c62cc, {
          recursive: true
        });
      }
      fs.writeFileSync(_0x4ebff5, JSON.stringify(_0x170d61, null, 2));
      return true;
    } catch (_0x56968) {
      console.error("Error saving encrypted config:", _0x56968);
      return false;
    }
  }
  loadEncryptedConfig(_0x2a5a12) {
    try {
      if (!fs.existsSync(_0x2a5a12)) {
        throw new Error("Configuration file not found");
      }
      const _0x228f84 = JSON.parse(fs.readFileSync(_0x2a5a12, "utf8"));
      if (!this.verifyIntegrity(_0x228f84)) {
        throw new Error("Configuration file integrity check failed");
      }
      return this.decryptConfig(_0x228f84);
    } catch (_0xf6566) {
      console.error("Error loading encrypted config:", _0xf6566);
      throw _0xf6566;
    }
  }
  generateIntegrityHash(_0x1b65ed) {
    const _0x19da46 = JSON.stringify({
      iv: _0x1b65ed.iv,
      tag: _0x1b65ed.tag,
      encrypted: _0x1b65ed.encrypted,
      algorithm: _0x1b65ed.algorithm
    });
    return crypto.createHmac("sha256", this.masterKey).update(_0x19da46).digest("hex");
  }
  verifyIntegrity(_0x3f7fd8) {
    try {
      if (!_0x3f7fd8.integrity) {
        return false;
      }
      const _0x5f019d = this.generateIntegrityHash(_0x3f7fd8);
      return crypto.timingSafeEqual(Buffer.from(_0x3f7fd8.integrity, "hex"), Buffer.from(_0x5f019d, "hex"));
    } catch (_0x48d0a4) {
      console.error("Integrity verification error:", _0x48d0a4);
      return false;
    }
  }
  encryptResellerConfig(_0x52f074) {
    try {
      const _0x4d664f = {
        ..._0x52f074,
        _security: {
          encrypted_at: Date.now(),
          machine_id: this.getMachineFingerprint(),
          version: "1.0"
        }
      };
      return this.encryptConfig(_0x4d664f);
    } catch (_0x2eb0ed) {
      console.error("Error encrypting reseller config:", _0x2eb0ed);
      throw _0x2eb0ed;
    }
  }
  decryptResellerConfig(_0x1cbc93) {
    try {
      const _0x3c6ad1 = this.decryptConfig(_0x1cbc93);
      if (_0x3c6ad1._security) {
        const _0x2a211a = this.getMachineFingerprint();
        if (_0x3c6ad1._security.machine_id !== _0x2a211a) {
          throw new Error("Configuration machine ID mismatch");
        }
      }
      delete _0x3c6ad1._security;
      return _0x3c6ad1;
    } catch (_0xe7b1cd) {
      console.error("Error decrypting reseller config:", _0xe7b1cd);
      throw _0xe7b1cd;
    }
  }
  createConfigBackup(_0x40eba4, _0x3bb265) {
    try {
      const _0x318dae = new Date().toISOString().replace(/[:.]/g, "-");
      const _0x3d092e = path.join(_0x3bb265, "config-backup-" + _0x318dae + ".enc");
      return this.saveEncryptedConfig(_0x40eba4, _0x3d092e);
    } catch (_0xef7b0e) {
      console.error("Error creating config backup:", _0xef7b0e);
      return false;
    }
  }
  validateConfigStructure(_0x5d3f7f) {
    const _0x405b76 = ["RESELLER_CODE", "RESELLER_INFO", "LICENSE_SERVER"];
    for (const _0x44ae47 of _0x405b76) {
      if (!(_0x44ae47 in _0x5d3f7f)) {
        throw new Error("Missing required configuration field: " + _0x44ae47);
      }
    }
    return true;
  }
  generateSecureConfigTemplate() {
    return {
      RESELLER_CODE: null,
      RESELLER_INFO: {
        name: null,
        logo: null,
        website: null,
        support_email: null,
        support_phone: null
      },
      LICENSE_SERVER: {
        base_url: "",
        api_version: "v1"
      },
      APP_BRANDING: {
        show_reseller_info: false,
        custom_title: null,
        splash_message: null
      },
      SECURITY: {
        encryption_enabled: true,
        integrity_checks: true,
        anti_tamper: true
      }
    };
  }
  getEncryptionStatus() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      masterKeyGenerated: !!this.masterKey,
      timestamp: Date.now()
    };
  }
}
module.exports = new ConfigEncryption();