const EventEmitter = require("events");
const crypto = require("crypto");
class ProxyService extends EventEmitter {
  constructor(_0x2665c1) {
    super();
    this.databaseService = _0x2665c1;
    this.apiBaseUrl = "https://px6.link/api";
    this.asocksApiBaseUrl = "https://api.asocks.com/v2";
    this.encryptionKey = "leadwave-proxy-encryption-key-2024";
    this.rateLimitDelay = 350;
    this.lastRequestTime = 0;
  }
  encrypt(_0x26bf1b) {
    try {
      const _0x30237a = crypto.createCipher("aes-256-cbc", this.encryptionKey);
      let _0x4dbff6 = _0x30237a.update(_0x26bf1b, "utf8", "hex");
      _0x4dbff6 += _0x30237a.final("hex");
      return _0x4dbff6;
    } catch (_0x15e09b) {
      console.error("Encryption error:", _0x15e09b);
      return _0x26bf1b;
    }
  }
  decrypt(_0x44ec66) {
    try {
      const _0x3956a0 = crypto.createDecipher("aes-256-cbc", this.encryptionKey);
      let _0x1d07cd = _0x3956a0.update(_0x44ec66, "hex", "utf8");
      _0x1d07cd += _0x3956a0.final("utf8");
      return _0x1d07cd;
    } catch (_0x25343c) {
      console.error("Decryption error:", _0x25343c);
      return _0x44ec66;
    }
  }
  async rateLimit() {
    const _0x28c06f = Date.now();
    const _0x2ad70a = _0x28c06f - this.lastRequestTime;
    if (_0x2ad70a < this.rateLimitDelay) {
      await new Promise(_0x3259cf => setTimeout(_0x3259cf, this.rateLimitDelay - _0x2ad70a));
    }
    this.lastRequestTime = Date.now();
  }
  async makeApiRequest(_0x4defd0, _0x347e45 = {}) {
    await this.rateLimit();
    const _0x38233d = await this.getApiKey();
    if (!_0x38233d) {
      throw new Error("API key not configured");
    }
    const _0x5e575b = new URLSearchParams(_0x347e45).toString();
    const _0x227a6d = this.apiBaseUrl + "/" + _0x38233d + (_0x4defd0 ? "/" + _0x4defd0 : "") + (_0x5e575b ? "?" + _0x5e575b : "");
    try {
      const _0x4d6e25 = require("node-fetch");
      const _0xcf9b0b = await _0x4d6e25(_0x227a6d);
      const _0x334248 = await _0xcf9b0b.json();
      if (_0x334248.status === "no") {
        throw new Error(_0x334248.error || "API request failed");
      }
      return _0x334248;
    } catch (_0x2561b2) {
      console.error("❌ Proxy6.net API error:", _0x2561b2);
      throw _0x2561b2;
    }
  }
  async saveApiKey(_0x439ffe) {
    try {
      const _0x3419bd = this.encrypt(_0x439ffe);
      const _0x16d441 = await this.databaseService.query("SELECT id FROM proxy_settings WHERE id = 1");
      if (_0x16d441.success && _0x16d441.data.length > 0) {
        await this.databaseService.query("UPDATE proxy_settings SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [_0x3419bd]);
      } else {
        await this.databaseService.query("INSERT INTO proxy_settings (id, api_key) VALUES (1, ?)", [_0x3419bd]);
      }
      await this.syncAccountInfo();
      return {
        success: true
      };
    } catch (_0x3d22f0) {
      console.error("Error saving API key:", _0x3d22f0);
      return {
        success: false,
        error: _0x3d22f0.message
      };
    }
  }
  async getApiKey() {
    try {
      const _0x3cd517 = await this.databaseService.query("SELECT api_key FROM proxy_settings WHERE id = 1");
      if (_0x3cd517.success && _0x3cd517.data.length > 0) {
        return this.decrypt(_0x3cd517.data[0].api_key);
      }
      return null;
    } catch (_0x22bc69) {
      console.error("Error getting API key:", _0x22bc69);
      return null;
    }
  }
  async getSettings() {
    try {
      const _0x5e8b89 = await this.databaseService.query("SELECT * FROM proxy_settings WHERE id = 1");
      if (_0x5e8b89.success && _0x5e8b89.data.length > 0) {
        const _0x3ea6f8 = _0x5e8b89.data[0];
        return {
          hasApiKey: !!_0x3ea6f8.api_key,
          balance: _0x3ea6f8.balance || 0,
          currency: _0x3ea6f8.currency || "USD",
          last_sync: _0x3ea6f8.last_sync,
          hasAsocksApiKey: !!_0x3ea6f8.asocks_api_key,
          asocksBalance: _0x3ea6f8.asocks_balance || 0,
          asocksLastSync: _0x3ea6f8.asocks_last_sync
        };
      }
      return {
        hasApiKey: false,
        balance: 0,
        currency: "USD",
        last_sync: null,
        hasAsocksApiKey: false,
        asocksBalance: 0,
        asocksLastSync: null
      };
    } catch (_0x476d3b) {
      console.error("Error getting settings:", _0x476d3b);
      return {
        success: false,
        error: _0x476d3b.message
      };
    }
  }
  async saveAsocksApiKey(_0x2e31a1) {
    try {
      const _0x5205a9 = this.encrypt(_0x2e31a1);
      const _0x589a65 = await this.databaseService.query("SELECT id FROM proxy_settings WHERE id = 1");
      let _0x58c056;
      if (_0x589a65.success && _0x589a65.data.length > 0) {
        _0x58c056 = await this.databaseService.query("UPDATE proxy_settings SET asocks_api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [_0x5205a9]);
      } else {
        _0x58c056 = await this.databaseService.query("INSERT INTO proxy_settings (id, api_key, asocks_api_key) VALUES (1, '', ?)", [_0x5205a9]);
      }
      if (!_0x58c056 || !_0x58c056.success) {
        console.error("Error saving Asocks API key to database:", _0x58c056?.error);
        return {
          success: false,
          error: _0x58c056?.error || "Failed to save Asocks API key to database"
        };
      }
      await this.syncAsocksAccount();
      return {
        success: true
      };
    } catch (_0x1c333b) {
      console.error("Error saving Asocks API key:", _0x1c333b);
      return {
        success: false,
        error: _0x1c333b.message
      };
    }
  }
  async getAsocksApiKey() {
    try {
      const _0x583f98 = await this.databaseService.query("SELECT asocks_api_key FROM proxy_settings WHERE id = 1");
      if (_0x583f98.success && _0x583f98.data.length > 0 && _0x583f98.data[0].asocks_api_key) {
        return this.decrypt(_0x583f98.data[0].asocks_api_key);
      }
      return null;
    } catch (_0x1f2dcd) {
      console.error("Error getting Asocks API key:", _0x1f2dcd);
      return null;
    }
  }
  async makeAsocksRequest(_0x1afdcc, _0x4be51f = {}) {
    const _0x46ed25 = await this.getAsocksApiKey();
    if (!_0x46ed25) {
      throw new Error("Asocks API key not configured");
    }
    const _0x5aa8c9 = new URLSearchParams({
      apiKey: _0x46ed25,
      ..._0x4be51f
    }).toString();
    const _0x44386b = "" + this.asocksApiBaseUrl + _0x1afdcc + "?" + _0x5aa8c9;
    try {
      const _0xc5e558 = require("node-fetch");
      const _0x1dd110 = await _0xc5e558(_0x44386b);
      const _0x502d1d = await _0x1dd110.json();
      if (!_0x1dd110.ok) {
        throw new Error(_0x502d1d.message || "HTTP " + _0x1dd110.status);
      }
      return _0x502d1d;
    } catch (_0x1c23c2) {
      console.error("❌ Asocks API error:", _0x1c23c2);
      throw _0x1c23c2;
    }
  }
  async syncAsocksAccount() {
    try {
      const _0x8dfb32 = await this.makeAsocksRequest("/user/balance");
      const _0x32bc62 = parseFloat(_0x8dfb32.balance ?? _0x8dfb32.data?.balance ?? 0);
      await this.databaseService.query("UPDATE proxy_settings SET asocks_balance = ?, asocks_last_sync = CURRENT_TIMESTAMP WHERE id = 1", [_0x32bc62]);
      return {
        success: true,
        balance: _0x32bc62
      };
    } catch (_0x1d4369) {
      console.error("Error syncing Asocks account:", _0x1d4369);
      return {
        success: false,
        error: _0x1d4369.message
      };
    }
  }
  async syncAsocksPorts() {
    try {
      const _0x366d4d = await this.makeAsocksRequest("/proxy/ports");
      const _0xae8dd2 = Array.isArray(_0x366d4d) ? _0x366d4d : _0x366d4d.data || [];
      let _0x23e564 = 0;
      for (const _0x307171 of _0xae8dd2) {
        const _0x418a79 = String(_0x307171.id);
        const _0x204a97 = _0x307171.host || _0x307171.ip || _0x307171.proxyHost || "";
        const _0x4026c4 = _0x307171.port || _0x307171.proxyPort || 0;
        const _0x6a2dd6 = _0x307171.login || _0x307171.username || _0x307171.user || "";
        const _0x55a731 = _0x307171.password || _0x307171.pass || "";
        const _0x2d2d28 = (_0x307171.type || _0x307171.protocol || "http").toLowerCase();
        const _0x2b0b12 = (_0x307171.country || _0x307171.countryCode || "unknown").toLowerCase();
        const _0x3600c4 = _0x307171.status === "active" || _0x307171.active === true || _0x307171.active === 1 ? 1 : 0;
        const _0xc64e03 = _0x307171.dateExpire || _0x307171.date_end || _0x307171.expiresAt || null;
        const _0x31fed3 = await this.databaseService.query("SELECT id FROM proxies WHERE asocks_port_id = ?", [_0x418a79]);
        if (_0x31fed3.success && _0x31fed3.data.length > 0) {
          await this.databaseService.query("UPDATE proxies SET\n              host = ?, port = ?, username = ?, password = ?, type = ?,\n              country = ?, is_active = ?, date_expires = ?,\n              updated_at = CURRENT_TIMESTAMP\n            WHERE asocks_port_id = ?", [_0x204a97, _0x4026c4, _0x6a2dd6, _0x55a731, _0x2d2d28, _0x2b0b12, _0x3600c4, _0xc64e03, _0x418a79]);
        } else {
          await this.databaseService.query("INSERT INTO proxies (\n              asocks_port_id, host, ip, port, username, password, type,\n              country, is_active, date_expires, provider\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'asocks')", [_0x418a79, _0x204a97, _0x204a97, _0x4026c4, _0x6a2dd6, _0x55a731, _0x2d2d28, _0x2b0b12, _0x3600c4, _0xc64e03]);
        }
        _0x23e564++;
      }
      await this.databaseService.query("UPDATE proxy_settings SET asocks_last_sync = CURRENT_TIMESTAMP WHERE id = 1");
      this.emit("asocks-proxies-synced", {
        count: _0x23e564
      });
      return {
        success: true,
        count: _0x23e564
      };
    } catch (_0x3e0c48) {
      console.error("❌ Error syncing Asocks ports:", _0x3e0c48);
      return {
        success: false,
        error: _0x3e0c48.message
      };
    }
  }
  async syncAccountInfo() {
    try {
      const _0x564885 = await this.makeApiRequest("");
      await this.databaseService.query("UPDATE proxy_settings SET balance = ?, currency = ?, last_sync = CURRENT_TIMESTAMP WHERE id = 1", [parseFloat(_0x564885.balance), _0x564885.currency]);
      return {
        success: true,
        balance: _0x564885.balance,
        currency: _0x564885.currency
      };
    } catch (_0x5d6991) {
      console.error("Error syncing account info:", _0x5d6991);
      return {
        success: false,
        error: _0x5d6991.message
      };
    }
  }
  async getPrice(_0x4b57da, _0x4c210c, _0x1653ea = 6) {
    try {
      const _0x51983c = await this.makeApiRequest("getprice", {
        count: _0x4b57da,
        period: _0x4c210c,
        version: _0x1653ea
      });
      return {
        success: true,
        price: _0x51983c.price,
        price_single: _0x51983c.price_single,
        period: _0x51983c.period,
        count: _0x51983c.count
      };
    } catch (_0x25e98f) {
      console.error("Error getting price:", _0x25e98f);
      return {
        success: false,
        error: _0x25e98f.message
      };
    }
  }
  async getCountries(_0x35c26a = 6) {
    try {
      const _0x45d005 = await this.makeApiRequest("getcountry", {
        version: _0x35c26a
      });
      return {
        success: true,
        countries: _0x45d005.list
      };
    } catch (_0x54421f) {
      console.error("Error getting countries:", _0x54421f);
      return {
        success: false,
        error: _0x54421f.message
      };
    }
  }
  async getCount(_0x5e6862, _0x2696e4 = 6) {
    try {
      const _0x4ef0a3 = await this.makeApiRequest("getcount", {
        country: _0x5e6862,
        version: _0x2696e4
      });
      return {
        success: true,
        count: _0x4ef0a3.count
      };
    } catch (_0x2e4a7c) {
      console.error("Error getting count:", _0x2e4a7c);
      return {
        success: false,
        error: _0x2e4a7c.message
      };
    }
  }
  async buyProxy(_0x358060, _0x1b1e95, _0x53db28, _0x46ae80 = 6, _0x2596f3 = "http", _0x46984e = "", _0xd25c28 = false) {
    try {
      const _0x109d26 = {
        count: _0x358060,
        period: _0x1b1e95,
        country: _0x53db28,
        version: _0x46ae80,
        type: _0x2596f3
      };
      if (_0x46984e) {
        _0x109d26.descr = _0x46984e;
      }
      if (_0xd25c28) {
        _0x109d26.auto_prolong = "";
      }
      const _0x806d30 = await this.makeApiRequest("buy", _0x109d26);
      if (_0x806d30.list) {
        for (const [_0x1350bb, _0x2f209a] of Object.entries(_0x806d30.list)) {
          await this.databaseService.query("INSERT INTO proxies (\n              proxy6_id, ip, host, port, username, password, type, country, version,\n              date_purchased, date_expires, is_active, description, auto_renew\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0x2f209a.id, _0x2f209a.ip, _0x2f209a.host, _0x2f209a.port, _0x2f209a.user, _0x2f209a.pass, _0x2f209a.type, _0x53db28, _0x46ae80, _0x2f209a.date, _0x2f209a.date_end, _0x2f209a.active === "1" ? 1 : 0, _0x46984e, _0xd25c28 ? 1 : 0]);
        }
      }
      await this.syncAccountInfo();
      this.emit("proxies-purchased", {
        count: _0x358060,
        country: _0x53db28,
        price: _0x806d30.price
      });
      return {
        success: true,
        order_id: _0x806d30.order_id,
        count: _0x806d30.count,
        price: _0x806d30.price,
        proxies: _0x806d30.list
      };
    } catch (_0x3c54b0) {
      console.error("Error buying proxies:", _0x3c54b0);
      return {
        success: false,
        error: _0x3c54b0.message
      };
    }
  }
  async syncProxies(_0x19530c = "active") {
    try {
      const _0x159d99 = await this.makeApiRequest("getproxy", {
        state: _0x19530c
      });
      if (_0x159d99.list) {
        if (_0x19530c === "all") {
          await this.databaseService.query("DELETE FROM proxies");
        }
        let _0x555507 = 0;
        for (const [_0x34489f, _0x124696] of Object.entries(_0x159d99.list)) {
          const _0x54ed16 = await this.databaseService.query("SELECT id FROM proxies WHERE proxy6_id = ?", [_0x124696.id]);
          if (_0x54ed16.success && _0x54ed16.data.length > 0) {
            await this.databaseService.query("UPDATE proxies SET\n                ip = ?, host = ?, port = ?, username = ?, password = ?, type = ?,\n                country = ?, date_purchased = ?, date_expires = ?, is_active = ?,\n                description = ?, updated_at = CURRENT_TIMESTAMP\n              WHERE proxy6_id = ?", [_0x124696.ip, _0x124696.host, _0x124696.port, _0x124696.user, _0x124696.pass, _0x124696.type, _0x124696.country, _0x124696.date, _0x124696.date_end, _0x124696.active === "1" ? 1 : 0, _0x124696.descr || "", _0x124696.id]);
          } else {
            await this.databaseService.query("INSERT INTO proxies (\n                proxy6_id, ip, host, port, username, password, type, country,\n                date_purchased, date_expires, is_active, description\n              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0x124696.id, _0x124696.ip, _0x124696.host, _0x124696.port, _0x124696.user, _0x124696.pass, _0x124696.type, _0x124696.country, _0x124696.date, _0x124696.date_end, _0x124696.active === "1" ? 1 : 0, _0x124696.descr || ""]);
          }
          _0x555507++;
        }
      } else {}
      this.emit("proxies-synced", {
        count: _0x159d99.list_count || 0
      });
      return {
        success: true,
        count: _0x159d99.list_count || 0
      };
    } catch (_0x57748a) {
      console.error("❌ Error syncing proxies:", _0x57748a);
      return {
        success: false,
        error: _0x57748a.message
      };
    }
  }
  async getProxies(_0x46d5aa = {}) {
    try {
      let _0x488f24 = "SELECT * FROM proxies WHERE 1=1";
      const _0x3b091c = [];
      if (_0x46d5aa.country) {
        _0x488f24 += " AND country = ?";
        _0x3b091c.push(_0x46d5aa.country);
      }
      if (_0x46d5aa.is_active !== undefined) {
        _0x488f24 += " AND is_active = ?";
        _0x3b091c.push(_0x46d5aa.is_active ? 1 : 0);
      }
      if (_0x46d5aa.version) {
        _0x488f24 += " AND version = ?";
        _0x3b091c.push(_0x46d5aa.version);
      }
      if (_0x46d5aa.type) {
        _0x488f24 += " AND type = ?";
        _0x3b091c.push(_0x46d5aa.type);
      }
      _0x488f24 += " ORDER BY date_expires DESC";
      const _0x3cab4f = await this.databaseService.query(_0x488f24, _0x3b091c);
      if (_0x3cab4f.success) {
        return {
          success: true,
          proxies: _0x3cab4f.data
        };
      }
      return {
        success: false,
        error: "Failed to fetch proxies"
      };
    } catch (_0x467ff3) {
      console.error("Error getting proxies:", _0x467ff3);
      return {
        success: false,
        error: _0x467ff3.message
      };
    }
  }
  async prolongProxy(_0x5b3054, _0x185320) {
    try {
      const _0x6ded4c = Array.isArray(_0x5b3054) ? _0x5b3054 : [_0x5b3054];
      const _0x292393 = await this.databaseService.query("SELECT proxy6_id FROM proxies WHERE id IN (" + _0x6ded4c.map(() => "?").join(",") + ")", _0x6ded4c);
      if (!_0x292393.success || _0x292393.data.length === 0) {
        throw new Error("Proxies not found");
      }
      const _0xc330cd = _0x292393.data.map(_0x2996d1 => _0x2996d1.proxy6_id).join(",");
      const _0x1742aa = await this.makeApiRequest("prolong", {
        period: _0x185320,
        ids: _0xc330cd
      });
      if (_0x1742aa.list) {
        for (const [_0x4e7827, _0xad9707] of Object.entries(_0x1742aa.list)) {
          await this.databaseService.query("UPDATE proxies SET date_expires = ?, updated_at = CURRENT_TIMESTAMP WHERE proxy6_id = ?", [_0xad9707.date_end, _0xad9707.id]);
        }
      }
      await this.syncAccountInfo();
      this.emit("proxies-extended", {
        count: _0x1742aa.count,
        price: _0x1742aa.price
      });
      return {
        success: true,
        count: _0x1742aa.count,
        price: _0x1742aa.price
      };
    } catch (_0x236946) {
      console.error("Error extending proxies:", _0x236946);
      return {
        success: false,
        error: _0x236946.message
      };
    }
  }
  async deleteProxy(_0x213c68) {
    try {
      const _0x289d41 = Array.isArray(_0x213c68) ? _0x213c68 : [_0x213c68];
      const _0x2cef9a = await this.databaseService.query("SELECT proxy6_id FROM proxies WHERE id IN (" + _0x289d41.map(() => "?").join(",") + ")", _0x289d41);
      if (!_0x2cef9a.success || _0x2cef9a.data.length === 0) {
        throw new Error("Proxies not found");
      }
      const _0x2b0cba = _0x2cef9a.data.map(_0x24201d => _0x24201d.proxy6_id).join(",");
      const _0x4a5b81 = await this.makeApiRequest("delete", {
        ids: _0x2b0cba
      });
      await this.databaseService.query("DELETE FROM proxies WHERE id IN (" + _0x289d41.map(() => "?").join(",") + ")", _0x289d41);
      this.emit("proxies-deleted", {
        count: _0x4a5b81.count
      });
      return {
        success: true,
        count: _0x4a5b81.count
      };
    } catch (_0x4c0372) {
      console.error("Error deleting proxies:", _0x4c0372);
      return {
        success: false,
        error: _0x4c0372.message
      };
    }
  }
  async checkProxy(_0x10dd7d) {
    try {
      const _0x5ae254 = await this.databaseService.query("SELECT proxy6_id FROM proxies WHERE id = ?", [_0x10dd7d]);
      if (!_0x5ae254.success || _0x5ae254.data.length === 0) {
        throw new Error("Proxy not found");
      }
      const _0x5c6a3a = await this.makeApiRequest("check", {
        ids: _0x5ae254.data[0].proxy6_id
      });
      await this.databaseService.query("UPDATE proxies SET is_valid = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?", [_0x5c6a3a.proxy_status ? 1 : 0, _0x10dd7d]);
      return {
        success: true,
        is_valid: _0x5c6a3a.proxy_status
      };
    } catch (_0x5e81c6) {
      console.error("Error checking proxy:", _0x5e81c6);
      return {
        success: false,
        error: _0x5e81c6.message
      };
    }
  }
  async setProxyType(_0x3c5922, _0xcf43de) {
    try {
      const _0x5ef3d5 = Array.isArray(_0x3c5922) ? _0x3c5922 : [_0x3c5922];
      const _0x371854 = await this.databaseService.query("SELECT proxy6_id FROM proxies WHERE id IN (" + _0x5ef3d5.map(() => "?").join(",") + ")", _0x5ef3d5);
      if (!_0x371854.success || _0x371854.data.length === 0) {
        throw new Error("Proxies not found");
      }
      const _0x115df4 = _0x371854.data.map(_0x50d3ce => _0x50d3ce.proxy6_id).join(",");
      await this.makeApiRequest("settype", {
        ids: _0x115df4,
        type: _0xcf43de
      });
      await this.databaseService.query("UPDATE proxies SET type = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (" + _0x5ef3d5.map(() => "?").join(",") + ")", [_0xcf43de, ..._0x5ef3d5]);
      return {
        success: true
      };
    } catch (_0x48c2fa) {
      console.error("Error setting proxy type:", _0x48c2fa);
      return {
        success: false,
        error: _0x48c2fa.message
      };
    }
  }
  async getStatistics() {
    try {
      const _0x1cc264 = {};
      const _0x24ab85 = await this.databaseService.query("SELECT COUNT(*) as count FROM proxies");
      _0x1cc264.total = _0x24ab85.data[0].count;
      const _0x368495 = await this.databaseService.query("SELECT COUNT(*) as count FROM proxies WHERE is_active = 1");
      _0x1cc264.active = _0x368495.data[0].count;
      const _0x534aa2 = await this.databaseService.query("SELECT COUNT(*) as count FROM proxies WHERE date_expires < datetime('now')");
      _0x1cc264.expired = _0x534aa2.data[0].count;
      const _0x2b73c2 = await this.databaseService.query("SELECT COUNT(*) as count FROM proxies WHERE date_expires BETWEEN datetime('now') AND datetime('now', '+7 days')");
      _0x1cc264.expiring_soon = _0x2b73c2.data[0].count;
      const _0x45a0a4 = await this.databaseService.query("SELECT country, COUNT(*) as count FROM proxies GROUP BY country");
      _0x1cc264.by_country = _0x45a0a4.data;
      const _0x578b50 = await this.databaseService.query("SELECT type, COUNT(*) as count FROM proxies GROUP BY type");
      _0x1cc264.by_type = _0x578b50.data;
      return {
        success: true,
        statistics: _0x1cc264
      };
    } catch (_0x55413a) {
      console.error("Error getting statistics:", _0x55413a);
      return {
        success: false,
        error: _0x55413a.message
      };
    }
  }
  async assignProxyToCampaign(_0x9c3ea3, _0x913100, _0x41f7d7 = null) {
    try {
      await this.databaseService.query("INSERT INTO campaign_proxy_assignments (campaign_id, proxy_id, session_id) VALUES (?, ?, ?)", [_0x9c3ea3, _0x913100, _0x41f7d7]);
      return {
        success: true
      };
    } catch (_0x2e2310) {
      console.error("Error assigning proxy to campaign:", _0x2e2310);
      return {
        success: false,
        error: _0x2e2310.message
      };
    }
  }
  async getProxyForCampaign(_0xb0d35d, _0x12855b = null) {
    try {
      let _0x159515 = "\n        SELECT p.* FROM proxies p\n        INNER JOIN campaign_proxy_assignments cpa ON p.id = cpa.proxy_id\n        WHERE cpa.campaign_id = ? AND p.is_active = 1\n      ";
      const _0x803ff2 = [_0xb0d35d];
      if (_0x12855b) {
        _0x159515 += " AND (cpa.session_id = ? OR cpa.session_id IS NULL)";
        _0x803ff2.push(_0x12855b);
      }
      _0x159515 += " LIMIT 1";
      const _0xdda3e = await this.databaseService.query(_0x159515, _0x803ff2);
      if (_0xdda3e.success && _0xdda3e.data.length > 0) {
        return {
          success: true,
          proxy: _0xdda3e.data[0]
        };
      }
      return {
        success: false,
        error: "No proxy assigned to campaign"
      };
    } catch (_0x401661) {
      console.error("Error getting proxy for campaign:", _0x401661);
      return {
        success: false,
        error: _0x401661.message
      };
    }
  }
  async logProxyUsage(_0x29919d, _0x15dc91, _0x170ff8, _0x2ba691 = 1) {
    try {
      await this.databaseService.query("INSERT INTO proxy_usage_logs (proxy_id, campaign_id, session_id, messages_sent) VALUES (?, ?, ?, ?)", [_0x29919d, _0x15dc91, _0x170ff8, _0x2ba691]);
      return {
        success: true
      };
    } catch (_0x3be8b0) {
      console.error("Error logging proxy usage:", _0x3be8b0);
      return {
        success: false,
        error: _0x3be8b0.message
      };
    }
  }
}
module.exports = ProxyService;