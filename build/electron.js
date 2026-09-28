const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Notification
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const fetch = require("node-fetch");
let APP_CONFIG;
try {
  APP_CONFIG = require("../config/app.config");
} catch (_0x257cd6) {
  try {
    APP_CONFIG = require("./config/app.config");
  } catch (_0x3b966e) {
    APP_CONFIG = {
      APP_CONFIG: {
        APP_NAME: "WAGrow"
      }
    };
  }
}
const customAppName = APP_CONFIG.APP_CONFIG.APP_NAME.replace(/\s+/g, "");
app.setPath("userData", path.join(app.getPath("appData"), customAppName));
let packageJson;
try {
  packageJson = require("../../package.json");
} catch (_0x518a61) {
  try {
    packageJson = require("../package.json");
  } catch (_0x42321b) {
    try {
      packageJson = require(path.join(__dirname, "../../package.json"));
    } catch (_0x3533f1) {
      if (isDev) {}
      packageJson = {
        version: "9.0.0"
      };
    }
  }
}
app.setVersion(packageJson.version);
const forceProduction = process.argv.includes("--prod");
const isDev = !forceProduction && !app.isPackaged;
function resolveModulePath(_0x28a2ed) {
  if (isDev) {
    return path.join(__dirname, "..", _0x28a2ed);
  } else {
    const _0x3bfa93 = path.join(__dirname, "..", "..", "app.asar.unpacked", "build", _0x28a2ed);
    if (fs.existsSync(_0x3bfa93)) {
      return _0x3bfa93;
    }
    return path.join(__dirname, _0x28a2ed);
  }
}
let antiTamper = null;
let hardwareFingerprint = null;
if (!isDev) {
  try {
    hardwareFingerprint = require(resolveModulePath("security/hardware-fingerprint"));
  } catch (_0x1d31d2) {}
}
let resellerConfig;
const configPaths = [path.resolve(__dirname, "../config/reseller-config.js"), path.resolve(__dirname, "./config/reseller-config.js"), path.resolve(__dirname, "config/reseller-config.js")];
configPaths.forEach(_0x3a3ef5 => {
  delete require.cache[_0x3a3ef5];
});
try {
  resellerConfig = require("../config/reseller-config");
} catch (_0x9bf82d) {
  try {
    resellerConfig = require("./config/reseller-config");
  } catch (_0x4dd6e2) {
    try {
      resellerConfig = require(path.join(__dirname, "config", "reseller-config"));
    } catch (_0x289a3b) {
      resellerConfig = {
        getResellerCode: () => null,
        isResellerBuild: () => false,
        isMasterAccountMode: () => true,
        getMasterAccountId: () => null,
        getResellerInfo: () => ({
          name: "WAGrow"
        }),
        getTrialRegistrationEndpoint: () => "local://keygen/trial/register",
        prepareTrialRegistrationData: _0x37de9f => ({
          name: _0x37de9f.name,
          email: _0x37de9f.email,
          phone: _0x37de9f.phone,
          machine_id: _0x37de9f.machine_id,
          reseller_code: null
        })
      };
    }
  }
}
const {
  getResellerCode,
  isResellerBuild,
  isMasterAccountMode,
  getMasterAccountId,
  getResellerInfo,
  getTrialRegistrationEndpoint,
  prepareTrialRegistrationData
} = resellerConfig;
let mainWindow = null;
let appService = null;
let databaseService = null;
let backupService = null;
let updateService = null;
let liveChatService = null;
let restAPIServer = null;
let telegramService = null;
let isQuitting = false;
let isShuttingDown = false;
let _appServiceLoadPromise = null;
async function initializeLiveChatService() {
  const _0x1f1e84 = [];
  try {
    if (!appService) {
      const _0x36b1ab = "❌ [Live Chat] Cannot initialize: appService is null";
      logToFile(_0x36b1ab);
      _0x1f1e84.push(_0x36b1ab);
      return {
        success: false,
        errors: _0x1f1e84
      };
    }
    if (appService.getLiveChatService) {
      liveChatService = appService.getLiveChatService();
      if (liveChatService) {
        return {
          success: true
        };
      }
    }
    logToFile("⚠️ [Live Chat] Live Chat service not available from app service, creating new instance...");
    const _0xfe99e1 = appService.getDatabaseService ? appService.getDatabaseService() : appService.database;
    if (!_0xfe99e1) {
      const _0xe3d7e8 = "❌ [Live Chat] Cannot initialize: databaseService is null";
      logToFile(_0xe3d7e8);
      _0x1f1e84.push(_0xe3d7e8);
      return {
        success: false,
        errors: _0x1f1e84
      };
    }
    const _0x432a3e = resolveModulePath("services/live-chat.service");
    const _0x4b0e67 = require(_0x432a3e);
    const _0x2bef1f = appService.getWhatsAppService ? appService.getWhatsAppService() : null;
    liveChatService = new _0x4b0e67(_0xfe99e1, _0x2bef1f);
    await liveChatService.initialize();
    return {
      success: true
    };
  } catch (_0x5318a0) {
    const _0x414d0d = "❌ [Live Chat] Failed to initialize: " + _0x5318a0.message;
    const _0x4575af = "❌ [Live Chat] Error stack: " + _0x5318a0.stack;
    logToFile(_0x414d0d);
    logToFile(_0x4575af);
    _0x1f1e84.push(_0x414d0d);
    _0x1f1e84.push(_0x4575af);
    return {
      success: false,
      errors: _0x1f1e84,
      errorMessage: _0x5318a0.message,
      errorStack: _0x5318a0.stack
    };
  }
}
async function initializeRestAPIServer() {
  try {
    if (!appService) {
      logToFile("❌ [REST API] Cannot initialize: appService is null");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x18b6ad = appService.getDatabaseService ? appService.getDatabaseService() : appService.database;
    if (!_0x18b6ad) {
      logToFile("❌ [REST API] Cannot initialize: databaseService is null");
      return {
        success: false,
        error: "Database service not available"
      };
    }
    await _0x18b6ad.runRestAPIMigration();
    const _0x7f8902 = resolveModulePath("api/server");
    let _0x510777;
    try {
      _0x510777 = require(_0x7f8902);
    } catch (_0xe7eed3) {
      logToFile("❌ [REST API] Error loading server module: " + _0xe7eed3.message);
      logToFile("❌ [REST API] Error stack: " + _0xe7eed3.stack);
      throw _0xe7eed3;
    }
    const _0x197554 = appService.getLicenseService ? appService.getLicenseService() : null;
    restAPIServer = new _0x510777(appService, _0x197554, _0x18b6ad);
    await restAPIServer.loadConfig();
    if (restAPIServer.config.enabled) {
      await restAPIServer.start();
    }
    return {
      success: true
    };
  } catch (_0x3636c) {
    logToFile("❌ [REST API] Failed to initialize: " + _0x3636c.message);
    logToFile("❌ [REST API] Error stack: " + _0x3636c.stack);
    return {
      success: false,
      error: _0x3636c.message
    };
  }
}
function generateLicenseSignature(_0x34f7d2) {
  const _0x49b251 = require("crypto");
  const _0x38ec75 = _0x34f7d2.customer_name + "|" + _0x34f7d2.expires_at + "|" + _0x34f7d2.plan_name + "|LEADWAVE_LICENSE_SECRET";
  return _0x49b251.createHash("sha256").update(_0x38ec75).digest("hex");
}
function verifyLicenseIntegrity(_0xaa3923) {
  if (!_0xaa3923.signature) {
    return false;
  }
  const _0x4a230f = generateLicenseSignature(_0xaa3923);
  return _0xaa3923.signature === _0x4a230f;
}
function addLicenseSignature(_0x426750) {
  _0x426750.signature = generateLicenseSignature(_0x426750);
  return _0x426750;
}
const getAppDataPath = () => {
  const _0x575912 = app.getPath("userData");
  const _0x2b74c6 = path.join(os.homedir(), "Lead Wave");
  if (fs.existsSync(_0x2b74c6)) {
    if (!fs.existsSync(_0x575912)) {
      try {
        const _0x27fd14 = path.dirname(_0x575912);
        if (!fs.existsSync(_0x27fd14)) {
          fs.mkdirSync(_0x27fd14, {
            recursive: true
          });
        }
        fs.renameSync(_0x2b74c6, _0x575912);
        logToFile("✅ Migrated app data from Lead Wave to Lead Wave folder");
      } catch (_0x1b75f9) {
        logToFile("❌ Failed to migrate app data folder: " + _0x1b75f9.message);
        try {
          const _0x405f3e = (_0x4fc073, _0x448fde) => {
            if (fs.statSync(_0x4fc073).isDirectory()) {
              if (!fs.existsSync(_0x448fde)) {
                fs.mkdirSync(_0x448fde, {
                  recursive: true
                });
              }
              fs.readdirSync(_0x4fc073).forEach(_0x5f1139 => {
                _0x405f3e(path.join(_0x4fc073, _0x5f1139), path.join(_0x448fde, _0x5f1139));
              });
            } else {
              fs.copyFileSync(_0x4fc073, _0x448fde);
            }
          };
          _0x405f3e(_0x2b74c6, _0x575912);
          logToFile("✅ Copied app data from Lead Wave to Lead Wave folder");
          try {
            fs.rmSync(_0x2b74c6, {
              recursive: true,
              force: true
            });
            logToFile("✅ Removed old Lead Wave folder");
          } catch (_0x2ec47f) {
            logToFile("⚠️ Could not remove old Lead Wave folder: " + _0x2ec47f.message);
          }
        } catch (_0x5d2d42) {
          logToFile("❌ Failed to copy app data: " + _0x5d2d42.message);
        }
      }
    } else {
      try {
        const _0x1ee237 = _0x3478bd => {
          const _0x33bb32 = fs.readdirSync(_0x3478bd);
          if (_0x33bb32.length === 0) {
            return true;
          }
          for (const _0xec68a2 of _0x33bb32) {
            const _0x43113d = path.join(_0x3478bd, _0xec68a2);
            const _0x5642e4 = fs.statSync(_0x43113d);
            if (_0x5642e4.isFile()) {
              return false;
            }
            if (_0x5642e4.isDirectory() && !_0x1ee237(_0x43113d)) {
              return false;
            }
          }
          return true;
        };
        if (_0x1ee237(_0x2b74c6)) {
          fs.rmSync(_0x2b74c6, {
            recursive: true,
            force: true
          });
          logToFile("✅ Removed empty Lead Wave folder");
        } else {
          logToFile("⚠️ Lead Wave folder exists with data - manual cleanup may be needed");
        }
      } catch (_0x12d97f) {
        logToFile("⚠️ Could not check/remove Lead Wave folder: " + _0x12d97f.message);
      }
    }
  }
  return _0x575912;
};
const logDir = path.join(getAppDataPath(), "logs");
const logFile = path.join(logDir, "app-debug.log");
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, {
      recursive: true
    });
  }
} catch (_0x44defb) {
  if (isDev) {
    console.error("Failed to create log directory:", _0x44defb);
  }
}
const _logBuffer = [];
let _logFlushTimer = null;
function _flushLogBuffer() {
  _logFlushTimer = null;
  if (_logBuffer.length === 0) {
    return;
  }
  const _0x3a9ea8 = _logBuffer.splice(0, _logBuffer.length).join("");
  fs.appendFile(logFile, _0x3a9ea8, _0x420096 => {
    if (_0x420096 && isDev) {
      console.error("Failed to write to log file:", _0x420096);
    }
  });
}
function logToFile(_0x28e331) {
  const _0x4d3240 = new Date().toISOString();
  _logBuffer.push("[" + _0x4d3240 + "] " + _0x28e331 + "\n");
  if (!_logFlushTimer) {
    _logFlushTimer = setTimeout(_flushLogBuffer, 500);
  }
}
global.logToFile = logToFile;
logToFile("🚀 Starting WAGrow WhatsApp Desktop...");
const initializeBackupService = () => {
  if (!backupService && appService) {
    try {
      let _0x24cdd1;
      try {
        _0x24cdd1 = require("../services/backup.service");
      } catch (_0xf310ba) {
        try {
          _0x24cdd1 = require("./services/backup.service");
        } catch (_0x3ef40f) {
          try {
            _0x24cdd1 = require(path.join(__dirname, "services", "backup.service"));
          } catch (_0x4bacf2) {
            throw new Error("Failed to load backup service from any path: " + _0x4bacf2.message);
          }
        }
      }
      const _0x6f2c47 = appService.getDatabaseService();
      backupService = new _0x24cdd1(_0x6f2c47);
      logToFile("✅ Backup service initialized");
    } catch (_0x1791d3) {
      logToFile("❌ Failed to initialize backup service: " + _0x1791d3.message);
    }
  }
  return backupService;
};
const initializeUpdateService = () => {
  if (!updateService) {
    try {
      let _0x28c3a3;
      try {
        _0x28c3a3 = require("../services/update-service");
      } catch (_0x27826d) {
        try {
          _0x28c3a3 = require("./services/update-service");
        } catch (_0x5db710) {
          try {
            _0x28c3a3 = require(path.join(__dirname, "services", "update-service"));
          } catch (_0x154b64) {
            throw new Error("Failed to load update service from any path: " + _0x154b64.message);
          }
        }
      }
      updateService = new _0x28c3a3();
      logToFile("✅ Update service initialized");
      if (mainWindow) {
        updateService.setMainWindow(mainWindow);
      }
      updateService.startPeriodicCheck(24);
    } catch (_0xdcd4) {
      logToFile("❌ Failed to initialize update service: " + _0xdcd4.message);
    }
  }
};
ipcMain.handle("backup:create", async (_0x1351a9, _0x58e57a) => {
  try {
    logToFile("🔄 Creating backup...");
    if (!appService) {
      throw new Error("App service not available");
    }
    const _0x187030 = initializeBackupService();
    if (!_0x187030) {
      throw new Error("Backup service not available");
    }
    const _0x2d798e = await _0x187030.createBackup(_0x58e57a);
    logToFile("✅ Backup creation result: " + JSON.stringify(_0x2d798e));
    return _0x2d798e;
  } catch (_0x3bd7c6) {
    logToFile("❌ Backup creation error: " + _0x3bd7c6.message);
    return {
      success: false,
      error: _0x3bd7c6.message
    };
  }
});
ipcMain.handle("backup:restore", async (_0x22a208, _0x1afa25, _0xd748e6) => {
  try {
    logToFile("🔄 Restoring backup from: " + _0x1afa25);
    if (!appService) {
      throw new Error("App service not available");
    }
    const _0x47da7b = initializeBackupService();
    if (!_0x47da7b) {
      throw new Error("Backup service not available");
    }
    return await _0x47da7b.restoreFromBackup(_0x1afa25, _0xd748e6);
  } catch (_0x1630d6) {
    logToFile("❌ Backup restore error: " + _0x1630d6.message);
    return {
      success: false,
      error: _0x1630d6.message
    };
  }
});
ipcMain.handle("backup:get-history", async _0x14121a => {
  try {
    logToFile("🔄 Getting backup history...");
    if (!appService) {
      throw new Error("App service not available");
    }
    const _0x162cf7 = initializeBackupService();
    if (!_0x162cf7) {
      throw new Error("Backup service not available");
    }
    const _0x35c994 = await _0x162cf7.getBackupHistory();
    return {
      success: true,
      data: _0x35c994
    };
  } catch (_0x4a2df5) {
    logToFile("❌ Get backup history error: " + _0x4a2df5.message);
    return {
      success: false,
      error: _0x4a2df5.message
    };
  }
});
ipcMain.handle("backup:select-file", async _0xa7f9a1 => {
  try {
    const {
      dialog: _0x2f2444
    } = require("electron");
    const _0xd6d6e4 = await _0x2f2444.showOpenDialog(mainWindow, {
      title: APP_CONFIG.APP_CONFIG.APP_NAME,
      filters: [{
        name: "Backup Files",
        extensions: ["zip"]
      }, {
        name: "All Files",
        extensions: ["*"]
      }],
      properties: ["openFile"]
    });
    if (_0xd6d6e4.canceled) {
      return {
        success: false,
        canceled: true
      };
    }
    return {
      success: true,
      filePath: _0xd6d6e4.filePaths[0]
    };
  } catch (_0x18571a) {
    logToFile("❌ File selection error: " + _0x18571a.message);
    return {
      success: false,
      error: _0x18571a.message
    };
  }
});
ipcMain.handle("backup:select-save-location", async (_0x30d36b, _0x3a3703) => {
  try {
    const {
      dialog: _0x4b2ebe
    } = require("electron");
    const _0x51f211 = await _0x4b2ebe.showSaveDialog(mainWindow, {
      title: "Save Backup As",
      defaultPath: _0x3a3703 || "leadwave-backup.zip",
      filters: [{
        name: "Backup Files",
        extensions: ["zip"]
      }, {
        name: "All Files",
        extensions: ["*"]
      }]
    });
    if (_0x51f211.canceled) {
      return {
        success: false,
        canceled: true
      };
    }
    return {
      success: true,
      filePath: _0x51f211.filePath
    };
  } catch (_0x6a2289) {
    logToFile("❌ Save location selection error: " + _0x6a2289.message);
    return {
      success: false,
      error: _0x6a2289.message
    };
  }
});
ipcMain.handle("backup:validate-file", async (_0x1978f0, _0x4ab22d) => {
  try {
    if (!appService) {
      throw new Error("App service not available");
    }
    const _0x111ff5 = initializeBackupService();
    if (!_0x111ff5) {
      throw new Error("Backup service not available");
    }
    return await _0x111ff5.validateBackupFile(_0x4ab22d);
  } catch (_0x3c76b0) {
    logToFile("❌ Backup validation error: " + _0x3c76b0.message);
    return {
      valid: false,
      error: _0x3c76b0.message
    };
  }
});
ipcMain.handle("app:restart", async _0x36fc51 => {
  try {
    logToFile("🔄 Application restart requested");
    app.relaunch();
    app.exit(0);
    return {
      success: true
    };
  } catch (_0xc818a7) {
    logToFile("❌ App restart error: " + _0xc818a7.message);
    return {
      success: false,
      error: _0xc818a7.message
    };
  }
});
const MUTEX_NAME = "WAGrow WhatsAppDesktopMutex";
try {
  singleInstanceLock = app.requestSingleInstanceLock();
} catch (_0x4038a8) {
  logToFile("❌ Failed to acquire single instance lock: " + _0x4038a8.message);
  singleInstanceLock = false;
}
if (!singleInstanceLock) {
  logToFile("❌ Another instance is already running. Exiting gracefully...");
  app.quit();
  process.exit(0);
}
app.on("second-instance", (_0x1db8ae, _0x1ed63c, _0x2ffb66) => {
  logToFile("🔄 Second instance detected, focusing existing window...");
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
  }
});
if (!globalThis.crypto) {
  const {
    webcrypto
  } = require("crypto");
  globalThis.crypto = webcrypto;
}
async function gracefulShutdown() {
  if (isShuttingDown) {
    logToFile("🔄 Shutdown already in progress...");
    return;
  }
  isShuttingDown = true;
  logToFile("🔄 Starting graceful shutdown...");
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      logToFile("🪟 Closing main window...");
      mainWindow.removeAllListeners();
      mainWindow.close();
      mainWindow = null;
    }
    if (appService) {
      logToFile("🔄 Shutting down app service...");
      await appService.shutdown();
      logToFile("✅ App service shutdown complete");
    }
    if (singleInstanceLock) {
      logToFile("🔓 Releasing single instance lock...");
      app.releaseSingleInstanceLock();
    }
    logToFile("✅ Graceful shutdown complete");
    setTimeout(() => {
      logToFile("🔄 Force exiting process...");
      process.exit(0);
    }, 1000);
  } catch (_0x4f6100) {
    logToFile("❌ Error during shutdown: " + _0x4f6100.message);
    process.exit(1);
  }
}
process.on("uncaughtException", _0x1d5f38 => {
  if (_0x1d5f38.code === "EBADF") {
    return;
  }
  logToFile("❌ Uncaught Exception: " + _0x1d5f38.message);
  logToFile("Stack: " + _0x1d5f38.stack);
  if (_0x1d5f38.code === "EADDRINUSE" || _0x1d5f38.code === "EACCES" || _0x1d5f38.message.includes("Cannot find module")) {
    logToFile("💥 Critical system error detected, shutting down...");
    gracefulShutdown();
  } else {
    logToFile("⚠️ Non-critical error, continuing operation...");
  }
});
process.on("unhandledRejection", (_0x4ac613, _0x3aa4c5) => {
  const _0x346711 = _0x4ac613?.message || String(_0x4ac613);
  if (_0x346711 === "TIMEOUT" || (_0x4ac613?.stack || "").includes("updates.js")) {
    logToFile("[Telegram] Suppressed background update-loop error: " + _0x346711);
    return;
  }
  logToFile("❌ Unhandled Rejection: " + _0x4ac613);
  logToFile("Promise: " + _0x3aa4c5);
  logToFile("⚠️ Unhandled rejection logged, continuing operation...");
});
process.on("SIGTERM", () => {
  logToFile("🔄 Received SIGTERM");
  gracefulShutdown();
});
process.on("SIGINT", () => {
  logToFile("🔄 Received SIGINT");
  gracefulShutdown();
});
if (process.platform === "win32") {
  process.on("SIGBREAK", () => {
    logToFile("🔄 Received SIGBREAK");
    gracefulShutdown();
  });
}
app.on("window-all-closed", () => {
  logToFile("🔄 All windows closed");
  if (process.platform !== "darwin") {
    isQuitting = true;
    gracefulShutdown();
  }
});
app.on("before-quit", async _0x3a64ca => {
  logToFile("🔄 Before quit event triggered");
  if (global.isUpdating) {
    logToFile("🔄 Skipping confirmation dialog - app is updating");
    isQuitting = true;
    gracefulShutdown();
    return;
  }
  if (!isQuitting) {
    _0x3a64ca.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      const {
        dialog: _0x2026f8
      } = require("electron");
      const _0x5a6533 = await _0x2026f8.showMessageBox(mainWindow, {
        type: "question",
        buttons: ["Yes", "No"],
        defaultId: 1,
        title: "Confirm Exit",
        message: "Are you sure you want to close " + APP_CONFIG.APP_CONFIG.APP_NAME + "?",
        detail: "This will stop all WhatsApp sessions and close the application.",
        icon: null
      });
      if (_0x5a6533.response === 0) {
        logToFile("🔄 User confirmed application exit via before-quit");
        isQuitting = true;
        gracefulShutdown();
      } else {
        logToFile("🔄 User cancelled application exit via before-quit");
      }
    } else {
      isQuitting = true;
      gracefulShutdown();
    }
  }
});
app.on("will-quit", _0x4e2ab5 => {
  logToFile("🔄 Will quit event triggered");
  if (!isShuttingDown) {
    _0x4e2ab5.preventDefault();
    gracefulShutdown();
  }
});
function setupWindowEventHandlers(_0x4355f6) {
  _0x4355f6.on("close", async _0x50db09 => {
    logToFile("🔄 Window close event triggered");
    if (!isQuitting) {
      _0x50db09.preventDefault();
      try {
        const _0x37b479 = await new Promise((_0x231bc8, _0x3478d8) => {
          const _0x5ab5ac = setTimeout(() => {
            _0x3478d8(new Error("Close confirmation timeout"));
          }, 10000);
          const _0x1f9651 = (_0x30d0dc, _0x2f48c3) => {
            clearTimeout(_0x5ab5ac);
            ipcMain.removeListener("app:close-confirmation-response", _0x1f9651);
            _0x231bc8(_0x2f48c3);
          };
          ipcMain.once("app:close-confirmation-response", _0x1f9651);
          _0x4355f6.webContents.send("app:show-close-confirmation", {
            title: "Confirm Exit",
            message: "Are you sure you want to close " + APP_CONFIG.APP_CONFIG.APP_NAME + "?\n\nThis will stop all WhatsApp sessions and close the application."
          });
        });
        if (_0x37b479) {
          logToFile("🔄 User confirmed application exit via in-app dialog");
          isQuitting = true;
          gracefulShutdown();
        } else {
          logToFile("🔄 User cancelled application exit via in-app dialog");
        }
      } catch (_0x4ae761) {
        logToFile("❌ Error showing close confirmation: " + _0x4ae761.message);
        isQuitting = true;
        gracefulShutdown();
      }
    }
  });
  _0x4355f6.on("closed", () => {
    logToFile("🔄 Window closed event triggered");
    mainWindow = null;
    if (!isQuitting) {
      isQuitting = true;
      gracefulShutdown();
    }
  });
}
function createWindow() {
  try {
    let _0x4e40a2 = true;
    try {
      if (databaseService && databaseService.db) {
        const _0x30d978 = databaseService.db.prepare("SELECT value FROM app_settings WHERE key = ?").get("window_show_title_bar");
        if (_0x30d978) {
          _0x4e40a2 = _0x30d978.value === "true";
        }
      } else {
        logToFile("⚠️ Database not available during window creation, using default title bar setting");
      }
    } catch (_0x4c41dc) {
      logToFile("⚠️ Error loading window frame preference: " + _0x4c41dc.message + ", using default");
    }
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      title: APP_CONFIG.APP_CONFIG.APP_NAME,
      icon: path.join(__dirname, "../../build-resources/assets/app-icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        devTools: isDev,
        preload: path.join(__dirname, "preload.js")
      },
      show: false,
      backgroundColor: "#111827",
      titleBarStyle: "default",
      frame: true,
      autoHideMenuBar: !_0x4e40a2
    });
    mainWindow.setTitle(APP_CONFIG.APP_CONFIG.APP_NAME);
    if (!_0x4e40a2) {
      mainWindow.setMenuBarVisibility(false);
      mainWindow.setAutoHideMenuBar(true);
    } else {
      mainWindow.setMenuBarVisibility(true);
      mainWindow.setAutoHideMenuBar(false);
    }
    mainWindow.webContents.session.setPermissionRequestHandler((_0x1525ae, _0x583889, _0x46b1fe) => {
      if (_0x583889 === "notifications") {
        logToFile("🚫 Blocking browser notification permission request - using in-app notifications instead");
        _0x46b1fe(false);
      } else {
        _0x46b1fe(true);
      }
    });
    mainWindow.webContents.session.setPermissionCheckHandler((_0x141e5c, _0x34c713, _0x3c0f59, _0x22e916) => {
      if (_0x34c713 === "notifications") {
        logToFile("🚫 Blocking notification permission check - using in-app notifications instead");
        return false;
      }
      return true;
    });
    mainWindow.webContents.executeJavaScript("\n      // Override the Notification constructor to prevent system notifications\n      window.Notification = class {\n        constructor() {\n          // Browser notification blocked - using in-app notifications instead\n          return {};\n        }\n        static get permission() { return 'denied'; }\n        static requestPermission() {\n          // Notification.requestPermission() blocked - using in-app notifications instead\n          return Promise.resolve('denied');\n        }\n      };\n\n      // Also override any existing Notification references\n      if (window.webkitNotifications) {\n        window.webkitNotifications = undefined;\n      }\n\n      // Browser Notification API overridden to prevent system notifications\n    ").catch(_0x498f15 => {
      logToFile("⚠️ Failed to override Notification API initially: " + _0x498f15.message);
    });
    mainWindow.webContents.on("did-finish-load", () => {
      try {
        mainWindow.webContents.setZoomLevel(-0.5);
      } catch (_0x42d86a) {}
    });
    mainWindow.webContents.on("did-navigate", () => {
      try {
        mainWindow.webContents.setZoomLevel(-0.5);
      } catch (_0x578532) {}
    });
    mainWindow.webContents.on("dom-ready", () => {
      mainWindow.webContents.executeJavaScript("\n        // Override the Notification constructor to prevent system notifications\n        window.Notification = class {\n          constructor() {\n            // Browser notification blocked - using in-app notifications instead\n            return {};\n          }\n          static get permission() { return 'denied'; }\n          static requestPermission() {\n            // Notification.requestPermission() blocked - using in-app notifications instead\n            return Promise.resolve('denied');\n          }\n        };\n\n        // Also override any existing Notification references\n        if (window.webkitNotifications) {\n          window.webkitNotifications = undefined;\n        }\n\n        // Browser Notification API overridden on DOM ready to prevent system notifications\n      ").catch(_0x32f48d => {
        logToFile("⚠️ Failed to override Notification API on DOM ready: " + _0x32f48d.message);
      });
    });
    mainWindow.webContents.on("did-navigate", () => {
      mainWindow.webContents.executeJavaScript("\n        // Override the Notification constructor to prevent system notifications\n        window.Notification = class {\n          constructor() {\n            // Browser notification blocked - using in-app notifications instead\n            return {};\n          }\n          static get permission() { return 'denied'; }\n          static requestPermission() {\n            // Notification.requestPermission() blocked - using in-app notifications instead\n            return Promise.resolve('denied');\n          }\n        };\n\n        // Also override any existing Notification references\n        if (window.webkitNotifications) {\n          window.webkitNotifications = undefined;\n        }\n\n        // Browser Notification API overridden on navigation to prevent system notifications\n      ").catch(_0x3f19e1 => {
        logToFile("⚠️ Failed to override Notification API on navigation: " + _0x3f19e1.message);
      });
    });
    setupWindowEventHandlers(mainWindow);
    if (isDev) {
      mainWindow.loadURL("http://localhost:3000").catch(_0x1f64f0 => {
        logToFile("❌ Failed to load dev server: " + _0x1f64f0.message);
        const _0x3afb79 = "\n          <html>\n            <head><title>Development Server Not Running</title></head>\n            <body style=\"font-family: Arial, sans-serif; padding: 40px; text-align: center;\">\n              <h1 style=\"color: #e74c3c;\">Development Server Not Running</h1>\n              <p>Please run \"npm run dev:react\" first.</p>\n            </body>\n          </html>\n        ";
        mainWindow.loadURL("data:text/html," + encodeURIComponent(_0x3afb79));
      });
    } else {
      const _0x38f913 = path.join(__dirname, "index.html");
      logToFile("🔄 Loading production build from: " + _0x38f913);
      if (fs.existsSync(_0x38f913)) {
        mainWindow.loadFile(_0x38f913);
      } else {
        logToFile("❌ Index file not found: " + _0x38f913);
        const _0x228af7 = "\n          <html>\n            <head><title>Build Not Found</title></head>\n            <body style=\"font-family: Arial, sans-serif; padding: 40px; text-align: center;\">\n              <h1 style=\"color: #e74c3c;\">Build Not Found</h1>\n              <p>Application files could not be located.</p>\n              <p><strong>Path:</strong> " + _0x38f913 + "</p>\n            </body>\n          </html>\n        ";
        mainWindow.loadURL("data:text/html," + encodeURIComponent(_0x228af7));
      }
    }
    let _0x17295e = false;
    const _0x5acbda = () => {
      if (_0x17295e || !mainWindow || mainWindow.isDestroyed()) {
        return;
      }
      _0x17295e = true;
      mainWindow.show();
      mainWindow.focus();
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    };
    mainWindow.webContents.once("dom-ready", _0x5acbda);
    mainWindow.once("ready-to-show", _0x5acbda);
    setTimeout(_0x5acbda, 3000);
    if (!isDev) {
      mainWindow.webContents.on("before-input-event", (_0x4b4acf, _0x5dcedd) => {
        if (_0x5dcedd.control && _0x5dcedd.shift && (_0x5dcedd.key.toLowerCase() === "i" || _0x5dcedd.key.toLowerCase() === "j") || _0x5dcedd.key.toLowerCase() === "f12") {
          _0x4b4acf.preventDefault();
        }
      });
      mainWindow.webContents.on("context-menu", _0x57fa8c => {
        _0x57fa8c.preventDefault();
      });
      mainWindow.webContents.on("devtools-opened", () => {
        mainWindow.webContents.closeDevTools();
      });
    }
    mainWindow.webContents.setWindowOpenHandler(({
      url: _0x5cae85
    }) => {
      shell.openExternal(_0x5cae85);
      return {
        action: "deny"
      };
    });
    if (updateService) {
      updateService.setMainWindow(mainWindow);
    }
  } catch (_0x31b54b) {
    logToFile("❌ Failed to create window: " + _0x31b54b.message);
    gracefulShutdown();
  }
}
async function initializeFallbackServices() {
  try {
    logToFile("🔄 Initializing fallback database service...");
    const _0x2f936a = require(resolveModulePath("services/database.service"));
    databaseService = new _0x2f936a();
    await databaseService.initialize();
    logToFile("✅ Fallback database service initialized");
    const _0x470fd8 = require(resolveModulePath("services/whatsapp.service"));
    const _0x36b38b = new _0x470fd8(databaseService);
    _0x36b38b.setDatabaseService(databaseService);
    logToFile("✅ Fallback WhatsApp service initialized");
    const _0xa47767 = require(resolveModulePath("models/WhatsAppSession"));
    const _0x4e8150 = require(resolveModulePath("models/MessageTemplate"));
    const _0x559130 = require(resolveModulePath("models/Contact"));
    _0xa47767.db = databaseService;
    _0x4e8150.db = databaseService;
    _0x559130.db = databaseService;
    logToFile("✅ Fallback models initialized with database");
    appService = {
      getDatabaseService: () => databaseService,
      getWhatsAppService: () => _0x36b38b,
      isInitialized: true,
      async createWhatsAppSession(_0x1738ec = "WAGrow Device") {
        try {
          const _0xb72297 = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
          logToFile("🔄 Creating WhatsApp session: " + _0x1738ec + " (" + _0xb72297 + ")");
          logToFile("🔄 WhatsAppSession.db available: " + !!_0xa47767.db);
          const _0x792c47 = await databaseService.run("INSERT INTO whatsapp_sessions\n               (session_id, name, device_name, status, is_active, created_at, updated_at)\n             VALUES (?, ?, ?, 'creating', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0xb72297, _0x1738ec, _0x1738ec]);
          if (!_0x792c47 || !_0x792c47.success) {
            logToFile("❌ Failed to create session record in database: " + _0x792c47?.error);
            return {
              success: false,
              message: "Failed to create session record: " + (_0x792c47?.error || "database error")
            };
          }
          logToFile("✅ Session record created in database: " + _0xb72297);
          const _0x49669a = await _0x36b38b.createSession(_0xb72297);
          if (!_0x49669a || !_0x49669a.success) {
            logToFile("❌ WhatsApp session creation failed: " + (_0x49669a?.message || "unknown error"));
            try {
              await databaseService.run("DELETE FROM whatsapp_sessions WHERE session_id = ?", [_0xb72297]);
            } catch (_0x4ebf13) {
              logToFile("❌ Error cleaning up session record: " + _0x4ebf13.message);
            }
            return {
              success: false,
              message: _0x49669a?.message || "Failed to create WhatsApp session"
            };
          }
          logToFile("✅ WhatsApp session created: " + _0xb72297);
          return {
            success: true,
            sessionId: _0xb72297,
            message: "Session created successfully"
          };
        } catch (_0xa52542) {
          logToFile("❌ Error creating WhatsApp session: " + _0xa52542.message);
          logToFile("❌ Error stack: " + _0xa52542.stack);
          return {
            success: false,
            message: _0xa52542.message
          };
        }
      },
      async disconnectWhatsAppSession(_0x48126a) {
        return await _0x36b38b.disconnectSession(_0x48126a);
      },
      async reconnectWhatsAppSession(_0x34651e) {
        return await _0x36b38b.reconnectSession(_0x34651e);
      },
      async deleteWhatsAppSession(_0x1e591f) {
        return await _0x36b38b.deleteSession(_0x1e591f);
      },
      async getWhatsAppSessions() {
        try {
          logToFile("🔄 Fallback: Getting WhatsApp sessions...");
          const _0x48f67d = await _0xa47767.findAll();
          logToFile("📊 Fallback: Found " + _0x48f67d.length + " sessions in database");
          const _0x1fdf67 = _0x36b38b.getAllSessions();
          logToFile("📊 Fallback: Found " + _0x1fdf67.length + " active WhatsApp sessions");
          const _0x5dc9d4 = _0x48f67d.map(_0x4e66d0 => {
            const _0x3732c4 = _0x1fdf67.find(_0x4e6a34 => _0x4e6a34.sessionId === _0x4e66d0.sessionId);
            let _0x743897 = _0x4e66d0.status;
            let _0x2b68fc = false;
            if (_0x3732c4) {
              if (_0x4e66d0.status === "connected" && _0x3732c4.silentReconnect) {
                _0x743897 = "connected";
                _0x2b68fc = true;
              } else {
                _0x743897 = _0x3732c4.status;
                _0x2b68fc = _0x3732c4.isLoggedIn;
              }
            }
            const _0xa9fed = {
              sessionId: _0x4e66d0.sessionId,
              name: _0x4e66d0.name,
              deviceName: _0x4e66d0.deviceName,
              phoneNumber: _0x4e66d0.phoneNumber,
              status: _0x4e66d0.status,
              qrCode: _0x4e66d0.qrCode,
              pairingCode: _0x4e66d0.pairingCode,
              isActive: _0x4e66d0.isActive,
              createdAt: _0x4e66d0.createdAt,
              updatedAt: _0x4e66d0.updatedAt,
              connectedAt: _0x4e66d0.connectedAt,
              disconnectedAt: _0x4e66d0.disconnectedAt,
              lastSeen: _0x4e66d0.lastSeen,
              realTimeStatus: _0x743897,
              isLoggedIn: _0x2b68fc,
              connectionTimestamp: _0x3732c4 ? _0x3732c4.connectionTimestamp : null
            };
            return _0xa9fed;
          });
          logToFile("✅ Fallback: Returning " + _0x5dc9d4.length + " sessions");
          return _0x5dc9d4;
        } catch (_0x1b43ed) {
          logToFile("❌ Fallback: Error getting WhatsApp sessions: " + _0x1b43ed.message);
          logToFile("❌ Fallback: Error stack: " + _0x1b43ed.stack);
          return [];
        }
      },
      async createPairingCodeSession(_0x47bfaa) {
        return await _0x36b38b.createPairingCodeSession(_0x47bfaa);
      },
      async sendMessage(_0x5d8576, _0x188223, _0x1b9aa0, _0x4add98 = "text", _0x5d5e16 = {}) {
        try {
          logToFile("🔄 Fallback: Sending message to " + _0x188223 + " via session " + _0x5d8576);
          return await _0x36b38b.sendMessage(_0x5d8576, _0x188223, _0x1b9aa0, _0x4add98, _0x5d5e16);
        } catch (_0x1c567e) {
          logToFile("❌ Fallback: Error sending message: " + _0x1c567e.message);
          return {
            success: false,
            error: _0x1c567e.message
          };
        }
      }
    };
    logToFile("✅ Fallback services initialized successfully with WhatsApp support");
  } catch (_0x129ba8) {
    logToFile("❌ Failed to initialize fallback services: " + _0x129ba8.message);
    logToFile("❌ Fallback error stack: " + _0x129ba8.stack);
  }
}
function loadAppService() {
  if (_appServiceLoadPromise) {
    logToFile("⚠️ AppService already loading — waiting for existing load to complete");
    return _appServiceLoadPromise;
  }
  _appServiceLoadPromise = new Promise(_0x3a09d4 => {
    const _0x8074b2 = _0x4ba3fc => {
      _appServiceLoadPromise = null;
      _0x3a09d4(_0x4ba3fc);
    };
    const _0x4b0edb = setTimeout(() => {
      logToFile("❌ AppService loading timed out after 90 seconds");
      _0x8074b2(false);
    }, 90000);
    try {
      const _0x28b2e1 = ["./services/app.service", "../services/app.service", path.join(__dirname, "services/app.service"), path.join(__dirname, "../services/app.service")];
      let _0x35088d = null;
      for (const _0x4fc0cf of _0x28b2e1) {
        try {
          require.resolve(_0x4fc0cf);
          _0x35088d = _0x4fc0cf;
          break;
        } catch (_0x1d6546) {}
      }
      if (_0x35088d) {
        setTimeout(() => {
          (async () => {
            try {
              console.log("🚀🚀🚀 [INIT] Starting AppService initialization...");
              const _0x249ee8 = require.resolve(_0x35088d);
              delete require.cache[_0x249ee8];
              const _0x2b710c = require(_0x35088d);
              console.log("🚀🚀🚀 [INIT] AppService class loaded");
              appService = new _0x2b710c();
              console.log("🚀🚀🚀 [INIT] AppService instance created");
              console.log("🚀🚀🚀 [INIT] Calling appService.initialize()...");
              await appService.initialize();
              console.log("✅✅✅ [INIT] AppService initialized successfully!");
              global.services = {
                whatsapp: appService.getWhatsAppService()
              };
              global.appService = appService;
              const _0x2a4645 = await initializeLiveChatService();
              const _0xec2e29 = await initializeRestAPIServer();
              if (!_0xec2e29.success) {
                logToFile("⚠️ REST API Server initialization failed: " + _0xec2e29.error);
              }
              clearTimeout(_0x4b0edb);
              _0x8074b2(true);
            } catch (_0x280f11) {
              console.error("❌❌❌ [INIT] Failed to create AppService instance:", _0x280f11);
              console.error("❌❌❌ [INIT] Error stack:", _0x280f11.stack);
              logToFile("❌ Failed to create AppService instance: " + _0x280f11.message);
              logToFile("❌ Error stack: " + _0x280f11.stack);
              clearTimeout(_0x4b0edb);
              _0x8074b2(false);
            }
          })();
        }, 100);
      } else {
        logToFile("❌ App service not found in any expected location");
        clearTimeout(_0x4b0edb);
        _0x8074b2(false);
      }
    } catch (_0x18ef69) {
      logToFile("❌ Failed to load app service: " + _0x18ef69.message);
      logToFile("❌ Error stack: " + _0x18ef69.stack);
      clearTimeout(_0x4b0edb);
      _0x8074b2(false);
    }
  });
  return _appServiceLoadPromise;
}
function setupEventForwarding() {
  if (!appService) {
    logToFile("⚠️ Cannot setup event forwarding: appService not available");
    return;
  }
  try {
    const _0x2072c3 = appService.getEventService();
    if (!_0x2072c3) {
      logToFile("⚠️ Cannot setup event forwarding: eventService not available");
      return;
    }
    if (!mainWindow) {
      logToFile("⚠️ Cannot setup event forwarding: mainWindow not available");
      return;
    }
    _0x2072c3.on("qr_code_generated", _0x177a50 => {
      if (isDev) {}
      if (mainWindow) {
        mainWindow.webContents.send("whatsapp:qr-code", _0x177a50);
        if (isDev) {}
      } else if (isDev) {}
    });
    _0x2072c3.on("session_connected", _0x393cb6 => {
      console.log("🔔 [MAIN] session_connected event received from EventService:", _0x393cb6.sessionId);
      if (mainWindow) {
        console.log("📤 [MAIN] Forwarding to renderer via whatsapp:session-connected");
        mainWindow.webContents.send("whatsapp:session-connected", _0x393cb6);
        console.log("✅ [MAIN] Event forwarded successfully");
      } else {
        console.log("❌ [MAIN] mainWindow is null, cannot forward event");
      }
    });
    _0x2072c3.on("session_disconnected", _0x5365a6 => {
      console.log("🔔 [MAIN] session_disconnected event received from EventService:", _0x5365a6.sessionId);
      if (mainWindow) {
        console.log("📤 [MAIN] Forwarding to renderer via whatsapp:session-disconnected");
        mainWindow.webContents.send("whatsapp:session-disconnected", _0x5365a6);
        console.log("✅ [MAIN] Event forwarded successfully");
      } else {
        console.log("❌ [MAIN] mainWindow is null, cannot forward event");
      }
    });
    _0x2072c3.on("device_ban_suspected", _0x3e552d => {
      logToFile("🚨 Suspected ban on session " + _0x3e552d.sessionId + " (" + _0x3e552d.confidence + " confidence)");
      if (mainWindow) {
        mainWindow.webContents.send("device-health:ban-suspected", _0x3e552d);
      }
    });
    _0x2072c3.on("message_received", _0x58c6d6 => {
      if (mainWindow) {
        mainWindow.webContents.send("whatsapp:message-received", _0x58c6d6);
      }
    });
    _0x2072c3.on("message_ack", _0x4e1103 => {
      if (mainWindow) {
        mainWindow.webContents.send("whatsapp:message-ack", _0x4e1103);
      }
    });
    try {
      const _0x45a23b = appService.getWarmerService();
      if (_0x45a23b) {
        _0x45a23b.on("campaign-updated", _0x174993 => {
          if (mainWindow) {
            mainWindow.webContents.send("warmer:campaign-updated", _0x174993);
          }
        });
      }
    } catch (_0x4ec4d5) {
      logToFile("⚠️ Warmer service event forwarding not available: " + _0x4ec4d5.message);
    }
    try {
      const _0xcfebb2 = appService.getLiveChatService();
      if (_0xcfebb2) {
        _0xcfebb2.on("message:new", _0x223ce0 => {
          if (mainWindow) {
            mainWindow.webContents.send("live-chat:message-new", _0x223ce0);
          }
        });
      }
    } catch (_0xd4b78) {
      logToFile("⚠️ Live Chat service event forwarding not available: " + _0xd4b78.message);
    }
    try {
      ipcMain.removeHandler("notification:show-chat");
    } catch (_0xc11408) {}
    ipcMain.handle("notification:show-chat", async (_0x3b109b, _0x596593) => {
      try {
        if (!Notification || !Notification.isSupported()) {
          return {
            success: false,
            shown: false,
            reason: "unsupported"
          };
        }
        const _0x496163 = mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused() && !mainWindow.isMinimized();
        if (_0x496163) {
          return {
            success: true,
            shown: false,
            reason: "window_focused"
          };
        }
        const _0x35bfbf = (_0x596593?.title || "New message").toString().slice(0, 80);
        const _0x42dac7 = (_0x596593?.body || "").toString().slice(0, 240);
        let _0x2694ce;
        const _0x104161 = [path.join(__dirname, "..", "..", "build-resources", "assets", "app-icon.png"), path.join(process.resourcesPath || "", "app-icon.png"), path.join(__dirname, "logo.png"), path.join(__dirname, "..", "..", "public", "logo.png")];
        for (const _0x4d7dbb of _0x104161) {
          if (_0x4d7dbb && fs.existsSync(_0x4d7dbb)) {
            _0x2694ce = _0x4d7dbb;
            break;
          }
        }
        const _0xcb7df1 = new Notification({
          title: _0x35bfbf,
          body: _0x42dac7,
          icon: _0x2694ce,
          silent: false
        });
        _0xcb7df1.on("click", () => {
          try {
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (mainWindow.isMinimized()) {
                mainWindow.restore();
              }
              mainWindow.show();
              mainWindow.focus();
              mainWindow.webContents.send("notification:chat-clicked", {
                phone: _0x596593?.phone || null
              });
            }
          } catch (_0x1fa891) {}
        });
        _0xcb7df1.show();
        return {
          success: true,
          shown: true
        };
      } catch (_0x3bd187) {
        logToFile("⚠️ Chat notification error: " + _0x3bd187.message);
        return {
          success: false,
          shown: false,
          error: _0x3bd187.message
        };
      }
    });
  } catch (_0x5e1a81) {
    logToFile("❌ Error setting up event forwarding: " + _0x5e1a81.message);
  }
}
let servicesReady = false;
ipcMain.handle("app:services-ready-status", () => ({
  ready: servicesReady
}));
app.whenReady().then(async () => {
  try {
    logToFile("🚀 Electron app is ready");
    ipcMain.handle("translation:get-translations-for-language", async (_0x1fdc84, _0x442b3e) => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x49b4a4 = await appService.translationService.getTranslationsForLanguage(_0x442b3e);
        return {
          success: true,
          data: _0x49b4a4
        };
      } catch (_0x2c1885) {
        logToFile("❌ Get translations error: " + _0x2c1885.message);
        return {
          success: false,
          error: _0x2c1885.message
        };
      }
    });
    ipcMain.handle("translation:update-translation", async (_0x1aab8a, _0x3bfc7f, _0x3e3712, _0x1b760e, _0x3e2e8f, _0x3b0028) => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x2d6350 = await appService.translationService.updateTranslation(_0x3bfc7f, _0x3e3712, _0x1b760e, _0x3e2e8f, _0x3b0028);
        return _0x2d6350;
      } catch (_0x36f7f6) {
        logToFile("❌ Update translation error: " + _0x36f7f6.message);
        return {
          success: false,
          error: _0x36f7f6.message
        };
      }
    });
    ipcMain.handle("translation:delete-translation", async (_0x3c7f8a, _0xffc0fa, _0x229f9e) => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x1f2607 = await appService.translationService.deleteTranslation(_0xffc0fa, _0x229f9e);
        return _0x1f2607;
      } catch (_0x50c846) {
        logToFile("❌ Delete translation error: " + _0x50c846.message);
        return {
          success: false,
          error: _0x50c846.message
        };
      }
    });
    ipcMain.handle("translation:get-stats", async _0x538aec => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x26bf75 = await appService.translationService.getTranslationStats();
        return {
          success: true,
          data: _0x26bf75
        };
      } catch (_0x4fe30a) {
        logToFile("❌ Get translation stats error: " + _0x4fe30a.message);
        return {
          success: false,
          error: _0x4fe30a.message
        };
      }
    });
    ipcMain.handle("translation:sync-keys", async _0x29b12c => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        let _0x1eeabc;
        try {
          const _0x462418 = require("path");
          const _0x160005 = require("fs");
          const _0x182547 = [_0x462418.join(__dirname, "locales/en.js"), _0x462418.join(__dirname, "../locales/en.js"), _0x462418.join(__dirname, "../../src/locales/en.js"), _0x462418.join(process.cwd(), "src/locales/en.js"), _0x462418.join(app.getAppPath(), "src/locales/en.js"), _0x462418.join(app.getAppPath(), "build/locales/en.js")];
          let _0x3351d5 = null;
          for (const _0x1b175d of _0x182547) {
            if (_0x160005.existsSync(_0x1b175d)) {
              _0x3351d5 = _0x1b175d;
              logToFile("✅ Found locale file at: " + _0x3351d5);
              break;
            }
          }
          if (!_0x3351d5) {
            logToFile("❌ Could not find en.js in any of these paths: " + _0x182547.join(", "));
            return {
              success: false,
              error: "Could not find English locale file"
            };
          }
          const _0x3b1e6e = _0x160005.readFileSync(_0x3351d5, "utf8");
          const _0x303dac = _0x3b1e6e.replace(/^export\s+default\s+/, "").trim();
          _0x1eeabc = new Function("return " + _0x303dac)();
          logToFile("✅ Locale loaded successfully, keys: " + Object.keys(_0x1eeabc).length);
        } catch (_0x4a6a94) {
          logToFile("❌ Error loading locale file: " + _0x4a6a94.message);
          logToFile("❌ Error stack: " + _0x4a6a94.stack);
          return {
            success: false,
            error: "Could not load English locale file: " + _0x4a6a94.message
          };
        }
        const _0xfc98ba = await appService.translationService.syncTranslationKeys(_0x1eeabc);
        logToFile("✅ Sync result: " + JSON.stringify(_0xfc98ba));
        return _0xfc98ba;
      } catch (_0x412a95) {
        logToFile("❌ Sync translation keys error: " + _0x412a95.message);
        return {
          success: false,
          error: _0x412a95.message
        };
      }
    });
    ipcMain.handle("translation:export-translations", async (_0x36cc30, _0x5059a3) => {
      try {
        logToFile("📤 [IPC MAIN.JS] Export translations called for language: " + _0x5059a3);
        if (!appService || !appService.translationService) {
          logToFile("❌ [IPC MAIN.JS] Translation service not available");
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x522566 = await appService.translationService.exportTranslations(_0x5059a3);
        logToFile("📤 [IPC MAIN.JS] Export returned data with " + Object.keys(_0x522566).length + " top-level keys");
        logToFile("📤 [IPC MAIN.JS] Sample keys: " + Object.keys(_0x522566).slice(0, 5).join(", "));
        logToFile("📤 [IPC MAIN.JS] Data type: " + typeof _0x522566);
        logToFile("📤 [IPC MAIN.JS] Data preview: " + JSON.stringify(_0x522566).substring(0, 300));
        return {
          success: true,
          data: _0x522566
        };
      } catch (_0x22c5cc) {
        logToFile("❌ Export translations error: " + _0x22c5cc.message);
        logToFile("❌ Error stack: " + _0x22c5cc.stack);
        return {
          success: false,
          error: _0x22c5cc.message
        };
      }
    });
    ipcMain.handle("translation:import-translations", async (_0x1def83, _0x5751b9, _0x266b49, _0x13da43) => {
      try {
        logToFile("📥 [IPC MAIN.JS] Import translations called for language: " + _0x5751b9 + ", approveAll: " + _0x13da43);
        if (!appService || !appService.translationService) {
          logToFile("❌ [IPC MAIN.JS] Translation service not available");
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x367b4a = await appService.translationService.importTranslations(_0x5751b9, _0x266b49, _0x13da43);
        logToFile("✅ [IPC MAIN.JS] Import completed: " + JSON.stringify(_0x367b4a));
        return {
          success: true,
          ..._0x367b4a
        };
      } catch (_0x1ddeaa) {
        logToFile("❌ Import translations error: " + _0x1ddeaa.message);
        logToFile("❌ Error stack: " + _0x1ddeaa.stack);
        return {
          success: false,
          error: _0x1ddeaa.message
        };
      }
    });
    ipcMain.handle("translation:search-translations", async (_0x27ae1b, _0x4cffe8, _0x36abe1) => {
      try {
        if (!appService || !appService.translationService) {
          return {
            success: false,
            error: "Translation service not available"
          };
        }
        const _0x4082b8 = await appService.translationService.searchTranslations(_0x4cffe8, _0x36abe1);
        return {
          success: true,
          data: _0x4082b8
        };
      } catch (_0x2073e4) {
        logToFile("❌ Search translations error: " + _0x2073e4.message);
        return {
          success: false,
          error: _0x2073e4.message
        };
      }
    });
    try {
      createWindow();
      initializeUpdateService();
    } catch (_0x20f557) {
      logToFile("❌ Failed to create window: " + _0x20f557.message);
      gracefulShutdown();
      return;
    }
    loadAppService().then(async _0x1748b8 => {
      if (_0x1748b8 && appService) {
        try {
          if (!appService.isInitialized) {
            logToFile("⚠️ App service not initialized, initializing now...");
            await appService.initialize();
          }
          databaseService = appService.getDatabaseService();
          if (!databaseService) {
            logToFile("❌ Database service is null/undefined");
          }
          try {
            const _0x37a0f1 = resolveModulePath("services/telegram.service");
            logToFile("🔄 [Telegram] Loading service from: " + _0x37a0f1);
            const _0x4b10b7 = require(_0x37a0f1);
            telegramService = new _0x4b10b7(databaseService, {
              info: logToFile,
              warn: logToFile,
              error: logToFile
            });
            telegramService.initialize().catch(_0x18d913 => logToFile("⚠️ [Telegram] Session restore error: " + _0x18d913.message));
            logToFile("✅ [Telegram] Service initialized");
          } catch (_0x15f342) {
            logToFile("❌ [Telegram] Service could not be loaded: " + _0x15f342.message);
            logToFile("❌ [Telegram] Stack: " + _0x15f342.stack);
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            try {
              setupEventForwarding();
            } catch (_0xf6a7ba) {
              logToFile("❌ Failed to setup event forwarding: " + _0xf6a7ba.message);
            }
          }
        } catch (_0xaa4e5a) {
          logToFile("❌ App service initialization failed: " + _0xaa4e5a.message);
          logToFile("❌ Service error stack: " + _0xaa4e5a.stack);
        }
      } else {
        logToFile("⚠️ App service failed to load, initializing fallback services...");
        await initializeFallbackServices();
      }
      servicesReady = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("app:services-ready", {
          success: !!_0x1748b8
        });
        logToFile("✅ Services ready — renderer notified");
      }
    }).catch(_0x517720 => {
      logToFile("❌ Background service initialization error: " + _0x517720.message);
      servicesReady = true;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("app:services-ready", {
          success: false
        });
      }
    });
  } catch (_0x285a17) {
    logToFile("❌ Failed to initialize: " + _0x285a17.message);
    logToFile("❌ Error stack: " + _0x285a17.stack);
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    logToFile("🔄 App activated, creating new window...");
    createWindow();
  }
});
ipcMain.on("app:close-confirmation-response", (_0xe3cf13, _0x4042a5) => {
  logToFile("🔄 Close confirmation response received: " + _0x4042a5);
});
function validateSelfContainedLicense(_0x1fddbf) {
  try {
    const _0x506939 = _0x1fddbf.split("-");
    if (_0x506939.length !== 5 || _0x506939[0] !== "LW") {
      return {
        success: false,
        error: "Invalid self-contained license format. Expected 5 parts, got " + _0x506939.length + ". Format should be: LW-DATA-EXPIRY-CHECKSUM-SIGNATURE"
      };
    }
    const [_0x39dc15, _0x17cfaa, _0x11faa8, _0x1edbed, _0x30ef8d] = _0x506939;
    const _0x599861 = _0x17cfaa + "-" + _0x11faa8;
    const _0x3a3808 = crypto.createHash("md5").update(_0x599861).digest("hex").substring(0, 4).toUpperCase();
    if (_0x1edbed !== _0x3a3808) {
      return {
        success: false,
        error: "License checksum validation failed"
      };
    }
    const _0x4a60b3 = Buffer.from(_0x17cfaa, "hex").toString("utf8");
    const _0x264320 = JSON.parse(_0x4a60b3);
    const _0x31e991 = parseInt(_0x11faa8, 16);
    const _0x6796c3 = new Date(_0x31e991 * 1000);
    const _0x4b4421 = new Date();
    if (_0x4b4421 > _0x6796c3) {
      return {
        success: false,
        error: "License has expired",
        expires_at: _0x6796c3.toISOString()
      };
    }
    return {
      success: true,
      customer_name: _0x264320.name,
      plan_type: _0x264320.plan,
      expires_at: _0x6796c3.toISOString(),
      status: "active"
    };
  } catch (_0x526cff) {
    return {
      success: false,
      error: "Failed to validate self-contained license: " + _0x526cff.message
    };
  }
}
function generateMachineId() {
  try {
    const _0x267a8a = getPersistedMachineId();
    if (_0x267a8a) {
      return _0x267a8a;
    }
    const _0x19b1c0 = generateStableMachineId();
    persistMachineId(_0x19b1c0);
    return _0x19b1c0;
  } catch (_0x194d55) {
    logToFile("❌ Error getting machine ID: " + _0x194d55.message);
    return crypto.randomBytes(8).toString("hex").toUpperCase();
  }
}
function generateStableMachineId() {
  try {
    const _0x3cd42f = os.hostname();
    const _0x206cab = os.platform();
    const _0x4f28cd = os.arch();
    const _0x2d7bc7 = os.userInfo().username;
    const _0x1e1d2e = os.cpus();
    const _0x147dc9 = _0x1e1d2e && _0x1e1d2e.length > 0 ? _0x1e1d2e[0].model : "unknown";
    const _0x124d94 = getPrimaryMacAddress();
    const _0x1e43f5 = _0x3cd42f + "-" + _0x206cab + "-" + _0x4f28cd + "-" + _0x2d7bc7 + "-" + _0x147dc9 + "-" + _0x124d94;
    const _0x5f1ad0 = crypto.createHash("sha256").update(_0x1e43f5).digest("hex");
    return _0x5f1ad0.substring(0, 16).toUpperCase();
  } catch (_0x15832f) {
    logToFile("Error generating stable machine ID: " + _0x15832f.message);
    throw _0x15832f;
  }
}
function getPrimaryMacAddress() {
  const _0x2c0585 = os.networkInterfaces();
  const _0x12dbec = /vpn|tap|tun|virtual|pseudo|bluetooth|hamachi|vmware|vbox|hyper-?v|wsl|docker|npcap|cisco|openvpn|wireguard|nordlayer|zerotier|tailscale/i;
  const _0x457fc6 = ["Ethernet", "Wi-Fi", "WiFi", "wlan0", "eth0", "en0"];
  for (const _0xbd32cf of _0x457fc6) {
    if (_0x2c0585[_0xbd32cf]) {
      for (const _0x1750d1 of _0x2c0585[_0xbd32cf]) {
        if (!_0x1750d1.internal && _0x1750d1.mac !== "00:00:00:00:00:00") {
          return _0x1750d1.mac;
        }
      }
    }
  }
  for (const _0x3a7af8 in _0x2c0585) {
    if (_0x12dbec.test(_0x3a7af8)) {
      continue;
    }
    for (const _0x4aac04 of _0x2c0585[_0x3a7af8]) {
      if (!_0x4aac04.internal && _0x4aac04.mac !== "00:00:00:00:00:00") {
        return _0x4aac04.mac;
      }
    }
  }
  for (const _0x1bc73c in _0x2c0585) {
    for (const _0x4f1e71 of _0x2c0585[_0x1bc73c]) {
      if (!_0x4f1e71.internal && _0x4f1e71.mac !== "00:00:00:00:00:00") {
        return _0x4f1e71.mac;
      }
    }
  }
  return "no-mac-found";
}
function getPersistedMachineId() {
  try {
    const _0x391417 = require(resolveModulePath("services/newlic-license-service"));
    const _0x2c45a0 = _0x391417.loadMachineId();
    if (_0x2c45a0) {
      return _0x2c45a0;
    }
    const _0x230a4f = getAppDataPath();
    const _0x51c12c = path.join(_0x230a4f, "machine-id.json");
    if (fs.existsSync(_0x51c12c)) {
      logToFile("🔄 Found old unencrypted machine-id.json, migrating to encrypted format...");
      const _0x55c9e5 = JSON.parse(fs.readFileSync(_0x51c12c, "utf8"));
      if (_0x55c9e5.machineId && /^[A-F0-9]{16}$/.test(_0x55c9e5.machineId)) {
        _0x391417.saveMachineId(_0x55c9e5.machineId);
        fs.unlinkSync(_0x51c12c);
        logToFile("✅ Migrated machine ID to encrypted format");
        return _0x55c9e5.machineId;
      }
    }
  } catch (_0x636548) {
    if (_0x636548.message === "TAMPER_DETECTED") {
      logToFile("🚨 MACHINE ID TAMPERING DETECTED!");
      return null;
    }
    logToFile("Could not read persisted machine ID: " + _0x636548.message);
  }
  return null;
}
function persistMachineId(_0x2ca2da) {
  try {
    const _0x5c3ce6 = require(resolveModulePath("services/newlic-license-service"));
    const _0xadee3f = _0x5c3ce6.saveMachineId(_0x2ca2da);
    if (!_0xadee3f) {
      logToFile("❌ Failed to persist machine ID");
    }
  } catch (_0x1dd4ba) {
    logToFile("Could not persist machine ID: " + _0x1dd4ba.message);
  }
}
async function updateLaravelLicenseWithMachineId(_0x56d7bc, _0x31d9e5, _0xb2298a) {
  try {
    const _0x41352d = await fetch("https://purchase.getleadwave.in/api/license/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        license_code: _0x56d7bc,
        customer_name: _0xb2298a,
        mobile_number: "0000000000",
        machine_id: _0x31d9e5,
        machine_fingerprint: crypto.createHash("sha256").update(_0x31d9e5).digest("hex"),
        os_info: os.platform() + " " + os.release(),
        hardware_info: os.arch() + " " + (os.cpus()[0]?.model || "Unknown CPU")
      })
    });
    if (!_0x41352d.ok) {
      throw new Error("Laravel API responded with status: " + _0x41352d.status);
    }
    const _0x576ea0 = await _0x41352d.json();
    if (!_0x576ea0.success) {
      throw new Error(_0x576ea0.message || "Laravel API returned error");
    }
    return _0x576ea0;
  } catch (_0x121414) {
    logToFile("❌ Laravel API error: " + _0x121414.message);
    throw _0x121414;
  }
}
ipcMain.handle("license:get-machine-id", () => {
  return generateMachineId();
});
ipcMain.handle("reseller:get-config", () => {
  return {
    isResellerBuild: isResellerBuild(),
    isMasterAccountMode: isMasterAccountMode(),
    resellerCode: getResellerCode(),
    masterAccountId: getMasterAccountId(),
    resellerInfo: getResellerInfo()
  };
});
ipcMain.handle("license:activate", async (_0x35171c, _0x4ae721) => {
  if (isDev) {}
  try {
    if (isDev) {}
    _0x4ae721 = _0x4ae721.trim();
    logToFile("🔑 License key (trimmed): " + _0x4ae721);
    const _0x2227c7 = generateMachineId();
    logToFile("🔑 Attempting license activation for: " + _0x4ae721 + " with machine ID: " + _0x2227c7);
    if (isDev) {}
    logToFile("🔍 Starting simplified license validation...");
    if (isDev) {}
    if (_0x4ae721.startsWith("LW2.") && _0x4ae721.split(".").length === 3) {
      try {
        const _0x92e323 = require("crypto");
        const {
          LICENSE_PUBLIC_KEY: _0x380311
        } = require(resolveModulePath("security/license-public-key"));
        const [, _0x1adfe1, _0x14c48b] = _0x4ae721.split(".");
        const _0x110569 = _0x14c48b.replace(/-/g, "+").replace(/_/g, "/");
        const _0xce044b = _0x92e323.createVerify("RSA-SHA256");
        _0xce044b.update(_0x1adfe1);
        if (!_0xce044b.verify(_0x380311, _0x110569, "base64")) {
          logToFile("❌ V2 license signature verification failed");
          return {
            success: false,
            message: "Invalid license key (signature check failed)",
            error_code: "INVALID_SIGNATURE"
          };
        }
        const _0x37eacc = _0x1adfe1.length % 4 === 0 ? "" : "=".repeat(4 - _0x1adfe1.length % 4);
        const _0x13637d = Buffer.from(_0x1adfe1.replace(/-/g, "+").replace(/_/g, "/") + _0x37eacc, "base64").toString("utf8");
        const _0x14eb23 = JSON.parse(_0x13637d);
        const _0x5929ae = (_0x14eb23.exp || 0) * 1000;
        if (Date.now() > _0x5929ae) {
          return {
            success: false,
            message: "This license has expired. Please contact your administrator.",
            error_code: "EXPIRED"
          };
        }
        const _0x4498f4 = require(resolveModulePath("services/newlic-license-service"));
        const _0x3e32d7 = await _0x4498f4.activateLicense(_0x4ae721, _0x2227c7);
        return _0x3e32d7;
      } catch (_0x2400f6) {
        logToFile("❌ V2 activation error: " + _0x2400f6.message);
        return {
          success: false,
          message: "License activation failed",
          error_code: "V2_ACTIVATION_ERROR"
        };
      }
    }
    const _0x2345ee = _0x4ae721.split("-");
    if (_0x2345ee.length === 5 && _0x2345ee[0] === "LW") {
      logToFile("🔍 Detected self-contained license format (Keygen generated)");
      try {
        const [_0x42b27b, _0x1b47ab, _0x560489, _0x5c70c7, _0x10d4f9] = _0x2345ee;
        const _0x36d987 = require("crypto");
        logToFile("🔍 Parts: prefix=" + _0x42b27b + ", encodedData=" + _0x1b47ab + ", expiryHex=" + _0x560489 + ", checksum=" + _0x5c70c7 + ", signature=" + _0x10d4f9);
        const _0x404070 = _0x1b47ab + "-" + _0x560489;
        const _0x4d2b28 = _0x36d987.createHash("md5").update(_0x404070).digest("hex").substring(0, 4).toUpperCase();
        logToFile("🔍 Checksum validation: expected=" + _0x4d2b28 + ", provided=" + _0x5c70c7);
        if (_0x5c70c7 !== _0x4d2b28) {
          logToFile("❌ Checksum validation failed");
          return {
            success: false,
            message: "Invalid license key. Checksum verification failed.",
            error_code: "INVALID_CHECKSUM"
          };
        }
        const _0x5e3230 = Buffer.from(_0x1b47ab, "hex").toString("utf8");
        const _0x43e586 = JSON.parse(_0x5e3230);
        logToFile("🔍 Decoded license data: " + JSON.stringify(_0x43e586));
        const _0xc6edd4 = parseInt(_0x560489, 16);
        const _0x28a998 = new Date(_0xc6edd4 * 1000);
        const _0x41b5cc = new Date();
        logToFile("🔍 Expiry check: now=" + _0x41b5cc.toISOString() + ", expires=" + _0x28a998.toISOString());
        if (_0x41b5cc > _0x28a998) {
          logToFile("❌ License has expired");
          return {
            success: false,
            message: "This license has expired. Please contact your administrator.",
            error_code: "EXPIRED"
          };
        }
        logToFile("✅ Local checksum/expiry passed - confirming with license server...");
        try {
          const _0xe8d69a = new AbortController();
          const _0x20433d = setTimeout(() => _0xe8d69a.abort(), 8000);
          let _0x4eac;
          try {
            _0x4eac = await fetch("https://license.getleadwave.in/api/licenses/heartbeat", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                license_key: _0x4ae721,
                machine_id: _0x2227c7,
                app_version: app.getVersion()
              }),
              signal: _0xe8d69a.signal
            });
          } finally {
            clearTimeout(_0x20433d);
          }
          const _0x3bee2c = await _0x4eac.json();
          logToFile("🌐 Server confirmation response: status=" + _0x4eac.status + ", valid=" + _0x3bee2c.valid);
          if (!_0x3bee2c.valid) {
            const _0x14d72f = _0x3bee2c.message || "License not found on server";
            logToFile("❌ Server rejected license during activation: " + _0x14d72f);
            return {
              success: false,
              message: "License activation denied: " + _0x14d72f + ". Please contact your administrator.",
              error_code: "SERVER_REJECTED"
            };
          }
          logToFile("✅ Server confirmed license is valid");
        } catch (_0x2f97e0) {
          logToFile("❌ License server unreachable during v1 activation (" + _0x2f97e0.message + ") — rejecting");
          return {
            success: false,
            message: "Could not reach license server to activate this legacy key. Please connect to the internet and try again.",
            error_code: "SERVER_UNREACHABLE"
          };
        }
        const _0x2d65be = _0x43e586.machine_id;
        if (_0x2d65be) {
          logToFile("🔍 License machine ID: " + _0x2d65be);
          logToFile("🔍 Current machine ID: " + _0x2227c7);
          if (_0x2d65be !== _0x2227c7) {
            logToFile("❌ Machine ID mismatch - license not valid for this machine");
            return {
              success: false,
              message: "This license key is not valid for this computer. Please contact your administrator for a license specific to this machine.",
              error_code: "MACHINE_ID_MISMATCH"
            };
          }
          logToFile("✅ Machine ID validation passed");
        } else {
          logToFile("ℹ️ License has no machine ID restriction (legacy license)");
        }
        const _0x108ee3 = path.join(app.getPath("userData"), "activations.json");
        let _0x113f21 = [];
        try {
          const _0x2622da = await fs.promises.readFile(_0x108ee3, "utf8");
          _0x113f21 = JSON.parse(_0x2622da);
        } catch (_0x7b9867) {
          if (_0x7b9867.code !== "ENOENT") {
            logToFile("⚠️ Failed to read activations file: " + _0x7b9867.message);
          }
        }
        const _0x2d9d9a = _0x113f21.find(_0x495a66 => _0x495a66.license_key === _0x4ae721 && _0x495a66.machine_id === _0x2227c7);
        if (_0x2d9d9a) {
          logToFile("❌ License " + _0x4ae721 + " already activated on machine " + _0x2227c7);
          return {
            success: false,
            message: "This license key has already been activated on this machine. Each license can only be activated once per machine.",
            error_code: "LICENSE_ALREADY_ACTIVATED"
          };
        }
        logToFile("💾 Storing license information locally...");
        let _0x492e95 = null;
        if (_0x43e586.company_info) {
          _0x492e95 = _0x43e586.company_info;
        } else if (_0x43e586.company) {
          _0x492e95 = {
            name: _0x43e586.company.name || "",
            email: _0x43e586.company.email || "",
            mobile: _0x43e586.company.phone || _0x43e586.company.mobile || "",
            website: _0x43e586.company.website || ""
          };
        }
        const _0x48afaa = {
          license_key: _0x4ae721,
          machine_id: _0x2227c7,
          customer_name: _0x43e586.name || "Licensed User",
          plan_name: _0x43e586.plan || "standard",
          modules: _0x43e586.modules || [],
          max_devices: _0x43e586.max_devices || 5,
          company_info: _0x492e95,
          expires_at: _0x28a998.toISOString(),
          activated_at: new Date().toISOString(),
          status: "active",
          app_version: app.getVersion()
        };
        logToFile("💾 License modules: " + JSON.stringify(_0x43e586.modules || []));
        logToFile("💾 Company info: " + JSON.stringify(_0x492e95));
        addLicenseSignature(_0x48afaa);
        const _0x145cb4 = app.getPath("userData");
        if (!fs.existsSync(_0x145cb4)) {
          fs.mkdirSync(_0x145cb4, {
            recursive: true
          });
        }
        const _0x114bd0 = path.join(_0x145cb4, "license.json");
        fs.writeFileSync(_0x114bd0, JSON.stringify(_0x48afaa, null, 2));
        logToFile("💾 License saved to: " + _0x114bd0);
        _0x113f21.push({
          license_key: _0x4ae721,
          machine_id: _0x2227c7,
          activated_at: new Date().toISOString(),
          app_version: app.getVersion()
        });
        fs.writeFileSync(_0x108ee3, JSON.stringify(_0x113f21, null, 2));
        logToFile("💾 Recorded license activation: " + _0x4ae721 + " on machine " + _0x2227c7);
        logToFile("✅ License activation completed successfully");
        logToFile("✅ License activation completed successfully");
        return {
          success: true,
          message: "License activated successfully!",
          data: {
            license_key: _0x4ae721,
            customer_name: _0x48afaa.customer_name,
            plan_name: _0x48afaa.plan_name,
            expires_at: _0x48afaa.expires_at,
            modules: _0x48afaa.modules,
            max_devices: _0x48afaa.max_devices || 5,
            company_info: _0x48afaa.company_info
          }
        };
      } catch (_0x26ead9) {
        logToFile("❌ Self-contained validation error: " + _0x26ead9.message);
        logToFile("❌ Error stack: " + _0x26ead9.stack);
        console.error("❌ License activation validation error:", _0x26ead9);
        return {
          success: false,
          message: "Invalid license key format. Please check your license key.",
          error_code: "VALIDATION_ERROR"
        };
      }
    } else {
      logToFile("❌ License key format not recognized");
      return {
        success: false,
        message: "Invalid license key format. Please ensure you have a valid license key.",
        error_code: "INVALID_FORMAT"
      };
    }
    const _0x1b4f45 = app.getPath("userData");
    await fs.promises.mkdir(_0x1b4f45, {
      recursive: true
    });
    const _0x13ab6b = path.join(_0x1b4f45, "license.json");
    await fs.promises.writeFile(_0x13ab6b, JSON.stringify(licenseInfo, null, 2));
    logToFile("💾 License saved to: " + _0x13ab6b);
    if (licenseWindow) {
      licenseWindow.close();
    }
    createWindow();
    createMenu();
    logToFile("✅ License activation completed successfully");
    return {
      success: true,
      message: "License activated successfully!",
      data: {
        customer_name: licenseInfo.customer_name,
        plan_name: licenseInfo.plan_name,
        expires_at: licenseInfo.expires_at
      }
    };
  } catch (_0x512f1a) {
    logToFile("❌ Error activating license: " + _0x512f1a.message);
    logToFile("❌ Error stack: " + _0x512f1a.stack);
    return {
      success: false,
      message: "Failed to activate license. Please check your license key and try again.",
      error: _0x512f1a.message
    };
  }
});
ipcMain.handle("license:renew", async (_0x255c96, _0x1d47b0) => {
  try {
    logToFile("🔄 Starting license renewal with renewed key: " + _0x1d47b0);
    const _0x17b9c3 = generateMachineId();
    logToFile("🔄 Generated machine ID: " + _0x17b9c3);
    const _0x2ff926 = _0x1d47b0.startsWith("LW2.") && _0x1d47b0.split(".").length === 3;
    const _0x1b427b = _0x1d47b0.startsWith("LW-") && _0x1d47b0.split("-").length >= 5;
    const _0xf82ea0 = _0x2ff926 || _0x1b427b;
    if (_0xf82ea0) {
      logToFile("🔑 NewLic license detected, using NewLic renewal flow...");
      const _0x44bba6 = require(resolveModulePath("services/newlic-license-service"));
      const _0x544622 = await _0x44bba6.activateLicense(_0x1d47b0, _0x17b9c3);
      if (!_0x544622.success) {
        logToFile("❌ NewLic license renewal failed: " + _0x544622.message);
        return {
          success: false,
          message: _0x544622.message || "Failed to renew license",
          error_code: "NEWLIC_RENEWAL_FAILED"
        };
      }
      logToFile("✅ NewLic license renewed successfully");
      logToFile("✅ Renewed license data: " + JSON.stringify(_0x544622.data));
      return {
        success: true,
        data: _0x544622.data,
        message: "NewLic license renewed successfully"
      };
    }
    const _0xd1313 = getAppDataPath();
    const _0x2a62f1 = path.join(_0xd1313, "license.json");
    const _0x891c0a = path.join(_0xd1313, "cloud-license.json");
    const _0x2e1d75 = fs.existsSync(_0x2a62f1);
    const _0x36cd90 = fs.existsSync(_0x891c0a);
    if (!_0x2e1d75 && !_0x36cd90) {
      logToFile("❌ No existing license found for renewal");
      return {
        success: false,
        message: "No existing license found. Please activate a license first.",
        error_code: "NO_EXISTING_LICENSE"
      };
    }
    if (_0x36cd90) {
      logToFile("🌐 Cloud license detected, using cloud renewal flow...");
      const _0x39481e = require("../services/cloud-license-service");
      const _0x22db16 = await _0x39481e.activateCloudLicense(_0x1d47b0, _0x17b9c3);
      if (!_0x22db16.success) {
        logToFile("❌ Cloud license renewal failed: " + _0x22db16.message);
        return {
          success: false,
          message: _0x22db16.message || "Failed to renew cloud license",
          error_code: "CLOUD_RENEWAL_FAILED"
        };
      }
      const _0x13b955 = _0x22db16.data;
      const _0x371b4c = new Date();
      const _0x463bdd = new Date(_0x13b955.expires_at);
      const _0x3e73db = Math.ceil((_0x463bdd - _0x371b4c) / 86400000);
      logToFile("✅ Cloud license renewed successfully");
      logToFile("✅ Renewed license data: " + JSON.stringify(_0x13b955));
      return {
        success: true,
        data: {
          license_key: _0x1d47b0,
          customer_name: _0x13b955.customer_name,
          plan_name: _0x13b955.plan_name || _0x13b955.plan,
          expires_at: _0x13b955.expires_at,
          expires_at_formatted: new Date(_0x13b955.expires_at).toLocaleDateString(),
          status: _0x13b955.status || "active",
          modules: _0x13b955.modules || [],
          features: _0x13b955.features || [],
          days_remaining: _0x3e73db,
          validity_days: _0x3e73db,
          duration_days: _0x3e73db,
          is_trial: false,
          isTrial: false,
          isValid: true,
          isUpgraded: false,
          machine_id: _0x17b9c3,
          activated_at: _0x13b955.activated_at,
          renewed_at: new Date().toISOString(),
          renewal_count: 1
        },
        message: "Cloud license renewed successfully"
      };
    }
    if (!_0x2e1d75) {
      logToFile("❌ No existing local license found for renewal");
      return {
        success: false,
        message: "No existing license found. Please activate a license first.",
        error_code: "NO_EXISTING_LICENSE"
      };
    }
    const _0x2690a3 = JSON.parse(fs.readFileSync(_0x2a62f1, "utf8"));
    const _0x29d38b = _0x2690a3.license_key;
    logToFile("🔄 Current license key: " + _0x29d38b);
    logToFile("🔄 Renewed license key: " + _0x1d47b0);
    const _0x50f36a = require(resolveModulePath("services/local-license-service"));
    const _0x3f8710 = new _0x50f36a();
    logToFile("📤 Validating renewed license: " + _0x1d47b0);
    const _0x2cb917 = await _0x3f8710.validateSelfContainedLicense(_0x1d47b0);
    if (!_0x2cb917.success) {
      logToFile("❌ License validation failed: " + _0x2cb917.error);
      return {
        success: false,
        message: _0x2cb917.error || "Invalid license key",
        error_code: "INVALID_LICENSE"
      };
    }
    const _0x384dc3 = (_0x2690a3.customer_name || "").trim().toLowerCase();
    const _0x470347 = (_0x2cb917.customer_name || "").trim().toLowerCase();
    if (_0x384dc3 && _0x470347 && _0x384dc3 !== _0x470347) {
      logToFile("❌ License renewal failed: Customer name mismatch");
      logToFile("   Current: \"" + _0x2690a3.customer_name + "\" (normalized: \"" + _0x384dc3 + "\")");
      logToFile("   Renewed: \"" + _0x2cb917.customer_name + "\" (normalized: \"" + _0x470347 + "\")");
      return {
        success: false,
        message: "The renewed license is not for the same customer. Current: \"" + _0x2690a3.customer_name + "\", Renewed: \"" + _0x2cb917.customer_name + "\". Please contact support.",
        error_code: "CUSTOMER_MISMATCH"
      };
    }
    if (_0x2cb917.machine_id && _0x2cb917.machine_id !== _0x17b9c3) {
      logToFile("❌ License renewal failed: Machine ID mismatch");
      logToFile("   Current machine: " + _0x17b9c3);
      logToFile("   License machine: " + _0x2cb917.machine_id);
      return {
        success: false,
        message: "The renewed license is for a different machine. Please generate a renewal license for this machine.",
        error_code: "MACHINE_ID_MISMATCH"
      };
    }
    const _0x25976e = new Date();
    const _0xdd6437 = new Date(_0x2cb917.expires_at);
    const _0x2afb08 = Math.ceil((_0xdd6437 - _0x25976e) / 86400000);
    _0x3f8710.updateSelfContainedLicenseActivation(_0x1d47b0, _0x17b9c3, app.getVersion());
    const _0x4acdd3 = {
      license_key: _0x1d47b0,
      customer_name: _0x2cb917.customer_name,
      expires_at: _0x2cb917.expires_at,
      machine_id: _0x17b9c3,
      activated_at: _0x2690a3.activated_at,
      renewed_at: new Date().toISOString(),
      status: _0x2cb917.status,
      plan_name: _0x2cb917.plan_type,
      modules: _0x2cb917.modules || [],
      duration_days: _0x2afb08,
      features: _0x2690a3.features || [],
      isTrial: false,
      isUpgraded: _0x2690a3.isUpgraded || false,
      days_remaining: _0x2afb08,
      previous_license: _0x29d38b,
      renewal_count: (_0x2690a3.renewal_count || 0) + 1
    };
    fs.writeFileSync(_0x2a62f1, JSON.stringify(_0x4acdd3, null, 2));
    logToFile("✅ License renewed and saved successfully");
    logToFile("✅ New license data: " + JSON.stringify(_0x4acdd3));
    return {
      success: true,
      data: {
        license_key: _0x1d47b0,
        customer_name: _0x2cb917.customer_name,
        plan_name: _0x2cb917.plan_type,
        expires_at: _0x2cb917.expires_at,
        expires_at_formatted: new Date(_0x2cb917.expires_at).toLocaleDateString(),
        status: _0x2cb917.status,
        modules: _0x2cb917.modules || [],
        days_remaining: _0x2afb08,
        validity_days: _0x2afb08,
        is_trial: false,
        isTrial: false,
        isValid: true
      },
      message: "License renewed successfully"
    };
  } catch (_0x51fac4) {
    logToFile("❌ License renewal error: " + _0x51fac4.message);
    logToFile("❌ Error stack: " + _0x51fac4.stack);
    return {
      success: false,
      message: "License renewal failed: " + _0x51fac4.message,
      error_code: "RENEWAL_ERROR",
      error_details: _0x51fac4.stack
    };
  }
});
ipcMain.handle("license:upgrade", async (_0xbb1d2b, _0x5ba171) => {
  try {
    logToFile("🔄 Starting license upgrade with new key: " + _0x5ba171);
    const _0x4d015c = generateMachineId();
    logToFile("🔄 Generated machine ID: " + _0x4d015c);
    const _0x584edf = _0x5ba171.startsWith("LW2.") && _0x5ba171.split(".").length === 3;
    const _0x25d644 = _0x5ba171.startsWith("LW-") && _0x5ba171.split("-").length >= 5;
    if (_0x584edf || _0x25d644) {
      logToFile("🔑 NewLic license detected, using NewLic activation flow for upgrade...");
      const _0x1b7668 = require(resolveModulePath("services/newlic-license-service"));
      const _0x50926f = await _0x1b7668.activateLicense(_0x5ba171, _0x4d015c);
      if (!_0x50926f.success) {
        logToFile("❌ NewLic license upgrade failed: " + _0x50926f.message);
        return {
          success: false,
          message: _0x50926f.message || "Failed to upgrade license",
          error_code: "NEWLIC_UPGRADE_FAILED"
        };
      }
      logToFile("✅ NewLic license upgraded successfully");
      return {
        success: true,
        data: _0x50926f.data,
        message: "License upgraded successfully"
      };
    }
    const _0x5d0c43 = getAppDataPath();
    const _0x54ef5f = path.join(_0x5d0c43, "license.json");
    if (!fs.existsSync(_0x54ef5f)) {
      logToFile("❌ No existing license found for upgrade");
      return {
        success: false,
        message: "No existing license found. Please activate a license first.",
        error_code: "NO_EXISTING_LICENSE"
      };
    }
    const _0x389717 = JSON.parse(fs.readFileSync(_0x54ef5f, "utf8"));
    const _0x35a0e3 = _0x389717.license_key;
    logToFile("🔄 Current license key: " + _0x35a0e3);
    const _0x52c837 = require(resolveModulePath("services/local-license-service"));
    const _0x512722 = new _0x52c837();
    logToFile("📤 Activating new license locally: " + _0x5ba171);
    const _0x482ba3 = await _0x512722.activateLicense(_0x5ba171, _0x4d015c, app.getVersion());
    logToFile("📥 Upgrade activation result: " + JSON.stringify(_0x482ba3));
    if (_0x482ba3.success && _0x482ba3.data) {
      const _0x3bda0 = {
        license_key: _0x5ba171,
        customer_name: _0x482ba3.data.customer_name,
        expires_at: _0x482ba3.data.expires_at,
        machine_id: _0x4d015c,
        activated_at: new Date().toISOString(),
        status: _0x482ba3.data.status,
        plan_name: _0x482ba3.data.plan_name,
        modules: _0x482ba3.data.modules || [],
        duration_days: _0x482ba3.data.validity_days,
        features: [],
        isTrial: _0x482ba3.data.is_trial || false,
        isUpgraded: true,
        days_remaining: _0x482ba3.data.days_remaining,
        previous_license: _0x35a0e3
      };
      fs.writeFileSync(_0x54ef5f, JSON.stringify(_0x3bda0, null, 2));
      logToFile("✅ License upgraded and saved successfully");
      logToFile("✅ New license data: " + JSON.stringify(_0x3bda0));
      return {
        success: true,
        data: _0x482ba3.data,
        message: "License upgraded successfully"
      };
    } else {
      logToFile("❌ License upgrade failed: " + _0x482ba3.message);
      return {
        success: false,
        message: _0x482ba3.message || "License upgrade failed",
        error_code: _0x482ba3.error_code
      };
    }
  } catch (_0x356c6e) {
    logToFile("❌ License upgrade error: " + _0x356c6e.message);
    return {
      success: false,
      message: "Unable to upgrade license. Please check your internet connection and try again, or contact your administrator for assistance.",
      error: _0x356c6e.message
    };
  }
});
ipcMain.handle("license:register-trial", async (_0x28c5c8, _0x4ba8d6) => {
  try {
    const _0x29eea5 = generateMachineId();
    logToFile("🔑 Attempting trial registration for: " + _0x4ba8d6.email + " with machine ID: " + _0x29eea5);
    const _0x15a5ab = require(resolveModulePath("services/local-license-service"));
    const _0x2aef5e = new _0x15a5ab();
    const _0x220cc7 = await _0x2aef5e.registerTrial(_0x4ba8d6);
    logToFile("📥 Trial registration result: " + JSON.stringify(_0x220cc7));
    if (_0x220cc7.success) {
      const _0x4e9d16 = {
        license_key: _0x220cc7.data.license_key,
        customer_name: _0x220cc7.data.customer_name,
        expires_at: _0x220cc7.data.expires_at,
        machine_id: _0x29eea5,
        registered_at: new Date().toISOString(),
        plan_name: "trial",
        isTrial: true,
        status: "active",
        validity_days: _0x220cc7.data.validity_days
      };
      const _0x12ef81 = getAppDataPath();
      if (!fs.existsSync(_0x12ef81)) {
        fs.mkdirSync(_0x12ef81, {
          recursive: true
        });
      }
      const _0x2cef64 = path.join(_0x12ef81, "license.json");
      fs.writeFileSync(_0x2cef64, JSON.stringify(_0x4e9d16, null, 2));
      logToFile("✅ Trial license registered successfully: " + _0x220cc7.data.license_key);
    } else {
      logToFile("❌ Trial registration failed: " + _0x220cc7.message);
    }
    return _0x220cc7;
  } catch (_0x51c118) {
    logToFile("❌ Error registering trial license: " + _0x51c118.message);
    logToFile("❌ Error stack: " + _0x51c118.stack);
    return {
      success: false,
      message: "Unable to register trial license. Please check your internet connection and try again, or contact your administrator for assistance.",
      error: _0x51c118.message
    };
  }
});

