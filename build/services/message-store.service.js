class MessageStore {
  constructor({
    databaseService: _0x58a4ad,
    logger: _0x55f9a1
  } = {}) {
    this.db = _0x58a4ad;
    this.logger = _0x55f9a1 || console;
  }
  async persist(_0x4a407a, _0x547d71, _0x42dad7) {
    const _0x1114c8 = _0x547d71 && _0x547d71.remoteJid;
    const _0x438a0a = _0x547d71 && _0x547d71.id;
    if (!_0x4a407a || !_0x1114c8 || !_0x438a0a) {
      throw new Error("MessageStore.persist requires a sessionId and a message key with remoteJid and id");
    }
    const _0x4e5d18 = JSON.stringify(_0x42dad7 === undefined ? null : _0x42dad7);
    const _0x4d14b2 = await this.db.run("INSERT OR REPLACE INTO message_retry_store\n        (session_id, remote_jid, message_id, message_content, sent_at)\n       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", [_0x4a407a, _0x1114c8, _0x438a0a, _0x4e5d18]);
    if (_0x4d14b2 && _0x4d14b2.success === false) {
      throw new Error("MessageStore.persist failed: " + _0x4d14b2.error);
    }
  }
  async load(_0x5f4c58, _0x4f5e7e, _0x3fb0f8) {
    if (!this.db || typeof this.db.get !== "function") {
      throw new Error("MessageStore.load failed: database service is unavailable");
    }
    const _0x3244e3 = await this.db.get("SELECT message_content FROM message_retry_store\n       WHERE session_id = ? AND remote_jid = ? AND message_id = ?\n       LIMIT 1", [_0x5f4c58, _0x4f5e7e, _0x3fb0f8]);
    if (!_0x3244e3 || _0x3244e3.message_content == null) {
      return null;
    }
    try {
      return JSON.parse(_0x3244e3.message_content);
    } catch (_0x5eebbf) {
      this.logger.error("MessageStore.load: failed to parse stored message content for " + _0x5f4c58 + "/" + _0x4f5e7e + "/" + _0x3fb0f8 + ": " + _0x5eebbf.message);
      return null;
    }
  }
  async pruneExpired(_0x450fcd = 7) {
    const _0x41d8fc = Number.isFinite(_0x450fcd) ? Math.max(0, Math.floor(_0x450fcd)) : 7;
    const _0x33e047 = "-" + _0x41d8fc + " days";
    const _0x13bd69 = await this.db.run("DELETE FROM message_retry_store WHERE sent_at < datetime('now', ?)", [_0x33e047]);
    if (_0x13bd69 && _0x13bd69.success === false) {
      throw new Error("MessageStore.pruneExpired failed: " + _0x13bd69.error);
    }
    return _0x13bd69 && _0x13bd69.changes || 0;
  }
}
module.exports = MessageStore;