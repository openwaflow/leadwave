const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const schedule = require("node-schedule");
const {
  app
} = require("electron");
class BackupService {
  constructor(_0x16d1ef) {
    this.db = _0x16d1ef;
    this.scheduledJobs = new Map();
  }
  _userDataDir(..._0xbdeda0) {
    try {
      return path.join(app.getPath("userData"), ..._0xbdeda0);
    } catch (_0x44a56b) {
      return path.join(os.homedir(), ".leadwave", ..._0xbdeda0);
    }
  }
  async createBackup(_0x462348 = {}) {
    try {
      const {
        includeDatabase = true,
        includeSettings = true,
        includeTemplates = true,
        includeContacts = true,
        includeAttachments = true,
        description = "Manual backup",
        saveLocation = null
      } = _0x462348;
      const _0x318511 = new Date().toISOString().replace(/[:.]/g, "-");
      const _0x53376e = "app-backup-" + _0x318511;
      const _0x43d3f3 = path.join(os.tmpdir(), "app-backups", _0x53376e);
      await fs.mkdir(_0x43d3f3, {
        recursive: true
      });
      const _0x538687 = {
        metadata: {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          description: description,
          includes: {
            database: includeDatabase,
            settings: includeSettings,
            templates: includeTemplates,
            contacts: includeContacts,
            attachments: includeAttachments
          }
        },
        data: {}
      };
      if (includeDatabase) {
        const _0x36c076 = this.db.dbPath;
        const _0x140ee0 = path.join(_0x43d3f3, "database.db");
        try {
          await fs.access(_0x36c076);
          await fs.copyFile(_0x36c076, _0x140ee0);
          _0x538687.data.database = "database.db";
        } catch (_0x1f92c6) {}
      }
      if (includeSettings) {
        const _0x2874bf = await this.exportSettings();
        await fs.writeFile(path.join(_0x43d3f3, "settings.json"), JSON.stringify(_0x2874bf, null, 2));
        _0x538687.data.settings = "settings.json";
      }
      if (includeTemplates) {
        const _0x1b018d = await this.exportTemplates();
        await fs.writeFile(path.join(_0x43d3f3, "templates.json"), JSON.stringify(_0x1b018d, null, 2));
        _0x538687.data.templates = "templates.json";
      }
      if (includeContacts) {
        const _0x5c7c4d = await this.exportContacts();
        await fs.writeFile(path.join(_0x43d3f3, "contacts.json"), JSON.stringify(_0x5c7c4d, null, 2));
        _0x538687.data.contacts = "contacts.json";
      }
      if (includeAttachments) {
        const _0x5320a7 = this._userDataDir("attachments");
        const _0x1eceae = path.join(_0x43d3f3, "attachments");
        try {
          await this.copyDirectory(_0x5320a7, _0x1eceae);
          _0x538687.data.attachments = "attachments";
        } catch (_0x2721ac) {}
      }
      await fs.writeFile(path.join(_0x43d3f3, "backup-metadata.json"), JSON.stringify(_0x538687, null, 2));
      const _0x406cdf = path.join(os.tmpdir(), "app-backups", _0x53376e + ".zip");
      await fs.mkdir(path.dirname(_0x406cdf), {
        recursive: true
      });
      await this.createArchive(_0x43d3f3, _0x406cdf);
      let _0x5609a9 = _0x406cdf;
      await this.removeDirectory(_0x43d3f3);
      let _0x17b15e = _0x5609a9;
      if (saveLocation) {
        try {
          await fs.copyFile(_0x5609a9, saveLocation);
          _0x17b15e = saveLocation;
          await fs.unlink(_0x5609a9);
        } catch (_0xdd86ce) {
          console.error("Error copying backup to user location:", _0xdd86ce);
        }
      }
      await this.saveBackupRecord({
        id: _0x53376e,
        timestamp: new Date().toISOString(),
        description: description,
        filePath: _0x17b15e,
        encrypted: false,
        size: (await fs.stat(_0x17b15e)).size,
        includes: _0x538687.metadata.includes
      });
      return {
        success: true,
        backupId: _0x53376e,
        filePath: _0x5609a9,
        finalPath: _0x17b15e,
        size: (await fs.stat(_0x17b15e)).size
      };
    } catch (_0x527b3f) {
      console.error("Error creating backup:", _0x527b3f);
      return {
        success: false,
        error: _0x527b3f.message
      };
    }
  }
  async restoreFromBackup(_0xe0691e, _0x3ccd5e = {}) {
    try {
      const {
        restoreDatabase = true,
        restoreSettings = true,
        restoreTemplates = true,
        restoreContacts = true,
        restoreAttachments = true,
        createBackupBeforeRestore = true
      } = _0x3ccd5e;
      if (createBackupBeforeRestore) {
        await this.createBackup({
          description: "Pre-restore backup"
        });
      }
      const _0x5e3b68 = new Date().toISOString().replace(/[:.]/g, "-");
      const _0x2ff2a5 = this._userDataDir("temp", "restore-" + _0x5e3b68);
      await fs.mkdir(_0x2ff2a5, {
        recursive: true
      });
      await this.extractArchive(_0xe0691e, _0x2ff2a5);
      const _0x50d931 = path.join(_0x2ff2a5, "backup-metadata.json");
      const _0x102836 = JSON.parse(await fs.readFile(_0x50d931, "utf8"));
      const _0x59294f = {
        database: false,
        settings: false,
        templates: false,
        contacts: false,
        attachments: false
      };
      if (restoreDatabase && _0x102836.data.database) {
        const _0x592a60 = path.join(_0x2ff2a5, _0x102836.data.database);
        const _0x285099 = this.db.dbPath;
        await fs.mkdir(path.dirname(_0x285099), {
          recursive: true
        });
        if (this.db.db) {
          this.db.db.close();
        }
        await fs.copyFile(_0x592a60, _0x285099);
        await this.db.initialize();
        _0x59294f.database = true;
      }
      if (restoreSettings && _0x102836.data.settings) {
        const _0x43d396 = path.join(_0x2ff2a5, _0x102836.data.settings);
        const _0x3b7705 = JSON.parse(await fs.readFile(_0x43d396, "utf8"));
        await this.importSettings(_0x3b7705);
        _0x59294f.settings = true;
      }
      if (restoreTemplates && _0x102836.data.templates) {
        const _0x3956b6 = path.join(_0x2ff2a5, _0x102836.data.templates);
        const _0x2882d4 = JSON.parse(await fs.readFile(_0x3956b6, "utf8"));
        await this.importTemplates(_0x2882d4, true);
        _0x59294f.templates = true;
      }
      if (restoreContacts && _0x102836.data.contacts) {
        const _0xfead30 = path.join(_0x2ff2a5, _0x102836.data.contacts);
        const _0x384410 = JSON.parse(await fs.readFile(_0xfead30, "utf8"));
        await this.importContacts(_0x384410);
        _0x59294f.contacts = true;
      }
      if (restoreAttachments && _0x102836.data.attachments) {
        const _0x745f2a = path.join(_0x2ff2a5, _0x102836.data.attachments);
        const _0x4804ba = this._userDataDir("attachments");
        await this.copyDirectory(_0x745f2a, _0x4804ba);
        _0x59294f.attachments = true;
      }
      await this.removeDirectory(_0x2ff2a5);
      return {
        success: true,
        restored: _0x59294f,
        metadata: _0x102836.metadata,
        requiresRestart: _0x59294f.database
      };
    } catch (_0x4bef29) {
      console.error("Error restoring from backup:", _0x4bef29);
      return {
        success: false,
        error: _0x4bef29.message
      };
    }
  }
  async scheduleBackup(_0x3043d9, _0xfcb2f4 = {}) {
    try {
      const _0x1b135b = "auto-backup-" + Date.now();
      const _0x4603cc = schedule.scheduleJob(_0x3043d9, async () => {
        const _0x577792 = await this.createBackup({
          ..._0xfcb2f4,
          description: "Automatic scheduled backup"
        });
      });
      this.scheduledJobs.set(_0x1b135b, _0x4603cc);
      return {
        success: true,
        jobId: _0x1b135b
      };
    } catch (_0x579200) {
      console.error("Error scheduling backup:", _0x579200);
      return {
        success: false,
        error: _0x579200.message
      };
    }
  }
  cancelScheduledBackup(_0x54808c) {
    const _0x4c053a = this.scheduledJobs.get(_0x54808c);
    if (_0x4c053a) {
      _0x4c053a.cancel();
      this.scheduledJobs.delete(_0x54808c);
      return {
        success: true
      };
    }
    return {
      success: false,
      error: "Job not found"
    };
  }
  async exportSettings() {
    try {
      const _0x27ce06 = await this.db.query("SELECT * FROM app_settings");
      if (_0x27ce06.success) {
        return _0x27ce06.data;
      } else {
        return [];
      }
    } catch (_0x3f2d59) {
      console.error("Error exporting settings:", _0x3f2d59);
      return [];
    }
  }
  async exportTemplates() {
    try {
      const _0x5b809c = await this.db.query("SELECT * FROM message_templates");
      if (_0x5b809c.success) {
        return _0x5b809c.data;
      } else {
        return [];
      }
    } catch (_0x4f9e33) {
      console.error("Error exporting templates:", _0x4f9e33);
      return [];
    }
  }
  async exportContacts() {
    try {
      const _0x2418c6 = await this.db.query("SELECT * FROM contacts");
      if (_0x2418c6.success) {
        return _0x2418c6.data;
      } else {
        return [];
      }
    } catch (_0x426acb) {
      console.error("Error exporting contacts:", _0x426acb);
      return [];
    }
  }
  async importSettings(_0x3f52a7) {
    try {
      for (const _0x41f9f9 of _0x3f52a7) {
        await this.db.query("INSERT OR REPLACE INTO app_settings (key, value, type, description) VALUES (?, ?, ?, ?)", [_0x41f9f9.key, _0x41f9f9.value, _0x41f9f9.type, _0x41f9f9.description]);
      }
      return {
        success: true
      };
    } catch (_0x5817f4) {
      console.error("Error importing settings:", _0x5817f4);
      return {
        success: false,
        error: _0x5817f4.message
      };
    }
  }
  async importTemplates(_0x3db7e3, _0x2b939a = true) {
    try {
      let _0x5a52b2 = 0;
      let _0x4e28ec = 0;
      for (const _0x248de6 of _0x3db7e3) {
        const {
          id: _0x53fe06,
          ..._0x46b47f
        } = _0x248de6;
        const _0x491b2e = await this.db.query("SELECT id FROM message_templates WHERE name = ?", [_0x46b47f.name]);
        if (_0x491b2e.success && _0x491b2e.data && _0x491b2e.data.length > 0) {
          if (_0x2b939a) {
            _0x5a52b2++;
            continue;
          } else {
            const _0xe540fa = new Date().toISOString().slice(11, 19).replace(/:/g, "-");
            const _0x4f5143 = _0x46b47f.name;
            _0x46b47f.name = _0x46b47f.name + " (Imported " + _0xe540fa + ")";
          }
        }
        const _0x4b9750 = Object.keys(_0x46b47f).join(", ");
        const _0x222962 = Object.keys(_0x46b47f).map(() => "?").join(", ");
        const _0x31e9a9 = Object.values(_0x46b47f);
        await this.db.query("INSERT INTO message_templates (" + _0x4b9750 + ") VALUES (" + _0x222962 + ")", _0x31e9a9);
        _0x4e28ec++;
      }
      return {
        success: true,
        imported: _0x4e28ec,
        skipped: _0x5a52b2
      };
    } catch (_0x5aced9) {
      console.error("Error importing templates:", _0x5aced9);
      return {
        success: false,
        error: _0x5aced9.message
      };
    }
  }
  async importContacts(_0x160cf7) {
    try {
      for (const _0x54aeec of _0x160cf7) {
        const {
          id: _0x422e40,
          ..._0x171509
        } = _0x54aeec;
        const _0x411e4d = await this.db.query("SELECT id FROM contacts WHERE phone_number = ?", [_0x171509.phone_number]);
        if (_0x411e4d.success && _0x411e4d.data && _0x411e4d.data.length > 0) {
          const _0x48d155 = _0x411e4d.data[0].id;
          const _0x451048 = Object.keys(_0x171509).map(_0x707c5a => _0x707c5a + " = ?").join(", ");
          const _0x2ee166 = Object.values(_0x171509);
          _0x2ee166.push(_0x48d155);
          await this.db.query("UPDATE contacts SET " + _0x451048 + " WHERE id = ?", _0x2ee166);
        } else {
          const _0x407822 = Object.keys(_0x171509).join(", ");
          const _0x3713b5 = Object.keys(_0x171509).map(() => "?").join(", ");
          const _0x4b4584 = Object.values(_0x171509);
          await this.db.query("INSERT INTO contacts (" + _0x407822 + ") VALUES (" + _0x3713b5 + ")", _0x4b4584);
        }
      }
      return {
        success: true
      };
    } catch (_0x1b28f0) {
      console.error("Error importing contacts:", _0x1b28f0);
      return {
        success: false,
        error: _0x1b28f0.message
      };
    }
  }
  async createArchive(_0x585a4d, _0x432123) {
    return new Promise((_0x5d662d, _0x3da7df) => {
      const _0x2251d7 = require("fs").createWriteStream(_0x432123);
      const _0x43f363 = archiver("zip", {
        zlib: {
          level: 9
        }
      });
      _0x2251d7.on("close", () => _0x5d662d());
      _0x43f363.on("error", _0x3da7df);
      _0x43f363.pipe(_0x2251d7);
      _0x43f363.directory(_0x585a4d, false);
      _0x43f363.finalize();
    });
  }
  async extractArchive(_0x2ea014, _0x3425e9) {
    const _0x3fc258 = require("yauzl");
    return new Promise((_0x28fecd, _0x5b2b14) => {
      _0x3fc258.open(_0x2ea014, {
        lazyEntries: true
      }, (_0x4921a8, _0x9f4ec8) => {
        if (_0x4921a8) {
          return _0x5b2b14(_0x4921a8);
        }
        let _0x18f403 = 0;
        let _0x3dc4fd = false;
        _0x9f4ec8.readEntry();
        _0x9f4ec8.on("entry", _0x5b6e4b => {
          if (_0x3dc4fd) {
            return;
          }
          if (/\/$/.test(_0x5b6e4b.fileName)) {
            const _0x1a1b42 = path.join(_0x3425e9, _0x5b6e4b.fileName);
            try {
              require("fs").mkdirSync(_0x1a1b42, {
                recursive: true
              });
            } catch (_0x45f68c) {
              _0x3dc4fd = true;
              return _0x5b2b14(_0x45f68c);
            }
            _0x9f4ec8.readEntry();
          } else {
            _0x18f403++;
            _0x9f4ec8.openReadStream(_0x5b6e4b, (_0x1bfbb9, _0x4b786d) => {
              if (_0x1bfbb9 || _0x3dc4fd) {
                _0x3dc4fd = true;
                return _0x5b2b14(_0x1bfbb9);
              }
              const _0x38aed2 = path.join(_0x3425e9, _0x5b6e4b.fileName);
              const _0x11eb04 = path.dirname(_0x38aed2);
              try {
                require("fs").mkdirSync(_0x11eb04, {
                  recursive: true
                });
                const _0x49b716 = require("fs").createWriteStream(_0x38aed2);
                _0x4b786d.pipe(_0x49b716);
                _0x49b716.on("close", () => {
                  _0x18f403--;
                  if (_0x18f403 === 0 && _0x9f4ec8.entryCount === _0x9f4ec8.entriesRead) {
                    _0x28fecd();
                  } else {
                    _0x9f4ec8.readEntry();
                  }
                });
                _0x49b716.on("error", _0x52ca9b => {
                  _0x3dc4fd = true;
                  _0x5b2b14(_0x52ca9b);
                });
              } catch (_0x2bef11) {
                _0x3dc4fd = true;
                _0x5b2b14(_0x2bef11);
              }
            });
          }
        });
        _0x9f4ec8.on("end", () => {
          if (_0x18f403 === 0 && !_0x3dc4fd) {
            _0x28fecd();
          }
        });
        _0x9f4ec8.on("error", _0x16d717 => {
          _0x3dc4fd = true;
          _0x5b2b14(_0x16d717);
        });
      });
    });
  }
  async copyDirectory(_0x148387, _0x548815) {
    await fs.mkdir(_0x548815, {
      recursive: true
    });
    const _0x2d9ec9 = await fs.readdir(_0x148387, {
      withFileTypes: true
    });
    for (const _0x3bc3c5 of _0x2d9ec9) {
      const _0x16f5ce = path.join(_0x148387, _0x3bc3c5.name);
      const _0x271f26 = path.join(_0x548815, _0x3bc3c5.name);
      if (_0x3bc3c5.isDirectory()) {
        await this.copyDirectory(_0x16f5ce, _0x271f26);
      } else {
        await fs.copyFile(_0x16f5ce, _0x271f26);
      }
    }
  }
  async removeDirectory(_0x3a5d9e) {
    try {
      await fs.rm(_0x3a5d9e, {
        recursive: true,
        force: true
      });
    } catch (_0x426483) {}
  }
  async saveBackupRecord(_0x43c47a) {
    try {
      await this.db.query("INSERT INTO backup_history (\n          backup_id, timestamp, description, file_path, encrypted, size, includes\n        ) VALUES (?, ?, ?, ?, ?, ?, ?)", [_0x43c47a.id, _0x43c47a.timestamp, _0x43c47a.description, _0x43c47a.filePath, _0x43c47a.encrypted ? 1 : 0, _0x43c47a.size, JSON.stringify(_0x43c47a.includes)]);
    } catch (_0x1284ee) {
      console.error("Error saving backup record:", _0x1284ee);
    }
  }
  async getBackupHistory() {
    try {
      const _0x1b85e3 = await this.db.query("SELECT * FROM backup_history ORDER BY timestamp DESC LIMIT 50");
      if (_0x1b85e3.success) {
        return _0x1b85e3.data;
      } else {
        return [];
      }
    } catch (_0x4eb31b) {
      console.error("Error getting backup history:", _0x4eb31b);
      return [];
    }
  }
  async validateBackupFile(_0x12209d) {
    try {
      const _0x523ae1 = await fs.stat(_0x12209d);
      if (!_0x523ae1.isFile()) {
        return {
          valid: false,
          error: "Not a valid file"
        };
      }
      const _0x3ea77b = path.extname(_0x12209d).toLowerCase();
      if (_0x3ea77b !== ".zip") {
        return {
          valid: false,
          error: "Invalid file format. Expected .zip file"
        };
      }
      const _0x429e07 = this._userDataDir("temp", "validate-" + Date.now());
      await fs.mkdir(_0x429e07, {
        recursive: true
      });
      try {
        await this.extractArchive(_0x12209d, _0x429e07);
        const _0x1c2a19 = path.join(_0x429e07, "backup-metadata.json");
        if (!(await fs.stat(_0x1c2a19).catch(() => false))) {
          return {
            valid: false,
            error: "Missing backup metadata"
          };
        }
        const _0xa7a8d1 = JSON.parse(await fs.readFile(_0x1c2a19, "utf8"));
        if (!_0xa7a8d1.metadata || !_0xa7a8d1.data) {
          return {
            valid: false,
            error: "Invalid backup metadata structure"
          };
        }
        return {
          valid: true,
          encrypted: false,
          metadata: _0xa7a8d1.metadata
        };
      } finally {
        await this.removeDirectory(_0x429e07);
      }
    } catch (_0x21071d) {
      return {
        valid: false,
        error: _0x21071d.message
      };
    }
  }
  async getBackupInfo(_0x253ec3) {
    try {
      const _0x288c1f = await this.validateBackupFile(_0x253ec3);
      if (!_0x288c1f.valid) {
        return {
          success: false,
          error: _0x288c1f.error
        };
      }
      const _0x433c9e = await fs.stat(_0x253ec3);
      return {
        success: true,
        info: {
          fileName: path.basename(_0x253ec3),
          size: _0x433c9e.size,
          created: _0x433c9e.birthtime,
          modified: _0x433c9e.mtime,
          encrypted: _0x288c1f.encrypted,
          metadata: _0x288c1f.metadata
        }
      };
    } catch (_0x5c8242) {
      return {
        success: false,
        error: _0x5c8242.message
      };
    }
  }
  async cleanOldBackups(_0x1c048c = 30) {
    try {
      const _0x4ed78a = await this.getBackupHistory();
      const _0x594d3b = new Date();
      _0x594d3b.setDate(_0x594d3b.getDate() - _0x1c048c);
      let _0x11a147 = 0;
      for (const _0x17f409 of _0x4ed78a) {
        const _0x347b8b = new Date(_0x17f409.timestamp);
        if (_0x347b8b < _0x594d3b) {
          try {
            if (_0x17f409.file_path && (await fs.stat(_0x17f409.file_path).catch(() => false))) {
              await fs.unlink(_0x17f409.file_path);
            }
            await this.db.query("DELETE FROM backup_history WHERE id = ?", [_0x17f409.id]);
            _0x11a147++;
          } catch (_0x508c7e) {}
        }
      }
      return {
        success: true,
        cleanedCount: _0x11a147
      };
    } catch (_0x5342c6) {
      console.error("Error cleaning old backups:", _0x5342c6);
      return {
        success: false,
        error: _0x5342c6.message
      };
    }
  }
  async downloadBackupToLocal(_0x395087) {
    try {
      const {
        dialog: _0x4352ac
      } = require("electron");
      const _0x1ed1b6 = require("path");
      const _0x22bc0e = require("fs").promises;
      try {
        await _0x22bc0e.access(_0x395087);
      } catch (_0xcbc21f) {
        throw new Error("Backup file not found");
      }
      const _0x16878a = _0x1ed1b6.basename(_0x395087);
      const _0x117c2e = await _0x4352ac.showSaveDialog({
        title: "Save Backup File",
        defaultPath: _0x16878a,
        filters: [{
          name: "Backup Files",
          extensions: ["zip"]
        }, {
          name: "All Files",
          extensions: ["*"]
        }]
      });
      if (_0x117c2e.canceled) {
        return {
          success: false,
          canceled: true
        };
      }
      await _0x22bc0e.copyFile(_0x395087, _0x117c2e.filePath);
      return {
        success: true,
        filePath: _0x117c2e.filePath,
        message: "Backup downloaded successfully"
      };
    } catch (_0x1caf9c) {
      console.error("Error downloading backup to local:", _0x1caf9c);
      return {
        success: false,
        error: _0x1caf9c.message
      };
    }
  }
}
module.exports = BackupService;