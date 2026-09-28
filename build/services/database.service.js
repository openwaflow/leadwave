const {
  SqlJsCompatAdapter
} = require("./sqljs-compat");
const path = require("path");
const fs = require("fs").promises;
const os = require("os");
const {
  app
} = require("electron");
class DatabaseService {
  constructor(_0x3ef454 = "wapp.db") {
    const _0x1cdc46 = process.env.NODE_ENV === "development" || (!app || !app.isPackaged) && process.env.NODE_ENV !== "production" || process.argv.includes("--dev") || __dirname.includes("src");
    if (_0x1cdc46) {
      this.dbPath = path.join(__dirname, "..", "data", "wapp.db");
      this.bundledDbPath = null;
    } else {
      const _0x585e2b = app.getPath("userData");
      this.dbPath = path.join(_0x585e2b, "data", "wapp.db");
      const _0x5a035b = process.resourcesPath || path.join(process.cwd(), "resources");
      this.bundledDbPath = path.join(_0x5a035b, "data", "wapp.db");
      if (global.logToFile) {
        global.logToFile("📁 Database paths:");
        global.logToFile("   User DB: " + this.dbPath);
        global.logToFile("   Bundled DB: " + this.bundledDbPath);
      }
    }
    this.db = null;
    this.dbRaw = null;
    this.SQL = null;
    this._Database = null;
    this.isSaving = false;
    this.isInitialized = false;
    this.isShuttingDown = false;
    this.backupPath = null;
    this.autoSaveInterval = null;
    this.lastSaveTime = Date.now();
    this._initMode = false;
  }
  _getNativeDriver() {
    if (!this._Database) {
      try {
        this._Database = require("better-sqlite3");
      } catch (_0x414ee4) {
        const _0x2db9d7 = "❌ FATAL: failed to load the native \"better-sqlite3\" module. The database cannot be opened, so startup is aborted to avoid silently running on an empty database and losing data.\n   Likely cause: the native binary was not rebuilt for this runtime's ABI (Electron 23.1.3 in production) or is missing from the packaged app (asarUnpack).\n   Fix: rebuild the native module for the target ABI, e.g.\n        npx electron-rebuild -f -w better-sqlite3\n        (or) npx electron-builder install-app-deps\n   Rollback: restore the one-time \"wapp.db.pre-v9\" backup and/or revert the database.service.js + sqljs-compat changes to the sql.js engine (both engines read the same on-disk file).\n" + ("   Underlying error: " + (_0x414ee4 && _0x414ee4.message ? _0x414ee4.message : _0x414ee4));
        try {
          console.error(_0x2db9d7);
        } catch (_0x4dd7c0) {}
        if (global.logToFile) {
          try {
            global.logToFile(_0x2db9d7);
          } catch (_0x141d26) {}
        }
        const _0x355987 = new Error(_0x2db9d7);
        _0x355987.cause = _0x414ee4;
        _0x355987.code = "NATIVE_SQLITE_LOAD_FAILED";
        throw _0x355987;
      }
    }
    return this._Database;
  }
  _userDataTables() {
    return ["whatsapp_sessions", "contacts", "message_history", "bulk_campaigns", "message_templates", "auto_reply_rules", "chatbot_flows", "chatbot_nodes", "follow_up_sequences"];
  }
  _isNativeLoadError(_0x5b617b) {
    if (!_0x5b617b) {
      return false;
    }
    const _0x2e8cdf = _0x5b617b.code || _0x5b617b.cause && _0x5b617b.cause.code;
    if (_0x2e8cdf === "NATIVE_SQLITE_LOAD_FAILED" || _0x2e8cdf === "ERR_DLOPEN_FAILED") {
      return true;
    }
    const _0x16fe2f = String(_0x5b617b.message || "");
    return /NODE_MODULE_VERSION|was compiled against a different Node\.js version|\.node['"]?\s*$|invalid ELF|dlopen/i.test(_0x16fe2f);
  }
  _validateDbFile(_0x1bd11c) {
    const _0x1e8a5c = this._getNativeDriver();
    let _0x582b59 = null;
    try {
      _0x582b59 = new _0x1e8a5c(_0x1bd11c, {
        readonly: true,
        fileMustExist: true
      });
      const _0x44fc1e = _0x582b59.pragma("integrity_check", {
        simple: true
      });
      if (_0x44fc1e !== "ok") {
        return {
          valid: false,
          hasUserData: false
        };
      }
      let _0x5c9dc3 = false;
      for (const _0x2a5e26 of this._userDataTables()) {
        try {
          const _0x59fb75 = _0x582b59.prepare("SELECT COUNT(*) as count FROM " + _0x2a5e26).get();
          if (_0x59fb75 && _0x59fb75.count > 0) {
            _0x5c9dc3 = true;
            break;
          }
        } catch (_0x3b5e84) {}
      }
      return {
        valid: true,
        hasUserData: _0x5c9dc3
      };
    } catch (_0x12e405) {
      if (this._isNativeLoadError(_0x12e405)) {
        throw _0x12e405;
      }
      return {
        valid: false,
        hasUserData: false,
        error: _0x12e405
      };
    } finally {
      try {
        if (_0x582b59) {
          _0x582b59.close();
        }
      } catch (_0x1a886a) {}
    }
  }
  async initialize() {
    try {
      this._getNativeDriver();
      const _0x19e38f = path.dirname(this.dbPath);
      await fs.mkdir(_0x19e38f, {
        recursive: true
      });
      try {
        const _0x59d28a = path.basename(this.dbPath);
        const _0x1a2540 = await fs.readdir(_0x19e38f);
        const _0xa148f4 = Date.now() - 3600000;
        for (const _0x1f03e7 of _0x1a2540) {
          if (!_0x1f03e7.startsWith(_0x59d28a + ".tmp.")) {
            continue;
          }
          const _0x43edeb = path.join(_0x19e38f, _0x1f03e7);
          try {
            const _0x2ac672 = await fs.stat(_0x43edeb);
            if (_0x2ac672.mtimeMs < _0xa148f4) {
              await fs.unlink(_0x43edeb);
            }
          } catch (_0x1056b1) {}
        }
      } catch (_0x54c9ca) {}
      const _0x4274f8 = await fs.access(this.dbPath).then(() => true).catch(() => false);
      if (_0x4274f8) {
        const _0x18e5a0 = this.dbPath + ".pre-v9";
        const _0x18313e = await fs.access(_0x18e5a0).then(() => true).catch(() => false);
        if (!_0x18313e) {
          try {
            await fs.copyFile(this.dbPath, _0x18e5a0);
            if (global.logToFile) {
              global.logToFile("🛟 Created one-time pre-migration backup: " + _0x18e5a0);
            }
          } catch (_0x9b1d3e) {
            if (global.logToFile) {
              global.logToFile("⚠️ Could not create pre-migration backup: " + _0x9b1d3e.message);
            }
          }
        }
      }
      let _0x17caea = false;
      let _0x3523ae = false;
      let _0x4ff0bc = false;
      let _0x52c0df = false;
      if (_0x4274f8) {
        try {
          if (global.logToFile) {
            global.logToFile("📂 Loading existing database from: " + this.dbPath);
          }
          let _0x515a2a = 0;
          try {
            _0x515a2a = (await fs.stat(this.dbPath)).size;
          } catch (_0x4c2791) {}
          if (global.logToFile) {
            global.logToFile("📊 Database file size: " + _0x515a2a + " bytes");
          }
          if (_0x515a2a === 0) {
            if (global.logToFile) {
              global.logToFile("⚠️ Database file is empty (0 bytes) - attempting recovery");
            }
            _0x4ff0bc = true;
          } else {
            const _0x12385f = this._validateDbFile(this.dbPath);
            if (_0x12385f.valid) {
              _0x52c0df = _0x12385f.hasUserData;
              _0x17caea = true;
              if (global.logToFile) {
                global.logToFile("📊 Database has user data: " + _0x52c0df);
              }
            } else {
              if (global.logToFile) {
                global.logToFile("⚠️ Database appears corrupted" + (_0x12385f.error ? ": " + _0x12385f.error.message : ""));
              }
              _0x4ff0bc = true;
            }
          }
        } catch (_0x46ce11) {
          if (global.logToFile) {
            global.logToFile("❌ Error reading database: " + _0x46ce11.message);
            global.logToFile("❌ Error stack: " + _0x46ce11.stack);
            global.logToFile("❌ Database path: " + this.dbPath);
          }
          console.error("🚨 CRITICAL: Failed to read database file!", _0x46ce11);
          _0x4ff0bc = true;
        }
        if (_0x4ff0bc) {
          if (global.logToFile) {
            global.logToFile("🔧 Attempting to recover from safety backup...");
          }
          const _0x3cf2e3 = this.dbPath + ".safe";
          const _0x4bfe0a = await fs.access(_0x3cf2e3).then(() => true).catch(() => false);
          if (_0x4bfe0a) {
            try {
              let _0x4aa2c0 = 0;
              try {
                _0x4aa2c0 = (await fs.stat(_0x3cf2e3)).size;
              } catch (_0xb49bfd) {}
              if (_0x4aa2c0 > 0 && this._validateDbFile(_0x3cf2e3).valid) {
                await fs.copyFile(_0x3cf2e3, this.dbPath);
                _0x17caea = true;
                _0x4ff0bc = false;
                _0x52c0df = true;
                if (global.logToFile) {
                  global.logToFile("✅ Successfully recovered from safety backup!");
                }
              } else if (global.logToFile) {
                global.logToFile("⚠️ Safety backup is also corrupted");
              }
            } catch (_0x1c17ab) {
              if (global.logToFile) {
                global.logToFile("❌ Could not recover from safety backup: " + _0x1c17ab.message);
              }
            }
          }
          if (_0x4ff0bc) {
            if (global.logToFile) {
              global.logToFile("🔧 Attempting to recover from regular backups...");
            }
            const _0x666ee8 = path.join(path.dirname(this.dbPath), "backups");
            const _0x1d3894 = await fs.access(_0x666ee8).then(() => true).catch(() => false);
            if (_0x1d3894) {
              try {
                const _0x2c8e6b = await fs.readdir(_0x666ee8);
                const _0x25cd83 = _0x2c8e6b.filter(_0x42cb21 => _0x42cb21.startsWith("wapp_backup_") && _0x42cb21.endsWith(".db")).sort().reverse();
                for (const _0xaf4779 of _0x25cd83) {
                  try {
                    const _0x2eb597 = path.join(_0x666ee8, _0xaf4779);
                    let _0x11e855 = 0;
                    try {
                      _0x11e855 = (await fs.stat(_0x2eb597)).size;
                    } catch (_0x195ea1) {}
                    if (_0x11e855 > 0 && this._validateDbFile(_0x2eb597).valid) {
                      await fs.copyFile(_0x2eb597, this.dbPath);
                      _0x17caea = true;
                      _0x4ff0bc = false;
                      _0x52c0df = true;
                      if (global.logToFile) {
                        global.logToFile("✅ Successfully recovered from backup: " + _0xaf4779);
                      }
                      break;
                    }
                  } catch (_0x34ac2a) {
                    if (global.logToFile) {
                      global.logToFile("⚠️ Backup " + _0xaf4779 + " is corrupted, trying next...");
                    }
                  }
                }
              } catch (_0x2819e7) {
                if (global.logToFile) {
                  global.logToFile("❌ Could not read backup directory: " + _0x2819e7.message);
                }
              }
            }
          }
        }
      } else {
        if (this.bundledDbPath) {
          try {
            const _0x361910 = require("fs").existsSync(this.bundledDbPath);
            if (_0x361910) {
              if (global.logToFile) {
                global.logToFile("📦 Copying bundled database to user location");
              }
              await fs.copyFile(this.bundledDbPath, this.dbPath);
              _0x17caea = true;
              if (global.logToFile) {
                global.logToFile("✅ Bundled database copied successfully");
              }
            }
          } catch (_0x31eac6) {
            if (global.logToFile) {
              global.logToFile("⚠️ Could not copy bundled database: " + _0x31eac6.message);
            }
          }
        }
        _0x3523ae = true;
      }
      if (_0x4ff0bc && _0x52c0df) {
        if (global.logToFile) {
          global.logToFile("⚠️ Database appears corrupted but has user data - attempting recovery");
        }
        await this.createBackup();
        _0x4ff0bc = false;
      }
      if (_0x4ff0bc && !_0x52c0df) {
        _0x3523ae = true;
        if (global.logToFile) {
          global.logToFile("🗑️ Removing corrupted empty database");
        }
        try {
          await fs.unlink(this.dbPath);
        } catch (_0x351906) {}
      }
      if (!_0x17caea && _0x4274f8) {
        const _0x34c7ef = new Date().toISOString().replace(/[:.]/g, "-");
        const _0x5d7284 = this.dbPath + ".corrupted_" + _0x34c7ef;
        const _0x39daec = "⚠️ Database could not be loaded after all recovery attempts. Renaming corrupted file to " + _0x5d7284 + " and starting fresh.";
        if (global.logToFile) {
          global.logToFile(_0x39daec);
        }
        console.warn(_0x39daec);
        try {
          await fs.rename(this.dbPath, _0x5d7284);
        } catch (_0x574092) {
          if (global.logToFile) {
            global.logToFile("⚠️ Could not rename corrupted DB, attempting deletion: " + _0x574092.message);
          }
          try {
            await fs.unlink(this.dbPath);
          } catch (_0x16de15) {}
        }
        if (this.bundledDbPath) {
          try {
            const _0x2f01ba = require("fs").existsSync(this.bundledDbPath);
            if (_0x2f01ba) {
              await fs.copyFile(this.bundledDbPath, this.dbPath);
              _0x17caea = true;
              if (global.logToFile) {
                global.logToFile("✅ Restored from bundled database after corruption recovery");
              }
            }
          } catch (_0x49d2ac) {
            if (global.logToFile) {
              global.logToFile("⚠️ Could not restore bundled DB: " + _0x49d2ac.message);
            }
          }
        }
        _0x3523ae = false;
      }
      const _0x34a7b9 = this._getNativeDriver();
      this.dbRaw = new _0x34a7b9(this.dbPath);
      this.dbRaw.pragma("journal_mode = WAL");
      this.dbRaw.pragma("synchronous = NORMAL");
      this.dbRaw.pragma("foreign_keys = ON");
      this.dbRaw.pragma("busy_timeout = 5000");
      try {
        const _0x1d95bf = this.dbRaw.pragma("integrity_check", {
          simple: true
        });
        if (global.logToFile) {
          global.logToFile("🔎 PRAGMA integrity_check: " + _0x1d95bf);
        }
      } catch (_0x8ccdee) {
        if (global.logToFile) {
          global.logToFile("⚠️ integrity_check failed: " + _0x8ccdee.message);
        }
      }
      this.db = new SqlJsCompatAdapter(this.dbRaw);
      this._initMode = true;
      await this.createTables();
      await this.insertDefaultSettings();
      await this.addMissingColumns();
      await this.runCallResponderMigrations();
      await this.addBulkMessageDelayColumns();
      await this.addBulkMessageUnverifiedContactsColumn();
      await this.runPollQuestionMigration();
      await this.runPollTrackingMigration();
      await this.runPollVotesEncryptedFallbackMigration();
      await this.runAdvancedMessagingSuiteMigration();
      await this.runSupportBotColumnMigrations();
      await this.runLIDMappingsMigration();
      await this.runLiveChatStatusMigration();
      await this.fixBrokenConditionPaths();
      await this.migrateCallResponderDelayToSeconds();
      await this.runRestAPIMigration();
      await this.runProxyProviderMigration();
      await this.runMultiSessionMigration();
      await this.runTelegramSessionMigration();
      this._initMode = false;
      if (_0x3523ae && !_0x52c0df && !_0x4274f8) {
        if (global.logToFile) {
          global.logToFile("🆕 First time installation — initializing fresh database");
        }
        await this.clearUserData();
        await this.clearAuthSessions();
      } else if (_0x52c0df) {
        if (global.logToFile) {
          global.logToFile("✅ Existing user data preserved");
        }
      }
      await this.saveDatabase();
      this.isInitialized = true;
      if (_0x52c0df) {
        this.createBackup().catch(_0x8732e9 => {
          if (global.logToFile) {
            global.logToFile("⚠️ Post-init backup error: " + _0x8732e9.message);
          }
        });
      }
      this.startAutoSave();
      if (global.logToFile) {
        global.logToFile("✅ Database initialized successfully");
      }
      return {
        success: true
      };
    } catch (_0x3271b8) {
      this._initMode = false;
      console.error("❌ Database initialization error:", _0x3271b8);
      if (global.logToFile) {
        global.logToFile("❌ Database initialization error: " + _0x3271b8.message);
      }
      throw _0x3271b8;
    }
  }
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    const _0x5be9aa = 300000;
    this.autoSaveInterval = setInterval(() => {
      try {
        if (this.dbRaw && !this.isShuttingDown) {
          this.dbRaw.pragma("wal_checkpoint(PASSIVE)");
        }
      } catch (_0x4fb6e7) {
        if (global.logToFile) {
          global.logToFile("⚠️ Periodic WAL checkpoint failed: " + _0x4fb6e7.message);
        }
      }
    }, _0x5be9aa);
    if (global.logToFile) {
      global.logToFile("✅ Periodic WAL checkpoint enabled (every 5 minutes)");
    }
  }
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      if (global.logToFile) {
        global.logToFile("⏹️ Periodic WAL checkpoint stopped");
      }
    }
  }
  requestSave() {}
  async _flushDirty() {}
  async createTables() {
    const _0x326d17 = ["CREATE TABLE IF NOT EXISTS whatsapp_sessions (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT UNIQUE NOT NULL,\n        name TEXT NOT NULL,\n        device_name TEXT, -- Friendly device name\n        phone_number TEXT,\n        profile_picture TEXT, -- Profile picture URL\n        status TEXT DEFAULT 'disconnected', -- disconnected, connecting, connected, qr_ready\n        qr_code TEXT,\n        last_connected DATETIME,\n        last_seen DATETIME, -- Last activity timestamp\n        connected_at DATETIME, -- When session was connected\n        disconnected_at DATETIME, -- When session was disconnected\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        is_active BOOLEAN DEFAULT 1,\n        session_data TEXT -- JSON string for storing session info\n      )", "CREATE TABLE IF NOT EXISTS message_templates (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL UNIQUE, -- Added UNIQUE constraint to prevent duplicates\n        category TEXT DEFAULT 'general', -- welcome, marketing, support, etc.\n        type TEXT DEFAULT 'text', -- text, image, document, contact, poll, buttons, list, location, video, audio, cta_button, copy_code, flow, mixed_buttons, carousel\n        content TEXT NOT NULL,\n        variables TEXT, -- JSON array of variable names\n        attachments TEXT, -- JSON array of attachment paths/URLs\n        buttons TEXT, -- JSON array of button configurations\n        list_sections TEXT, -- JSON array of list sections for list templates\n\n        poll_options TEXT, -- JSON array of poll options\n        poll_question TEXT, -- Poll question text (separate from message content)\n        contact_info TEXT, -- JSON object with contact information\n        location_info TEXT, -- JSON object with location coordinates\n        media_settings TEXT, -- JSON object with media-specific settings (caption, viewOnce, etc.)\n        interactive_settings TEXT, -- JSON object with interactive message settings\n        is_active BOOLEAN DEFAULT 1,\n        usage_count INTEGER DEFAULT 0,\n        last_used DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        cta_data TEXT, -- JSON object for CTA button configuration\n        copy_data TEXT, -- JSON object for copy code button configuration\n        flow_data TEXT, -- JSON object for flow message configuration\n        mixed_buttons_data TEXT, -- JSON array for mixed interactive buttons configuration\n        carousel_cards TEXT, -- JSON array for carousel cards configuration\n        carousel_settings TEXT -- JSON object for carousel settings configuration\n      )", "CREATE TABLE IF NOT EXISTS contacts (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        phone_number TEXT UNIQUE NOT NULL,\n        name TEXT,\n        email TEXT,\n        company TEXT,\n        position TEXT,\n        notes TEXT,\n        tags TEXT, -- JSON array of tags\n        custom_fields TEXT, -- JSON object for custom fields\n        var1 TEXT, -- Custom variable 1\n        var2 TEXT, -- Custom variable 2\n        var3 TEXT, -- Custom variable 3\n        var4 TEXT, -- Custom variable 4\n        var5 TEXT, -- Custom variable 5\n        var6 TEXT, -- Custom variable 6\n        var7 TEXT, -- Custom variable 7\n        var8 TEXT, -- Custom variable 8\n        var9 TEXT, -- Custom variable 9\n        var10 TEXT, -- Custom variable 10\n        whatsapp_verified BOOLEAN DEFAULT 0, -- Whether number is verified on WhatsApp\n        verification_status TEXT DEFAULT 'pending', -- pending, verified, invalid\n        verification_date DATETIME,\n        is_active BOOLEAN DEFAULT 1,\n        last_message_at DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS contact_groups (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        color TEXT DEFAULT '#3b82f6',\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS contact_group_members (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        group_id INTEGER NOT NULL,\n        contact_id INTEGER NOT NULL,\n        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE RESTRICT,\n        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,\n        UNIQUE(group_id, contact_id)\n      )", "CREATE TABLE IF NOT EXISTS bulk_campaigns (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        template_id INTEGER,\n        session_ids TEXT NOT NULL, -- JSON array of session IDs for multi-device support\n        message_content TEXT, -- Actual message content (from template or custom)\n        message_type TEXT DEFAULT 'text', -- text, template, media, etc.\n        contact_group_ids TEXT, -- JSON array of contact group IDs\n        device_rotation BOOLEAN DEFAULT 1, -- Whether to rotate between devices\n        attachment_data TEXT, -- JSON object with attachment file data and type\n        status TEXT DEFAULT 'draft', -- draft, scheduled, pending, running, completed, paused, stopped, failed\n        total_contacts INTEGER DEFAULT 0,\n        sent_count INTEGER DEFAULT 0,\n        failed_count INTEGER DEFAULT 0,\n        delivery_delay INTEGER DEFAULT 5, -- Legacy: seconds between messages (for backward compatibility)\n        delivery_delay_min INTEGER DEFAULT 3, -- Minimum delay between messages in seconds\n        delivery_delay_max INTEGER DEFAULT 9, -- Maximum delay between messages in seconds\n        max_retries INTEGER DEFAULT 3, -- maximum retry attempts for failed messages\n        scheduled_at DATETIME,\n        started_at DATETIME,\n        completed_at DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL\n      )", "CREATE TABLE IF NOT EXISTS bulk_campaign_recipients (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        campaign_id INTEGER NOT NULL,\n        contact_id INTEGER NOT NULL,\n        status TEXT DEFAULT 'pending', -- pending, sent, failed, delivered, retry\n        sent_at DATETIME,\n        delivered_at DATETIME,\n        error_message TEXT,\n        message_id TEXT, -- WhatsApp message ID\n        retry_count INTEGER DEFAULT 0,\n        session_id TEXT, -- Which session was used to send this message\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE CASCADE,\n        FOREIGN KEY (contact_id) REFERENCES contacts(id)\n      )", "CREATE TABLE IF NOT EXISTS communication_preferences (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        phone_number TEXT NOT NULL,\n        contact_id INTEGER,\n        opt_out_status TEXT DEFAULT 'opted_in' CHECK (opt_out_status IN ('opted_in', 'opted_out', 'pending_confirmation')),\n        opt_out_date DATETIME,\n        opt_out_method TEXT, -- 'keyword', 'manual', 'web_form', 'complaint'\n        opt_out_campaign_id INTEGER, -- Which campaign triggered the opt-out\n        opt_out_reason TEXT,\n        marketing_consent BOOLEAN DEFAULT 1,\n        transactional_consent BOOLEAN DEFAULT 1,\n        promotional_consent BOOLEAN DEFAULT 1,\n        reminder_consent BOOLEAN DEFAULT 1,\n        last_consent_update DATETIME,\n        consent_source TEXT, -- 'initial_signup', 'explicit_consent', 'implied_consent'\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,\n        FOREIGN KEY (opt_out_campaign_id) REFERENCES bulk_campaigns(id) ON DELETE SET NULL,\n        UNIQUE(phone_number)\n      )", "CREATE TABLE IF NOT EXISTS opt_out_keywords (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        keyword TEXT NOT NULL UNIQUE,\n        language TEXT DEFAULT 'en',\n        is_active BOOLEAN DEFAULT 1,\n        case_sensitive BOOLEAN DEFAULT 0,\n        auto_response_template TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS opt_out_requests (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        phone_number TEXT NOT NULL,\n        contact_id INTEGER,\n        session_id TEXT,\n        request_method TEXT NOT NULL, -- 'keyword', 'manual', 'web_form', 'complaint'\n        keyword_used TEXT,\n        message_content TEXT,\n        campaign_id INTEGER,\n        processed BOOLEAN DEFAULT 0,\n        processed_at DATETIME,\n        confirmation_sent BOOLEAN DEFAULT 0,\n        confirmation_sent_at DATETIME,\n        ip_address TEXT,\n        user_agent TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE SET NULL\n      )", "CREATE TABLE IF NOT EXISTS compliance_audit_log (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        phone_number TEXT NOT NULL,\n        contact_id INTEGER,\n        action_type TEXT NOT NULL, -- 'opt_in', 'opt_out', 'message_sent', 'message_blocked', 'preference_updated'\n        action_details TEXT, -- JSON with additional details\n        campaign_id INTEGER,\n        session_id TEXT,\n        user_id TEXT,\n        ip_address TEXT,\n        compliance_status TEXT DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'violation', 'warning')),\n        notes TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE SET NULL\n      )", "CREATE TABLE IF NOT EXISTS message_history (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER NOT NULL,\n        contact_phone TEXT NOT NULL,\n        message_id TEXT, -- WhatsApp message ID\n        direction TEXT NOT NULL, -- incoming, outgoing\n        message_type TEXT DEFAULT 'text', -- text, image, document, audio, video\n        content TEXT,\n        media_path TEXT,\n        timestamp DATETIME NOT NULL,\n        status TEXT, -- sent, delivered, read, failed\n        campaign_id INTEGER, -- if sent via bulk campaign\n        template_id INTEGER, -- if sent using template\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id),\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id),\n        FOREIGN KEY (template_id) REFERENCES message_templates(id)\n      )", "CREATE TABLE IF NOT EXISTS auto_reply_rules (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        name TEXT NOT NULL,\n        response TEXT,\n        template_id INTEGER,\n        is_active BOOLEAN DEFAULT 1,\n        priority INTEGER DEFAULT 1,\n        cooldown_minutes INTEGER DEFAULT 0, -- cooldown period in minutes\n        response_count INTEGER DEFAULT 0,\n        last_used DATETIME,\n        target_type TEXT DEFAULT 'all', -- 'all', 'individual', 'group'\n        target_groups TEXT, -- JSON array of group IDs when target_type is 'group'\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES message_templates(id)\n      )", "CREATE TABLE IF NOT EXISTS chatbot_flows (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT,\n        trigger_keywords TEXT NOT NULL, -- comma separated keywords\n        keyword_match_type TEXT DEFAULT 'contains', -- exact, contains, starts_with, ends_with\n        keyword_case_sensitive BOOLEAN DEFAULT 0, -- case sensitive matching\n        is_active BOOLEAN DEFAULT 1,\n        welcome_message TEXT,\n        fallback_message TEXT,\n        cooldown_minutes INTEGER DEFAULT 0, -- cooldown period in minutes\n        message_delay_seconds INTEGER DEFAULT 0, -- delay in seconds before sending each message\n        conversation_count INTEGER DEFAULT 0,\n        last_triggered DATETIME,\n        target_type TEXT DEFAULT 'all', -- 'all', 'individual', 'group'\n        target_groups TEXT, -- JSON array of group IDs when target_type is 'group'\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS chatbot_nodes (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        flow_id INTEGER NOT NULL,\n        name TEXT NOT NULL,\n        message TEXT NOT NULL,\n        node_type TEXT NOT NULL, -- message, question, action, condition\n        options TEXT, -- JSON array of options for question nodes\n        next_node_id INTEGER,\n        position INTEGER DEFAULT 0,\n        template_id INTEGER,\n        attachment_data TEXT, -- JSON object with attachment file data and type\n        attachment_type TEXT, -- image, video, audio, document\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE,\n        FOREIGN KEY (template_id) REFERENCES message_templates(id)\n      )", "CREATE TABLE IF NOT EXISTS chatbot_conversations (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        flow_id INTEGER NOT NULL,\n        user_phone TEXT NOT NULL,\n        current_node_id INTEGER,\n        conversation_data TEXT, -- JSON data for storing user responses\n        is_active BOOLEAN DEFAULT 1,\n        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,\n        completed_at DATETIME,\n        FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS chatbot_saved_data (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        conversation_id INTEGER NOT NULL,\n        flow_id INTEGER NOT NULL,\n        data TEXT NOT NULL, -- JSON object with saved data\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,\n        FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS auto_reply_cooldowns (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        rule_id INTEGER NOT NULL,\n        user_phone TEXT NOT NULL,\n        last_reply_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (rule_id) REFERENCES auto_reply_rules(id) ON DELETE CASCADE,\n        UNIQUE(rule_id, user_phone)\n      )", "CREATE TABLE IF NOT EXISTS chatbot_flow_cooldowns (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        flow_id INTEGER NOT NULL,\n        user_phone TEXT NOT NULL,\n        last_triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (flow_id) REFERENCES chatbot_flows(id) ON DELETE CASCADE,\n        UNIQUE(flow_id, user_phone)\n      )", "CREATE TABLE IF NOT EXISTS call_responses (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL, -- Changed to TEXT to match whatsapp_sessions.session_id\n        name TEXT NOT NULL,\n        call_types TEXT NOT NULL, -- JSON array: ['received', 'outgoing', 'missed', 'rejected']\n        message_type TEXT DEFAULT 'text', -- 'text' or 'template'\n        message_content TEXT, -- Custom message content\n        template_id INTEGER, -- Template ID if using template\n        attachment_file TEXT, -- File path for attachment\n        attachment_type TEXT, -- 'image', 'video', 'audio', 'document'\n        delay_minutes INTEGER DEFAULT 1, -- Delay in minutes after call ends\n        is_active BOOLEAN DEFAULT 1,\n        usage_count INTEGER DEFAULT 0,\n        last_used DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES message_templates(id)\n      )", "CREATE TABLE IF NOT EXISTS app_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        key TEXT UNIQUE NOT NULL,\n        value TEXT,\n        type TEXT DEFAULT 'string', -- string, number, boolean, json\n        description TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS bulk_message_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        spintax_enabled BOOLEAN DEFAULT 1,\n        random_enabled BOOLEAN DEFAULT 1,\n        random_prefix TEXT DEFAULT 'REF',\n        family_numbers_enabled BOOLEAN DEFAULT 1,\n        family_numbers TEXT, -- JSON array of phone numbers\n        family_message_interval INTEGER DEFAULT 50, -- Send to family numbers after every X messages\n        hook_number_enabled BOOLEAN DEFAULT 1,\n        hook_number TEXT, -- Single hook number for reply forwarding\n        sleep_timing_enabled BOOLEAN DEFAULT 1,\n        sleep_after_messages INTEGER DEFAULT 50, -- Pause after X messages\n        sleep_duration_seconds INTEGER DEFAULT 30, -- Pause for X seconds\n        delivery_delay_min INTEGER DEFAULT 3, -- Default minimum delay between messages\n        delivery_delay_max INTEGER DEFAULT 9, -- Default maximum delay between messages\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS email_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        provider TEXT NOT NULL, -- smtp, gmail, etc.\n        smtp_config TEXT NOT NULL, -- JSON configuration for SMTP settings\n        from_email TEXT NOT NULL,\n        from_name TEXT NOT NULL,\n        is_active BOOLEAN DEFAULT 0,\n        is_default BOOLEAN DEFAULT 0,\n        enabled BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS email_templates (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        category TEXT DEFAULT 'general', -- welcome, notification, marketing, support, etc.\n        subject TEXT NOT NULL,\n        html_content TEXT NOT NULL,\n        text_content TEXT,\n        variables TEXT, -- JSON array of available variables\n        is_active BOOLEAN DEFAULT 1,\n        usage_count INTEGER DEFAULT 0,\n        last_used DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS warmer_campaigns (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        session_ids TEXT NOT NULL, -- JSON array of session IDs\n        messages TEXT NOT NULL, -- JSON array of messages\n        delay_min INTEGER DEFAULT 30, -- Minimum delay in seconds\n        delay_max INTEGER DEFAULT 120, -- Maximum delay in seconds\n        duration_minutes INTEGER DEFAULT 60, -- How long to run the campaign\n        template_id INTEGER, -- Optional: reference to warmer_templates\n        status TEXT DEFAULT 'stopped', -- running, stopped\n        messages_sent INTEGER DEFAULT 0,\n        started_at DATETIME,\n        stopped_at DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES warmer_templates(id) ON DELETE SET NULL\n      )", "CREATE TABLE IF NOT EXISTS warmer_templates (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        messages TEXT NOT NULL, -- JSON array of messages\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS warmer_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        campaign_id INTEGER NOT NULL,\n        sender_session_id TEXT NOT NULL,\n        receiver_session_id TEXT NOT NULL,\n        message TEXT NOT NULL,\n        status TEXT DEFAULT 'sent', -- sent, failed\n        error_message TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES warmer_campaigns(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS email_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        to_email TEXT NOT NULL,\n        cc_email TEXT,\n        bcc_email TEXT,\n        subject TEXT NOT NULL,\n        message_id TEXT,\n        status TEXT NOT NULL, -- sent, failed, pending\n        error_message TEXT,\n        template_id INTEGER,\n        conversation_id INTEGER,\n        sent_at DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES email_templates(id),\n        FOREIGN KEY (conversation_id) REFERENCES conversations(id)\n      )", "CREATE TABLE IF NOT EXISTS spintax_state (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        campaign_id INTEGER NOT NULL,\n        spintax_text TEXT NOT NULL,\n        current_index INTEGER DEFAULT 0,\n        total_variations INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS campaign_message_counts (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        campaign_id INTEGER NOT NULL UNIQUE,\n        message_count INTEGER DEFAULT 0,\n        last_family_send_count INTEGER DEFAULT 0,\n        last_sleep_count INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS proxy_settings (\n        id INTEGER PRIMARY KEY,\n        api_key TEXT,\n        asocks_api_key TEXT,\n        balance REAL DEFAULT 0,\n        asocks_balance REAL DEFAULT 0,\n        currency TEXT DEFAULT 'USD',\n        last_sync DATETIME,\n        asocks_last_sync DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS proxies (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        proxy6_id INTEGER UNIQUE,\n        ip TEXT NOT NULL,\n        host TEXT NOT NULL,\n        port INTEGER NOT NULL,\n        username TEXT NOT NULL,\n        password TEXT NOT NULL,\n        type TEXT DEFAULT 'http',\n        country TEXT NOT NULL,\n        version INTEGER DEFAULT 6,\n        date_purchased DATETIME,\n        date_expires DATETIME,\n        is_active BOOLEAN DEFAULT 1,\n        description TEXT,\n        auto_renew BOOLEAN DEFAULT 0,\n        last_checked DATETIME,\n        is_valid BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS campaign_proxy_assignments (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        campaign_id INTEGER NOT NULL,\n        proxy_id INTEGER NOT NULL,\n        session_id TEXT,\n        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE CASCADE,\n        FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS proxy_usage_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        proxy_id INTEGER NOT NULL,\n        campaign_id INTEGER,\n        session_id TEXT,\n        messages_sent INTEGER DEFAULT 0,\n        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id) ON DELETE SET NULL\n      )", "CREATE TABLE IF NOT EXISTS backup_history (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        backup_id TEXT UNIQUE NOT NULL,\n        timestamp DATETIME NOT NULL,\n        description TEXT,\n        file_path TEXT,\n        google_drive_file_id TEXT,\n        encrypted BOOLEAN DEFAULT 0,\n        size INTEGER,\n        includes TEXT, -- JSON object with backup includes\n        status TEXT DEFAULT 'completed', -- completed, failed, in_progress\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS google_drive_config (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        folder_id TEXT,\n        folder_url TEXT,\n        credentials TEXT, -- Encrypted JSON credentials\n        auto_upload BOOLEAN DEFAULT 0,\n        auto_backup_enabled BOOLEAN DEFAULT 0,\n        auto_backup_schedule TEXT DEFAULT '0 2 * * *', -- Daily at 2 AM\n        retention_days INTEGER DEFAULT 30,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS backup_schedules (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        schedule_pattern TEXT NOT NULL, -- Cron pattern\n        enabled BOOLEAN DEFAULT 1,\n        include_database BOOLEAN DEFAULT 1,\n        include_settings BOOLEAN DEFAULT 1,\n        include_templates BOOLEAN DEFAULT 1,\n        include_contacts BOOLEAN DEFAULT 1,\n        include_attachments BOOLEAN DEFAULT 1,\n        encrypt_backup BOOLEAN DEFAULT 1,\n        upload_to_drive BOOLEAN DEFAULT 0,\n        last_run DATETIME,\n        next_run DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS activity_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER,\n        action TEXT, -- action for compatibility\n        action_type TEXT NOT NULL, -- message_sent, contact_added, campaign_started, etc.\n        description TEXT NOT NULL,\n        metadata TEXT, -- JSON object with additional data\n        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- timestamp for compatibility\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id)\n      )", "CREATE TABLE IF NOT EXISTS recall_bot_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER NOT NULL,\n        is_enabled BOOLEAN DEFAULT 0,\n        ai_provider TEXT DEFAULT 'openai', -- openai only\n        ai_api_key TEXT,\n        ai_model TEXT DEFAULT 'gpt-4o-mini',\n        ai_temperature REAL DEFAULT 0.3,\n        default_timezone TEXT DEFAULT 'UTC',\n        voice_transcription_enabled BOOLEAN DEFAULT 1,\n        transcription_provider TEXT DEFAULT 'whisper', -- whisper, google, azure\n        transcription_api_key TEXT,\n        max_reminder_duration_days INTEGER DEFAULT 365,\n        reminder_confirmation_enabled BOOLEAN DEFAULT 1,\n        auto_delete_completed BOOLEAN DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id),\n        UNIQUE(session_id)\n      )", "CREATE TABLE IF NOT EXISTS reminders (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER NOT NULL,\n        user_jid TEXT NOT NULL, -- WhatsApp JID of the user who created the reminder\n        user_name TEXT, -- Display name of the user\n        reminder_text TEXT NOT NULL,\n        original_message TEXT NOT NULL, -- Original message from user\n        scheduled_time DATETIME NOT NULL,\n        timezone TEXT DEFAULT 'UTC',\n        recurrence_type TEXT, -- daily, weekly, monthly, yearly\n        recurrence_interval INTEGER DEFAULT 1, -- every N days/weeks/months\n        recurrence_end_date DATETIME,\n        status TEXT DEFAULT 'active', -- active, completed, cancelled, failed\n        reminder_sent BOOLEAN DEFAULT 0,\n        reminder_sent_at DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        metadata TEXT, -- JSON object with additional data (parsed AI response, etc.)\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id)\n      )", "CREATE TABLE IF NOT EXISTS voice_transcriptions (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER NOT NULL,\n        user_jid TEXT NOT NULL,\n        message_id TEXT NOT NULL, -- WhatsApp message ID\n        audio_duration INTEGER, -- Duration in seconds\n        transcription_text TEXT,\n        transcription_confidence REAL,\n        transcription_provider TEXT,\n        processing_time_ms INTEGER,\n        error_message TEXT,\n        status TEXT DEFAULT 'pending', -- pending, completed, failed\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id)\n      )", "CREATE TABLE IF NOT EXISTS recall_bot_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id INTEGER NOT NULL,\n        user_jid TEXT,\n        reminder_id INTEGER,\n        action_type TEXT NOT NULL, -- reminder_created, reminder_sent, reminder_updated, reminder_cancelled, voice_transcribed, ai_processed\n        message TEXT NOT NULL,\n        metadata TEXT, -- JSON object with additional data\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id),\n        FOREIGN KEY (reminder_id) REFERENCES reminders(id)\n      )", "CREATE TABLE IF NOT EXISTS translation_keys (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        key_path TEXT UNIQUE NOT NULL, -- e.g., 'navigation.dashboard', 'dashboard.title'\n        category TEXT NOT NULL, -- e.g., 'navigation', 'dashboard', 'common', 'messages'\n        english_text TEXT NOT NULL, -- Default English text\n        description TEXT, -- Description of where/how this key is used\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS translation_overrides (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        key_id INTEGER NOT NULL,\n        language_code TEXT NOT NULL, -- e.g., 'es', 'fr', 'ar'\n        custom_text TEXT NOT NULL, -- The translated text\n        is_approved BOOLEAN DEFAULT 0, -- Whether this translation has been reviewed\n        created_by TEXT, -- User who created this translation\n        notes TEXT, -- Notes about the translation\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (key_id) REFERENCES translation_keys(id) ON DELETE CASCADE,\n        UNIQUE(key_id, language_code)\n      )", "CREATE TABLE IF NOT EXISTS translation_stats (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        language_code TEXT UNIQUE NOT NULL,\n        total_keys INTEGER DEFAULT 0,\n        translated_keys INTEGER DEFAULT 0,\n        approved_keys INTEGER DEFAULT 0,\n        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS support_bot_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL UNIQUE,\n        name TEXT NOT NULL,\n        is_active BOOLEAN DEFAULT 1,\n        trigger_field TEXT NOT NULL, -- Which field to use as trigger (e.g., 'customer_id')\n        id_pattern TEXT DEFAULT '^[A-Za-z0-9]+$', -- Regex pattern for customer ID validation\n        response_template TEXT NOT NULL, -- Message template with variables\n        not_found_message TEXT DEFAULT 'Customer ID not found. Please check and try again.',\n        not_found_template_id INTEGER, -- Reference to message_templates table for rich templates\n        attachment_path TEXT, -- Path to image/document to send with response\n        attachment_type TEXT DEFAULT 'image', -- image, video, document\n        priority INTEGER DEFAULT 1, -- Processing priority (lower = higher priority)\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS support_bot_customers (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        customer_data TEXT NOT NULL, -- JSON object with all customer fields\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES support_bot_settings(session_id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS support_bot_field_mappings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        excel_column TEXT NOT NULL, -- Original Excel column name\n        field_name TEXT NOT NULL, -- Mapped field name (e.g., 'customer_id', 'name', 'address')\n        field_type TEXT DEFAULT 'text', -- text, number, date, phone, email\n        is_trigger BOOLEAN DEFAULT 0, -- Whether this field is the trigger field\n        display_order INTEGER DEFAULT 0, -- Order in which to display in response\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES support_bot_settings(session_id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS support_bot_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        user_phone TEXT NOT NULL,\n        lookup_value TEXT NOT NULL, -- The customer ID or value that was searched\n        success BOOLEAN DEFAULT 0,\n        response_sent BOOLEAN DEFAULT 0,\n        error_message TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (session_id) REFERENCES support_bot_settings(session_id) ON DELETE CASCADE\n      )"];
    for (const _0x22f217 of _0x326d17) {
      this.db.run(_0x22f217);
    }
    const _0x31eb02 = ["CREATE TABLE IF NOT EXISTS telegram_sessions (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT UNIQUE NOT NULL,\n        name TEXT NOT NULL,\n        phone_number TEXT,\n        session_string TEXT,\n        status TEXT DEFAULT 'disconnected',\n        user_id TEXT,\n        username TEXT,\n        first_name TEXT,\n        last_name TEXT,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS telegram_conversations (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        chat_id TEXT NOT NULL,\n        chat_type TEXT DEFAULT 'user',\n        title TEXT,\n        username TEXT,\n        unread_count INTEGER DEFAULT 0,\n        last_message TEXT,\n        last_message_at DATETIME,\n        is_pinned BOOLEAN DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE(session_id, chat_id)\n      )", "CREATE TABLE IF NOT EXISTS telegram_messages (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        chat_id TEXT NOT NULL,\n        message_id TEXT NOT NULL,\n        sender_id TEXT,\n        sender_name TEXT,\n        sender_type TEXT DEFAULT 'customer',\n        content TEXT,\n        message_type TEXT DEFAULT 'text',\n        attachment_url TEXT,\n        attachment_name TEXT,\n        attachment_mime_type TEXT,\n        status TEXT DEFAULT 'delivered',\n        timestamp DATETIME,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE(session_id, chat_id, message_id)\n      )", "CREATE TABLE IF NOT EXISTS telegram_auto_replies (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        name TEXT NOT NULL,\n        trigger_keywords TEXT NOT NULL,\n        match_type TEXT DEFAULT 'contains',\n        response_type TEXT DEFAULT 'text',\n        response_text TEXT,\n        template_id INTEGER,\n        is_active BOOLEAN DEFAULT 1,\n        cooldown_minutes INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS telegram_broadcasts (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        session_id TEXT NOT NULL,\n        message_content TEXT NOT NULL,\n        message_type TEXT DEFAULT 'text',\n        recipients TEXT NOT NULL,\n        status TEXT DEFAULT 'draft',\n        scheduled_at DATETIME,\n        started_at DATETIME,\n        completed_at DATETIME,\n        total_count INTEGER DEFAULT 0,\n        sent_count INTEGER DEFAULT 0,\n        failed_count INTEGER DEFAULT 0,\n        delay_seconds INTEGER DEFAULT 3,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS telegram_broadcast_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        broadcast_id INTEGER NOT NULL,\n        chat_id TEXT NOT NULL,\n        status TEXT DEFAULT 'pending',\n        error_message TEXT,\n        sent_at DATETIME,\n        FOREIGN KEY (broadcast_id) REFERENCES telegram_broadcasts(id) ON DELETE CASCADE\n      )", "CREATE TABLE IF NOT EXISTS telegram_ai_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT UNIQUE NOT NULL,\n        is_active BOOLEAN DEFAULT 0,\n        provider TEXT DEFAULT 'openai',\n        api_key TEXT,\n        model TEXT DEFAULT 'gpt-4o-mini',\n        system_prompt TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )"];
    for (const _0x596d60 of _0x31eb02) {
      this.db.run(_0x596d60);
    }
    const _0x4218aa = ["CREATE TABLE IF NOT EXISTS connection_stability_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        event TEXT NOT NULL, -- connection_open, connection_close, reconnect_failed, stream_conflict, health_check_fail, ...\n        details TEXT, -- JSON blob from logConnectionStability\n        timestamp DATETIME NOT NULL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS device_health_snapshots (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        risk_score INTEGER NOT NULL, -- 0-100, higher = healthier\n        risk_level TEXT NOT NULL, -- healthy, elevated, at_risk, critical\n        factors TEXT, -- JSON: per-factor sub-scores + raw metrics\n        messages_24h INTEGER DEFAULT 0,\n        messages_7d INTEGER DEFAULT 0,\n        failure_rate REAL DEFAULT 0,\n        reply_ratio REAL DEFAULT 0,\n        new_contact_ratio REAL DEFAULT 0,\n        instability_events_24h INTEGER DEFAULT 0,\n        opt_out_rate REAL DEFAULT 0,\n        account_age_days INTEGER DEFAULT 0,\n        recommended_daily_limit INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )", "CREATE TABLE IF NOT EXISTS device_ban_events (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        phone_number TEXT,\n        event_type TEXT NOT NULL, -- suspected_ban, confirmed_ban, manual_unlink\n        confidence TEXT, -- high, medium, low\n        disconnect_reason TEXT,\n        risk_score_at_event INTEGER,\n        profile_snapshot TEXT, -- JSON: 7-day sending profile at time of event\n        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        acknowledged BOOLEAN DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )"];
    for (const _0x169265 of _0x4218aa) {
      this.db.run(_0x169265);
    }
    await this.handleTemplateDuplicatesMigration();
    await this.cleanupTemplateDuplicates();
    const _0x4e66c3 = ["CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number)", "CREATE INDEX IF NOT EXISTS idx_message_history_session_contact ON message_history(session_id, contact_phone)", "CREATE INDEX IF NOT EXISTS idx_message_history_timestamp ON message_history(timestamp)", "CREATE INDEX IF NOT EXISTS idx_bulk_recipients_campaign ON bulk_campaign_recipients(campaign_id)", "CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id)", "CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)", "CREATE INDEX IF NOT EXISTS idx_communication_preferences_phone ON communication_preferences(phone_number)", "CREATE INDEX IF NOT EXISTS idx_communication_preferences_status ON communication_preferences(opt_out_status)", "CREATE INDEX IF NOT EXISTS idx_communication_preferences_contact ON communication_preferences(contact_id)", "CREATE INDEX IF NOT EXISTS idx_opt_out_keywords_keyword ON opt_out_keywords(keyword)", "CREATE INDEX IF NOT EXISTS idx_opt_out_keywords_active ON opt_out_keywords(is_active)", "CREATE INDEX IF NOT EXISTS idx_opt_out_requests_phone ON opt_out_requests(phone_number)", "CREATE INDEX IF NOT EXISTS idx_opt_out_requests_processed ON opt_out_requests(processed)", "CREATE INDEX IF NOT EXISTS idx_opt_out_requests_created ON opt_out_requests(created_at)", "CREATE INDEX IF NOT EXISTS idx_compliance_audit_phone ON compliance_audit_log(phone_number)", "CREATE INDEX IF NOT EXISTS idx_compliance_audit_action ON compliance_audit_log(action_type)", "CREATE INDEX IF NOT EXISTS idx_compliance_audit_created ON compliance_audit_log(created_at)", "CREATE INDEX IF NOT EXISTS idx_translation_keys_category ON translation_keys(category)", "CREATE INDEX IF NOT EXISTS idx_translation_keys_active ON translation_keys(is_active)", "CREATE INDEX IF NOT EXISTS idx_translation_overrides_language ON translation_overrides(language_code)", "CREATE INDEX IF NOT EXISTS idx_translation_overrides_approved ON translation_overrides(is_approved)", "CREATE INDEX IF NOT EXISTS idx_translation_stats_language ON translation_stats(language_code)", "CREATE INDEX IF NOT EXISTS idx_connection_stability_session ON connection_stability_logs(session_id)", "CREATE INDEX IF NOT EXISTS idx_connection_stability_timestamp ON connection_stability_logs(timestamp)", "CREATE INDEX IF NOT EXISTS idx_connection_stability_event ON connection_stability_logs(event)", "CREATE INDEX IF NOT EXISTS idx_device_health_session ON device_health_snapshots(session_id)", "CREATE INDEX IF NOT EXISTS idx_device_health_created ON device_health_snapshots(created_at)", "CREATE INDEX IF NOT EXISTS idx_device_ban_events_session ON device_ban_events(session_id)", "CREATE INDEX IF NOT EXISTS idx_device_ban_events_detected ON device_ban_events(detected_at)", "CREATE INDEX IF NOT EXISTS idx_bulk_recipients_session_sent ON bulk_campaign_recipients(session_id, sent_at)", "CREATE INDEX IF NOT EXISTS idx_message_history_direction_ts ON message_history(direction, timestamp)"];
    for (const _0x45e723 of _0x4e66c3) {
      this.db.run(_0x45e723);
    }
    const _0x13f429 = ["ALTER TABLE whatsapp_sessions ADD COLUMN risk_score INTEGER", "ALTER TABLE whatsapp_sessions ADD COLUMN risk_level TEXT", "ALTER TABLE whatsapp_sessions ADD COLUMN risk_computed_at DATETIME", "ALTER TABLE whatsapp_sessions ADD COLUMN recommended_daily_limit INTEGER", "ALTER TABLE whatsapp_sessions ADD COLUMN ban_suspected_at DATETIME", "ALTER TABLE whatsapp_sessions ADD COLUMN ban_reason TEXT", "ALTER TABLE whatsapp_sessions ADD COLUMN cooldown_until DATETIME"];
    for (const _0xf65d3a of _0x13f429) {
      try {
        this.db.run(_0xf65d3a);
      } catch (_0x34f79b) {}
    }
    await this.applyMigrations();
    try {
      this.db.run("ALTER TABLE message_templates ADD COLUMN cta_data TEXT");
    } catch (_0x426134) {}
    try {
      this.db.run("ALTER TABLE message_templates ADD COLUMN copy_data TEXT");
    } catch (_0xc02756) {}
    try {
      this.db.run("ALTER TABLE message_templates ADD COLUMN flow_data TEXT");
    } catch (_0x4028bf) {}
    try {
      this.db.run("ALTER TABLE support_bot_settings ADD COLUMN attachment_path TEXT");
    } catch (_0x12709c) {}
    try {
      this.db.run("ALTER TABLE support_bot_settings ADD COLUMN attachment_type TEXT DEFAULT 'image'");
    } catch (_0x43e401) {}
    await this.runAutoReplyChatbotMigrations();
    await this.runAIChatbotMigrations();
    await this.runFollowUpMigrations();
    await this.runFollowUpTimezoneMigration();
  }
  async runAutoReplyChatbotMigrations() {
    try {
      try {
        const _0xab05c3 = this.db.exec("PRAGMA table_info(auto_reply_rules)")[0];
        if (_0xab05c3) {
          const _0x5af7dd = _0xab05c3.values.map(_0x5ca705 => _0x5ca705[1]);
          if (_0x5af7dd.includes("keywords") || _0x5af7dd.includes("match_type")) {
            let _0xf2f975 = [];
            try {
              const _0x2cdac8 = this.db.exec("SELECT * FROM auto_reply_rules");
              if (_0x2cdac8.length > 0) {
                _0xf2f975 = _0x2cdac8[0].values;
              }
            } catch (_0xec48a1) {}
            this.db.run("DROP TABLE IF EXISTS auto_reply_rules_backup");
            this.db.run("DROP TABLE IF EXISTS auto_reply_rules");
            this.db.run("CREATE TABLE auto_reply_rules (\n              id INTEGER PRIMARY KEY AUTOINCREMENT,\n              session_id TEXT NOT NULL,\n              name TEXT NOT NULL,\n              response TEXT,\n              template_id INTEGER,\n              is_active BOOLEAN DEFAULT 1,\n              priority INTEGER DEFAULT 1,\n              cooldown_minutes INTEGER DEFAULT 0,\n              response_count INTEGER DEFAULT 0,\n              last_used DATETIME,\n              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              FOREIGN KEY (template_id) REFERENCES message_templates(id)\n            )");
            for (const _0x3bb16c of _0xf2f975) {
              try {
                this.db.run("\n                  INSERT INTO auto_reply_rules (\n                    session_id, name, response, template_id,\n                    is_active, priority, cooldown_minutes, response_count, created_at, updated_at\n                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n                ", [_0x3bb16c[1] || "default_session", _0x3bb16c[2] || "Migrated Rule", _0x3bb16c[4] || _0x3bb16c[6] || "Hello!", _0x3bb16c[7] || null, _0x3bb16c[8] || 1, _0x3bb16c[10] || 1, 0, _0x3bb16c[9] || 0, _0x3bb16c[11] || new Date().toISOString(), _0x3bb16c[12] || new Date().toISOString()]);
              } catch (_0x42c53e) {}
            }
          } else {
            if (!_0x5af7dd.includes("target_type")) {
              try {
                this.db.run("ALTER TABLE auto_reply_rules ADD COLUMN target_type TEXT DEFAULT 'all'");
              } catch (_0x9ca747) {}
            }
            if (!_0x5af7dd.includes("target_groups")) {
              try {
                this.db.run("ALTER TABLE auto_reply_rules ADD COLUMN target_groups TEXT");
              } catch (_0x4fb8e2) {}
            }
            if (!_0x5af7dd.includes("typing_enabled")) {
              try {
                this.db.run("ALTER TABLE auto_reply_rules ADD COLUMN typing_enabled INTEGER DEFAULT 0");
              } catch (_0x2e3f00) {}
            }
            if (!_0x5af7dd.includes("typing_seconds")) {
              try {
                this.db.run("ALTER TABLE auto_reply_rules ADD COLUMN typing_seconds INTEGER DEFAULT 3");
              } catch (_0x210880) {}
            }
          }
        } else {}
      } catch (_0x1f6a5e) {
        try {
          this.db.run("CREATE TABLE IF NOT EXISTS auto_reply_rules (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            session_id TEXT NOT NULL,\n            name TEXT NOT NULL,\n            response TEXT,\n            template_id INTEGER,\n            is_active BOOLEAN DEFAULT 1,\n            priority INTEGER DEFAULT 1,\n            cooldown_minutes INTEGER DEFAULT 0,\n            response_count INTEGER DEFAULT 0,\n            last_used DATETIME,\n            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n            FOREIGN KEY (template_id) REFERENCES message_templates(id)\n          )");
        } catch (_0x24c55e) {
          console.error("❌ Failed to create auto_reply_rules table:", _0x24c55e.message);
        }
      }
      try {
        const _0x26a1a4 = this.db.exec("PRAGMA table_info(chatbot_flows)")[0];
        if (_0x26a1a4) {
          const _0x2d8983 = _0x26a1a4.values.map(_0xbb0b9a => _0xbb0b9a[1]);
          let _0x3fde25 = false;
          if (!_0x2d8983.includes("trigger_keywords")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN trigger_keywords TEXT DEFAULT 'help'");
              _0x3fde25 = true;
            } catch (_0x45a69f) {}
          }
          if (!_0x2d8983.includes("conversation_count")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN conversation_count INTEGER DEFAULT 0");
              _0x3fde25 = true;
            } catch (_0xfdd7a8) {}
          }
          if (!_0x2d8983.includes("last_triggered")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN last_triggered DATETIME");
              _0x3fde25 = true;
            } catch (_0x5ae27c) {}
          }
          if (!_0x2d8983.includes("keyword_match_type")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN keyword_match_type TEXT DEFAULT 'contains'");
              _0x3fde25 = true;
            } catch (_0x1a2803) {}
          }
          if (!_0x2d8983.includes("keyword_case_sensitive")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN keyword_case_sensitive BOOLEAN DEFAULT 0");
              _0x3fde25 = true;
            } catch (_0x31f44e) {}
          }
          if (!_0x2d8983.includes("cooldown_minutes")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN cooldown_minutes INTEGER DEFAULT 0");
              _0x3fde25 = true;
            } catch (_0xc71acb) {}
          }
          if (!_0x2d8983.includes("target_type")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN target_type TEXT DEFAULT 'all'");
              _0x3fde25 = true;
            } catch (_0x43c46b) {}
          }
          if (!_0x2d8983.includes("target_groups")) {
            try {
              this.db.run("ALTER TABLE chatbot_flows ADD COLUMN target_groups TEXT");
              _0x3fde25 = true;
            } catch (_0x5b39ca) {}
          }
          if (_0x3fde25) {} else {}
        }
      } catch (_0x55023c) {}
      try {
        const _0x4aa612 = this.db.exec("PRAGMA table_info(chatbot_nodes)")[0];
        if (_0x4aa612) {
          const _0x2eb6f6 = _0x4aa612.values.map(_0x249b45 => _0x249b45[1]);
          if (!_0x2eb6f6.includes("attachment_data")) {
            try {
              this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN attachment_data TEXT");
            } catch (_0x2b6160) {}
          }
          if (!_0x2eb6f6.includes("attachment_type")) {
            try {
              this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN attachment_type TEXT");
            } catch (_0x3ad4ac) {}
          }
          if (!_0x2eb6f6.includes("typing_enabled")) {
            try {
              this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN typing_enabled INTEGER DEFAULT 0");
            } catch (_0x24e73d) {}
          }
          if (!_0x2eb6f6.includes("typing_seconds")) {
            try {
              this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN typing_seconds INTEGER DEFAULT 3");
            } catch (_0x21e407) {}
          }
        }
      } catch (_0x5df4cc) {}
    } catch (_0x154c63) {
      console.error("❌ Error running Auto Reply and Chatbot migrations:", _0x154c63);
    }
  }
  async runMultiSessionMigration() {
    try {
      try {
        const _0xed8bb4 = this.db.exec("PRAGMA table_info(auto_reply_rules)")[0];
        if (_0xed8bb4) {
          const _0x48a6ab = _0xed8bb4.values.map(_0x7ff1cb => _0x7ff1cb[1]);
          if (!_0x48a6ab.includes("session_ids")) {
            this.db.run("ALTER TABLE auto_reply_rules ADD COLUMN session_ids TEXT");
            this.db.run("\n              UPDATE auto_reply_rules\n              SET session_ids = '[\"' || session_id || '\"]'\n              WHERE session_ids IS NULL AND session_id IS NOT NULL AND session_id != ''\n            ");
          }
        }
      } catch (_0x2db771) {
        console.error("Multi-session migration error (auto_reply_rules):", _0x2db771.message);
      }
      try {
        const _0x130319 = this.db.exec("PRAGMA table_info(chatbot_flows)")[0];
        if (_0x130319) {
          const _0x12153c = _0x130319.values.map(_0x24b884 => _0x24b884[1]);
          if (!_0x12153c.includes("session_ids")) {
            this.db.run("ALTER TABLE chatbot_flows ADD COLUMN session_ids TEXT");
            this.db.run("\n              UPDATE chatbot_flows\n              SET session_ids = '[\"' || session_id || '\"]'\n              WHERE session_ids IS NULL AND session_id IS NOT NULL AND session_id != ''\n            ");
          }
        }
      } catch (_0x1aee18) {
        console.error("Multi-session migration error (chatbot_flows):", _0x1aee18.message);
      }
    } catch (_0xc4a68e) {
      console.error("❌ Error running multi-session migration:", _0xc4a68e);
    }
  }
  async runAIChatbotMigrations() {
    try {
      const _0x256c12 = ["ai_providers", "ai_chatbots", "ai_conversations", "ai_messages", "ai_intents", "ai_knowledge_base", "ai_global_settings", "ai_documents", "ai_document_chunks"];
      let _0x547d71 = false;
      try {
        const _0x9d61f1 = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_providers'");
        if (!_0x9d61f1 || _0x9d61f1.length === 0) {
          _0x547d71 = true;
        }
      } catch (_0x27522d) {
        _0x547d71 = true;
      }
      if (!_0x547d71) {
        for (const _0x39cb8d of _0x256c12) {
          try {
            const _0x5a6438 = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='" + _0x39cb8d + "'");
            if (!_0x5a6438 || _0x5a6438.length === 0) {
              _0x547d71 = true;
              break;
            }
          } catch (_0x2cb5da) {
            _0x547d71 = true;
            break;
          }
        }
      }
      if (_0x547d71) {
        await this.createAIChatbotSchema();
      } else {
        await this.runAIChatbotColumnMigrations();
        await this.fixAIProviderModelMismatches();
      }
    } catch (_0x5248f7) {
      console.error("❌ Error running AI Chatbot migrations:", _0x5248f7);
    }
  }
  async fixAIProviderModelMismatches() {
    try {
      const _0x19c445 = this.db.exec("SELECT * FROM ai_providers WHERE is_active = 1");
      if (!_0x19c445 || _0x19c445.length === 0) {
        return;
      }
      const _0x3203fb = _0x19c445[0]?.values || [];
      const _0x20ef32 = _0x19c445[0]?.columns || [];
      let _0x28d1d3 = 0;
      for (const _0x590ecd of _0x3203fb) {
        const _0x2f52c4 = {};
        _0x20ef32.forEach((_0x2554ae, _0x66a3b4) => {
          _0x2f52c4[_0x2554ae] = _0x590ecd[_0x66a3b4];
        });
        const {
          id: _0x4f53df,
          type: _0x43e37e,
          model: _0xbdd237
        } = _0x2f52c4;
        let _0x20b1a = _0xbdd237;
        let _0x428ac6 = false;
        if (_0x43e37e === "gemini" && (_0xbdd237.startsWith("gpt-") || _0xbdd237 === "gpt-3.5-turbo")) {
          _0x20b1a = "gemini-pro";
          _0x428ac6 = true;
        } else if (_0x43e37e === "openai" && _0xbdd237.startsWith("gemini-")) {
          _0x20b1a = "gpt-3.5-turbo";
          _0x428ac6 = true;
        }
        if (_0x428ac6) {
          this.db.run("\n            UPDATE ai_providers SET\n              model = ?,\n              updated_at = CURRENT_TIMESTAMP\n            WHERE id = ?\n          ", [_0x20b1a, _0x4f53df]);
          _0x28d1d3++;
        }
      }
      if (_0x28d1d3 > 0) {} else {}
    } catch (_0x1449e7) {
      console.error("❌ Error fixing AI provider model mismatches:", _0x1449e7);
    }
  }
  async runAIChatbotColumnMigrations() {
    try {
      const _0x3a2597 = this.db.exec("PRAGMA table_info(ai_chatbots)");
      const _0x370486 = [];
      if (_0x3a2597 && _0x3a2597.length > 0) {
        const _0x35b779 = _0x3a2597[0]?.values || [];
        _0x35b779.forEach(_0x4e868a => {
          _0x370486.push(_0x4e868a[1]);
        });
      }
      if (!_0x370486.includes("use_documents")) {
        this.db.run("ALTER TABLE ai_chatbots ADD COLUMN use_documents BOOLEAN DEFAULT 0");
      } else {}
    } catch (_0x28560d) {
      console.error("❌ Error running AI Chatbot column migrations:", _0x28560d);
    }
  }
  async runSupportBotColumnMigrations() {
    try {
      const _0x2ae669 = this.db.exec("PRAGMA table_info(support_bot_settings)");
      const _0x3cabae = [];
      if (_0x2ae669 && _0x2ae669.length > 0) {
        const _0xb5a079 = _0x2ae669[0]?.values || [];
        _0xb5a079.forEach(_0x2360ef => {
          _0x3cabae.push(_0x2360ef[1]);
        });
      }
      if (!_0x3cabae.includes("not_found_template_id")) {
        this.db.run("ALTER TABLE support_bot_settings ADD COLUMN not_found_template_id INTEGER");
      } else {}
    } catch (_0x2043e9) {
      console.error("❌ Error running Support Bot column migrations:", _0x2043e9);
    }
  }
  async runFollowUpMigrations() {
    try {
      const _0xd85b6a = ["follow_up_messages", "follow_up_logs", "follow_up_statistics"];
      let _0x276464 = false;
      try {
        const _0x7f69bf = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='follow_up_messages'");
        if (!_0x7f69bf || _0x7f69bf.length === 0) {
          _0x276464 = true;
        }
      } catch (_0x32fe9d) {
        _0x276464 = true;
      }
      if (_0x276464) {
        await this.createFollowUpSchema();
      } else {}
    } catch (_0x3010b5) {
      console.error("❌ Error running Follow Up migrations:", _0x3010b5);
    }
  }
  async runFollowUpTimezoneMigration() {
    try {
      const _0x206d4f = await this.query("\n        SELECT name FROM sqlite_master WHERE type='table' AND name='follow_up_messages'\n      ");
      if (!_0x206d4f.success || !_0x206d4f.data || _0x206d4f.data.length === 0) {
        console.log("⏭️ Skipping follow-up timezone migration - table does not exist");
        return;
      }
      const _0x4117fd = await this.query("\n        SELECT id, scheduled_at, name FROM follow_up_messages\n        WHERE scheduled_at LIKE '%Z'\n      ");
      if (!_0x4117fd.success || !_0x4117fd.data || _0x4117fd.data.length === 0) {
        console.log("✓ No follow-ups with UTC timestamps (ending with Z) found");
        const _0x1aa611 = await this.query("\n          SELECT id, scheduled_at, name FROM follow_up_messages\n          WHERE status = 'scheduled'\n          AND scheduled_at NOT LIKE '%Z'\n          AND scheduled_at < datetime('now', '+1 hour')\n        ");
        if (_0x1aa611.success && _0x1aa611.data && _0x1aa611.data.length > 0) {
          console.log("⚠️ Found " + _0x1aa611.data.length + " follow-up(s) with suspicious timestamps (in the past or very soon)");
          console.log("   These might have been incorrectly migrated. Please check them manually.");
          _0x1aa611.data.forEach(_0x316284 => {
            console.log("   - ID " + _0x316284.id + ": " + _0x316284.name + " - " + _0x316284.scheduled_at);
          });
        }
        return;
      }
      let _0x1b0c4a = 0;
      for (const _0x333200 of _0x4117fd.data) {
        try {
          const _0x25d901 = new Date(_0x333200.scheduled_at);
          if (isNaN(_0x25d901.getTime())) {
            continue;
          }
          const _0x502fe3 = _0x25d901.getFullYear();
          const _0x348e26 = String(_0x25d901.getMonth() + 1).padStart(2, "0");
          const _0xe7324f = String(_0x25d901.getDate()).padStart(2, "0");
          const _0x2d3989 = String(_0x25d901.getHours()).padStart(2, "0");
          const _0x55abe9 = String(_0x25d901.getMinutes()).padStart(2, "0");
          const _0x3cb9a9 = String(_0x25d901.getSeconds()).padStart(2, "0");
          const _0x3c4e4c = String(_0x25d901.getMilliseconds()).padStart(3, "0");
          const _0x45a9a1 = _0x502fe3 + "-" + _0x348e26 + "-" + _0xe7324f + "T" + _0x2d3989 + ":" + _0x55abe9 + ":" + _0x3cb9a9 + "." + _0x3c4e4c;
          this.db.run("UPDATE follow_up_messages SET scheduled_at = ? WHERE id = ?", [_0x45a9a1, _0x333200.id]);
          _0x1b0c4a++;
        } catch (_0x3bf8d2) {
          console.error("  ✗ Error migrating follow-up " + _0x333200.id + ":", _0x3bf8d2.message);
        }
      }
    } catch (_0x36a1b9) {
      console.error("❌ Error running follow-up timezone migration:", _0x36a1b9);
    }
  }
  async runLIDMappingsMigration() {
    try {
      const _0x3bb059 = this.db.prepare("\n        SELECT name FROM sqlite_master\n        WHERE type='table' AND name='lid_mappings'\n      ");
      const _0x3a5447 = _0x3bb059.step();
      _0x3bb059.free();
      if (!_0x3a5447) {
        this.db.run("\n          CREATE TABLE IF NOT EXISTS lid_mappings (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            session_id TEXT NOT NULL,\n            lid TEXT NOT NULL,\n            jid TEXT NOT NULL,\n            contact_name TEXT,\n            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n            UNIQUE(session_id, lid)\n          )\n        ");
        this.db.run("CREATE INDEX IF NOT EXISTS idx_lid_mappings_session_lid ON lid_mappings(session_id, lid)");
        this.db.run("CREATE INDEX IF NOT EXISTS idx_lid_mappings_jid ON lid_mappings(jid)");
      } else {}
    } catch (_0x53e173) {
      console.error("❌ Error running LID mappings migration:", _0x53e173);
    }
  }
  async runLiveChatStatusMigration() {
    try {
      this.db.run("\n        UPDATE live_chat_conversations\n        SET status = 'active'\n        WHERE status IS NULL OR status = ''\n      ");
    } catch (_0x4db0ca) {
      console.error("❌ Error running Live Chat status migration:", _0x4db0ca);
    }
  }
  async createFollowUpSchema() {
    try {
      const _0x3bebf8 = require("fs");
      const _0xf401f8 = require("path");
      const _0x45359d = _0xf401f8.join(__dirname, "..", "database", "migrations", "follow_up_schema.sql");
      if (_0x3bebf8.existsSync(_0x45359d)) {
        const _0x21c56d = _0x3bebf8.readFileSync(_0x45359d, "utf8");
        try {
          this.db.exec(_0x21c56d);
        } catch (_0x2ac10e) {
          console.error("❌ Error executing migration SQL:", _0x2ac10e.message);
          const _0x152840 = _0x21c56d.split(";").map(_0x833942 => _0x833942.trim()).filter(_0xdca5c7 => _0xdca5c7.length > 0 && !_0xdca5c7.startsWith("--"));
          for (const _0x29bebf of _0x152840) {
            if (_0x29bebf.trim()) {
              try {
                this.db.run(_0x29bebf + ";");
              } catch (_0xea07ae) {
                console.error("❌ Error executing statement:", _0x29bebf.substring(0, 100) + "...");
                console.error("❌ Error details:", _0xea07ae.message);
              }
            }
          }
        }
      } else {
        this.createBasicFollowUpSchema();
      }
    } catch (_0x364151) {
      console.error("❌ Error creating Follow Up schema:", _0x364151);
      this.createBasicFollowUpSchema();
    }
  }
  createBasicFollowUpSchema() {
    try {
      this.db.run("CREATE TABLE IF NOT EXISTS follow_up_messages (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        session_id TEXT NOT NULL,\n        contact_phone TEXT NOT NULL,\n        contact_name TEXT,\n        contact_display_name TEXT,\n        message_content TEXT NOT NULL,\n        message_type TEXT DEFAULT 'text',\n        template_id INTEGER,\n        template_name TEXT,\n        template_type TEXT,\n        attachment_file TEXT,\n        attachment_type TEXT,\n        attachment_data TEXT,\n        scheduled_at DATETIME NOT NULL,\n        sent_at DATETIME,\n        status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'cancelled', 'paused', 'skipped')),\n        priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 4),\n        category TEXT DEFAULT 'general',\n        tags TEXT DEFAULT '[]',\n        variables TEXT DEFAULT '{}',\n        is_recurring BOOLEAN DEFAULT 0,\n        recurring_pattern TEXT,\n        parent_follow_up_id INTEGER,\n        retry_count INTEGER DEFAULT 0,\n        max_retries INTEGER DEFAULT 3,\n        last_attempt_at DATETIME,\n        send_if_replied BOOLEAN DEFAULT 1,\n        auto_reschedule BOOLEAN DEFAULT 0,\n        notes TEXT,\n        message_id TEXT,\n        device_name TEXT,\n        created_by TEXT DEFAULT 'user',\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (template_id) REFERENCES message_templates(id),\n        FOREIGN KEY (parent_follow_up_id) REFERENCES follow_up_messages(id)\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS follow_up_logs (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        follow_up_id INTEGER NOT NULL,\n        action TEXT NOT NULL,\n        status_before TEXT,\n        status_after TEXT,\n        message TEXT,\n        error_details TEXT,\n        execution_time INTEGER,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (follow_up_id) REFERENCES follow_up_messages(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS follow_up_statistics (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        date DATE NOT NULL,\n        total_scheduled INTEGER DEFAULT 0,\n        total_sent INTEGER DEFAULT 0,\n        total_failed INTEGER DEFAULT 0,\n        total_cancelled INTEGER DEFAULT 0,\n        total_skipped INTEGER DEFAULT 0,\n        avg_delivery_time REAL,\n        success_rate REAL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE(date)\n      )");
    } catch (_0x5bf0f7) {
      console.error("❌ Error creating basic Follow Up schema:", _0x5bf0f7);
    }
  }
  async createAIChatbotSchema() {
    try {
      this.db.run("CREATE TABLE IF NOT EXISTS ai_providers (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        type TEXT NOT NULL CHECK (type IN ('openai', 'gemini')),\n        api_key TEXT NOT NULL,\n        model TEXT NOT NULL,\n        temperature REAL DEFAULT 0.7,\n        max_tokens INTEGER DEFAULT 1000,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_chatbots (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        name TEXT NOT NULL,\n        description TEXT,\n        provider_id INTEGER NOT NULL,\n        system_prompt TEXT,\n        language TEXT DEFAULT 'en',\n        is_active BOOLEAN DEFAULT 1,\n        session_ids TEXT,\n        trigger_keywords TEXT,\n        stop_keywords TEXT,\n        features TEXT,\n        personality TEXT DEFAULT 'professional',\n        industry TEXT DEFAULT 'general',\n        response_delay INTEGER DEFAULT 1000,\n        fallback_message TEXT,\n        max_conversation_length INTEGER DEFAULT 50,\n        enable_learning BOOLEAN DEFAULT 1,\n        confidence_threshold REAL DEFAULT 0.7,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE RESTRICT\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_conversations (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        session_id TEXT NOT NULL,\n        user_phone TEXT NOT NULL,\n        conversation_id TEXT NOT NULL,\n        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'escalated', 'timeout')),\n        context TEXT,\n        satisfaction_score REAL,\n        resolved BOOLEAN DEFAULT 0,\n        escalated_to_human BOOLEAN DEFAULT 0,\n        response_time REAL,\n        message_count INTEGER DEFAULT 0,\n        language_detected TEXT,\n        sentiment_score REAL,\n        intent_detected TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_messages (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        conversation_id INTEGER NOT NULL,\n        message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot', 'system')),\n        content TEXT NOT NULL,\n        metadata TEXT,\n        tokens_used INTEGER,\n        processing_time REAL,\n        confidence_score REAL,\n        intent TEXT,\n        sentiment TEXT,\n        language TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS poll_messages (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        message_id TEXT NOT NULL UNIQUE, -- WhatsApp message ID\n        session_id TEXT NOT NULL,\n        sender_jid TEXT NOT NULL, -- Sender's WhatsApp JID\n        recipient_jid TEXT NOT NULL, -- Recipient's WhatsApp JID (individual or group)\n        poll_question TEXT NOT NULL,\n        poll_options TEXT NOT NULL, -- JSON array of poll options\n        selectable_count INTEGER DEFAULT 1,\n        campaign_id INTEGER, -- Link to bulk campaign if sent via campaign\n        template_id INTEGER, -- Link to template if sent via template\n        sent_at DATETIME NOT NULL,\n        expires_at DATETIME, -- When poll expires (if applicable)\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id),\n        FOREIGN KEY (template_id) REFERENCES message_templates(id)\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS poll_options (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        poll_message_id INTEGER NOT NULL,\n        option_text TEXT NOT NULL,\n        option_index INTEGER NOT NULL, -- Order of option in poll\n        option_hash TEXT, -- SHA256 hash used by WhatsApp for voting\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (poll_message_id) REFERENCES poll_messages(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS poll_votes (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        poll_message_id INTEGER NOT NULL,\n        poll_option_id INTEGER NOT NULL,\n        voter_jid TEXT NOT NULL, -- Voter's WhatsApp JID\n        voter_name TEXT, -- Voter's display name\n        vote_message_id TEXT, -- WhatsApp message ID of the vote\n        voted_at DATETIME NOT NULL,\n        sender_timestamp_ms BIGINT, -- Original timestamp from WhatsApp\n        server_timestamp_ms BIGINT, -- Server timestamp from WhatsApp\n        is_valid BOOLEAN DEFAULT 1, -- Whether vote is valid (not retracted)\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (poll_message_id) REFERENCES poll_messages(id) ON DELETE CASCADE,\n        FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE,\n        UNIQUE(poll_message_id, voter_jid, poll_option_id) -- Prevent duplicate votes for same option\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_intents (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT,\n        training_phrases TEXT NOT NULL,\n        response_templates TEXT,\n        action_type TEXT,\n        action_data TEXT,\n        confidence_threshold REAL DEFAULT 0.7,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_knowledge_base (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        category TEXT,\n        question TEXT NOT NULL,\n        answer TEXT NOT NULL,\n        keywords TEXT,\n        confidence_threshold REAL DEFAULT 0.8,\n        usage_count INTEGER DEFAULT 0,\n        last_used DATETIME,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_global_settings (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        key TEXT UNIQUE NOT NULL,\n        value TEXT NOT NULL,\n        description TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_decision_flows (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT,\n        trigger_keywords TEXT,\n        flow_data TEXT NOT NULL,\n        is_active BOOLEAN DEFAULT 1,\n        priority INTEGER DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_form_templates (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT,\n        fields TEXT NOT NULL,\n        submit_message TEXT,\n        validation_rules TEXT,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_form_submissions (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        form_template_id INTEGER NOT NULL,\n        conversation_id INTEGER NOT NULL,\n        user_phone TEXT NOT NULL,\n        submission_data TEXT NOT NULL,\n        status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned')),\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (form_template_id) REFERENCES ai_form_templates(id) ON DELETE CASCADE,\n        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_appointments (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        conversation_id INTEGER NOT NULL,\n        user_phone TEXT NOT NULL,\n        appointment_type TEXT,\n        appointment_date DATETIME,\n        duration INTEGER,\n        status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),\n        notes TEXT,\n        reminder_sent BOOLEAN DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE,\n        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_learning_data (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        conversation_id INTEGER NOT NULL,\n        user_input TEXT NOT NULL,\n        bot_response TEXT NOT NULL,\n        user_feedback TEXT,\n        correction TEXT,\n        context TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE,\n        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_documents (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        chatbot_id INTEGER NOT NULL,\n        name TEXT NOT NULL,\n        original_filename TEXT NOT NULL,\n        file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'doc', 'docx', 'txt')),\n        file_size INTEGER NOT NULL,\n        file_path TEXT,\n        extracted_text TEXT,\n        processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),\n        processing_error TEXT,\n        chunk_count INTEGER DEFAULT 0,\n        is_active BOOLEAN DEFAULT 1,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (chatbot_id) REFERENCES ai_chatbots(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE TABLE IF NOT EXISTS ai_document_chunks (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        document_id INTEGER NOT NULL,\n        chunk_index INTEGER NOT NULL,\n        content TEXT NOT NULL,\n        word_count INTEGER NOT NULL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE\n      )");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(type)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_chatbots_provider_id ON ai_chatbots(provider_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_conversations_chatbot_id ON ai_conversations(chatbot_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_phone ON ai_conversations(user_phone)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_knowledge_base_chatbot_id ON ai_knowledge_base(chatbot_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_intents_chatbot_id ON ai_intents(chatbot_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_appointments_chatbot_id ON ai_appointments(chatbot_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_appointments_date ON ai_appointments(appointment_date)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_documents_chatbot_id ON ai_documents(chatbot_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_documents_processing_status ON ai_documents(processing_status)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_document_id ON ai_document_chunks(document_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_session ON poll_messages(session_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_sender ON poll_messages(sender_jid)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_recipient ON poll_messages(recipient_jid)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_sent_at ON poll_messages(sent_at)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_active ON poll_messages(is_active)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_messages_campaign ON poll_messages(campaign_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_message_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_message_id)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_votes_voter ON poll_votes(voter_jid)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_votes_voted_at ON poll_votes(voted_at)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_poll_votes_valid ON poll_votes(is_valid)");
      this.db.run("INSERT OR IGNORE INTO ai_global_settings (key, value, description) VALUES\n        ('global_config', '{\"enableGlobalFallback\": true, \"enableAnalytics\": true, \"enableLearning\": true}', 'Global AI configuration settings'),\n        ('rate_limits', '{\"maxConcurrentConversations\": 100, \"rateLimitPerUser\": 10, \"rateLimitWindow\": 60}', 'Rate limiting configuration'),\n        ('features', '{\"enableSentimentAnalysis\": true, \"enableLanguageDetection\": true, \"enableProfanityFilter\": true}', 'Global feature flags')");
      try {
        const _0x154f63 = this.db.prepare("PRAGMA table_info(ai_chatbots)").all();
        const _0x518d7a = _0x154f63.map(_0x249c8f => _0x249c8f.name);
        if (!_0x518d7a.includes("trigger_keywords")) {
          this.db.run("ALTER TABLE ai_chatbots ADD COLUMN trigger_keywords TEXT");
        }
        if (!_0x518d7a.includes("stop_keywords")) {
          this.db.run("ALTER TABLE ai_chatbots ADD COLUMN stop_keywords TEXT");
        }
        if (!_0x518d7a.includes("use_documents")) {
          this.db.run("ALTER TABLE ai_chatbots ADD COLUMN use_documents BOOLEAN DEFAULT 0");
        }
      } catch (_0x21cab3) {}
    } catch (_0x578c79) {
      console.error("❌ Error creating AI Chatbot schema:", _0x578c79);
      throw _0x578c79;
    }
  }
  async insertDefaultSettings() {
    const _0x4bd197 = [{
      key: "app_theme",
      value: "light",
      type: "string",
      description: "Application theme"
    }, {
      key: "message_delay",
      value: "5",
      type: "number",
      description: "Default delay between bulk messages (seconds)"
    }, {
      key: "auto_reply_enabled",
      value: "true",
      type: "boolean",
      description: "Enable auto reply globally"
    }, {
      key: "call_response_enabled",
      value: "true",
      type: "boolean",
      description: "Enable call response globally"
    }, {
      key: "max_sessions",
      value: "10",
      type: "number",
      description: "Maximum WhatsApp sessions allowed"
    }, {
      key: "backup_enabled",
      value: "true",
      type: "boolean",
      description: "Enable automatic database backups"
    }, {
      key: "backup_interval",
      value: "24",
      type: "number",
      description: "Backup interval in hours"
    }, {
      key: "backup_auto_upload",
      value: "false",
      type: "boolean",
      description: "Auto upload backups to Google Drive"
    }, {
      key: "backup_encryption",
      value: "true",
      type: "boolean",
      description: "Encrypt backups by default"
    }, {
      key: "backup_retention_days",
      value: "30",
      type: "number",
      description: "Number of days to keep backups"
    }, {
      key: "google_drive_folder_id",
      value: "",
      type: "string",
      description: "Google Drive folder ID for backups"
    }, {
      key: "google_drive_folder_url",
      value: "",
      type: "string",
      description: "Google Drive folder URL for backups"
    }, {
      key: "app_language",
      value: "en",
      type: "string",
      description: "Application language"
    }, {
      key: "window_show_title_bar",
      value: "true",
      type: "boolean",
      description: "Show window title bar and menu"
    }];
    for (const _0x2ecd56 of _0x4bd197) {
      this.db.run("\n        INSERT OR IGNORE INTO app_settings (key, value, type, description)\n        VALUES (?, ?, ?, ?)\n      ", [_0x2ecd56.key, _0x2ecd56.value, _0x2ecd56.type, _0x2ecd56.description]);
    }
    const _0x38be38 = this.db.prepare("SELECT COUNT(*) as count FROM bulk_message_settings").get();
    if (_0x38be38.count === 0) {
      this.db.run("\n        INSERT INTO bulk_message_settings (\n          spintax_enabled, random_enabled, random_prefix, family_numbers_enabled,\n          family_numbers, family_message_interval, hook_number_enabled, hook_number,\n          sleep_timing_enabled, sleep_after_messages, sleep_duration_seconds\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [1, 1, "LW", 1, "[]", 50, 1, "", 1, 50, 30]);
    }
    await this.insertDefaultOptOutKeywords();
  }
  async insertDefaultOptOutKeywords() {
    this.db.run("DELETE FROM opt_out_keywords");
    const _0x5b09ff = [{
      keyword: "UNSUBSCRIBE",
      language: "en",
      auto_response_template: "You have been unsubscribed from our messages. Reply SUBSCRIBE to opt back in."
    }, {
      keyword: "SUBSCRIBE",
      language: "en",
      auto_response_template: "You have been subscribed to our messages. Reply UNSUBSCRIBE to unsubscribe."
    }];
    for (const _0x408737 of _0x5b09ff) {
      this.db.run("\n        INSERT INTO opt_out_keywords (keyword, language, auto_response_template, case_sensitive)\n        VALUES (?, ?, ?, 0)\n      ", [_0x408737.keyword, _0x408737.language, _0x408737.auto_response_template]);
    }
  }
  async saveDatabase() {
    try {
      this.dbRaw?.pragma("wal_checkpoint(PASSIVE)");
    } catch (_0x1b78b5) {
      if (global.logToFile) {
        global.logToFile("⚠️ WAL checkpoint (saveDatabase) failed: " + _0x1b78b5.message);
      }
    }
  }
  async run(_0x252d4c, _0x5cb3ed = []) {
    try {
      if (!this.dbRaw) {
        return {
          success: false,
          error: "Database not initialized"
        };
      }
      const _0x53366a = _0x5cb3ed.map(_0x340c99 => {
        if (_0x340c99 === undefined) {
          return null;
        }
        if (_0x340c99 === null) {
          return null;
        }
        if (typeof _0x340c99 === "object") {
          return JSON.stringify(_0x340c99);
        }
        return _0x340c99;
      });
      const _0x56293e = this.dbRaw.prepare(_0x252d4c).run(_0x53366a);
      const _0xe443aa = _0x56293e.changes;
      const _0x2f2587 = Number(_0x56293e.lastInsertRowid);
      return {
        success: true,
        lastID: _0x2f2587,
        insertId: _0x2f2587,
        changes: _0xe443aa,
        data: {
          lastID: _0x2f2587
        }
      };
    } catch (_0x22adbf) {
      if (process.env.NODE_ENV === "development" && !_0x22adbf.message.includes("no such table")) {
        console.error("Database query error:", _0x22adbf);
      }
      return {
        success: false,
        error: _0x22adbf.message
      };
    }
  }
  async get(_0x368474, _0xf89a30 = []) {
    try {
      if (!this.dbRaw) {
        return null;
      }
      const _0x8ea36b = _0xf89a30.map(_0x39dd41 => _0x39dd41 === undefined ? null : _0x39dd41);
      const _0x510a04 = this.dbRaw.prepare(_0x368474).get(_0x8ea36b);
      if (_0x510a04 === undefined) {
        return null;
      } else {
        return _0x510a04;
      }
    } catch (_0x541382) {
      if (process.env.NODE_ENV === "development" && !_0x541382.message.includes("no such table")) {
        console.error("Database query error:", _0x541382);
      }
      return null;
    }
  }
  async all(_0x2bbc2f, _0x545647 = []) {
    try {
      if (!this.dbRaw) {
        return {
          success: false,
          error: "Database not initialized",
          data: []
        };
      }
      const _0xf692c6 = _0x545647.map(_0x40cbf2 => _0x40cbf2 === undefined ? null : _0x40cbf2);
      const _0x213a87 = this.dbRaw.prepare(_0x2bbc2f).all(_0xf692c6);
      return {
        success: true,
        data: Array.isArray(_0x213a87) ? _0x213a87 : []
      };
    } catch (_0x227a04) {
      if (process.env.NODE_ENV === "development" && !_0x227a04.message.includes("no such table")) {
        console.error("Database query error:", _0x227a04);
      }
      return {
        success: false,
        error: _0x227a04.message,
        data: []
      };
    }
  }
  async query(_0x304aea, _0x49c6b6 = []) {
    const _0x3e4a9b = _0x93634f => {
      const _0x472f1f = _0x93634f.trim().toUpperCase();
      return _0x472f1f.startsWith("SELECT") || _0x472f1f.startsWith("PRAGMA");
    };
    try {
      if (_0x3e4a9b(_0x304aea)) {
        const _0x5a12a1 = await this.all(_0x304aea, _0x49c6b6);
        if (_0x5a12a1.success && !Array.isArray(_0x5a12a1.data)) {
          _0x5a12a1.data = [];
        }
        return _0x5a12a1;
      } else {
        return await this.run(_0x304aea, _0x49c6b6);
      }
    } catch (_0x5d5a6f) {
      if (process.env.NODE_ENV === "development" && !_0x5d5a6f.message.includes("no such table")) {
        console.error("Database query error:", _0x5d5a6f);
      }
      return {
        success: false,
        error: _0x5d5a6f.message,
        data: _0x3e4a9b(_0x304aea) ? [] : null
      };
    }
  }
  async transaction(_0x12be4e) {
    if (!this.dbRaw) {
      return {
        success: false,
        error: "Database not initialized"
      };
    }
    let _0x2af045 = -1;
    let _0x5ac371 = null;
    try {
      const _0x30e0c0 = [];
      const _0x369721 = this.dbRaw.transaction(() => {
        for (let _0x5435fc = 0; _0x5435fc < _0x12be4e.length; _0x5435fc++) {
          const {
            sql: _0x3f4638,
            params = []
          } = _0x12be4e[_0x5435fc];
          const _0x204910 = params.map(_0x32e479 => {
            if (_0x32e479 === undefined) {
              return null;
            }
            if (_0x32e479 === null) {
              return null;
            }
            if (typeof _0x32e479 === "object") {
              return JSON.stringify(_0x32e479);
            }
            return _0x32e479;
          });
          try {
            const _0xc7a90 = this.dbRaw.prepare(_0x3f4638);
            if (_0x3f4638.trim().toUpperCase().startsWith("SELECT")) {
              const _0x3cf4dd = _0xc7a90.all(_0x204910);
              _0x30e0c0.push({
                success: true,
                data: _0x3cf4dd
              });
            } else {
              const _0x9b9976 = _0xc7a90.run(_0x204910);
              const _0x4f32c0 = Number(_0x9b9976.lastInsertRowid);
              _0x30e0c0.push({
                success: true,
                lastID: _0x4f32c0,
                insertId: _0x4f32c0,
                changes: _0x9b9976.changes,
                data: {
                  lastID: _0x4f32c0
                }
              });
            }
          } catch (_0x5860c7) {
            _0x2af045 = _0x5435fc;
            _0x5ac371 = _0x5860c7;
            throw _0x5860c7;
          }
        }
      });
      _0x369721();
      return {
        success: true,
        results: _0x30e0c0
      };
    } catch (_0x55f5fd) {
      if (_0x2af045 >= 0) {
        console.error("❌ Query " + (_0x2af045 + 1) + " failed:", _0x5ac371.message);
        return {
          success: false,
          error: "Transaction failed at query " + (_0x2af045 + 1) + ": " + _0x5ac371.message,
          failedQueryIndex: _0x2af045
        };
      }
      console.error("❌ Transaction error:", _0x55f5fd);
      return {
        success: false,
        error: _0x55f5fd.message
      };
    }
  }
  async close() {
    this.stopAutoSave();
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (this._inFlightSave) {
      try {
        await this._inFlightSave;
      } catch (_0x2c1dee) {}
    }
    if (this.db) {
      try {
        await this.saveDatabase();
        if (global.logToFile) {
          global.logToFile("✅ Final database save completed before shutdown");
        }
      } catch (_0x2df551) {
        console.error("Error during final database save:", _0x2df551);
        if (global.logToFile) {
          global.logToFile("❌ Error during final database save: " + _0x2df551.message);
        }
      }
      this.isShuttingDown = true;
      try {
        this.db.close();
        if (global.logToFile) {
          global.logToFile("✅ Database closed successfully");
        }
      } catch (_0x4e8243) {
        console.error("Error closing database connection:", _0x4e8243);
        if (global.logToFile) {
          global.logToFile("❌ Error closing database connection: " + _0x4e8243.message);
        }
      }
    } else {
      this.isShuttingDown = true;
    }
  }
  async createBackup() {
    try {
      if (!this.dbRaw || !this.dbPath) {
        return {
          success: false,
          error: "Database not initialized"
        };
      }
      const _0x388794 = path.join(path.dirname(this.dbPath), "backups");
      await fs.mkdir(_0x388794, {
        recursive: true
      });
      const _0x5601e6 = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
      const _0x15c190 = "wapp_backup_" + _0x5601e6 + ".db";
      this.backupPath = path.join(_0x388794, _0x15c190);
      try {
        await this.dbRaw.backup(this.backupPath);
      } catch (_0x12e507) {
        if (global.logToFile) {
          global.logToFile("⚠️ backup() API failed, falling back to checkpoint+copy: " + _0x12e507.message);
        }
        try {
          this.dbRaw.pragma("wal_checkpoint(TRUNCATE)");
        } catch (_0x50c922) {}
        await fs.copyFile(this.dbPath, this.backupPath);
      }
      try {
        const _0x8e90ab = await fs.readdir(_0x388794);
        const _0x34b223 = _0x8e90ab.filter(_0x6cd7a8 => _0x6cd7a8.startsWith("wapp_backup_") && _0x6cd7a8.endsWith(".db")).sort().reverse();
        for (let _0x102380 = 7; _0x102380 < _0x34b223.length; _0x102380++) {
          await fs.unlink(path.join(_0x388794, _0x34b223[_0x102380]));
        }
      } catch (_0x2cf141) {}
      if (global.logToFile) {
        global.logToFile("✅ Database backup created: " + _0x15c190);
      }
      return {
        success: true,
        backupPath: this.backupPath
      };
    } catch (_0x2cf56e) {
      if (global.logToFile) {
        global.logToFile("❌ Backup creation failed: " + _0x2cf56e.message);
      }
      return {
        success: false,
        error: _0x2cf56e.message
      };
    }
  }
  async restoreFromBackup() {
    try {
      const _0x1b1201 = path.join(path.dirname(this.dbPath), "backups");
      const _0x528626 = await fs.readdir(_0x1b1201);
      const _0x461438 = _0x528626.filter(_0x2e9eba => _0x2e9eba.startsWith("wapp_backup_") && _0x2e9eba.endsWith(".db")).sort().reverse();
      if (_0x461438.length === 0) {
        return {
          success: false,
          error: "No backups found"
        };
      }
      const _0x64a67a = path.join(_0x1b1201, _0x461438[0]);
      if (global.logToFile) {
        global.logToFile("🔄 Restoring from backup: " + _0x461438[0]);
      }
      const _0x5d017b = this._validateDbFile(_0x64a67a);
      if (!_0x5d017b.valid) {
        const _0x139e05 = "Backup failed validation: " + _0x461438[0];
        if (global.logToFile) {
          global.logToFile("❌ " + _0x139e05);
        }
        return {
          success: false,
          error: _0x139e05
        };
      }
      try {
        if (this.dbRaw) {
          this.dbRaw.close();
        }
      } catch (_0xe456a6) {
        if (global.logToFile) {
          global.logToFile("⚠️ Error closing live DB before restore: " + _0xe456a6.message);
        }
      }
      this.dbRaw = null;
      this.db = null;
      await fs.copyFile(_0x64a67a, this.dbPath);
      for (const _0x1421fa of ["-wal", "-shm"]) {
        try {
          await fs.unlink("" + this.dbPath + _0x1421fa);
        } catch (_0x320181) {}
      }
      const _0xd3f883 = this._getNativeDriver();
      this.dbRaw = new _0xd3f883(this.dbPath);
      this.dbRaw.pragma("journal_mode = WAL");
      this.dbRaw.pragma("synchronous = NORMAL");
      this.dbRaw.pragma("foreign_keys = ON");
      this.dbRaw.pragma("busy_timeout = 5000");
      this.db = new SqlJsCompatAdapter(this.dbRaw);
      if (global.logToFile) {
        global.logToFile("✅ Database restored from backup");
      }
      return {
        success: true,
        restoredFrom: _0x461438[0]
      };
    } catch (_0x371d62) {
      if (global.logToFile) {
        global.logToFile("❌ Restore failed: " + _0x371d62.message);
      }
      return {
        success: false,
        error: _0x371d62.message
      };
    }
  }
  async getStats() {
    const _0x4f803c = {};
    const _0xc6c4d1 = ["whatsapp_sessions", "message_templates", "contacts", "contact_groups", "bulk_campaigns", "message_history", "auto_reply_rules"];
    for (const _0x3721b4 of _0xc6c4d1) {
      try {
        if (_0x3721b4 === "message_history") {
          const _0x2b18fa = await this.query("SELECT COUNT(*) as count FROM " + _0x3721b4 + " WHERE direction = 'outgoing'");
          _0x4f803c[_0x3721b4] = _0x2b18fa.success && _0x2b18fa.data && _0x2b18fa.data.length > 0 ? _0x2b18fa.data[0].count : 0;
        } else {
          const _0x45ca5f = await this.query("SELECT COUNT(*) as count FROM " + _0x3721b4);
          _0x4f803c[_0x3721b4] = _0x45ca5f.success && _0x45ca5f.data && _0x45ca5f.data.length > 0 ? _0x45ca5f.data[0].count : 0;
        }
      } catch (_0x423f9f) {
        console.error("Error getting stats for table " + _0x3721b4 + ":", _0x423f9f);
        _0x4f803c[_0x3721b4] = 0;
      }
    }
    return _0x4f803c;
  }
  async addMissingColumns() {
    try {
      const _0x1b9e58 = await this.query("PRAGMA table_info(whatsapp_sessions)");
      const _0x11b3d2 = _0x1b9e58.success && Array.isArray(_0x1b9e58.data) ? _0x1b9e58.data : [];
      const _0x11a1f8 = _0x11b3d2.map(_0x7e89e => _0x7e89e.name || _0x7e89e[1]);
      const _0x53125f = async (_0x23b590, _0x482a15) => {
        if (_0x11a1f8.includes(_0x23b590)) {
          return;
        }
        try {
          await this.query("ALTER TABLE whatsapp_sessions ADD COLUMN " + _0x23b590 + " " + _0x482a15);
        } catch (_0x33dc17) {
          if (_0x33dc17.message && _0x33dc17.message.includes("duplicate column name")) {} else {
            console.error("❌ Error adding " + _0x23b590 + " column:", _0x33dc17.message);
          }
        }
      };
      await _0x53125f("profile_picture", "TEXT");
      await _0x53125f("last_seen", "DATETIME");
      await _0x53125f("connected_at", "DATETIME");
      await _0x53125f("disconnected_at", "DATETIME");
      const _0x2ad4f1 = await this.query("PRAGMA table_info(message_templates)");
      const _0x3daee6 = _0x2ad4f1.success && Array.isArray(_0x2ad4f1.data) ? _0x2ad4f1.data : [];
      const _0x3d663a = _0x3daee6.map(_0x5a57d6 => _0x5a57d6.name || _0x5a57d6[1]);
      const _0x2129d6 = async (_0x436a28, _0xb36bf9) => {
        if (_0x3d663a.includes(_0x436a28)) {
          return;
        }
        try {
          await this.query("ALTER TABLE message_templates ADD COLUMN " + _0x436a28 + " " + _0xb36bf9);
        } catch (_0x15b636) {
          if (_0x15b636.message && _0x15b636.message.includes("duplicate column name")) {} else {
            console.error("❌ Error adding " + _0x436a28 + " column:", _0x15b636.message);
          }
        }
      };
      await _0x2129d6("type", "TEXT DEFAULT 'text'");
      await _0x2129d6("buttons", "TEXT");
      await _0x2129d6("list_sections", "TEXT");
      await _0x2129d6("poll_options", "TEXT");
      await _0x2129d6("contact_info", "TEXT");
      await _0x2129d6("location_info", "TEXT");
      await _0x2129d6("media_settings", "TEXT");
      await _0x2129d6("interactive_settings", "TEXT");
      await _0x2129d6("mixed_buttons_data", "TEXT");
      await _0x2129d6("carousel_cards", "TEXT");
      await _0x2129d6("carousel_settings", "TEXT");
      await _0x2129d6("rich_message_data", "TEXT");
      await _0x2129d6("link_preview_data", "TEXT");
      await _0x2129d6("group_options", "TEXT");
      await _0x2129d6("carousel_card_extras", "TEXT");
      await _0x2129d6("delivery_warnings", "TEXT");
      const _0x3f265d = await this.query("PRAGMA table_info(contacts)");
      const _0x15c8b1 = _0x3f265d.success && Array.isArray(_0x3f265d.data) ? _0x3f265d.data : [];
      const _0xac33bf = _0x15c8b1.map(_0x4d1437 => _0x4d1437.name || _0x4d1437[1]);
      const _0x1f68fa = async (_0x17299e, _0x1f1779) => {
        if (_0xac33bf.includes(_0x17299e)) {
          return;
        }
        try {
          await this.query("ALTER TABLE contacts ADD COLUMN " + _0x17299e + " " + _0x1f1779);
        } catch (_0x49c95c) {
          if (_0x49c95c.message && _0x49c95c.message.includes("duplicate column name")) {} else {
            console.error("❌ Error adding " + _0x17299e + " column:", _0x49c95c.message);
          }
        }
      };
      for (let _0xe105b6 = 1; _0xe105b6 <= 10; _0xe105b6++) {
        await _0x1f68fa("var" + _0xe105b6, "TEXT");
      }
      await _0x1f68fa("whatsapp_verified", "BOOLEAN DEFAULT 0");
      await _0x1f68fa("verification_status", "TEXT DEFAULT 'pending'");
      await _0x1f68fa("verification_date", "DATETIME");
      await _0x1f68fa("company", "TEXT");
      await _0x1f68fa("position", "TEXT");
      await _0x1f68fa("lid", "TEXT");
      const _0x7f55a4 = await this.query("PRAGMA table_info(bulk_campaigns)");
      const _0x4f47e3 = _0x7f55a4.success && Array.isArray(_0x7f55a4.data) ? _0x7f55a4.data : [];
      const _0x483f32 = _0x4f47e3.map(_0x56cd00 => _0x56cd00.name || _0x56cd00[1]);
      const _0x5c42b5 = async (_0x3365e8, _0x407d58) => {
        if (_0x483f32.includes(_0x3365e8)) {
          return;
        }
        try {
          await this.query("ALTER TABLE bulk_campaigns ADD COLUMN " + _0x3365e8 + " " + _0x407d58);
        } catch (_0x1dbc66) {
          if (_0x1dbc66.message && _0x1dbc66.message.includes("duplicate column name")) {} else {
            console.error("❌ Error adding " + _0x3365e8 + " column:", _0x1dbc66.message);
          }
        }
      };
      await _0x5c42b5("delivery_delay_min", "INTEGER DEFAULT 3");
      await _0x5c42b5("delivery_delay_max", "INTEGER DEFAULT 9");
      let _0x4b44c7 = false;
      try {
        await this.query("SELECT session_ids FROM bulk_campaigns LIMIT 1");
      } catch (_0x5decb2) {
        _0x4b44c7 = true;
      }
      if (_0x4b44c7) {
        try {
          try {
            this.db.run("DROP TABLE IF EXISTS bulk_campaigns_new");
          } catch (_0x3d9c6e) {}
          this.db.run("\n            CREATE TABLE bulk_campaigns_new (\n              id INTEGER PRIMARY KEY AUTOINCREMENT,\n              name TEXT NOT NULL,\n              template_id INTEGER,\n              session_ids TEXT NOT NULL DEFAULT '[]',\n              message_content TEXT,\n              message_type TEXT DEFAULT 'text',\n              contact_group_ids TEXT,\n              device_rotation BOOLEAN DEFAULT 1,\n              status TEXT DEFAULT 'draft',\n              total_contacts INTEGER DEFAULT 0,\n              sent_count INTEGER DEFAULT 0,\n              failed_count INTEGER DEFAULT 0,\n              delivery_delay INTEGER DEFAULT 5,\n              delivery_delay_min INTEGER DEFAULT 3,\n              delivery_delay_max INTEGER DEFAULT 9,\n              max_retries INTEGER DEFAULT 3,\n              scheduled_at DATETIME,\n              started_at DATETIME,\n              completed_at DATETIME,\n              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              FOREIGN KEY (template_id) REFERENCES message_templates(id)\n            )\n          ");
          this.db.run("\n            INSERT INTO bulk_campaigns_new (\n              id, name, template_id, session_ids, message_content, message_type,\n              contact_group_ids, device_rotation, status, total_contacts, sent_count,\n              failed_count, delivery_delay, max_retries, scheduled_at, started_at,\n              completed_at, created_at, updated_at\n            )\n            SELECT id, name, template_id,\n                   CASE\n                     WHEN session_ids IS NOT NULL AND session_ids != '' THEN session_ids\n                     WHEN session_id IS NOT NULL AND session_id != '' THEN '[' || '\"' || session_id || '\"' || ']'\n                     ELSE '[]'\n                   END as session_ids,\n                   message_content, message_type, contact_group_ids, device_rotation,\n                   status, total_contacts, sent_count, failed_count, delivery_delay,\n                   COALESCE(delivery_delay_min, 3) as delivery_delay_min,\n                   COALESCE(delivery_delay_max, 9) as delivery_delay_max,\n                   max_retries, scheduled_at, started_at, completed_at, created_at, updated_at\n            FROM bulk_campaigns\n          ");
          this.db.run("DROP TABLE bulk_campaigns");
          this.db.run("ALTER TABLE bulk_campaigns_new RENAME TO bulk_campaigns");
        } catch (_0x414e15) {
          console.error("❌ Error migrating bulk_campaigns table:", _0x414e15);
        }
      }
      try {
        this.db.run("\n          DELETE FROM bulk_campaign_recipients\n          WHERE campaign_id NOT IN (SELECT id FROM bulk_campaigns)\n        ");
        this.db.run("\n          DELETE FROM message_history\n          WHERE campaign_id IS NOT NULL\n          AND campaign_id NOT IN (SELECT id FROM bulk_campaigns)\n        ");
      } catch (_0xfb9ff7) {
        console.error("❌ Error cleaning up orphaned references:", _0xfb9ff7);
      }
      try {
        const _0x37ada6 = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bulk_campaigns'");
        let _0x254ec8 = "";
        if (_0x37ada6.step()) {
          _0x254ec8 = _0x37ada6.getAsObject().sql;
        }
        _0x37ada6.free();
        const _0x5a47e1 = _0x254ec8.includes("ON DELETE SET NULL");
        const _0x52f261 = this.db.run("\n          INSERT INTO bulk_campaigns (\n            name, session_ids, message_content, message_type,\n            contact_group_ids, device_rotation, status, total_contacts\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n        ", ["TEST_CAMPAIGN", "[\"test\"]", "test message", "text", "[]", 1, "draft", 0]);
        const _0x1bff17 = this.db.getRowsModified();
        try {
          const _0x2e04fc = this.db.run("\n            INSERT INTO bulk_campaigns (\n              name, session_ids, message_content, message_type,\n              contact_group_ids, device_rotation, status, total_contacts\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n          ", ["REAL_TEST_CAMPAIGN", "[\"test_session\"]", "Test message content", "text", "[]", 1, "draft", 0]);
          const _0x57e373 = this.db.getRowsModified();
          if (_0x57e373 > 0) {
            const _0x396137 = this.db.prepare("SELECT last_insert_rowid() as lastID");
            let _0x4debeb = null;
            if (_0x396137.step()) {
              _0x4debeb = _0x396137.getAsObject().lastID;
            }
            _0x396137.free();
            this.db.run("DELETE FROM bulk_campaigns WHERE name = 'REAL_TEST_CAMPAIGN'");
          }
        } catch (_0x5977e7) {
          console.error("🔧 Real test INSERT error:", _0x5977e7);
        }
        if (_0x1bff17 === 0 || !_0x5a47e1) {
          const _0x418547 = await this.query("SELECT * FROM bulk_campaigns");
          this.db.run("DROP TABLE IF EXISTS bulk_campaigns");
          this.db.run("\n            CREATE TABLE bulk_campaigns (\n              id INTEGER PRIMARY KEY AUTOINCREMENT,\n              name TEXT NOT NULL,\n              template_id INTEGER,\n              session_ids TEXT NOT NULL DEFAULT '[]',\n              message_content TEXT,\n              message_type TEXT DEFAULT 'text',\n              contact_group_ids TEXT,\n              device_rotation BOOLEAN DEFAULT 1,\n              status TEXT DEFAULT 'draft',\n              total_contacts INTEGER DEFAULT 0,\n              sent_count INTEGER DEFAULT 0,\n              failed_count INTEGER DEFAULT 0,\n              delivery_delay INTEGER DEFAULT 5,\n              delivery_delay_min INTEGER DEFAULT 3,\n              delivery_delay_max INTEGER DEFAULT 9,\n              max_retries INTEGER DEFAULT 3,\n              scheduled_at DATETIME,\n              started_at DATETIME,\n              completed_at DATETIME,\n              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL\n            )\n          ");
          if (_0x418547.success && _0x418547.data.length > 0) {
            for (const _0x69af6d of _0x418547.data) {
              this.db.run("\n                INSERT INTO bulk_campaigns (\n                  id, name, template_id, session_ids, message_content, message_type,\n                  contact_group_ids, device_rotation, status, total_contacts, sent_count,\n                  failed_count, delivery_delay, max_retries, scheduled_at, started_at,\n                  completed_at, created_at, updated_at\n                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n              ", [_0x69af6d.id, _0x69af6d.name, _0x69af6d.template_id, _0x69af6d.session_ids, _0x69af6d.message_content, _0x69af6d.message_type, _0x69af6d.contact_group_ids, _0x69af6d.device_rotation, _0x69af6d.status, _0x69af6d.total_contacts, _0x69af6d.sent_count, _0x69af6d.failed_count, _0x69af6d.delivery_delay, _0x69af6d.max_retries, _0x69af6d.scheduled_at, _0x69af6d.started_at, _0x69af6d.completed_at, _0x69af6d.created_at, _0x69af6d.updated_at]);
            }
          }
        } else {
          this.db.run("DELETE FROM bulk_campaigns WHERE name = ?", ["TEST_CAMPAIGN"]);
        }
      } catch (_0x14d5c4) {
        console.error("❌ Error testing/recreating bulk_campaigns table:", _0x14d5c4);
      }
      try {
        const _0x5a2770 = this.db.prepare("PRAGMA table_info(bulk_campaigns)");
        const _0x21b2a1 = [];
        while (_0x5a2770.step()) {
          _0x21b2a1.push(_0x5a2770.getAsObject());
        }
        _0x5a2770.free();
        const _0x1eb975 = _0x21b2a1.some(_0x594702 => _0x594702.name === "attachment_data");
        const _0x57bffc = _0x21b2a1.some(_0x7f62f2 => _0x7f62f2.name === "proxy_ids");
        if (!_0x1eb975) {
          this.db.run("ALTER TABLE bulk_campaigns ADD COLUMN attachment_data TEXT");
        }
        if (!_0x57bffc) {
          this.db.run("ALTER TABLE bulk_campaigns ADD COLUMN proxy_ids TEXT");
        }
      } catch (_0x3a0840) {
        console.error("❌ Error adding columns to bulk_campaigns:", _0x3a0840);
      }
      try {
        const _0x353e20 = this.db.prepare("PRAGMA table_info(bulk_campaign_recipients)");
        const _0x4e62db = [];
        while (_0x353e20.step()) {
          _0x4e62db.push(_0x353e20.getAsObject());
        }
        _0x353e20.free();
        const _0x1f4ea3 = _0x4e62db.some(_0x3e7a74 => _0x3e7a74.name === "proxy_id");
        if (!_0x1f4ea3) {
          this.db.run("ALTER TABLE bulk_campaign_recipients ADD COLUMN proxy_id INTEGER");
        }
      } catch (_0x512411) {
        console.error("❌ Error adding proxy_id column to bulk_campaign_recipients:", _0x512411);
      }
    } catch (_0x4c5214) {
      console.error("Error adding missing columns:", _0x4c5214);
    }
  }
  async runCallResponderMigrations() {
    try {
      const _0x5adbef = this.db.prepare("PRAGMA table_info(call_responses)");
      const _0x2ad4be = [];
      while (_0x5adbef.step()) {
        _0x2ad4be.push(_0x5adbef.getAsObject());
      }
      _0x5adbef.free();
      const _0x2705d8 = _0x2ad4be.some(_0x1cd55c => _0x1cd55c.name === "trigger_type" || _0x1cd55c.name === "response_delay");
      if (_0x2705d8) {
        const _0x418221 = this.db.prepare("SELECT * FROM call_responses");
        const _0x1f2d20 = [];
        while (_0x418221.step()) {
          _0x1f2d20.push(_0x418221.getAsObject());
        }
        _0x418221.free();
        this.db.run("DROP TABLE IF EXISTS call_responses");
        this.db.run("CREATE TABLE call_responses (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          session_id TEXT NOT NULL,\n          name TEXT NOT NULL,\n          call_types TEXT NOT NULL,\n          message_type TEXT DEFAULT 'text',\n          message_content TEXT,\n          template_id INTEGER,\n          attachment_file TEXT,\n          attachment_type TEXT,\n          delay_minutes INTEGER DEFAULT 1,\n          is_active BOOLEAN DEFAULT 1,\n          usage_count INTEGER DEFAULT 0,\n          last_used DATETIME,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (template_id) REFERENCES message_templates(id)\n        )");
        for (const _0xf4326d of _0x1f2d20) {
          const _0x4e75c7 = _0xf4326d.trigger_type ? [_0xf4326d.trigger_type] : ["missed", "rejected"];
          const _0x5d1087 = _0xf4326d.response_delay ? Math.ceil(_0xf4326d.response_delay / 60) : 1;
          this.db.run("INSERT INTO call_responses (\n            id, session_id, name, call_types, message_type, message_content,\n            template_id, delay_minutes, is_active, usage_count, created_at, updated_at\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0xf4326d.id, _0xf4326d.session_id, _0xf4326d.name, JSON.stringify(_0x4e75c7), _0xf4326d.response_type || "text", _0xf4326d.response_content, _0xf4326d.template_id, _0x5d1087, _0xf4326d.is_active, _0xf4326d.usage_count || 0, _0xf4326d.created_at, _0xf4326d.updated_at]);
        }
      } else {}
    } catch (_0x1ef891) {
      console.error("❌ Error running Call Responder migrations:", _0x1ef891);
    }
  }
  async addChatbotAttachmentColumns() {
    try {
      const _0x709865 = this.db.exec("\n        SELECT name FROM sqlite_master\n        WHERE type='table' AND name='chatbot_nodes'\n      ");
      if (!_0x709865 || _0x709865.length === 0 || _0x709865[0].values.length === 0) {
        return;
      }
      const _0x29dc5e = this.db.exec("PRAGMA table_info(chatbot_nodes)");
      const _0x4778e6 = _0x29dc5e && _0x29dc5e.length > 0 && _0x29dc5e[0].values ? _0x29dc5e[0].values.map(_0x3f5884 => _0x3f5884[1]) : [];
      if (!_0x4778e6.includes("attachment_data")) {
        this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN attachment_data TEXT");
      } else {}
      if (!_0x4778e6.includes("attachment_type")) {
        this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN attachment_type TEXT");
      } else {}
      if (!_0x4778e6.includes("typing_enabled")) {
        this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN typing_enabled INTEGER DEFAULT 0");
      }
      if (!_0x4778e6.includes("typing_seconds")) {
        this.db.run("ALTER TABLE chatbot_nodes ADD COLUMN typing_seconds INTEGER DEFAULT 3");
      }
    } catch (_0x1dd99b) {
      console.error("❌ Error adding chatbot attachment columns:", _0x1dd99b);
      throw _0x1dd99b;
    }
  }
  async addBulkMessageDelayColumns() {
    try {
      const _0x48c197 = this.db.exec("\n        SELECT name FROM sqlite_master\n        WHERE type='table' AND name='bulk_message_settings'\n      ");
      if (!_0x48c197 || _0x48c197.length === 0 || _0x48c197[0].values.length === 0) {
        return;
      }
      const _0x5aee46 = this.db.exec("PRAGMA table_info(bulk_message_settings)");
      const _0x1c9665 = _0x5aee46 && _0x5aee46.length > 0 && _0x5aee46[0].values ? _0x5aee46[0].values.map(_0x194315 => _0x194315[1]) : [];
      if (!_0x1c9665.includes("delivery_delay_min")) {
        this.db.run("ALTER TABLE bulk_message_settings ADD COLUMN delivery_delay_min INTEGER DEFAULT 3");
      } else {}
      if (!_0x1c9665.includes("delivery_delay_max")) {
        this.db.run("ALTER TABLE bulk_message_settings ADD COLUMN delivery_delay_max INTEGER DEFAULT 9");
      } else {}
    } catch (_0x2c1cdd) {
      console.error("❌ Error adding bulk message delay columns:", _0x2c1cdd);
      throw _0x2c1cdd;
    }
  }
  async addBulkMessageUnverifiedContactsColumn() {
    try {
      const _0x101a1a = this.db.exec("\n        SELECT name FROM sqlite_master\n        WHERE type='table' AND name='bulk_message_settings'\n      ");
      if (!_0x101a1a || _0x101a1a.length === 0 || _0x101a1a[0].values.length === 0) {
        return;
      }
      const _0x38622b = this.db.exec("PRAGMA table_info(bulk_message_settings)");
      const _0x53ae6a = _0x38622b && _0x38622b.length > 0 && _0x38622b[0].values ? _0x38622b[0].values.map(_0x54a131 => _0x54a131[1]) : [];
      if (!_0x53ae6a.includes("allow_unverified_contacts")) {
        this.db.run("ALTER TABLE bulk_message_settings ADD COLUMN allow_unverified_contacts BOOLEAN DEFAULT 0");
      } else {}
    } catch (_0x5b7954) {
      console.error("❌ Error adding bulk message unverified contacts column:", _0x5b7954);
      throw _0x5b7954;
    }
  }
  async getDataMaintenanceStats(_0x1f0e93, _0x1d1ce4) {
    try {
      const _0x22836b = {};
      for (const _0xd8bff3 of _0x1f0e93) {
        let _0x44cd53;
        let _0x3744fb;
        if (_0xd8bff3.customCondition) {
          _0x44cd53 = "SELECT COUNT(*) as count FROM " + _0xd8bff3.table + " WHERE " + _0xd8bff3.customCondition;
          _0x3744fb = [_0x1d1ce4];
        } else {
          _0x44cd53 = "SELECT COUNT(*) as count FROM " + _0xd8bff3.table + " WHERE " + _0xd8bff3.dateColumn + " < ?";
          _0x3744fb = [_0x1d1ce4];
        }
        const _0x488e1b = await this.query(_0x44cd53, _0x3744fb);
        _0x22836b[_0xd8bff3.id] = _0x488e1b.success && _0x488e1b.data && _0x488e1b.data.length > 0 ? _0x488e1b.data[0].count : 0;
      }
      return {
        success: true,
        data: _0x22836b
      };
    } catch (_0x43e51a) {
      console.error("❌ Error getting data maintenance stats:", _0x43e51a);
      return {
        success: false,
        error: _0x43e51a.message,
        data: {}
      };
    }
  }
  async deleteOldData(_0x43f6bb, _0x42e2ba) {
    try {
      let _0x3165e9;
      let _0x43f81c;
      if (_0x43f6bb.customCondition) {
        _0x3165e9 = "DELETE FROM " + _0x43f6bb.table + " WHERE " + _0x43f6bb.customCondition;
        _0x43f81c = [_0x42e2ba];
      } else {
        _0x3165e9 = "DELETE FROM " + _0x43f6bb.table + " WHERE " + _0x43f6bb.dateColumn + " < ?";
        _0x43f81c = [_0x42e2ba];
      }
      const _0x263ac3 = await this.run(_0x3165e9, _0x43f81c);
      if (_0x263ac3.success) {
        return {
          success: true,
          deletedCount: _0x263ac3.changes || 0
        };
      } else {
        return {
          success: false,
          error: _0x263ac3.error
        };
      }
    } catch (_0x5442dd) {
      console.error("❌ Error deleting old data from " + _0x43f6bb.table + ":", _0x5442dd);
      return {
        success: false,
        error: _0x5442dd.message
      };
    }
  }
  async getTableSizes() {
    try {
      const _0x45faae = ["activity_logs", "auto_reply_cooldowns", "chatbot_conversations", "contacts", "message_templates", "whatsapp_sessions", "bulk_campaigns", "message_history"];
      const _0x506cb2 = {};
      for (const _0x59302a of _0x45faae) {
        try {
          const _0x43bbd0 = await this.query("SELECT COUNT(*) as count FROM " + _0x59302a);
          _0x506cb2[_0x59302a] = _0x43bbd0.success && _0x43bbd0.data && _0x43bbd0.data.length > 0 ? _0x43bbd0.data[0].count : 0;
        } catch (_0x16117a) {
          console.error("Error getting size for table " + _0x59302a + ":", _0x16117a);
          _0x506cb2[_0x59302a] = 0;
        }
      }
      return {
        success: true,
        data: _0x506cb2
      };
    } catch (_0x10123b) {
      console.error("❌ Error getting table sizes:", _0x10123b);
      return {
        success: false,
        error: _0x10123b.message,
        data: {}
      };
    }
  }
  async clearUserData() {
    try {
      const _0x29e50b = await this.query("SELECT name FROM sqlite_master WHERE type='table'");
      const _0x1aed35 = _0x29e50b.data.map(_0x56c6ac => _0x56c6ac.name);
      const _0x327a78 = ["contacts", "message_templates", "whatsapp_sessions", "auto_reply_rules", "chatbot_flows", "chatbot_nodes", "bulk_campaigns", "bulk_campaign_recipients", "message_history", "auto_reply_cooldowns", "call_responses"];
      for (const _0x43ba31 of _0x327a78) {
        if (_0x1aed35.includes(_0x43ba31)) {
          try {
            await this.run("DELETE FROM " + _0x43ba31 + " WHERE 1=1");
          } catch (_0x1e373a) {}
        } else {}
      }
      return {
        success: true
      };
    } catch (_0x356afb) {
      return {
        success: false,
        error: _0x356afb.message
      };
    }
  }
  async clearAuthSessions() {
    try {
      const _0x4f0990 = require("path");
      const _0x3c1e3e = require("fs").promises;
      let _0x55b99a;
      try {
        _0x55b99a = require("electron").app.getPath("userData");
      } catch (_0x4e922e) {
        _0x55b99a = _0x4f0990.join(require("os").homedir(), ".leadwave");
      }
      const _0x4fee5f = [_0x4f0990.join(_0x55b99a, "auth_sessions"), _0x4f0990.join(_0x55b99a, "auth")];
      for (const _0x2e5fc3 of _0x4fee5f) {
        try {
          await _0x3c1e3e.rm(_0x2e5fc3, {
            recursive: true,
            force: true
          });
        } catch (_0x5e7913) {}
      }
      return {
        success: true
      };
    } catch (_0x1f91c7) {
      return {
        success: false,
        error: _0x1f91c7.message
      };
    }
  }
  async optimizeDatabase() {
    try {
      await this.run("VACUUM");
      await this.run("ANALYZE");
      return {
        success: true,
        message: "Database optimization completed successfully"
      };
    } catch (_0x5053a5) {
      console.error("❌ Error optimizing database:", _0x5053a5);
      return {
        success: false,
        error: _0x5053a5.message
      };
    }
  }
  async handleTemplateDuplicatesMigration() {
    try {
      const _0x397bdc = await this.query("\n        SELECT name, COUNT(*) as count\n        FROM message_templates\n        GROUP BY name\n        HAVING COUNT(*) > 1\n      ");
      if (_0x397bdc.success && _0x397bdc.data && _0x397bdc.data.length > 0) {
        for (const _0x5cea81 of _0x397bdc.data) {
          const _0x334ac7 = await this.query("\n            SELECT * FROM message_templates\n            WHERE name = ?\n            ORDER BY created_at ASC\n          ", [_0x5cea81.name]);
          if (_0x334ac7.success && _0x334ac7.data.length > 1) {
            const _0x38f3ce = _0x334ac7.data;
            for (let _0x154d18 = 1; _0x154d18 < _0x38f3ce.length; _0x154d18++) {
              const _0x1c7a0f = _0x38f3ce[_0x154d18];
              const _0x2b6091 = _0x5cea81.name + " (" + _0x154d18 + ")";
              await this.query("\n                UPDATE message_templates\n                SET name = ?, updated_at = CURRENT_TIMESTAMP\n                WHERE id = ?\n              ", [_0x2b6091, _0x1c7a0f.id]);
            }
          }
        }
      } else {}
    } catch (_0xda518c) {
      console.error("❌ Error handling template duplicates migration:", _0xda518c);
    }
  }
  async cleanupTemplateDuplicates() {
    try {
      const _0x1eb6d0 = await this.query("\n        DELETE FROM message_templates\n        WHERE id NOT IN (\n          SELECT MIN(id)\n          FROM message_templates\n          GROUP BY name\n        )\n      ");
      if (_0x1eb6d0.success) {} else {}
    } catch (_0x23f374) {
      console.error("❌ Error cleaning template duplicates:", _0x23f374);
    }
  }
  async runPollQuestionMigration() {
    try {
      const _0x24a20d = await this.query("PRAGMA table_info(message_templates)");
      if (!_0x24a20d.success) {
        console.error("❌ Error checking table info:", _0x24a20d.error);
        return;
      }
      const _0x50313f = Array.isArray(_0x24a20d.data) ? _0x24a20d.data : _0x24a20d.data && Array.isArray(_0x24a20d.data.values) ? _0x24a20d.data.values : [];
      const _0x243d7e = _0x50313f.map(_0x4ad889 => _0x4ad889.name || _0x4ad889[1]);
      if (_0x243d7e.includes("poll_question")) {
        return;
      }
      const _0x229d08 = await this.query("ALTER TABLE message_templates ADD COLUMN poll_question TEXT");
      if (!_0x229d08.success) {
        console.error("❌ Error adding column:", _0x229d08.error);
        return;
      }
      const _0x20aa27 = await this.query("\n        UPDATE message_templates\n        SET poll_question = content\n        WHERE type = 'poll' AND poll_question IS NULL\n      ");
      if (_0x20aa27.success) {} else {
        console.error("❌ Error migrating data:", _0x20aa27.error);
      }
    } catch (_0x25c854) {
      console.error("❌ Error running poll question migration:", _0x25c854);
    }
  }
  async runPollTrackingMigration() {
    try {
      const _0x3f5a1b = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name='poll_messages'");
      if (!_0x3f5a1b.success) {
        console.error("❌ Error checking poll_messages table:", _0x3f5a1b.error);
        return;
      }
      const _0x4eabc4 = Array.isArray(_0x3f5a1b.data) ? _0x3f5a1b.data : _0x3f5a1b.data && Array.isArray(_0x3f5a1b.data.values) ? _0x3f5a1b.data.values : [];
      if (_0x4eabc4.length > 0) {
        return;
      }
      const _0x4c04f1 = await this.query("\n        CREATE TABLE IF NOT EXISTS poll_messages (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          message_id TEXT NOT NULL UNIQUE,\n          session_id TEXT NOT NULL,\n          sender_jid TEXT NOT NULL,\n          recipient_jid TEXT NOT NULL,\n          poll_question TEXT NOT NULL,\n          poll_options TEXT NOT NULL,\n          selectable_count INTEGER DEFAULT 1,\n          campaign_id INTEGER,\n          template_id INTEGER,\n          sent_at DATETIME NOT NULL,\n          expires_at DATETIME,\n          is_active BOOLEAN DEFAULT 1,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (campaign_id) REFERENCES bulk_campaigns(id),\n          FOREIGN KEY (template_id) REFERENCES message_templates(id)\n        )\n      ");
      if (!_0x4c04f1.success) {
        console.error("❌ Error creating poll_messages table:", _0x4c04f1.error);
        return;
      }
      const _0x4cec2e = await this.query("\n        CREATE TABLE IF NOT EXISTS poll_options (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          poll_message_id INTEGER NOT NULL,\n          option_text TEXT NOT NULL,\n          option_index INTEGER NOT NULL,\n          option_hash TEXT,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (poll_message_id) REFERENCES poll_messages(id) ON DELETE CASCADE\n        )\n      ");
      if (!_0x4cec2e.success) {
        console.error("❌ Error creating poll_options table:", _0x4cec2e.error);
        return;
      }
      const _0x5ebd2b = await this.query("\n        CREATE TABLE IF NOT EXISTS poll_votes (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          poll_message_id INTEGER NOT NULL,\n          poll_option_id INTEGER NOT NULL,\n          voter_jid TEXT NOT NULL,\n          voter_name TEXT,\n          vote_message_id TEXT,\n          voted_at DATETIME NOT NULL,\n          sender_timestamp_ms BIGINT,\n          server_timestamp_ms BIGINT,\n          is_valid BOOLEAN DEFAULT 1,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (poll_message_id) REFERENCES poll_messages(id) ON DELETE CASCADE,\n          FOREIGN KEY (poll_option_id) REFERENCES poll_options(id) ON DELETE CASCADE,\n          UNIQUE(poll_message_id, voter_jid, poll_option_id)\n        )\n      ");
      if (!_0x5ebd2b.success) {
        console.error("❌ Error creating poll_votes table:", _0x5ebd2b.error);
        return;
      }
      const _0x19a4be = ["CREATE INDEX IF NOT EXISTS idx_poll_messages_session ON poll_messages(session_id)", "CREATE INDEX IF NOT EXISTS idx_poll_messages_sender ON poll_messages(sender_jid)", "CREATE INDEX IF NOT EXISTS idx_poll_messages_recipient ON poll_messages(recipient_jid)", "CREATE INDEX IF NOT EXISTS idx_poll_messages_sent_at ON poll_messages(sent_at)", "CREATE INDEX IF NOT EXISTS idx_poll_messages_active ON poll_messages(is_active)", "CREATE INDEX IF NOT EXISTS idx_poll_messages_campaign ON poll_messages(campaign_id)", "CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_message_id)", "CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_message_id)", "CREATE INDEX IF NOT EXISTS idx_poll_votes_voter ON poll_votes(voter_jid)", "CREATE INDEX IF NOT EXISTS idx_poll_votes_voted_at ON poll_votes(voted_at)", "CREATE INDEX IF NOT EXISTS idx_poll_votes_valid ON poll_votes(is_valid)"];
      for (const _0x245e76 of _0x19a4be) {
        const _0x3abacb = await this.query(_0x245e76);
        if (!_0x3abacb.success) {
          console.error("❌ Error creating index:", _0x3abacb.error);
        }
      }
    } catch (_0x336431) {
      console.error("❌ Error running poll tracking migration:", _0x336431);
    }
  }
  async applyMigrations() {
    try {
      const _0x4bff69 = await this.query("PRAGMA table_info(contact_group_members)");
      const _0x2859b6 = await this.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='contact_group_members'");
      if (_0x2859b6.success && _0x2859b6.data.length > 0 && _0x2859b6.data[0].sql.includes("ON DELETE CASCADE")) {
        this.db.run("\n          CREATE TABLE contact_group_members_new (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            group_id INTEGER NOT NULL,\n            contact_id INTEGER NOT NULL,\n            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n            FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE RESTRICT,\n            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT,\n            UNIQUE(group_id, contact_id)\n          )\n        ");
        this.db.run("\n          INSERT INTO contact_group_members_new (id, group_id, contact_id, added_at)\n          SELECT id, group_id, contact_id, added_at FROM contact_group_members\n        ");
        this.db.run("DROP TABLE contact_group_members");
        this.db.run("ALTER TABLE contact_group_members_new RENAME TO contact_group_members");
        this.db.run("CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(group_id)");
        this.db.run("CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id)");
      }
    } catch (_0x4a70b9) {
      console.error("❌ Error applying migrations:", _0x4a70b9);
    }
  }
  async runPollVotesEncryptedFallbackMigration() {
    try {
      const _0x51ffe5 = await this.query("PRAGMA table_info(poll_votes)");
      if (!_0x51ffe5.success) {
        console.error("❌ Error checking poll_votes table info:", _0x51ffe5.error);
        return;
      }
      const _0x39e65b = Array.isArray(_0x51ffe5.data) ? _0x51ffe5.data : _0x51ffe5.data && Array.isArray(_0x51ffe5.data.values) ? _0x51ffe5.data.values : [];
      const _0x395b07 = _0x39e65b.map(_0x22532f => _0x22532f.name || _0x22532f[1]);
      if (_0x395b07.includes("is_encrypted_fallback")) {
        return;
      }
      const _0x1bbad4 = await this.query("ALTER TABLE poll_votes ADD COLUMN is_encrypted_fallback BOOLEAN DEFAULT 0");
      if (!_0x1bbad4.success) {
        console.error("❌ Error adding is_encrypted_fallback column:", _0x1bbad4.error);
        return;
      }
    } catch (_0x29290c) {
      console.error("❌ Error in poll votes encrypted fallback migration:", _0x29290c);
    }
  }
  async runAdvancedMessagingSuiteMigration() {
    try {
      const _0x5ab5df = await this.query("PRAGMA table_info(poll_votes)");
      if (_0x5ab5df.success) {
        const _0xfd87d = Array.isArray(_0x5ab5df.data) ? _0x5ab5df.data : _0x5ab5df.data && Array.isArray(_0x5ab5df.data.values) ? _0x5ab5df.data.values : [];
        const _0x24df69 = _0xfd87d.map(_0x33a3a1 => _0x33a3a1.name || _0x33a3a1[1]);
        if (!_0x24df69.includes("vote_update_id")) {
          const _0x73104f = await this.query("ALTER TABLE poll_votes ADD COLUMN vote_update_id TEXT");
          if (!_0x73104f.success) {
            console.error("❌ Error adding vote_update_id column:", _0x73104f.error);
          }
        }
      }
      this.db.run("CREATE TABLE IF NOT EXISTS message_retry_store (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        remote_jid TEXT NOT NULL,\n        message_id TEXT NOT NULL,\n        message_content TEXT NOT NULL,\n        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE(session_id, remote_jid, message_id)\n      )");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_retry_lookup ON message_retry_store(session_id, remote_jid, message_id)");
    } catch (_0x11ad33) {
      console.error("❌ Error in advanced messaging suite migration:", _0x11ad33);
    }
  }
  async deleteAllDataExceptTranslations() {
    try {
      const _0x923f19 = ["whatsapp_sessions", "message_templates", "contacts", "contact_groups", "contact_group_members", "message_history", "bulk_campaigns", "bulk_campaign_recipients", "campaign_message_counts", "campaign_proxy_assignments", "spintax_state", "communication_preferences", "opt_out_keywords", "opt_out_requests", "compliance_audit_log", "auto_reply_rules", "auto_reply_cooldowns", "chatbot_flows", "chatbot_nodes", "chatbot_conversations", "chatbot_saved_data", "chatbot_flow_cooldowns", "call_responses", "email_settings", "email_templates", "email_logs", "warmer_campaigns", "warmer_templates", "warmer_logs", "proxy_settings", "proxies", "proxy_usage_logs", "backup_history", "backup_schedules", "activity_logs", "recall_bot_settings", "reminders", "voice_transcriptions", "recall_bot_logs", "support_bot_settings", "support_bot_customers", "support_bot_field_mappings", "support_bot_logs", "ai_providers", "ai_chatbots", "ai_conversations", "ai_messages", "ai_intents", "ai_knowledge_base", "ai_global_settings", "ai_decision_flows", "ai_form_templates", "ai_form_submissions", "ai_appointments", "ai_learning_data", "ai_documents", "poll_messages", "poll_options", "poll_votes", "follow_up_messages", "follow_up_logs", "follow_up_statistics", "google_drive_config", "incoming_messages", "live_chat_conversations", "live_chat_messages", "telegram_sessions", "telegram_conversations", "telegram_messages", "telegram_auto_replies", "telegram_broadcasts", "telegram_broadcast_logs", "telegram_ai_settings"];
      let _0x2e819c = 0;
      let _0x222905 = [];
      for (const _0x4a0e4b of _0x923f19) {
        try {
          const _0x1456ae = await this.run("DELETE FROM " + _0x4a0e4b);
          if (_0x1456ae.success) {
            _0x2e819c++;
            if (global.logToFile) {
              global.logToFile("🗑️ Cleared table: " + _0x4a0e4b + " (" + (_0x1456ae.changes || 0) + " rows)");
            }
          } else if (_0x1456ae.error && !_0x1456ae.error.includes("no such table")) {
            _0x222905.push({
              table: _0x4a0e4b,
              error: _0x1456ae.error
            });
            if (global.logToFile) {
              global.logToFile("⚠️ Could not clear table " + _0x4a0e4b + ": " + _0x1456ae.error);
            }
          }
        } catch (_0x22ec48) {
          _0x222905.push({
            table: _0x4a0e4b,
            error: _0x22ec48.message
          });
          if (global.logToFile) {
            global.logToFile("⚠️ Error clearing table " + _0x4a0e4b + ": " + _0x22ec48.message);
          }
        }
      }
      try {
        await this.run("DELETE FROM app_settings");
        await this.insertDefaultSettings();
      } catch (_0xce9215) {
        _0x222905.push({
          table: "app_settings",
          error: _0xce9215.message
        });
      }
      try {
        await this.run("DELETE FROM bulk_message_settings");
        await this.run("\n          INSERT INTO bulk_message_settings (\n            spintax_enabled, random_enabled, random_prefix, family_numbers_enabled,\n            family_numbers, family_message_interval, hook_number_enabled, hook_number,\n            sleep_timing_enabled, sleep_after_messages, sleep_duration_seconds,\n            delivery_delay_min, delivery_delay_max, allow_unverified_contacts\n          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n        ", [1, 1, "LW", 1, "[]", 50, 1, "", 1, 50, 30, 3, 9, 0]);
      } catch (_0x199263) {
        console.error("Error re-seeding bulk_message_settings:", _0x199263);
      }
      await this.saveDatabase();
      if (_0x222905.length > 0) {
        console.error("⚠️ Some tables could not be cleared:", _0x222905);
        if (global.logToFile) {
          global.logToFile("⚠️ Delete all data — " + _0x222905.length + " table(s) had errors: " + JSON.stringify(_0x222905));
        }
      }
      if (global.logToFile) {
        global.logToFile("✅ Delete all data complete — cleared " + _0x2e819c + " tables");
      }
      return {
        success: true,
        deletedCount: _0x2e819c,
        errors: _0x222905.length > 0 ? _0x222905 : undefined,
        message: "Successfully cleared " + _0x2e819c + " tables. Translation keys preserved."
      };
    } catch (_0x415aff) {
      console.error("❌ Error in deleteAllDataExceptTranslations:", _0x415aff);
      return {
        success: false,
        error: _0x415aff.message
      };
    }
  }
  async migrateCallResponderDelayToSeconds() {
    try {
      if (global.logToFile) {
        global.logToFile("🔧 Migrating call responder delay from minutes to seconds...");
      }
      const _0x4bb907 = this.db.exec("PRAGMA table_info(call_responses)");
      if (!_0x4bb907 || _0x4bb907.length === 0) {
        if (global.logToFile) {
          global.logToFile("⚠️  call_responses table does not exist yet");
        }
        return;
      }
      const _0x4998f4 = _0x4bb907[0].values.map(_0x1257f2 => _0x1257f2[1]);
      const _0x381006 = _0x4998f4.includes("delay_seconds");
      const _0x5ac3ba = _0x4998f4.includes("delay_minutes");
      const _0x85cf52 = _0x4998f4.includes("cooldown_minutes");
      if (!_0x85cf52) {
        if (global.logToFile) {
          global.logToFile("🔧 Adding cooldown_minutes column...");
        }
        this.db.run("ALTER TABLE call_responses ADD COLUMN cooldown_minutes INTEGER DEFAULT 0");
        this.db.run("CREATE TABLE IF NOT EXISTS call_response_cooldowns (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          rule_id INTEGER NOT NULL,\n          contact_jid TEXT NOT NULL,\n          last_triggered DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (rule_id) REFERENCES call_responses(id) ON DELETE CASCADE,\n          UNIQUE(rule_id, contact_jid)\n        )");
        if (global.logToFile) {
          global.logToFile("✅ Added cooldown_minutes column and cooldown tracking table");
        }
      }
      if (!_0x381006 && _0x5ac3ba) {
        if (global.logToFile) {
          global.logToFile("🔧 Adding delay_seconds column and converting data...");
        }
        this.db.run("ALTER TABLE call_responses ADD COLUMN delay_seconds INTEGER DEFAULT 60");
        this.db.run("UPDATE call_responses SET delay_seconds = delay_minutes * 60");
        if (global.logToFile) {
          global.logToFile("✅ Successfully migrated delay_minutes to delay_seconds");
        }
      }
    } catch (_0x2beebc) {
      if (global.logToFile) {
        global.logToFile("❌ Error migrating call responder: " + _0x2beebc.message);
      }
      console.error("❌ Error migrating call responder:", _0x2beebc);
    }
  }
  async fixBrokenConditionPaths() {
    try {
      const _0x3071fe = this.db.exec("\n        SELECT id, flow_id, name, options\n        FROM chatbot_nodes\n        WHERE node_type = 'condition'\n      ");
      if (!_0x3071fe || _0x3071fe.length === 0 || !_0x3071fe[0].values || _0x3071fe[0].values.length === 0) {
        return;
      }
      const _0x59b05b = this.db.exec("SELECT id FROM chatbot_nodes");
      const _0x188d97 = new Set((_0x59b05b?.[0]?.values || []).map(_0x48ff0d => _0x48ff0d[0]));
      const _0x29daad = new Map();
      let _0x35add0 = 0;
      for (const _0x568c9a of _0x3071fe[0].values) {
        const [_0x9de28a, _0x227bfa, _0xf08f33, _0x4b2870] = _0x568c9a;
        try {
          const _0x355510 = JSON.parse(_0x4b2870 || "{}");
          const _0x2d7e43 = _0x355510.true_path;
          const _0x29741f = _0x355510.false_path;
          const _0x226b23 = _0x2d7e43 && !_0x188d97.has(_0x2d7e43);
          const _0x11587d = _0x29741f && !_0x188d97.has(_0x29741f);
          if (!_0x226b23 && !_0x11587d) {
            continue;
          }
          if (global.logToFile) {
            if (_0x226b23) {
              global.logToFile("⚠️  Node " + _0x9de28a + " (" + _0xf08f33 + "): true_path " + _0x2d7e43 + " does not exist");
            }
            if (_0x11587d) {
              global.logToFile("⚠️  Node " + _0x9de28a + " (" + _0xf08f33 + "): false_path " + _0x29741f + " does not exist");
            }
          }
          if (!_0x29daad.has(_0x227bfa)) {
            const _0x5a5c54 = this.db.exec("SELECT id, name, position FROM chatbot_nodes WHERE flow_id = ? ORDER BY position", [_0x227bfa]);
            _0x29daad.set(_0x227bfa, _0x5a5c54?.[0]?.values || []);
          }
          let _0x54c10d = _0x2d7e43;
          let _0x53c0aa = _0x29741f;
          for (const [_0x432bee, _0x3daa72] of _0x29daad.get(_0x227bfa)) {
            const _0x38d343 = (_0x3daa72 || "").toLowerCase();
            if (_0x38d343.includes("positive")) {
              _0x54c10d = _0x432bee;
            }
            if (_0x38d343.includes("negative")) {
              _0x53c0aa = _0x432bee;
            }
          }
          if (_0x54c10d !== _0x2d7e43 || _0x53c0aa !== _0x29741f) {
            _0x355510.true_path = _0x54c10d;
            _0x355510.false_path = _0x53c0aa;
            this.db.run("UPDATE chatbot_nodes SET options = ? WHERE id = ?", [JSON.stringify(_0x355510), _0x9de28a]);
            _0x35add0++;
            if (global.logToFile) {
              global.logToFile("✅ Fixed node " + _0x9de28a + " (" + _0xf08f33 + "): true=" + _0x54c10d + ", false=" + _0x53c0aa);
            }
          }
        } catch (_0x435e5e) {
          if (global.logToFile) {
            global.logToFile("⚠️  Could not parse options for node " + _0x9de28a + ": " + _0x435e5e.message);
          }
        }
      }
      if (_0x35add0 > 0 && global.logToFile) {
        global.logToFile("✅ Fixed " + _0x35add0 + " broken condition path(s)");
      }
    } catch (_0x5d3453) {
      if (global.logToFile) {
        global.logToFile("❌ Error fixing broken condition paths: " + _0x5d3453.message);
      }
      console.error("❌ Error fixing broken condition paths:", _0x5d3453);
    }
  }
  async runRestAPIMigration() {
    try {
      const _0x1c0b2f = await this.query("\n        SELECT name FROM sqlite_master WHERE type='table' AND name='rest_api_config'\n      ");
      if (!_0x1c0b2f.success || !_0x1c0b2f.data || _0x1c0b2f.data.length === 0) {
        if (global.logToFile) {
          global.logToFile("📦 Creating REST API tables...");
        }
        const _0x24cffa = require("fs");
        const _0x471cbd = require("path");
        const _0x9d3563 = _0x471cbd.join(__dirname, "..", "database", "migrations", "rest_api_schema.sql");
        if (_0x24cffa.existsSync(_0x9d3563)) {
          const _0x20edcd = _0x24cffa.readFileSync(_0x9d3563, "utf8");
          try {
            this.db.exec(_0x20edcd);
            if (global.logToFile) {
              global.logToFile("✅ REST API tables created successfully");
            }
          } catch (_0x4353d8) {
            console.error("❌ Error executing REST API migration SQL:", _0x4353d8.message);
            const _0x5ba055 = _0x20edcd.split(";").map(_0x3be73b => _0x3be73b.trim()).filter(_0x8d9903 => _0x8d9903.length > 0 && !_0x8d9903.startsWith("--"));
            for (const _0x4c277e of _0x5ba055) {
              try {
                this.db.run(_0x4c277e);
              } catch (_0x207f38) {
                console.error("❌ Error executing statement:", _0x207f38.message);
              }
            }
          }
        } else {
          if (global.logToFile) {
            global.logToFile("⚠️ REST API migration file not found, creating tables manually...");
          }
          this.createRestAPITablesManually();
        }
      }
      const _0x31a05d = await this.all("PRAGMA table_info(rest_api_keys)");
      if (_0x31a05d.success && _0x31a05d.data && Array.isArray(_0x31a05d.data)) {
        const _0x186541 = _0x31a05d.data.some(_0x49da86 => _0x49da86.name === "device_id");
        if (!_0x186541) {
          if (global.logToFile) {
            global.logToFile("📦 Adding device_id column to rest_api_keys...");
          }
          const _0x465816 = await this.run("\n            ALTER TABLE rest_api_keys ADD COLUMN device_id TEXT\n          ");
          if (!_0x465816.success) {
            if (global.logToFile) {
              global.logToFile("⚠️ Error adding device_id column: " + _0x465816.error);
            }
          }
        }
      } else if (global.logToFile) {
        global.logToFile("⚠️ Could not check columns: " + JSON.stringify(_0x31a05d));
      }
    } catch (_0x1080c1) {
      console.error("❌ Error running REST API migration:", _0x1080c1);
      if (global.logToFile) {
        global.logToFile("❌ Error running REST API migration: " + _0x1080c1.message);
      }
    }
  }
  createRestAPITablesManually() {
    try {
      this.db.run("\n        CREATE TABLE IF NOT EXISTS rest_api_config (\n          id INTEGER PRIMARY KEY DEFAULT 1,\n          enabled INTEGER DEFAULT 0,\n          port INTEGER DEFAULT 8080,\n          allow_external_access INTEGER DEFAULT 0,\n          rate_limit INTEGER DEFAULT 100,\n          api_key TEXT,\n          webhook_url TEXT,\n          webhook_enabled INTEGER DEFAULT 0,\n          webhook_events TEXT DEFAULT '[\"message\",\"status\"]',\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          CHECK (id = 1)\n        )\n      ");
      this.db.run("\n        CREATE TABLE IF NOT EXISTS rest_api_keys (\n          id TEXT PRIMARY KEY,\n          api_key TEXT UNIQUE NOT NULL,\n          name TEXT NOT NULL,\n          is_active INTEGER DEFAULT 1,\n          last_used_at DATETIME,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        )\n      ");
      this.db.run("\n        CREATE TABLE IF NOT EXISTS rest_api_logs (\n          id TEXT PRIMARY KEY,\n          api_key TEXT,\n          method TEXT NOT NULL,\n          endpoint TEXT NOT NULL,\n          ip_address TEXT,\n          user_agent TEXT,\n          response_code INTEGER,\n          response_time INTEGER,\n          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,\n          FOREIGN KEY (api_key) REFERENCES rest_api_keys(api_key)\n        )\n      ");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_rest_api_logs_timestamp ON rest_api_logs(timestamp)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_rest_api_logs_api_key ON rest_api_logs(api_key)");
      this.db.run("CREATE INDEX IF NOT EXISTS idx_rest_api_keys_active ON rest_api_keys(is_active)");
      if (global.logToFile) {
        global.logToFile("✅ REST API tables created manually");
      }
    } catch (_0x14a12e) {
      console.error("❌ Error creating REST API tables manually:", _0x14a12e);
      if (global.logToFile) {
        global.logToFile("❌ Error creating REST API tables manually: " + _0x14a12e.message);
      }
    }
  }
  async runProxyProviderMigration() {
    try {
      const _0x4f8db2 = this.db.exec("PRAGMA table_info(proxy_settings)");
      const _0x5dd4b9 = _0x4f8db2.length > 0 ? _0x4f8db2[0].values.map(_0x36ebeb => _0x36ebeb[1]) : [];
      const _0x85a927 = async (_0x5a79e1, _0xcc3a71) => {
        if (_0x5dd4b9.includes(_0x5a79e1)) {
          return;
        }
        try {
          await this.query("ALTER TABLE proxy_settings ADD COLUMN " + _0x5a79e1 + " " + _0xcc3a71);
        } catch (_0x5ed64c) {
          if (!_0x5ed64c.message?.includes("duplicate column name")) {
            console.error("❌ Error adding proxy_settings." + _0x5a79e1 + ":", _0x5ed64c.message);
          }
        }
      };
      await _0x85a927("asocks_api_key", "TEXT");
      await _0x85a927("asocks_balance", "REAL DEFAULT 0");
      await _0x85a927("asocks_last_sync", "DATETIME");
      const _0x1c0ca2 = _0x4f8db2.length > 0 ? _0x4f8db2[0].values.find(_0x168002 => _0x168002[1] === "api_key") : null;
      const _0x331057 = _0x1c0ca2 ? _0x1c0ca2[3] === 1 : false;
      if (_0x331057) {
        if (global.logToFile) {
          global.logToFile("🔧 Fixing proxy_settings.api_key NOT NULL constraint...");
        }
        try {
          this.db.run("DROP TABLE IF EXISTS proxy_settings_new");
          this.db.run("\n            CREATE TABLE proxy_settings_new (\n              id INTEGER PRIMARY KEY,\n              api_key TEXT,\n              asocks_api_key TEXT,\n              balance REAL DEFAULT 0,\n              asocks_balance REAL DEFAULT 0,\n              currency TEXT DEFAULT 'USD',\n              last_sync DATETIME,\n              asocks_last_sync DATETIME,\n              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n            )\n          ");
          this.db.run("\n            INSERT OR IGNORE INTO proxy_settings_new\n              (id, api_key, balance, currency, last_sync, created_at, updated_at)\n            SELECT id, api_key, balance, currency, last_sync, created_at, updated_at\n            FROM proxy_settings\n          ");
          try {
            this.db.run("\n              UPDATE proxy_settings_new AS pn\n              SET asocks_api_key  = (SELECT asocks_api_key  FROM proxy_settings p WHERE p.id = pn.id),\n                  asocks_balance  = (SELECT asocks_balance  FROM proxy_settings p WHERE p.id = pn.id),\n                  asocks_last_sync= (SELECT asocks_last_sync FROM proxy_settings p WHERE p.id = pn.id)\n            ");
          } catch (_0x45d74b) {}
          this.db.run("DROP TABLE proxy_settings");
          this.db.run("ALTER TABLE proxy_settings_new RENAME TO proxy_settings");
          if (global.logToFile) {
            global.logToFile("✅ Fixed proxy_settings.api_key NOT NULL constraint");
          }
        } catch (_0x4daa4d) {
          console.error("❌ Error fixing proxy_settings NOT NULL constraint:", _0x4daa4d.message);
          if (global.logToFile) {
            global.logToFile("❌ Error fixing proxy_settings NOT NULL: " + _0x4daa4d.message);
          }
        }
      }
      const _0x421d69 = this.db.exec("PRAGMA table_info(proxies)");
      const _0xda283e = _0x421d69.length > 0 ? _0x421d69[0].values.map(_0x4aafc3 => _0x4aafc3[1]) : [];
      const _0x2f9070 = async (_0x4b7c1b, _0x137b22) => {
        if (_0xda283e.includes(_0x4b7c1b)) {
          return;
        }
        try {
          await this.query("ALTER TABLE proxies ADD COLUMN " + _0x4b7c1b + " " + _0x137b22);
        } catch (_0x49a82f) {
          if (!_0x49a82f.message?.includes("duplicate column name")) {
            console.error("❌ Error adding proxies." + _0x4b7c1b + ":", _0x49a82f.message);
          }
        }
      };
      await _0x2f9070("provider", "TEXT DEFAULT 'proxy6'");
      await _0x2f9070("asocks_port_id", "TEXT");
      if (global.logToFile) {
        global.logToFile("✅ Proxy provider migration completed");
      }
    } catch (_0x31a080) {
      console.error("❌ Error running proxy provider migration:", _0x31a080);
      if (global.logToFile) {
        global.logToFile("❌ Proxy provider migration error: " + _0x31a080.message);
      }
    }
  }
  async runTelegramSessionMigration() {
    try {
      const _0x241cc1 = this.db.exec("PRAGMA table_info(telegram_sessions)");
      if (!_0x241cc1 || _0x241cc1.length === 0) {
        return;
      }
      const _0x11cd7f = _0x241cc1[0].values.map(_0x398f93 => _0x398f93[1]);
      if (!_0x11cd7f.includes("api_id")) {
        this.db.run("ALTER TABLE telegram_sessions ADD COLUMN api_id INTEGER DEFAULT 0");
      }
      if (!_0x11cd7f.includes("api_hash")) {
        this.db.run("ALTER TABLE telegram_sessions ADD COLUMN api_hash TEXT DEFAULT \"\"");
      }
    } catch (_0x4c6ff2) {
      console.error("❌ Error running telegram session migration:", _0x4c6ff2.message);
    }
  }
}
module.exports = DatabaseService;