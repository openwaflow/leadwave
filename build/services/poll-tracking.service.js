const crypto = require("crypto");
class PollTrackingService {
  constructor(_0x1c03e7) {
    this.db = _0x1c03e7;
    this.logger = console;
    this.aggregationFailures = [];
  }
  _rows(_0x4c867d) {
    if (!_0x4c867d || !_0x4c867d.success || !_0x4c867d.data) {
      return [];
    }
    if (Array.isArray(_0x4c867d.data)) {
      return _0x4c867d.data;
    }
    if (Array.isArray(_0x4c867d.data.values)) {
      const _0x1484b = _0x4c867d.data.columns || [];
      if (_0x1484b.length > 0 && Array.isArray(_0x4c867d.data.values[0])) {
        return _0x4c867d.data.values.map(_0x2345dc => {
          const _0x17a6f2 = {};
          _0x1484b.forEach((_0x218fb6, _0x3fc04e) => {
            _0x17a6f2[_0x218fb6] = _0x2345dc[_0x3fc04e];
          });
          return _0x17a6f2;
        });
      }
      return _0x4c867d.data.values;
    }
    return [];
  }
  async hasProcessedVoteUpdate(_0x5dbd3c, _0xa8cbb0) {
    if (!_0xa8cbb0) {
      return false;
    }
    try {
      const _0x4f036f = await this.db.query("SELECT id FROM poll_votes WHERE poll_message_id = ? AND vote_update_id = ? LIMIT 1", [_0x5dbd3c, _0xa8cbb0]);
      return this._rows(_0x4f036f).length > 0;
    } catch (_0x12f262) {
      console.error("❌ POLL TRACKING: Error checking processed vote update:", _0x12f262);
      return false;
    }
  }
  async getOptionVoteCounts(_0x5446cc) {
    const _0xec14e0 = {};
    try {
      const _0x520bf3 = await this.db.query("SELECT id FROM poll_options WHERE poll_message_id = ? ORDER BY option_index", [_0x5446cc]);
      for (const _0xad5bc0 of this._rows(_0x520bf3)) {
        _0xec14e0[_0xad5bc0.id] = 0;
      }
      const _0x156e96 = await this.db.query("SELECT poll_option_id, COUNT(*) AS cnt FROM poll_votes\n         WHERE poll_message_id = ? AND is_valid = 1 AND poll_option_id IS NOT NULL\n         GROUP BY poll_option_id", [_0x5446cc]);
      for (const _0x57576c of this._rows(_0x156e96)) {
        const _0x1f652f = _0x57576c.poll_option_id;
        const _0x5d8dc9 = parseInt(_0x57576c.cnt, 10);
        _0xec14e0[_0x1f652f] = Math.max(0, Number.isFinite(_0x5d8dc9) ? _0x5d8dc9 : 0);
      }
    } catch (_0x81702e) {
      console.error("❌ POLL TRACKING: Error computing option vote counts:", _0x81702e);
    }
    return _0xec14e0;
  }
  async storeAggregatedPollVotes(_0x33a323) {
    const {
      pollMessageId: _0x4bf494,
      pollResults: _0x20b721,
      voteUpdateId = null
    } = _0x33a323 || {};
    console.log("💾 POLL TRACKING: storeAggregatedPollVotes called");
    console.log("   Poll Message ID:", _0x4bf494);
    console.log("   Vote Update ID:", voteUpdateId);
    console.log("   Poll Results:", JSON.stringify(_0x20b721, null, 2));
    try {
      if (voteUpdateId && (await this.hasProcessedVoteUpdate(_0x4bf494, voteUpdateId))) {
        console.log("⏭️  POLL TRACKING: Vote already processed (dedup)");
        return {
          success: true,
          deduped: true,
          counts: await this.getOptionVoteCounts(_0x4bf494)
        };
      }
      if (!_0x20b721 || !Array.isArray(_0x20b721) || _0x20b721.length === 0) {
        console.error("❌ POLL TRACKING: Invalid poll results");
        return {
          success: false,
          deduped: false,
          counts: await this.getOptionVoteCounts(_0x4bf494)
        };
      }
      const _0x5d05c1 = await this.db.query("SELECT id, option_text, option_index FROM poll_options\n         WHERE poll_message_id = ? ORDER BY option_index", [_0x4bf494]);
      const _0x2a2d45 = this._rows(_0x5d05c1);
      console.log("📋 POLL TRACKING: Poll options from database:", JSON.stringify(_0x2a2d45.map(_0x40ae1e => ({
        id: _0x40ae1e.id,
        text: _0x40ae1e.option_text,
        index: _0x40ae1e.option_index
      })), null, 2));
      if (_0x2a2d45.length === 0) {
        console.error("❌ POLL TRACKING: Could not find poll options for poll:", _0x4bf494);
        return {
          success: false,
          deduped: false,
          counts: {}
        };
      }
      let _0x3a5832 = 0;
      let _0x210840 = 0;
      for (const _0x252554 of _0x20b721) {
        if (!_0x252554) {
          continue;
        }
        const _0x236b34 = _0x252554.name;
        const _0x2084dc = Array.isArray(_0x252554.voters) ? _0x252554.voters : [];
        console.log("\n🔍 POLL TRACKING: Processing result for option \"" + _0x236b34 + "\"");
        console.log("   Voters:", _0x2084dc);
        const _0xd832a1 = _0x2a2d45.find(_0x42efa8 => _0x42efa8.option_text === _0x236b34);
        if (!_0xd832a1) {
          console.error("❌ POLL TRACKING: No matching option found for \"" + _0x236b34 + "\"");
          console.error("   Available options:", _0x2a2d45.map(_0x59c27d => _0x59c27d.option_text));
          continue;
        }
        console.log("✅ POLL TRACKING: Found matching option ID " + _0xd832a1.id);
        for (const _0x16d7c1 of _0x2084dc) {
          const _0x1a4071 = await this.db.query("SELECT id FROM poll_votes\n             WHERE poll_message_id = ? AND voter_jid = ? AND poll_option_id = ?", [_0x4bf494, _0x16d7c1, _0xd832a1.id]);
          if (this._rows(_0x1a4071).length > 0) {
            console.log("⏭️  POLL TRACKING: Vote already exists for " + _0x16d7c1);
            _0x210840++;
            continue;
          }
          const _0x372d79 = await this.db.query("INSERT INTO poll_votes (\n              poll_message_id, poll_option_id, voter_jid, vote_message_id,\n              voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback,\n              vote_update_id\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0x4bf494, _0xd832a1.id, _0x16d7c1, "vote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), new Date().toISOString(), Date.now(), 1, 0, voteUpdateId]);
          if (!_0x372d79.success) {
            console.error("❌ POLL TRACKING: Error storing aggregated vote:", _0x372d79.error);
          } else {
            console.log("✅ POLL TRACKING: Stored vote for " + _0x16d7c1);
            _0x3a5832++;
          }
        }
      }
      const _0x2f3d7d = await this.getOptionVoteCounts(_0x4bf494);
      console.log("\n📊 POLL TRACKING: Vote storage complete");
      console.log("   Votes stored: " + _0x3a5832);
      console.log("   Votes skipped (duplicates): " + _0x210840);
      console.log("   Final counts:", _0x2f3d7d);
      return {
        success: true,
        deduped: false,
        counts: _0x2f3d7d
      };
    } catch (_0x5bd072) {
      console.error("❌ POLL TRACKING: Error storing aggregated poll votes:", _0x5bd072);
      return {
        success: false,
        deduped: false,
        counts: {}
      };
    }
  }
  async recordAggregationFailure(_0x335afb) {
    const {
      pollMessageId: _0x1a59f7,
      voteUpdateId = null,
      failureTime = new Date().toISOString()
    } = _0x335afb || {};
    const _0x5f4dfd = {
      pollMessageId: _0x1a59f7,
      voteUpdateId: voteUpdateId,
      failureTime: failureTime
    };
    this.aggregationFailures.push(_0x5f4dfd);
    this.logger.error("⚠️ POLL AGGREGATION FAILURE: poll=" + _0x1a59f7 + " voteUpdateId=" + voteUpdateId + " at=" + failureTime);
    const _0x4ad722 = await this.getOptionVoteCounts(_0x1a59f7);
    return {
      entry: _0x5f4dfd,
      retainedCounts: _0x4ad722
    };
  }
  getAggregationFailures(_0x109420 = null) {
    if (_0x109420 === null || _0x109420 === undefined) {
      return [...this.aggregationFailures];
    }
    return this.aggregationFailures.filter(_0x499dbc => _0x499dbc.pollMessageId === _0x109420);
  }
  async storePollMessage(_0x137f54) {
    try {
      const {
        messageId: _0x4a9eef,
        sessionId: _0x4bd4f5,
        senderJid: _0x535ec0,
        recipientJid: _0xf52593,
        pollQuestion: _0x2f99ac,
        pollOptions: _0x3bac5b,
        selectableCount = 1,
        campaignId = null,
        templateId = null,
        sentAt = new Date().toISOString()
      } = _0x137f54;
      const _0xb00d1d = await this.db.query("\n        INSERT INTO poll_messages (\n          message_id, session_id, sender_jid, recipient_jid, \n          poll_question, poll_options, selectable_count, \n          campaign_id, template_id, sent_at\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [_0x4a9eef, _0x4bd4f5, _0x535ec0, _0xf52593, _0x2f99ac, JSON.stringify(_0x3bac5b), selectableCount, campaignId, templateId, sentAt]);
      if (!_0xb00d1d.success) {
        console.error("❌ POLL TRACKING: Error storing poll message:", _0xb00d1d.error);
        return null;
      }
      const _0x4b6b1f = _0xb00d1d.data.lastID;
      for (let _0x3cf1d8 = 0; _0x3cf1d8 < _0x3bac5b.length; _0x3cf1d8++) {
        const _0x126eef = _0x3bac5b[_0x3cf1d8];
        const _0x1a1c2b = typeof _0x126eef === "string" ? _0x126eef : _0x126eef.text;
        const _0x3cdf74 = crypto.createHash("sha256").update(_0x1a1c2b).digest("hex");
        await this.db.query("\n          INSERT INTO poll_options (\n            poll_message_id, option_text, option_index, option_hash\n          ) VALUES (?, ?, ?, ?)\n        ", [_0x4b6b1f, _0x1a1c2b, _0x3cf1d8, _0x3cdf74]);
      }
      return _0x4b6b1f;
    } catch (_0x2c9c28) {
      console.error("❌ POLL TRACKING: Error storing poll message:", _0x2c9c28);
      return null;
    }
  }
  async storePollVotes(_0x2aaf8c) {
    try {
      const {
        pollMessageId: _0x27a5a0,
        pollResults: _0x384dde,
        pollUpdates = [],
        voteUpdateId = null
      } = _0x2aaf8c;
      const _0x5dd027 = await this.db.query("\n        SELECT id, option_text, option_hash, option_index FROM poll_options\n        WHERE poll_message_id = ?\n        ORDER BY option_index\n      ", [_0x27a5a0]);
      if (!_0x5dd027.success || !_0x5dd027.data) {
        console.error("❌ POLL TRACKING: Could not find poll options for poll:", _0x27a5a0);
        return false;
      }
      const _0x519e68 = Array.isArray(_0x5dd027.data) ? _0x5dd027.data : _0x5dd027.data.values || [];
      if (!_0x384dde || !Array.isArray(_0x384dde) || _0x384dde.length === 0) {
        console.error("❌ POLL TRACKING: No aggregated poll results available from Baileys - vote processing failed");
        return false;
      }
      for (const _0x24bf5c of _0x384dde) {
        const {
          name: _0x326c7c,
          voters: _0x33d3e7
        } = _0x24bf5c;
        const _0xb825b2 = _0x519e68.find(_0x2cc21a => _0x2cc21a.option_text === _0x326c7c);
        if (!_0xb825b2) {
          continue;
        }
        for (const _0x464108 of _0x33d3e7) {
          const _0x3a5c05 = await this.db.query("\n            SELECT id FROM poll_votes\n            WHERE poll_message_id = ? AND voter_jid = ? AND poll_option_id = ?\n          ", [_0x27a5a0, _0x464108, _0xb825b2.id]);
          const _0x4504a4 = _0x3a5c05.success && _0x3a5c05.data && (Array.isArray(_0x3a5c05.data) && _0x3a5c05.data.length > 0 || !Array.isArray(_0x3a5c05.data) && _0x3a5c05.data.values?.length > 0);
          if (!_0x4504a4) {
            const _0x16ba6f = await this.db.query("\n              INSERT INTO poll_votes (\n                poll_message_id, poll_option_id, voter_jid, vote_message_id,\n                voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback, vote_update_id\n              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n            ", [_0x27a5a0, _0xb825b2.id, _0x464108, "vote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), new Date().toISOString(), Date.now(), 1, 0, voteUpdateId]);
            if (_0x16ba6f.success) {} else {
              console.error("❌ POLL TRACKING: Error storing decrypted vote:", _0x16ba6f.error);
            }
          } else {}
        }
      }
      return true;
    } catch (_0x39184c) {
      console.error("❌ POLL TRACKING: Error storing poll votes:", _0x39184c);
      return false;
    }
  }
  async storeFailedPollVote(_0x328b09) {
    try {
      const {
        pollMessageId: _0x2a3154,
        voterJid: _0x2a0f4d,
        encryptedData: _0x130701,
        failureReason: _0x280930
      } = _0x328b09;
      const _0x369ae2 = await this.db.query("\n        INSERT INTO poll_votes (\n          poll_message_id, poll_option_id, voter_jid, vote_message_id,\n          voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n      ", [_0x2a3154, null, _0x2a0f4d, "failed_vote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), new Date().toISOString(), Date.now(), 0, 1]);
      if (_0x369ae2.success) {
        return true;
      } else {
        console.error("❌ POLL TRACKING: Failed to store failed vote attempt");
        return false;
      }
    } catch (_0x1cce07) {
      console.error("❌ POLL TRACKING: Error storing failed poll vote:", _0x1cce07);
      return false;
    }
  }
  async getVotesByPollId(_0xc73372) {
    try {
      const _0x36d803 = await this.db.query("SELECT id, poll_option_id, voter_jid, voted_at, is_valid\n         FROM poll_votes\n         WHERE poll_message_id = ? AND is_valid = 1\n         ORDER BY voted_at ASC", [_0xc73372]);
      return this._rows(_0x36d803);
    } catch (_0x4465cb) {
      console.error("❌ POLL TRACKING: Error getting votes by poll ID:", _0x4465cb);
      return [];
    }
  }
  async storeVote(_0x5903d5) {
    try {
      const {
        poll_id: _0x32856e,
        voter_jid: _0x2678fd,
        selected_option: _0x32c580,
        vote_message_id: _0x5948f1,
        voted_at: _0x4b5ad4
      } = _0x5903d5 || {};
      if (!_0x32856e || !_0x2678fd || !_0x32c580) {
        console.error("❌ POLL TRACKING storeVote: missing required fields");
        return false;
      }
      const _0x3c0747 = typeof _0x32c580 === "string" ? _0x32c580 : _0x32c580.text || _0x32c580.option_text || String(_0x32c580);
      const _0x265083 = await this.db.query("SELECT id FROM poll_options WHERE poll_message_id = ? AND option_text = ? LIMIT 1", [_0x32856e, _0x3c0747]);
      const _0x56aa6f = this._rows(_0x265083);
      const _0x253eb4 = _0x56aa6f.length > 0 ? _0x56aa6f[0].id : null;
      if (_0x253eb4) {
        const _0x51f03c = await this.db.query("SELECT id FROM poll_votes\n           WHERE poll_message_id = ? AND voter_jid = ? AND poll_option_id = ? LIMIT 1", [_0x32856e, _0x2678fd, _0x253eb4]);
        if (this._rows(_0x51f03c).length > 0) {
          return true;
        }
      }
      const _0x5d7b18 = await this.db.query("INSERT INTO poll_votes (\n           poll_message_id, poll_option_id, voter_jid, vote_message_id,\n           voted_at, sender_timestamp_ms, is_valid, is_encrypted_fallback\n         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [_0x32856e, _0x253eb4, _0x2678fd, _0x5948f1 || "vote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9), _0x4b5ad4 || new Date().toISOString(), Date.now(), _0x253eb4 ? 1 : 0, 1]);
      if (!_0x5d7b18.success) {
        console.error("❌ POLL TRACKING storeVote: DB error:", _0x5d7b18.error);
        return false;
      }
      return true;
    } catch (_0x342b70) {
      console.error("❌ POLL TRACKING storeVote: exception:", _0x342b70);
      return false;
    }
  }
  async getPollByMessageId(_0x39d18c) {
    try {
      const _0x52ab4e = await this.db.query("\n        SELECT * FROM poll_messages WHERE message_id = ?\n      ", [_0x39d18c]);
      if (!_0x52ab4e.success || !_0x52ab4e.data) {
        return null;
      }
      const _0x3f4f8b = Array.isArray(_0x52ab4e.data) ? _0x52ab4e.data[0] : _0x52ab4e.data.values && _0x52ab4e.data.values[0];
      return _0x3f4f8b || null;
    } catch (_0x1ec85a) {
      console.error("❌ POLL TRACKING: Error getting poll by message ID:", _0x1ec85a);
      return null;
    }
  }
  async getPollOptions(_0x2ae3fc) {
    try {
      const _0x330c9c = await this.db.query("\n        SELECT id, option_text, option_index, option_hash\n        FROM poll_options\n        WHERE poll_message_id = ?\n        ORDER BY option_index\n      ", [_0x2ae3fc]);
      if (!_0x330c9c.success || !_0x330c9c.data) {
        return [];
      }
      if (Array.isArray(_0x330c9c.data)) {
        return _0x330c9c.data;
      } else {
        return _0x330c9c.data.values || [];
      }
    } catch (_0x20a79c) {
      console.error("❌ POLL TRACKING: Error getting poll options:", _0x20a79c);
      return [];
    }
  }
  async getPollReports(_0x5b9108 = null) {
    try {
      let _0x576ebd = "WHERE pm.is_active = 1";
      let _0x1746ee = [];
      if (_0x5b9108 && _0x5b9108.startDate && _0x5b9108.endDate) {
        _0x576ebd += " AND pm.sent_at >= ? AND pm.sent_at <= ?";
        _0x1746ee.push(_0x5b9108.startDate + " 00:00:00", _0x5b9108.endDate + " 23:59:59");
      }
      const _0x38eb65 = await this.db.query("\n        SELECT \n          pm.*,\n          COUNT(DISTINCT pv.voter_jid) as total_voters,\n          COUNT(pv.id) as total_votes,\n          mt.name as template_name,\n          bc.name as campaign_name,\n          ws.device_name\n        FROM poll_messages pm\n        LEFT JOIN poll_votes pv ON pm.id = pv.poll_message_id AND pv.is_valid = 1\n        LEFT JOIN message_templates mt ON pm.template_id = mt.id\n        LEFT JOIN bulk_campaigns bc ON pm.campaign_id = bc.id\n        LEFT JOIN whatsapp_sessions ws ON pm.session_id = ws.session_id\n        " + _0x576ebd + "\n        GROUP BY pm.id\n        ORDER BY pm.sent_at DESC\n      ", _0x1746ee);
      if (!_0x38eb65.success) {
        console.error("❌ POLL TRACKING: Error getting poll reports:", _0x38eb65.error);
        return [];
      }
      if (Array.isArray(_0x38eb65.data)) {
        return _0x38eb65.data;
      } else if (_0x38eb65.data && _0x38eb65.data.values) {
        return _0x38eb65.data.values;
      } else {
        return [];
      }
    } catch (_0x5466b7) {
      console.error("❌ POLL TRACKING: Error getting poll reports:", _0x5466b7);
      return [];
    }
  }
  async getPollDetails(_0x454486) {
    try {
      const _0x1e007c = await this.db.query("\n        SELECT pm.*, mt.name as template_name, bc.name as campaign_name\n        FROM poll_messages pm\n        LEFT JOIN message_templates mt ON pm.template_id = mt.id\n        LEFT JOIN bulk_campaigns bc ON pm.campaign_id = bc.id\n        WHERE pm.id = ?\n      ", [_0x454486]);
      if (!_0x1e007c.success || !_0x1e007c.data) {
        return null;
      }
      const _0xc240d5 = Array.isArray(_0x1e007c.data) ? _0x1e007c.data[0] : _0x1e007c.data.values && _0x1e007c.data.values[0];
      const _0x458801 = await this.db.query("\n        SELECT \n          po.*,\n          COUNT(pv.id) as vote_count,\n          GROUP_CONCAT(pv.voter_jid) as voters\n        FROM poll_options po\n        LEFT JOIN poll_votes pv ON po.id = pv.poll_option_id AND pv.is_valid = 1\n        WHERE po.poll_message_id = ?\n        GROUP BY po.id\n        ORDER BY po.option_index\n      ", [_0x454486]);
      const _0x39bd90 = Array.isArray(_0x458801.data) ? _0x458801.data : _0x458801.data && _0x458801.data.values ? _0x458801.data.values : [];
      const _0x423ef9 = await this.db.query("\n        SELECT \n          pv.*,\n          po.option_text,\n          po.option_index\n        FROM poll_votes pv\n        JOIN poll_options po ON pv.poll_option_id = po.id\n        WHERE pv.poll_message_id = ? AND pv.is_valid = 1\n        ORDER BY pv.voted_at DESC\n      ", [_0x454486]);
      const _0x746cb0 = Array.isArray(_0x423ef9.data) ? _0x423ef9.data : _0x423ef9.data && _0x423ef9.data.values ? _0x423ef9.data.values : [];
      return {
        poll: _0xc240d5,
        options: _0x39bd90,
        votes: _0x746cb0
      };
    } catch (_0x3914c7) {
      console.error("❌ POLL TRACKING: Error getting poll details:", _0x3914c7);
      return null;
    }
  }
  async getRecentPolls(_0x4a79e5 = 24) {
    try {
      const _0x487db4 = new Date(Date.now() - _0x4a79e5 * 60 * 60 * 1000).toISOString();
      const _0x38bb07 = await this.db.query("\n        SELECT * FROM poll_messages\n        WHERE is_active = 1 AND sent_at >= ?\n        ORDER BY sent_at DESC\n      ", [_0x487db4]);
      if (_0x38bb07.success) {
        if (Array.isArray(_0x38bb07.data)) {
          return _0x38bb07.data;
        } else if (_0x38bb07.data && _0x38bb07.data.values) {
          return _0x38bb07.data.values.map(_0x2d6e32 => {
            const _0x5de4e5 = _0x38bb07.data.columns;
            const _0x34b0eb = {};
            _0x5de4e5.forEach((_0x37e56b, _0x1aaa4f) => {
              _0x34b0eb[_0x37e56b] = _0x2d6e32[_0x1aaa4f];
            });
            return _0x34b0eb;
          });
        } else {
          return [];
        }
      }
      return [];
    } catch (_0x119073) {
      console.error("❌ POLL TRACKING: Error getting recent polls:", _0x119073);
      return [];
    }
  }
  async getPollAnalytics(_0x5ad082 = null) {
    try {
      let _0x3db8fa = "WHERE pm.is_active = 1";
      let _0x281c6a = [];
      if (_0x5ad082 && _0x5ad082.startDate && _0x5ad082.endDate) {
        _0x3db8fa += " AND pm.sent_at >= ? AND pm.sent_at <= ?";
        _0x281c6a.push(_0x5ad082.startDate + " 00:00:00", _0x5ad082.endDate + " 23:59:59");
      }
      const _0x25cef0 = await this.db.query("\n        SELECT \n          COUNT(DISTINCT pm.id) as total_polls,\n          COUNT(DISTINCT pv.voter_jid) as total_voters,\n          COUNT(pv.id) as total_votes,\n          AVG(vote_counts.vote_count) as avg_votes_per_poll,\n          MAX(vote_counts.vote_count) as max_votes_poll,\n          COUNT(DISTINCT pm.campaign_id) as campaigns_with_polls\n        FROM poll_messages pm\n        LEFT JOIN poll_votes pv ON pm.id = pv.poll_message_id AND pv.is_valid = 1\n        LEFT JOIN (\n          SELECT poll_message_id, COUNT(*) as vote_count\n          FROM poll_votes \n          WHERE is_valid = 1\n          GROUP BY poll_message_id\n        ) vote_counts ON pm.id = vote_counts.poll_message_id\n        " + _0x3db8fa + "\n      ", _0x281c6a);
      if (!_0x25cef0.success) {
        console.error("❌ POLL TRACKING: Error getting poll analytics:", _0x25cef0.error);
        return null;
      }
      if (Array.isArray(_0x25cef0.data)) {
        return _0x25cef0.data[0];
      } else if (_0x25cef0.data && _0x25cef0.data.values) {
        return _0x25cef0.data.values[0];
      } else {
        return null;
      }
    } catch (_0x409418) {
      console.error("❌ POLL TRACKING: Error getting poll analytics:", _0x409418);
      return null;
    }
  }
}
module.exports = PollTrackingService;