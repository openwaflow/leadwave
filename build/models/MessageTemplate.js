const DatabaseService = require("../services/database.service");
const CAROUSEL_MIN_CARDS = 2;
const CAROUSEL_MAX_CARDS = 10;
const CAROUSEL_CAPTION_MIN = 1;
const CAROUSEL_CAPTION_MAX = 1024;
const CAROUSEL_MAX_BUTTONS_PER_CARD = 3;
const CAROUSEL_LIMITS = Object.freeze({
  CAPTION_EMPTY: "caption_empty",
  CAPTION_MAX: "caption_max_1024",
  MAX_BUTTONS: "max_3_buttons_per_card",
  CARDS_TYPE: "cards_not_array",
  BUTTONS_TYPE: "card_buttons_not_array"
});
class CarouselValidationError extends Error {
  constructor(_0x263c29, _0x56b423, _0x213b28) {
    super(_0x213b28);
    this.name = "CarouselValidationError";
    this.cardIndex = _0x263c29;
    this.limit = _0x56b423;
  }
}
class MessageTemplate {
  constructor(_0x532ed3 = {}) {
    this.id = _0x532ed3.id || null;
    this.name = _0x532ed3.name;
    this.category = _0x532ed3.category || "general";
    this.type = _0x532ed3.type || "text";
    this.content = _0x532ed3.content;
    this.variables = _0x532ed3.variables;
    this.attachments = _0x532ed3.attachments;
    this.carouselCards = _0x532ed3.carousel_cards !== undefined ? _0x532ed3.carousel_cards : _0x532ed3.carouselCards;
    this.carouselSettings = _0x532ed3.carousel_settings !== undefined ? _0x532ed3.carousel_settings : _0x532ed3.carouselSettings;
    this.carouselCardExtras = _0x532ed3.carousel_card_extras !== undefined ? _0x532ed3.carousel_card_extras : _0x532ed3.carouselCardExtras;
    this.isActive = _0x532ed3.is_active !== undefined ? _0x532ed3.is_active : _0x532ed3.isActive !== undefined ? _0x532ed3.isActive : true;
    this.usageCount = _0x532ed3.usage_count || _0x532ed3.usageCount || 0;
    this.createdAt = _0x532ed3.created_at || _0x532ed3.createdAt;
    this.updatedAt = _0x532ed3.updated_at || _0x532ed3.updatedAt;
  }
  static async initialize() {
    this.db = new DatabaseService();
    await this.db.initialize();
  }
  static async findAll() {
    const _0xe18531 = await this.db.all("SELECT * FROM message_templates WHERE is_active = 1 ORDER BY usage_count DESC, created_at DESC");
    return _0xe18531.map(_0x2fe37f => new MessageTemplate(_0x2fe37f));
  }
  static async findById(_0x229e47) {
    const _0x3a93f2 = await this.db.get("SELECT * FROM message_templates WHERE id = ?", [_0x229e47]);
    if (_0x3a93f2) {
      return new MessageTemplate(_0x3a93f2);
    } else {
      return null;
    }
  }
  static async findByCategory(_0x5f47f0) {
    const _0x22a1dc = await this.db.all("SELECT * FROM message_templates WHERE category = ? AND is_active = 1", [_0x5f47f0]);
    return _0x22a1dc.map(_0x5c7888 => new MessageTemplate(_0x5c7888));
  }
  static async search(_0x9f9b96) {
    const _0x1cb3ff = await this.db.all("\n      SELECT * FROM message_templates \n      WHERE (name LIKE ? OR content LIKE ?) AND is_active = 1\n      ORDER BY usage_count DESC\n    ", ["%" + _0x9f9b96 + "%", "%" + _0x9f9b96 + "%"]);
    return _0x1cb3ff.map(_0x55e91f => new MessageTemplate(_0x55e91f));
  }
  async save() {
    const _0x140695 = new Date().toISOString();
    const _0x441bf8 = this.getCarouselCardsArray();
    if (_0x441bf8.length > 0) {
      const _0xadeacc = MessageTemplate.validateCarouselCards(_0x441bf8);
      if (!_0xadeacc.valid) {
        throw new CarouselValidationError(_0xadeacc.error.cardIndex, _0xadeacc.error.limit, _0xadeacc.error.message);
      }
    }
    const _0x285054 = this._serializeCarouselValue(this.carouselCards);
    const _0x345fc3 = this._serializeCarouselValue(this.carouselSettings);
    const _0x3e6c3f = this._serializeCarouselValue(this.carouselCardExtras);
    if (this.id) {
      const _0x51c62f = await MessageTemplate.db.run("\n        UPDATE message_templates \n        SET name = ?, category = ?, type = ?, content = ?, variables = ?, attachments = ?, \n            carousel_cards = ?, carousel_settings = ?, carousel_card_extras = ?,\n            is_active = ?, updated_at = ?\n        WHERE id = ?\n      ", [this.name, this.category, this.type, this.content, this.variables, this.attachments, _0x285054, _0x345fc3, _0x3e6c3f, this.isActive, _0x140695, this.id]);
      this.updatedAt = _0x140695;
      return _0x51c62f;
    } else {
      const _0x39108b = await MessageTemplate.db.run("\n        INSERT INTO message_templates \n        (name, category, type, content, variables, attachments, carousel_cards, carousel_settings, carousel_card_extras, is_active, usage_count, created_at, updated_at)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [this.name, this.category, this.type, this.content, this.variables, this.attachments, _0x285054, _0x345fc3, _0x3e6c3f, this.isActive, this.usageCount, _0x140695, _0x140695]);
      this.id = _0x39108b.insertId || _0x39108b.lastID || _0x39108b.id || null;
      this.createdAt = _0x140695;
      this.updatedAt = _0x140695;
      return _0x39108b;
    }
  }
  async delete() {
    if (this.id) {
      await MessageTemplate.db.run("UPDATE message_templates SET is_active = 0 WHERE id = ?", [this.id]);
      this.isActive = false;
    }
  }
  async incrementUsage() {
    if (this.id) {
      this.usageCount += 1;
      await MessageTemplate.db.run("UPDATE message_templates SET usage_count = usage_count + 1 WHERE id = ?", [this.id]);
    }
  }
  getVariablesArray() {
    if (!this.variables) {
      return [];
    }
    try {
      if (typeof this.variables === "string") {
        return JSON.parse(this.variables);
      } else {
        return this.variables;
      }
    } catch (_0x554edc) {
      console.error("Error parsing variables:", _0x554edc);
      return [];
    }
  }
  setVariables(_0x2765c0) {
    this.variables = typeof _0x2765c0 === "object" ? JSON.stringify(_0x2765c0) : _0x2765c0;
  }
  getAttachmentsArray() {
    if (!this.attachments) {
      return [];
    }
    try {
      if (typeof this.attachments === "string") {
        return JSON.parse(this.attachments);
      } else {
        return this.attachments;
      }
    } catch (_0x5543cd) {
      console.error("Error parsing attachments:", _0x5543cd);
      return [];
    }
  }
  setAttachments(_0xe2fb75) {
    this.attachments = typeof _0xe2fb75 === "object" ? JSON.stringify(_0xe2fb75) : _0xe2fb75;
  }
  _serializeCarouselValue(_0x22638e) {
    if (_0x22638e === undefined || _0x22638e === null) {
      return null;
    }
    if (typeof _0x22638e === "object") {
      return JSON.stringify(_0x22638e);
    } else {
      return _0x22638e;
    }
  }
  getCarouselCardsArray() {
    if (!this.carouselCards) {
      return [];
    }
    try {
      const _0x2a94ed = typeof this.carouselCards === "string" ? JSON.parse(this.carouselCards) : this.carouselCards;
      if (Array.isArray(_0x2a94ed)) {
        return _0x2a94ed;
      } else {
        return [];
      }
    } catch (_0x2e6516) {
      console.error("Error parsing carousel cards:", _0x2e6516);
      return [];
    }
  }
  setCarouselCards(_0x56fba3) {
    this.carouselCards = typeof _0x56fba3 === "object" ? JSON.stringify(_0x56fba3) : _0x56fba3;
  }
  getCarouselSettings() {
    if (!this.carouselSettings) {
      return {};
    }
    try {
      if (typeof this.carouselSettings === "string") {
        return JSON.parse(this.carouselSettings);
      } else {
        return this.carouselSettings;
      }
    } catch (_0x3f56ee) {
      console.error("Error parsing carousel settings:", _0x3f56ee);
      return {};
    }
  }
  setCarouselSettings(_0x4ea23c) {
    this.carouselSettings = typeof _0x4ea23c === "object" ? JSON.stringify(_0x4ea23c) : _0x4ea23c;
  }
  getCarouselCardExtrasArray() {
    if (!this.carouselCardExtras) {
      return [];
    }
    try {
      const _0x47d5d9 = typeof this.carouselCardExtras === "string" ? JSON.parse(this.carouselCardExtras) : this.carouselCardExtras;
      if (Array.isArray(_0x47d5d9)) {
        return _0x47d5d9;
      } else {
        return [];
      }
    } catch (_0x38db55) {
      console.error("Error parsing carousel card extras:", _0x38db55);
      return [];
    }
  }
  setCarouselCardExtras(_0xe186d1) {
    this.carouselCardExtras = typeof _0xe186d1 === "object" ? JSON.stringify(_0xe186d1) : _0xe186d1;
  }
  static validateCarouselCards(_0x570cf1) {
    if (!Array.isArray(_0x570cf1)) {
      return {
        valid: false,
        error: {
          cardIndex: null,
          limit: CAROUSEL_LIMITS.CARDS_TYPE,
          message: "Carousel cards must be provided as an array."
        }
      };
    }
    for (let _0x497924 = 0; _0x497924 < _0x570cf1.length; _0x497924++) {
      const _0x1ee17f = _0x570cf1[_0x497924] || {};
      const _0x15a863 = _0x1ee17f.caption;
      if (typeof _0x15a863 !== "string" || _0x15a863.length < CAROUSEL_CAPTION_MIN) {
        return {
          valid: false,
          error: {
            cardIndex: _0x497924,
            limit: CAROUSEL_LIMITS.CAPTION_EMPTY,
            message: "Carousel card " + _0x497924 + ": caption must be between " + CAROUSEL_CAPTION_MIN + " and " + CAROUSEL_CAPTION_MAX + " characters (empty caption is not allowed)."
          }
        };
      }
      if (_0x15a863.length > CAROUSEL_CAPTION_MAX) {
        return {
          valid: false,
          error: {
            cardIndex: _0x497924,
            limit: CAROUSEL_LIMITS.CAPTION_MAX,
            message: "Carousel card " + _0x497924 + ": caption exceeds the " + CAROUSEL_CAPTION_MAX + "-character limit."
          }
        };
      }
      const _0x435e27 = _0x1ee17f.buttons === undefined || _0x1ee17f.buttons === null ? [] : _0x1ee17f.buttons;
      if (!Array.isArray(_0x435e27)) {
        return {
          valid: false,
          error: {
            cardIndex: _0x497924,
            limit: CAROUSEL_LIMITS.BUTTONS_TYPE,
            message: "Carousel card " + _0x497924 + ": buttons must be provided as an array."
          }
        };
      }
      if (_0x435e27.length > CAROUSEL_MAX_BUTTONS_PER_CARD) {
        return {
          valid: false,
          error: {
            cardIndex: _0x497924,
            limit: CAROUSEL_LIMITS.MAX_BUTTONS,
            message: "Carousel card " + _0x497924 + ": defines " + _0x435e27.length + " buttons but a maximum of " + CAROUSEL_MAX_BUTTONS_PER_CARD + " buttons per card is allowed."
          }
        };
      }
    }
    return {
      valid: true
    };
  }
  processTemplate(_0x5790a8 = {}) {
    let _0x332611 = this.content;
    const _0x5e3d44 = /\{\{(\w+)\}\}/g;
    _0x332611 = _0x332611.replace(_0x5e3d44, (_0x37fd4b, _0x63604f) => {
      return _0x5790a8[_0x63604f] || _0x37fd4b;
    });
    return _0x332611;
  }
  extractVariables() {
    const _0x1e54d9 = /\{\{(\w+)\}\}/g;
    const _0x57a543 = [];
    let _0x4e285a;
    while ((_0x4e285a = _0x1e54d9.exec(this.content)) !== null) {
      if (!_0x57a543.includes(_0x4e285a[1])) {
        _0x57a543.push(_0x4e285a[1]);
      }
    }
    return _0x57a543;
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      type: this.type,
      content: this.content,
      variables: this.getVariablesArray(),
      attachments: this.getAttachmentsArray(),
      carouselCards: this.getCarouselCardsArray(),
      carouselSettings: this.getCarouselSettings(),
      carouselCardExtras: this.getCarouselCardExtrasArray(),
      isActive: this.isActive,
      usageCount: this.usageCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  static async getStats() {
    try {
      const _0x5c5e8e = await MessageTemplate.db.query("SELECT COUNT(*) as count FROM message_templates WHERE is_active = 1");
      const _0x4e4c7a = await MessageTemplate.db.query("\n        SELECT category, COUNT(*) as count\n        FROM message_templates\n        WHERE is_active = 1\n        GROUP BY category\n      ");
      const _0x495bac = await MessageTemplate.db.query("\n        SELECT * FROM message_templates\n        WHERE is_active = 1\n        ORDER BY usage_count DESC\n        LIMIT 5\n      ");
      const _0x8e4459 = _0x5c5e8e.success && _0x5c5e8e.data && _0x5c5e8e.data.length > 0 ? _0x5c5e8e.data[0].count : 0;
      const _0x15f2a7 = _0x4e4c7a.success && Array.isArray(_0x4e4c7a.data) ? _0x4e4c7a.data : [];
      const _0xebc3dd = _0x495bac.success && Array.isArray(_0x495bac.data) ? _0x495bac.data : [];
      return {
        total: _0x8e4459,
        byCategory: _0x15f2a7.reduce((_0x4174c0, _0x12391a) => {
          _0x4174c0[_0x12391a.category] = _0x12391a.count;
          return _0x4174c0;
        }, {}),
        mostUsed: _0xebc3dd.map(_0x4d0157 => new MessageTemplate(_0x4d0157))
      };
    } catch (_0x4812cd) {
      console.error("Error getting template stats:", _0x4812cd);
      return {
        total: 0,
        byCategory: {},
        mostUsed: []
      };
    }
  }
  static async getCategories() {
    const _0x1d6578 = await MessageTemplate.db.all("\n      SELECT DISTINCT category, COUNT(*) as count \n      FROM message_templates \n      WHERE is_active = 1 \n      GROUP BY category \n      ORDER BY count DESC\n    ");
    return _0x1d6578.map(_0x24c312 => ({
      name: _0x24c312.category,
      count: _0x24c312.count
    }));
  }
}
module.exports = MessageTemplate;
module.exports.CarouselValidationError = CarouselValidationError;
module.exports.CAROUSEL_LIMITS = CAROUSEL_LIMITS;
module.exports.CAROUSEL_CONSTRAINTS = Object.freeze({
  MIN_CARDS: CAROUSEL_MIN_CARDS,
  MAX_CARDS: CAROUSEL_MAX_CARDS,
  CAPTION_MIN: CAROUSEL_CAPTION_MIN,
  CAPTION_MAX: CAROUSEL_CAPTION_MAX,
  MAX_BUTTONS_PER_CARD: CAROUSEL_MAX_BUTTONS_PER_CARD
});