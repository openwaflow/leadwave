const DatabaseService = require("../services/database.service");
class WhatsAppSession {
  constructor(_0x3ad2b3 = {}) {
    this.id = _0x3ad2b3.id || null;
    this.sessionId = _0x3ad2b3.session_id || _0x3ad2b3.sessionId;
    this.name = _0x3ad2b3.name;
    this.deviceName = _0x3ad2b3.device_name || _0x3ad2b3.deviceName || _0x3ad2b3.name;
    this.phoneNumber = _0x3ad2b3.phone_number || _0x3ad2b3.phoneNumber;
    this.status = _0x3ad2b3.status || "disconnected";
    this.qrCode = _0x3ad2b3.qr_code || _0x3ad2b3.qrCode;
    this.lastConnected = _0x3ad2b3.last_connected || _0x3ad2b3.lastConnected;
    this.isActive = _0x3ad2b3.is_active !== undefined ? _0x3ad2b3.is_active : _0x3ad2b3.isActive !== undefined ? _0x3ad2b3.isActive : true;
    this.sessionData = _0x3ad2b3.session_data || _0x3ad2b3.sessionData;
    this.createdAt = _0x3ad2b3.created_at || _0x3ad2b3.createdAt;
    this.updatedAt = _0x3ad2b3.updated_at || _0x3ad2b3.updatedAt;
  }
  static async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  static async findAll() {
    const _0x397c9b = await this.db.query("SELECT * FROM whatsapp_sessions WHERE is_active = 1 ORDER BY created_at DESC");
    const _0x4d21f3 = _0x397c9b.success ? _0x397c9b.data : [];
    return _0x4d21f3.map(_0x429e58 => new WhatsAppSession(_0x429e58));
  }
  static async findById(_0x1c22e9) {
    const _0x170820 = await this.db.query("SELECT * FROM whatsapp_sessions WHERE id = ?", [_0x1c22e9]);
    const _0x1cf94d = _0x170820.success && _0x170820.data.length > 0 ? _0x170820.data[0] : null;
    if (_0x1cf94d) {
      return new WhatsAppSession(_0x1cf94d);
    } else {
      return null;
    }
  }
  static async findBySessionId(_0x343d18) {
    const _0x4dac7b = await this.db.get("SELECT * FROM whatsapp_sessions WHERE session_id = ?", [_0x343d18]);
    if (_0x4dac7b) {
      return new WhatsAppSession(_0x4dac7b);
    } else {
      return null;
    }
  }
  static async findConnected() {
    const _0x513002 = await this.db.all("SELECT * FROM whatsapp_sessions WHERE status = ? AND is_active = 1", ["connected"]);
    return _0x513002.map(_0x4426e1 => new WhatsAppSession(_0x4426e1));
  }
  async save() {
    const _0xeb19cd = new Date().toISOString();
    if (this.id) {
      const _0x5c75a5 = await WhatsAppSession.db.run("\n        UPDATE whatsapp_sessions \n        SET session_id = ?, name = ?, device_name = ?, phone_number = ?, status = ?, qr_code = ?, \n            last_connected = ?, is_active = ?, session_data = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.sessionId, this.name, this.deviceName, this.phoneNumber, this.status, this.qrCode, this.lastConnected, this.isActive, this.sessionData, _0xeb19cd, this.id]);
      this.updatedAt = _0xeb19cd;
      return _0x5c75a5;
    } else {
      const _0x81fa09 = await WhatsAppSession.db.run("\n        INSERT INTO whatsapp_sessions \n        (session_id, name, device_name, phone_number, status, qr_code, last_connected, is_active, session_data, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [this.sessionId, this.name, this.deviceName, this.phoneNumber, this.status, this.qrCode, this.lastConnected, this.isActive, this.sessionData, _0xeb19cd, _0xeb19cd]);
      this.id = _0x81fa09.id;
      this.createdAt = _0xeb19cd;
      this.updatedAt = _0xeb19cd;
      return _0x81fa09;
    }
  }
  async delete() {
    if (this.id) {
      await WhatsAppSession.db.run("UPDATE whatsapp_sessions SET is_active = 0 WHERE id = ?", [this.id]);
      this.isActive = false;
    }
  }
  async updateStatus(_0x4da030, _0x418485 = null) {
    this.status = _0x4da030;
    if (_0x418485 !== null) {
      this.qrCode = _0x418485;
    }
    if (_0x4da030 === "connected") {
      this.lastConnected = new Date().toISOString();
    }
    return await this.save();
  }
  async updateSessionData(_0x505111) {
    this.sessionData = typeof _0x505111 === "object" ? JSON.stringify(_0x505111) : _0x505111;
    return await this.save();
  }
  getSessionDataObject() {
    if (!this.sessionData) {
      return null;
    }
    try {
      if (typeof this.sessionData === "string") {
        return JSON.parse(this.sessionData);
      } else {
        return this.sessionData;
      }
    } catch (_0x3f0f67) {
      console.error("Error parsing session data:", _0x3f0f67);
      return null;
    }
  }
  toJSON() {
    return {
      id: this.id,
      sessionId: this.sessionId,
      name: this.name,
      deviceName: this.deviceName,
      phoneNumber: this.phoneNumber,
      status: this.status,
      qrCode: this.qrCode,
      lastConnected: this.lastConnected,
      isActive: this.isActive,
      sessionData: this.getSessionDataObject(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  static async create(_0x3d7422) {
    const _0x108e6f = new WhatsAppSession(_0x3d7422);
    await _0x108e6f.save();
    return _0x108e6f;
  }
  static async getStats() {
    const _0x2339f1 = await WhatsAppSession.db.query("\n      SELECT\n        status,\n        COUNT(*) as count\n      FROM whatsapp_sessions\n      WHERE is_active = 1\n      GROUP BY status\n    ");
    const _0x932b14 = _0x2339f1.success ? _0x2339f1.data : [];
    const _0x551692 = {
      total: 0,
      connected: 0,
      connecting: 0,
      disconnected: 0
    };
    _0x932b14.forEach(_0x49ec1d => {
      _0x551692[_0x49ec1d.status] = _0x49ec1d.count;
      _0x551692.total += _0x49ec1d.count;
    });
    return _0x551692;
  }
}
module.exports = WhatsAppSession;