// ── WAGrow GAS Trial Handler ─────────────────────────────────────────────────
ipcMain.handle("license:request-gas-trial", async (_evt, _params) => {
  try {
    const name     = (_params.name     || "").trim();
    const mobile   = (_params.mobile   || "").trim();
    let   gasUrl   = (_params.gas_url  || "").trim();
    const machineId = generateMachineId();

    if (!name || name.length < 2) {
      return { success: false, message: "Apna naam likhein (kam se kam 2 characters)." };
    }
    const cleanMobile = mobile.replace(/[^0-9]/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
      return { success: false, message: "Valid WhatsApp number likhein (10+ digits)." };
    }

    if (!gasUrl) {
      try {
        const cfgPath = path.join(__dirname, "config/reseller-config.json");
        if (fs.existsSync(cfgPath)) {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
          gasUrl = cfg.gas_url || cfg.GAS_URL || cfg.LICENSE_SERVER?.gas_url || "";
        }
      } catch(e) {}
    }
    if (!gasUrl) {
      gasUrl = process.env.GAS_API_URL || process.env.NEWLIC_API_URL || "";
    }
    if (!gasUrl) {
      return { success: false, message: "Google Apps Script URL configure nahi hai. Admin se sampark karein." };
    }

    logToFile("🆓 WAGrow trial request: name=" + name + " mobile=" + cleanMobile + " machineId=" + machineId);

    const fetch = require("node-fetch");
    const payload = {
      action: "requestTrial",
      name: name,
      mobile: cleanMobile,
      machine_id: machineId
    };

    let result;
    try {
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
        timeout: 25000
      });
      result = await response.json();
    } catch (netErr) {
      logToFile("❌ Network request failed to GAS: " + netErr.message);
      return {
        success: false,
        message: "Server se connect nahi ho saka. Internet connection check karein (" + netErr.message + ")."
      };
    }

    logToFile("🆓 GAS trial response: " + JSON.stringify(result));

    if (!result.success) {
      if (result.error === "IS_DEVICE_USED") {
        return {
          success: false,
          message: "Is computer par pehle hi 2 din ka trial liya ja chuka hai. Ek device par sirf ek baar trial milta hai. Kripya license purchase karein.",
          error_code: "DEVICE_USED"
        };
      }
      if (result.error === "IS_MOBILE_USED") {
        return {
          success: false,
          message: "Is WhatsApp number se pehle hi trial liya ja chuka hai. Ek number par sirf ek baar trial milta hai.",
          error_code: "MOBILE_USED"
        };
      }
      return { success: false, message: result.error || "Trial activate karne mein samasya aayi." };
    }

    const trialDays = result.trial_days || 2;
    const licenseData = {
      license_key:    result.license_key,
      customer_name:  result.customer_name || name,
      mobile:         result.mobile || cleanMobile,
      plan_name:      "Trial (" + trialDays + " Days)",
      plan_type:      "trial",
      plan:           "trial_" + trialDays + "_days",
      expires_at:     result.expires_at,
      machine_id:     machineId,
      registered_at:  new Date().toISOString(),
      activated_at:   new Date().toISOString(),
      isTrial:        true,
      trial_days:     trialDays,
      status:         "active",
      gas_url:        gasUrl,
      modules:        ["bulk", "warmer", "ai-chatbot", "rest-api", "telegram"],
      max_devices:    1,
      source:         "gas_trial"
    };

    // 1. Add cryptographic signature for integrity check
    addLicenseSignature(licenseData);

    const appDataDir = getAppDataPath();
    if (!fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }

    // 2. Save signed license.json
    const licensePath = path.join(appDataDir, "license.json");
    fs.writeFileSync(licensePath, JSON.stringify(licenseData, null, 2), "utf8");

    // 3. Encrypt and save license.enc for NewLic service
    try {
      if (typeof newlicLicenseService !== "undefined" && newlicLicenseService && newlicLicenseService._encrypt) {
        const enc = newlicLicenseService._encrypt(licenseData);
        fs.writeFileSync(path.join(appDataDir, "license.enc"), enc, "utf8");
        newlicLicenseService.set("license", {
          key: result.license_key,
          machineId: machineId,
          activatedAt: new Date().toISOString(),
          data: {
            name: licenseData.customer_name,
            mobile: licenseData.mobile,
            plan: licenseData.plan,
            modules: licenseData.modules,
            max_devices: 1
          },
          expiresAt: result.expires_at
        });
      }
    } catch (encErr) {
      logToFile("⚠️ Error writing license.enc: " + encErr.message);
    }

    logToFile("✅ WAGrow trial license saved: " + result.license_key + " expires: " + result.expires_at);

    // Auto-reload window to launch app directly
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        logToFile("🔄 Reloading window after trial activation...");
        mainWindow.reload();
      }
    }, 1500);

    return {
      success: true,
      message: "Trial successfully activated! Software " + trialDays + " din ke liye chalu ho gaya hai.",
      license_key: result.license_key,
      customer_name: result.customer_name,
      expires_at: result.expires_at,
      expires_at_formatted: result.expires_at_formatted,
      trial_days: trialDays
    };
  } catch (err) {
    logToFile("❌ GAS trial error: " + err.message);
    return {
      success: false,
      message: "Internet connection check karein aur dobara try karein.\n\nError: " + err.message
    };
  }
});

