const DatabaseService = require("../services/database.service");
class ContactGroup {
  constructor(_0x2caa7b = {}) {
    this.id = _0x2caa7b.id || null;
    this.name = _0x2caa7b.name;
    this.description = _0x2caa7b.description;
    this.color = _0x2caa7b.color || "#3b82f6";
    this.isActive = _0x2caa7b.is_active !== undefined ? _0x2caa7b.is_active : _0x2caa7b.isActive !== undefined ? _0x2caa7b.isActive : true;
    this.createdAt = _0x2caa7b.created_at || _0x2caa7b.createdAt;
    this.updatedAt = _0x2caa7b.updated_at || _0x2caa7b.updatedAt;
    this.contactCount = _0x2caa7b.contact_count || 0;
  }
  static async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  static async findAll() {
    const _0x4e8494 = await this.db.all("\n      SELECT cg.*, COUNT(cgm.contact_id) as contact_count\n      FROM contact_groups cg\n      LEFT JOIN contact_group_members cgm ON cg.id = cgm.group_id\n      WHERE cg.is_active = 1\n      GROUP BY cg.id\n      ORDER BY cg.name ASC\n    ");
    return _0x4e8494.map(_0x399904 => new ContactGroup(_0x399904));
  }
  static async findById(_0x13b425) {
    const _0x429f21 = await this.db.get("\n      SELECT cg.*, COUNT(cgm.contact_id) as contact_count\n      FROM contact_groups cg\n      LEFT JOIN contact_group_members cgm ON cg.id = cgm.group_id\n      WHERE cg.id = ? AND cg.is_active = 1\n      GROUP BY cg.id\n    ", [_0x13b425]);
    if (_0x429f21) {
      return new ContactGroup(_0x429f21);
    } else {
      return null;
    }
  }
  static async findByName(_0x52ed29) {
    const _0x18e4a8 = await this.db.get("SELECT * FROM contact_groups WHERE name = ? AND is_active = 1", [_0x52ed29]);
    if (_0x18e4a8) {
      return new ContactGroup(_0x18e4a8);
    } else {
      return null;
    }
  }
  async save() {
    const _0x57a222 = new Date().toISOString();
    if (this.id) {
      const _0x5ad4e9 = await ContactGroup.db.run("\n        UPDATE contact_groups \n        SET name = ?, description = ?, color = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.name, this.description, this.color, _0x57a222, this.id]);
      this.updatedAt = _0x57a222;
      return _0x5ad4e9;
    } else {
      const _0x31c6b9 = await ContactGroup.db.run("\n        INSERT INTO contact_groups (name, description, color, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?)\n      ", [this.name, this.description, this.color, _0x57a222, _0x57a222]);
      this.id = _0x31c6b9.lastID;
      this.createdAt = _0x57a222;
      this.updatedAt = _0x57a222;
      return _0x31c6b9;
    }
  }
  async delete() {
    if (this.id) {
      await ContactGroup.db.run("DELETE FROM contact_group_members WHERE group_id = ?", [this.id]);
      await ContactGroup.db.run("UPDATE contact_groups SET is_active = 0 WHERE id = ?", [this.id]);
      this.isActive = false;
    }
  }
  async addContact(_0x83ba3d) {
    if (this.id && _0x83ba3d) {
      try {
        await ContactGroup.db.run("\n          INSERT OR IGNORE INTO contact_group_members (group_id, contact_id)\n          VALUES (?, ?)\n        ", [this.id, _0x83ba3d]);
        return true;
      } catch (_0xce2d1) {
        console.error("Error adding contact to group:", _0xce2d1);
        return false;
      }
    }
    return false;
  }
  async removeContact(_0x2d96cd) {
    if (this.id && _0x2d96cd) {
      await ContactGroup.db.run("\n        DELETE FROM contact_group_members \n        WHERE group_id = ? AND contact_id = ?\n      ", [this.id, _0x2d96cd]);
    }
  }
  async addContacts(_0x870cf2) {
    if (!this.id || !Array.isArray(_0x870cf2) || _0x870cf2.length === 0) {
      return false;
    }
    try {
      const _0x38c97c = _0x870cf2.map(() => "(?, ?)").join(", ");
      const _0x461a8c = _0x870cf2.flatMap(_0x55f1bb => [this.id, _0x55f1bb]);
      await ContactGroup.db.run("\n        INSERT OR IGNORE INTO contact_group_members (group_id, contact_id)\n        VALUES " + _0x38c97c + "\n      ", _0x461a8c);
      return true;
    } catch (_0x36f96c) {
      console.error("Error adding contacts to group:", _0x36f96c);
      return false;
    }
  }
  async getContacts() {
    if (!this.id) {
      return [];
    }
    const _0x25bdd8 = await ContactGroup.db.all("\n      SELECT c.* FROM contacts c\n      JOIN contact_group_members cgm ON c.id = cgm.contact_id\n      WHERE cgm.group_id = ? AND c.is_active = 1\n      ORDER BY c.name ASC\n    ", [this.id]);
    return _0x25bdd8;
  }
  async getContactCount() {
    if (!this.id) {
      return 0;
    }
    const _0x39a994 = await ContactGroup.db.get("\n      SELECT COUNT(*) as count FROM contact_group_members cgm\n      JOIN contacts c ON cgm.contact_id = c.id\n      WHERE cgm.group_id = ? AND c.is_active = 1\n    ", [this.id]);
    return _0x39a994.count;
  }
  async getVerifiedContactCount() {
    if (!this.id) {
      return 0;
    }
    const _0x5486ed = await ContactGroup.db.get("\n      SELECT COUNT(*) as count FROM contact_group_members cgm\n      JOIN contacts c ON cgm.contact_id = c.id\n      WHERE cgm.group_id = ? AND c.is_active = 1 AND c.whatsapp_verified = 1\n    ", [this.id]);
    return _0x5486ed.count;
  }
  async removeNonWhatsAppContacts() {
    if (!this.id) {
      return 0;
    }
    const _0x23e09d = await ContactGroup.db.run("\n      DELETE FROM contact_group_members\n      WHERE group_id = ? AND contact_id IN (\n        SELECT id FROM contacts\n        WHERE whatsapp_verified = 0\n      )\n    ", [this.id]);
    return _0x23e09d.changes;
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      color: this.color,
      isActive: this.isActive,
      contactCount: this.contactCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  static async getStats() {
    try {
      const _0xf23f6b = await ContactGroup.db.query("SELECT COUNT(*) as count FROM contact_groups WHERE is_active = 1");
      const _0x51dd9f = await ContactGroup.db.query("\n        SELECT COUNT(DISTINCT cgm.contact_id) as count\n        FROM contact_group_members cgm\n        JOIN contact_groups cg ON cgm.group_id = cg.id\n        WHERE cg.is_active = 1\n      ");
      const _0xdd634a = _0xf23f6b.success && _0xf23f6b.data && _0xf23f6b.data.length > 0 ? _0xf23f6b.data[0].count : 0;
      const _0x245af5 = _0x51dd9f.success && _0x51dd9f.data && _0x51dd9f.data.length > 0 ? _0x51dd9f.data[0].count : 0;
      return {
        totalGroups: _0xdd634a,
        totalGroupedContacts: _0x245af5
      };
    } catch (_0x5ed940) {
      console.error("Error getting contact group stats:", _0x5ed940);
      return {
        totalGroups: 0,
        totalGroupedContacts: 0
      };
    }
  }
}
module.exports = ContactGroup;