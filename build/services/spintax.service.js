class SpintaxService {
  constructor(_0x785f54 = null) {
    this.databaseService = _0x785f54;
  }
  parseSpintax(_0x2eb929) {
    if (!_0x2eb929 || typeof _0x2eb929 !== "string") {
      return [_0x2eb929 || ""];
    }
    const _0x266862 = /\{([^}]+)\}/g;
    let _0x3aefeb = [_0x2eb929];
    let _0x295b90;
    while ((_0x295b90 = _0x266862.exec(_0x2eb929)) !== null) {
      const _0x483fa5 = _0x295b90[0];
      const _0x58b1d7 = _0x295b90[1].split("|").map(_0x3fb45f => _0x3fb45f.trim()).filter(_0x133b4b => _0x133b4b.length > 0);
      if (_0x58b1d7.length > 1) {
        const _0x5d34fd = [];
        for (const _0x5b5683 of _0x3aefeb) {
          for (const _0x21ce7a of _0x58b1d7) {
            _0x5d34fd.push(_0x5b5683.replace(_0x483fa5, _0x21ce7a));
          }
        }
        _0x3aefeb = _0x5d34fd;
      }
    }
    if (_0x3aefeb.length > 0) {
      return _0x3aefeb;
    } else {
      return [_0x2eb929];
    }
  }
  async getNextVariation(_0x2d58bb, _0x55142c) {
    try {
      if (!this.databaseService) {
        const _0x495e47 = this.parseSpintax(_0x55142c);
        return _0x495e47[0] || _0x55142c;
      }
      const _0x5602b2 = await this.databaseService.query("SELECT * FROM spintax_state WHERE campaign_id = ? AND spintax_text = ?", [_0x2d58bb, _0x55142c]);
      let _0x324dea = 0;
      const _0x206d8e = this.parseSpintax(_0x55142c);
      const _0x2685a2 = _0x206d8e.length;
      if (_0x5602b2.success && _0x5602b2.data.length > 0) {
        const _0x4f7094 = _0x5602b2.data[0];
        _0x324dea = (_0x4f7094.current_index + 1) % _0x2685a2;
        await this.databaseService.query("UPDATE spintax_state SET current_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [_0x324dea, _0x4f7094.id]);
      } else {
        await this.databaseService.query("INSERT INTO spintax_state (campaign_id, spintax_text, current_index, total_variations) VALUES (?, ?, ?, ?)", [_0x2d58bb, _0x55142c, _0x324dea, _0x2685a2]);
      }
      return _0x206d8e[_0x324dea] || _0x55142c;
    } catch (_0x91e513) {
      console.error("Error getting next spintax variation:", _0x91e513);
      return _0x55142c;
    }
  }
  async resetCampaignState(_0x35c49f) {
    try {
      if (!this.databaseService) {
        return;
      }
      await this.databaseService.query("DELETE FROM spintax_state WHERE campaign_id = ?", [_0x35c49f]);
    } catch (_0x23a461) {
      console.error("Error resetting spintax state:", _0x23a461);
    }
  }
  hasSpintax(_0x3d91ea) {
    if (!_0x3d91ea || typeof _0x3d91ea !== "string") {
      return false;
    }
    return /\{[^}]*\|[^}]*\}/.test(_0x3d91ea);
  }
  async processMessageContent(_0x469e7f, _0x2cff4b) {
    try {
      if (!this.hasSpintax(_0x2cff4b)) {
        return _0x2cff4b;
      }
      const _0x21f61c = /\{([^}]+)\}/g;
      let _0x2bb576 = _0x2cff4b;
      let _0x3d66ca;
      const _0x23d8f8 = [];
      while ((_0x3d66ca = _0x21f61c.exec(_0x2cff4b)) !== null) {
        _0x23d8f8.push({
          fullMatch: _0x3d66ca[0],
          options: _0x3d66ca[1].split("|").map(_0x78ae2b => _0x78ae2b.trim()).filter(_0x18b07c => _0x18b07c.length > 0)
        });
      }
      for (const _0xfe2f78 of _0x23d8f8) {
        if (_0xfe2f78.options.length > 1) {
          const _0xfc687a = await this.getNextVariation(_0x469e7f, _0xfe2f78.fullMatch);
          _0x2bb576 = _0x2bb576.replace(_0xfe2f78.fullMatch, _0xfc687a);
        }
      }
      return _0x2bb576;
    } catch (_0x140156) {
      console.error("Error processing spintax content:", _0x140156);
      return _0x2cff4b;
    }
  }
  async getSpintaxStats(_0x440dca) {
    try {
      if (!this.databaseService) {
        return {
          totalPatterns: 0,
          states: []
        };
      }
      const _0x58f57a = await this.databaseService.query("SELECT * FROM spintax_state WHERE campaign_id = ?", [_0x440dca]);
      if (_0x58f57a.success) {
        return {
          totalPatterns: _0x58f57a.data.length,
          states: _0x58f57a.data.map(_0x407e1f => ({
            text: _0x407e1f.spintax_text,
            currentIndex: _0x407e1f.current_index,
            totalVariations: _0x407e1f.total_variations,
            progress: _0x407e1f.current_index + 1 + "/" + _0x407e1f.total_variations
          }))
        };
      }
      return {
        totalPatterns: 0,
        states: []
      };
    } catch (_0x2bf6bd) {
      console.error("Error getting spintax stats:", _0x2bf6bd);
      return {
        totalPatterns: 0,
        states: []
      };
    }
  }
}
module.exports = SpintaxService;