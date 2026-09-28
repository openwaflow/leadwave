const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const {
  app
} = require("electron");
class CloudLicenseService {
  constructor() {
    this.apiBaseUrl = "";
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
    return {
      success: false,
      message: "Legacy cloud license activation is permanently disabled. Please use your WAGrow license key.",
      error_code: "LEGACY_CLOUD_DISABLED"
    };
  }
  async validateCloudLicense() {
    return {
      success: false,
      is_valid: false,
      message: "Legacy cloud license system is permanently disabled.",
      code: "LEGACY_CLOUD_DISABLED"
    };
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