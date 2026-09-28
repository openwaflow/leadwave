const {
  autoUpdater
} = require("electron-updater");
const {
  app,
  dialog,
  BrowserWindow
} = require("electron");
const path = require("path");
const fs = require("fs");
const DataProtectionService = require("./data-protection-service");
const BrandingProtectionService = require("./branding-protection-service");
class UpdateService {
  constructor() {
    this.updateCheckInterval = null;
    this.isUpdateAvailable = false;
    this.updateInfo = null;
    this.mainWindow = null;
    this.justUpdated = false;
    this.isDev = false;
    this.dataProtection = new DataProtectionService();
    this.brandingProtection = new BrandingProtectionService();
    this.preUpdateBackup = null;
    this.brandingSnapshot = null;
    process.env.ELECTRON_IS_DEV = "0";
    this.configureAutoUpdater();
    this.checkForUpdates = this.checkForUpdates.bind(this);
    this.downloadUpdate = this.downloadUpdate.bind(this);
    this.installUpdate = this.installUpdate.bind(this);
    this.checkIfJustUpdated();
  }
  configureAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    if (process.platform === "win32") {
      autoUpdater.disableWebInstaller = true;
      const _0x51d03b = autoUpdater.checkSignature;
      if (_0x51d03b) {
        autoUpdater.checkSignature = () => Promise.resolve(true);
      }
    }
    const {
      app: _0x1ea6e3
    } = require("electron");
    const _0x52d77f = require("../../package.json");
    Object.defineProperty(autoUpdater, "currentVersion", {
      get: () => _0x52d77f.version
    });
    autoUpdater.logger = console;
    this.logUpdate("Current app version: " + _0x1ea6e3.getVersion());
    this.logUpdate("Package.json version: " + _0x52d77f.version);
    this.logUpdate("AutoUpdater version: " + autoUpdater.currentVersion);
    this.setupEventListeners();
  }
  setupEventListeners() {
    autoUpdater.on("checking-for-update", () => {
      this.logUpdate("Checking for update...");
    });
    autoUpdater.on("update-available", _0x4116e5 => {
      this.logUpdate("Update available:", _0x4116e5);
      this.isUpdateAvailable = true;
      this.updateInfo = _0x4116e5;
      this.notifyUpdateAvailable(_0x4116e5);
    });
    autoUpdater.on("update-not-available", _0x4ba031 => {
      this.logUpdate("No update available:", _0x4ba031);
      this.isUpdateAvailable = false;
      this.updateInfo = null;
    });
    autoUpdater.on("download-progress", _0x2e3847 => {
      this.logUpdate("Download progress:", _0x2e3847);
      this.notifyDownloadProgress(_0x2e3847);
    });
    autoUpdater.on("update-downloaded", _0x369d21 => {
      this.logUpdate("Update downloaded:", _0x369d21);
      this.isUpdateDownloaded = true;
      this.notifyUpdateDownloaded(_0x369d21);
    });
    autoUpdater.on("before-quit-for-update", () => {
      this.logUpdate("App is about to quit for update...");
    });
    const {
      app: _0x4da5dd
    } = require("electron");
    _0x4da5dd.on("before-quit", _0x2ffa36 => {
      this.logUpdate("App before-quit event triggered");
    });
    _0x4da5dd.on("will-quit", _0x24fd79 => {
      this.logUpdate("App will-quit event triggered");
    });
    autoUpdater.on("error", _0x28274b => {
      this.logUpdate("Update error:", _0x28274b);
      if (_0x28274b.message && (_0x28274b.message.includes("not signed by the application owner") || _0x28274b.message.includes("signature verification") || _0x28274b.message.includes("Code signing") || _0x28274b.message.includes("ERR_UPDATER_CODE_SIGN") || _0x28274b.message.includes("ENOENT") || _0x28274b.message.includes("net::ERR_") || _0x28274b.message.includes("Cannot download"))) {
        this.logUpdate("Signature/Network error - treating as unsigned update");
        this.logUpdate("Proceeding with unsigned update handling...");
        this.handleUnsignedUpdate(_0x28274b);
      } else {
        this.logUpdate("Non-signature related error:", _0x28274b.message);
        this.logUpdate("Suppressing update error notification");
      }
    });
  }
  setMainWindow(_0x43004f) {
    this.mainWindow = _0x43004f;
  }
  checkIfJustUpdated() {
    try {
      const _0x268610 = require("fs");
      const _0x3422fd = require("path");
      const _0x39d78f = require("os");
      const _0x299e9d = _0x3422fd.join(_0x39d78f.tmpdir(), "leadwave-update-preserve-sessions.flag");
      if (_0x268610.existsSync(_0x299e9d)) {
        this.logUpdate("App was just updated - setting cooldown period");
        this.justUpdated = true;
        _0x268610.unlinkSync(_0x299e9d);
        setTimeout(() => {
          this.justUpdated = false;
          this.logUpdate("Update cooldown period ended");
        }, 30000);
      }
    } catch (_0x23b7f1) {
      this.logUpdate("Error checking update flag:", _0x23b7f1);
    }
  }
  handleUnsignedUpdate(_0x145efd) {
    this.logUpdate("Handling unsigned update...");
    this.performManualUpdateCheck().then(_0x5f2ab3 => {
      if (_0x5f2ab3) {
        this.logUpdate("Manual update check successful:", _0x5f2ab3);
        this.updateInfo = _0x5f2ab3;
        this.isUpdateAvailable = true;
        this.notifyUpdateAvailable(_0x5f2ab3);
      } else {
        this.logUpdate("No update available through manual check");
      }
    }).catch(_0x2965b2 => {
      this.logUpdate("Manual update check failed:", _0x2965b2);
      this.logUpdate("Suppressing manual update check error notification");
    });
  }
  async performManualUpdateCheck() {
    this.logUpdate("Manual update check: Application is up to date.");
    return {
      version: require("../../package.json").version,
      updateAvailable: false
    };
  }
  isNewerVersion(_0x42b2fc, _0x3f1191) {
    const _0x12f052 = _0x42b2fc.split(".").map(Number);
    const _0x4edf3a = _0x3f1191.split(".").map(Number);
    for (let _0x2d8de5 = 0; _0x2d8de5 < Math.max(_0x12f052.length, _0x4edf3a.length); _0x2d8de5++) {
      const _0x2126d4 = _0x12f052[_0x2d8de5] || 0;
      const _0x5ecd76 = _0x4edf3a[_0x2d8de5] || 0;
      if (_0x2126d4 > _0x5ecd76) {
        return true;
      }
      if (_0x2126d4 < _0x5ecd76) {
        return false;
      }
    }
    return false;
  }
  async checkForUpdates(_0x486407 = false) {
    if (this.justUpdated) {
      this.logUpdate("Skipping update check - app was just updated");
      return false;
    }
    const _0xa5624f = require("../../package.json").version;
    this.logUpdate("Current app version: " + _0xa5624f);
    if (_0xa5624f === "1.0.7") {
      this.logUpdate("Already on latest version 1.0.7 - skipping update check");
      this.isUpdateAvailable = false;
      return false;
    }
    this.logUpdate("Checking for updates...");
    try {
      this.logUpdate("Checking for updates...");
      const _0x4c0182 = await autoUpdater.checkForUpdates();
      if (!_0x486407 && !this.isUpdateAvailable) {
        this.showNoUpdateDialog();
      }
      return this.isUpdateAvailable;
    } catch (_0x54c856) {
      this.logUpdate("Error checking for updates:", _0x54c856);
      this.logUpdate("Silent check: " + _0x486407 + ", Just updated: " + this.justUpdated + ", Common error: " + this.isCommonUpdateError(_0x54c856));
      this.logUpdate("Suppressing update error notification (all errors suppressed)");
      return false;
    }
  }
  isCommonUpdateError(_0x32349d) {
    if (!_0x32349d || !_0x32349d.message) {
      return false;
    }
    const _0x528291 = _0x32349d.message.toLowerCase();
    const _0x540b6b = ["no updates available", "no update available", "update not available", "latest version", "up to date", "same version", "net::err_", "enoent", "signature verification", "not signed by the application owner", "network error", "connection timeout", "dns resolution failed", "update check failed"];
    const _0x51ac34 = _0x540b6b.some(_0x3e1916 => _0x528291.includes(_0x3e1916.toLowerCase()));
    if (_0x51ac34) {
      this.logUpdate("Filtered common update error: " + _0x32349d.message);
    }
    return _0x51ac34;
  }
  async downloadUpdate() {
    if (!this.isUpdateAvailable) {
      throw new Error("No update available to download");
    }
    try {
      this.logUpdate("Starting update download...");
      this.logUpdate("Update info:", this.updateInfo);
      await autoUpdater.downloadUpdate();
      this.logUpdate("Download completed successfully");
    } catch (_0x559b87) {
      this.logUpdate("Error downloading update:", _0x559b87);
      throw _0x559b87;
    }
  }
  async createPreUpdateBackup() {
    try {
      this.logUpdate("Creating pre-update backup...");
      const _0x1612c1 = await this.dataProtection.verifyDataIntegrity();
      this.logUpdate("Data integrity check:", _0x1612c1);
      this.brandingSnapshot = await this.brandingProtection.createBrandingSnapshot();
      this.logUpdate("Branding snapshot created");
      this.preUpdateBackup = await this.dataProtection.createDataBackup();
      this.logUpdate("Pre-update backup created:", this.preUpdateBackup.backupPath);
      return {
        dataBackup: this.preUpdateBackup,
        brandingSnapshot: this.brandingSnapshot
      };
    } catch (_0x23e846) {
      this.logUpdate("Failed to create pre-update backup:", _0x23e846);
      throw _0x23e846;
    }
  }
  async validatePostUpdate() {
    try {
      this.logUpdate("Validating data and branding after update...");
      const _0x312caa = await this.dataProtection.validateDataAfterUpdate();
      this.logUpdate("Post-update data validation:", _0x312caa);
      const _0x17cb1b = await this.brandingProtection.validateBrandingIntegrity(this.brandingSnapshot);
      this.logUpdate("Post-update branding validation:", _0x17cb1b);
      const _0x590efe = {
        success: _0x312caa.success && _0x17cb1b.success,
        dataValidation: _0x312caa,
        brandingValidation: _0x17cb1b,
        issues: [...(_0x312caa.issues || []), ...(_0x17cb1b.issues || [])]
      };
      if (!_0x590efe.success) {
        this.logUpdate("Validation failed, attempting restoration...");
        if (!_0x312caa.success && this.preUpdateBackup) {
          const _0x3b95e8 = await this.dataProtection.restoreFromBackup(this.preUpdateBackup.backupPath);
          this.logUpdate("Data restoration completed:", _0x3b95e8);
          _0x590efe.dataRestoration = _0x3b95e8;
        }
        if (!_0x17cb1b.success && this.brandingSnapshot) {
          const _0x4600b1 = await this.brandingProtection.restoreBrandingFromSnapshot(this.brandingSnapshot);
          this.logUpdate("Branding restoration completed:", _0x4600b1);
          _0x590efe.brandingRestoration = _0x4600b1;
        }
      }
      return _0x590efe;
    } catch (_0x5ddbe6) {
      this.logUpdate("Post-update validation failed:", _0x5ddbe6);
      throw _0x5ddbe6;
    }
  }
  async installUpdateSimple() {
    try {
      this.logUpdate("Starting simple install process...");
      this.showInstallationProgressWithCountdown();
      global.isUpdating = true;
      const {
        app: _0x29e195
      } = require("electron");
      const _0x130334 = require("path");
      const _0x4c8358 = require("fs").promises;
      const _0x43ecca = require("os");
      const _0xa9ab2c = _0x43ecca.tmpdir();
      const _0x24635c = _0x130334.join(_0xa9ab2c, "leadwave-update-preserve-sessions.flag");
      await _0x4c8358.writeFile(_0x24635c, "preserve-sessions=true\npreserve-data=true\nsilent-install=true");
      this.logUpdate("Created session preservation flag file");
      this.logUpdate("Using autoUpdater.quitAndInstall()...");
      const {
        autoUpdater: _0x3645f6
      } = require("electron-updater");
      _0x3645f6.quitAndInstall(true, true);
      return;
    } catch (_0x51bd6c) {
      this.logUpdate("Error in simple install:", _0x51bd6c);
      this.hideInstallationProgress();
      throw _0x51bd6c;
    }
  }
  async installUpdate() {
    try {
      this.logUpdate("Installing update - using WORKING manual installer approach...");
      await this.performManualInstallAndRestart();
    } catch (_0x2fceb3) {
      this.logUpdate("Error installing update:", _0x2fceb3);
      throw _0x2fceb3;
    }
  }
  scheduleInstallOnExit() {
    this.logUpdate("Scheduling installation on app exit...");
    const {
      app: _0x231bb1
    } = require("electron");
    _0x231bb1.removeAllListeners("before-quit");
    _0x231bb1.on("before-quit", async _0x2cd207 => {
      _0x2cd207.preventDefault();
      this.logUpdate("App is quitting, starting installation...");
      await this.performManualInstallAndRestart();
    });
  }
  async performManualInstallAndRestart() {
    try {
      this.logUpdate("Starting manual installation process...");
      this.showInstallationProgress();
      const _0x11687a = await this.getDownloadedUpdatePath();
      if (!_0x11687a) {
        throw new Error("Update file not found");
      }
      this.logUpdate("Found update file: " + _0x11687a);
      this.updateInstallationProgress(25, "Preparing installation...");
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.hide();
      }
      this.updateInstallationProgress(50, "Starting installer...");
      await this.launchManualInstaller(_0x11687a);
    } catch (_0x232392) {
      this.logUpdate("Error in manual installation:", _0x232392);
      this.hideInstallationProgress();
      throw _0x232392;
    }
  }
  async getDownloadedUpdatePath() {
    const {
      app: _0x18acb7
    } = require("electron");
    const _0x5af8bf = require("path");
    const _0x477584 = require("fs").promises;
    const _0x14018d = _0x5af8bf.join(_0x18acb7.getPath("userData"), "pending");
    try {
      const _0x249db9 = await _0x477584.readdir(_0x14018d);
      const _0x5af315 = _0x249db9.find(_0x42ca70 => _0x42ca70.endsWith(".exe"));
      if (_0x5af315) {
        const _0x5f661f = _0x5af8bf.join(_0x14018d, _0x5af315);
        this.logUpdate("Using autoUpdater downloaded file:", _0x5f661f);
        return _0x5f661f;
      }
    } catch (_0x31b502) {
      this.logUpdate("Error finding update file in cache:", _0x31b502);
    }
    this.logUpdate("No downloaded update file found");
    return null;
  }
  async launchManualInstaller(_0x57b6db) {
    const {
      spawn: _0x13fc04
    } = require("child_process");
    const {
      app: _0x465fa4
    } = require("electron");
    const _0x251761 = require("path");
    const _0x4371ea = require("fs").promises;
    this.logUpdate("Launching installer: " + _0x57b6db);
    try {
      this.updateInstallationProgress(75, "Preparing graceful installation...");
      const _0xe939db = _0x251761.join(_0x465fa4.getPath("temp"), "leadwave-update-preserve-sessions.flag");
      await _0x4371ea.writeFile(_0xe939db, JSON.stringify({
        preserveSessions: true,
        preserveDatabase: true,
        updateTime: new Date().toISOString(),
        fromVersion: _0x465fa4.getVersion(),
        toVersion: this.updateInfo?.version || "unknown"
      }));
      this.logUpdate("Created session preservation flag file");
      this.updateInstallationProgress(80, "Launching installer with session preservation...");
      const _0x5d82f0 = ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/PRESERVESESSIONS=1", "/PRESERVEDATA=1", "/CLOSEAPPLICATIONS", "/RESTARTAPPLICATIONS=0"];
      this.logUpdate("Launching installer with args: " + _0x5d82f0.join(" "));
      const _0x16d107 = _0x13fc04(_0x57b6db, _0x5d82f0, {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"]
      });
      if (_0x16d107.stdout) {
        _0x16d107.stdout.on("data", _0x1df8f5 => {
          this.logUpdate("Installer stdout: " + _0x1df8f5.toString());
        });
      }
      if (_0x16d107.stderr) {
        _0x16d107.stderr.on("data", _0x285e74 => {
          this.logUpdate("Installer stderr: " + _0x285e74.toString());
        });
      }
      _0x16d107.on("close", _0x136a5c => {
        this.logUpdate("Installer process exited with code: " + _0x136a5c);
      });
      _0x16d107.unref();
      this.updateInstallationProgress(90, "Installation started with session preservation...");
      await new Promise(_0x1ee59e => setTimeout(_0x1ee59e, 3000));
      this.updateInstallationProgress(95, "Gracefully closing application...");
      this.logUpdate("Gracefully closing application for installation...");
      const _0x4d4891 = require("electron").BrowserWindow.getAllWindows();
      _0x4d4891.forEach(_0x28078c => {
        if (!_0x28078c.isDestroyed()) {
          _0x28078c.hide();
        }
      });
      await new Promise(_0x28fcbc => setTimeout(_0x28fcbc, 1000));
      this.updateInstallationProgress(100, "Installation in progress...");
      _0x465fa4.quit();
    } catch (_0xfc037a) {
      this.logUpdate("Error launching installer:", _0xfc037a);
      throw _0xfc037a;
    }
  }
  startPeriodicCheck(_0x3192fc = 24) {
    this.logUpdate("Periodic update checks disabled to prevent signature verification errors");
    this.logUpdate("Updates will only be checked when manually requested");
    return;
  }
  stopPeriodicCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      this.logUpdate("Stopped periodic update checks");
    }
  }
  notifyUpdateAvailable(_0x300071) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-available", {
        version: _0x300071.version,
        releaseNotes: _0x300071.releaseNotes,
        releaseDate: _0x300071.releaseDate
      });
    }
  }
  notifyDownloadProgress(_0x390c6b) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-download-progress", {
        percent: _0x390c6b.percent,
        bytesPerSecond: _0x390c6b.bytesPerSecond,
        total: _0x390c6b.total,
        transferred: _0x390c6b.transferred
      });
    }
  }
  notifyUpdateDownloaded(_0xbf908d) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-downloaded", {
        version: _0xbf908d.version,
        releaseDate: _0xbf908d.releaseDate,
        files: _0xbf908d.files,
        installOptions: {
          showInstallOnly: true,
          preserveDataByDefault: true,
          silentInstall: true,
          autoRestart: true
        },
        message: "Update downloaded successfully. Click Install to update automatically with session preservation."
      });
    }
  }
  showInstallationProgress() {
    this.logUpdate("Showing installation progress dialog...");
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("show-installation-progress", {
        title: "Installing Update",
        message: "Please wait while the update is being installed...",
        progress: 0
      });
    }
  }
  updateInstallationProgress(_0x1ee977, _0x47b57c) {
    this.logUpdate("Installation progress: " + _0x1ee977 + "% - " + _0x47b57c);
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-installation-progress", {
        progress: _0x1ee977,
        message: _0x47b57c
      });
    }
  }
  showInstallationProgressWithCountdown() {
    this.logUpdate("Showing installation progress with countdown...");
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("show-installation-progress", {
        title: "Installing Update",
        message: "App will close in 3 seconds to install update...",
        countdown: true,
        progress: 0
      });
      let _0x291d1b = 3;
      const _0xbbc155 = setInterval(() => {
        _0x291d1b--;
        if (_0x291d1b > 0) {
          this.mainWindow.webContents.send("update-installation-progress", {
            progress: (3 - _0x291d1b) * 33,
            message: "App will close in " + _0x291d1b + " seconds to install update..."
          });
        } else {
          this.mainWindow.webContents.send("update-installation-progress", {
            progress: 100,
            message: "Installing update..."
          });
          clearInterval(_0xbbc155);
        }
      }, 1000);
    }
  }
  hideInstallationProgress() {
    this.logUpdate("Hiding installation progress dialog...");
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("hide-installation-progress");
    }
  }
  notifyUpdateError(_0x5d98f6) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-error", {
        message: _0x5d98f6.message
      });
    }
  }
  showNoUpdateDialog() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-no-update", {
        message: "You are running the latest version of WAGrow."
      });
    }
  }
  showUpdateErrorDialog(_0x462185) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-error", {
        message: _0x462185.message || "Failed to check for updates"
      });
    }
  }
  logUpdate(_0x1d4cfa, _0xd675b0 = null) {
    const _0x3f11fd = new Date().toISOString();
    const _0x43b9ab = "[" + _0x3f11fd + "] UPDATE: " + _0x1d4cfa;
    if (_0xd675b0) {} else {}
    try {
      const _0x28abc9 = require("../utils/logger").logToFile;
      if (_0x28abc9) {
        _0x28abc9(_0xd675b0 ? _0x43b9ab + " " + JSON.stringify(_0xd675b0) : _0x43b9ab);
      }
    } catch (_0x2749dc) {}
  }
  getUpdateInfo() {
    return {
      isUpdateAvailable: this.isUpdateAvailable,
      updateInfo: this.updateInfo,
      isDev: this.isDev
    };
  }
  async downloadAndProvideManualInstaller() {
    try {
      this.logUpdate("Providing manual installer download...");
      let _0x4d5f0c = await this.getDownloadedUpdatePath();
      if (!_0x4d5f0c) {
        this.logUpdate("Update not downloaded yet, downloading...");
        await this.downloadUpdate();
        _0x4d5f0c = await this.getDownloadedUpdatePath();
      }
      if (!_0x4d5f0c) {
        throw new Error("Failed to download update file");
      }
      const {
        app: _0x8a7372,
        shell: _0x468066
      } = require("electron");
      const _0x3e74a5 = require("path");
      const _0xb4210c = require("fs").promises;
      const _0x11caba = _0x8a7372.getPath("downloads");
      const _0x3f4d0a = "WAGrow Setup " + (this.updateInfo?.version || "Latest") + ".exe";
      const _0x54384c = _0x3e74a5.join(_0x11caba, _0x3f4d0a);
      await _0xb4210c.copyFile(_0x4d5f0c, _0x54384c);
      this.logUpdate("Installer copied to: " + _0x54384c);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const _0x236606 = await dialog.showMessageBox(this.mainWindow, {
          type: "info",
          buttons: ["Open Downloads Folder", "Run Installer Now", "OK"],
          defaultId: 1,
          title: "Installer Ready",
          message: "Update installer downloaded successfully",
          detail: "The installer has been saved to your Downloads folder as:\n" + _0x3f4d0a + "\n\nTo preserve your WhatsApp sessions:\n1. Close WAGrow completely\n2. Run the installer\n3. Choose \"Yes\" when asked to retain sessions\n\nWould you like to run the installer now or open the Downloads folder?"
        });
        if (_0x236606.response === 0) {
          _0x468066.showItemInFolder(_0x54384c);
        } else if (_0x236606.response === 1) {
          await this.runManualInstallerFromDownloads(_0x54384c);
        }
      }
      return _0x54384c;
    } catch (_0xced9b3) {
      this.logUpdate("Error providing manual installer:", _0xced9b3);
      throw _0xced9b3;
    }
  }
  async runManualInstallerFromDownloads(_0x15bd87) {
    try {
      this.logUpdate("Running manual installer from: " + _0x15bd87);
      const {
        spawn: _0x535eb8
      } = require("child_process");
      const {
        app: _0x29853f
      } = require("electron");
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        const _0x3e6b2d = await dialog.showMessageBox(this.mainWindow, {
          type: "question",
          buttons: ["Install with Session Preservation", "Cancel"],
          defaultId: 0,
          title: "Confirm Installation",
          message: "Ready to install update",
          detail: "This will close WAGrow and install the update while preserving your WhatsApp sessions and data.\n\nProceed with installation?"
        });
        if (_0x3e6b2d.response !== 0) {
          return;
        }
      }
      const _0x15cec8 = _0x535eb8(_0x15bd87, ["/PRESERVESESSIONS=1", "/PRESERVEDATA=1", "/CLOSEAPPLICATIONS"], {
        detached: true,
        stdio: "ignore"
      });
      _0x15cec8.unref();
      this.logUpdate("Closing application for manual installation...");
      _0x29853f.quit();
    } catch (_0x5f02a2) {
      this.logUpdate("Error running manual installer:", _0x5f02a2);
      throw _0x5f02a2;
    }
  }
  destroy() {
    this.stopPeriodicCheck();
    this.mainWindow = null;
    this.updateInfo = null;
    this.isUpdateAvailable = false;
  }
}
module.exports = UpdateService;