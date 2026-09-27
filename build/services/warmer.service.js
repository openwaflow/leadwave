const EventEmitter = require("events");
class WarmerService extends EventEmitter {
  constructor(_0x27e7ec, _0x275586) {
    super();
    this.databaseService = _0x27e7ec;
    this.whatsappService = _0x275586;
    this.activeCampaigns = new Map();
    this.log("Warmer Service initialized");
  }
  log(_0x58bdde, _0xafe15a = "info") {
    const _0x2f54a2 = new Date().toISOString();
  }
  async createCampaign(_0x2b1bbd) {
    try {
      const {
        name: _0x352136,
        description: _0x44ddfb,
        session_ids: _0x375b2f,
        messages: _0x22215e,
        delay_min: _0x14246d,
        delay_max: _0x1a0670,
        duration_minutes: _0x165278,
        template_id: _0x4cf64d
      } = _0x2b1bbd;
      if (!_0x352136 || !_0x375b2f || _0x375b2f.length < 2) {
        return {
          success: false,
          error: "Campaign requires a name and at least 2 sessions"
        };
      }
      if (!_0x4cf64d && (!_0x22215e || _0x22215e.length === 0)) {
        return {
          success: false,
          error: "Campaign requires either messages or a template"
        };
      }
      const _0x889ba5 = await this.databaseService.query("INSERT INTO warmer_campaigns (\n          name, description, session_ids, messages, delay_min, delay_max,\n          duration_minutes, template_id, status, created_at, updated_at\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stopped', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x352136, _0x44ddfb || "", JSON.stringify(_0x375b2f), JSON.stringify(_0x22215e || []), _0x14246d || 30, _0x1a0670 || 120, _0x165278 || 60, _0x4cf64d || null]);
      if (_0x889ba5.success) {
        this.log("Campaign created: " + _0x352136 + " (ID: " + _0x889ba5.lastID + ")");
        return {
          success: true,
          campaignId: _0x889ba5.lastID
        };
      }
      return {
        success: false,
        error: "Failed to create campaign"
      };
    } catch (_0x42032f) {
      this.log("Error creating campaign: " + _0x42032f.message, "error");
      return {
        success: false,
        error: _0x42032f.message
      };
    }
  }
  async getCampaigns() {
    try {
      const _0x4d894e = await this.databaseService.query("SELECT * FROM warmer_campaigns ORDER BY created_at DESC");
      if (_0x4d894e.success) {
        const _0x2937d0 = _0x4d894e.data.map(_0x5002bc => ({
          ..._0x5002bc,
          session_ids: JSON.parse(_0x5002bc.session_ids || "[]"),
          messages: JSON.parse(_0x5002bc.messages || "[]")
        }));
        return {
          success: true,
          data: _0x2937d0
        };
      }
      return {
        success: false,
        error: "Failed to fetch campaigns"
      };
    } catch (_0x271078) {
      this.log("Error fetching campaigns: " + _0x271078.message, "error");
      return {
        success: false,
        error: _0x271078.message
      };
    }
  }
  async getCampaign(_0x528057) {
    try {
      const _0x58f2c7 = await this.databaseService.query("SELECT * FROM warmer_campaigns WHERE id = ?", [_0x528057]);
      if (_0x58f2c7.success && _0x58f2c7.data.length > 0) {
        const _0x18cfbd = {
          ..._0x58f2c7.data[0],
          session_ids: JSON.parse(_0x58f2c7.data[0].session_ids || "[]"),
          messages: JSON.parse(_0x58f2c7.data[0].messages || "[]")
        };
        return {
          success: true,
          data: _0x18cfbd
        };
      }
      return {
        success: false,
        error: "Campaign not found"
      };
    } catch (_0x347619) {
      this.log("Error fetching campaign: " + _0x347619.message, "error");
      return {
        success: false,
        error: _0x347619.message
      };
    }
  }
  async updateCampaign(_0x5e0bc5, _0x3e7789) {
    try {
      const {
        name: _0x5e5e15,
        description: _0x5a48b0,
        session_ids: _0x4627f0,
        messages: _0x453dd6,
        delay_min: _0x9c25a3,
        delay_max: _0x1fab9b,
        duration_minutes: _0x5c22,
        template_id: _0x47139e
      } = _0x3e7789;
      const _0x4843b5 = await this.databaseService.query("UPDATE warmer_campaigns SET\n          name = ?, description = ?, session_ids = ?, messages = ?,\n          delay_min = ?, delay_max = ?, duration_minutes = ?, template_id = ?,\n          updated_at = CURRENT_TIMESTAMP\n        WHERE id = ?", [_0x5e5e15, _0x5a48b0 || "", JSON.stringify(_0x4627f0), JSON.stringify(_0x453dd6 || []), _0x9c25a3, _0x1fab9b, _0x5c22, _0x47139e || null, _0x5e0bc5]);
      if (_0x4843b5.success) {
        this.log("Campaign updated: " + _0x5e0bc5);
        return {
          success: true
        };
      }
      return {
        success: false,
        error: "Failed to update campaign"
      };
    } catch (_0x38f57f) {
      this.log("Error updating campaign: " + _0x38f57f.message, "error");
      return {
        success: false,
        error: _0x38f57f.message
      };
    }
  }
  async deleteCampaign(_0x315254) {
    try {
      await this.stopCampaign(_0x315254);
      const _0x53b6eb = await this.databaseService.query("DELETE FROM warmer_campaigns WHERE id = ?", [_0x315254]);
      if (_0x53b6eb.success) {
        this.log("Campaign deleted: " + _0x315254);
        return {
          success: true
        };
      }
      return {
        success: false,
        error: "Failed to delete campaign"
      };
    } catch (_0xbcb3a4) {
      this.log("Error deleting campaign: " + _0xbcb3a4.message, "error");
      return {
        success: false,
        error: _0xbcb3a4.message
      };
    }
  }
  async startCampaign(_0x3f0085) {
    try {
      if (this.activeCampaigns.has(_0x3f0085)) {
        return {
          success: false,
          error: "Campaign is already running"
        };
      }
      const _0x132fe2 = await this.getCampaign(_0x3f0085);
      if (!_0x132fe2.success) {
        return {
          success: false,
          error: "Campaign not found"
        };
      }
      const _0x3d96a3 = _0x132fe2.data;
      const _0x48f946 = [];
      for (const _0x4dfd48 of _0x3d96a3.session_ids) {
        const _0x2c0b04 = this.whatsappService.sessions.get(_0x4dfd48);
        if (_0x2c0b04 && this.whatsappService.sessionStates.get(_0x4dfd48)?.status === "connected") {
          _0x48f946.push(_0x4dfd48);
        }
      }
      if (_0x48f946.length < 2) {
        return {
          success: false,
          error: "At least 2 sessions must be connected to start warming"
        };
      }
      let _0x1adabd = _0x3d96a3.messages;
      if (_0x3d96a3.template_id) {
        const _0x276a9b = await this.databaseService.query("SELECT * FROM warmer_templates WHERE id = ?", [_0x3d96a3.template_id]);
        if (_0x276a9b.success && _0x276a9b.data.length > 0) {
          _0x1adabd = JSON.parse(_0x276a9b.data[0].messages || "[]");
        }
      }
      if (_0x1adabd.length === 0) {
        return {
          success: false,
          error: "No messages configured for this campaign"
        };
      }
      await this.databaseService.query("UPDATE warmer_campaigns SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?", [_0x3f0085]);
      this.runWarmerCampaign(_0x3f0085, _0x3d96a3, _0x48f946, _0x1adabd);
      this.log("Campaign started: " + _0x3d96a3.name + " (ID: " + _0x3f0085 + ")");
      return {
        success: true,
        message: "Campaign started successfully"
      };
    } catch (_0x478ad5) {
      this.log("Error starting campaign: " + _0x478ad5.message, "error");
      return {
        success: false,
        error: _0x478ad5.message
      };
    }
  }
  async runWarmerCampaign(_0x50962d, _0x532e18, _0x18cc09, _0x3e3a98) {
    const _0x4aa46e = Date.now();
    const _0x226d19 = _0x532e18.duration_minutes * 60 * 1000;
    let _0x50f35e = 0;
    let _0x257e4d = 0;
    let _0x4cac07 = Math.floor(Math.random() * _0x18cc09.length);
    let _0x17e553 = -1;
    const _0x105168 = async () => {
      try {
        const _0x41c311 = Date.now() - _0x4aa46e;
        if (_0x41c311 >= _0x226d19) {
          this.log("Campaign " + _0x50962d + " completed (duration reached)");
          await this.stopCampaign(_0x50962d);
          return;
        }
        const _0x4f3a8d = await this.databaseService.query("SELECT status FROM warmer_campaigns WHERE id = ?", [_0x50962d]);
        if (!_0x4f3a8d.success || _0x4f3a8d.data[0]?.status !== "running") {
          this.log("Campaign " + _0x50962d + " stopped");
          return;
        }
        const _0x406c62 = _0x3e3a98[_0x50f35e % _0x3e3a98.length];
        _0x50f35e++;
        let _0x42c5a7;
        let _0x2cd001;
        let _0x263ed0;
        if (_0x18cc09.length === 2) {
          _0x42c5a7 = _0x18cc09[_0x4cac07];
          _0x263ed0 = _0x4cac07 === 0 ? 1 : 0;
          _0x2cd001 = _0x18cc09[_0x263ed0];
          _0x4cac07 = _0x263ed0;
        } else {
          _0x42c5a7 = _0x18cc09[_0x4cac07];
          const _0x1414e5 = _0x18cc09.map((_0x257414, _0x381442) => _0x381442).filter(_0x2cc2d8 => _0x2cc2d8 !== _0x4cac07);
          if (_0x1414e5.length > 1 && _0x17e553 !== -1) {
            const _0x4fb71a = _0x1414e5.filter(_0x3e5357 => _0x3e5357 !== _0x17e553);
            if (_0x4fb71a.length > 0) {
              _0x263ed0 = _0x4fb71a[Math.floor(Math.random() * _0x4fb71a.length)];
            } else {
              _0x263ed0 = _0x1414e5[Math.floor(Math.random() * _0x1414e5.length)];
            }
          } else {
            _0x263ed0 = _0x1414e5[Math.floor(Math.random() * _0x1414e5.length)];
          }
          _0x2cd001 = _0x18cc09[_0x263ed0];
          _0x17e553 = _0x263ed0;
          _0x4cac07 = (_0x4cac07 + 1) % _0x18cc09.length;
        }
        const _0x176468 = await this.databaseService.query("SELECT phone_number FROM whatsapp_sessions WHERE session_id = ?", [_0x2cd001]);
        if (!_0x176468.success || !_0x176468.data[0]?.phone_number) {
          this.log("Receiver session " + _0x2cd001 + " phone number not available, skipping message", "warn");
        } else {
          const _0x14bb5d = _0x176468.data[0].phone_number.replace(/\D/g, "");
          const _0x1204b2 = _0x14bb5d + "@s.whatsapp.net";
          this.log("Sending warmer message from " + _0x42c5a7 + " to " + _0x2cd001 + " (" + _0x14bb5d + "): \"" + _0x406c62 + "\"");
          const _0x2e6d47 = await this.whatsappService.sendMessage(_0x42c5a7, _0x1204b2, _0x406c62);
          if (_0x2e6d47.success) {
            _0x257e4d++;
            await this.databaseService.query("INSERT INTO warmer_logs (\n                campaign_id, sender_session_id, receiver_session_id, message, status, created_at\n              ) VALUES (?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)", [_0x50962d, _0x42c5a7, _0x2cd001, _0x406c62]);
            await this.databaseService.query("UPDATE warmer_campaigns SET messages_sent = messages_sent + 1 WHERE id = ?", [_0x50962d]);
            this.emit("message_sent", {
              campaignId: _0x50962d,
              senderSessionId: _0x42c5a7,
              receiverSessionId: _0x2cd001,
              message: _0x406c62,
              messagesSent: _0x257e4d
            });
          } else {
            this.log("Failed to send message: " + _0x2e6d47.error, "error");
            await this.databaseService.query("INSERT INTO warmer_logs (\n                campaign_id, sender_session_id, receiver_session_id, message, status, error_message, created_at\n              ) VALUES (?, ?, ?, ?, 'failed', ?, CURRENT_TIMESTAMP)", [_0x50962d, _0x42c5a7, _0x2cd001, _0x406c62, _0x2e6d47.error]);
          }
        }
        const _0x2d048c = Math.floor(Math.random() * (_0x532e18.delay_max - _0x532e18.delay_min + 1) + _0x532e18.delay_min);
        this.log("Next message in " + _0x2d048c + " seconds");
        const _0x262b63 = setTimeout(_0x105168, _0x2d048c * 1000);
        if (this.activeCampaigns.has(_0x50962d)) {
          this.activeCampaigns.get(_0x50962d).timeoutId = _0x262b63;
        }
      } catch (_0x4d5e12) {
        this.log("Error in warmer campaign " + _0x50962d + ": " + _0x4d5e12.message, "error");
        await this.stopCampaign(_0x50962d);
      }
    };
    this.activeCampaigns.set(_0x50962d, {
      status: "running",
      startTime: _0x4aa46e,
      durationMs: _0x226d19,
      messagesSent: 0
    });
    _0x105168();
  }
  async stopCampaign(_0x256cb8) {
    try {
      if (this.activeCampaigns.has(_0x256cb8)) {
        const _0x4b5e96 = this.activeCampaigns.get(_0x256cb8);
        if (_0x4b5e96.timeoutId) {
          clearTimeout(_0x4b5e96.timeoutId);
        }
        this.activeCampaigns.delete(_0x256cb8);
      }
      await this.databaseService.query("UPDATE warmer_campaigns SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP WHERE id = ?", [_0x256cb8]);
      this.log("Campaign stopped: " + _0x256cb8);
      this.emit("campaign_stopped", {
        campaignId: _0x256cb8
      });
      return {
        success: true,
        message: "Campaign stopped successfully"
      };
    } catch (_0x3504f2) {
      this.log("Error stopping campaign: " + _0x3504f2.message, "error");
      return {
        success: false,
        error: _0x3504f2.message
      };
    }
  }
  async getCampaignStats(_0xfc6003) {
    try {
      const _0x3c7e51 = await this.databaseService.query("SELECT\n          COUNT(*) as total_messages,\n          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_messages,\n          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages\n        FROM warmer_logs WHERE campaign_id = ?", [_0xfc6003]);
      if (_0x3c7e51.success && _0x3c7e51.data.length > 0) {
        return {
          success: true,
          data: _0x3c7e51.data[0]
        };
      }
      return {
        success: false,
        error: "Failed to fetch stats"
      };
    } catch (_0x4ac107) {
      this.log("Error fetching campaign stats: " + _0x4ac107.message, "error");
      return {
        success: false,
        error: _0x4ac107.message
      };
    }
  }
  async getCampaignLogs(_0x3d0f9f, _0x187cba = 100) {
    try {
      const _0x44b2b8 = await this.databaseService.query("SELECT * FROM warmer_logs WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?", [_0x3d0f9f, _0x187cba]);
      if (_0x44b2b8.success) {
        return {
          success: true,
          data: _0x44b2b8.data
        };
      }
      return {
        success: false,
        error: "Failed to fetch logs"
      };
    } catch (_0xc9c9b) {
      this.log("Error fetching campaign logs: " + _0xc9c9b.message, "error");
      return {
        success: false,
        error: _0xc9c9b.message
      };
    }
  }
  getActiveCampaignsCount() {
    return this.activeCampaigns.size;
  }
  async stopAllCampaigns() {
    const _0x21878a = Array.from(this.activeCampaigns.keys());
    for (const _0x48faf1 of _0x21878a) {
      await this.stopCampaign(_0x48faf1);
    }
    return {
      success: true,
      stopped: _0x21878a.length
    };
  }
  async createTemplate(_0x1522ee) {
    try {
      const {
        name: _0x57287f,
        description: _0x1046ae,
        messages: _0x4d1cfd
      } = _0x1522ee;
      if (!_0x57287f || !_0x4d1cfd || _0x4d1cfd.length === 0) {
        return {
          success: false,
          error: "Template requires a name and messages"
        };
      }
      const _0xb67958 = await this.databaseService.query("INSERT INTO warmer_templates (name, description, messages, created_at, updated_at)\n        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [_0x57287f, _0x1046ae || "", JSON.stringify(_0x4d1cfd)]);
      if (_0xb67958.success) {
        return {
          success: true,
          templateId: _0xb67958.lastID
        };
      }
      return {
        success: false,
        error: "Failed to create template"
      };
    } catch (_0xed12ee) {
      this.log("Error creating template: " + _0xed12ee.message, "error");
      return {
        success: false,
        error: _0xed12ee.message
      };
    }
  }
  async getTemplates() {
    try {
      const _0x1f3458 = await this.databaseService.query("SELECT * FROM warmer_templates ORDER BY created_at DESC");
      if (_0x1f3458.success) {
        const _0x537bd6 = _0x1f3458.data.map(_0x3a37e9 => ({
          ..._0x3a37e9,
          messages: JSON.parse(_0x3a37e9.messages || "[]")
        }));
        return {
          success: true,
          data: _0x537bd6
        };
      }
      return {
        success: false,
        error: "Failed to fetch templates"
      };
    } catch (_0x464083) {
      this.log("Error fetching templates: " + _0x464083.message, "error");
      return {
        success: false,
        error: _0x464083.message
      };
    }
  }
  async updateTemplate(_0x1d531a, _0x4b25b0) {
    try {
      const {
        name: _0x137e61,
        description: _0x30836c,
        messages: _0x4947fe
      } = _0x4b25b0;
      const _0x4d5a97 = await this.databaseService.query("UPDATE warmer_templates SET name = ?, description = ?, messages = ?, updated_at = CURRENT_TIMESTAMP\n        WHERE id = ?", [_0x137e61, _0x30836c || "", JSON.stringify(_0x4947fe), _0x1d531a]);
      if (_0x4d5a97.success) {
        return {
          success: true
        };
      }
      return {
        success: false,
        error: "Failed to update template"
      };
    } catch (_0x5655be) {
      this.log("Error updating template: " + _0x5655be.message, "error");
      return {
        success: false,
        error: _0x5655be.message
      };
    }
  }
  async deleteTemplate(_0x40b6f2) {
    try {
      const _0x28bc09 = await this.databaseService.query("DELETE FROM warmer_templates WHERE id = ?", [_0x40b6f2]);
      if (_0x28bc09.success) {
        return {
          success: true
        };
      }
      return {
        success: false,
        error: "Failed to delete template"
      };
    } catch (_0x2b1993) {
      this.log("Error deleting template: " + _0x2b1993.message, "error");
      return {
        success: false,
        error: _0x2b1993.message
      };
    }
  }
}
module.exports = WarmerService;