const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");

let cachedConfig = null;
let configLoadTime = 0;
const CONFIG_CACHE_DURATION = 300000;

function loadEncryptedConfig() {
  try {
    const now = Date.now();
    if (cachedConfig && now - configLoadTime < CONFIG_CACHE_DURATION) {
      return cachedConfig;
    }

    const jsonPath = path.join(__dirname, "reseller-config.json");
    if (fs.existsSync(jsonPath)) {
      cachedConfig = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      configLoadTime = now;
      return cachedConfig;
    }
  } catch (err) {
    // Fallback to default
  }

  return {
    RESELLER_CODE: null,
    RESELLER_INFO: {
      name: "WAGrow",
      logo: null,
      website: null,
      support_email: null,
      support_phone: null
    },
    LICENSE_SERVER: {
      base_url: "",
      api_version: "api"
    },
    APP_BRANDING: {
      show_reseller_info: false,
      custom_title: "WAGrow",
      splash_message: null
    },
    MASTER_ACCOUNT_MODE: true,
    MASTER_ACCOUNT_ID: null
  };
}

const RESELLER_CONFIG = loadEncryptedConfig();

function getResellerCode() {
  const cfg = loadEncryptedConfig();
  return cfg.RESELLER_CODE || null;
}

function isResellerBuild() {
  const cfg = loadEncryptedConfig();
  return cfg.RESELLER_CODE !== null && String(cfg.RESELLER_CODE).trim() !== "";
}

function getResellerInfo() {
  const cfg = loadEncryptedConfig();
  return cfg.RESELLER_INFO || {
    name: "WAGrow",
    logo: null,
    website: null,
    support_email: null,
    support_phone: null
  };
}

function getLicenseServerConfig() {
  const cfg = loadEncryptedConfig();
  return cfg.LICENSE_SERVER || {
    base_url: "",
    api_version: "api"
  };
}

function getAppBranding() {
  const cfg = loadEncryptedConfig();
  return cfg.APP_BRANDING || {
    show_reseller_info: false,
    custom_title: "WAGrow",
    splash_message: null
  };
}

function getTrialRegistrationEndpoint() {
  const serverCfg = getLicenseServerConfig();
  const baseUrl = serverCfg.base_url || "";
  const apiVersion = serverCfg.api_version || "api";
  if (!baseUrl) return "";
  return isResellerBuild()
    ? `${baseUrl}/reseller/${apiVersion}/trial`
    : `${baseUrl}/${apiVersion}/trial`;
}

function prepareTrialRegistrationData(email, phone) {
  let appVersion = "1.0.0";
  try {
    const electron = require("electron");
    if (electron && electron.app) {
      appVersion = electron.app.getVersion();
    }
  } catch (_) {}

  return {
    email: email,
    phone: phone,
    machine_id: crypto.createHash("sha256").update(os.hostname()).digest("hex").substring(0, 32),
    app_version: appVersion,
    platform: os.platform(),
    reseller_code: getResellerCode()
  };
}

module.exports = {
  RESELLER_CONFIG,
  getResellerCode,
  isResellerBuild,
  getResellerInfo,
  getLicenseServerConfig,
  getAppBranding,
  getTrialRegistrationEndpoint,
  prepareTrialRegistrationData
};