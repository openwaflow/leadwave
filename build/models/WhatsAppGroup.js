const DatabaseService = require("../services/database.service");
class WhatsAppGroup {
  constructor(_0x33d896 = {}) {
    this.id = _0x33d896.id || null;
    this.groupId = _0x33d896.group_id || _0x33d896.groupId;
    this.sessionId = _0x33d896.session_id || _0x33d896.sessionId;
    this.name = _0x33d896.name || _0x33d896.subject;
    this.description = _0x33d896.description || _0x33d896.desc;
    this.participants = _0x33d896.participants ? typeof _0x33d896.participants === "string" ? JSON.parse(_0x33d896.participants) : _0x33d896.participants : [];
    this.admins = _0x33d896.admins ? typeof _0x33d896.admins === "string" ? JSON.parse(_0x33d896.admins) : _0x33d896.admins : [];
    this.isOwner = _0x33d896.is_owner !== undefined ? _0x33d896.is_owner : _0x33d896.isOwner !== undefined ? _0x33d896.isOwner : false;
    this.isAdmin = _0x33d896.is_admin !== undefined ? _0x33d896.is_admin : _0x33d896.isAdmin !== undefined ? _0x33d896.isAdmin : false;
    this.inviteCode = _0x33d896.invite_code || _0x33d896.inviteCode;
    this.inviteLink = _0x33d896.invite_link || _0x33d896.inviteLink;
    this.profilePicture = _0x33d896.profile_picture || _0x33d896.profilePicture;
    this.creation = _0x33d896.creation;
    this.participantCount = _0x33d896.participant_count || _0x33d896.participantCount || (this.participants ? this.participants.length : 0);
    this.settings = _0x33d896.settings ? typeof _0x33d896.settings === "string" ? JSON.parse(_0x33d896.settings) : _0x33d896.settings : {};
    this.lastSync = _0x33d896.last_sync || _0x33d896.lastSync;
    this.isActive = _0x33d896.is_active !== undefined ? _0x33d896.is_active : _0x33d896.isActive !== undefined ? _0x33d896.isActive : true;
    this.createdAt = _0x33d896.created_at || _0x33d896.createdAt;
    this.updatedAt = _0x33d896.updated_at || _0x33d896.updatedAt;
  }
  static async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  static async findAll(_0x5bbc9c = null) {
    let _0x277366 = "SELECT * FROM whatsapp_groups WHERE is_active = 1";
    let _0x146ba6 = [];
    if (_0x5bbc9c) {
      _0x277366 += " AND session_id = ?";
      _0x146ba6.push(_0x5bbc9c);
    }
    _0x277366 += " ORDER BY name ASC";
    const _0x2c1d2a = await this.db.all(_0x277366, _0x146ba6);
    return _0x2c1d2a.map(_0x3194fc => new WhatsAppGroup(_0x3194fc));
  }
  static async findById(_0x39b6ab) {
    const _0x58302b = await this.db.get("SELECT * FROM whatsapp_groups WHERE id = ?", [_0x39b6ab]);
    if (_0x58302b) {
      return new WhatsAppGroup(_0x58302b);
    } else {
      return null;
    }
  }
  static async findByGroupId(_0x3a35c6, _0x1d79a0 = null) {
    let _0x5af50b = "SELECT * FROM whatsapp_groups WHERE group_id = ?";
    let _0x48a558 = [_0x3a35c6];
    if (_0x1d79a0) {
      _0x5af50b += " AND session_id = ?";
      _0x48a558.push(_0x1d79a0);
    }
    const _0x5e32ad = await this.db.get(_0x5af50b, _0x48a558);
    if (_0x5e32ad) {
      return new WhatsAppGroup(_0x5e32ad);
    } else {
      return null;
    }
  }
  static async findBySession(_0x3b0488) {
    const _0x272a87 = await this.db.all("SELECT * FROM whatsapp_groups WHERE session_id = ? AND is_active = 1 ORDER BY name ASC", [_0x3b0488]);
    return _0x272a87.map(_0x52fcd5 => new WhatsAppGroup(_0x52fcd5));
  }
  static async findAdminGroups(_0xc07890) {
    const _0x1ebcce = await this.db.all("SELECT * FROM whatsapp_groups WHERE session_id = ? AND is_admin = 1 AND is_active = 1 ORDER BY name ASC", [_0xc07890]);
    return _0x1ebcce.map(_0x28fd6c => new WhatsAppGroup(_0x28fd6c));
  }
  async save() {
    const _0x1daec0 = new Date().toISOString();
    const _0x4cfb6d = JSON.stringify(this.participants || []);
    const _0x2f45d1 = JSON.stringify(this.admins || []);
    const _0x5b6124 = JSON.stringify(this.settings || {});
    if (this.id) {
      const _0x517c82 = await WhatsAppGroup.db.run("\n        UPDATE whatsapp_groups\n        SET group_id = ?, session_id = ?, name = ?, description = ?, participants = ?, admins = ?,\n            is_owner = ?, is_admin = ?, invite_code = ?, invite_link = ?, profile_picture = ?,\n            creation = ?, participant_count = ?, settings = ?, last_sync = ?, is_active = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.groupId, this.sessionId, this.name, this.description, _0x4cfb6d, _0x2f45d1, this.isOwner, this.isAdmin, this.inviteCode, this.inviteLink, this.profilePicture, this.creation, this.participantCount, _0x5b6124, this.lastSync, this.isActive, _0x1daec0, this.id]);
      this.updatedAt = _0x1daec0;
      return _0x517c82;
    } else {
      const _0x524dcb = await WhatsAppGroup.db.run("\n        INSERT INTO whatsapp_groups\n        (group_id, session_id, name, description, participants, admins, is_owner, is_admin,\n         invite_code, invite_link, profile_picture, creation, participant_count, settings,\n         last_sync, is_active, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [this.groupId, this.sessionId, this.name, this.description, _0x4cfb6d, _0x2f45d1, this.isOwner, this.isAdmin, this.inviteCode, this.inviteLink, this.profilePicture, this.creation, this.participantCount, _0x5b6124, this.lastSync, this.isActive, _0x1daec0, _0x1daec0]);
      this.id = _0x524dcb.lastID;
      this.createdAt = _0x1daec0;
      this.updatedAt = _0x1daec0;
      return _0x524dcb;
    }
  }
  async delete() {
    if (this.id) {
      await WhatsAppGroup.db.run("UPDATE whatsapp_groups SET is_active = 0 WHERE id = ?", [this.id]);
      this.isActive = false;
    }
  }
  async hardDelete() {
    if (this.id) {
      await WhatsAppGroup.db.run("DELETE FROM whatsapp_groups WHERE id = ?", [this.id]);
    }
  }
  async updateFromMetadata(_0x353613) {
    this.name = _0x353613.subject || this.name;
    this.description = _0x353613.desc || this.description;
    this.participants = _0x353613.participants || this.participants;
    this.admins = _0x353613.participants ? _0x353613.participants.filter(_0x40956a => _0x40956a.admin).map(_0x4e57f4 => _0x4e57f4.id) : this.admins;
    this.participantCount = _0x353613.participants ? _0x353613.participants.length : this.participantCount;
    this.creation = _0x353613.creation || this.creation;
    const _0x126a5f = _0x353613.currentUserJid;
    if (_0x126a5f && _0x353613.participants) {
      const _0x212c55 = _0x353613.participants.find(_0x5c18a3 => _0x5c18a3.id === _0x126a5f);
      if (_0x212c55) {
        this.isAdmin = _0x212c55.admin === "admin" || _0x212c55.admin === "superadmin";
        this.isOwner = _0x212c55.admin === "superadmin";
      }
    }
    this.lastSync = new Date().toISOString();
    return await this.save();
  }
  addParticipant(_0x26552e, _0x4c8391 = {}) {
    if (!this.participants.find(_0x38c0cc => _0x38c0cc.id === _0x26552e)) {
      this.participants.push({
        id: _0x26552e,
        name: _0x4c8391.name || null,
        admin: _0x4c8391.admin || null,
        ..._0x4c8391
      });
      this.participantCount = this.participants.length;
    }
  }
  removeParticipant(_0x524ea3) {
    this.participants = this.participants.filter(_0x20bcfd => _0x20bcfd.id !== _0x524ea3);
    this.participantCount = this.participants.length;
    this.admins = this.admins.filter(_0x456a74 => _0x456a74 !== _0x524ea3);
  }
  updateParticipantAdmin(_0x537d94, _0x39a6a5) {
    const _0x3a53f2 = this.participants.find(_0x14dcc6 => _0x14dcc6.id === _0x537d94);
    if (_0x3a53f2) {
      _0x3a53f2.admin = _0x39a6a5 ? "admin" : null;
      if (_0x39a6a5 && !this.admins.includes(_0x537d94)) {
        this.admins.push(_0x537d94);
      } else if (!_0x39a6a5) {
        this.admins = this.admins.filter(_0x4e93a3 => _0x4e93a3 !== _0x537d94);
      }
    }
  }
  getParticipant(_0x4c6d9c) {
    return this.participants.find(_0x2fdffa => _0x2fdffa.id === _0x4c6d9c);
  }
  isParticipantAdmin(_0x976108) {
    return this.admins.includes(_0x976108);
  }
  updateSettings(_0x14ff7f) {
    this.settings = {
      ...this.settings,
      ..._0x14ff7f
    };
  }
  getParticipantsArray() {
    if (Array.isArray(this.participants)) {
      return this.participants;
    } else {
      return [];
    }
  }
  getAdminsArray() {
    if (Array.isArray(this.admins)) {
      return this.admins;
    } else {
      return [];
    }
  }
  getSettingsObject() {
    if (typeof this.settings === "object") {
      return this.settings;
    } else {
      return {};
    }
  }
  toJSON() {
    return {
      id: this.id,
      groupId: this.groupId,
      sessionId: this.sessionId,
      name: this.name,
      description: this.description,
      participants: this.getParticipantsArray(),
      admins: this.getAdminsArray(),
      isOwner: this.isOwner,
      isAdmin: this.isAdmin,
      inviteCode: this.inviteCode,
      inviteLink: this.inviteLink,
      profilePicture: this.profilePicture,
      creation: this.creation,
      participantCount: this.participantCount,
      settings: this.getSettingsObject(),
      lastSync: this.lastSync,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  static async bulkSync(_0x498cfd, _0x3702c5) {
    const _0x5d043a = {
      created: 0,
      updated: 0,
      errors: []
    };
    for (const _0x17dc1f of _0x3702c5) {
      try {
        const _0x2d4fbc = await WhatsAppGroup.findByGroupId(_0x17dc1f.id, _0x498cfd);
        if (_0x2d4fbc) {
          await _0x2d4fbc.updateFromMetadata(_0x17dc1f);
          _0x5d043a.updated++;
        } else {
          const _0x598132 = new WhatsAppGroup({
            groupId: _0x17dc1f.id,
            sessionId: _0x498cfd,
            name: _0x17dc1f.subject,
            description: _0x17dc1f.desc,
            participants: _0x17dc1f.participants || [],
            creation: _0x17dc1f.creation
          });
          await _0x598132.updateFromMetadata(_0x17dc1f);
          _0x5d043a.created++;
        }
      } catch (_0x4e3639) {
        console.error("Error syncing group:", _0x17dc1f.id, _0x4e3639);
        _0x5d043a.errors.push((_0x17dc1f.subject || _0x17dc1f.id) + ": " + _0x4e3639.message);
      }
    }
    return _0x5d043a;
  }
  static async getStats(_0x2fa890 = null) {
    try {
      let _0x4d9e4d = "FROM whatsapp_groups WHERE is_active = 1";
      let _0x54cacf = [];
      if (_0x2fa890) {
        _0x4d9e4d += " AND session_id = ?";
        _0x54cacf.push(_0x2fa890);
      }
      const _0x18a219 = await WhatsAppGroup.db.get("SELECT COUNT(*) as count " + _0x4d9e4d, _0x54cacf);
      const _0x5f1f57 = await WhatsAppGroup.db.get("SELECT COUNT(*) as count " + _0x4d9e4d + " AND is_admin = 1", _0x54cacf);
      const _0x4b4ce2 = await WhatsAppGroup.db.get("SELECT COUNT(*) as count " + _0x4d9e4d + " AND is_owner = 1", _0x54cacf);
      const _0xc6c606 = await WhatsAppGroup.db.get("SELECT SUM(participant_count) as count " + _0x4d9e4d, _0x54cacf);
      return {
        totalGroups: _0x18a219.count || 0,
        adminGroups: _0x5f1f57.count || 0,
        ownerGroups: _0x4b4ce2.count || 0,
        totalParticipants: _0xc6c606.count || 0
      };
    } catch (_0x5082e1) {
      console.error("Error getting WhatsApp group stats:", _0x5082e1);
      return {
        totalGroups: 0,
        adminGroups: 0,
        ownerGroups: 0,
        totalParticipants: 0
      };
    }
  }
  static async search(_0x1f5060, _0x5d6a14 = null) {
    let _0x2a876d = "\n      SELECT * FROM whatsapp_groups \n      WHERE (name LIKE ? OR description LIKE ?) AND is_active = 1\n    ";
    let _0x1a2bb9 = ["%" + _0x1f5060 + "%", "%" + _0x1f5060 + "%"];
    if (_0x5d6a14) {
      _0x2a876d += " AND session_id = ?";
      _0x1a2bb9.push(_0x5d6a14);
    }
    _0x2a876d += " ORDER BY name ASC";
    const _0x4e1ffc = await this.db.all(_0x2a876d, _0x1a2bb9);
    return _0x4e1ffc.map(_0x5bab33 => new WhatsAppGroup(_0x5bab33));
  }
}
module.exports = WhatsAppGroup;