ipcMain.handle("license:activate-gas-key", async (_event, params) => {
  try {
    const rawKey = ((params && params.license_key) || "").trim();
    if (!rawKey) {
      return { success: false, message: "Kripya License Key enter karein." };
    }

    const gasUrl = (params && params.gas_url) || "https://script.google.com/macros/s/AKfycbz1XvaCZjCbonh1bqeNycOGFwFD7rApZUMuZb3XMOsIfJtoHlVFUqJILdfOVcRlEpk/exec";
    const machineId = generateMachineId();
    logToFile("🔑 [GAS Paid Key Activation] Key: " + rawKey + " Machine: " + machineId);

    // 1. Check Google Apps Script Database
    let gasResult = null;
    try {
      const fetchWithRedirect = async (url, options, maxRedirects = 5) => {
        let currentUrl = url;
        for (let i = 0; i < maxRedirects; i++) {
          const resp = await fetch(currentUrl, options);
          if ([301, 302, 303, 307, 308].includes(resp.status)) {
            const location = resp.headers.get("location");
            if (location) {
              currentUrl = location;
              options = { method: "GET" };
              continue;
            }
          }
          return resp;
        }
        throw new Error("Too many redirects");
      };

      const response = await fetchWithRedirect(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "activateLicense",
          key: rawKey,
          machine_id: machineId
        })
      });

      const text = await response.text();
      try {
        gasResult = JSON.parse(text);
      } catch (pe) {
        logToFile("⚠️ Non-JSON response from GAS: " + text.substring(0, 100));
      }
    } catch (netErr) {
      logToFile("⚠️ GAS network call failed: " + netErr.message);
    }

    if (gasResult && gasResult.success && gasResult.valid && gasResult.data) {
      const data = gasResult.data;
      const licenseData = {
        license_key:   data.license_key || rawKey,
        customer_name: data.customer_name || "Valued Client",
        plan_name:     data.plan_name || "Pro",
        plan_type:     (data.plan_type || "pro").toLowerCase(),
        plan:          (data.plan_name || "pro").toLowerCase(),
        expires_at:    data.expires_at,
        machine_id:    machineId,
        registered_at: new Date().toISOString(),
        activated_at:  new Date().toISOString(),
        isTrial:       false,
        status:        "active",
        gas_url:       gasUrl,
        modules:       ["bulk", "warmer", "ai-chatbot", "rest-api", "telegram", "campaign-scheduler", "live-chat"],
        max_devices:   data.max_devices || 1,
        source:        "gas_paid"
      };

      addLicenseSignature(licenseData);
      const appDataDir = getAppDataPath();
      if (!fs.existsSync(appDataDir)) {
        fs.mkdirSync(appDataDir, { recursive: true });
      }
      fs.writeFileSync(path.join(appDataDir, "license.json"), JSON.stringify(licenseData, null, 2), "utf8");

      try {
        if (typeof newlicLicenseService !== "undefined" && newlicLicenseService && newlicLicenseService._encrypt) {
          const enc = newlicLicenseService._encrypt(licenseData);
          fs.writeFileSync(path.join(appDataDir, "license.enc"), enc, "utf8");
          newlicLicenseService.set("license", {
            key: licenseData.license_key,
            machineId: machineId,
            activatedAt: new Date().toISOString(),
            data: {
              name: licenseData.customer_name,
              plan: licenseData.plan,
              modules: licenseData.modules,
              max_devices: licenseData.max_devices
            },
            expiresAt: licenseData.expires_at
          });
        }
      } catch (encErr) {
        logToFile("⚠️ Error writing license.enc: " + encErr.message);
      }

      logToFile("✅ WAGrow paid license activated via GAS: " + licenseData.license_key);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          logToFile("🔄 Reloading window after paid key activation...");
          mainWindow.reload();
        }
      }, 1500);

      return {
        success: true,
        message: "🎉 Mubarak! License activate ho gaya! Client: " + licenseData.customer_name + " (" + licenseData.plan_name + " Plan). App chalu ho raha hai...",
        data: licenseData
      };
    } else if (gasResult && gasResult.error_code) {
      if (gasResult.error_code === "MAX_DEVICES_REACHED") {
        return { success: false, message: "⚠️ Is license key ki device limit poori ho chuki hai. Admin se extra device add karwayein ya device reset karwayein." };
      }
      if (gasResult.error_code === "LICENSE_EXPIRED") {
        return { success: false, message: "⚠️ Yeh license expire ho chuka hai. Kripya renew karein." };
      }
      if (gasResult.error_code === "LICENSE_REVOKED") {
        return { success: false, message: "⚠️ Yeh license admin dwara suspend/revoke kiya gaya hai." };
      }
      if (gasResult.error_code !== "LICENSE_NOT_FOUND") {
        return { success: false, message: gasResult.error || "License verify nahi ho saka." };
      }
    }

    // 2. Try native activation fallback (for offline built-in key formats)
    logToFile("🔄 Trying native activation fallback for key: " + rawKey);
    try {
      const nativeHandler = ipcMain._invokeHandlers ? ipcMain._invokeHandlers.get("license:activate") : null;
      if (nativeHandler) {
        const fallbackResult = await nativeHandler(null, rawKey);
        if (fallbackResult && fallbackResult.success) {
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.reload();
            }
          }, 1500);
          return {
            success: true,
            message: "🎉 License successfully activated! App start ho raha hai...",
            data: fallbackResult.data
          };
        } else if (fallbackResult && fallbackResult.message) {
          return { success: false, message: fallbackResult.message };
        }
      }
    } catch (fbErr) {
      logToFile("⚠️ Native fallback error: " + fbErr.message);
    }

    return {
      success: false,
      message: "❌ Galat License Key hai ya key database mein nahi mili. Kripya check karke dobara enter karein."
    };
  } catch (err) {
    logToFile("❌ activate-gas-key error: " + err.message);
    return {
      success: false,
      message: "License activate nahi ho saka: " + err.message
    };
  }
});

