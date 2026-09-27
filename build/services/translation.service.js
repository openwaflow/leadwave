const fs = require("fs");
const path = require("path");
class TranslationService {
  constructor(_0x479bf7) {
    this.db = _0x479bf7;
  }
  async extractKeysFromLocale(_0x16bba7, _0x2ada70 = "general") {
    const _0x4d7993 = [];
    const _0x10b5de = _0x324578 => {
      if (!_0x324578) {
        return "General";
      }
      return _0x324578.charAt(0).toUpperCase() + _0x324578.slice(1);
    };
    const _0x9514d = (_0x3aea44, _0x12288b = "") => {
      for (const [_0x1a94d6, _0x4dbe8d] of Object.entries(_0x3aea44)) {
        const _0x4a1191 = _0x12288b ? _0x12288b + "." + _0x1a94d6 : _0x1a94d6;
        if (typeof _0x4dbe8d === "string") {
          const _0x16b490 = _0x2ada70 || _0x4a1191.split(".")[0];
          _0x4d7993.push({
            keyPath: _0x4a1191,
            category: _0x10b5de(_0x16b490),
            englishText: _0x4dbe8d
          });
        } else if (typeof _0x4dbe8d === "object" && _0x4dbe8d !== null) {
          _0x9514d(_0x4dbe8d, _0x4a1191);
        }
      }
    };
    _0x9514d(_0x16bba7);
    return _0x4d7993;
  }
  async syncTranslationKeys(_0x38403b) {
    try {
      const _0xd0e09f = await this.extractKeysFromLocale(_0x38403b);
      let _0x4614c4 = 0;
      let _0x16f4ab = 0;
      let _0x35a3b0 = 0;
      for (const _0x2552cd of _0xd0e09f) {
        const _0x2e2b46 = await this.db.query("SELECT id, english_text FROM translation_keys WHERE key_path = ?", [_0x2552cd.keyPath]);
        if (_0x2e2b46.data && _0x2e2b46.data.length > 0) {
          if (_0x2e2b46.data[0].english_text !== _0x2552cd.englishText) {
            await this.db.query("UPDATE translation_keys SET english_text = ?, category = ? WHERE key_path = ?", [_0x2552cd.englishText, _0x2552cd.category, _0x2552cd.keyPath]);
            _0x16f4ab++;
          } else {
            _0x35a3b0++;
          }
        } else {
          const _0x165eec = await this.db.query("INSERT INTO translation_keys (key_path, category, english_text)\n             VALUES (?, ?, ?)", [_0x2552cd.keyPath, _0x2552cd.category, _0x2552cd.englishText]);
          if (_0x165eec.success) {
            _0x4614c4++;
          }
        }
      }
      return {
        success: true,
        inserted: _0x4614c4,
        updated: _0x16f4ab,
        skipped: _0x35a3b0,
        total: _0xd0e09f.length
      };
    } catch (_0x6efc43) {
      console.error("Error syncing translation keys:", _0x6efc43);
      return {
        success: false,
        error: _0x6efc43.message
      };
    }
  }
  async getTranslationsForLanguage(_0x3f53b8) {
    const _0x4c003e = Date.now();
    const _0xef30f4 = _0x3f53b8.toUpperCase();
    const _0x169317 = _0x3f53b8.toLowerCase();
    try {
      const _0x5e6d06 = await this.db.query("SELECT\n          tk.id,\n          tk.key_path,\n          tk.category,\n          tk.english_text,\n          tov.custom_text,\n          tov.is_approved,\n          tov.notes,\n          CASE WHEN tov.id IS NOT NULL THEN 1 ELSE 0 END as has_override\n        FROM translation_keys tk\n        LEFT JOIN translation_overrides tov ON tk.id = tov.key_id AND tov.language_code = ?\n        WHERE tk.is_active = 1\n        ORDER BY tk.category, tk.key_path", [_0xef30f4]);
      const _0x3fc769 = _0x5e6d06.data || [];
      let _0x5b561c = {};
      if (_0x169317 !== "en") {
        try {
          const _0x23db44 = [path.join(__dirname, "..", "locales", _0x169317 + ".js"), path.join(__dirname, "..", "..", "src", "locales", _0x169317 + ".js"), path.join(process.cwd(), "src", "locales", _0x169317 + ".js")];
          let _0x42547b = null;
          for (const _0x25086d of _0x23db44) {
            if (fs.existsSync(_0x25086d)) {
              _0x42547b = _0x25086d;
              break;
            }
          }
          if (!_0x42547b) {
            throw new Error("Locale file not found");
          }
          if (fs.existsSync(_0x42547b)) {
            let _0x2d2f41 = fs.readFileSync(_0x42547b, "utf8");
            _0x2d2f41 = _0x2d2f41.replace(/export\s+default\s+/g, "");
            _0x2d2f41 = _0x2d2f41.trim().replace(/;$/, "");
            try {
              _0x5b561c = eval("(" + _0x2d2f41 + ")");
            } catch (_0x3e6ad4) {
              console.error("[" + _0x4c003e + "] ❌ Error evaluating locale file:", _0x3e6ad4.message);
              console.error("[" + _0x4c003e + "] ❌ Error stack:", _0x3e6ad4.stack);
            }
          } else {}
        } catch (_0x88c6be) {
          console.error("❌ Error loading locale file for " + _0x3f53b8 + ":", _0x88c6be.message);
          console.error("❌ Error stack:", _0x88c6be.stack);
        }
      }
      const _0x4aea71 = (_0x46e5fa, _0x701d53) => {
        const _0x469035 = _0x701d53.split(".");
        let _0x509d8f = _0x46e5fa;
        if (_0x701d53 === "common.actions") {}
        for (let _0x4fcf75 = 0; _0x4fcf75 < _0x469035.length; _0x4fcf75++) {
          const _0xbab462 = _0x469035[_0x4fcf75];
          if (_0x701d53 === "common.actions") {
            if (_0x509d8f && typeof _0x509d8f === "object") {}
          }
          if (_0x509d8f && typeof _0x509d8f === "object" && _0xbab462 in _0x509d8f) {
            _0x509d8f = _0x509d8f[_0xbab462];
            if (_0x701d53 === "common.actions") {}
          } else {
            if (_0x701d53 === "common.actions") {}
            return null;
          }
        }
        const _0x32e3c2 = typeof _0x509d8f === "string" ? _0x509d8f : null;
        if (_0x701d53 === "common.actions") {}
        return _0x32e3c2;
      };
      const _0x567fa7 = _0x4aea71(_0x5b561c, "common.actions");
      if (_0x5b561c.common) {}
      let _0x22c01a = 0;
      let _0x54db21 = 0;
      let _0x18dcea = 0;
      const _0x45a234 = _0x3fc769.map((_0x1fe1c9, _0x186212) => {
        let _0x54ec2c = _0x1fe1c9.english_text;
        let _0x51671e = false;
        if (_0x1fe1c9.custom_text) {
          _0x54ec2c = _0x1fe1c9.custom_text;
          _0x54db21++;
        } else {
          const _0x35df0c = _0x4aea71(_0x5b561c, _0x1fe1c9.key_path);
          if (_0x35df0c) {
            _0x54ec2c = _0x35df0c;
            _0x51671e = true;
            _0x22c01a++;
            if (_0x22c01a <= 3) {}
          } else {
            _0x18dcea++;
            if (_0x18dcea <= 3) {}
          }
        }
        return {
          ..._0x1fe1c9,
          translated_text: _0x54ec2c,
          from_locale_file: _0x51671e,
          is_missing: !_0x1fe1c9.custom_text && !_0x51671e
        };
      });
      return _0x45a234;
    } catch (_0x35e0be) {
      console.error("Error getting translations:", _0x35e0be);
      return [];
    }
  }
  async updateTranslation(_0x26ff59, _0x2562c6, _0x5b590d, _0x3ace4b = false, _0xa580b6 = "") {
    const _0x4bf2fd = _0x2562c6.toUpperCase();
    try {
      const _0x5add74 = await this.db.query("INSERT OR REPLACE INTO translation_overrides\n         (key_id, language_code, custom_text, is_approved, notes, updated_at)\n         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x26ff59, _0x4bf2fd, _0x5b590d, _0x3ace4b ? 1 : 0, _0xa580b6]);
      await this.updateTranslationStats(_0x4bf2fd);
      return {
        success: true
      };
    } catch (_0x57787d) {
      console.error("Error updating translation:", _0x57787d);
      return {
        success: false,
        error: _0x57787d.message
      };
    }
  }
  async deleteTranslation(_0x5d4cf9, _0xea0c69) {
    const _0x58ec16 = _0xea0c69.toUpperCase();
    try {
      const _0x573260 = await this.db.query("DELETE FROM translation_overrides\n         WHERE key_id = ? AND language_code = ?", [_0x5d4cf9, _0x58ec16]);
      await this.updateTranslationStats(_0x58ec16);
      return {
        success: true
      };
    } catch (_0xb881ca) {
      console.error("Error deleting translation:", _0xb881ca);
      return {
        success: false,
        error: _0xb881ca.message
      };
    }
  }
  async getTranslationStats() {
    try {
      const _0x300009 = await this.db.query("SELECT * FROM translation_stats ORDER BY language_code");
      return _0x300009.data || [];
    } catch (_0x3e053f) {
      console.error("Error getting translation stats:", _0x3e053f);
      return [];
    }
  }
  async updateTranslationStats(_0x507597) {
    const _0x26ff3b = _0x507597.toUpperCase();
    try {
      const _0x410a27 = await this.db.query("SELECT COUNT(*) as count FROM translation_keys WHERE is_active = 1");
      const _0x18f82a = _0x410a27.data?.[0]?.count || 0;
      const _0x20cb7c = await this.db.query("SELECT COUNT(*) as count FROM translation_overrides\n         WHERE language_code = ? AND custom_text IS NOT NULL", [_0x26ff3b]);
      const _0x1eb315 = _0x20cb7c.data?.[0]?.count || 0;
      const _0x51beaf = await this.db.query("SELECT COUNT(*) as count FROM translation_overrides\n         WHERE language_code = ? AND is_approved = 1", [_0x26ff3b]);
      const _0x7b7616 = _0x51beaf.data?.[0]?.count || 0;
      await this.db.query("INSERT OR REPLACE INTO translation_stats\n         (language_code, total_keys, translated_keys, approved_keys, last_updated)\n         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x26ff3b, _0x18f82a, _0x1eb315, _0x7b7616]);
      return {
        success: true,
        total: _0x18f82a,
        translated: _0x1eb315,
        approved: _0x7b7616
      };
    } catch (_0x23e375) {
      console.error("Error updating translation stats:", _0x23e375);
      return {
        success: false,
        error: _0x23e375.message
      };
    }
  }
  async searchTranslations(_0x2a615b, _0x3467b3) {
    const _0x23ed30 = _0x2a615b.toUpperCase();
    try {
      const _0x3e9f3c = await this.db.query("SELECT\n          tk.id,\n          tk.key_path,\n          tk.category,\n          tk.english_text,\n          COALESCE(tov.custom_text, tk.english_text) as translated_text,\n          tov.custom_text,\n          tov.is_approved\n        FROM translation_keys tk\n        LEFT JOIN translation_overrides tov ON tk.id = tov.key_id AND tov.language_code = ?\n        WHERE tk.is_active = 1 AND (\n          tk.key_path LIKE ? OR\n          tk.english_text LIKE ? OR\n          tov.custom_text LIKE ?\n        )\n        ORDER BY tk.category, tk.key_path", [_0x23ed30, "%" + _0x3467b3 + "%", "%" + _0x3467b3 + "%", "%" + _0x3467b3 + "%"]);
      return _0x3e9f3c.data || [];
    } catch (_0x160fe3) {
      console.error("Error searching translations:", _0x160fe3);
      return [];
    }
  }
  async exportTranslations(_0x52f5b8) {
    try {
      const _0x5e6914 = require("fs");
      const _0x58b387 = require("path");
      const _0x3d088f = _0x58b387.join(__dirname, "..", "locales", _0x52f5b8 + ".js");
      if (_0x5e6914.existsSync(_0x3d088f)) {
        let _0x1e4a96 = _0x5e6914.readFileSync(_0x3d088f, "utf8");
        _0x1e4a96 = _0x1e4a96.replace(/export\s+default\s+/g, "");
        _0x1e4a96 = _0x1e4a96.trim().replace(/;$/, "");
        const _0x3c5bbd = eval("(" + _0x1e4a96 + ")");
        return _0x3c5bbd;
      }
      return {};
      if (translations.length === 0) {
        try {
          const _0x467461 = [_0x58b387.join(__dirname, "..", "locales", _0x52f5b8 + ".js"), _0x58b387.join(__dirname, "..", "..", "src", "locales", _0x52f5b8 + ".js"), _0x58b387.join(process.cwd(), "src", "locales", _0x52f5b8 + ".js")];
          let _0x2cbb95 = null;
          for (const _0x1d5b18 of _0x467461) {
            if (_0x5e6914.existsSync(_0x1d5b18)) {
              _0x2cbb95 = _0x1d5b18;
              break;
            }
          }
          if (_0x2cbb95 && _0x5e6914.existsSync(_0x2cbb95)) {
            let _0x40781c = _0x5e6914.readFileSync(_0x2cbb95, "utf8");
            _0x40781c = _0x40781c.replace(/export\s+default\s+/g, "");
            _0x40781c = _0x40781c.trim().replace(/;$/, "");
            const _0xaedd92 = eval("(" + _0x40781c + ")");
            return _0xaedd92;
          }
        } catch (_0x52e83c) {
          console.error("❌ [EXPORT] Fallback to locale file failed:", _0x52e83c.message);
        }
        return {};
      }
      const _0xc3a3f5 = {};
      let _0x3e9b69 = 0;
      let _0x20c1d8 = 0;
      for (const _0x16d2d6 of translations) {
        const _0xaf7299 = _0x16d2d6.translated_text || _0x16d2d6.custom_text || _0x16d2d6.english_text;
        if (_0x3e9b69 + _0x20c1d8 < 3) {}
        if (!_0xaf7299 || typeof _0xaf7299 === "string" && _0xaf7299.trim() === "") {
          if (_0x20c1d8 < 5) {}
          _0x20c1d8++;
          continue;
        }
        const _0x2b4e2d = _0x16d2d6.key_path.split(".");
        let _0x3932bb = _0xc3a3f5;
        for (let _0x442963 = 0; _0x442963 < _0x2b4e2d.length - 1; _0x442963++) {
          if (!_0x3932bb[_0x2b4e2d[_0x442963]]) {
            _0x3932bb[_0x2b4e2d[_0x442963]] = {};
          }
          _0x3932bb = _0x3932bb[_0x2b4e2d[_0x442963]];
        }
        _0x3932bb[_0x2b4e2d[_0x2b4e2d.length - 1]] = _0xaf7299;
        _0x3e9b69++;
      }
      try {
        const _0x3f6e29 = {
          languageCode: _0x52f5b8,
          translationsCount: translations.length,
          processedCount: _0x3e9b69,
          skippedCount: _0x20c1d8,
          resultKeys: Object.keys(_0xc3a3f5),
          sampleTranslations: translations.slice(0, 5).map(_0x331386 => ({
            key: _0x331386.key_path,
            hasText: !!_0x331386.translated_text,
            textPreview: _0x331386.translated_text ? _0x331386.translated_text.substring(0, 50) : null
          }))
        };
        try {
          let _0x518dc1;
          try {
            _0x518dc1 = require("electron").app.getPath("userData");
          } catch (_0x3fddee) {
            _0x518dc1 = require("os").tmpdir();
          }
          _0x5e6914.writeFileSync(_0x58b387.join(_0x518dc1, "export-debug.json"), JSON.stringify(_0x3f6e29, null, 2));
        } catch (_0x55a9b6) {}
      } catch (_0x556992) {
        console.error("❌ [EXPORT] Failed to write debug file:", _0x556992.message);
      }
      return _0xc3a3f5;
    } catch (_0x171c81) {
      console.error("❌ [EXPORT] Error exporting translations:", _0x171c81);
      console.error("❌ [EXPORT] Error stack:", _0x171c81.stack);
      return {};
    }
  }
  async importTranslations(_0x55dab5, _0x51967e, _0x1272f9 = false) {
    const _0x4c97be = _0x55dab5.toUpperCase();
    try {
      let _0xa933fb = 0;
      let _0x1e8c57 = 0;
      let _0x4fd7cd = 0;
      let _0x2dd891 = 0;
      const _0x441765 = (_0x5d362a, _0x1f939d = "") => {
        const _0x2cce3e = [];
        for (const [_0x19ef0d, _0x434c6b] of Object.entries(_0x5d362a)) {
          const _0x271c2f = _0x1f939d ? _0x1f939d + "." + _0x19ef0d : _0x19ef0d;
          if (typeof _0x434c6b === "string") {
            _0x2cce3e.push({
              keyPath: _0x271c2f,
              translation: _0x434c6b
            });
          } else if (typeof _0x434c6b === "object" && _0x434c6b !== null) {
            _0x2cce3e.push(..._0x441765(_0x434c6b, _0x271c2f));
          }
        }
        return _0x2cce3e;
      };
      const _0x4884fb = _0x441765(_0x51967e);
      for (const {
        keyPath: _0x14d362,
        translation: _0x48bc43
      } of _0x4884fb) {
        try {
          const _0x1c8f5d = await this.db.query("SELECT id FROM translation_keys WHERE key_path = ? AND is_active = 1", [_0x14d362]);
          if (!_0x1c8f5d.data || _0x1c8f5d.data.length === 0) {
            _0x4fd7cd++;
            continue;
          }
          const _0x34bd9c = _0x1c8f5d.data[0].id;
          const _0x362911 = await this.db.query("SELECT id, custom_text FROM translation_overrides WHERE key_id = ? AND language_code = ?", [_0x34bd9c, _0x4c97be]);
          if (_0x362911.data && _0x362911.data.length > 0) {
            await this.db.query("UPDATE translation_overrides\n               SET custom_text = ?, is_approved = ?, updated_at = CURRENT_TIMESTAMP\n               WHERE key_id = ? AND language_code = ?", [_0x48bc43, _0x1272f9 ? 1 : 0, _0x34bd9c, _0x4c97be]);
            _0x1e8c57++;
          } else {
            await this.db.query("INSERT INTO translation_overrides (key_id, language_code, custom_text, is_approved)\n               VALUES (?, ?, ?, ?)", [_0x34bd9c, _0x4c97be, _0x48bc43, _0x1272f9 ? 1 : 0]);
            _0xa933fb++;
          }
        } catch (_0x396bdf) {
          console.error("Error importing translation for " + _0x14d362 + ":", _0x396bdf);
          _0x2dd891++;
        }
      }
      await this.updateTranslationStats(_0x4c97be);
      return {
        success: true,
        imported: _0xa933fb,
        updated: _0x1e8c57,
        skipped: _0x4fd7cd,
        errors: _0x2dd891,
        total: _0x4884fb.length
      };
    } catch (_0x4ff1ee) {
      console.error("Error importing translations:", _0x4ff1ee);
      return {
        success: false,
        error: _0x4ff1ee.message
      };
    }
  }
}
module.exports = TranslationService;