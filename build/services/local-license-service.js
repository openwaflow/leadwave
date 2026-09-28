const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
let _publicKey = null;
function getPublicKey() {
  if (_publicKey) {
    return _publicKey;
  }
  try {
    _publicKey = require("../security/license-public-key").LICENSE_PUBLIC_KEY;
  } catch (_0x135ced) {
    _publicKey = null;
  }
  return _publicKey;
}
class LocalLicenseService {
  constructor() {
    this.keygenDbPath = this.getKeygenDbPath();
  }
  _userDataDir() {
    try {
      return require("electron").app.getPath("userData");
    } catch (_0xd49728) {
      return path.join(os.homedir(), ".leadwave");
    }
  }
  getKeygenDbPath() {
    const _0x3fc1a4 = path.join(os.homedir(), "Lead Wave-Keygen");
    return path.join(_0x3fc1a4, "licenses.json");
  }
  loadKeygenLicenses() {
    if (fs.existsSync(this.keygenDbPath)) {
      try {
        const _0x455c03 = fs.readFileSync(this.keygenDbPath, "utf8");
        return JSON.parse(_0x455c03);
      } catch (_0x33e30b) {
        console.error("Error loading Keygen licenses:", _0x33e30b);
        return [];
      }
    }
    return [];
  }
  saveKeygenLicenses(_0x589ec1) {
    try {
      const _0x47f0f5 = path.dirname(this.keygenDbPath);
      if (!fs.existsSync(_0x47f0f5)) {
        fs.mkdirSync(_0x47f0f5, {
          recursive: true
        });
      }
      fs.writeFileSync(this.keygenDbPath, JSON.stringify(_0x589ec1, null, 2));
      return true;
    } catch (_0x160ca6) {
      console.error("Error saving Keygen licenses:", _0x160ca6);
      return false;
    }
  }
  validateLicenseKeyFormat(_0x3b2b06) {
    const _0x1d0f5a = /^LW-[A-F0-9]{3,4}-[A-F0-9]{3,4}-[A-F0-9]{3,4}-[A-F0-9]{4}$/i;
    if (!_0x1d0f5a.test(_0x3b2b06)) {
      return false;
    }
    const _0x2eaea6 = _0x3b2b06.split("-");
    const _0x3a65b7 = _0x2eaea6.slice(1, 4);
    const _0x104ec6 = _0x2eaea6[4].toUpperCase();
    const _0x443209 = _0x3a65b7.join("").toUpperCase();
    const _0x50e7e3 = crypto.createHash("md5").update(_0x443209).digest("hex").substring(0, 4).toUpperCase();
    return _0x104ec6 === _0x50e7e3;
  }
  generateActivationCode(_0x473867, _0x2f18f5) {
    const _0x21daae = _0x473867 + "-" + _0x2f18f5;
    return crypto.createHash("sha256").update(_0x21daae).digest("hex").substring(0, 16).toUpperCase();
  }
  async checkLicenseStatus(_0xe6b9c) {
    try {
      const _0x37edce = this.validateSelfContainedLicense(_0xe6b9c);
      if (_0x37edce.success) {
        return {
          success: true,
          data: {
            status: _0x37edce.status,
            expires_at: _0x37edce.expires_at,
            customer_name: _0x37edce.customer_name,
            plan_type: _0x37edce.plan_type
          }
        };
      }
      if (!this.validateLicenseKeyFormat(_0xe6b9c)) {
        return {
          success: false,
          error: "Invalid license key format",
          error_code: "INVALID_FORMAT"
        };
      }
      const _0x33e415 = this.loadKeygenLicenses();
      let _0x1a81b9 = _0x33e415.find(_0xe83210 => _0xe83210.license_key === _0xe6b9c);
      if (!_0x1a81b9) {
        return {
          success: false,
          error: "License not found",
          error_code: "LICENSE_NOT_FOUND"
        };
      }
      const _0x24a468 = new Date();
      const _0x5ab1a6 = new Date(_0x1a81b9.expires_at);
      const _0x334ca4 = _0x24a468 > _0x5ab1a6;
      return {
        success: true,
        data: {
          status: _0x334ca4 ? "expired" : _0x1a81b9.status,
          is_activated: _0x1a81b9.activations.length > 0,
          can_be_activated: !_0x334ca4 && _0x1a81b9.status === "active",
          expires_at: _0x1a81b9.expires_at,
          customer_name: _0x1a81b9.customer_name,
          plan_type: _0x1a81b9.plan_type
        }
      };
    } catch (_0x381fd9) {
      return {
        success: false,
        error: _0x381fd9.message,
        error_code: "STATUS_CHECK_ERROR"
      };
    }
  }
  async activateLicense(_0x58dc10, _0x1a0f01, _0x26efef) {
    try {
      const _0x4923ef = this.validateSelfContainedLicense(_0x58dc10);
      if (_0x4923ef.success) {
        const _0x3110bf = this.checkSelfContainedLicenseActivation(_0x58dc10, _0x1a0f01);
        if (_0x3110bf.alreadyActivated) {
          return {
            success: false,
            message: "This license key has already been activated on this machine. Each license can only be activated once per machine.",
            error_code: "LICENSE_ALREADY_ACTIVATED"
          };
        }
        const _0x54946e = new Date();
        const _0x3db966 = new Date(_0x4923ef.expires_at);
        const _0x16393c = Math.ceil((_0x3db966 - _0x54946e) / 86400000);
        const _0x572c3c = Math.ceil((_0x3db966 - _0x54946e) / 86400000);
        this.recordSelfContainedLicenseActivation(_0x58dc10, _0x1a0f01, _0x26efef);
        return {
          success: true,
          data: {
            license_key: _0x58dc10,
            customer_name: _0x4923ef.customer_name,
            plan_name: _0x4923ef.plan_type,
            plan_type: _0x4923ef.plan_type,
            expires_at: _0x4923ef.expires_at,
            expires_at_formatted: new Date(_0x4923ef.expires_at).toLocaleDateString(),
            status: _0x4923ef.status,
            days_remaining: _0x16393c,
            validity_days: _0x572c3c,
            is_trial: false,
            isTrial: false,
            isValid: true,
            modules: _0x4923ef.modules || [],
            company_info: _0x4923ef.company_info || null
          }
        };
      }
      if (!this.validateLicenseKeyFormat(_0x58dc10)) {
        return {
          success: false,
          message: "Invalid license key format",
          error_code: "INVALID_FORMAT"
        };
      }
      const _0x70e7f4 = this.loadKeygenLicenses();
      const _0x5d159a = _0x70e7f4.findIndex(_0x47922e => _0x47922e.license_key === _0x58dc10);
      if (_0x5d159a === -1) {
        return {
          success: false,
          message: "Failed to activate license. Please ensure the Keygen app is installed and has the license database. If you are using a license generated on another computer, make sure you are using the correct license key format.",
          error_code: "LICENSE_NOT_FOUND"
        };
      }
      const _0x17745e = _0x70e7f4[_0x5d159a];
      const _0x2b6fb7 = new Date();
      const _0x4a9251 = new Date(_0x17745e.expires_at);
      if (_0x2b6fb7 > _0x4a9251) {
        return {
          success: false,
          message: "License has expired",
          error_code: "LICENSE_EXPIRED"
        };
      }
      if (_0x17745e.status !== "active") {
        return {
          success: false,
          message: "License is " + _0x17745e.status,
          error_code: "LICENSE_INACTIVE"
        };
      }
      const _0x3f3323 = _0x17745e.activations.find(_0xf2adda => _0xf2adda.machine_id === _0x1a0f01);
      if (!_0x3f3323) {
        _0x17745e.activations.push({
          machine_id: _0x1a0f01,
          activation_code: this.generateActivationCode(_0x58dc10, _0x1a0f01),
          activated_at: _0x2b6fb7.toISOString(),
          app_version: _0x26efef
        });
        _0x70e7f4[_0x5d159a] = _0x17745e;
        this.saveKeygenLicenses(_0x70e7f4);
      }
      const _0x2663e1 = Math.ceil((_0x4a9251 - _0x2b6fb7) / 86400000);
      return {
        success: true,
        data: {
          license_key: _0x17745e.license_key,
          customer_name: _0x17745e.customer_name,
          plan_name: _0x17745e.plan_type,
          plan_type: _0x17745e.plan_type,
          expires_at: _0x17745e.expires_at,
          expires_at_formatted: _0x17745e.expires_at_formatted,
          status: _0x17745e.status,
          days_remaining: _0x2663e1,
          is_trial: _0x17745e.plan_type === "trial",
          validity_days: _0x17745e.validity_days,
          modules: _0x17745e.modules || [],
          company_info: _0x17745e.company_info || null
        }
      };
    } catch (_0x188a5e) {
      return {
        success: false,
        message: _0x188a5e.message,
        error_code: "ACTIVATION_ERROR"
      };
    }
  }
  async validateLicense(_0x283428, _0x5b248e, _0x586d56) {
    try {
      let _0x57999a = null;
      try {
        _0x57999a = await this.checkLaravelLicenseStatus(_0x283428, _0x5b248e);
        if (_0x57999a && _0x57999a.data) {
          const _0x1c399c = _0x57999a.data.status;
          if (_0x1c399c === "suspended") {
            return {
              success: false,
              message: "License has been suspended. Please contact your administrator.",
              error_code: "LICENSE_SUSPENDED",
              status: "suspended"
            };
          }
          if (_0x1c399c === "revoked") {
            return {
              success: false,
              message: "License has been revoked. Please contact your administrator.",
              error_code: "LICENSE_REVOKED",
              status: "revoked"
            };
          }
          if (!_0x57999a.data.is_valid) {
            return {
              success: false,
              message: "License is not valid in the system.",
              error_code: "LICENSE_INVALID",
              status: _0x1c399c
            };
          }
        }
      } catch (_0x2ff0cf) {}
      const _0x6501a1 = this.validateSelfContainedLicense(_0x283428);
      if (_0x6501a1.success) {
        return {
          success: true,
          data: {
            license_key: _0x283428,
            customer_name: _0x6501a1.customer_name,
            plan_name: _0x6501a1.plan_type,
            expires_at: _0x6501a1.expires_at,
            expires_at_formatted: new Date(_0x6501a1.expires_at).toLocaleDateString(),
            isTrial: false,
            isValid: true,
            status: _0x6501a1.status
          }
        };
      }
      if (!this.validateLicenseKeyFormat(_0x283428)) {
        return {
          success: false,
          message: "Invalid license key format",
          error_code: "INVALID_FORMAT"
        };
      }
      const _0x18ad95 = this.loadKeygenLicenses();
      const _0x4d8a2e = _0x18ad95.find(_0x29bd7c => _0x29bd7c.license_key === _0x283428);
      if (!_0x4d8a2e) {
        return {
          success: false,
          message: "License not found in database",
          error_code: "LICENSE_NOT_FOUND"
        };
      }
      const _0x1c7321 = new Date();
      const _0x1f3dff = new Date(_0x4d8a2e.expires_at);
      if (_0x1c7321 > _0x1f3dff) {
        return {
          success: false,
          message: "License has expired",
          error_code: "LICENSE_EXPIRED"
        };
      }
      if (_0x4d8a2e.status !== "active") {
        const _0x29d91d = {
          suspended: "License has been suspended. Please contact your administrator.",
          revoked: "License has been revoked. Please contact your administrator.",
          expired: "License has expired. Please contact your administrator."
        };
        return {
          success: false,
          message: _0x29d91d[_0x4d8a2e.status] || "License is " + _0x4d8a2e.status,
          error_code: _0x4d8a2e.status === "suspended" ? "LICENSE_SUSPENDED" : _0x4d8a2e.status === "revoked" ? "LICENSE_REVOKED" : "LICENSE_INACTIVE",
          status: _0x4d8a2e.status
        };
      }
      const _0x1dba4f = _0x4d8a2e.activations.find(_0xcd0002 => _0xcd0002.machine_id === _0x5b248e);
      if (!_0x1dba4f) {
        return {
          success: false,
          message: "License not activated on this machine",
          error_code: "NOT_ACTIVATED"
        };
      }
      const _0x168840 = Math.ceil((_0x1f3dff - _0x1c7321) / 86400000);
      return {
        success: true,
        data: {
          license_key: _0x4d8a2e.license_key,
          customer_name: _0x4d8a2e.customer_name,
          plan_name: _0x4d8a2e.plan_type,
          plan_type: _0x4d8a2e.plan_type,
          expires_at: _0x4d8a2e.expires_at,
          expires_at_formatted: _0x4d8a2e.expires_at_formatted,
          status: _0x4d8a2e.status,
          days_remaining: _0x168840,
          is_trial: _0x4d8a2e.plan_type === "trial",
          isUpgraded: false,
          validity_days: _0x4d8a2e.validity_days,
          modules: _0x4d8a2e.modules || [],
          company_info: _0x4d8a2e.company_info || null
        }
      };
    } catch (_0x236b49) {
      return {
        success: false,
        message: _0x236b49.message,
        error_code: "VALIDATION_ERROR"
      };
    }
  }
  async registerTrial(_0x4d43c6) {
    try {
      const _0x24f8ef = require("crypto");
      const _0x4f5ba4 = () => _0x24f8ef.randomUUID();
      const _0x2e24a9 = this.generateTrialLicenseKey();
      const _0x2e55e4 = new Date();
      const _0x3e3f9c = new Date(_0x2e55e4.getTime() + 172800000);
      const _0x4c616c = {
        id: _0x4f5ba4(),
        license_key: _0x2e24a9,
        customer_name: _0x4d43c6.name,
        plan_type: "trial",
        user_license_code: "TRIAL-" + Date.now(),
        validity_days: 2,
        created_at: _0x2e55e4.toISOString(),
        expires_at: _0x3e3f9c.toISOString(),
        expires_at_formatted: _0x3e3f9c.toLocaleDateString(),
        status: "active",
        activations: [],
        created_by: "trial-registration",
        notes: "Trial license for " + _0x4d43c6.name
      };
      const _0x2aaa74 = this.loadKeygenLicenses();
      _0x2aaa74.push(_0x4c616c);
      this.saveKeygenLicenses(_0x2aaa74);
      return {
        success: true,
        data: {
          license_key: _0x4c616c.license_key,
          customer_name: _0x4c616c.customer_name,
          plan_name: "trial",
          expires_at: _0x4c616c.expires_at,
          expires_at_formatted: _0x4c616c.expires_at_formatted,
          validity_days: 2
        }
      };
    } catch (_0x7bd21e) {
      return {
        success: false,
        message: _0x7bd21e.message,
        error_code: "TRIAL_REGISTRATION_ERROR"
      };
    }
  }
  async checkMachineActivation(_0x53d468) {
    try {
      const _0x2f2016 = this.loadKeygenLicenses();
      const _0x3a5cd7 = _0x2f2016.find(_0x1720fc => _0x1720fc.activations && _0x1720fc.activations.some(_0x3127b5 => _0x3127b5.machine_id === _0x53d468));
      if (_0x3a5cd7) {
        return {
          success: true,
          has_license: true,
          license_data: {
            license_key: _0x3a5cd7.license_key,
            customer_name: _0x3a5cd7.customer_name,
            plan_type: _0x3a5cd7.plan_type,
            expires_at: _0x3a5cd7.expires_at,
            status: _0x3a5cd7.status
          }
        };
      }
      return {
        success: true,
        has_license: false,
        message: "No license found for this machine"
      };
    } catch (_0x183f90) {
      return {
        success: false,
        error: "Failed to check machine activation",
        error_code: "MACHINE_CHECK_ERROR"
      };
    }
  }
  validateSelfContainedLicense(_0x83a4a9) {
    try {
      const _0x3f841a = (_0x83a4a9 || "").replace(/\s+/g, "");
      if (_0x3f841a.startsWith("LW2.") && _0x3f841a.split(".").length === 3) {
        const _0x27f3ff = getPublicKey();
        if (!_0x27f3ff) {
          return {
            success: false,
            error: "License public key unavailable"
          };
        }
        const [, _0x5cfee3, _0x59c0f8] = _0x3f841a.split(".");
        const _0x228eda = _0x59c0f8.replace(/-/g, "+").replace(/_/g, "/");
        const _0x973396 = crypto.createVerify("RSA-SHA256");
        _0x973396.update(_0x5cfee3);
        if (!_0x973396.verify(_0x27f3ff, _0x228eda, "base64")) {
          return {
            success: false,
            error: "License signature verification failed"
          };
        }
        const _0x5b550e = _0x5cfee3.length % 4 === 0 ? "" : "=".repeat(4 - _0x5cfee3.length % 4);
        const _0xf31736 = Buffer.from(_0x5cfee3.replace(/-/g, "+").replace(/_/g, "/") + _0x5b550e, "base64").toString("utf8");
        const _0x37849b = JSON.parse(_0xf31736);
        const _0x49f1ed = new Date((_0x37849b.exp || 0) * 1000);
        if (new Date() > _0x49f1ed) {
          return {
            success: false,
            error: "License expired",
            status: "expired"
          };
        }
        return {
          success: true,
          status: "active",
          expires_at: _0x49f1ed.toISOString(),
          customer_name: _0x37849b.name || "Licensed User",
          plan_type: _0x37849b.plan || "standard",
          modules: _0x37849b.modules || [],
          machine_id: _0x37849b.mb || null,
          company_info: _0x37849b.ci || null
        };
      }
      if (_0x3f841a.startsWith("LW-") && _0x3f841a.split("-").length === 5) {
        return {
          success: false,
          error: "Legacy license format requires online activation",
          error_code: "LEGACY_REQUIRES_SERVER"
        };
      }
      return {
        success: false,
        error: "Unrecognised license key format"
      };
    } catch (_0x10befe) {
      return {
        success: false,
        error: "License validation failed: " + _0x10befe.message
      };
    }
  }
  generateSelfContainedLicense(_0x17c2c0, _0x3282e6) {
    try {
      const _0x154618 = new Date();
      const _0xae8da1 = new Date(_0x154618.getTime() + _0x3282e6 * 24 * 60 * 60 * 1000);
      const _0x22d17a = Math.floor(_0xae8da1.getTime() / 1000);
      const _0x3eb3af = {
        name: _0x17c2c0.customerName,
        plan: _0x17c2c0.planType,
        issued: Math.floor(_0x154618.getTime() / 1000)
      };
      const _0x6bc0c3 = Buffer.from(JSON.stringify(_0x3eb3af)).toString("hex").toUpperCase();
      const _0x5a6dd8 = _0x22d17a.toString(16).toUpperCase().padStart(8, "0");
      const _0x322ba6 = _0x6bc0c3 + "-" + _0x5a6dd8;
      const _0x359075 = crypto.createHash("md5").update(_0x322ba6).digest("hex").substring(0, 4).toUpperCase();
      throw new Error("Local license generation is disabled. Licenses must be issued by the server.");
    } catch (_0x46a554) {
      throw new Error("Failed to generate self-contained license");
    }
  }
  generateTrialLicenseKey() {
    const _0x187e74 = "LW";
    const _0x75ad30 = [];
    for (let _0x13c91a = 0; _0x13c91a < 3; _0x13c91a++) {
      const _0x10596c = crypto.randomBytes(2).toString("hex").toUpperCase();
      _0x75ad30.push(_0x10596c);
    }
    const _0x164a7f = _0x75ad30.join("");
    const _0x5cad4f = crypto.createHash("md5").update(_0x164a7f).digest("hex").substring(0, 4).toUpperCase();
    return _0x187e74 + "-" + _0x75ad30.join("-") + "-" + _0x5cad4f;
  }
  async checkLaravelLicenseStatus(_0x19148b, _0xe77429) {
    try {
      const _0x10a982 = require("node-fetch");
      const _0x4a259e = "https://license.getleadwave.in/api/license/status";
      const _0x2e4546 = new AbortController();
      const _0x3c1cf0 = setTimeout(() => _0x2e4546.abort(), 3000);
      let _0x54d104;
      try {
        _0x54d104 = await _0x10a982(_0x4a259e, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            license_code: _0x19148b,
            machine_id: _0xe77429
          }),
          signal: _0x2e4546.signal
        });
      } finally {
        clearTimeout(_0x3c1cf0);
      }
      if (!_0x54d104.ok) {
        if (_0x54d104.status === 404) {
          return {
            success: false,
            message: "License not found in system",
            data: {
              status: "revoked",
              is_valid: false
            }
          };
        }
        throw new Error("Laravel API responded with status: " + _0x54d104.status);
      }
      const _0x3d440a = await _0x54d104.json();
      if (!_0x3d440a.success) {
        throw new Error(_0x3d440a.message || "Laravel API returned error");
      }
      const _0x3ff3bc = _0x3d440a.data.status;
      if (_0x3ff3bc && ["suspended", "revoked", "expired"].includes(_0x3ff3bc)) {
        const _0x4d95d8 = this.loadKeygenLicenses();
        const _0x952d42 = _0x4d95d8.findIndex(_0x505c82 => _0x505c82.license_key === _0x19148b);
        if (_0x952d42 !== -1) {
          _0x4d95d8[_0x952d42].status = _0x3ff3bc;
          this.saveKeygenLicenses(_0x4d95d8);
        }
      }
      return _0x3d440a;
    } catch (_0x466348) {
      throw _0x466348;
    }
  }
  checkSelfContainedLicenseActivation(_0x192722, _0xc9ee6f) {
    try {
      const _0x33094b = path.join(this._userDataDir(), "activations.json");
      if (!fs.existsSync(_0x33094b)) {
        return {
          alreadyActivated: false
        };
      }
      const _0x52716c = JSON.parse(fs.readFileSync(_0x33094b, "utf8"));
      const _0x31f8ea = _0x52716c.find(_0x35e87a => _0x35e87a.license_key === _0x192722 && _0x35e87a.machine_id === _0xc9ee6f);
      return {
        alreadyActivated: !!_0x31f8ea,
        activation: _0x31f8ea
      };
    } catch (_0x4e70c6) {
      return {
        alreadyActivated: false
      };
    }
  }
  recordSelfContainedLicenseActivation(_0x1c6fed, _0x12536e, _0x3a8699) {
    try {
      const _0x57c274 = this._userDataDir();
      const _0x522c03 = path.join(_0x57c274, "activations.json");
      if (!fs.existsSync(_0x57c274)) {
        fs.mkdirSync(_0x57c274, {
          recursive: true
        });
      }
      let _0x52ffe8 = [];
      if (fs.existsSync(_0x522c03)) {
        _0x52ffe8 = JSON.parse(fs.readFileSync(_0x522c03, "utf8"));
      }
      const _0x122aea = {
        license_key: _0x1c6fed,
        machine_id: _0x12536e,
        activated_at: new Date().toISOString(),
        app_version: _0x3a8699
      };
      _0x52ffe8.push(_0x122aea);
      fs.writeFileSync(_0x522c03, JSON.stringify(_0x52ffe8, null, 2));
    } catch (_0x32fd8c) {}
  }
  updateSelfContainedLicenseActivation(_0x5c40b3, _0x3dc4d6, _0x5bcacf) {
    try {
      const _0x49497a = this._userDataDir();
      const _0x72191e = path.join(_0x49497a, "activations.json");
      if (!fs.existsSync(_0x49497a)) {
        fs.mkdirSync(_0x49497a, {
          recursive: true
        });
      }
      let _0x50fa20 = [];
      if (fs.existsSync(_0x72191e)) {
        _0x50fa20 = JSON.parse(fs.readFileSync(_0x72191e, "utf8"));
      }
      const _0x42d17d = _0x50fa20.findIndex(_0x539baf => _0x539baf.machine_id === _0x3dc4d6);
      if (_0x42d17d !== -1) {
        _0x50fa20[_0x42d17d] = {
          ..._0x50fa20[_0x42d17d],
          license_key: _0x5c40b3,
          renewed_at: new Date().toISOString(),
          app_version: _0x5bcacf,
          renewal_count: (_0x50fa20[_0x42d17d].renewal_count || 0) + 1
        };
      } else {
        const _0x10e7de = {
          license_key: _0x5c40b3,
          machine_id: _0x3dc4d6,
          activated_at: new Date().toISOString(),
          app_version: _0x5bcacf,
          renewal_count: 1
        };
        _0x50fa20.push(_0x10e7de);
      }
      fs.writeFileSync(_0x72191e, JSON.stringify(_0x50fa20, null, 2));
    } catch (_0x28aa5b) {}
  }
}
module.exports = LocalLicenseService;