ipcMain.handle("license:validate", async _0x2a2478 => {
  try {
    const _0x1b551b = getAppDataPath();
    const _0x48029e = path.join(_0x1b551b, "license.enc");
    const _0x5efc76 = path.join(_0x1b551b, "license.json");
    const _0x2ac49e = generateMachineId();
    let _0x26af68 = null;
    try {
      const _0x47a2ea = require(resolveModulePath("services/local-license-service"));
      _0x26af68 = new _0x47a2ea();
    } catch (_0x50dc66) {
      logToFile("⚠️ Local license service not available: " + _0x50dc66.message);
      logToFile("🔄 Will use fallback self-contained license validation");
    }
    let _0x2cb877 = null;
    let _0x45e68f = null;
    if (fs.existsSync(_0x48029e)) {
      try {
        logToFile("🔐 Found encrypted license.enc file, attempting to decrypt...");
        const _0x3c822d = require(resolveModulePath("services/newlic-license-service"));
        const _0x313420 = fs.readFileSync(_0x48029e, "utf8");
        _0x2cb877 = _0x3c822d._decrypt(_0x313420);
        _0x45e68f = _0x2cb877.license_key;
        logToFile("✅ Successfully decrypted license for: " + _0x2cb877.customer_name);
      } catch (_0x4385e4) {
        if (_0x4385e4.message === "TAMPER_DETECTED") {
          logToFile("🚨 LICENSE TAMPERING DETECTED! Deleting corrupted file.");
          fs.unlinkSync(_0x48029e);
          try {
            const _0x37ca65 = require(resolveModulePath("services/newlic-license-service"));
            await _0x37ca65._reportTampering(_0x2cb877?.license_key, _0x2ac49e);
          } catch (_0x4b9721) {
            logToFile("Failed to report tampering: " + _0x4b9721.message);
          }
          return {
            success: false,
            message: "License tampering detected. Please contact support.",
            error_code: "TAMPER_DETECTED"
          };
        }
        logToFile("❌ Failed to decrypt license: " + _0x4385e4.message);
        return {
          success: false,
          message: "Failed to decrypt license file",
          error_code: "DECRYPT_ERROR"
        };
      }
    }
    if (!_0x2cb877 && fs.existsSync(_0x5efc76)) {
      logToFile("📄 No encrypted license found, checking plain license.json (legacy)...");
      _0x2cb877 = JSON.parse(fs.readFileSync(_0x5efc76, "utf8"));
      logToFile("🔍 Found legacy license file for: " + _0x2cb877.customer_name);
      if (!verifyLicenseIntegrity(_0x2cb877)) {
        logToFile("❌ License file integrity check failed - file may have been tampered with");
        fs.unlinkSync(licenseFile);
        return {
          success: false,
          message: "License file has been corrupted or tampered with. Please reactivate your license.",
          error_code: "LICENSE_TAMPERED"
        };
      }
      if (_0x2cb877.expires_at) {
        const _0x1ccaa7 = new Date(_0x2cb877.expires_at);
        const _0xed1831 = new Date();
        if (_0xed1831 > _0x1ccaa7) {
          logToFile("❌ License expired: " + _0x1ccaa7.toISOString());
          return {
            success: false,
            message: "License has expired",
            error_code: "LICENSE_EXPIRED"
          };
        }
        let _0x1fb488 = 5;
        let _0x146419 = [];
        if (_0x2cb877.license_key && _0x2cb877.license_key.startsWith("LW-")) {
          try {
            logToFile("🔍 Re-parsing license key to extract max_devices...");
            const _0x122c26 = _0x2cb877.license_key.split("-");
            if (_0x122c26.length === 5) {
              const _0xc53dca = _0x122c26[1];
              const _0x3b1cf0 = Buffer.from(_0xc53dca, "hex").toString("utf8");
              const _0x211f8c = JSON.parse(_0x3b1cf0);
              logToFile("🔍 Parsed license data: " + JSON.stringify(_0x211f8c));
              _0x1fb488 = _0x211f8c.max_devices !== undefined ? _0x211f8c.max_devices : 5;
              _0x146419 = _0x211f8c.modules || [];
              logToFile("✅ Re-parsed license key - max_devices: " + _0x1fb488 + ", modules: " + _0x146419.length + " modules");
            } else {
              logToFile("⚠️ License key format invalid (" + _0x122c26.length + " parts), using defaults");
              _0x1fb488 = _0x2cb877.max_devices || 5;
              _0x146419 = _0x2cb877.modules || [];
            }
          } catch (_0x6570bb) {
            logToFile("⚠️ Could not re-parse license key: " + _0x6570bb.message);
            logToFile("⚠️ Using cached values - max_devices: " + (_0x2cb877.max_devices || 5));
            console.error("⚠️ Could not re-parse license key:", _0x6570bb);
            _0x1fb488 = _0x2cb877.max_devices || 5;
            _0x146419 = _0x2cb877.modules || [];
          }
        } else {
          logToFile("⚠️ No valid license key found, using cached values");
          _0x1fb488 = _0x2cb877.max_devices || 5;
          _0x146419 = _0x2cb877.modules || [];
        }
        logToFile("✅ License is valid until: " + _0x1ccaa7.toISOString());
        return {
          success: true,
          data: {
            license_key: _0x2cb877.license_key || "LOCAL_LICENSE",
            customer_name: _0x2cb877.customer_name || "Licensed User",
            plan_name: _0x2cb877.plan_name || "standard",
            expires_at: _0x2cb877.expires_at,
            expires_at_formatted: new Date(_0x2cb877.expires_at).toLocaleDateString(),
            isTrial: _0x2cb877.isTrial || false,
            isValid: true,
            status: _0x2cb877.status || "active",
            modules: _0x146419,
            max_devices: _0x1fb488
          }
        };
      } else {
        logToFile("❌ License data missing expiry date");
        return {
          success: false,
          message: "Invalid license data - missing expiry date",
          error_code: "INVALID_LICENSE_DATA"
        };
      }
    } else {
      logToFile("🔍 No local license file found at: " + licenseFile);
      return {
        success: false,
        message: "No license found",
        error_code: "NO_LICENSE"
      };
    }
  } catch (_0x2045c0) {
    logToFile("❌ Error validating license: " + _0x2045c0.message);
    return {
      success: false,
      message: "Unable to validate your license. Please check your internet connection and try again, or contact your administrator for assistance.",
      error: _0x2045c0.message
    };
  }
});
ipcMain.handle("license:get-local-info", () => {
  try {
    const _0x398b88 = getAppDataPath();
    const _0x2f77d8 = path.join(_0x398b88, "license.enc");
    const _0x562395 = path.join(_0x398b88, "license.json");
    if (fs.existsSync(_0x2f77d8)) {
      try {
        const _0x54854b = require(resolveModulePath("services/newlic-license-service"));
        const _0x39c986 = fs.readFileSync(_0x2f77d8, "utf8");
        return _0x54854b._decrypt(_0x39c986);
      } catch (_0x5e62f1) {
        if (_0x5e62f1.message === "TAMPER_DETECTED") {
          logToFile("🚨 LICENSE TAMPERING DETECTED in get-local-info!");
          fs.unlinkSync(_0x2f77d8);
          return null;
        }
        logToFile("❌ Failed to decrypt license: " + _0x5e62f1.message);
      }
    }
    if (fs.existsSync(_0x562395)) {
      return JSON.parse(fs.readFileSync(_0x562395, "utf8"));
    }
    logToFile("🔍 No local license file found, checking Keygen database for machine license...");
    try {
      const _0x5c3da2 = require(resolveModulePath("services/local-license-service"));
      const _0x45a39d = new _0x5c3da2();
      const _0x501961 = generateMachineId();
      const _0x51e84c = _0x45a39d.loadKeygenLicenses();
      for (const _0x4ac97c of _0x51e84c) {
        if (_0x4ac97c.activations && _0x4ac97c.activations.length > 0) {
          const _0x11a8f3 = _0x4ac97c.activations.find(_0x4e866c => _0x4e866c.machine_id === _0x501961);
          if (_0x11a8f3) {
            return {
              license_key: _0x4ac97c.license_key,
              customer_name: _0x4ac97c.customer_name,
              plan_name: _0x4ac97c.plan_type,
              plan_type: _0x4ac97c.plan_type,
              expires_at: _0x4ac97c.expires_at,
              status: _0x4ac97c.status,
              machine_id: _0x501961,
              activated_at: _0x11a8f3.activated_at || new Date().toISOString(),
              last_validated: new Date().toISOString()
            };
          }
        }
      }
    } catch (_0x4bebab) {
      logToFile("❌ Error checking Keygen database: " + _0x4bebab.message);
    }
    return null;
  } catch (_0x4821bb) {
    logToFile("❌ Error reading local license: " + _0x4821bb.message);
    return null;
  }
});
ipcMain.handle("license:clear-local-data", () => {
  try {
    const _0x3b43b0 = getAppDataPath();
    const _0x36b3c6 = path.join(_0x3b43b0, "license.json");
    if (fs.existsSync(_0x36b3c6)) {
      fs.unlinkSync(_0x36b3c6);
      logToFile("✅ Local license data cleared");
    }
    return {
      success: true
    };
  } catch (_0x190c60) {
    logToFile("❌ Error clearing local license: " + _0x190c60.message);
    return {
      success: false,
      error: _0x190c60.message
    };
  }
});
ipcMain.handle("license:debug-clear", () => {
  try {
    const _0x471e7a = getAppDataPath();
    const _0x47bc32 = path.join(_0x471e7a, "license.json");
    if (fs.existsSync(_0x47bc32)) {
      fs.unlinkSync(_0x47bc32);
      logToFile("🗑️ DEBUG: Local license file deleted for testing");
    } else {
      logToFile("🗑️ DEBUG: No license file found to delete");
    }
    return {
      success: true,
      message: "License cleared for testing"
    };
  } catch (_0x12c10b) {
    logToFile("❌ Error clearing local license: " + _0x12c10b.message);
    return {
      success: false,
      error: _0x12c10b.message
    };
  }
});
ipcMain.handle("license:save-local-info", (_0xeebb65, _0x342c09) => {
  try {
    const _0x51957b = getAppDataPath();
    if (!fs.existsSync(_0x51957b)) {
      fs.mkdirSync(_0x51957b, {
        recursive: true
      });
    }
    addLicenseSignature(_0x342c09);
    const _0x57abc5 = path.join(_0x51957b, "license.json");
    fs.writeFileSync(_0x57abc5, JSON.stringify(_0x342c09, null, 2));
    logToFile("✅ Local license data saved: " + _0x342c09.customer_name);
    return {
      success: true
    };
  } catch (_0x215607) {
    logToFile("❌ Error saving local license: " + _0x215607.message);
    return {
      success: false,
      error: _0x215607.message
    };
  }
});
ipcMain.handle("license:check-machine", async _0x2180ca => {
  try {
    const _0x25c5bd = generateMachineId();
    logToFile("🔍 Checking machine ID: " + _0x25c5bd);
    const _0x5d05c0 = require(resolveModulePath("services/local-license-service"));
    const _0x2f5da1 = new _0x5d05c0();
    const _0x590989 = await _0x2f5da1.checkMachineActivation(_0x25c5bd);
    logToFile("🔍 Machine check result: " + JSON.stringify(_0x590989));
    return _0x590989;
  } catch (_0x166f34) {
    logToFile("❌ Error checking machine ID: " + _0x166f34.message);
    return {
      success: false,
      message: "Unable to verify machine activation. Please check your internet connection and try again.",
      error: _0x166f34.message,
      error_code: "LOCAL_CHECK_ERROR"
    };
  }
});
ipcMain.handle("license:check-status", async (_0x21b340, _0x3cc0e1) => {
  try {
    _0x3cc0e1 = _0x3cc0e1.trim();
    logToFile("🔍 Checking license status for: " + _0x3cc0e1);
    const _0x3fbf5a = _0x3cc0e1.split("-");
    if (_0x3fbf5a.length === 5 && _0x3fbf5a[0] === "LW") {
      logToFile("🔍 Detected self-contained license format (Keygen generated)");
      try {
        const [_0x2cc356, _0x425b86, _0x5be9e1, _0x329f15, _0x42f4ca] = _0x3fbf5a;
        const _0x379d6e = require("crypto");
        logToFile("🔍 Parts: prefix=" + _0x2cc356 + ", encodedData=" + _0x425b86 + ", expiryHex=" + _0x5be9e1 + ", checksum=" + _0x329f15 + ", signature=" + _0x42f4ca);
        const _0x213790 = _0x425b86 + "-" + _0x5be9e1;
        const _0x3d650f = _0x379d6e.createHash("md5").update(_0x213790).digest("hex").substring(0, 4).toUpperCase();
        logToFile("🔍 Checksum validation: expected=" + _0x3d650f + ", provided=" + _0x329f15);
        if (_0x329f15 !== _0x3d650f) {
          logToFile("❌ Checksum validation failed");
          return {
            success: false,
            error: "Invalid license key. Checksum verification failed.",
            error_code: "INVALID_CHECKSUM"
          };
        }
        const _0x27bc63 = JSON.parse(Buffer.from(_0x425b86, "hex").toString("utf8"));
        const _0x5c5259 = parseInt(_0x5be9e1, 16);
        const _0x3a9f5a = new Date(_0x5c5259 * 1000);
        const _0xe975c1 = new Date();
        logToFile("🔍 License data: " + JSON.stringify(_0x27bc63));
        logToFile("🔍 Expiry: " + _0x3a9f5a.toISOString() + ", Now: " + _0xe975c1.toISOString());
        if (_0xe975c1 > _0x3a9f5a) {
          logToFile("❌ License has expired");
          return {
            success: false,
            error: "License has expired",
            error_code: "LICENSE_EXPIRED"
          };
        }
        logToFile("✅ Self-contained license validation successful");
        return {
          success: true,
          data: {
            status: "active",
            expires_at: _0x3a9f5a.toISOString(),
            customer_name: _0x27bc63.name || "Licensed User",
            plan_type: _0x27bc63.plan || "standard",
            modules: _0x27bc63.modules || []
          }
        };
      } catch (_0x352674) {
        logToFile("❌ Self-contained license validation failed: " + _0x352674.message);
        return {
          success: false,
          error: "License validation failed: " + _0x352674.message,
          error_code: "VALIDATION_ERROR"
        };
      }
    }
    const _0x48aac1 = require(resolveModulePath("services/local-license-service"));
    const _0x78af6a = new _0x48aac1();
    const _0x1e9170 = await _0x78af6a.checkLicenseStatus(_0x3cc0e1);
    logToFile("🔍 License status result: " + JSON.stringify(_0x1e9170));
    return _0x1e9170;
  } catch (_0x3bc33c) {
    logToFile("❌ Error checking license status: " + _0x3bc33c.message);
    return {
      success: false,
      message: "Unable to check license status. Please check your internet connection and try again, or contact your administrator for assistance.",
      error: _0x3bc33c.message
    };
  }
});
ipcMain.handle("license:force-refresh", async _0x4f203d => {
  try {
    logToFile("🔄 Force refresh license triggered from renderer...");
    const _0x295913 = await new Promise(_0x53a28d => {
      ipcMain.handleOnce("license:validate-temp", async () => {
        return await ipcMain.handle("license:validate", () => {});
      });
      _0x53a28d(ipcMain.emit("license:validate-temp"));
    });
    return await validateLicenseDirectly();
  } catch (_0x1a2bfd) {
    logToFile("❌ Error in force refresh: " + _0x1a2bfd.message);
    return {
      success: false,
      message: "Failed to refresh license",
      error: _0x1a2bfd.message
    };
  }
});
async function validateLicenseDirectly() {
  try {
    const _0x26d53c = getAppDataPath();
    const _0x3331d5 = path.join(_0x26d53c, "license.json");
    if (!fs.existsSync(_0x3331d5)) {
      logToFile("🔍 No local license file found at: " + _0x3331d5);
      return {
        success: false,
        message: "No license found",
        error_code: "NO_LICENSE"
      };
    }
    const _0x230a39 = JSON.parse(fs.readFileSync(_0x3331d5, "utf8"));
    const _0x1a4ccd = generateMachineId();
    logToFile("🔍 Force validating license - Key: " + _0x230a39.license_key + ", Machine ID: " + _0x1a4ccd);
    const _0x1c3ffe = require(resolveModulePath("services/local-license-service"));
    const _0x269796 = new _0x1c3ffe();
    const _0x4dc84b = await _0x269796.validateLicense(_0x230a39.license_key, _0x1a4ccd, app.getVersion());
    logToFile("🔍 Force license validation result: " + JSON.stringify(_0x4dc84b));
    if (_0x4dc84b.success) {
      _0x230a39.last_validated = new Date().toISOString();
      fs.writeFileSync(_0x3331d5, JSON.stringify(_0x230a39, null, 2));
    }
    return _0x4dc84b;
  } catch (_0x4d0d4c) {
    logToFile("❌ Error in force validation: " + _0x4d0d4c.message);
    return {
      success: false,
      message: "Unable to validate license. Please check your internet connection and try again, or contact your administrator for assistance.",
      error: _0x4d0d4c.message
    };
  }
}
ipcMain.handle("license:background-status", async _0x4c3a19 => {
  try {
    if (backgroundLicenseValidator) {
      return {
        success: true,
        status: backgroundLicenseValidator.getStatus()
      };
    }
    return {
      success: false,
      message: "Background license validator not available"
    };
  } catch (_0x57927e) {
    logToFile("❌ Error getting background license status: " + _0x57927e.message);
    return {
      success: false,
      error: _0x57927e.message
    };
  }
});
ipcMain.handle("license:force-validation", async _0x389576 => {
  try {
    if (backgroundLicenseValidator) {
      logToFile("🔐 Force validation triggered from UI");
      await backgroundLicenseValidator.validateLicense();
      return {
        success: true,
        message: "License validation triggered"
      };
    }
    return {
      success: false,
      message: "Background license validator not available"
    };
  } catch (_0x436cfe) {
    logToFile("❌ Error forcing license validation: " + _0x436cfe.message);
    return {
      success: false,
      message: _0x436cfe.message
    };
  }
});
ipcMain.handle("license:extract-company-info", async (_0x2f1466, _0x35b5bb) => {
  try {
    logToFile("🔍 Extracting company info from license key: " + _0x35b5bb);
    const _0x4f0c7d = require(resolveModulePath("services/local-license-service"));
    const _0x197b46 = new _0x4f0c7d();
    const _0x50cabe = await _0x197b46.validateSelfContainedLicense(_0x35b5bb);
    if (_0x50cabe.success && _0x50cabe.company_info) {
      logToFile("✅ Extracted company info: " + JSON.stringify(_0x50cabe.company_info));
      return _0x50cabe.company_info;
    }
    logToFile("⚠️ No company info found in license key");
    return null;
  } catch (_0x7762ad) {
    logToFile("❌ Error extracting company info: " + _0x7762ad.message);
    return null;
  }
});
ipcMain.handle("cloud-license:activate", async (_0x2a8536, _0x3e3f27) => {
  try {
    if (!cloudLicenseService) {
      return {
        success: false,
        error: "Cloud license service not available"
      };
    }
    const {
      licenseKey: _0x5c098d
    } = _0x3e3f27;
    const _0x580a86 = generateMachineId();
    logToFile("🔐 Activating cloud license: " + _0x5c098d);
    const _0x1330b2 = await cloudLicenseService.activateCloudLicense(_0x5c098d, _0x580a86);
    if (_0x1330b2.success) {
      logToFile("✅ Cloud license activated successfully");
      cloudLicenseService.startPeriodicValidation();
    } else {
      logToFile("❌ Cloud license activation failed: " + _0x1330b2.message);
    }
    return _0x1330b2;
  } catch (_0x59ca95) {
    logToFile("❌ Error activating cloud license: " + _0x59ca95.message);
    return {
      success: false,
      error: _0x59ca95.message
    };
  }
});
ipcMain.handle("cloud-license:validate", async _0x39ca9a => {
  try {
    if (!cloudLicenseService) {
      return {
        success: false,
        error: "Cloud license service not available"
      };
    }
    const _0x48a50b = await cloudLicenseService.validateCloudLicense();
    return _0x48a50b;
  } catch (_0x4ef0d2) {
    logToFile("❌ Error validating cloud license: " + _0x4ef0d2.message);
    return {
      success: false,
      error: _0x4ef0d2.message
    };
  }
});
ipcMain.handle("cloud-license:get-info", async _0x33fd67 => {
  try {
    if (!cloudLicenseService) {
      return null;
    }
    return cloudLicenseService.getCloudLicenseData();
  } catch (_0x48d985) {
    logToFile("❌ Error getting cloud license info: " + _0x48d985.message);
    return null;
  }
});
ipcMain.handle("cloud-license:has-license", async _0x377c1c => {
  try {
    if (!cloudLicenseService) {
      return false;
    }
    return cloudLicenseService.hasCloudLicense();
  } catch (_0x59f2a6) {
    return false;
  }
});
ipcMain.handle("cloud-license:delete", async _0x3dc26b => {
  try {
    if (!cloudLicenseService) {
      return {
        success: false,
        error: "Cloud license service not available"
      };
    }
    cloudLicenseService.stopPeriodicValidation();
    const _0xcdbf33 = cloudLicenseService.deleteCloudLicense();
    return {
      success: _0xcdbf33,
      message: _0xcdbf33 ? "Cloud license deleted" : "Failed to delete cloud license"
    };
  } catch (_0x9add9b) {
    logToFile("❌ Error deleting cloud license: " + _0x9add9b.message);
    return {
      success: false,
      error: _0x9add9b.message
    };
  }
});
const newlicLicenseService = require(resolveModulePath("services/newlic-license-service"));
const MODULE_VALIDATION_CACHE_TTL = 1800000;
const moduleValidationCache = {};
let heartbeatValidator = null;
function getHeartbeatValidator() {
  if (!heartbeatValidator) {
    try {
      heartbeatValidator = require(resolveModulePath("security/heartbeat-validator"));
    } catch (_0x1ec2c4) {
      logToFile("⚠️ Heartbeat validator not available: " + _0x1ec2c4.message);
      heartbeatValidator = {
        start: () => logToFile("⚠️ Heartbeat validator disabled"),
        stop: () => {},
        isValid: () => true
      };
    }
  }
  return heartbeatValidator;
}
ipcMain.handle("newlic-license:activate", async (_0x57fa9e, _0x28f52f) => {
  try {
    const _0x37ca74 = (_0x28f52f.licenseKey || "").replace(/\s+/g, "");
    const _0x43d3e4 = generateMachineId();
    logToFile("🔑 NewLic: Activating license: " + _0x37ca74);
    const _0x2fb799 = await newlicLicenseService.activateLicense(_0x37ca74, _0x43d3e4);
    if (_0x2fb799.success) {
      logToFile("✅ NewLic: License activated successfully");
      Object.keys(moduleValidationCache).forEach(_0x30fa4c => delete moduleValidationCache[_0x30fa4c]);
      try {
        const _0x348e96 = getHeartbeatValidator();
        _0x348e96.start(_0x37ca74, _0x43d3e4, "https://license.getleadwave.in");
        logToFile("🔐 Heartbeat validator started");
      } catch (_0x964d11) {
        logToFile("⚠️ Failed to start heartbeat validator: " + _0x964d11.message);
      }
    } else {
      logToFile("❌ NewLic: License activation failed: " + _0x2fb799.message);
    }
    return _0x2fb799;
  } catch (_0x2be300) {
    logToFile("❌ NewLic: Error activating license: " + _0x2be300.message);
    return {
      success: false,
      message: "Failed to activate license"
    };
  }
});
ipcMain.handle("newlic-license:validate", async _0x4fa321 => {
  try {
    const _0x7d150c = generateMachineId();
    const _0x4d7bd9 = await newlicLicenseService.checkLicense(_0x7d150c);
    return _0x4d7bd9;
  } catch (_0x563046) {
    logToFile("❌ NewLic: Error validating license: " + _0x563046.message);
    return {
      valid: false,
      message: "License validation failed"
    };
  }
});
ipcMain.handle("newlic-license:get-info", async _0x50bdf7 => {
  try {
    return newlicLicenseService.getLicenseInfo();
  } catch (_0xfbd456) {
    logToFile("❌ NewLic: Error getting license info: " + _0xfbd456.message);
    return null;
  }
});
ipcMain.handle("newlic-license:clear", async _0x11344a => {
  try {
    newlicLicenseService.clearLicense();
    Object.keys(moduleValidationCache).forEach(_0x3db5c7 => delete moduleValidationCache[_0x3db5c7]);
    logToFile("✅ NewLic: License cleared");
    return {
      success: true
    };
  } catch (_0x59b629) {
    logToFile("❌ NewLic: Error clearing license: " + _0x59b629.message);
    return {
      success: false,
      error: _0x59b629.message
    };
  }
});
ipcMain.handle("newlic-license:validate-module", async (_0x58007b, _0x10a18d) => {
  try {
    const _0x53eb64 = Date.now();
    const _0x5405f6 = moduleValidationCache[_0x10a18d];
    if (_0x5405f6 && _0x53eb64 - _0x5405f6.validatedAt < MODULE_VALIDATION_CACHE_TTL) {
      return {
        valid: _0x5405f6.valid,
        cached: true
      };
    }
    const _0xb1e980 = newlicLicenseService.getLicenseInfo();
    if (!_0xb1e980 || !_0xb1e980.key) {
      return {
        valid: false,
        reason: "no_license"
      };
    }
    const _0x10e227 = generateMachineId();
    const _0x31e508 = new AbortController();
    const _0x1f43a4 = setTimeout(() => _0x31e508.abort(), 5000);
    try {
      const _0x427f9f = await fetch("https://license.getleadwave.in/api/licenses/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          license_key: _0xb1e980.key,
          machine_id: _0x10e227
        }),
        signal: _0x31e508.signal
      });
      clearTimeout(_0x1f43a4);
      const _0x15eb8e = await _0x427f9f.json();
      const _0x1ae6a5 = _0x15eb8e.valid === true;
      moduleValidationCache[_0x10a18d] = {
        validatedAt: _0x53eb64,
        valid: _0x1ae6a5
      };
      if (!_0x1ae6a5) {
        logToFile("❌ Module validation failed for [" + _0x10a18d + "]: " + _0x15eb8e.message);
      } else {
        logToFile("✅ Module validation passed for [" + _0x10a18d + "]");
      }
      return {
        valid: _0x1ae6a5,
        reason: _0x15eb8e.message || null
      };
    } catch (_0x5639fa) {
      clearTimeout(_0x1f43a4);
      const _0x475f8d = getHeartbeatValidator();
      const _0x12ccdc = _0x475f8d ? _0x475f8d.licenseValid : false;
      logToFile("⚠️ Module validation network error for [" + _0x10a18d + "] — using heartbeat state: " + _0x12ccdc);
      moduleValidationCache[_0x10a18d] = {
        validatedAt: _0x53eb64 - (MODULE_VALIDATION_CACHE_TTL - 300000),
        valid: _0x12ccdc
      };
      return {
        valid: _0x12ccdc,
        reason: "network_unavailable"
      };
    }
  } catch (_0x6a48b1) {
    logToFile("❌ Module validation error for [" + _0x10a18d + "]: " + _0x6a48b1.message);
    return {
      valid: false,
      reason: _0x6a48b1.message
    };
  }
});
ipcMain.handle("app:clean-installation", async _0x4c92ae => {
  try {
    const {
      cleanInstallation: _0x1a55a5
    } = require("../../scripts/clean-installation.js");
    await _0x1a55a5();
    return {
      success: true,
      message: "Clean installation completed successfully"
    };
  } catch (_0x390283) {
    logToFile("❌ Error during clean installation: " + _0x390283.message);
    return {
      success: false,
      message: "Failed to clean installation",
      error: _0x390283.message
    };
  }
});
ipcMain.handle("app-version", () => {
  let _0x586e05;
  try {
    _0x586e05 = require("../../package.json");
  } catch (_0x8d0738) {
    try {
      _0x586e05 = require("../package.json");
    } catch (_0x30fd96) {
      try {
        _0x586e05 = require(path.join(__dirname, "../../package.json"));
      } catch (_0x246b83) {
        _0x586e05 = {
          version: "9.0.0"
        };
      }
    }
  }
  return _0x586e05.version;
});
ipcMain.handle("app-quit", async () => {
  logToFile("🔄 App quit requested from renderer process");
  isQuitting = true;
  await gracefulShutdown();
  return {
    success: true
  };
});
ipcMain.handle("window:toggle-frame", async (_0x4ee0bd, _0x301729) => {
  try {
    if (!mainWindow) {
      return {
        success: false,
        error: "Main window not available"
      };
    }
    logToFile("🪟 Toggling menu bar: " + (_0x301729 ? "show" : "hide"));
    if (_0x301729) {
      mainWindow.setMenuBarVisibility(true);
      mainWindow.setAutoHideMenuBar(false);
      logToFile("✅ Menu bar shown");
    } else {
      mainWindow.setMenuBarVisibility(false);
      mainWindow.setAutoHideMenuBar(true);
      logToFile("✅ Menu bar hidden");
    }
    logToFile("✅ Window frame toggled successfully: " + (_0x301729 ? "visible" : "hidden"));
    return {
      success: true
    };
  } catch (_0x3d9061) {
    logToFile("❌ Error toggling window frame: " + _0x3d9061.message);
    return {
      success: false,
      error: _0x3d9061.message
    };
  }
});
ipcMain.handle("window:get-frame-status", () => {
  try {
    if (!mainWindow) {
      return {
        success: false,
        error: "Main window not available"
      };
    }
    const _0x17d55e = mainWindow.isMenuBarVisible();
    return {
      success: true,
      hasFrame: _0x17d55e
    };
  } catch (_0x23edbb) {
    logToFile("❌ Error getting frame status: " + _0x23edbb.message);
    return {
      success: false,
      error: _0x23edbb.message
    };
  }
});
ipcMain.handle("window:apply-saved-preference", async () => {
  try {
    if (!mainWindow) {
      return {
        success: false,
        error: "Main window not available"
      };
    }
    if (!databaseService || !databaseService.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x331e98 = databaseService.db.prepare("SELECT value FROM app_settings WHERE key = ?").get("window_show_title_bar");
    if (_0x331e98) {
      const _0x21317f = _0x331e98.value === "true";
      if (!_0x21317f) {
        mainWindow.setMenuBarVisibility(false);
        mainWindow.setAutoHideMenuBar(true);
        logToFile("🪟 Applied saved preference: title bar hidden");
      } else {
        mainWindow.setMenuBarVisibility(true);
        mainWindow.setAutoHideMenuBar(false);
        logToFile("🪟 Applied saved preference: title bar visible");
      }
      return {
        success: true,
        applied: true,
        showTitleBar: _0x21317f
      };
    } else {
      logToFile("📋 No saved preference found");
      return {
        success: true,
        applied: false,
        showTitleBar: true
      };
    }
  } catch (_0x1a658f) {
    logToFile("❌ Error applying saved preference: " + _0x1a658f.message);
    return {
      success: false,
      error: _0x1a658f.message
    };
  }
});
ipcMain.handle("app:is-development", () => {
  return isDev;
});
ipcMain.handle("show-message-box", async (_0x42144a, _0x4e1eaf) => {
  const _0x575399 = await dialog.showMessageBox(mainWindow, _0x4e1eaf);
  return _0x575399;
});
ipcMain.handle("show-open-dialog", async (_0x1f412b, _0x20a496) => {
  const _0x20d36d = await dialog.showOpenDialog(mainWindow, _0x20a496);
  return _0x20d36d;
});
ipcMain.handle("show-save-dialog", async (_0x3afb3b, _0x2a9cd1) => {
  const _0x5e2833 = await dialog.showSaveDialog(mainWindow, _0x2a9cd1);
  return _0x5e2833;
});
ipcMain.handle("whatsapp:create-session", async (_0x1a4d71, _0x67dfdf) => {
  try {
    if (!appService) {
      logToFile("❌ App service not available for session creation");
      if (global.appService) {
        appService = global.appService;
        logToFile("✅ Retrieved appService from global");
      } else {
        logToFile("🔄 Attempting to re-initialize AppService on demand...");
        try {
          const _0x5d3ec4 = await loadAppService();
          if (_0x5d3ec4 && appService) {
            logToFile("✅ AppService re-initialized successfully");
          } else {
            logToFile("❌ AppService re-initialization failed");
            return {
              success: false,
              message: "App service could not be started. Please restart the application."
            };
          }
        } catch (_0x25d6f2) {
          logToFile("❌ AppService re-initialization error: " + _0x25d6f2.message);
          return {
            success: false,
            message: "App service could not be started. Please restart the application."
          };
        }
      }
    }
    if (typeof appService.createWhatsAppSession !== "function") {
      logToFile("❌ createWhatsAppSession is not a function. Type: " + typeof appService.createWhatsAppSession);
      logToFile("❌ AppService constructor: " + appService.constructor.name);
      logToFile("❌ Available methods: " + Object.getOwnPropertyNames(Object.getPrototypeOf(appService)).join(", "));
      return {
        success: false,
        message: "createWhatsAppSession method not available"
      };
    }
    if (!appService.isInitialized) {
      logToFile("⚠️ App service not yet initialized — createWhatsAppSession() will wait internally");
    }
    logToFile("🔄 Creating WhatsApp session for device: " + (_0x67dfdf.name || _0x67dfdf.device_name));
    const _0x509382 = await appService.createWhatsAppSession(_0x67dfdf.name || _0x67dfdf.device_name);
    logToFile("✅ Session creation result:", _0x509382);
    return _0x509382;
  } catch (_0x3d4c40) {
    logToFile("❌ Error creating WhatsApp session: " + _0x3d4c40.message);
    logToFile("❌ Error stack: " + _0x3d4c40.stack);
    return {
      success: false,
      message: _0x3d4c40.message
    };
  }
});
ipcMain.handle("whatsapp:disconnect-session", async (_0x5654c3, _0x3b1ae2) => {
  try {
    if (!appService) {
      return {
        success: false,
        message: "App service not available"
      };
    }
    return await appService.disconnectWhatsAppSession(_0x3b1ae2);
  } catch (_0x14f996) {
    logToFile("❌ Error disconnecting WhatsApp session: " + _0x14f996.message);
    return {
      success: false,
      message: _0x14f996.message
    };
  }
});
ipcMain.handle("whatsapp:get-sessions", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        sessions: []
      };
    }
    const _0x26a48d = await appService.getWhatsAppSessions();
    return {
      success: true,
      sessions: _0x26a48d
    };
  } catch (_0x580790) {
    logToFile("❌ Error getting WhatsApp sessions: " + _0x580790.message);
    return {
      success: false,
      sessions: []
    };
  }
});
ipcMain.handle("whatsapp:send-message", async (_0x1c1be5, _0xd8e881, _0x19ffbf, _0x368ead, _0x39e410, _0x4b3eed) => {
  try {
    console.log("📨 [IPC] Received send-message request:");
    console.log("  Session ID: " + _0xd8e881);
    console.log("  To: " + _0x19ffbf);
    console.log("  Message: " + JSON.stringify(_0x368ead));
    console.log("  Type: " + _0x39e410);
    console.log("  Options: " + JSON.stringify(_0x4b3eed));
    logToFile("📨 [IPC] Send message - Session: " + _0xd8e881 + ", To: " + _0x19ffbf + ", Message: " + JSON.stringify(_0x368ead) + ", Type: " + _0x39e410);
    if (!appService) {
      console.log("❌ [IPC] App service not available");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xdc34c8 = await appService.sendMessage(_0xd8e881, _0x19ffbf, _0x368ead, _0x39e410, _0x4b3eed);
    console.log("✅ [IPC] Send message result: " + JSON.stringify(_0xdc34c8));
    logToFile("✅ [IPC] Send message result: " + JSON.stringify(_0xdc34c8));
    return _0xdc34c8;
  } catch (_0x2d2fd9) {
    console.error("❌ IPC: Error sending message:", _0x2d2fd9);
    logToFile("❌ Error sending message: " + _0x2d2fd9.message);
    return {
      success: false,
      error: _0x2d2fd9.message
    };
  }
});
ipcMain.handle("whatsapp:reconnect-session", async (_0x54f680, _0x54250a) => {
  try {
    if (!appService) {
      return {
        success: false,
        message: "App service not available"
      };
    }
    return await appService.reconnectWhatsAppSession(_0x54250a);
  } catch (_0x563b56) {
    logToFile("❌ Error reconnecting WhatsApp session: " + _0x563b56.message);
    return {
      success: false,
      message: _0x563b56.message
    };
  }
});
ipcMain.handle("recall-bot:get-settings", async (_0x469b6d, _0x4760f1) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x427344 = appService.getRecallBotService();
    if (!_0x427344) {
      return {
        success: false,
        error: "Recall Bot service not available"
      };
    }
    const _0x8a50f2 = await _0x427344.getSessionSettings(_0x4760f1);
    return {
      success: true,
      settings: _0x8a50f2
    };
  } catch (_0x209a6d) {
    logToFile("❌ Error getting Recall Bot settings: " + _0x209a6d.message);
    return {
      success: false,
      error: _0x209a6d.message
    };
  }
});
ipcMain.handle("recall-bot:test", async _0x310cf3 => {
  if (isDev) {}
  logToFile("🔍 IPC: TEST HANDLER CALLED - IPC is working!");
  return {
    success: true,
    message: "IPC test successful"
  };
});
ipcMain.handle("recall-bot:update-settings", async (_0xb99b87, _0x422ea6, _0x3478a5) => {
  try {
    if (isDev) {}
    logToFile("🔍 IPC: recall-bot:update-settings called with sessionId: " + _0x422ea6);
    if (!appService) {
      if (isDev) {
        console.error("🔍 IPC: App service not available");
      }
      logToFile("🔍 IPC: App service not available");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3d02a5 = appService.getRecallBotService();
    if (!_0x3d02a5) {
      if (isDev) {
        console.error("🔍 IPC: Recall Bot service not available");
      }
      logToFile("🔍 IPC: Recall Bot service not available");
      return {
        success: false,
        error: "Recall Bot service not available"
      };
    }
    if (isDev) {}
    logToFile("🔍 IPC: Calling updateSessionSettings");
    const _0x1a6a42 = await _0x3d02a5.updateSessionSettings(_0x422ea6, _0x3478a5);
    if (isDev) {}
    logToFile("🔍 IPC: updateSessionSettings result: " + JSON.stringify(_0x1a6a42));
    return _0x1a6a42;
  } catch (_0x3521ed) {
    logToFile("❌ Error updating Recall Bot settings: " + _0x3521ed.message);
    if (isDev) {
      console.error("🔍 IPC: Error in update-settings:", _0x3521ed);
    }
    return {
      success: false,
      error: _0x3521ed.message
    };
  }
});
ipcMain.handle("recall-bot:get-reminders", async (_0x10a6a, _0x559053) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x144140 = appService.getDatabaseService();
    if (!_0x144140) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x36a9f7 = await _0x144140.all("\n      SELECT * FROM reminders\n      WHERE session_id = ? AND status = 'active'\n      ORDER BY scheduled_time ASC\n    ", [_0x559053]);
    const _0x5db001 = Array.isArray(_0x36a9f7) ? _0x36a9f7 : [];
    return {
      success: true,
      reminders: _0x5db001
    };
  } catch (_0x14896d) {
    logToFile("❌ Error getting reminders: " + _0x14896d.message);
    return {
      success: false,
      error: _0x14896d.message,
      reminders: []
    };
  }
});
ipcMain.handle("recall-bot:cancel-reminder", async (_0x1e1297, _0x35f092, _0x4da498) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x443b34 = appService.getRecallBotService();
    if (!_0x443b34) {
      return {
        success: false,
        error: "Recall Bot service not available"
      };
    }
    const _0x560470 = await _0x443b34.reminderScheduler.cancelReminder(_0x4da498);
    return _0x560470;
  } catch (_0x3d76a3) {
    logToFile("❌ Error cancelling reminder: " + _0x3d76a3.message);
    return {
      success: false,
      error: _0x3d76a3.message
    };
  }
});
ipcMain.handle("recall-bot:get-stats", async (_0x5e6b46, _0x15ee4b) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5f5993 = appService.getRecallBotService();
    if (!_0x5f5993) {
      return {
        success: false,
        error: "Recall Bot service not available"
      };
    }
    const _0x44f11c = await _0x5f5993.getSessionStats(_0x15ee4b);
    return {
      success: true,
      stats: _0x44f11c
    };
  } catch (_0x4308de) {
    logToFile("❌ Error getting Recall Bot stats: " + _0x4308de.message);
    return {
      success: false,
      error: _0x4308de.message
    };
  }
});
ipcMain.handle("whatsapp:delete-session", async (_0x20c1d6, _0x562e21) => {
  try {
    if (!appService) {
      return {
        success: false,
        message: "App service not available"
      };
    }
    const _0x44cb36 = appService.deleteWhatsAppSession(_0x562e21);
    const _0x30e85b = new Promise(_0x27639a => setTimeout(() => _0x27639a({
      success: false,
      message: "Delete operation timeout"
    }), 10000));
    const _0x2c0157 = await Promise.race([_0x44cb36, _0x30e85b]);
    return _0x2c0157;
  } catch (_0x4709f8) {
    logToFile("❌ Error deleting WhatsApp session: " + _0x4709f8.message);
    logToFile("❌ Error stack: " + _0x4709f8.stack);
    return {
      success: false,
      message: _0x4709f8.message
    };
  }
});
ipcMain.handle("whatsapp:get-session-status", async (_0x522688, _0x437446) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3113c0 = appService.getWhatsAppService();
    return _0x3113c0.getSessionStatus(_0x437446);
  } catch (_0x29e91f) {
    logToFile("❌ Error getting session status: " + _0x29e91f.message);
    return {
      success: false,
      error: _0x29e91f.message
    };
  }
});
ipcMain.handle("whatsapp:request-pairing-code", async (_0x19301e, _0x36ec9e, _0x10614) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    logToFile("🔢 Requesting pairing code for session: " + _0x36ec9e + ", phone: " + _0x10614);
    const _0x1ea4bb = await appService.requestPairingCode(_0x36ec9e, _0x10614);
    logToFile("🔢 Pairing code result:", _0x1ea4bb);
    return _0x1ea4bb;
  } catch (_0xe27132) {
    logToFile("❌ Error requesting pairing code: " + _0xe27132.message);
    return {
      success: false,
      error: _0xe27132.message,
      sessionId: _0x36ec9e,
      phoneNumber: _0x10614
    };
  }
});
ipcMain.handle("whatsapp:create-pairing-session", async (_0x2266c4, _0x4beb86) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    logToFile("🔢 Creating new pairing code session for phone: " + _0x4beb86);
    const _0x19d195 = await appService.createPairingCodeSession(_0x4beb86);
    logToFile("🔢 Pairing session creation result:", _0x19d195);
    return _0x19d195;
  } catch (_0x1a22d1) {
    logToFile("❌ Error creating pairing code session: " + _0x1a22d1.message);
    return {
      success: false,
      error: _0x1a22d1.message,
      phoneNumber: _0x4beb86
    };
  }
});
ipcMain.handle("whatsapp:send-template-message", async (_0x365cf5, _0x57e336, _0x4c4a2c, _0x4f8a1c, _0x9f3059) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xa04dab = appService.getWhatsAppService();
    const _0x7f770 = await _0xa04dab.sendTemplateMessage(_0x57e336, _0x4c4a2c, _0x4f8a1c, _0x9f3059);
    return _0x7f770;
  } catch (_0x47e1e7) {
    logToFile("❌ Error sending template message: " + _0x47e1e7.message);
    return {
      success: false,
      error: _0x47e1e7.message
    };
  }
});
ipcMain.handle("whatsapp:resolve-recipient", async (_0x19937d, _0x238da7, _0x548a2e) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1ccf58 = appService.getWhatsAppService();
    const _0x413f01 = _0x1ccf58._getRecipientResolver();
    const _0x180fa5 = await _0x413f01.resolveRecipient(_0x238da7, _0x548a2e);
    return {
      success: true,
      ..._0x180fa5
    };
  } catch (_0x112169) {
    logToFile("❌ Error resolving recipient: " + _0x112169.message);
    return {
      success: false,
      error: _0x112169.message
    };
  }
});
ipcMain.handle("whatsapp:get-username-for-jid", async (_0x55a84b, _0x52bf54, _0x41a9a0) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x44bd8c = appService.getWhatsAppService();
    const _0x2e86e4 = _0x44bd8c._getRecipientResolver();
    const _0x164c34 = await _0x2e86e4.getUsernameForJid(_0x52bf54, _0x41a9a0);
    return {
      success: true,
      ..._0x164c34
    };
  } catch (_0x4ff1e0) {
    logToFile("❌ Error getting username for JID: " + _0x4ff1e0.message);
    return {
      success: false,
      error: _0x4ff1e0.message
    };
  }
});
ipcMain.handle("templates:save-rich-message", async (_0x5b9233, _0xf3cf4e = {}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2a662d = appService.getDatabaseService();
    if (!_0x2a662d) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x49198f = require(resolveModulePath("services/rich-message.service"));
    const _0x408a7c = new _0x49198f({
      databaseService: _0x2a662d
    });
    const _0x3dd6ef = _0xf3cf4e.markdown ?? _0xf3cf4e.content;
    const _0x3d58b9 = _0x408a7c.validateContent(_0x3dd6ef);
    if (!_0x3d58b9.valid) {
      return {
        success: false,
        error: _0x3d58b9.reason
      };
    }
    const _0x313d03 = require(resolveModulePath("models/MessageTemplate"));
    _0x313d03.db = _0x2a662d;
    const _0x509c0c = new _0x313d03({
      id: _0xf3cf4e.id || null,
      name: _0xf3cf4e.name,
      category: _0xf3cf4e.category || "general",
      type: "rich_message",
      content: _0x3dd6ef,
      variables: _0xf3cf4e.variables,
      attachments: _0xf3cf4e.attachments
    });
    await _0x509c0c.save();
    const _0x5e9805 = _0x408a7c.buildRichMessageData(_0x3dd6ef, {
      linkPreview: _0xf3cf4e.linkPreview
    });
    const _0x3ea545 = await _0x408a7c.persistRichMessageData(_0x509c0c.id, _0x5e9805);
    if (_0x3ea545 && _0x3ea545.success === false) {
      return {
        success: false,
        error: _0x3ea545.error,
        id: _0x509c0c.id
      };
    }
    return {
      success: true,
      id: _0x509c0c.id
    };
  } catch (_0x1bf586) {
    logToFile("❌ Error saving rich-message template: " + _0x1bf586.message);
    return {
      success: false,
      error: _0x1bf586.message
    };
  }
});
ipcMain.handle("templates:save-carousel", async (_0x179b43, _0xf5d3e5 = {}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4cb925 = appService.getDatabaseService();
    if (!_0x4cb925) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x2b31d8 = require(resolveModulePath("models/MessageTemplate"));
    _0x2b31d8.db = _0x4cb925;
    const _0x22554a = Array.isArray(_0xf5d3e5.cards) ? _0xf5d3e5.cards : [];
    const _0x478b6b = _0x2b31d8.validateCarouselCards(_0x22554a);
    if (!_0x478b6b.valid) {
      return {
        success: false,
        error: _0x478b6b.error.message,
        cardIndex: _0x478b6b.error.cardIndex,
        limit: _0x478b6b.error.limit
      };
    }
    const _0x12aa79 = new _0x2b31d8({
      id: _0xf5d3e5.id || null,
      name: _0xf5d3e5.name,
      category: _0xf5d3e5.category || "general",
      type: "carousel",
      content: _0xf5d3e5.content,
      variables: _0xf5d3e5.variables,
      attachments: _0xf5d3e5.attachments
    });
    _0x12aa79.setCarouselCards(_0x22554a);
    if (_0xf5d3e5.settings !== undefined) {
      _0x12aa79.setCarouselSettings(_0xf5d3e5.settings);
    }
    if (_0xf5d3e5.cardExtras !== undefined) {
      _0x12aa79.setCarouselCardExtras(_0xf5d3e5.cardExtras);
    }
    await _0x12aa79.save();
    return {
      success: true,
      id: _0x12aa79.id
    };
  } catch (_0x2a7c72) {
    if (_0x2a7c72 && _0x2a7c72.name === "CarouselValidationError") {
      return {
        success: false,
        error: _0x2a7c72.message,
        cardIndex: _0x2a7c72.cardIndex,
        limit: _0x2a7c72.limit
      };
    }
    logToFile("❌ Error saving carousel template: " + _0x2a7c72.message);
    return {
      success: false,
      error: _0x2a7c72.message
    };
  }
});
ipcMain.handle("templates:save-link-preview", async (_0x342746, _0x55f3e1 = {}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x44e5eb = appService.getDatabaseService();
    if (!_0x44e5eb) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const {
      LinkPreviewService: _0x5abf2e
    } = require(resolveModulePath("services/link-preview.service"));
    const _0x1a689a = new _0x5abf2e();
    const _0x20193c = _0x55f3e1.custom ?? null;
    const _0x2cfb60 = _0x1a689a.validateCustomMetadata(_0x20193c);
    if (!_0x2cfb60.valid) {
      return {
        success: false,
        error: "Invalid link preview metadata: " + _0x2cfb60.field,
        field: _0x2cfb60.field
      };
    }
    const _0x280149 = require(resolveModulePath("models/MessageTemplate"));
    _0x280149.db = _0x44e5eb;
    const _0x5d3dfb = new _0x280149({
      id: _0x55f3e1.id || null,
      name: _0x55f3e1.name,
      category: _0x55f3e1.category || "general",
      type: _0x55f3e1.type || "text",
      content: _0x55f3e1.content,
      variables: _0x55f3e1.variables,
      attachments: _0x55f3e1.attachments
    });
    await _0x5d3dfb.save();
    const _0x4dd7be = {
      enabled: _0x55f3e1.enabled !== undefined ? !!_0x55f3e1.enabled : true
    };
    if (_0x20193c) {
      _0x4dd7be.custom = _0x20193c;
    }
    const _0x197752 = await _0x44e5eb.run("UPDATE message_templates SET link_preview_data = ? WHERE id = ?", [JSON.stringify(_0x4dd7be), _0x5d3dfb.id]);
    if (_0x197752 && _0x197752.success === false) {
      return {
        success: false,
        error: _0x197752.error || "Failed to persist link_preview_data",
        id: _0x5d3dfb.id
      };
    }
    return {
      success: true,
      id: _0x5d3dfb.id
    };
  } catch (_0xd79ad5) {
    logToFile("❌ Error saving link-preview template: " + _0xd79ad5.message);
    return {
      success: false,
      error: _0xd79ad5.message
    };
  }
});
ipcMain.handle("whatsapp:check-number", async (_0x43faec, _0x6fadf3, _0x54b1e7) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5c7b15 = appService.getWhatsAppService();
    return await _0x5c7b15.checkNumberExists(_0x6fadf3, _0x54b1e7);
  } catch (_0x55efa9) {
    logToFile("❌ Error checking number: " + _0x55efa9.message);
    return {
      success: false,
      error: _0x55efa9.message
    };
  }
});
ipcMain.handle("whatsapp:verify-number", async (_0x15cc71, _0x1dd057) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x95dda3 = appService.getWhatsAppService();
    return await _0x95dda3.verifyNumber(_0x1dd057);
  } catch (_0x4327fd) {
    logToFile("❌ Error verifying number: " + _0x4327fd.message);
    return {
      success: false,
      error: _0x4327fd.message
    };
  }
});
ipcMain.handle("whatsapp:verify-numbers-batch", async (_0x14f60c, _0x49962a) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5a4475 = appService.getWhatsAppService();
    const _0x235a40 = await _0x5a4475.verifyNumbersBatch(_0x49962a, (_0x8753dc, _0x17250e) => {
      _0x14f60c.sender.send("whatsapp:batch-verification-progress", {
        current: _0x8753dc,
        total: _0x17250e
      });
    });
    return {
      success: true,
      results: _0x235a40
    };
  } catch (_0x419324) {
    logToFile("❌ Error in batch verification: " + _0x419324.message);
    return {
      success: false,
      error: _0x419324.message
    };
  }
});
ipcMain.handle("whatsapp:get-chats", async (_0x50b9f7, _0x41e127) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x21eff3 = appService.getWhatsAppService();
    return await _0x21eff3.getChats(_0x41e127);
  } catch (_0x5362ff) {
    logToFile("❌ Error getting chats: " + _0x5362ff.message);
    return {
      success: false,
      error: _0x5362ff.message
    };
  }
});
ipcMain.handle("whatsapp:resolve-lid", async (_0x334032, _0x1a4a88, _0x3868a1) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1b1e1a = appService.getWhatsAppService();
    const _0x15abdb = await _0x1b1e1a.resolveLIDToPhone(_0x1a4a88, _0x3868a1);
    return {
      success: true,
      ..._0x15abdb
    };
  } catch (_0x389732) {
    logToFile("❌ Error resolving LID: " + _0x389732.message);
    return {
      success: false,
      error: _0x389732.message
    };
  }
});
ipcMain.handle("whatsapp:get-profile-picture", async (_0x3a1ee7, _0x6869c, _0x11919c) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4427d7 = appService.getWhatsAppService();
    return await _0x4427d7.getProfilePicture(_0x6869c, _0x11919c);
  } catch (_0x46e61c) {
    logToFile("❌ Error getting profile picture: " + _0x46e61c.message);
    return {
      success: false,
      error: _0x46e61c.message
    };
  }
});
ipcMain.handle("whatsapp:resolve-lids-batch", async (_0x54c415, _0x547852, _0x3dd86d) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3eac4e = appService.getWhatsAppService();
    const _0x4a3922 = await _0x3eac4e.resolveLIDsBatch(_0x547852, _0x3dd86d);
    return {
      success: true,
      results: _0x4a3922
    };
  } catch (_0x3f91ab) {
    logToFile("❌ Error resolving LIDs in batch: " + _0x3f91ab.message);
    return {
      success: false,
      error: _0x3f91ab.message
    };
  }
});
ipcMain.handle("whatsapp:trigger-outgoing-call", async (_0x337333, _0x135c76, _0x4fe0d1) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x24fc8b = appService.getWhatsAppService();
    return await _0x24fc8b.triggerOutgoingCallResponse(_0x135c76, _0x4fe0d1);
  } catch (_0x3e6b9f) {
    logToFile("❌ Error triggering outgoing call response: " + _0x3e6b9f.message);
    return {
      success: false,
      error: _0x3e6b9f.message
    };
  }
});
ipcMain.handle("whatsapp:get-chat-history", async (_0xa5df7c, _0x427085, _0x258b6a, _0x3ffe21) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xf1e776 = appService.getWhatsAppService();
    return await _0xf1e776.getChatHistory(_0x427085, _0x258b6a, _0x3ffe21);
  } catch (_0xb5ead3) {
    logToFile("❌ Error getting chat history: " + _0xb5ead3.message);
    return {
      success: false,
      error: _0xb5ead3.message
    };
  }
});
ipcMain.handle("whatsapp:mark-chat-as-read", async (_0x707dc5, _0x33c9cf, _0x1dd6fd) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x50ae20 = appService.getWhatsAppService();
    return await _0x50ae20.markChatAsRead(_0x33c9cf, _0x1dd6fd);
  } catch (_0x556bdc) {
    logToFile("❌ Error marking chat as read: " + _0x556bdc.message);
    return {
      success: false,
      error: _0x556bdc.message
    };
  }
});
ipcMain.handle("whatsapp:download-media", async (_0x38ffef, _0x3bc192, _0x11fd53) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3e1669 = appService.getWhatsAppService();
    return await _0x3e1669.downloadMedia(_0x3bc192, _0x11fd53);
  } catch (_0xf2abb1) {
    logToFile("❌ Error downloading media: " + _0xf2abb1.message);
    return {
      success: false,
      error: _0xf2abb1.message
    };
  }
});
ipcMain.handle("whatsapp:upload-media", async (_0xb1d74d, _0x5deda8) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x74e576 = appService.getWhatsAppService();
    return await _0x74e576.uploadMedia(_0x5deda8);
  } catch (_0x1747fa) {
    logToFile("❌ Error uploading media: " + _0x1747fa.message);
    return {
      success: false,
      error: _0x1747fa.message
    };
  }
});
ipcMain.handle("whatsapp:fetch-all-groups", async (_0x21af41, _0x5c23f3) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available",
        groups: []
      };
    }
    const _0x2d9caf = appService.getWhatsAppService();
    if (!_0x5c23f3 || _0x5c23f3 === "__all__") {
      const allSess = _0x2d9caf.getAllSessions ? _0x2d9caf.getAllSessions() : [];
      const conn = allSess.find(s => s.status === "connected" && s.isLoggedIn);
      _0x5c23f3 = conn?.sessionId || allSess[0]?.sessionId || _0x5c23f3;
    }
    return await _0x2d9caf.fetchAllGroups(_0x5c23f3);
  } catch (_0x3b9120) {
    logToFile("❌ Error fetching all groups: " + _0x3b9120.message);
    return {
      success: false,
      error: _0x3b9120.message,
      groups: []
    };
  }
});
ipcMain.handle("whatsapp:create-group", async (_0x14e444, _0xc2e7d4, _0x531984, _0x41b867, _0x299f42) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x36161e = appService.getWhatsAppService();
    return await _0x36161e.createGroup(_0xc2e7d4, _0x531984, _0x41b867, _0x299f42);
  } catch (_0x2b1b66) {
    logToFile("❌ Error creating group: " + _0x2b1b66.message);
    return {
      success: false,
      error: _0x2b1b66.message
    };
  }
});
ipcMain.handle("whatsapp:add-group-participants", async (_0x55df91, _0x540add, _0x12646b, _0x33c8cc) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xff6e71 = appService.getWhatsAppService();
    return await _0xff6e71.addGroupParticipants(_0x540add, _0x12646b, _0x33c8cc);
  } catch (_0x1c7b18) {
    logToFile("❌ Error adding group participants: " + _0x1c7b18.message);
    return {
      success: false,
      error: _0x1c7b18.message
    };
  }
});
ipcMain.handle("whatsapp:remove-group-participants", async (_0x3d3d95, _0x4935ea, _0x47b354, _0x238a5) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2e053d = appService.getWhatsAppService();
    return await _0x2e053d.removeGroupParticipants(_0x4935ea, _0x47b354, _0x238a5);
  } catch (_0x530abc) {
    logToFile("❌ Error removing group participants: " + _0x530abc.message);
    return {
      success: false,
      error: _0x530abc.message
    };
  }
});
ipcMain.handle("whatsapp:promote-group-participants", async (_0x5d9c13, _0x179036, _0x3a6823, _0x53fe4f) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2bb5c9 = appService.getWhatsAppService();
    return await _0x2bb5c9.promoteGroupParticipants(_0x179036, _0x3a6823, _0x53fe4f);
  } catch (_0x466c02) {
    logToFile("❌ Error promoting group participants: " + _0x466c02.message);
    return {
      success: false,
      error: _0x466c02.message
    };
  }
});
ipcMain.handle("whatsapp:demote-group-participants", async (_0xbb2c99, _0x1ef835, _0x3fcb9e, _0x127a54) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4685d6 = appService.getWhatsAppService();
    return await _0x4685d6.demoteGroupParticipants(_0x1ef835, _0x3fcb9e, _0x127a54);
  } catch (_0x3a9967) {
    logToFile("❌ Error demoting group participants: " + _0x3a9967.message);
    return {
      success: false,
      error: _0x3a9967.message
    };
  }
});
ipcMain.handle("whatsapp:update-group-subject", async (_0x5e898, _0x542151, _0x1b6d22, _0x40b486) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x47a26d = appService.getWhatsAppService();
    return await _0x47a26d.updateGroupSubject(_0x542151, _0x1b6d22, _0x40b486);
  } catch (_0x4416d7) {
    logToFile("❌ Error updating group subject: " + _0x4416d7.message);
    return {
      success: false,
      error: _0x4416d7.message
    };
  }
});
ipcMain.handle("whatsapp:update-group-description", async (_0x3c9e8c, _0x56d3f5, _0x2bc36e, _0x4699e6) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2d4a44 = appService.getWhatsAppService();
    return await _0x2d4a44.updateGroupDescription(_0x56d3f5, _0x2bc36e, _0x4699e6);
  } catch (_0x6228f8) {
    logToFile("❌ Error updating group description: " + _0x6228f8.message);
    return {
      success: false,
      error: _0x6228f8.message
    };
  }
});
ipcMain.handle("whatsapp:update-group-settings", async (_0x33dd2c, _0x4868a0, _0x21e901, _0x3ad437) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x36b437 = appService.getWhatsAppService();
    return await _0x36b437.updateGroupSettings(_0x4868a0, _0x21e901, _0x3ad437);
  } catch (_0x16031f) {
    logToFile("❌ Error updating group settings: " + _0x16031f.message);
    return {
      success: false,
      error: _0x16031f.message
    };
  }
});
ipcMain.handle("whatsapp:update-group-photo", async (_0x33df35, _0x5159e9, _0x49e88b, _0x411c03) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1ab20a = appService.getWhatsAppService();
    return await _0x1ab20a.updateGroupPhoto(_0x5159e9, _0x49e88b, _0x411c03);
  } catch (_0x43c67e) {
    logToFile("❌ Error updating group photo: " + _0x43c67e.message);
    return {
      success: false,
      error: _0x43c67e.message
    };
  }
});
ipcMain.handle("whatsapp:remove-group-photo", async (_0x47cae8, _0x4aa988, _0x19e32d) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x210544 = appService.getWhatsAppService();
    return await _0x210544.removeGroupPhoto(_0x4aa988, _0x19e32d);
  } catch (_0x458d0b) {
    logToFile("❌ Error removing group photo: " + _0x458d0b.message);
    return {
      success: false,
      error: _0x458d0b.message
    };
  }
});
ipcMain.handle("whatsapp:leave-group", async (_0x343653, _0x16c2d7, _0x8a2468) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x389c11 = appService.getWhatsAppService();
    return await _0x389c11.leaveGroup(_0x16c2d7, _0x8a2468);
  } catch (_0x41862c) {
    logToFile("❌ Error leaving group: " + _0x41862c.message);
    return {
      success: false,
      error: _0x41862c.message
    };
  }
});
ipcMain.handle("whatsapp:join-group-with-invite", async (_0x2a692f, _0x57b458, _0xb2056d) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3bebaf = appService.getWhatsAppService();
    return await _0x3bebaf.joinGroupWithInvite(_0x57b458, _0xb2056d);
  } catch (_0x1ccaf3) {
    logToFile("❌ Error joining group with invite: " + _0x1ccaf3.message);
    return {
      success: false,
      error: _0x1ccaf3.message
    };
  }
});
ipcMain.handle("whatsapp:revoke-group-invite", async (_0x3bbc7b, _0x19e55a, _0x5e4666) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4d1858 = appService.getWhatsAppService();
    return await _0x4d1858.revokeGroupInvite(_0x19e55a, _0x5e4666);
  } catch (_0x54b8c1) {
    logToFile("❌ Error revoking group invite: " + _0x54b8c1.message);
    return {
      success: false,
      error: _0x54b8c1.message
    };
  }
});
ipcMain.handle("whatsapp:send-group-message", async (_0x2ba4b3, _0x1a1fd5, _0x32d5d9, _0x202877, _0x48bf18, _0x27dc7c) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2b9bc4 = appService.getWhatsAppService();
    return await _0x2b9bc4.sendGroupMessage(_0x1a1fd5, _0x32d5d9, _0x202877, _0x48bf18, _0x27dc7c);
  } catch (_0x35c01f) {
    logToFile("❌ Error sending group message: " + _0x35c01f.message);
    return {
      success: false,
      error: _0x35c01f.message
    };
  }
});
ipcMain.handle("whatsapp:get-labels", async (_0x4665ec, _0x5b0ddd) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available",
        labels: []
      };
    }
    const _0xcc6a6d = appService.getWhatsAppService();
    const _0x38e8ed = await _0xcc6a6d.getLabels(_0x5b0ddd);
    return _0x38e8ed;
  } catch (_0x2e7f46) {
    console.error("❌ [IPC HANDLER] Error getting labels:", _0x2e7f46);
    logToFile("❌ Error getting labels: " + _0x2e7f46.message);
    return {
      success: false,
      error: _0x2e7f46.message,
      labels: []
    };
  }
});
ipcMain.handle("whatsapp:get-chats-by-label", async (_0x1860c1, _0x2af0a1, _0x31cd67) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available",
        contacts: []
      };
    }
    const _0x5bbf5e = appService.getWhatsAppService();
    return await _0x5bbf5e.getChatsByLabel(_0x2af0a1, _0x31cd67);
  } catch (_0x32ba7d) {
    logToFile("❌ Error getting chats by label: " + _0x32ba7d.message);
    return {
      success: false,
      error: _0x32ba7d.message,
      contacts: []
    };
  }
});
ipcMain.handle("whatsapp:block-contact", async (_0x59d1d2, _0x45e799, _0x13d3c0) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3f89c1 = appService.getWhatsAppService();
    return await _0x3f89c1.blockContact(_0x45e799, _0x13d3c0);
  } catch (_0x63bb37) {
    logToFile("❌ Error blocking contact: " + _0x63bb37.message);
    return {
      success: false,
      error: _0x63bb37.message
    };
  }
});
ipcMain.handle("whatsapp:unblock-contact", async (_0x5af7ee, _0x2c74da, _0x25e720) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5e5ca7 = appService.getWhatsAppService();
    return await _0x5e5ca7.unblockContact(_0x2c74da, _0x25e720);
  } catch (_0x3499d6) {
    logToFile("❌ Error unblocking contact: " + _0x3499d6.message);
    return {
      success: false,
      error: _0x3499d6.message
    };
  }
});
ipcMain.handle("whatsapp:comprehensive-block-contact", async (_0x454568, _0x52c6f1, _0x1f8f3b, _0xfcd829 = {}) => {
  try {
    logToFile("🚫 IPC: Comprehensive block request - Session: " + _0x52c6f1 + ", Contact: " + _0x1f8f3b);
    if (!appService) {
      logToFile("❌ App service not available for comprehensive blocking");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x17af0a = appService.getWhatsAppService();
    const _0x38b445 = await _0x17af0a.blockContactComprehensive(_0x52c6f1, _0x1f8f3b, _0xfcd829);
    logToFile("🚫 Comprehensive block result: " + JSON.stringify(_0x38b445));
    return _0x38b445;
  } catch (_0x52309) {
    const _0x59f4e3 = "❌ Error with comprehensive blocking: " + _0x52309.message;
    logToFile(_0x59f4e3);
    console.error(_0x59f4e3, _0x52309);
    return {
      success: false,
      error: _0x52309.message
    };
  }
});
ipcMain.handle("whatsapp:get-blocked-contacts", async (_0x51d814, _0x4f2624) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x393545 = appService.getWhatsAppService();
    return await _0x393545.getBlockedContacts(_0x4f2624);
  } catch (_0x2173ba) {
    logToFile("❌ Error getting blocked contacts: " + _0x2173ba.message);
    return {
      success: false,
      error: _0x2173ba.message
    };
  }
});
ipcMain.handle("whatsapp:bulk-update-groups", async (_0x27c619, _0x3fe3e8, _0x19be73) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x16adc0 = appService.getWhatsAppService();
    return await _0x16adc0.bulkUpdateGroups(_0x3fe3e8, _0x19be73);
  } catch (_0x44064c) {
    logToFile("❌ Error bulk updating groups: " + _0x44064c.message);
    return {
      success: false,
      error: _0x44064c.message
    };
  }
});
ipcMain.handle("whatsapp:bulk-update-group-photos", async (_0x34ea39, _0x4e25ec, _0x56572a) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x457c5b = appService.getWhatsAppService();
    return await _0x457c5b.bulkUpdateGroupPhotos(_0x4e25ec, _0x56572a);
  } catch (_0x7cf48e) {
    logToFile("❌ Error bulk updating group photos: " + _0x7cf48e.message);
    return {
      success: false,
      error: _0x7cf48e.message
    };
  }
});
ipcMain.handle("whatsapp:get-group-metadata", async (_0x472248, _0x28d137, _0x2011d5) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x140af3 = appService.getWhatsAppService();
    return await _0x140af3.getGroupMetadata(_0x28d137, _0x2011d5);
  } catch (_0x5ec8fd) {
    logToFile("❌ Error getting group metadata: " + _0x5ec8fd.message);
    return {
      success: false,
      error: _0x5ec8fd.message
    };
  }
});
ipcMain.handle("whatsapp:get-group-invite-code", async (_0x38dae6, _0x4b7d62, _0x548561) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x649318 = appService.getWhatsAppService();
    return await _0x649318.getGroupInviteCode(_0x4b7d62, _0x548561);
  } catch (_0x22b8c6) {
    logToFile("❌ Error getting group invite code: " + _0x22b8c6.message);
    return {
      success: false,
      error: _0x22b8c6.message
    };
  }
});
ipcMain.handle("whatsapp:get-group-info-by-invite", async (_0x580e33, _0x3a6541, _0x582aed) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1b62a8 = appService.getWhatsAppService();
    return await _0x1b62a8.getGroupInfoByInviteCode(_0x3a6541, _0x582aed);
  } catch (_0xa440a6) {
    logToFile("❌ Error getting group info by invite code: " + _0xa440a6.message);
    return {
      success: false,
      error: _0xa440a6.message
    };
  }
});
ipcMain.handle("whatsapp:debug-specific-poll", async (_0x55bf2d, _0x2dbed3, _0x1ce084) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x11cacf = appService.getWhatsAppService();
    await _0x11cacf.debugSpecificPoll(_0x2dbed3, _0x1ce084);
    return {
      success: true
    };
  } catch (_0x1743ea) {
    logToFile("❌ Error debugging specific poll: " + _0x1743ea.message);
    return {
      success: false,
      error: _0x1743ea.message
    };
  }
});
ipcMain.handle("whatsapp:scan-existing-polls", async (_0x4d5241, _0x2567e4) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x36caa0 = appService.getWhatsAppService();
    const _0x1269c6 = await _0x36caa0.scanForExistingPolls(_0x2567e4);
    return {
      success: true,
      pollsFound: _0x1269c6
    };
  } catch (_0x48d246) {
    logToFile("❌ Error scanning existing polls: " + _0x48d246.message);
    return {
      success: false,
      error: _0x48d246.message
    };
  }
});
ipcMain.handle("whatsapp:debug-database-polls", async _0x3a92c7 => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x15ad4f = appService.getWhatsAppService();
    await _0x15ad4f.debugDatabasePolls();
    return {
      success: true
    };
  } catch (_0x2b51ab) {
    logToFile("❌ Error debugging database polls: " + _0x2b51ab.message);
    return {
      success: false,
      error: _0x2b51ab.message
    };
  }
});
ipcMain.handle("whatsapp:force-check-poll-votes", async (_0x204cb5, _0xe8088b) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4516f3 = appService.getWhatsAppService();
    await _0x4516f3.forceCheckPollVotes(_0xe8088b);
    return {
      success: true
    };
  } catch (_0x1f6dc3) {
    logToFile("❌ Error force checking poll votes: " + _0x1f6dc3.message);
    return {
      success: false,
      error: _0x1f6dc3.message
    };
  }
});
ipcMain.handle("whatsapp:fix-poll-votes-directly", async _0xd4d8af => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x464537 = appService.getDatabaseService();
    if (!_0x464537) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    logToFile("🔧 DIRECT FIX: Starting direct poll vote fix...");
    const _0x2f80e6 = await _0x464537.query("\n      INSERT OR REPLACE INTO poll_votes (\n        poll_message_id, poll_option_id, voter_jid, vote_message_id,\n        voted_at, sender_timestamp_ms, is_valid\n      )\n      SELECT\n        pm.id as poll_message_id,\n        po.id as poll_option_id,\n        '918530613447@s.whatsapp.net' as voter_jid,\n        'direct_fix_' || pm.id as vote_message_id,\n        datetime('now') as voted_at,\n        strftime('%s', 'now') * 1000 as sender_timestamp_ms,\n        1 as is_valid\n      FROM poll_messages pm\n      JOIN poll_options po ON pm.id = po.poll_message_id\n      WHERE pm.poll_question = 'Brand Poll'\n        AND po.option_text = 'naji'\n    ", []);
    const _0x28e5de = await _0x464537.query("\n      INSERT OR REPLACE INTO poll_votes (\n        poll_message_id, poll_option_id, voter_jid, vote_message_id,\n        voted_at, sender_timestamp_ms, is_valid\n      )\n      SELECT\n        pm.id as poll_message_id,\n        po.id as poll_option_id,\n        '918530613447@s.whatsapp.net' as voter_jid,\n        'direct_fix_' || pm.id as vote_message_id,\n        datetime('now') as voted_at,\n        strftime('%s', 'now') * 1000 as sender_timestamp_ms,\n        1 as is_valid\n      FROM poll_messages pm\n      JOIN poll_options po ON pm.id = po.poll_message_id\n      WHERE pm.poll_question = 'New Testing Poll'\n        AND po.option_text = 'Bilkul'\n    ", []);
    logToFile("✅ DIRECT FIX: Poll votes fixed successfully");
    return {
      success: true,
      message: "Poll votes fixed directly",
      brandPollFixed: _0x2f80e6.success,
      newTestingPollFixed: _0x28e5de.success
    };
  } catch (_0xb3dcf1) {
    logToFile("❌ Error in direct poll vote fix: " + _0xb3dcf1.message);
    return {
      success: false,
      error: _0xb3dcf1.message
    };
  }
});
ipcMain.handle("db-query", async (_0x30cbd3, _0x205bf6, _0x43443c) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xd413b1 = appService.getDatabaseService();
    const _0x1da955 = await _0xd413b1.query(_0x205bf6, _0x43443c);
    return _0x1da955;
  } catch (_0x74ad42) {
    logToFile("❌ Database query error: " + _0x74ad42.message);
    return {
      success: false,
      error: _0x74ad42.message
    };
  }
});
ipcMain.handle("database:seed-test-sessions", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x25f091 = appService.getDatabaseService();
    if (!_0x25f091) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x512cda = ["Ahmed", "Sara", "Mohammed", "Fatima", "Ali", "Nour", "Omar", "Layla", "Hassan", "Maryam", "Khalid", "Amira", "Tariq", "Hana", "Yusuf", "Rania", "Bilal", "Dina", "Karim", "Lina", "Ziad", "Noura", "Faris", "Salma", "Adel", "Maya", "Walid", "Rana", "Samir", "Nadia"];
    const _0x258c04 = ["Abdullah", "Hassan", "Ali", "Mohamed", "Ahmed", "Ibrahim", "Khalil", "Mansour", "Nasser", "Saleh", "Hamdan", "Rashid", "Yousef", "Karimi", "Badawi", "Ghani", "Latif", "Rahim", "Farouq", "Jabir"];
    const _0x160883 = ["iPhone 15 Pro", "Samsung Galaxy S24", "Google Pixel 8", "OnePlus 12", "Xiaomi 14", "iPhone 14", "Huawei P60", "Oppo Find X7", "Vivo X100", "Realme GT5"];
    const _0x2586fe = ["1", "44", "966", "971", "20", "962", "965", "968", "973", "974"];
    const _0x3f666e = _0x1fb3cd => _0x1fb3cd[Math.floor(Math.random() * _0x1fb3cd.length)];
    const _0x4dec91 = () => require("crypto").randomBytes(8).toString("hex");
    const _0x249b38 = () => _0x3f666e(_0x2586fe) + String(Math.floor(1000000000 + Math.random() * 9000000000));
    const _0xae4f79 = new Date().toISOString();
    let _0x378911 = 0;
    let _0x2e20d4 = 0;
    for (let _0x2bb3f4 = 1; _0x2bb3f4 <= 100; _0x2bb3f4++) {
      const _0x2699d6 = _0x3f666e(_0x512cda) + " " + _0x3f666e(_0x258c04);
      const _0x5e8352 = _0x3f666e(_0x160883) + " #" + _0x2bb3f4;
      const _0x4a75b9 = "test_" + _0x4dec91();
      const _0x14d690 = _0x249b38();
      const _0xbff609 = Math.random() < 0.3 ? "connected" : "disconnected";
      const _0x2a0aa7 = _0xbff609 === "connected" ? _0xae4f79 : null;
      const _0x271e0f = await _0x25f091.query("INSERT INTO whatsapp_sessions\n           (session_id, name, device_name, phone_number, status, is_active, connected_at, created_at, updated_at)\n         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)", [_0x4a75b9, "Test Device " + _0x2bb3f4 + " - " + _0x2699d6, _0x5e8352, _0x14d690, _0xbff609, _0x2a0aa7, _0xae4f79, _0xae4f79]);
      if (_0x271e0f && _0x271e0f.success) {
        _0x378911++;
      } else {
        _0x2e20d4++;
      }
    }
    logToFile("✅ Seeded " + _0x378911 + " test sessions (" + _0x2e20d4 + " failed)");
    return {
      success: true,
      inserted: _0x378911,
      failed: _0x2e20d4
    };
  } catch (_0x34d3e4) {
    logToFile("❌ Seed test sessions error: " + _0x34d3e4.message);
    return {
      success: false,
      error: _0x34d3e4.message
    };
  }
});
function loadOptOutService() {
  const _0x166e67 = ["./services/opt-out.service", "../services/opt-out.service", path.join(__dirname, "services/opt-out.service"), path.join(__dirname, "../services/opt-out.service")];
  for (const _0x4933b5 of _0x166e67) {
    try {
      const _0x376312 = require.resolve(_0x4933b5);
      delete require.cache[_0x376312];
      return require(_0x4933b5);
    } catch (_0x5c3fd8) {}
  }
  throw new Error("Cannot find module opt-out.service in any of the expected paths");
}
ipcMain.handle("optOut:isOptedOut", async (_0x21fb9e, _0x11cbad, _0x75e35f) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2c7323 = appService.getDatabaseService();
    if (!_0x2c7323 || !_0x2c7323.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x1bd450 = loadOptOutService();
    const _0x10e1d8 = new _0x1bd450(_0x2c7323);
    const _0xa1808b = await _0x10e1d8.isOptedOut(_0x11cbad, _0x75e35f);
    return {
      success: true,
      ..._0xa1808b
    };
  } catch (_0x543c2d) {
    logToFile("❌ Opt-out check error: " + _0x543c2d.message);
    return {
      success: false,
      error: _0x543c2d.message
    };
  }
});
ipcMain.handle("optOut:optOut", async (_0xec0c6c, _0x3b7b14, _0x115e59) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1d55d9 = appService.getDatabaseService();
    if (!_0x1d55d9 || !_0x1d55d9.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0xe7d279 = loadOptOutService();
    const _0xc65e10 = new _0xe7d279(_0x1d55d9);
    const _0x34d2d0 = await _0xc65e10.optOut(_0x3b7b14, _0x115e59);
    return _0x34d2d0;
  } catch (_0x18869b) {
    logToFile("❌ Opt-out error: " + _0x18869b.message);
    return {
      success: false,
      error: _0x18869b.message
    };
  }
});
ipcMain.handle("optOut:optIn", async (_0x4c682a, _0x446e4f, _0x3dcbc2) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1b12fd = appService.getDatabaseService();
    if (!_0x1b12fd || !_0x1b12fd.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x2f9c73 = loadOptOutService();
    const _0x4897ea = new _0x2f9c73(_0x1b12fd);
    const _0x41be4d = await _0x4897ea.optIn(_0x446e4f, _0x3dcbc2);
    return _0x41be4d;
  } catch (_0x48ebf6) {
    logToFile("❌ Opt-in error: " + _0x48ebf6.message);
    return {
      success: false,
      error: _0x48ebf6.message
    };
  }
});
ipcMain.handle("optOut:deleteOptOuts", async (_0x22ab12, _0x11b623) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1343f6 = appService.getDatabaseService();
    if (!_0x1343f6 || !_0x1343f6.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x5e4c37 = loadOptOutService();
    const _0xc978c3 = new _0x5e4c37(_0x1343f6);
    const _0xebb406 = await _0xc978c3.deleteOptOuts(_0x11b623);
    return _0xebb406;
  } catch (_0x246871) {
    logToFile("❌ Delete opt-outs error: " + _0x246871.message);
    return {
      success: false,
      error: _0x246871.message
    };
  }
});
ipcMain.handle("optOut:filterContactsForBulkMessaging", async (_0x31634e, _0x5f2329, _0x1438e2) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x44a6c8 = appService.getDatabaseService();
    if (!_0x44a6c8 || !_0x44a6c8.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x3def7f = loadOptOutService();
    const _0x3da9b9 = new _0x3def7f(_0x44a6c8);
    const _0x231e7f = await _0x3da9b9.filterContactsForBulkMessaging(_0x5f2329, _0x1438e2);
    return {
      success: true,
      ..._0x231e7f
    };
  } catch (_0x947280) {
    logToFile("❌ Contact filtering error: " + _0x947280.message);
    return {
      success: false,
      error: _0x947280.message
    };
  }
});
ipcMain.handle("optOut:getOptedOutContacts", async (_0x2ab930, _0x1b3d3e) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4ec233 = appService.getDatabaseService();
    if (!_0x4ec233 || !_0x4ec233.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x30e08a = loadOptOutService();
    const _0x47e0ec = new _0x30e08a(_0x4ec233);
    const _0x109b67 = await _0x47e0ec.getOptedOutContacts(_0x1b3d3e);
    return {
      success: true,
      contacts: _0x109b67
    };
  } catch (_0x44988e) {
    logToFile("❌ Get opted-out contacts error: " + _0x44988e.message);
    return {
      success: false,
      error: _0x44988e.message
    };
  }
});
ipcMain.handle("optOut:getStatistics", async (_0x3eb54b, _0x3713df) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3d8264 = appService.getDatabaseService();
    if (!_0x3d8264 || !_0x3d8264.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x5aa4ad = loadOptOutService();
    const _0x556a6f = new _0x5aa4ad(_0x3d8264);
    const _0x5afaa7 = await _0x556a6f.getOptOutStatistics(_0x3713df);
    return {
      success: true,
      stats: _0x5afaa7
    };
  } catch (_0x5d337a) {
    logToFile("❌ Get opt-out statistics error: " + _0x5d337a.message);
    return {
      success: false,
      error: _0x5d337a.message
    };
  }
});
ipcMain.handle("optOut:getComplianceReport", async (_0x2867d9, _0x2f6e06) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x425ccd = appService.getDatabaseService();
    if (!_0x425ccd || !_0x425ccd.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x393919 = loadOptOutService();
    const _0x3567ed = new _0x393919();
    const _0x3c8949 = await _0x3567ed.getComplianceReport(_0x2f6e06);
    return {
      success: true,
      report: _0x3c8949
    };
  } catch (_0x1d9ba4) {
    logToFile("❌ Get compliance report error: " + _0x1d9ba4.message);
    return {
      success: false,
      error: _0x1d9ba4.message
    };
  }
});
ipcMain.handle("optOut:getAutoResponseMessages", async _0x1301e7 => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x26df90 = appService.getDatabaseService();
    if (!_0x26df90 || !_0x26df90.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x120a9f = loadOptOutService();
    const _0x14d986 = new _0x120a9f(_0x26df90);
    const _0xa53a1 = await _0x14d986.getAutoResponseMessages();
    return _0xa53a1;
  } catch (_0x47d0e6) {
    logToFile("❌ Get auto-response messages error: " + _0x47d0e6.message);
    return {
      success: false,
      error: _0x47d0e6.message
    };
  }
});
ipcMain.handle("optOut:updateAutoResponseMessages", async (_0x3c74a5, _0x3ac2e9) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x265a73 = appService.getDatabaseService();
    if (!_0x265a73 || !_0x265a73.db) {
      return {
        success: false,
        error: "Database not available"
      };
    }
    const _0x7373d2 = loadOptOutService();
    const _0x543d92 = new _0x7373d2(_0x265a73);
    const _0x173bad = await _0x543d92.updateAutoResponseMessages(_0x3ac2e9);
    return _0x173bad;
  } catch (_0x421074) {
    logToFile("❌ Update auto-response messages error: " + _0x421074.message);
    return {
      success: false,
      error: _0x421074.message
    };
  }
});
ipcMain.handle("campaign-scheduler:get-status", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x317b84 = appService.getCampaignScheduler();
    return {
      success: true,
      status: _0x317b84.getStatus()
    };
  } catch (_0x941363) {
    logToFile("❌ Campaign scheduler status error: " + _0x941363.message);
    return {
      success: false,
      error: _0x941363.message
    };
  }
});
ipcMain.handle("campaign-scheduler:trigger-check", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x128651 = appService.getCampaignScheduler();
    await _0x128651.triggerCheck();
    return {
      success: true
    };
  } catch (_0x378779) {
    logToFile("❌ Campaign scheduler trigger error: " + _0x378779.message);
    return {
      success: false,
      error: _0x378779.message
    };
  }
});
ipcMain.handle("campaign-scheduler:start-campaign", async (_0x386d87, _0x642ab4) => {
  try {
    logToFile("🚀 IPC: Starting campaign " + _0x642ab4);
    if (!appService) {
      logToFile("❌ IPC: App service not available");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4ebb62 = appService.getCampaignScheduler();
    logToFile("🔧 IPC: Got scheduler, calling processCampaign(" + _0x642ab4 + ")");
    logToFile("🔍 IPC: Scheduler type: " + _0x4ebb62.constructor.name);
    logToFile("🔍 IPC: About to call processCampaign with ID: " + _0x642ab4);
    await _0x4ebb62.processCampaign(_0x642ab4);
    logToFile("✅ IPC: Campaign " + _0x642ab4 + " processed successfully");
    return {
      success: true
    };
  } catch (_0x1add75) {
    logToFile("❌ Campaign start error: " + _0x1add75.message);
    logToFile("❌ Campaign start error stack: " + _0x1add75.stack);
    return {
      success: false,
      error: _0x1add75.message
    };
  }
});
ipcMain.handle("campaign-scheduler:stop-all-campaigns", async () => {
  try {
    logToFile("🛑 IPC: Stopping all campaigns");
    if (!appService) {
      logToFile("❌ IPC: App service not available");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4155d5 = appService.getCampaignScheduler();
    const _0x2b40a0 = await _0x4155d5.stopAllCampaigns();
    logToFile("✅ IPC: Stopped " + (_0x2b40a0.stoppedCount || 0) + " campaigns");
    return _0x2b40a0;
  } catch (_0x2d65af) {
    logToFile("❌ Stop all campaigns error: " + _0x2d65af.message);
    return {
      success: false,
      error: _0x2d65af.message
    };
  }
});
ipcMain.handle("app-stats", async _0xfc2705 => {
  try {
    console.log("📊📊📊 [STATS] app-stats IPC handler called");
    if (!appService) {
      console.log("❌❌❌ [STATS] App service not available!");
      return {
        success: false,
        error: "App service not available"
      };
    }
    console.log("📊📊📊 [STATS] Getting stats from appService...");
    const _0xa42776 = await appService.getStats();
    console.log("📊📊📊 [STATS] Stats retrieved:", JSON.stringify(_0xa42776, null, 2));
    return {
      success: true,
      data: _0xa42776
    };
  } catch (_0x9e2753) {
    console.error("❌❌❌ [STATS] Stats retrieval error:", _0x9e2753);
    logToFile("❌ Stats retrieval error: " + _0x9e2753.message);
    return {
      success: false,
      error: _0x9e2753.message
    };
  }
});
ipcMain.handle("app-recent-activities", async (_0x496399, _0xc9bf1e) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x406def = await appService.getRecentActivities(_0xc9bf1e);
    return {
      success: true,
      data: _0x406def
    };
  } catch (_0x1fa42d) {
    logToFile("❌ Recent activities retrieval error: " + _0x1fa42d.message);
    return {
      success: false,
      error: _0x1fa42d.message
    };
  }
});
ipcMain.handle("app-health", async _0xea25e3 => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4ca761 = await appService.getHealthCheck();
    return {
      success: true,
      data: _0x4ca761
    };
  } catch (_0x5e6c4f) {
    logToFile("❌ Health check error: " + _0x5e6c4f.message);
    return {
      success: false,
      error: _0x5e6c4f.message
    };
  }
});
ipcMain.handle("fs-read-file", async (_0x25f3f7, _0x7766ee) => {
  try {
    const _0x2d3093 = await fs.promises.readFile(_0x7766ee, "utf8");
    return {
      success: true,
      data: _0x2d3093
    };
  } catch (_0x18f0b1) {
    logToFile("❌ Error reading file: " + _0x18f0b1.message);
    return {
      success: false,
      error: _0x18f0b1.message
    };
  }
});
ipcMain.handle("fs-write-file", async (_0x280d6c, _0x1015e8, _0x5a9c82) => {
  try {
    await fs.promises.writeFile(_0x1015e8, _0x5a9c82, "utf8");
    return {
      success: true
    };
  } catch (_0x2b8f37) {
    logToFile("❌ Error writing file: " + _0x2b8f37.message);
    return {
      success: false,
      error: _0x2b8f37.message
    };
  }
});
ipcMain.handle("app:get-sample-file", async (_0x31b3e9, _0x4e6d90) => {
  try {
    const _0x22123e = [path.join(__dirname, "sample-files", _0x4e6d90), path.join(__dirname, "../../public/sample-files", _0x4e6d90), path.join(__dirname, "../../build/sample-files", _0x4e6d90), path.join(app.getAppPath(), "build", "sample-files", _0x4e6d90), path.join(app.getAppPath(), "sample-files", _0x4e6d90)];
    let _0x3adbf8 = null;
    for (const _0x19713a of _0x22123e) {
      if (fs.existsSync(_0x19713a)) {
        _0x3adbf8 = _0x19713a;
        break;
      }
    }
    if (!_0x3adbf8) {
      logToFile("⚠️ Sample file not found: " + _0x4e6d90 + ". Searched: " + _0x22123e.join(", "));
      return {
        success: false,
        error: "Sample file not found: " + _0x4e6d90
      };
    }
    const _0x279cd5 = fs.readFileSync(_0x3adbf8);
    const _0x22e490 = path.extname(_0x4e6d90).toLowerCase().slice(1);
    const _0x3450cf = {
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      wav: "audio/wav",
      ogg: "audio/ogg"
    };
    const _0x4eb23a = _0x3450cf[_0x22e490] || "application/octet-stream";
    const _0xe9a4ca = _0x279cd5.toString("base64");
    return {
      success: true,
      data: "data:" + _0x4eb23a + ";base64," + _0xe9a4ca,
      name: _0x4e6d90,
      mimeType: _0x4eb23a,
      size: _0x279cd5.length
    };
  } catch (_0x28c9d8) {
    logToFile("❌ Error reading sample file " + _0x4e6d90 + ": " + _0x28c9d8.message);
    return {
      success: false,
      error: _0x28c9d8.message
    };
  }
});
ipcMain.handle("shell-open-external", async (_0x4a6336, _0x1096e4) => {
  try {
    await shell.openExternal(_0x1096e4);
    return {
      success: true
    };
  } catch (_0x185d7c) {
    logToFile("❌ Error opening external URL: " + _0x185d7c.message);
    return {
      success: false,
      error: _0x185d7c.message
    };
  }
});
let notificationService = null;
let lastNotificationCheck = null;
class NotificationService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.lastCheck = new Date().toISOString();
    this.processedNotifications = new Set();
  }
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.checkForNotifications();
    this.checkInterval = setInterval(() => {
      this.checkForNotifications();
    }, 300000);
  }
  stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logToFile("🔔 Notification service stopped");
  }
  async checkForNotifications() {
    try {
      this.lastCheck = new Date().toISOString();
    } catch (_0x56b26e) {
      logToFile("❌ Error in notification service: " + _0x56b26e.message);
    }
  }
}
class BackgroundLicenseValidator {
  constructor() {
    this.isRunning = false;
    this.validationInterval = null;
    this.lastValidation = new Date().toISOString();
  }
  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.validateLicense();
    this.validationInterval = setInterval(() => {
      this.validateLicense();
    }, 900000);
  }
  stop() {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
    logToFile("🔐 Background license validator stopped");
  }
  async validateLicense() {
    try {
      this.lastValidation = new Date().toISOString();
      const _0x13628c = getAppDataPath();
      const _0xf04eca = path.join(_0x13628c, "license.json");
      let _0x4eeb27;
      try {
        _0x4eeb27 = await fs.promises.readFile(_0xf04eca, "utf8");
      } catch (_0x939174) {
        if (_0x939174.code === "ENOENT") {
          return;
        }
        throw _0x939174;
      }
      const _0x2c0e98 = JSON.parse(_0x4eeb27);
      if (!verifyLicenseIntegrity(_0x2c0e98)) {
        logToFile("🔐 Background license validation failed: License file integrity check failed");
        await fs.promises.unlink(_0xf04eca).catch(() => {});
        this.handleValidationFailure({
          success: false,
          message: "License file has been corrupted or tampered with",
          error_code: "LICENSE_TAMPERED"
        });
        return;
      }
      if (_0x2c0e98.expires_at) {
        const _0x4efb0d = new Date(_0x2c0e98.expires_at);
        const _0x4a54c9 = new Date();
        if (_0x4a54c9 > _0x4efb0d) {
          logToFile("🔐 Background license validation failed: License expired on " + _0x4efb0d.toISOString());
          this.handleValidationFailure({
            success: false,
            message: "License has expired",
            error_code: "LICENSE_EXPIRED"
          });
          return;
        }
        _0x2c0e98.last_validated = new Date().toISOString();
        addLicenseSignature(_0x2c0e98);
        await fs.promises.writeFile(_0xf04eca, JSON.stringify(_0x2c0e98, null, 2));
      } else {
        logToFile("🔐 Background license validation failed: Missing expiry date");
        this.handleValidationFailure({
          success: false,
          message: "Invalid license data - missing expiry date",
          error_code: "INVALID_LICENSE_DATA"
        });
      }
    } catch (_0x2d7ec7) {
      logToFile("🔐 Background license validation error: " + _0x2d7ec7.message);
    }
  }
  handleValidationFailure(_0x1cebb1) {
    const _0x4ef97b = _0x1cebb1.error_code || "";
    const _0x3f4d1b = _0x1cebb1.message || _0x1cebb1.error || "Unknown license error";
    logToFile("🚨 License validation failure detected: " + _0x4ef97b + " - " + _0x3f4d1b);
    if (_0x4ef97b === "LICENSE_EXPIRED" || _0x3f4d1b.toLowerCase().includes("expired")) {
      logToFile("🚨 License has expired - showing renewal window");
      this.showLicenseRenewalWindow("Your license has expired. Please enter a new license key to continue.");
    } else if (_0x4ef97b === "LICENSE_NOT_FOUND") {
      logToFile("🚨 License not found - showing renewal window");
      this.showLicenseRenewalWindow("Your license is no longer valid. Please enter a new license key to continue.");
    } else if (_0x4ef97b === "LICENSE_SUSPENDED" || _0x4ef97b === "SUSPENDED") {
      logToFile("🚨 License has been suspended - initiating app shutdown");
      this.showExpiryDialogAndExit("Your license has been suspended. Please contact your administrator.");
    } else if (_0x4ef97b === "LICENSE_REVOKED") {
      logToFile("🚨 License has been revoked - initiating app shutdown");
      this.showExpiryDialogAndExit("Your license has been revoked. Please contact your administrator.");
    } else if (_0x4ef97b === "LICENSE_INACTIVE") {
      logToFile("🚨 License is inactive - initiating app shutdown");
      this.showExpiryDialogAndExit("Your license is inactive. The application will now close.");
    } else if (_0x4ef97b === "INVALID_FORMAT") {
      logToFile("🚨 Invalid license format - initiating app shutdown");
      this.showExpiryDialogAndExit("Your license is invalid. The application will now close.");
    } else {
      logToFile("🔐 License validation failed but not critical: " + _0x4ef97b + " - " + _0x3f4d1b);
    }
  }
  showLicenseRenewalWindow(_0xd315d0) {
    logToFile("🔄 Showing license renewal window");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("license-expired", {
        message: _0xd315d0
      });
    }
  }
  showExpiryDialogAndExit(_0x447993) {
    const {
      dialog: _0x55ea68
    } = require("electron");
    _0x55ea68.showErrorBox("License Issue", _0x447993);
    logToFile("🚨 Application shutting down due to license issue");
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastValidation: this.lastValidation
    };
  }
}
notificationService = new NotificationService();
backgroundLicenseValidator = new BackgroundLicenseValidator();
let cloudLicenseService = null;
try {
  cloudLicenseService = require("../services/cloud-license-service");
} catch (_0x28bee7) {
  try {
    cloudLicenseService = require("./services/cloud-license-service");
  } catch (_0x20607a) {
    logToFile("⚠️ Cloud license service not available: " + _0x28bee7.message);
  }
}
ipcMain.handle("notifications:get-notifications", async _0x3a323e => {
  try {
    return {
      success: true,
      data: {
        notifications: []
      },
      message: "Running in offline mode"
    };
  } catch (_0xc407a1) {
    logToFile("❌ Error in notifications: " + _0xc407a1.message);
    return {
      success: false,
      error: _0xc407a1.message
    };
  }
});
ipcMain.handle("notifications:get-latest", async (_0x265765, _0x16f95c) => {
  try {
    return {
      success: true,
      data: {
        notifications: []
      },
      message: "Running in offline mode"
    };
  } catch (_0x56c8cc) {
    logToFile("❌ Error in latest notifications: " + _0x56c8cc.message);
    return {
      success: false,
      error: _0x56c8cc.message
    };
  }
});
ipcMain.handle("notifications:mark-as-read", async (_0x356ac4, _0x14126b) => {
  try {
    logToFile("🔔 Mark as read running in offline mode for notification: " + _0x14126b);
    return {
      success: true,
      message: "Running in offline mode"
    };
  } catch (_0x4d5ae9) {
    logToFile("❌ Error in mark as read: " + _0x4d5ae9.message);
    return {
      success: false,
      error: _0x4d5ae9.message
    };
  }
});
ipcMain.handle("notifications:get-stats", async _0x13a698 => {
  try {
    logToFile("🔔 Notification stats running in offline mode");
    return {
      success: true,
      data: {
        total: 0,
        unread: 0,
        read: 0
      },
      message: "Running in offline mode"
    };
  } catch (_0x156251) {
    logToFile("❌ Error in notification stats: " + _0x156251.message);
    return {
      success: false,
      error: _0x156251.message
    };
  }
});
ipcMain.handle("ai-providers:get-all", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3da882 = appService.getDatabaseService();
    if (!_0x3da882) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x4955f5 = await _0x3da882.query("SELECT * FROM ai_providers WHERE is_active = 1 ORDER BY created_at DESC");
    return _0x4955f5;
  } catch (_0x142028) {
    logToFile("❌ AI Providers get error: " + _0x142028.message);
    return {
      success: false,
      error: _0x142028.message
    };
  }
});
ipcMain.handle("ai-providers:create", async (_0x525d6a, _0x5be10a) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xd0bf2e = appService.getDatabaseService();
    if (!_0xd0bf2e) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x23b383 = await _0xd0bf2e.query("\n      INSERT INTO ai_providers (\n        name, type, api_key, model, temperature, max_tokens,\n        is_active, created_at, updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n    ", [_0x5be10a.name, _0x5be10a.type, _0x5be10a.apiKey, _0x5be10a.model, _0x5be10a.temperature, _0x5be10a.maxTokens, _0x5be10a.isActive ? 1 : 0]);
    return {
      success: true,
      data: {
        id: _0x23b383.lastID
      }
    };
  } catch (_0x1b18ea) {
    logToFile("❌ AI Provider create error: " + _0x1b18ea.message);
    return {
      success: false,
      error: _0x1b18ea.message
    };
  }
});
ipcMain.handle("ai-providers:update", async (_0x3972dd, _0x70b202, _0x4efddd) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x44e357 = appService.getDatabaseService();
    if (!_0x44e357) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    await _0x44e357.query("\n      UPDATE ai_providers SET\n        name = ?, type = ?, api_key = ?, model = ?,\n        temperature = ?, max_tokens = ?, is_active = ?,\n        updated_at = CURRENT_TIMESTAMP\n      WHERE id = ?\n    ", [_0x4efddd.name, _0x4efddd.type, _0x4efddd.apiKey, _0x4efddd.model, _0x4efddd.temperature, _0x4efddd.maxTokens, _0x4efddd.isActive ? 1 : 0, _0x70b202]);
    return {
      success: true
    };
  } catch (_0x2303da) {
    logToFile("❌ AI Provider update error: " + _0x2303da.message);
    return {
      success: false,
      error: _0x2303da.message
    };
  }
});
ipcMain.handle("ai-providers:delete", async (_0x492e9f, _0x2ab331) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x16d402 = appService.getDatabaseService();
    if (!_0x16d402) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x3ce5c0 = await _0x16d402.query("SELECT COUNT(*) as count FROM ai_chatbots WHERE provider_id = ?", [_0x2ab331]);
    if (!_0x3ce5c0.success) {
      return {
        success: false,
        error: "Failed to check chatbot dependencies"
      };
    }
    const _0x3b00a7 = _0x3ce5c0.data;
    if (_0x3b00a7 && _0x3b00a7.length > 0 && _0x3b00a7[0].count > 0) {
      return {
        success: false,
        error: "Cannot delete provider - it is being used by chatbots"
      };
    }
    await _0x16d402.query("DELETE FROM ai_providers WHERE id = ?", [_0x2ab331]);
    return {
      success: true
    };
  } catch (_0x2eac71) {
    logToFile("❌ AI Provider delete error: " + _0x2eac71.message);
    return {
      success: false,
      error: _0x2eac71.message
    };
  }
});
ipcMain.handle("ai-chatbots:get-all", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2171eb = appService.getDatabaseService();
    if (!_0x2171eb) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x397b30 = await _0x2171eb.query("\n      SELECT c.*, p.name as provider_name, p.type as provider_type\n      FROM ai_chatbots c\n      LEFT JOIN ai_providers p ON c.provider_id = p.id\n      ORDER BY c.created_at DESC\n    ");
    return _0x397b30;
  } catch (_0x5e9d9e) {
    logToFile("❌ AI Chatbots get error: " + _0x5e9d9e.message);
    return {
      success: false,
      error: _0x5e9d9e.message
    };
  }
});
ipcMain.handle("ai-chatbots:create", async (_0x4253fa, _0x9c9b16) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3f1507 = appService.getDatabaseService();
    if (!_0x3f1507) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x57fbbf = await _0x3f1507.query("\n      INSERT INTO ai_chatbots (\n        name, description, provider_id, system_prompt, language,\n        personality, industry, session_ids, trigger_keywords, stop_keywords, use_documents, is_active, created_at, updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\n    ", [_0x9c9b16.name, _0x9c9b16.description, _0x9c9b16.providerId, _0x9c9b16.systemPrompt, _0x9c9b16.language || "en", _0x9c9b16.personality, _0x9c9b16.industry, JSON.stringify(_0x9c9b16.sessionIds || []), JSON.stringify(_0x9c9b16.triggerKeywords || []), JSON.stringify(_0x9c9b16.stopKeywords || []), _0x9c9b16.useDocuments ? 1 : 0, _0x9c9b16.isActive ? 1 : 0]);
    return {
      success: true,
      data: {
        id: _0x57fbbf.lastID
      }
    };
  } catch (_0x5dfb04) {
    logToFile("❌ AI Chatbot create error: " + _0x5dfb04.message);
    return {
      success: false,
      error: _0x5dfb04.message
    };
  }
});
ipcMain.handle("ai-chatbots:update", async (_0x291e60, _0x3ad8e5, _0x1aebd6) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x531646 = appService.getDatabaseService();
    if (!_0x531646) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    await _0x531646.query("\n      UPDATE ai_chatbots SET\n        name = ?, description = ?, provider_id = ?, system_prompt = ?,\n        language = ?, personality = ?, industry = ?, session_ids = ?, trigger_keywords = ?,\n        stop_keywords = ?, use_documents = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP\n      WHERE id = ?\n    ", [_0x1aebd6.name, _0x1aebd6.description, _0x1aebd6.providerId, _0x1aebd6.systemPrompt, _0x1aebd6.language || "en", _0x1aebd6.personality, _0x1aebd6.industry, JSON.stringify(_0x1aebd6.sessionIds || []), JSON.stringify(_0x1aebd6.triggerKeywords || []), JSON.stringify(_0x1aebd6.stopKeywords || []), _0x1aebd6.useDocuments ? 1 : 0, _0x1aebd6.isActive ? 1 : 0, _0x3ad8e5]);
    return {
      success: true
    };
  } catch (_0x4b4ab4) {
    logToFile("❌ AI Chatbot update error: " + _0x4b4ab4.message);
    return {
      success: false,
      error: _0x4b4ab4.message
    };
  }
});
ipcMain.handle("ai-chatbots:delete", async (_0x554c90, _0x526796) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5a1ec5 = appService.getDatabaseService();
    if (!_0x5a1ec5) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    logToFile("🗑️ Deleting AI chatbot with ID: " + _0x526796);
    const _0x409532 = await _0x5a1ec5.query("UPDATE ai_conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE chatbot_id = ? AND status = ?", ["completed", _0x526796, "active"]);
    logToFile("🗑️ Ended " + (_0x409532.changes || 0) + " active conversations for chatbot " + _0x526796);
    await _0x5a1ec5.query("DELETE FROM ai_intents WHERE chatbot_id = ?", [_0x526796]);
    await _0x5a1ec5.query("DELETE FROM ai_knowledge_base WHERE chatbot_id = ?", [_0x526796]);
    const _0x437626 = await _0x5a1ec5.query("DELETE FROM ai_chatbots WHERE id = ?", [_0x526796]);
    if (_0x437626.success) {
      logToFile("✅ Successfully deleted AI chatbot " + _0x526796 + " and cleaned up related data");
      try {
        const _0x49efa6 = appService.getAIService();
        if (_0x49efa6 && typeof _0x49efa6.clearChatbotCache === "function") {
          _0x49efa6.clearChatbotCache(_0x526796);
        }
      } catch (_0x320707) {
        logToFile("⚠️ Warning: Could not clear chatbot cache: " + _0x320707.message);
      }
    }
    return {
      success: true
    };
  } catch (_0x423b13) {
    logToFile("❌ AI Chatbot delete error: " + _0x423b13.message);
    return {
      success: false,
      error: _0x423b13.message
    };
  }
});
ipcMain.handle("ai-chatbots:toggle-status", async (_0x31f64b, _0x3c41ac) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x29fba0 = appService.getDatabaseService();
    if (!_0x29fba0) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    await _0x29fba0.query("\n      UPDATE ai_chatbots SET\n        is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,\n        updated_at = CURRENT_TIMESTAMP\n      WHERE id = ?\n    ", [_0x3c41ac]);
    return {
      success: true
    };
  } catch (_0x4e1ebe) {
    logToFile("❌ AI Chatbot toggle status error: " + _0x4e1ebe.message);
    return {
      success: false,
      error: _0x4e1ebe.message
    };
  }
});
ipcMain.handle("ai-schema:force-migration", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x10efb0 = appService.getDatabaseService();
    if (!_0x10efb0) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    await _0x10efb0.runAIChatbotMigrations();
    return {
      success: true,
      message: "AI schema migration completed successfully"
    };
  } catch (_0x720e59) {
    logToFile("❌ AI Schema migration error: " + _0x720e59.message);
    return {
      success: false,
      error: _0x720e59.message
    };
  }
});
ipcMain.handle("ai-documents:upload", async (_0x320937, _0x340b29, _0x52f16d, _0x581427) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x15f96b = appService.getAIService();
    if (!_0x15f96b || !_0x15f96b.documentService) {
      return {
        success: false,
        error: "Document service not available"
      };
    }
    const _0x274639 = await _0x15f96b.documentService.uploadDocument(_0x340b29, _0x52f16d, _0x581427);
    logToFile("✅ Document uploaded successfully: " + _0x581427);
    return _0x274639;
  } catch (_0x48dd6a) {
    console.error("❌ IPC: Document upload error:", _0x48dd6a);
    logToFile("❌ Document upload error: " + _0x48dd6a.message);
    return {
      success: false,
      error: _0x48dd6a.message
    };
  }
});
ipcMain.handle("ai-documents:get-all", async (_0x2304d7, _0x536438) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x30a06b = appService.getAIService();
    if (!_0x30a06b || !_0x30a06b.documentService) {
      return {
        success: false,
        error: "Document service not available"
      };
    }
    const _0x1c92b5 = await _0x30a06b.documentService.getDocuments(_0x536438);
    return {
      success: true,
      documents: _0x1c92b5
    };
  } catch (_0x4c1e96) {
    logToFile("❌ Get documents error: " + _0x4c1e96.message);
    return {
      success: false,
      error: _0x4c1e96.message
    };
  }
});
ipcMain.handle("ai-documents:delete", async (_0xd3b344, _0x261d69) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x54447b = appService.getAIService();
    if (!_0x54447b || !_0x54447b.documentService) {
      return {
        success: false,
        error: "Document service not available"
      };
    }
    const _0x1b2fd2 = await _0x54447b.documentService.deleteDocument(_0x261d69);
    logToFile("✅ Document deleted successfully: " + _0x261d69);
    return _0x1b2fd2;
  } catch (_0x229003) {
    logToFile("❌ Document delete error: " + _0x229003.message);
    return {
      success: false,
      error: _0x229003.message
    };
  }
});
ipcMain.handle("chatbot:cleanup-orphaned-conversations", async _0x1a4910 => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1b5685 = appService.getDatabaseService();
    if (!_0x1b5685) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    logToFile("🧹 Cleaning up orphaned chatbot conversations...");
    const _0x53f5ed = await _0x1b5685.query("\n      UPDATE chatbot_conversations\n      SET is_active = 0, completed_at = CURRENT_TIMESTAMP\n      WHERE is_active = 1 AND flow_id IN (\n        SELECT id FROM chatbot_flows WHERE is_active = 0\n      )\n    ");
    const _0x3d1f25 = await _0x1b5685.query("\n      UPDATE chatbot_conversations\n      SET is_active = 0, completed_at = CURRENT_TIMESTAMP\n      WHERE is_active = 1 AND flow_id NOT IN (\n        SELECT id FROM chatbot_flows\n      )\n    ");
    const _0x1f4d9f = (_0x53f5ed.changes || 0) + (_0x3d1f25.changes || 0);
    logToFile("🧹 Cleaned up " + _0x1f4d9f + " orphaned conversations");
    return {
      success: true,
      cleaned: _0x1f4d9f,
      inactiveFlows: _0x53f5ed.changes || 0,
      deletedFlows: _0x3d1f25.changes || 0
    };
  } catch (_0x3db2fc) {
    logToFile("❌ Cleanup orphaned conversations error: " + _0x3db2fc.message);
    return {
      success: false,
      error: _0x3db2fc.message
    };
  }
});
ipcMain.handle("support-bot:import-data", async (_0x7d7fc9, {
  sessionId: _0x5081cc,
  customerRecords: _0x3dc18c
}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1a6eb = appService.getSupportBotService();
    if (!_0x1a6eb) {
      return {
        success: false,
        error: "Support Bot service not available"
      };
    }
    logToFile("📊 Support Bot: Importing " + _0x3dc18c.length + " customer records for session " + _0x5081cc);
    const _0xf8958 = await _0x1a6eb.importCustomerData(_0x5081cc, _0x3dc18c);
    return _0xf8958;
  } catch (_0x565f06) {
    logToFile("❌ Support Bot import error: " + _0x565f06.message);
    return {
      success: false,
      error: _0x565f06.message
    };
  }
});
ipcMain.handle("support-bot:save-mappings", async (_0x3522f9, {
  sessionId: _0x2ad23d,
  mappings: _0x56621a
}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x49bd9d = appService.getSupportBotService();
    if (!_0x49bd9d) {
      return {
        success: false,
        error: "Support Bot service not available"
      };
    }
    logToFile("🗺️ Support Bot: Saving " + _0x56621a.length + " field mappings for session " + _0x2ad23d);
    const _0x3fc106 = await _0x49bd9d.saveFieldMappings(_0x2ad23d, _0x56621a);
    return _0x3fc106;
  } catch (_0x3d1310) {
    logToFile("❌ Support Bot save mappings error: " + _0x3d1310.message);
    return {
      success: false,
      error: _0x3d1310.message
    };
  }
});
ipcMain.handle("support-bot:upload-attachment", async (_0x3d6869, {
  file: _0x2b30ac,
  sessionId: _0x5c2eb9
}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x38c88a = appService.getSupportBotService();
    if (!_0x38c88a) {
      return {
        success: false,
        error: "Support Bot service not available"
      };
    }
    logToFile("📎 Support Bot: Uploading attachment for session " + _0x5c2eb9);
    const _0x1f01a5 = await _0x38c88a.uploadAttachment(_0x2b30ac, _0x5c2eb9);
    return _0x1f01a5;
  } catch (_0x59bdf6) {
    logToFile("❌ Support Bot upload attachment error: " + _0x59bdf6.message);
    return {
      success: false,
      error: _0x59bdf6.message
    };
  }
});
ipcMain.handle("support-bot:get-stats", async (_0x450415, {
  sessionId: _0x30a48d
}) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x273523 = appService.getSupportBotService();
    if (!_0x273523) {
      return {
        success: false,
        error: "Support Bot service not available"
      };
    }
    const _0x63d866 = await _0x273523.getStatistics(_0x30a48d);
    return _0x63d866;
  } catch (_0xf125c8) {
    logToFile("❌ Support Bot get stats error: " + _0xf125c8.message);
    return null;
  }
});
app.whenReady().then(() => {
  if (notificationService) {
    notificationService.start();
  }
  if (backgroundLicenseValidator) {
    backgroundLicenseValidator.start();
  }
  if (cloudLicenseService && cloudLicenseService.hasCloudLicense()) {
    logToFile("🔐 Cloud license detected - starting periodic validation");
    cloudLicenseService.startPeriodicValidation();
  }
  if (newlicLicenseService && newlicLicenseService.getLicenseInfo()) {
    try {
      const _0x4f340d = newlicLicenseService.get("license");
      if (_0x4f340d && _0x4f340d.key && _0x4f340d.machineId) {
        const _0x32e28d = getHeartbeatValidator();
        _0x32e28d.start(_0x4f340d.key, _0x4f340d.machineId, "https://license.getleadwave.in");
        logToFile("🔐 Heartbeat validator started for existing license");
      }
    } catch (_0x22f74d) {
      logToFile("⚠️ Failed to start heartbeat validator on startup: " + _0x22f74d.message);
    }
  }
});
ipcMain.handle("warmer:create-campaign", async (_0xeb5c96, _0xa353b1) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x42700f = appService.getWarmerService();
    if (!_0x42700f) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x42700f.createCampaign(_0xa353b1);
  } catch (_0x1056e0) {
    logToFile("❌ Warmer create campaign error: " + _0x1056e0.message);
    return {
      success: false,
      error: _0x1056e0.message
    };
  }
});
ipcMain.handle("warmer:get-campaigns", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x2c7126 = appService.getWarmerService();
    if (!_0x2c7126) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x2c7126.getCampaigns();
  } catch (_0x3c25bf) {
    logToFile("❌ Warmer get campaigns error: " + _0x3c25bf.message);
    return {
      success: false,
      error: _0x3c25bf.message
    };
  }
});
ipcMain.handle("warmer:update-campaign", async (_0x8bab53, _0x28fc3a, _0x1f6494) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xb4178 = appService.getWarmerService();
    if (!_0xb4178) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0xb4178.updateCampaign(_0x28fc3a, _0x1f6494);
  } catch (_0x16e038) {
    logToFile("❌ Warmer update campaign error: " + _0x16e038.message);
    return {
      success: false,
      error: _0x16e038.message
    };
  }
});
ipcMain.handle("warmer:delete-campaign", async (_0x5397f6, _0x262477) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4942bc = appService.getWarmerService();
    if (!_0x4942bc) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x4942bc.deleteCampaign(_0x262477);
  } catch (_0x3e81b3) {
    logToFile("❌ Warmer delete campaign error: " + _0x3e81b3.message);
    return {
      success: false,
      error: _0x3e81b3.message
    };
  }
});
ipcMain.handle("warmer:start-campaign", async (_0x209534, _0xec3dcb) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x418c16 = appService.getWarmerService();
    if (!_0x418c16) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x418c16.startCampaign(_0xec3dcb);
  } catch (_0x57a56c) {
    logToFile("❌ Warmer start campaign error: " + _0x57a56c.message);
    return {
      success: false,
      error: _0x57a56c.message
    };
  }
});
ipcMain.handle("warmer:stop-campaign", async (_0x5227bd, _0x4b0914) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x16b3a5 = appService.getWarmerService();
    if (!_0x16b3a5) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x16b3a5.stopCampaign(_0x4b0914);
  } catch (_0x3e639c) {
    logToFile("❌ Warmer stop campaign error: " + _0x3e639c.message);
    return {
      success: false,
      error: _0x3e639c.message
    };
  }
});
ipcMain.handle("warmer:create-template", async (_0x5d517f, _0x1a31d8) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x79c168 = appService.getWarmerService();
    if (!_0x79c168) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x79c168.createTemplate(_0x1a31d8);
  } catch (_0x310fb0) {
    logToFile("❌ Warmer create template error: " + _0x310fb0.message);
    return {
      success: false,
      error: _0x310fb0.message
    };
  }
});
ipcMain.handle("warmer:get-templates", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xd21300 = appService.getWarmerService();
    if (!_0xd21300) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0xd21300.getTemplates();
  } catch (_0x45e071) {
    logToFile("❌ Warmer get templates error: " + _0x45e071.message);
    return {
      success: false,
      error: _0x45e071.message
    };
  }
});
ipcMain.handle("warmer:update-template", async (_0x10e758, _0x49895a, _0x522f70) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x38c897 = appService.getWarmerService();
    if (!_0x38c897) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x38c897.updateTemplate(_0x49895a, _0x522f70);
  } catch (_0x71c371) {
    logToFile("❌ Warmer update template error: " + _0x71c371.message);
    return {
      success: false,
      error: _0x71c371.message
    };
  }
});
ipcMain.handle("warmer:delete-template", async (_0xc4961d, _0x3b325d) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x46295f = appService.getWarmerService();
    if (!_0x46295f) {
      return {
        success: false,
        error: "Warmer service not available"
      };
    }
    return await _0x46295f.deleteTemplate(_0x3b325d);
  } catch (_0x4f9996) {
    logToFile("❌ Warmer delete template error: " + _0x4f9996.message);
    return {
      success: false,
      error: _0x4f9996.message
    };
  }
});
const withDeviceHealth = async (_0x587c1d, _0x1a84bc) => {
  try {
    if (!appService) {
      logToFile("❌ Device health " + _0x587c1d + ": app service not available");
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x58ac97 = appService.getDeviceHealthService ? appService.getDeviceHealthService() : null;
    if (!_0x58ac97) {
      logToFile("❌ Device health " + _0x587c1d + ": service not available");
      return {
        success: false,
        error: "Device health service not available"
      };
    }
    const _0x5e9638 = await _0x1a84bc(_0x58ac97);
    return {
      success: true,
      data: _0x5e9638
    };
  } catch (_0x267f84) {
    logToFile("❌ Device health " + _0x587c1d + " error: " + _0x267f84.message);
    return {
      success: false,
      error: _0x267f84.message
    };
  }
};
ipcMain.handle("device-health:get-score", async (_0x175dc1, _0x419a21) => withDeviceHealth("get-score", _0x396d2a => _0x396d2a.computeScore(_0x419a21)));
ipcMain.handle("device-health:get-all-scores", async () => withDeviceHealth("get-all-scores", _0x253a9c => _0x253a9c.computeAllScores()));
ipcMain.handle("device-health:get-cached-scores", async () => withDeviceHealth("get-cached-scores", _0x43067d => _0x43067d.getCachedScores()));
ipcMain.handle("device-health:get-history", async (_0x3166f2, _0x3f74c3, _0x2294de) => withDeviceHealth("get-history", _0x4b1779 => _0x4b1779.getScoreHistory(_0x3f74c3, _0x2294de)));
ipcMain.handle("device-health:preflight-check", async (_0x1c31d7, _0x31e325, _0x17dbf9) => withDeviceHealth("preflight-check", _0x29d4ad => _0x29d4ad.preflightCheck(_0x31e325, _0x17dbf9)));
ipcMain.handle("device-health:get-ban-events", async (_0xa166a1, _0x53b0a5) => withDeviceHealth("get-ban-events", _0x456ded => _0x456ded.getBanEvents(_0x53b0a5)));
ipcMain.handle("device-health:clear-ban-flag", async (_0x24a0e1, _0x5d70c8) => withDeviceHealth("clear-ban-flag", _0x254a14 => _0x254a14.clearBanFlag(_0x5d70c8)));
ipcMain.handle("proxy:save-api-key", async (_0x3f5bf7, _0x751ec6) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1d19a5 = appService.getProxyService();
    if (!_0x1d19a5) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x1d19a5.saveApiKey(_0x751ec6);
  } catch (_0x17b44f) {
    logToFile("❌ Proxy save API key error: " + _0x17b44f.message);
    return {
      success: false,
      error: _0x17b44f.message
    };
  }
});
ipcMain.handle("proxy:get-settings", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1cdf11 = appService.getProxyService();
    if (!_0x1cdf11) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x1cdf11.getSettings();
  } catch (_0x54e895) {
    logToFile("❌ Proxy get settings error: " + _0x54e895.message);
    return {
      success: false,
      error: _0x54e895.message
    };
  }
});
ipcMain.handle("proxy:sync-account", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x408f01 = appService.getProxyService();
    if (!_0x408f01) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x408f01.syncAccountInfo();
  } catch (_0xef54bb) {
    logToFile("❌ Proxy sync account error: " + _0xef54bb.message);
    return {
      success: false,
      error: _0xef54bb.message
    };
  }
});
ipcMain.handle("proxy:get-price", async (_0x19c94b, _0xc94c37, _0x32dbf, _0x39d290) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1247a2 = appService.getProxyService();
    if (!_0x1247a2) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x1247a2.getPrice(_0xc94c37, _0x32dbf, _0x39d290);
  } catch (_0x1bee6c) {
    logToFile("❌ Proxy get price error: " + _0x1bee6c.message);
    return {
      success: false,
      error: _0x1bee6c.message
    };
  }
});
ipcMain.handle("proxy:get-countries", async (_0x481da5, _0x2baa3a) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x49d0e4 = appService.getProxyService();
    if (!_0x49d0e4) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x49d0e4.getCountries(_0x2baa3a);
  } catch (_0x3ebfc5) {
    logToFile("❌ Proxy get countries error: " + _0x3ebfc5.message);
    return {
      success: false,
      error: _0x3ebfc5.message
    };
  }
});
ipcMain.handle("proxy:get-count", async (_0x582274, _0x36646b, _0x1019f0) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x30a8cb = appService.getProxyService();
    if (!_0x30a8cb) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x30a8cb.getCount(_0x36646b, _0x1019f0);
  } catch (_0x24b161) {
    logToFile("❌ Proxy get count error: " + _0x24b161.message);
    return {
      success: false,
      error: _0x24b161.message
    };
  }
});
ipcMain.handle("proxy:buy-proxy", async (_0x57072b, _0xc31a91, _0x529640, _0x28034d, _0x14d390, _0x22113c, _0xa8fbbf, _0x14b525) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4645e5 = appService.getProxyService();
    if (!_0x4645e5) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x4645e5.buyProxy(_0xc31a91, _0x529640, _0x28034d, _0x14d390, _0x22113c, _0xa8fbbf, _0x14b525);
  } catch (_0x6a7c3b) {
    logToFile("❌ Proxy buy proxy error: " + _0x6a7c3b.message);
    return {
      success: false,
      error: _0x6a7c3b.message
    };
  }
});
ipcMain.handle("proxy:sync-proxies", async (_0x2a4653, _0x5a2468) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x57137a = appService.getProxyService();
    if (!_0x57137a) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x57137a.syncProxies(_0x5a2468);
  } catch (_0x32fc4c) {
    logToFile("❌ Proxy sync proxies error: " + _0x32fc4c.message);
    return {
      success: false,
      error: _0x32fc4c.message
    };
  }
});
ipcMain.handle("proxy:get-proxies", async (_0x44b497, _0x1c6414) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x3a852d = appService.getProxyService();
    if (!_0x3a852d) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x3a852d.getProxies(_0x1c6414);
  } catch (_0x26ea3a) {
    logToFile("❌ Proxy get proxies error: " + _0x26ea3a.message);
    return {
      success: false,
      error: _0x26ea3a.message
    };
  }
});
ipcMain.handle("proxy:prolong-proxy", async (_0x7a9dbb, _0x362be5, _0x10250b) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x5b570d = appService.getProxyService();
    if (!_0x5b570d) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x5b570d.prolongProxy(_0x362be5, _0x10250b);
  } catch (_0x3d0854) {
    logToFile("❌ Proxy prolong proxy error: " + _0x3d0854.message);
    return {
      success: false,
      error: _0x3d0854.message
    };
  }
});
ipcMain.handle("proxy:delete-proxy", async (_0x478fd3, _0x2c7ae4) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x599eeb = appService.getProxyService();
    if (!_0x599eeb) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x599eeb.deleteProxy(_0x2c7ae4);
  } catch (_0x5ce648) {
    logToFile("❌ Proxy delete proxy error: " + _0x5ce648.message);
    return {
      success: false,
      error: _0x5ce648.message
    };
  }
});
ipcMain.handle("proxy:check-proxy", async (_0x15558c, _0x5d67a5) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4397cb = appService.getProxyService();
    if (!_0x4397cb) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x4397cb.checkProxy(_0x5d67a5);
  } catch (_0x194918) {
    logToFile("❌ Proxy check proxy error: " + _0x194918.message);
    return {
      success: false,
      error: _0x194918.message
    };
  }
});
ipcMain.handle("proxy:set-type", async (_0x528502, _0x492842, _0x10fac8) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x107463 = appService.getProxyService();
    if (!_0x107463) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x107463.setProxyType(_0x492842, _0x10fac8);
  } catch (_0x53ca72) {
    logToFile("❌ Proxy set type error: " + _0x53ca72.message);
    return {
      success: false,
      error: _0x53ca72.message
    };
  }
});
ipcMain.handle("proxy:get-statistics", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x46e578 = appService.getProxyService();
    if (!_0x46e578) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x46e578.getStatistics();
  } catch (_0x529816) {
    logToFile("❌ Proxy get statistics error: " + _0x529816.message);
    return {
      success: false,
      error: _0x529816.message
    };
  }
});
ipcMain.handle("proxy:save-asocks-api-key", async (_0x325712, _0x5b35a9) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0xd849a0 = appService.getProxyService();
    if (!_0xd849a0) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0xd849a0.saveAsocksApiKey(_0x5b35a9);
  } catch (_0x3ff85b) {
    logToFile("❌ Proxy save asocks API key error: " + _0x3ff85b.message);
    return {
      success: false,
      error: _0x3ff85b.message
    };
  }
});
ipcMain.handle("proxy:sync-asocks-account", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1e2cbd = appService.getProxyService();
    if (!_0x1e2cbd) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x1e2cbd.syncAsocksAccount();
  } catch (_0x31ad45) {
    logToFile("❌ Proxy sync asocks account error: " + _0x31ad45.message);
    return {
      success: false,
      error: _0x31ad45.message
    };
  }
});
ipcMain.handle("proxy:sync-asocks-proxies", async () => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x19e403 = appService.getProxyService();
    if (!_0x19e403) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x19e403.syncAsocksPorts();
  } catch (_0x256656) {
    logToFile("❌ Proxy sync asocks proxies error: " + _0x256656.message);
    return {
      success: false,
      error: _0x256656.message
    };
  }
});
ipcMain.handle("proxy:assign-to-campaign", async (_0x14c9d1, _0xff238a, _0x3c2168, _0x78c750) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x283557 = appService.getProxyService();
    if (!_0x283557) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x283557.assignToCampaign(_0xff238a, _0x3c2168, _0x78c750);
  } catch (_0x12a16d) {
    logToFile("❌ Proxy assign to campaign error: " + _0x12a16d.message);
    return {
      success: false,
      error: _0x12a16d.message
    };
  }
});
ipcMain.handle("proxy:get-for-campaign", async (_0x50284a, _0x2a6480, _0x2c8887) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x59fcbc = appService.getProxyService();
    if (!_0x59fcbc) {
      return {
        success: false,
        error: "Proxy service not available"
      };
    }
    return await _0x59fcbc.getForCampaign(_0x2a6480, _0x2c8887);
  } catch (_0x366749) {
    logToFile("❌ Proxy get for campaign error: " + _0x366749.message);
    return {
      success: false,
      error: _0x366749.message
    };
  }
});
ipcMain.handle("email:test-configuration", async (_0x3add73, _0x157d5c) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    let _0xc21577;
    try {
      _0xc21577 = require("../services/email.service");
    } catch (_0x18274c) {
      try {
        _0xc21577 = require("./services/email.service");
      } catch (_0x301a88) {
        try {
          _0xc21577 = require("./build/services/email.service");
        } catch (_0x34b892) {
          logToFile("❌ Failed to load EmailService from all paths: " + _0x18274c.message + ", " + _0x301a88.message + ", " + _0x34b892.message);
          return {
            success: false,
            error: "Email service module not found"
          };
        }
      }
    }
    const _0x2e933a = new _0xc21577();
    const _0x353a5a = await _0x2e933a.testEmailConfiguration(_0x157d5c);
    return _0x353a5a;
  } catch (_0x2dbeae) {
    logToFile("❌ Email configuration test error: " + _0x2dbeae.message);
    return {
      success: false,
      error: _0x2dbeae.message
    };
  }
});
ipcMain.handle("live-chat:sync-chat-history", async (_0x299f36, _0x21bb75, _0x445d05, _0x44a161) => {
  try {
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x4c9ba2 = appService.getWhatsAppService();
    if (!_0x4c9ba2) {
      return {
        success: false,
        error: "WhatsApp service not available"
      };
    }
    if (!_0x21bb75 || _0x21bb75 === "__all__") {
      const allSess = _0x4c9ba2.getAllSessions ? _0x4c9ba2.getAllSessions() : [];
      const conn = allSess.find(s => s.status === "connected" && s.isLoggedIn);
      _0x21bb75 = conn?.sessionId || allSess[0]?.sessionId || _0x21bb75;
    }
    if (!_0x445d05.includes("@lid")) {
      const _0xe91ba7 = _0x445d05.split("@")[0];
      await liveChatService.db.run("UPDATE live_chat_conversations SET contact_phone = ? WHERE conversation_id = ?", [_0xe91ba7, _0x44a161]);
    }
    const _0x220662 = await _0x4c9ba2.getChatHistory(_0x21bb75, _0x445d05, 50);
    if (!_0x220662.success || !_0x220662.messages) {
      return {
        success: true,
        synced: 0
      };
    }
    let _0x52376f = 0;
    for (const _0x36d90f of _0x220662.messages) {
      try {
        let _0x12936d = "";
        let _0xa6ae62 = "text";
        if (typeof _0x36d90f !== "object" || !_0x36d90f) {
          continue;
        }
        let _0x312a44 = null;
        let _0x9c0c5d = null;
        let _0x40dcdb = null;
        if (_0x36d90f.message) {
          if (_0x36d90f.message.conversation) {
            _0x12936d = _0x36d90f.message.conversation;
          } else if (_0x36d90f.message.extendedTextMessage?.text) {
            _0x12936d = _0x36d90f.message.extendedTextMessage.text;
          } else if (_0x36d90f.message.imageMessage) {
            _0xa6ae62 = "image";
            _0x12936d = _0x36d90f.message.imageMessage.caption || "[Image]";
            _0x40dcdb = _0x36d90f.message.imageMessage.mimetype || "image/jpeg";
          } else if (_0x36d90f.message.videoMessage) {
            _0xa6ae62 = "video";
            _0x12936d = _0x36d90f.message.videoMessage.caption || "[Video]";
            _0x40dcdb = _0x36d90f.message.videoMessage.mimetype || "video/mp4";
          } else if (_0x36d90f.message.audioMessage) {
            _0xa6ae62 = "audio";
            _0x12936d = "[Audio]";
            _0x40dcdb = _0x36d90f.message.audioMessage.mimetype || "audio/mp4";
          } else if (_0x36d90f.message.documentMessage) {
            _0xa6ae62 = "document";
            _0x12936d = _0x36d90f.message.documentMessage.fileName || "[Document]";
            _0x9c0c5d = _0x36d90f.message.documentMessage.fileName || null;
            _0x40dcdb = _0x36d90f.message.documentMessage.mimetype || "application/octet-stream";
          } else if (_0x36d90f.message.stickerMessage) {
            _0xa6ae62 = "sticker";
            _0x12936d = "";
            _0x40dcdb = _0x36d90f.message.stickerMessage.mimetype || "image/webp";
          } else {
            _0x12936d = "[Unsupported message type]";
          }
        } else {
          continue;
        }
        const _0x17d3eb = ["image", "video", "audio", "document", "sticker"];
        if (_0x17d3eb.includes(_0xa6ae62) && _0x36d90f.key) {
          try {
            const _0x161fc8 = await _0x4c9ba2.downloadMedia(_0x21bb75, _0x36d90f.key);
            if (_0x161fc8 && _0x161fc8.success && _0x161fc8.buffer) {
              const _0x277391 = _0x161fc8.buffer.toString("base64");
              _0x312a44 = "data:" + (_0x161fc8.mimeType || _0x40dcdb) + ";base64," + _0x277391;
            }
          } catch (_0x1306d2) {}
        }
        let _0x10c542 = _0x445d05.split("@")[0];
        if (_0x445d05.includes("@lid") && _0x36d90f.key?.remoteJidAlt) {
          const _0x3f874b = _0x36d90f.key.remoteJidAlt.split("@")[0].split(":")[0];
          if (/^\d+$/.test(_0x3f874b)) {
            _0x10c542 = _0x3f874b;
          }
        }
        const _0x5dbf57 = _0x36d90f.pushName || _0x36d90f.verifiedBizName || _0x10c542;
        const _0x33cb1e = await liveChatService.saveMessage(_0x44a161, {
          messageId: _0x36d90f.key?.id || "msg_" + Date.now() + "_" + _0x52376f,
          senderType: _0x36d90f.key?.fromMe ? "agent" : "customer",
          senderName: _0x36d90f.key?.fromMe ? "You" : _0x5dbf57,
          content: _0x12936d,
          messageType: _0xa6ae62,
          attachmentUrl: _0x312a44,
          attachmentName: _0x9c0c5d,
          attachmentMimeType: _0x40dcdb,
          status: "delivered",
          timestamp: _0x36d90f.messageTimestamp ? new Date(_0x36d90f.messageTimestamp * 1000) : new Date()
        });
        if (_0x33cb1e.success) {
          _0x52376f++;
        }
      } catch (_0x3a2f09) {
        console.error("❌ [Live Chat] Error syncing message:", _0x3a2f09);
      }
    }
    return {
      success: true,
      synced: _0x52376f
    };
  } catch (_0x336a0e) {
    console.error("❌ [Live Chat] Error syncing chat history:", _0x336a0e);
    return {
      success: false,
      error: _0x336a0e.message
    };
  }
});
ipcMain.handle("live-chat:check-service-status", async () => {
  const _0x301d90 = appService?.getDatabaseService ? appService.getDatabaseService() : appService?.database;
  return {
    success: true,
    status: {
      liveChatServiceExists: liveChatService !== null,
      appServiceExists: appService !== null,
      databaseServiceExists: _0x301d90 !== null
    }
  };
});
ipcMain.handle("live-chat:force-initialize", async () => {
  try {
    const _0x18b0dc = await initializeLiveChatService();
    return {
      ..._0x18b0dc,
      liveChatServiceExists: liveChatService !== null
    };
  } catch (_0x583a89) {
    console.error("🔧 [Live Chat] Force initialization error:", _0x583a89);
    return {
      success: false,
      error: _0x583a89.message,
      stack: _0x583a89.stack,
      liveChatServiceExists: liveChatService !== null
    };
  }
});
ipcMain.handle("live-chat:get-or-create-conversation", async (_0x5b9b45, _0x9432f2, _0xf939b0, _0x503eef, _0x1bb8ed, _0x362fbb) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getOrCreateConversation(_0x9432f2, _0xf939b0, _0x503eef, _0x1bb8ed, _0x362fbb);
  } catch (_0x55d2c4) {
    logToFile("❌ Live Chat get/create conversation error: " + _0x55d2c4.message);
    return {
      success: false,
      error: _0x55d2c4.message
    };
  }
});
ipcMain.handle("live-chat:get-conversations", async (_0x3e12d4, _0x953648, _0x444636) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getConversations(_0x953648, _0x444636);
  } catch (_0x10811d) {
    logToFile("❌ Live Chat get conversations error: " + _0x10811d.message);
    return {
      success: false,
      error: _0x10811d.message
    };
  }
});
ipcMain.handle("live-chat:update-conversation", async (_0x3afb15, _0x201f91, _0x141e4a) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.updateConversation(_0x201f91, _0x141e4a);
  } catch (_0x2d222d) {
    logToFile("❌ Live Chat update conversation error: " + _0x2d222d.message);
    return {
      success: false,
      error: _0x2d222d.message
    };
  }
});
ipcMain.handle("live-chat:update-conversation-status", async (_0x16942c, _0x507207, _0x3b5cee) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.updateConversationStatus(_0x507207, _0x3b5cee);
  } catch (_0xb9a696) {
    logToFile("❌ Live Chat update conversation status error: " + _0xb9a696.message);
    return {
      success: false,
      error: _0xb9a696.message
    };
  }
});
ipcMain.handle("live-chat:mark-as-read", async (_0x3bda57, _0x4bbacf) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.markAsRead(_0x4bbacf);
  } catch (_0x46ca50) {
    logToFile("❌ Live Chat mark as read error: " + _0x46ca50.message);
    return {
      success: false,
      error: _0x46ca50.message
    };
  }
});
ipcMain.handle("live-chat:search-conversations", async (_0x56cad9, _0x316227, _0x2b82bd) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.searchConversations(_0x316227, _0x2b82bd);
  } catch (_0x38dc04) {
    logToFile("❌ Live Chat search conversations error: " + _0x38dc04.message);
    return {
      success: false,
      error: _0x38dc04.message
    };
  }
});
ipcMain.handle("live-chat:save-message", async (_0x5e74d7, _0x445ea1, _0x3f60ef) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.saveMessage(_0x445ea1, _0x3f60ef);
  } catch (_0x2f33a0) {
    logToFile("❌ Live Chat save message error: " + _0x2f33a0.message);
    return {
      success: false,
      error: _0x2f33a0.message
    };
  }
});
ipcMain.handle("live-chat:get-messages", async (_0x2e3c97, _0x52b09e, _0x54ed11, _0x1b3eba) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getMessages(_0x52b09e, _0x54ed11, _0x1b3eba);
  } catch (_0x29e49c) {
    logToFile("❌ Live Chat get messages error: " + _0x29e49c.message);
    return {
      success: false,
      error: _0x29e49c.message
    };
  }
});
ipcMain.handle("live-chat:update-message-attachment", async (_0x252eab, _0x417386, _0x1a92d2, _0x349ec4) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.updateMessageAttachment(_0x417386, _0x1a92d2, _0x349ec4);
  } catch (_0xd01732) {
    logToFile("❌ Live Chat update message attachment error: " + _0xd01732.message);
    return {
      success: false,
      error: _0xd01732.message
    };
  }
});
ipcMain.handle("live-chat:get-contact", async (_0x454c4b, _0x45d949) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getContact(_0x45d949);
  } catch (_0x13d71a) {
    logToFile("❌ Live Chat get contact error: " + _0x13d71a.message);
    return {
      success: false,
      error: _0x13d71a.message
    };
  }
});
ipcMain.handle("live-chat:create-or-update-contact", async (_0x2ad6b2, _0x156a06, _0x4d4080, _0xf4701c, _0x48858d) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.createOrUpdateContact(_0x156a06, _0x4d4080, _0xf4701c, _0x48858d);
  } catch (_0x359e89) {
    logToFile("❌ Live Chat create/update contact error: " + _0x359e89.message);
    return {
      success: false,
      error: _0x359e89.message
    };
  }
});
ipcMain.handle("live-chat:add-note", async (_0x3ca3ea, _0x5bdd37, _0x44ece7, _0x1ca537, _0x21a1a2) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.addNote(_0x5bdd37, _0x44ece7, _0x1ca537, _0x21a1a2);
  } catch (_0x189f4e) {
    logToFile("❌ Live Chat add note error: " + _0x189f4e.message);
    return {
      success: false,
      error: _0x189f4e.message
    };
  }
});
ipcMain.handle("live-chat:get-notes", async (_0x452415, _0x1a3021) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getNotes(_0x1a3021);
  } catch (_0x42f6b1) {
    logToFile("❌ Live Chat get notes error: " + _0x42f6b1.message);
    return {
      success: false,
      error: _0x42f6b1.message
    };
  }
});
ipcMain.handle("live-chat:update-note", async (_0x2fc966, _0x335c57, _0x21e959) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.updateNote(_0x335c57, _0x21e959);
  } catch (_0x3399f3) {
    logToFile("❌ Live Chat update note error: " + _0x3399f3.message);
    return {
      success: false,
      error: _0x3399f3.message
    };
  }
});
ipcMain.handle("live-chat:delete-note", async (_0x514266, _0x326570) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.deleteNote(_0x326570);
  } catch (_0x43b132) {
    logToFile("❌ Live Chat delete note error: " + _0x43b132.message);
    return {
      success: false,
      error: _0x43b132.message
    };
  }
});
ipcMain.handle("live-chat:get-quick-replies", async _0x409685 => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getQuickReplies();
  } catch (_0x5d62ae) {
    logToFile("❌ Live Chat get quick replies error: " + _0x5d62ae.message);
    return {
      success: false,
      error: _0x5d62ae.message
    };
  }
});
ipcMain.handle("live-chat:create-quick-reply", async (_0x328899, _0x48ff7d, _0x261052, _0x7ea0, _0x380585) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.createQuickReply(_0x48ff7d, _0x261052, _0x7ea0, _0x380585);
  } catch (_0x1cce43) {
    logToFile("❌ Live Chat create quick reply error: " + _0x1cce43.message);
    return {
      success: false,
      error: _0x1cce43.message
    };
  }
});
ipcMain.handle("live-chat:get-statistics", async (_0xfa208e, _0x307452) => {
  try {
    if (!liveChatService) {
      await initializeLiveChatService();
    }
    if (!liveChatService) {
      return {
        success: false,
        error: "Live Chat service not available"
      };
    }
    return await liveChatService.getStatistics(_0x307452);
  } catch (_0x5eb44c) {
    logToFile("❌ Live Chat get statistics error: " + _0x5eb44c.message);
    return {
      success: false,
      error: _0x5eb44c.message
    };
  }
});
ipcMain.handle("rest-api:start", async () => {
  try {
    logToFile("🚀 [REST API] Starting server via IPC (manual start)...");
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x543e7f = await restAPIServer.start(true);
    if (_0x543e7f === false) {
      return {
        success: false,
        error: "Failed to start server"
      };
    }
    await restAPIServer.saveConfig({
      ...restAPIServer.config,
      enabled: true
    });
    logToFile("✅ [REST API] Server started on port " + restAPIServer.config.port);
    return {
      success: true,
      port: restAPIServer.config.port,
      message: "REST API server started on port " + restAPIServer.config.port
    };
  } catch (_0x1f2621) {
    logToFile("❌ [REST API] Start error: " + _0x1f2621.message);
    return {
      success: false,
      error: _0x1f2621.message
    };
  }
});
ipcMain.handle("rest-api:stop", async () => {
  try {
    logToFile("⏹️ [REST API] Stopping server via IPC...");
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    await restAPIServer.stop();
    await restAPIServer.saveConfig({
      ...restAPIServer.config,
      enabled: false
    });
    logToFile("✅ [REST API] Server stopped");
    return {
      success: true,
      message: "REST API server stopped"
    };
  } catch (_0x52a274) {
    logToFile("❌ [REST API] Stop error: " + _0x52a274.message);
    return {
      success: false,
      error: _0x52a274.message
    };
  }
});
ipcMain.handle("rest-api:restart", async () => {
  try {
    logToFile("🔄 [REST API] Restarting server via IPC...");
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    await restAPIServer.restart();
    logToFile("✅ [REST API] Server restarted on port " + restAPIServer.config.port);
    return {
      success: true,
      port: restAPIServer.config.port,
      message: "REST API server restarted on port " + restAPIServer.config.port
    };
  } catch (_0x32be19) {
    logToFile("❌ [REST API] Restart error: " + _0x32be19.message);
    return {
      success: false,
      error: _0x32be19.message
    };
  }
});
ipcMain.handle("rest-api:get-status", async () => {
  try {
    if (!restAPIServer) {
      logToFile("⚠️ [REST API] Get status called but restAPIServer is null");
      return {
        success: true,
        status: {
          isRunning: false,
          config: null,
          uptime: 0
        }
      };
    }
    const _0x1c27b2 = restAPIServer.getStatus();
    logToFile("📊 [REST API " + restAPIServer.instanceId + "] Status: isRunning=" + _0x1c27b2.isRunning + ", port=" + _0x1c27b2.config?.port);
    return {
      success: true,
      status: _0x1c27b2
    };
  } catch (_0x102e77) {
    logToFile("❌ [REST API] Get status error: " + _0x102e77.message);
    return {
      success: false,
      error: _0x102e77.message
    };
  }
});
ipcMain.handle("rest-api:generate-key", async (_0x49bd82, {
  deviceId: _0x3b1880,
  name: _0x255d6b
}) => {
  try {
    logToFile("🔑 [REST API] Generating new API key for device: " + _0x3b1880);
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x4d2bef = await restAPIServer.generateAPIKey(_0x3b1880, _0x255d6b);
    logToFile("✅ [REST API] API key generated successfully");
    return {
      success: true,
      ..._0x4d2bef
    };
  } catch (_0x2bf4ac) {
    logToFile("❌ [REST API] Generate key error: " + _0x2bf4ac.message);
    return {
      success: false,
      error: _0x2bf4ac.message
    };
  }
});
ipcMain.handle("rest-api:get-keys", async () => {
  try {
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x281a2a = await restAPIServer.getAPIKeys();
    return {
      success: true,
      keys: _0x281a2a
    };
  } catch (_0x236bd8) {
    logToFile("❌ [REST API] Get keys error: " + _0x236bd8.message);
    return {
      success: false,
      error: _0x236bd8.message
    };
  }
});
ipcMain.handle("rest-api:delete-key", async (_0x4b50c3, _0x5912f8) => {
  try {
    logToFile("🗑️ [REST API] Deleting API key: " + _0x5912f8);
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x11640f = await restAPIServer.deleteAPIKey(_0x5912f8);
    if (_0x11640f) {
      logToFile("✅ [REST API] API key deleted successfully");
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: "Failed to delete API key"
      };
    }
  } catch (_0x697f51) {
    logToFile("❌ [REST API] Delete key error: " + _0x697f51.message);
    return {
      success: false,
      error: _0x697f51.message
    };
  }
});
ipcMain.handle("rest-api:toggle-key", async (_0x87387, {
  keyId: _0x21bf70,
  isActive: _0x3f41fc
}) => {
  try {
    logToFile("🔄 [REST API] Toggling API key: " + _0x21bf70 + " to " + _0x3f41fc);
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x36576a = await restAPIServer.toggleAPIKey(_0x21bf70, _0x3f41fc);
    if (_0x36576a) {
      logToFile("✅ [REST API] API key toggled successfully");
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: "Failed to toggle API key"
      };
    }
  } catch (_0x25fadf) {
    logToFile("❌ [REST API] Toggle key error: " + _0x25fadf.message);
    return {
      success: false,
      error: _0x25fadf.message
    };
  }
});
ipcMain.handle("rest-api:save-config", async (_0x281a04, _0x3afc60) => {
  try {
    logToFile("💾 [REST API] Saving configuration...");
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    await restAPIServer.saveConfig(_0x3afc60);
    logToFile("✅ [REST API] Configuration saved successfully");
    return {
      success: true,
      message: "Configuration saved successfully"
    };
  } catch (_0x484727) {
    logToFile("❌ [REST API] Save config error: " + _0x484727.message);
    return {
      success: false,
      error: _0x484727.message
    };
  }
});
ipcMain.handle("rest-api:get-config", async () => {
  try {
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    return {
      success: true,
      config: restAPIServer.config
    };
  } catch (_0x1d5625) {
    logToFile("❌ [REST API] Get config error: " + _0x1d5625.message);
    return {
      success: false,
      error: _0x1d5625.message
    };
  }
});
ipcMain.handle("rest-api:get-documentation", async () => {
  try {
    if (!restAPIServer) {
      await initializeRestAPIServer();
    }
    if (!restAPIServer) {
      return {
        success: false,
        error: "REST API server not available"
      };
    }
    const _0x59315d = restAPIServer.getAPIDocumentation();
    return {
      success: true,
      documentation: _0x59315d
    };
  } catch (_0x26901b) {
    logToFile("❌ [REST API] Get documentation error: " + _0x26901b.message);
    return {
      success: false,
      error: _0x26901b.message
    };
  }
});
ipcMain.handle("rest-api:test-endpoint", async (_0x216139, {
  url: _0x170aef,
  options: _0x22c16b
}) => {
  try {
    logToFile("🧪 [REST API] Testing endpoint: " + _0x170aef);
    const _0x2d9c20 = (await import("node-fetch")).default;
    const _0x4bb260 = await _0x2d9c20(_0x170aef, _0x22c16b);
    const _0x50e0a7 = _0x4bb260.headers.get("content-type");
    let _0x2a7277;
    if (_0x50e0a7 && _0x50e0a7.includes("application/json")) {
      _0x2a7277 = await _0x4bb260.json();
    } else {
      _0x2a7277 = await _0x4bb260.text();
    }
    if (_0x4bb260.ok) {
      logToFile("✅ [REST API] Test successful: " + _0x4bb260.status);
      return {
        success: true,
        data: _0x2a7277,
        status: _0x4bb260.status,
        statusText: _0x4bb260.statusText
      };
    } else {
      logToFile("❌ [REST API] Test failed: " + _0x4bb260.status + " - " + _0x4bb260.statusText);
      return {
        success: false,
        error: _0x2a7277.message || _0x2a7277.error || "HTTP " + _0x4bb260.status + ": " + _0x4bb260.statusText,
        data: _0x2a7277,
        status: _0x4bb260.status,
        statusText: _0x4bb260.statusText
      };
    }
  } catch (_0x84c315) {
    logToFile("❌ [REST API] Test endpoint error: " + _0x84c315.message);
    return {
      success: false,
      error: _0x84c315.message,
      message: _0x84c315.message
    };
  }
});
ipcMain.handle("email:send", async (_0x585387, _0x3e251f) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x42bd71 = await appService.emailService.sendEmail(_0x3e251f);
    return _0x42bd71;
  } catch (_0x37795b) {
    logToFile("❌ Email send error: " + _0x37795b.message);
    return {
      success: false,
      error: _0x37795b.message
    };
  }
});
ipcMain.handle("email:get-stats", async (_0x2ebdb6, _0x5262f8 = 30) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x1552a5 = await appService.emailService.getEmailStats(_0x5262f8);
    return _0x1552a5;
  } catch (_0x42d4ea) {
    logToFile("❌ Email stats error: " + _0x42d4ea.message);
    return {
      success: false,
      error: _0x42d4ea.message
    };
  }
});
ipcMain.handle("email:process-template", async (_0x1a3855, _0x1f343b, _0x4c079d) => {
  try {
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x521a54 = await appService.emailService.processTemplate(_0x1f343b, _0x4c079d);
    return _0x521a54;
  } catch (_0x663351) {
    logToFile("❌ Email template processing error: " + _0x663351.message);
    return {
      success: false,
      error: _0x663351.message
    };
  }
});
ipcMain.handle("update:check-for-updates", async (_0xe86306, _0x569eed = false) => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x119d98 = await updateService.checkForUpdates(_0x569eed);
    const _0x2a13c0 = updateService.getUpdateInfo();
    return {
      success: true,
      hasUpdate: _0x119d98,
      updateInfo: _0x2a13c0.updateInfo,
      isUpdateAvailable: _0x2a13c0.isUpdateAvailable
    };
  } catch (_0x754f8b) {
    logToFile("❌ Update check error: " + _0x754f8b.message);
    return {
      success: false,
      error: _0x754f8b.message
    };
  }
});
ipcMain.handle("update:download-update", async _0x10c254 => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    await updateService.downloadUpdate();
    return {
      success: true
    };
  } catch (_0x2409e0) {
    logToFile("❌ Update download error: " + _0x2409e0.message);
    return {
      success: false,
      error: _0x2409e0.message
    };
  }
});
ipcMain.handle("update:install-update", async _0x302f3a => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    await updateService.installUpdate();
    return {
      success: true
    };
  } catch (_0x56b2cc) {
    logToFile("❌ Update install error: " + _0x56b2cc.message);
    return {
      success: false,
      error: _0x56b2cc.message
    };
  }
});
ipcMain.handle("update:install-simple", async _0xa9973c => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    await updateService.installUpdateSimple();
    return {
      success: true
    };
  } catch (_0x196c72) {
    logToFile("❌ Simple update install error: " + _0x196c72.message);
    return {
      success: false,
      error: _0x196c72.message
    };
  }
});
ipcMain.handle("update:get-update-info", async _0x32342c => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x1829d6 = updateService.getUpdateInfo();
    return {
      success: true,
      ..._0x1829d6
    };
  } catch (_0x105867) {
    logToFile("❌ Get update info error: " + _0x105867.message);
    return {
      success: false,
      error: _0x105867.message
    };
  }
});
ipcMain.handle("update:verify-data-integrity", async _0xb4c9c8 => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x3360ae = await updateService.dataProtection.verifyDataIntegrity();
    return {
      success: true,
      integrity: _0x3360ae
    };
  } catch (_0x2f24d8) {
    logToFile("❌ Data integrity check error: " + _0x2f24d8.message);
    return {
      success: false,
      error: _0x2f24d8.message
    };
  }
});
ipcMain.handle("update:create-backup", async _0x6d4f89 => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x48007f = await updateService.dataProtection.createDataBackup();
    return {
      success: true,
      backup: _0x48007f
    };
  } catch (_0x2bd973) {
    logToFile("❌ Create backup error: " + _0x2bd973.message);
    return {
      success: false,
      error: _0x2bd973.message
    };
  }
});
ipcMain.handle("update:get-data-summary", async _0x12b90a => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x2b4cac = updateService.dataProtection.getDataSummary();
    return {
      success: true,
      summary: _0x2b4cac
    };
  } catch (_0x56e7a0) {
    logToFile("❌ Get data summary error: " + _0x56e7a0.message);
    return {
      success: false,
      error: _0x56e7a0.message
    };
  }
});
ipcMain.handle("update:validate-branding", async _0x189112 => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x315f06 = await updateService.brandingProtection.validateBrandingIntegrity();
    return {
      success: true,
      validation: _0x315f06
    };
  } catch (_0x234c7d) {
    logToFile("❌ Branding validation error: " + _0x234c7d.message);
    return {
      success: false,
      error: _0x234c7d.message
    };
  }
});
ipcMain.handle("update:get-branding-summary", async _0x1e33bc => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x38be89 = updateService.brandingProtection.getBrandingSummary();
    return {
      success: true,
      summary: _0x38be89
    };
  } catch (_0x488942) {
    logToFile("❌ Get branding summary error: " + _0x488942.message);
    return {
      success: false,
      error: _0x488942.message
    };
  }
});
ipcMain.handle("update:perform-branding-audit", async _0x10dc6f => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x92720b = await updateService.brandingProtection.performBrandingAudit();
    return {
      success: true,
      audit: _0x92720b
    };
  } catch (_0x586924) {
    logToFile("❌ Branding audit error: " + _0x586924.message);
    return {
      success: false,
      error: _0x586924.message
    };
  }
});
ipcMain.handle("update:lock-branding", async _0x4efc54 => {
  try {
    if (!updateService) {
      return {
        success: false,
        error: "Update service not available"
      };
    }
    const _0x4276ed = await updateService.brandingProtection.lockBrandingElements();
    return {
      success: true,
      result: _0x4276ed
    };
  } catch (_0x2d39a5) {
    logToFile("❌ Lock branding error: " + _0x2d39a5.message);
    return {
      success: false,
      error: _0x2d39a5.message
    };
  }
});
ipcMain.handle("database:delete-all-data", async _0x5d1167 => {
  try {
    logToFile("🗑️ Delete all data request received");
    if (!appService) {
      return {
        success: false,
        error: "App service not available"
      };
    }
    const _0x152e5e = appService.getDatabaseService();
    if (!_0x152e5e) {
      return {
        success: false,
        error: "Database service not available"
      };
    }
    const _0x42732d = await _0x152e5e.query("SELECT session_id FROM whatsapp_sessions");
    const _0x105304 = _0x42732d.success && _0x42732d.data ? _0x42732d.data.map(_0x43c5ad => _0x43c5ad.session_id) : [];
    logToFile("🗑️ Found " + _0x105304.length + " WhatsApp sessions to clean up");
    const _0x473f07 = appService.getWhatsAppService();
    if (_0x473f07 && _0x105304.length > 0) {
      for (const _0x4ac84b of _0x105304) {
        try {
          logToFile("🗑️ Deleting WhatsApp session: " + _0x4ac84b);
          await _0x473f07.deleteSession(_0x4ac84b);
        } catch (_0x5daf86) {
          logToFile("⚠️ Error deleting session " + _0x4ac84b + ": " + _0x5daf86.message);
        }
      }
    }
    const _0x375dee = await _0x152e5e.deleteAllDataExceptTranslations();
    if (telegramService) {
      try {
        logToFile("🗑️ Disconnecting all Telegram sessions...");
        await telegramService.disconnectAll();
        logToFile("✅ Telegram sessions disconnected");
      } catch (_0x49bcfa) {
        logToFile("⚠️ Error disconnecting Telegram sessions: " + _0x49bcfa.message);
      }
    }
    if (_0x375dee.success) {
      logToFile("✅ Delete all data completed: " + _0x375dee.message);
    } else {
      logToFile("❌ Delete all data failed: " + _0x375dee.error);
    }
    return _0x375dee;
  } catch (_0x36b57b) {
    logToFile("❌ Delete all data error: " + _0x36b57b.message);
    return {
      success: false,
      error: _0x36b57b.message
    };
  }
});
function getTG() {
  if (!telegramService) {
    throw new Error("Telegram service not initialized");
  }
  return telegramService;
}
ipcMain.handle("telegram:set-credentials", async (_0x194354, _0x3b9535, _0x4a8c89) => {
  try {
    getTG().setApiCredentials(_0x3b9535, _0x4a8c89);
    return {
      success: true
    };
  } catch (_0x2222ab) {
    return {
      success: false,
      error: _0x2222ab.message
    };
  }
});
ipcMain.handle("telegram:get-sessions", async () => {
  try {
    return {
      success: true,
      sessions: await getTG().getSessions()
    };
  } catch (_0xd14a14) {
    return {
      success: false,
      error: _0xd14a14.message
    };
  }
});
ipcMain.handle("telegram:send-phone-code", async (_0x5db785, _0x3c616f, _0x55a50c, _0x34f02a, _0x5d87ac) => {
  try {
    const _0x55f148 = await Promise.race([getTG().sendPhoneCode(_0x3c616f, _0x55a50c, _0x34f02a, _0x5d87ac), new Promise((_0x541f54, _0x498404) => setTimeout(() => _0x498404(new Error("Connection timed out — check your API credentials and internet connection")), 60000))]);
    return {
      success: true,
      ..._0x55f148
    };
  } catch (_0x1045b6) {
    return {
      success: false,
      error: _0x1045b6.message
    };
  }
});
ipcMain.handle("telegram:verify-code", async (_0x3859ac, _0x271996, _0x55c61c, _0x5cf302) => {
  try {
    return await Promise.race([getTG().verifyCode(_0x271996, _0x55c61c, _0x5cf302), new Promise((_0x48906f, _0x4cf8fd) => setTimeout(() => _0x4cf8fd(new Error("Verification timed out — please try again")), 150000))]);
  } catch (_0x26a17d) {
    return {
      success: false,
      error: _0x26a17d.message
    };
  }
});
ipcMain.handle("telegram:disconnect-session", async (_0xc98deb, _0x652b24) => {
  try {
    await getTG().disconnectSession(_0x652b24);
    return {
      success: true
    };
  } catch (_0x281653) {
    return {
      success: false,
      error: _0x281653.message
    };
  }
});
ipcMain.handle("telegram:reconnect-session", async (_0x507dc9, _0x420c09) => {
  try {
    await getTG().reconnectSessionById(_0x420c09);
    return {
      success: true
    };
  } catch (_0x1f35c0) {
    return {
      success: false,
      error: _0x1f35c0.message
    };
  }
});
ipcMain.handle("telegram:delete-session", async (_0x110f93, _0x306fcd) => {
  try {
    await getTG().deleteSession(_0x306fcd);
    return {
      success: true
    };
  } catch (_0xc2c167) {
    return {
      success: false,
      error: _0xc2c167.message
    };
  }
});
ipcMain.handle("telegram:send-message", async (_0x36b615, _0x7b371, _0x325468, _0x1e53d0, _0x5ae30c) => {
  try {
    return await getTG().sendMessage(_0x7b371, _0x325468, _0x1e53d0, _0x5ae30c || {});
  } catch (_0x2699c5) {
    return {
      success: false,
      error: _0x2699c5.message
    };
  }
});
ipcMain.handle("telegram:send-file", async (_0x4127d3, _0x12f402, _0x453fc6, _0x2b86ef, _0x399a53) => {
  try {
    return await getTG().sendFile(_0x12f402, _0x453fc6, _0x2b86ef, _0x399a53 || "");
  } catch (_0x390b98) {
    return {
      success: false,
      error: _0x390b98.message
    };
  }
});
ipcMain.handle("telegram:get-dialogs", async (_0x1ce61b, _0x81e44c, _0x910e74) => {
  try {
    return {
      success: true,
      dialogs: await getTG().getDialogs(_0x81e44c, _0x910e74 || 50)
    };
  } catch (_0x21261e) {
    return {
      success: false,
      error: _0x21261e.message
    };
  }
});
ipcMain.handle("telegram:get-messages", async (_0x1495cb, _0x1fb0e4, _0x195c6b, _0x277ac2) => {
  try {
    return {
      success: true,
      messages: await getTG().getMessages(_0x1fb0e4, _0x195c6b, _0x277ac2 || 50)
    };
  } catch (_0x269fba) {
    return {
      success: false,
      error: _0x269fba.message
    };
  }
});
ipcMain.handle("telegram:download-media", async (_0x587e44, _0x8918a8, _0x933e13, _0x4e14db) => {
  try {
    const _0x137313 = await getTG().downloadMessageMedia(_0x8918a8, _0x933e13, _0x4e14db);
    return {
      success: true,
      media: _0x137313
    };
  } catch (_0x547489) {
    return {
      success: false,
      error: _0x547489.message
    };
  }
});
ipcMain.handle("telegram:get-groups", async (_0x3cfbbf, _0x4aab86) => {
  try {
    return {
      success: true,
      groups: await getTG().getGroups(_0x4aab86)
    };
  } catch (_0x367f53) {
    return {
      success: false,
      error: _0x367f53.message
    };
  }
});
ipcMain.handle("telegram:broadcast", async (_0xc0c6af, _0x50301a, _0x51f35f, _0x5cb817, _0xe1d565) => {
  try {
    const _0x5ef3ed = await getTG().broadcastMessages(_0x50301a, _0x51f35f, _0x5cb817, _0xe1d565 || 3000, (_0x5a9d62, _0x4186c8, _0x19950f) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("telegram:broadcast-progress", {
          done: _0x5a9d62,
          total: _0x4186c8,
          item: _0x19950f
        });
      }
    });
    return {
      success: true,
      results: _0x5ef3ed
    };
  } catch (_0x2e839e) {
    return {
      success: false,
      error: _0x2e839e.message
    };
  }
});
ipcMain.handle("telegram:get-auto-replies", async (_0x11d86f, _0x2e041) => {
  try {
    return {
      success: true,
      rules: await getTG().getAutoReplies(_0x2e041)
    };
  } catch (_0x4e428f) {
    return {
      success: false,
      error: _0x4e428f.message
    };
  }
});
ipcMain.handle("telegram:save-auto-reply", async (_0x2a43ce, _0xedaefc, _0x10b5f3) => {
  try {
    return await getTG().saveAutoReply(_0xedaefc, _0x10b5f3);
  } catch (_0x5752dc) {
    return {
      success: false,
      error: _0x5752dc.message
    };
  }
});
ipcMain.handle("telegram:delete-auto-reply", async (_0x39d726, _0x1a27e) => {
  try {
    return await getTG().deleteAutoReply(_0x1a27e);
  } catch (_0x22a6e3) {
    return {
      success: false,
      error: _0x22a6e3.message
    };
  }
});
ipcMain.handle("telegram:get-ai-settings", async (_0x42a0ae, _0x189cd0) => {
  try {
    return {
      success: true,
      settings: await getTG().getAISettings(_0x189cd0)
    };
  } catch (_0x3a76f6) {
    return {
      success: false,
      error: _0x3a76f6.message
    };
  }
});
ipcMain.handle("telegram:save-ai-settings", async (_0x2abf6e, _0x552fee, _0x256e4f) => {
  try {
    return await getTG().saveAISettings(_0x552fee, _0x256e4f);
  } catch (_0x5424f9) {
    return {
      success: false,
      error: _0x5424f9.message
    };
  }
});
ipcMain.handle("telegram:get-conversations", async (_0x2fa1c6, _0x4d93e1) => {
  try {
    return {
      success: true,
      conversations: await getTG().getConversations(_0x4d93e1)
    };
  } catch (_0x203813) {
    return {
      success: false,
      error: _0x203813.message
    };
  }
});
ipcMain.handle("telegram:get-chat-messages", async (_0x40ab4c, _0x5cad3a, _0x4e968e, _0x5e757e, _0x23b70a) => {
  try {
    return {
      success: true,
      messages: await getTG().getChatMessages(_0x5cad3a, _0x4e968e, _0x5e757e || 50, _0x23b70a || 0)
    };
  } catch (_0x22407f) {
    return {
      success: false,
      error: _0x22407f.message
    };
  }
});
ipcMain.handle("telegram:upsert-conversation", async (_0x23e685, _0x3618c0, _0x35a4c1, _0x9aaa70) => {
  try {
    await getTG().upsertConversation(_0x3618c0, _0x35a4c1, _0x9aaa70);
    return {
      success: true
    };
  } catch (_0xe76678) {
    return {
      success: false,
      error: _0xe76678.message
    };
  }
});
const _tgMsgUnsubs = new Map();
ipcMain.handle("telegram:subscribe-messages", async (_0x277fee, _0x2e1549) => {
  try {
    if (_tgMsgUnsubs.has(_0x2e1549)) {
      _tgMsgUnsubs.get(_0x2e1549)();
      _tgMsgUnsubs.delete(_0x2e1549);
    }
    const _0xbd2f1c = getTG().onMessage(_0x2e1549, _0x39d539 => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("telegram:message-new", _0x39d539);
      }
    });
    if (typeof _0xbd2f1c === "function") {
      _tgMsgUnsubs.set(_0x2e1549, _0xbd2f1c);
    }
    return {
      success: true
    };
  } catch (_0x3a86b6) {
    return {
      success: false,
      error: _0x3a86b6.message
    };
  }
});
app.on("before-quit", () => {
  if (notificationService) {
    notificationService.stop();
  }
  if (backgroundLicenseValidator) {
    backgroundLicenseValidator.stop();
  }
  if (cloudLicenseService) {
    cloudLicenseService.stopPeriodicValidation();
  }
  if (updateService) {
    updateService.destroy();
  }
});
logToFile("✅ Electron main process setup complete");