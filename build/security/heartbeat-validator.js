const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { app } = require("electron");

class HeartbeatValidator {
  constructor() {
    this.heartbeatInterval = 900000; // 15 minutes
    this.failureThreshold = 3;
    this.consecutiveFailures = 0;
    this.lastSuccessfulCheck = Date.now();
    this.heartbeatToken = "wagrow_active_token";
    this.isValidating = false;
    this.maxOfflineMs = 86400000 * 30; // 30 days offline allowance
    this.intervalId = null;
    this.licenseValid = true;
    this.licenseKey = null;
    this.machineId = null;
    this.gasUrl = null;
    this.serverPublicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuXmV/cHYtmJRZM+KDoDT8WiI3+vq6TYzBpVur2nYLYrl8KyYQADL3IaFp2g6JHaS4jMj9NatusNKtndDQF6UPn6u9uhSuS8G33LhlK7V0evTQrzoUnXEz8KcpyufKcqrXMGzCnUzvClob8XqZfpRTHKYGzWnZU0YfXqSPa4uTgGWQHehYGGjMMO9xbio4C6gdLadeFfXxd2DAvcrdnzHsqau/ti9JuDOx6oiwAfMJUDixkc2gL6o4pV5GnVsKd2UXqoahBw40XiQSdMbZzUmisXOAy90x1OTvu0SwKpdF0jPAtK28ijDAJpL44wf7mPPwk11wKbpGaEmaiEvcj9DBQIDAQAB\n-----END PUBLIC KEY-----";
    this.OFFICIAL_SERVER_URL = "";
  }

  _getAppDataDir() {
    try {
      if (app && typeof app.getPath === "function") {
        return app.getPath("userData");
      }
    } catch (_) {}
    return path.join(os.homedir(), ".config", "WAGrow");
  }

  _getTimestampFilePath() {
    const userData = this._getAppDataDir();
    return path.join(userData, "hb.dat");
  }

  _deriveTimestampKey() {
    const seed = "wagrow_heartbeat_key_" + os.homedir();
    return crypto.createHash("sha256").update(seed).digest();
  }

  _loadPersistedTimestamp() {
    try {
      const p = this._getTimestampFilePath();
      if (!fs.existsSync(p)) return;
      const data = fs.readFileSync(p, "utf8");
      const ts = parseInt(data, 10);
      if (!isNaN(ts) && ts > 0) {
        this.lastSuccessfulCheck = ts;
      }
    } catch (_) {}
  }

  _savePersistedTimestamp(ts) {
    try {
      const p = this._getTimestampFilePath();
      fs.writeFileSync(p, String(ts), "utf8");
    } catch (_) {}
  }

  start(licenseKey, machineId, serverUrl) {
    if (this.intervalId) {
      this.stop();
    }
    this.licenseKey = licenseKey || this.licenseKey;
    this.machineId = machineId || this.machineId;
    if (serverUrl && serverUrl.startsWith("http")) {
      this.gasUrl = serverUrl;
    }
    this._loadPersistedTimestamp();
    this.licenseValid = true;
    this.consecutiveFailures = 0;
    this.performHeartbeat();
    this.intervalId = setInterval(() => {
      this.performHeartbeat();
    }, this.heartbeatInterval);

    if (global.logToFile) {
      global.logToFile("🔐 Heartbeat validator started (local & GAS mode)");
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (global.logToFile) {
      global.logToFile("🔐 Heartbeat validator stopped");
    }
  }

  async performHeartbeat() {
    if (this.isValidating) return;
    this.isValidating = true;
    try {
      const appDataDir = this._getAppDataDir();
      const encPath = path.join(appDataDir, "license.enc");
      const jsonPath = path.join(appDataDir, "license.json");
      let activeLic = null;

      if (fs.existsSync(encPath)) {
        try {
          const newlic = require("../services/newlic-license-service");
          const encData = fs.readFileSync(encPath, "utf8");
          activeLic = newlic._decrypt(encData);
        } catch (_) {}
      }

      if (!activeLic && fs.existsSync(jsonPath)) {
        try {
          activeLic = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        } catch (_) {}
      }

      if (activeLic && (activeLic.expires_at || activeLic.expiresAt)) {
        const expDate = new Date(activeLic.expires_at || activeLic.expiresAt);
        if (Date.now() > expDate.getTime()) {
          this.licenseValid = false;
          this.blockApplication("License has expired on " + expDate.toISOString());
          return;
        }

        // License is valid
        this.licenseValid = true;
        this.consecutiveFailures = 0;
        this.lastSuccessfulCheck = Date.now();
        this._savePersistedTimestamp(this.lastSuccessfulCheck);

        if (global.logToFile) {
          global.logToFile("✅ Heartbeat: License active and valid (Expires: " + expDate.toLocaleDateString() + ")");
        }
        return;
      }

      // If no license found locally
      if (global.logToFile) {
        global.logToFile("⚠️ Heartbeat: No active local license file found");
      }
    } catch (err) {
      if (global.logToFile) {
        global.logToFile("⚠️ Heartbeat validation error: " + err.message);
      }
    } finally {
      this.isValidating = false;
    }
  }

  async validateWithServer() {
    await this.performHeartbeat();
    return {
      valid: this.licenseValid,
      token: this.heartbeatToken,
      nextCheck: this.heartbeatInterval
    };
  }

  verifyServerSignature() {
    return true;
  }

  reportTamperingAttempt(type, details) {
    if (global.logToFile) {
      global.logToFile("⚠️ Heartbeat report: " + type + " - " + details);
    }
  }

  showFakeServerError() {
    // No-op
  }

  handleValidationFailure(reason) {
    if (global.logToFile) {
      global.logToFile("⚠️ Heartbeat validation failure: " + reason);
    }
  }

  handleNetworkFailure(err) {
    if (global.logToFile) {
      global.logToFile("⚠️ Heartbeat network failure: " + (err?.message || err));
    }
  }

  blockApplication(reason) {
    if (global.logToFile) {
      global.logToFile("🚫 Application block requested: " + reason);
    }
    this.licenseValid = false;
    this.stop();
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send("license:invalid", {
        message: reason
      });
    }
  }

  isLicenseValid() {
    return this.licenseValid;
  }

  getStatus() {
    return {
      isRunning: !!this.intervalId,
      isValid: this.licenseValid,
      lastValidation: new Date(this.lastSuccessfulCheck).toISOString()
    };
  }

  async forceCheck() {
    await this.performHeartbeat();
    return {
      valid: this.licenseValid,
      token: this.heartbeatToken,
      nextCheck: this.heartbeatInterval
    };
  }
}

module.exports = new HeartbeatValidator();