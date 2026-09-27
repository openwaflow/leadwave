const fs = require("fs");
const path = require("path");
const os = require("os");
class DataProtectionService {
  constructor() {
    this.userDataPaths = this.getUserDataPaths();
    this.protectedFiles = this.getProtectedFiles();
    this.protectedDirectories = this.getProtectedDirectories();
  }
  getUserDataPaths() {
    const {
      app: _0x39fcf9
    } = require("electron");
    const _0x3da3b6 = _0x39fcf9.getPath("userData");
    const _0xe65f9 = path.join(os.homedir(), "Lead Wave");
    return {
      current: _0x3da3b6,
      legacy: _0xe65f9,
      database: path.join(_0x3da3b6, "leadwave.db"),
      authSessions: path.join(_0x3da3b6, "auth_sessions"),
      settings: path.join(_0x3da3b6, "settings.json"),
      logs: path.join(_0x3da3b6, "logs"),
      backups: path.join(_0x3da3b6, "backups"),
      temp: path.join(_0x3da3b6, "temp"),
      voiceTranscriptions: path.join(_0x3da3b6, "voice-transcriptions")
    };
  }
  getProtectedFiles() {
    return ["leadwave.db", "leadwave.db-wal", "leadwave.db-shm", "settings.json", "license.json", "app-settings.json", "window-state.json", "user-preferences.json"];
  }
  getProtectedDirectories() {
    return ["auth_sessions", "logs", "backups", "temp", "voice-transcriptions", "exports", "imports", "media", "attachments"];
  }
  async verifyDataIntegrity() {
    try {
      const _0x3154af = {
        userDataExists: false,
        databaseExists: false,
        authSessionsExist: false,
        settingsExist: false,
        protectedPaths: [],
        issues: []
      };
      if (fs.existsSync(this.userDataPaths.current)) {
        _0x3154af.userDataExists = true;
        _0x3154af.protectedPaths.push(this.userDataPaths.current);
      }
      if (fs.existsSync(this.userDataPaths.legacy)) {
        _0x3154af.protectedPaths.push(this.userDataPaths.legacy);
        _0x3154af.issues.push("Legacy Lead Wave directory found - consider migration");
      }
      if (fs.existsSync(this.userDataPaths.database)) {
        _0x3154af.databaseExists = true;
        const _0x2acb14 = fs.statSync(this.userDataPaths.database);
        if (_0x2acb14.size === 0) {
          _0x3154af.issues.push("Database file is empty");
        }
      }
      if (fs.existsSync(this.userDataPaths.authSessions)) {
        _0x3154af.authSessionsExist = true;
        const _0x5bcc32 = fs.readdirSync(this.userDataPaths.authSessions);
        if (_0x5bcc32.length === 0) {
          _0x3154af.issues.push("No authentication sessions found");
        }
      }
      if (fs.existsSync(this.userDataPaths.settings)) {
        _0x3154af.settingsExist = true;
        try {
          const _0xf02776 = JSON.parse(fs.readFileSync(this.userDataPaths.settings, "utf8"));
          if (Object.keys(_0xf02776).length === 0) {
            _0x3154af.issues.push("Settings file is empty");
          }
        } catch (_0x1a1a5c) {
          _0x3154af.issues.push("Settings file is corrupted");
        }
      }
      for (const _0x3c51a0 of this.protectedFiles) {
        const _0x1bd647 = path.join(this.userDataPaths.current, _0x3c51a0);
        if (fs.existsSync(_0x1bd647)) {
          _0x3154af.protectedPaths.push(_0x1bd647);
        }
      }
      for (const _0x57f6be of this.protectedDirectories) {
        const _0x47b15b = path.join(this.userDataPaths.current, _0x57f6be);
        if (fs.existsSync(_0x47b15b)) {
          _0x3154af.protectedPaths.push(_0x47b15b);
        }
      }
      return _0x3154af;
    } catch (_0x54f732) {
      throw new Error("Failed to verify data integrity: " + _0x54f732.message);
    }
  }
  async createDataBackup(_0x480e6f = null) {
    try {
      if (!_0x480e6f) {
        const _0x3f540c = new Date().toISOString().replace(/[:.]/g, "-");
        _0x480e6f = path.join(this.userDataPaths.current, "backups", "pre-update-" + _0x3f540c);
      }
      if (!fs.existsSync(path.dirname(_0x480e6f))) {
        fs.mkdirSync(path.dirname(_0x480e6f), {
          recursive: true
        });
      }
      const _0x5f32d3 = {
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown",
        backupPath: _0x480e6f,
        files: [],
        directories: []
      };
      for (const _0x231098 of this.protectedFiles) {
        const _0x567b83 = path.join(this.userDataPaths.current, _0x231098);
        if (fs.existsSync(_0x567b83)) {
          const _0x225846 = path.join(_0x480e6f, _0x231098);
          if (!fs.existsSync(path.dirname(_0x225846))) {
            fs.mkdirSync(path.dirname(_0x225846), {
              recursive: true
            });
          }
          fs.copyFileSync(_0x567b83, _0x225846);
          _0x5f32d3.files.push(_0x231098);
        }
      }
      for (const _0x3b6705 of this.protectedDirectories) {
        const _0x2793dd = path.join(this.userDataPaths.current, _0x3b6705);
        if (fs.existsSync(_0x2793dd)) {
          const _0x4aa785 = path.join(_0x480e6f, _0x3b6705);
          await this.copyDirectory(_0x2793dd, _0x4aa785);
          _0x5f32d3.directories.push(_0x3b6705);
        }
      }
      const _0x491785 = path.join(_0x480e6f, "backup-info.json");
      fs.writeFileSync(_0x491785, JSON.stringify(_0x5f32d3, null, 2));
      return _0x5f32d3;
    } catch (_0x4a45a0) {
      throw new Error("Failed to create data backup: " + _0x4a45a0.message);
    }
  }
  async copyDirectory(_0xdc6754, _0x21743c) {
    try {
      if (!fs.existsSync(_0x21743c)) {
        fs.mkdirSync(_0x21743c, {
          recursive: true
        });
      }
      const _0x49fb24 = fs.readdirSync(_0xdc6754);
      for (const _0x529f7e of _0x49fb24) {
        const _0x350510 = path.join(_0xdc6754, _0x529f7e);
        const _0x522e9d = path.join(_0x21743c, _0x529f7e);
        const _0x321ae3 = fs.statSync(_0x350510);
        if (_0x321ae3.isDirectory()) {
          await this.copyDirectory(_0x350510, _0x522e9d);
        } else {
          fs.copyFileSync(_0x350510, _0x522e9d);
        }
      }
    } catch (_0x399524) {
      throw new Error("Failed to copy directory " + _0xdc6754 + ": " + _0x399524.message);
    }
  }
  async validateDataAfterUpdate() {
    try {
      const _0x53ab8d = {
        success: true,
        issues: [],
        restoredFiles: [],
        missingFiles: []
      };
      const _0x2966a9 = ["leadwave.db", "license.json"];
      for (const _0x20d3d7 of _0x2966a9) {
        const _0x33c7fa = path.join(this.userDataPaths.current, _0x20d3d7);
        if (!fs.existsSync(_0x33c7fa)) {
          _0x53ab8d.success = false;
          _0x53ab8d.missingFiles.push(_0x20d3d7);
          _0x53ab8d.issues.push("Critical file missing: " + _0x20d3d7);
        }
      }
      if (fs.existsSync(this.userDataPaths.database)) {
        const _0x308a4b = fs.statSync(this.userDataPaths.database);
        if (_0x308a4b.size === 0) {
          _0x53ab8d.success = false;
          _0x53ab8d.issues.push("Database file is empty after update");
        }
      }
      if (!fs.existsSync(this.userDataPaths.authSessions)) {
        fs.mkdirSync(this.userDataPaths.authSessions, {
          recursive: true
        });
        _0x53ab8d.restoredFiles.push("auth_sessions directory");
      }
      return _0x53ab8d;
    } catch (_0x3c5b87) {
      throw new Error("Failed to validate data after update: " + _0x3c5b87.message);
    }
  }
  async restoreFromBackup(_0x411380) {
    try {
      if (!fs.existsSync(_0x411380)) {
        throw new Error("Backup path does not exist: " + _0x411380);
      }
      const _0x1422e2 = path.join(_0x411380, "backup-info.json");
      if (!fs.existsSync(_0x1422e2)) {
        throw new Error("Backup info file not found");
      }
      const _0x3b38ca = JSON.parse(fs.readFileSync(_0x1422e2, "utf8"));
      const _0xa75c45 = {
        timestamp: new Date().toISOString(),
        backupTimestamp: _0x3b38ca.timestamp,
        restoredFiles: [],
        restoredDirectories: [],
        errors: []
      };
      for (const _0x5deacb of _0x3b38ca.files) {
        try {
          const _0x2bd83f = path.join(_0x411380, _0x5deacb);
          const _0x36c2c8 = path.join(this.userDataPaths.current, _0x5deacb);
          if (fs.existsSync(_0x2bd83f)) {
            if (!fs.existsSync(path.dirname(_0x36c2c8))) {
              fs.mkdirSync(path.dirname(_0x36c2c8), {
                recursive: true
              });
            }
            fs.copyFileSync(_0x2bd83f, _0x36c2c8);
            _0xa75c45.restoredFiles.push(_0x5deacb);
          }
        } catch (_0x110899) {
          _0xa75c45.errors.push("Failed to restore file " + _0x5deacb + ": " + _0x110899.message);
        }
      }
      for (const _0x1862e3 of _0x3b38ca.directories) {
        try {
          const _0x4b2a41 = path.join(_0x411380, _0x1862e3);
          const _0x299626 = path.join(this.userDataPaths.current, _0x1862e3);
          if (fs.existsSync(_0x4b2a41)) {
            await this.copyDirectory(_0x4b2a41, _0x299626);
            _0xa75c45.restoredDirectories.push(_0x1862e3);
          }
        } catch (_0x56ebc1) {
          _0xa75c45.errors.push("Failed to restore directory " + _0x1862e3 + ": " + _0x56ebc1.message);
        }
      }
      return _0xa75c45;
    } catch (_0x3c7716) {
      throw new Error("Failed to restore from backup: " + _0x3c7716.message);
    }
  }
  async cleanupOldBackups(_0x4d6b41 = 30) {
    try {
      const _0x126b09 = path.join(this.userDataPaths.current, "backups");
      if (!fs.existsSync(_0x126b09)) {
        return {
          cleaned: 0,
          errors: []
        };
      }
      const _0x577602 = {
        cleaned: 0,
        errors: [],
        totalSize: 0
      };
      const _0x3ba5ed = fs.readdirSync(_0x126b09);
      const _0x485573 = new Date();
      _0x485573.setDate(_0x485573.getDate() - _0x4d6b41);
      for (const _0x5ca26d of _0x3ba5ed) {
        try {
          const _0x3f72e4 = path.join(_0x126b09, _0x5ca26d);
          const _0x3395a5 = fs.statSync(_0x3f72e4);
          if (_0x3395a5.isDirectory() && _0x3395a5.mtime < _0x485573) {
            const _0x2cdbd0 = await this.getDirectorySize(_0x3f72e4);
            _0x577602.totalSize += _0x2cdbd0;
            fs.rmSync(_0x3f72e4, {
              recursive: true,
              force: true
            });
            _0x577602.cleaned++;
          }
        } catch (_0x5c7f65) {
          _0x577602.errors.push("Failed to clean " + _0x5ca26d + ": " + _0x5c7f65.message);
        }
      }
      return _0x577602;
    } catch (_0x143294) {
      throw new Error("Failed to cleanup old backups: " + _0x143294.message);
    }
  }
  async getDirectorySize(_0x5b443d) {
    try {
      let _0x4135f5 = 0;
      const _0x216d7a = fs.readdirSync(_0x5b443d);
      for (const _0x469832 of _0x216d7a) {
        const _0x31f19f = path.join(_0x5b443d, _0x469832);
        const _0x59de5c = fs.statSync(_0x31f19f);
        if (_0x59de5c.isDirectory()) {
          _0x4135f5 += await this.getDirectorySize(_0x31f19f);
        } else {
          _0x4135f5 += _0x59de5c.size;
        }
      }
      return _0x4135f5;
    } catch (_0x284f71) {
      return 0;
    }
  }
  getDataSummary() {
    return {
      userDataPaths: this.userDataPaths,
      protectedFiles: this.protectedFiles,
      protectedDirectories: this.protectedDirectories,
      description: "User data protection ensures that databases, settings, auth sessions, and other user files are preserved during app updates."
    };
  }
}
module.exports = DataProtectionService;