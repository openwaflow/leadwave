const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const {
  app
} = require("electron");
class CloudLicenseService {
  constructor() {
    this.apiBaseUrl = "https://license.getleadwave.in/api";
    this.heartbeatInterval = 300000;
    this.gracePeriod = 86400000;
    this.heartbeatTimer = null;
  }
  getCloudLicenseFilePath() {
    const _0x5a789c = app.getPath("userData");
    if (!fs.existsSync(_0x5a789c)) {
      fs.mkdirSync(_0x5a789c, {
        recursive: true
      });
    }
    return path.join(_0x5a789c, "cloud-license.json");
  }
  hasCloudLicense() {
    const _0x13f3f5 = this.getCloudLicenseFilePath();
    return fs.existsSync(_0x13f3f5);
  }
  getCloudLicenseData() {
    try {
      const _0x5dc4f0 = this.getCloudLicenseFilePath();
      if (fs.existsSync(_0x5dc4f0)) {
        const _0x24b8c0 = fs.readFileSync(_0x5dc4f0, "utf8");
        return JSON.parse(_0x24b8c0);
      }
      return null;
    } catch (_0xe30fc3) {
      console.error("Error reading cloud license:", _0xe30fc3);
      return null;
    }
  }
  saveCloudLicenseData(_0x11f8fe) {
    try {
      const _0x195ef7 = this.getCloudLicenseFilePath();
      fs.writeFileSync(_0x195ef7, JSON.stringify(_0x11f8fe, null, 2));
      return true;
    } catch (_0x57499e) {
      console.error("Error saving cloud license:", _0x57499e);
      return false;
    }
  }
  deleteCloudLicense() {
    try {
      const _0xf615ad = this.getCloudLicenseFilePath();
      if (fs.existsSync(_0xf615ad)) {
        fs.unlinkSync(_0xf615ad);
      }
      return true;
    } catch (_0x2c05d7) {
      console.error("Error deleting cloud license:", _0x2c05d7);
      return false;
    }
  }
  async activateCloudLicense(_0x3f01e7, _0x3cee98) {
    try {
      const _0x200cca = require("node-fetch");
      const _0x2df51f = new AbortController();
      const _0xfb80e3 = setTimeout(() => _0x2df51f.abort(), 10000);
      let _0x5c5974;
      try {
        _0x5c5974 = await _0x200cca(this.apiBaseUrl + "/license/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            license_key: _0x3f01e7,
            machine_id: _0x3cee98,
            app_version: app.getVersion()
          }),
          signal: _0x2df51f.signal
        });
      } finally {
        clearTimeout(_0xfb80e3);
      }
      const _0x4a844c = await _0x5c5974.json();
      if (_0x4a844c.success && _0x4a844c.is_valid) {
        const _0x5ede4b = {
          license_key: _0x3f01e7,
          machine_id: _0x3cee98,
          customer_name: _0x4a844c.data.customer_name,
          plan: _0x4a844c.data.plan,
          plan_name: _0x4a844c.data.plan_name || _0x4a844c.data.plan,
          source: _0x4a844c.data.source,
          expires_at: _0x4a844c.data.expires_at,
          modules: _0x4a844c.data.modules || [],
          features: _0x4a844c.data.features || [],
          status: _0x4a844c.data.status || "active",
          company_info: _0x4a844c.data.company_info || null,
          activated_at: new Date().toISOString(),
          last_validated_at: new Date().toISOString(),
          last_validation_success: new Date().toISOString()
        };
        this.saveCloudLicenseData(_0x5ede4b);
        return {
          success: true,
          message: "Cloud license activated successfully",
          data: _0x5ede4b
        };
      } else {
        return {
          success: false,
          message: _0x4a844c.message || "License validation failed",
          code: _0x4a844c.code,
          status: _0x4a844c.status
        };
      }
    } catch (_0x4e87db) {
      console.error("Cloud license activation error:", _0x4e87db);
      return {
        success: false,
        message: "Failed to connect to license server",
        error: _0x4e87db.message
      };
    }
  }
  async validateCloudLicense() {
    try {
      const _0x733845 = this.getCloudLicenseData();
      if (!_0x733845) {
        return {
          success: false,
          message: "No cloud license found",
          code: "NO_CLOUD_LICENSE"
        };
      }
      const _0x5e34ec = require("node-fetch");
      const _0x24ba30 = new AbortController();
      const _0x39a0bd = setTimeout(() => _0x24ba30.abort(), 10000);
      let _0x2e1bae;
      try {
        _0x2e1bae = await _0x5e34ec(this.apiBaseUrl + "/license/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            license_key: _0x733845.license_key,
            machine_id: _0x733845.machine_id,
            app_version: app.getVersion()
          }),
          signal: _0x24ba30.signal
        });
      } finally {
        clearTimeout(_0x39a0bd);
      }
      const _0x38a5a8 = await _0x2e1bae.json();
      _0x733845.last_validated_at = new Date().toISOString();
      if (_0x38a5a8.success && _0x38a5a8.is_valid) {
        _0x733845.last_validation_success = new Date().toISOString();
        this.saveCloudLicenseData(_0x733845);
        return {
          success: true,
          is_valid: true,
          status: "active",
          message: "License is active and valid",
          data: _0x38a5a8.data
        };
      } else {
        this.saveCloudLicenseData(_0x733845);
        return {
          success: false,
          is_valid: false,
          status: _0x38a5a8.status,
          message: _0x38a5a8.message,
          code: _0x38a5a8.code,
          suspension_reason: _0x38a5a8.suspension_reason
        };
      }
    } catch (_0x2d2f48) {
      console.error("Cloud license validation error:", _0x2d2f48);
      return this.handleNetworkError();
    }
  }
  handleNetworkError() {
    const _0x3094c2 = this.getCloudLicenseData();
    if (!_0x3094c2 || !_0x3094c2.last_validation_success) {
      return {
        success: false,
        is_valid: false,
        status: "offline",
        message: "Internet connection required to validate license",
        code: "CONNECTION_REQUIRED"
      };
    }
    const _0x16b22f = new Date(_0x3094c2.last_validation_success);
    const _0x1d2eee = new Date();
    const _0x3a2516 = _0x1d2eee - _0x16b22f;
    if (_0x3a2516 > this.gracePeriod) {
      return {
        success: false,
        is_valid: false,
        status: "offline",
        message: "License validation required. Please connect to the internet.",
        code: "GRACE_PERIOD_EXPIRED"
      };
    }
    const _0x5948eb = Math.round((this.gracePeriod - _0x3a2516) / 3600000);
    return {
      success: true,
      is_valid: true,
      status: "offline_grace",
      message: "Working offline (" + _0x5948eb + " hours remaining)",
      code: "OFFLINE_GRACE_PERIOD"
    };
  }
  startPeriodicValidation() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.validateCloudLicense().then(_0x343218 => {
      if (!_0x343218.is_valid && _0x343218.status === "suspended") {
        this.handleSuspendedLicense(_0x343218.suspension_reason);
      }
    });
    this.heartbeatTimer = setInterval(async () => {
      const _0x304b72 = await this.validateCloudLicense();
      if (!_0x304b72.is_valid) {
        if (_0x304b72.status === "suspended") {
          this.handleSuspendedLicense(_0x304b72.suspension_reason);
        } else if (_0x304b72.status === "expired") {
          this.handleExpiredLicense();
        } else if (_0x304b72.status === "revoked") {
          this.handleRevokedLicense();
        }
      }
    }, this.heartbeatInterval);
  }
  stopPeriodicValidation() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  handleSuspendedLicense(_0x13efe4) {
    this.stopPeriodicValidation();
    this.deleteCloudLicense();
  }
  handleExpiredLicense() {
    this.stopPeriodicValidation();
    this.deleteCloudLicense();
  }
  handleRevokedLicense() {
    this.stopPeriodicValidation();
    this.deleteCloudLicense();
  }
}
module.exports = new CloudLicenseService();