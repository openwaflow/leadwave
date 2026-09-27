const DatabaseService = require("./database.service");
class DatabaseWrapper {
  constructor() {
    this.db = null;
  }
  async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  async select(_0x3b4599, _0x42e67b = []) {
    try {
      const _0x42fea6 = await this.db.query(_0x3b4599, _0x42e67b);
      if (_0x42fea6.success && Array.isArray(_0x42fea6.data)) {
        return _0x42fea6.data;
      }
      return [];
    } catch (_0x3031c8) {
      console.error("Database select error:", _0x3031c8);
      return [];
    }
  }
  async selectOne(_0x4b6f12, _0x3d5616 = []) {
    try {
      const _0x57c0dc = await this.db.query(_0x4b6f12, _0x3d5616);
      if (_0x57c0dc.success && Array.isArray(_0x57c0dc.data) && _0x57c0dc.data.length > 0) {
        return _0x57c0dc.data[0];
      }
      return null;
    } catch (_0x2cd8c3) {
      console.error("Database selectOne error:", _0x2cd8c3);
      return null;
    }
  }
  async execute(_0x3edfbd, _0x46b558 = []) {
    try {
      const _0x14b08c = await this.db.query(_0x3edfbd, _0x46b558);
      return {
        success: _0x14b08c.success || false,
        lastID: _0x14b08c.lastID || null,
        changes: _0x14b08c.changes || 0,
        error: _0x14b08c.error || null
      };
    } catch (_0x274f59) {
      console.error("Database execute error:", _0x274f59);
      return {
        success: false,
        lastID: null,
        changes: 0,
        error: _0x274f59.message
      };
    }
  }
  async raw(_0x4d89e7, _0x10fb9d = []) {
    try {
      return await this.db.query(_0x4d89e7, _0x10fb9d);
    } catch (_0x197f09) {
      console.error("Database raw error:", _0x197f09);
      return {
        success: false,
        error: _0x197f09.message,
        data: _0x4d89e7.trim().toUpperCase().startsWith("SELECT") ? [] : null
      };
    }
  }
}
let instance = null;
const getDatabaseWrapper = async () => {
  if (!instance) {
    instance = new DatabaseWrapper();
    await instance.initialize();
  }
  return instance;
};
module.exports = {
  DatabaseWrapper: DatabaseWrapper,
  getDatabaseWrapper: getDatabaseWrapper
};