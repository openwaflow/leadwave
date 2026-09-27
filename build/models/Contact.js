const DatabaseService = require("../services/database.service");
class Contact {
  constructor(_0x6a39dd = {}) {
    this.id = _0x6a39dd.id || null;
    this.phoneNumber = _0x6a39dd.phone_number || _0x6a39dd.phoneNumber;
    this.name = _0x6a39dd.name;
    this.email = _0x6a39dd.email;
    this.company = _0x6a39dd.company;
    this.position = _0x6a39dd.position;
    this.notes = _0x6a39dd.notes;
    this.tags = _0x6a39dd.tags;
    this.customFields = _0x6a39dd.custom_fields || _0x6a39dd.customFields;
    this.var1 = _0x6a39dd.var1;
    this.var2 = _0x6a39dd.var2;
    this.var3 = _0x6a39dd.var3;
    this.var4 = _0x6a39dd.var4;
    this.var5 = _0x6a39dd.var5;
    this.var6 = _0x6a39dd.var6;
    this.var7 = _0x6a39dd.var7;
    this.var8 = _0x6a39dd.var8;
    this.var9 = _0x6a39dd.var9;
    this.var10 = _0x6a39dd.var10;
    this.whatsappVerified = _0x6a39dd.whatsapp_verified || _0x6a39dd.whatsappVerified || false;
    this.verificationStatus = _0x6a39dd.verification_status || _0x6a39dd.verificationStatus || "pending";
    this.verificationDate = _0x6a39dd.verification_date || _0x6a39dd.verificationDate;
    this.isActive = _0x6a39dd.is_active !== undefined ? _0x6a39dd.is_active : _0x6a39dd.isActive !== undefined ? _0x6a39dd.isActive : true;
    this.lastMessageAt = _0x6a39dd.last_message_at || _0x6a39dd.lastMessageAt;
    this.createdAt = _0x6a39dd.created_at || _0x6a39dd.createdAt;
    this.updatedAt = _0x6a39dd.updated_at || _0x6a39dd.updatedAt;
  }
  static async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  static async findAll(_0xc8768c = 100, _0x41315b = 0) {
    const _0x21c500 = await this.db.all("\n      SELECT * FROM contacts \n      WHERE is_active = 1 \n      ORDER BY created_at DESC \n      LIMIT ? OFFSET ?\n    ", [_0xc8768c, _0x41315b]);
    return _0x21c500.map(_0x2bc974 => new Contact(_0x2bc974));
  }
  static async findById(_0x282974) {
    const _0x436740 = await this.db.get("SELECT * FROM contacts WHERE id = ?", [_0x282974]);
    if (_0x436740) {
      return new Contact(_0x436740);
    } else {
      return null;
    }
  }
  static async findByPhone(_0x1c32e5) {
    const _0x3f518d = await this.db.get("SELECT * FROM contacts WHERE phone_number = ?", [_0x1c32e5]);
    if (_0x3f518d) {
      return new Contact(_0x3f518d);
    } else {
      return null;
    }
  }
  static async search(_0x4b9c85, _0x15c197 = 50) {
    const _0x322ca1 = await this.db.all("\n      SELECT * FROM contacts \n      WHERE (name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR company LIKE ?) \n        AND is_active = 1\n      ORDER BY name ASC\n      LIMIT ?\n    ", ["%" + _0x4b9c85 + "%", "%" + _0x4b9c85 + "%", "%" + _0x4b9c85 + "%", "%" + _0x4b9c85 + "%", _0x15c197]);
    return _0x322ca1.map(_0x3631c1 => new Contact(_0x3631c1));
  }
  static async findByTag(_0x47b81e) {
    const _0x5e6406 = await this.db.all("\n      SELECT * FROM contacts \n      WHERE tags LIKE ? AND is_active = 1\n      ORDER BY name ASC\n    ", ["%\"" + _0x47b81e + "\"%"]);
    return _0x5e6406.map(_0x2fc1d4 => new Contact(_0x2fc1d4));
  }
  static async findByGroup(_0x24054e) {
    const _0x2f1334 = await this.db.all("\n      SELECT c.* FROM contacts c\n      JOIN contact_group_members cgm ON c.id = cgm.contact_id\n      WHERE cgm.group_id = ? AND c.is_active = 1\n      ORDER BY c.name ASC\n    ", [_0x24054e]);
    return _0x2f1334.map(_0x73da79 => new Contact(_0x73da79));
  }
  async save() {
    const _0x33b47e = new Date().toISOString();
    if (this.id) {
      const _0x288544 = await Contact.db.run("\n        UPDATE contacts\n        SET phone_number = ?, name = ?, email = ?, company = ?, position = ?,\n            notes = ?, tags = ?, custom_fields = ?,\n            var1 = ?, var2 = ?, var3 = ?, var4 = ?, var5 = ?,\n            var6 = ?, var7 = ?, var8 = ?, var9 = ?, var10 = ?,\n            whatsapp_verified = ?, verification_status = ?, verification_date = ?,\n            is_active = ?, last_message_at = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.phoneNumber, this.name, this.email, this.company, this.position, this.notes, this.tags, this.customFields, this.var1, this.var2, this.var3, this.var4, this.var5, this.var6, this.var7, this.var8, this.var9, this.var10, this.whatsappVerified, this.verificationStatus, this.verificationDate, this.isActive, this.lastMessageAt, _0x33b47e, this.id]);
      this.updatedAt = _0x33b47e;
      return _0x288544;
    } else {
      const _0x47ff0d = await Contact.db.run("\n        INSERT INTO contacts\n        (phone_number, name, email, company, position, notes, tags, custom_fields,\n         var1, var2, var3, var4, var5, var6, var7, var8, var9, var10,\n         whatsapp_verified, verification_status, verification_date,\n         is_active, last_message_at, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [this.phoneNumber, this.name, this.email, this.company, this.position, this.notes, this.tags, this.customFields, this.var1, this.var2, this.var3, this.var4, this.var5, this.var6, this.var7, this.var8, this.var9, this.var10, this.whatsappVerified, this.verificationStatus, this.verificationDate, this.isActive, this.lastMessageAt, _0x33b47e, _0x33b47e]);
      this.id = _0x47ff0d.lastID;
      this.createdAt = _0x33b47e;
      this.updatedAt = _0x33b47e;
      return _0x47ff0d;
    }
  }
  async delete() {
    if (this.id) {
      await Contact.db.run("UPDATE contacts SET is_active = 0 WHERE id = ?", [this.id]);
      this.isActive = false;
    }
  }
  getTagsArray() {
    if (!this.tags) {
      return [];
    }
    try {
      if (typeof this.tags === "string") {
        return JSON.parse(this.tags);
      } else {
        return this.tags;
      }
    } catch (_0x1c4807) {
      console.error("Error parsing tags:", _0x1c4807);
      return [];
    }
  }
  setTags(_0x2c71c0) {
    this.tags = typeof _0x2c71c0 === "object" ? JSON.stringify(_0x2c71c0) : _0x2c71c0;
  }
  addTag(_0x2c7186) {
    const _0x10c12f = this.getTagsArray();
    if (!_0x10c12f.includes(_0x2c7186)) {
      _0x10c12f.push(_0x2c7186);
      this.setTags(_0x10c12f);
    }
  }
  removeTag(_0x410e0f) {
    const _0x57bf4b = this.getTagsArray();
    const _0x126f86 = _0x57bf4b.filter(_0x4a7522 => _0x4a7522 !== _0x410e0f);
    this.setTags(_0x126f86);
  }
  getCustomFieldsObject() {
    if (!this.customFields) {
      return {};
    }
    try {
      if (typeof this.customFields === "string") {
        return JSON.parse(this.customFields);
      } else {
        return this.customFields;
      }
    } catch (_0x69e319) {
      console.error("Error parsing custom fields:", _0x69e319);
      return {};
    }
  }
  setCustomFields(_0x3e5e67) {
    this.customFields = typeof _0x3e5e67 === "object" ? JSON.stringify(_0x3e5e67) : _0x3e5e67;
  }
  updateCustomField(_0x29aa38, _0x5e7b22) {
    const _0x4424b1 = this.getCustomFieldsObject();
    _0x4424b1[_0x29aa38] = _0x5e7b22;
    this.setCustomFields(_0x4424b1);
  }
  async updateLastMessage() {
    this.lastMessageAt = new Date().toISOString();
    if (this.id) {
      await Contact.db.run("UPDATE contacts SET last_message_at = ? WHERE id = ?", [this.lastMessageAt, this.id]);
    }
  }
  async updateVerificationStatus(_0x5d36a8, _0x1c1614 = false) {
    this.verificationStatus = _0x5d36a8;
    this.whatsappVerified = _0x1c1614;
    this.verificationDate = new Date().toISOString();
    if (this.id) {
      await Contact.db.run("\n        UPDATE contacts\n        SET verification_status = ?, whatsapp_verified = ?, verification_date = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.verificationStatus, this.whatsappVerified, this.verificationDate, this.verificationDate, this.id]);
    }
  }
  static async findUnverified() {
    const _0x2f034a = await this.db.all("\n      SELECT * FROM contacts\n      WHERE (whatsapp_verified = 0 OR whatsapp_verified IS NULL) AND is_active = 1\n      ORDER BY created_at ASC\n    ");
    return _0x2f034a.map(_0x401984 => new Contact(_0x401984));
  }
  static async findNonWhatsApp() {
    const _0x5ac8a8 = await this.db.all("\n      SELECT * FROM contacts\n      WHERE whatsapp_verified = 0 AND is_active = 1\n      ORDER BY name ASC\n    ");
    return _0x5ac8a8.map(_0x453707 => new Contact(_0x453707));
  }
  static async deleteNonWhatsApp() {
    const _0x92f23 = await this.db.run("\n      UPDATE contacts\n      SET is_active = 0\n      WHERE whatsapp_verified = 0\n    ");
    return _0x92f23.changes;
  }
  static async deleteOrphanedContacts() {
    const _0x25a933 = await this.db.run("\n      UPDATE contacts\n      SET is_active = 0\n      WHERE id NOT IN (\n        SELECT DISTINCT cgm.contact_id\n        FROM contact_group_members cgm\n        INNER JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE cg.is_active = 1\n      ) AND is_active = 1\n    ");
    return _0x25a933.changes;
  }
  static async findOrphanedContacts() {
    const _0x17ba32 = await this.db.all("\n      SELECT * FROM contacts\n      WHERE id NOT IN (\n        SELECT DISTINCT cgm.contact_id\n        FROM contact_group_members cgm\n        INNER JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE cg.is_active = 1\n      ) AND is_active = 1\n      ORDER BY name ASC\n    ");
    return _0x17ba32.map(_0x5cbfed => new Contact(_0x5cbfed));
  }
  async addToGroup(_0x1e0adc) {
    if (this.id && _0x1e0adc) {
      try {
        await Contact.db.run("\n          INSERT OR IGNORE INTO contact_group_members (group_id, contact_id)\n          VALUES (?, ?)\n        ", [_0x1e0adc, this.id]);
        return true;
      } catch (_0x12eb29) {
        console.error("Error adding contact to group:", _0x12eb29);
        return false;
      }
    }
    return false;
  }
  async removeFromGroup(_0x1faee6) {
    if (this.id && _0x1faee6) {
      await Contact.db.run("\n        DELETE FROM contact_group_members \n        WHERE group_id = ? AND contact_id = ?\n      ", [_0x1faee6, this.id]);
    }
  }
  async getGroups() {
    if (!this.id) {
      return [];
    }
    const _0x55e67e = await Contact.db.all("\n      SELECT cg.* FROM contact_groups cg\n      JOIN contact_group_members cgm ON cg.id = cgm.group_id\n      WHERE cgm.contact_id = ? AND cg.is_active = 1\n    ", [this.id]);
    return _0x55e67e;
  }
  toJSON() {
    return {
      id: this.id,
      phoneNumber: this.phoneNumber,
      name: this.name,
      email: this.email,
      company: this.company,
      position: this.position,
      notes: this.notes,
      tags: this.getTagsArray(),
      customFields: this.getCustomFieldsObject(),
      var1: this.var1,
      var2: this.var2,
      var3: this.var3,
      var4: this.var4,
      var5: this.var5,
      var6: this.var6,
      var7: this.var7,
      var8: this.var8,
      var9: this.var9,
      var10: this.var10,
      whatsappVerified: this.whatsappVerified,
      verificationStatus: this.verificationStatus,
      verificationDate: this.verificationDate,
      isActive: this.isActive,
      lastMessageAt: this.lastMessageAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  static async importFromCSV(_0x554e26, _0x7362bf = {}) {
    const _0x5bd4e4 = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };
    for (const _0x1aacc5 of _0x554e26) {
      try {
        const _0x3a38d0 = _0x1aacc5.phone || _0x1aacc5.phoneNumber || _0x1aacc5.phone_number;
        if (!_0x3a38d0) {
          _0x5bd4e4.skipped++;
          continue;
        }
        const _0x4fe134 = await Contact.findByPhone(_0x3a38d0);
        if (_0x4fe134 && !_0x7362bf.updateExisting) {
          _0x5bd4e4.skipped++;
          continue;
        }
        const _0x42a980 = _0x4fe134 || new Contact();
        _0x42a980.phoneNumber = _0x3a38d0;
        _0x42a980.name = _0x1aacc5.name || _0x42a980.name;
        _0x42a980.email = _0x1aacc5.email || _0x42a980.email;
        _0x42a980.company = _0x1aacc5.company || _0x42a980.company;
        _0x42a980.position = _0x1aacc5.position || _0x42a980.position;
        _0x42a980.notes = _0x1aacc5.notes || _0x42a980.notes;
        if (_0x1aacc5.tags) {
          const _0x336e3f = typeof _0x1aacc5.tags === "string" ? _0x1aacc5.tags.split(",").map(_0x1b471f => _0x1b471f.trim()) : _0x1aacc5.tags;
          _0x42a980.setTags(_0x336e3f);
        }
        await _0x42a980.save();
        if (_0x4fe134) {
          _0x5bd4e4.updated++;
        } else {
          _0x5bd4e4.imported++;
        }
      } catch (_0x207685) {
        _0x5bd4e4.errors.push("Error processing " + (_0x1aacc5.phone || "unknown") + ": " + _0x207685.message);
      }
    }
    return _0x5bd4e4;
  }
  static async getStats() {
    try {
      const _0x1ccf97 = await Contact.db.query("\n        SELECT COUNT(DISTINCT c.id) as count\n        FROM contacts c\n        INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id\n        INNER JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE c.is_active = 1 AND cg.is_active = 1\n      ");
      const _0x24ad00 = await Contact.db.query("\n        SELECT c.tags FROM contacts c\n        INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id\n        INNER JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE c.tags IS NOT NULL AND c.tags != '' AND c.is_active = 1 AND cg.is_active = 1\n      ");
      const _0x4cc5ee = {};
      const _0x2df73c = _0x24ad00.success && Array.isArray(_0x24ad00.data) ? _0x24ad00.data : [];
      _0x2df73c.forEach(_0x4c9040 => {
        try {
          const _0x13331d = JSON.parse(_0x4c9040.tags);
          if (Array.isArray(_0x13331d)) {
            _0x13331d.forEach(_0x358d7e => {
              _0x4cc5ee[_0x358d7e] = (_0x4cc5ee[_0x358d7e] || 0) + 1;
            });
          }
        } catch (_0x2e0ba8) {}
      });
      const _0x4e1fbd = await Contact.db.query("\n        SELECT COUNT(DISTINCT c.id) as count FROM contacts c\n        INNER JOIN contact_group_members cgm ON c.id = cgm.contact_id\n        INNER JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE c.last_message_at > datetime('now', '-7 days') AND c.is_active = 1 AND cg.is_active = 1\n      ");
      const _0x35dd17 = _0x1ccf97.success && _0x1ccf97.data && _0x1ccf97.data.length > 0 ? _0x1ccf97.data[0].count : 0;
      const _0x2e5f1c = _0x4e1fbd.success && _0x4e1fbd.data && _0x4e1fbd.data.length > 0 ? _0x4e1fbd.data[0].count : 0;
      return {
        total: _0x35dd17,
        tagCounts: _0x4cc5ee,
        recentActivity: _0x2e5f1c
      };
    } catch (_0x1f142d) {
      console.error("Error getting contact stats:", _0x1f142d);
      return {
        total: 0,
        tagCounts: {},
        recentActivity: 0
      };
    }
  }
  static async getAllTags() {
    const _0x4d2719 = await Contact.db.all("\n      SELECT DISTINCT tags FROM contacts \n      WHERE tags IS NOT NULL AND tags != '' AND is_active = 1\n    ");
    const _0x5a1f88 = new Set();
    _0x4d2719.forEach(_0x5971bf => {
      try {
        const _0x5552d9 = JSON.parse(_0x5971bf.tags);
        _0x5552d9.forEach(_0x28dd66 => _0x5a1f88.add(_0x28dd66));
      } catch (_0x9c96af) {}
    });
    return Array.from(_0x5a1f88).sort();
  }
}
module.exports = Contact;