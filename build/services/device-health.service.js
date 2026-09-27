const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const devLog = (..._0xa36b92) => {
  if (isDev) {
    console.log(..._0xa36b92);
  }
};
const devError = (..._0x185b76) => {
  if (isDev) {
    console.error(..._0x185b76);
  }
};
const WEIGHTS = {
  velocity: 20,
  failureRate: 20,
  replyRatio: 25,
  coldContacts: 10,
  stability: 15,
  optOutRate: 10
};
const RISK_BANDS = [{
  level: "healthy",
  min: 80
}, {
  level: "elevated",
  min: 60
}, {
  level: "at_risk",
  min: 35
}, {
  level: "critical",
  min: 0
}];
const MIN_SAMPLES = {
  velocity: 0,
  failureRate: 20,
  replyRatio: 20,
  coldContacts: 20,
  stability: 0,
  optOutRate: 100
};
const BASELINE_CONFIDENCE_THRESHOLD = 0.5;
const AGE_TIERS = [{
  maxAgeDays: 3,
  label: "brand_new",
  safeDailyLimit: 30,
  scoreCeiling: 60
}, {
  maxAgeDays: 7,
  label: "new",
  safeDailyLimit: 80,
  scoreCeiling: 75
}, {
  maxAgeDays: 30,
  label: "warming",
  safeDailyLimit: 300,
  scoreCeiling: 90
}, {
  maxAgeDays: 90,
  label: "established",
  safeDailyLimit: 800,
  scoreCeiling: 100
}, {
  maxAgeDays: Infinity,
  label: "mature",
  safeDailyLimit: 1500,
  scoreCeiling: 100
}];
function gradeMetric(_0x459fa1, _0x1a01fa, _0x1f7af2) {
  if (!Number.isFinite(_0x459fa1)) {
    return 100;
  }
  if (_0x1a01fa <= _0x1f7af2) {
    if (_0x459fa1 <= _0x1a01fa) {
      return 100;
    }
    if (_0x459fa1 >= _0x1f7af2) {
      return 0;
    }
    return Math.round((1 - (_0x459fa1 - _0x1a01fa) / (_0x1f7af2 - _0x1a01fa)) * 100);
  }
  if (_0x459fa1 >= _0x1a01fa) {
    return 100;
  }
  if (_0x459fa1 <= _0x1f7af2) {
    return 0;
  }
  return Math.round((_0x459fa1 - _0x1f7af2) / (_0x1a01fa - _0x1f7af2) * 100);
}
class DeviceHealthService {
  constructor(_0x183b85) {
    this.database = _0x183b85;
    this.logger = console;
  }
  setDatabaseService(_0x14c4d8) {
    this.database = _0x14c4d8;
  }
  async _all(_0x4cd117, _0x3f4726 = []) {
    try {
      const _0x228214 = await this.database.all(_0x4cd117, _0x3f4726);
      if (Array.isArray(_0x228214)) {
        return _0x228214;
      }
      if (_0x228214 && _0x228214.success === false && _0x228214.error) {
        devError("[DeviceHealth] Query returned no rows (" + _0x228214.error + "): " + _0x4cd117.replace(/\s+/g, " ").slice(0, 120));
        return [];
      }
      if (_0x228214 && Array.isArray(_0x228214.data)) {
        return _0x228214.data;
      }
      if (_0x228214 && _0x228214.success && Array.isArray(_0x228214.rows)) {
        return _0x228214.rows;
      }
      return [];
    } catch (_0x25c4af) {
      devError("[DeviceHealth] Query failed: " + _0x25c4af.message);
      return [];
    }
  }
  async _one(_0x2a51da, _0x43af35 = []) {
    const _0x2714b1 = await this._all(_0x2a51da, _0x43af35);
    if (_0x2714b1.length > 0) {
      return _0x2714b1[0];
    } else {
      return {};
    }
  }
  async _run(_0x2fd1b1, _0x314343 = []) {
    try {
      return await this.database.run(_0x2fd1b1, _0x314343);
    } catch (_0x25f752) {
      devError("[DeviceHealth] Write failed: " + _0x25f752.message);
      return null;
    }
  }
  async _resolveSession(_0x3bb385) {
    const _0x4a7426 = await this._one("SELECT id, session_id, phone_number, created_at, status, is_active\n       FROM whatsapp_sessions WHERE session_id = ? LIMIT 1", [_0x3bb385]);
    return {
      rowId: _0x4a7426.id ?? -1,
      sessionId: _0x4a7426.session_id || _0x3bb385,
      phoneNumber: _0x4a7426.phone_number || null,
      createdAt: _0x4a7426.created_at || null,
      status: _0x4a7426.status || "unknown",
      isActive: _0x4a7426.is_active !== 0
    };
  }
  async _getMessageCounts(_0x5425fc, _0x3d7ef6) {
    const _0x34d8bc = await this._one("SELECT\n         SUM(CASE WHEN timestamp >= datetime('now','-1 day')  THEN 1 ELSE 0 END) AS sent24h,\n         SUM(CASE WHEN timestamp >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS sent7d\n       FROM message_history\n       WHERE direction = 'outgoing' AND (session_id = ? OR session_id = ?)", [_0x5425fc, _0x3d7ef6]);
    return {
      sent24h: Number(_0x34d8bc.sent24h) || 0,
      sent7d: Number(_0x34d8bc.sent7d) || 0
    };
  }
  async _getFailureRate(_0x4b47ad) {
    const _0x1da179 = await this._one("SELECT\n         SUM(CASE WHEN status IN ('sent','delivered') THEN 1 ELSE 0 END) AS ok,\n         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed\n       FROM bulk_campaign_recipients\n       WHERE session_id = ?\n         AND COALESCE(sent_at, updated_at) >= datetime('now','-1 day')", [_0x4b47ad]);
    const _0x3a6e94 = Number(_0x1da179.ok) || 0;
    const _0x46afd1 = Number(_0x1da179.failed) || 0;
    const _0x3b6e93 = _0x3a6e94 + _0x46afd1;
    return {
      failureRate: _0x3b6e93 > 0 ? _0x46afd1 / _0x3b6e93 : 0,
      attempted24h: _0x3b6e93,
      failed24h: _0x46afd1
    };
  }
  async _getReplyRatio(_0x49b6e2, _0x310857) {
    const _0x2526cd = await this._one("SELECT\n         COUNT(DISTINCT CASE WHEN direction = 'outgoing' THEN contact_phone END) AS reached,\n         COUNT(DISTINCT CASE WHEN direction = 'incoming' THEN contact_phone END) AS replied\n       FROM message_history\n       WHERE (session_id = ? OR session_id = ?)\n         AND timestamp >= datetime('now','-7 days')", [_0x49b6e2, _0x310857]);
    const _0x2853d8 = Number(_0x2526cd.reached) || 0;
    const _0x3aa997 = Number(_0x2526cd.replied) || 0;
    return {
      replyRatio: _0x2853d8 > 0 ? _0x3aa997 / _0x2853d8 : null,
      contactsReached7d: _0x2853d8,
      contactsReplied7d: _0x3aa997
    };
  }
  async _getColdContactRatio(_0x504bdc, _0x4b5b7c) {
    const _0x56c0f0 = await this._one("SELECT\n         COUNT(DISTINCT o.contact_phone) AS reached,\n         COUNT(DISTINCT CASE WHEN i.contact_phone IS NULL THEN o.contact_phone END) AS cold\n       FROM message_history o\n       LEFT JOIN message_history i\n         ON i.contact_phone = o.contact_phone\n        AND i.direction = 'incoming'\n        AND (i.session_id = ? OR i.session_id = ?)\n       WHERE o.direction = 'outgoing'\n         AND (o.session_id = ? OR o.session_id = ?)\n         AND o.timestamp >= datetime('now','-1 day')", [_0x504bdc, _0x4b5b7c, _0x504bdc, _0x4b5b7c]);
    const _0x210d98 = Number(_0x56c0f0.reached) || 0;
    const _0x15a47a = Number(_0x56c0f0.cold) || 0;
    return {
      coldContactRatio: _0x210d98 > 0 ? _0x15a47a / _0x210d98 : null,
      coldContacts24h: _0x15a47a,
      contactsReached24h: _0x210d98
    };
  }
  async _getInstabilityEvents(_0x512056) {
    const _0x59b7dd = await this._one("SELECT COUNT(*) AS events\n       FROM connection_stability_logs\n       WHERE session_id = ?\n         AND timestamp >= datetime('now','-1 day')\n         AND event IN ('connection_close','connection_lost','reconnect_failed',\n                       'health_check_fail','stream_conflict','bad_session')", [_0x512056]);
    return {
      instabilityEvents24h: Number(_0x59b7dd.events) || 0
    };
  }
  async _getOptOutRate(_0x14bd7c, _0xca94c9) {
    const _0x569fd9 = await this._one("SELECT COUNT(*) AS optOuts\n       FROM opt_out_requests\n       WHERE session_id = ? AND created_at >= datetime('now','-7 days')", [_0x14bd7c]);
    const _0xce972f = Number(_0x569fd9.optOuts) || 0;
    return {
      optOuts7d: _0xce972f,
      optOutRate: _0xca94c9 > 0 ? _0xce972f / _0xca94c9 * 1000 : 0
    };
  }
  async _getWarmerActivity(_0x3e1bcb) {
    const _0x23deef = await this._one("SELECT COUNT(*) AS warmed\n       FROM warmer_logs\n       WHERE sender_session_id = ?\n         AND status = 'sent'\n         AND created_at >= datetime('now','-7 days')", [_0x3e1bcb]);
    return {
      warmerMessages7d: Number(_0x23deef.warmed) || 0
    };
  }
  static _ageTier(_0x59a504) {
    return AGE_TIERS.find(_0x382cb9 => _0x59a504 <= _0x382cb9.maxAgeDays) || AGE_TIERS[AGE_TIERS.length - 1];
  }
  static _riskLevel(_0x3fb62a) {
    return (RISK_BANDS.find(_0x35809e => _0x3fb62a >= _0x35809e.min) || RISK_BANDS[RISK_BANDS.length - 1]).level;
  }
  async computeScore(_0x4d9f9b, {
    persist = true
  } = {}) {
    const _0x9d8c7f = await this._resolveSession(_0x4d9f9b);
    const _0x56862c = _0x9d8c7f.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(_0x9d8c7f.createdAt).getTime()) / 86400000)) : 0;
    const _0x7fedfa = DeviceHealthService._ageTier(_0x56862c);
    const [_0x290c1f, _0x72f82, _0x4fbda3, _0x4cd16f, _0x3c2b08, _0x54f411] = await Promise.all([this._getMessageCounts(_0x4d9f9b, _0x9d8c7f.rowId), this._getFailureRate(_0x4d9f9b), this._getReplyRatio(_0x4d9f9b, _0x9d8c7f.rowId), this._getColdContactRatio(_0x4d9f9b, _0x9d8c7f.rowId), this._getInstabilityEvents(_0x4d9f9b), this._getWarmerActivity(_0x4d9f9b)]);
    const _0x148fe0 = await this._getOptOutRate(_0x4d9f9b, _0x290c1f.sent7d);
    const _0x312fbb = _0x290c1f.sent24h / _0x7fedfa.safeDailyLimit;
    const _0x5720cd = {
      velocity: {
        weight: WEIGHTS.velocity,
        score: gradeMetric(_0x312fbb, 0.5, 2),
        value: _0x312fbb,
        sampleSize: _0x290c1f.sent24h,
        minSample: MIN_SAMPLES.velocity,
        label: _0x290c1f.sent24h + " sent / " + _0x7fedfa.safeDailyLimit + " safe"
      },
      failureRate: {
        weight: WEIGHTS.failureRate,
        score: gradeMetric(_0x72f82.failureRate, 0.02, 0.25),
        value: _0x72f82.failureRate,
        sampleSize: _0x72f82.attempted24h,
        minSample: MIN_SAMPLES.failureRate,
        label: (_0x72f82.failureRate * 100).toFixed(1) + "% failed"
      },
      replyRatio: {
        weight: WEIGHTS.replyRatio,
        score: _0x4fbda3.replyRatio === null ? 100 : gradeMetric(_0x4fbda3.replyRatio, 0.1, 0.005),
        value: _0x4fbda3.replyRatio,
        sampleSize: _0x4fbda3.contactsReached7d,
        minSample: MIN_SAMPLES.replyRatio,
        label: ((_0x4fbda3.replyRatio || 0) * 100).toFixed(1) + "% replied"
      },
      coldContacts: {
        weight: WEIGHTS.coldContacts,
        score: _0x4cd16f.coldContactRatio === null ? 100 : gradeMetric(_0x4cd16f.coldContactRatio, 0.75, 0.98),
        value: _0x4cd16f.coldContactRatio,
        sampleSize: _0x4cd16f.contactsReached24h,
        minSample: MIN_SAMPLES.coldContacts,
        label: ((_0x4cd16f.coldContactRatio || 0) * 100).toFixed(0) + "% never replied"
      },
      stability: {
        weight: WEIGHTS.stability,
        score: gradeMetric(_0x3c2b08.instabilityEvents24h, 1, 10),
        value: _0x3c2b08.instabilityEvents24h,
        sampleSize: 1,
        minSample: MIN_SAMPLES.stability,
        label: _0x3c2b08.instabilityEvents24h + " disconnects/24h"
      },
      optOutRate: {
        weight: WEIGHTS.optOutRate,
        score: gradeMetric(_0x148fe0.optOutRate, 0, 20),
        value: _0x148fe0.optOutRate,
        sampleSize: _0x290c1f.sent7d,
        minSample: MIN_SAMPLES.optOutRate,
        label: _0x148fe0.optOuts7d + " opt-outs/7d"
      }
    };
    Object.values(_0x5720cd).forEach(_0x4a0794 => {
      _0x4a0794.sufficient = _0x4a0794.sampleSize >= _0x4a0794.minSample;
      if (!_0x4a0794.sufficient) {
        _0x4a0794.label = _0x4a0794.sampleSize + "/" + _0x4a0794.minSample + " samples — collecting";
      }
    });
    const _0x4386c7 = Object.values(_0x5720cd).filter(_0x45175a => _0x45175a.sufficient);
    const _0x3e3757 = _0x4386c7.reduce((_0xb0e0e7, _0x114e66) => _0xb0e0e7 + _0x114e66.weight, 0);
    const _0x1501b8 = _0x3e3757 / 100;
    const _0x4ce1d5 = _0x1501b8 < BASELINE_CONFIDENCE_THRESHOLD;
    let _0x63f396 = _0x3e3757 > 0 ? _0x4386c7.reduce((_0x7b4df5, _0x3c2517) => _0x7b4df5 + _0x3c2517.score * _0x3c2517.weight, 0) / _0x3e3757 : 100;
    const _0x36b629 = Math.min(5, Math.floor(_0x54f411.warmerMessages7d / 20));
    _0x63f396 = Math.max(0, Math.min(100, _0x63f396 + _0x36b629));
    let _0x22018e = _0x63f396 * (_0x7fedfa.scoreCeiling / 100);
    _0x22018e = Math.max(0, Math.min(_0x7fedfa.scoreCeiling, Math.round(_0x22018e)));
    const _0x4bec1e = await this._one("SELECT ban_suspected_at, ban_reason, cooldown_until\n       FROM whatsapp_sessions WHERE session_id = ? LIMIT 1", [_0x4d9f9b]);
    const _0x1d9602 = !!_0x4bec1e.ban_suspected_at;
    if (_0x1d9602) {
      _0x22018e = 0;
    }
    const _0x27f3c5 = _0x1d9602 ? "critical" : DeviceHealthService._riskLevel(_0x22018e);
    const _0x136e90 = _0x1d9602 ? 0 : Math.max(0, Math.min(_0x7fedfa.safeDailyLimit, Math.round(_0x7fedfa.safeDailyLimit * (_0x22018e / _0x7fedfa.scoreCeiling))));
    const _0x158b29 = {
      sessionId: _0x4d9f9b,
      phoneNumber: _0x9d8c7f.phoneNumber,
      riskScore: _0x22018e,
      riskLevel: _0x27f3c5,
      accountAgeDays: _0x56862c,
      ageTier: _0x7fedfa.label,
      safeDailyLimit: _0x7fedfa.safeDailyLimit,
      recommendedDailyLimit: _0x136e90,
      remainingToday: Math.max(0, _0x136e90 - _0x290c1f.sent24h),
      banSuspected: _0x1d9602,
      banReason: _0x4bec1e.ban_reason || null,
      cooldownUntil: _0x4bec1e.cooldown_until || null,
      warmerBonus: _0x36b629,
      dataConfidence: Math.round(_0x1501b8 * 100) / 100,
      isBaseline: _0x4ce1d5 && !_0x1d9602,
      factors: _0x5720cd,
      metrics: {
        ..._0x290c1f,
        ..._0x72f82,
        ..._0x4fbda3,
        ..._0x4cd16f,
        ..._0x3c2b08,
        ..._0x148fe0,
        ..._0x54f411
      },
      recommendations: this._buildRecommendations(_0x5720cd, _0x7fedfa, _0x290c1f, _0x1d9602, _0x4ce1d5),
      computedAt: new Date().toISOString()
    };
    if (persist) {
      await this._persist(_0x158b29);
    }
    return _0x158b29;
  }
  _buildRecommendations(_0x2a2dbf, _0x117d4a, _0x3f387c, _0x806148, _0x530f98) {
    if (_0x806148) {
      return [{
        severity: "critical",
        code: "ban_suspected",
        message: "This number shows ban indicators. Stop all sending and do not reconnect for at least 72 hours."
      }];
    }
    const _0x1f0cea = [];
    const _0x4ce3bb = _0x3edc48 => _0x2a2dbf[_0x3edc48].sufficient && _0x2a2dbf[_0x3edc48].score < 60;
    if (_0x530f98) {
      _0x1f0cea.push({
        severity: "info",
        code: "baseline",
        message: "Still building a baseline for this number. Send more messages for an accurate risk score — stay under " + _0x117d4a.safeDailyLimit + "/day until then."
      });
    }
    if (_0x4ce3bb("velocity")) {
      _0x1f0cea.push({
        severity: _0x2a2dbf.velocity.score < 30 ? "critical" : "warning",
        code: "velocity",
        message: "Sending above the safe rate for this account age (" + _0x3f387c.sent24h + " in 24h vs " + _0x117d4a.safeDailyLimit + " recommended). Pause or split across more devices."
      });
    }
    if (_0x4ce3bb("replyRatio")) {
      _0x1f0cea.push({
        severity: _0x2a2dbf.replyRatio.score < 30 ? "critical" : "warning",
        code: "reply_ratio",
        message: "Very few recipients are replying. WhatsApp reads one-way traffic as spam — tighten targeting or add an opening question."
      });
    }
    if (_0x4ce3bb("failureRate")) {
      _0x1f0cea.push({
        severity: _0x2a2dbf.failureRate.score < 30 ? "critical" : "warning",
        code: "failure_rate",
        message: "High send-failure rate. Verify numbers before sending and check the assigned proxy."
      });
    }
    if (_0x4ce3bb("stability")) {
      _0x1f0cea.push({
        severity: "warning",
        code: "stability",
        message: "Frequent disconnects detected. Check proxy stability and make sure this number is not open in WhatsApp Web elsewhere."
      });
    }
    if (_0x2a2dbf.coldContacts.sufficient && _0x2a2dbf.coldContacts.score < 50) {
      _0x1f0cea.push({
        severity: "warning",
        code: "cold_contacts",
        message: "Almost all recipients are cold contacts who never reply. Mix in engaged contacts to balance the ratio."
      });
    }
    if (_0x4ce3bb("optOutRate")) {
      _0x1f0cea.push({
        severity: "warning",
        code: "opt_out",
        message: "Elevated opt-out rate. Review message content — recipients are actively asking to stop."
      });
    }
    if (_0x1f0cea.length === 0) {
      _0x1f0cea.push({
        severity: "info",
        code: "healthy",
        message: "No risk indicators detected. Keep sending within the recommended daily limit."
      });
    }
    const _0xab073e = {
      critical: 0,
      warning: 1,
      info: 2
    };
    return _0x1f0cea.sort((_0x4b6f9b, _0x3497fe) => _0xab073e[_0x4b6f9b.severity] - _0xab073e[_0x3497fe.severity]).slice(0, 3);
  }
  async _persist(_0x18ef07) {
    await this._run("INSERT INTO device_health_snapshots (\n         session_id, risk_score, risk_level, factors,\n         messages_24h, messages_7d, failure_rate, reply_ratio,\n         new_contact_ratio, instability_events_24h, opt_out_rate,\n         account_age_days, recommended_daily_limit\n       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [_0x18ef07.sessionId, _0x18ef07.riskScore, _0x18ef07.riskLevel, JSON.stringify(_0x18ef07.factors), _0x18ef07.metrics.sent24h, _0x18ef07.metrics.sent7d, _0x18ef07.metrics.failureRate, _0x18ef07.metrics.replyRatio, _0x18ef07.metrics.coldContactRatio, _0x18ef07.metrics.instabilityEvents24h, _0x18ef07.metrics.optOutRate, _0x18ef07.accountAgeDays, _0x18ef07.recommendedDailyLimit]);
    await this._run("UPDATE whatsapp_sessions\n       SET risk_score = ?, risk_level = ?, risk_computed_at = CURRENT_TIMESTAMP,\n           recommended_daily_limit = ?\n       WHERE session_id = ?", [_0x18ef07.riskScore, _0x18ef07.riskLevel, _0x18ef07.recommendedDailyLimit, _0x18ef07.sessionId]);
  }
  async computeAllScores() {
    const _0x394fe1 = await this._all("SELECT session_id FROM whatsapp_sessions WHERE is_active = 1");
    const _0x3c3a8a = [];
    for (const _0x4213f8 of _0x394fe1) {
      try {
        _0x3c3a8a.push(await this.computeScore(_0x4213f8.session_id));
      } catch (_0x1be966) {
        devError("[DeviceHealth] Scoring failed for " + _0x4213f8.session_id + ": " + _0x1be966.message);
      }
    }
    return _0x3c3a8a;
  }
  async getCachedScores() {
    const _0x42c077 = await this._all("SELECT session_id, name, device_name, phone_number, status,\n              risk_score, risk_level, risk_computed_at, recommended_daily_limit,\n              ban_suspected_at, ban_reason, cooldown_until\n       FROM whatsapp_sessions\n       WHERE is_active = 1");
    return _0x42c077.map(_0x1b3b6b => ({
      sessionId: _0x1b3b6b.session_id,
      name: _0x1b3b6b.device_name || _0x1b3b6b.name,
      phoneNumber: _0x1b3b6b.phone_number,
      status: _0x1b3b6b.status,
      riskScore: _0x1b3b6b.risk_score,
      riskLevel: _0x1b3b6b.risk_level,
      riskComputedAt: _0x1b3b6b.risk_computed_at,
      recommendedDailyLimit: _0x1b3b6b.recommended_daily_limit,
      banSuspected: !!_0x1b3b6b.ban_suspected_at,
      banReason: _0x1b3b6b.ban_reason,
      cooldownUntil: _0x1b3b6b.cooldown_until
    }));
  }
  async getScoreHistory(_0x1448b7, _0xe80fd3 = 14) {
    return this._all("SELECT risk_score, risk_level, messages_24h, created_at\n       FROM device_health_snapshots\n       WHERE session_id = ? AND created_at >= datetime('now', ?)\n       ORDER BY created_at ASC", [_0x1448b7, "-" + _0xe80fd3 + " days"]);
  }
  async recordDisconnect(_0x202351, _0xf1b64a = {}) {
    const {
      reason = "unknown",
      wasManual = false
    } = _0xf1b64a;
    if (wasManual) {
      await this._recordBanEvent(_0x202351, "manual_unlink", "high", reason, null, null);
      return {
        eventType: "manual_unlink",
        confidence: "high",
        banSuspected: false
      };
    }
    let _0x55c41f = null;
    let _0x380b60 = null;
    try {
      _0x55c41f = await this.computeScore(_0x202351, {
        persist: false
      });
      _0x380b60 = _0x55c41f.riskScore;
    } catch (_0x2691ff) {
      devError("[DeviceHealth] Could not profile " + _0x202351 + " on disconnect: " + _0x2691ff.message);
    }
    const _0x48c1ae = _0x55c41f?.metrics?.sent24h ?? 0;
    const _0x100ca7 = _0x55c41f?.metrics?.sent7d ?? 0;
    const _0xe6fdc4 = _0x55c41f?.metrics?.failureRate ?? 0;
    let _0x4f850a = "low";
    if (_0x48c1ae >= 200 || _0x380b60 !== null && _0x380b60 < 35) {
      _0x4f850a = "high";
    } else if (_0x48c1ae >= 50 || _0xe6fdc4 > 0.15 || _0x380b60 !== null && _0x380b60 < 60) {
      _0x4f850a = "medium";
    }
    const _0x3df2c8 = _0x4f850a === "high" || _0x4f850a === "medium";
    const _0x65e24a = _0x3df2c8 ? "suspected_ban" : "manual_unlink";
    await this._recordBanEvent(_0x202351, _0x65e24a, _0x4f850a, reason, _0x380b60, _0x55c41f ? {
      sent24h: _0x48c1ae,
      sent7d: _0x100ca7,
      failureRate: _0xe6fdc4,
      replyRatio: _0x55c41f.metrics.replyRatio,
      coldContactRatio: _0x55c41f.metrics.coldContactRatio,
      instabilityEvents24h: _0x55c41f.metrics.instabilityEvents24h,
      optOuts7d: _0x55c41f.metrics.optOuts7d,
      accountAgeDays: _0x55c41f.accountAgeDays,
      factors: _0x55c41f.factors
    } : null);
    if (_0x3df2c8) {
      await this._run("UPDATE whatsapp_sessions\n         SET ban_suspected_at = CURRENT_TIMESTAMP,\n             ban_reason = ?,\n             risk_score = 0,\n             risk_level = 'critical',\n             cooldown_until = datetime('now', '+72 hours')\n         WHERE session_id = ?", ["Suspected ban (" + _0x4f850a + " confidence): " + _0x48c1ae + " messages in 24h before disconnect", _0x202351]);
      devLog("[DeviceHealth] Suspected ban on " + _0x202351 + " (" + _0x4f850a + " confidence, " + _0x48c1ae + " msgs/24h)");
    }
    return {
      eventType: _0x65e24a,
      confidence: _0x4f850a,
      banSuspected: _0x3df2c8,
      riskScoreAtEvent: _0x380b60
    };
  }
  async _recordBanEvent(_0x5052a0, _0x220330, _0x4fa9db, _0x2f97b6, _0x1abcf1, _0x2b9582) {
    const _0x1a4f73 = await this._resolveSession(_0x5052a0);
    await this._run("INSERT INTO device_ban_events (\n         session_id, phone_number, event_type, confidence,\n         disconnect_reason, risk_score_at_event, profile_snapshot\n       ) VALUES (?, ?, ?, ?, ?, ?, ?)", [_0x5052a0, _0x1a4f73.phoneNumber, _0x220330, _0x4fa9db, _0x2f97b6, _0x1abcf1, _0x2b9582 ? JSON.stringify(_0x2b9582) : null]);
  }
  async getBanEvents(_0x5244a7 = 50) {
    return this._all("SELECT * FROM device_ban_events\n       WHERE event_type IN ('suspected_ban','confirmed_ban')\n       ORDER BY detected_at DESC LIMIT ?", [_0x5244a7]);
  }
  async clearBanFlag(_0xed157f) {
    await this._run("UPDATE whatsapp_sessions\n       SET ban_suspected_at = NULL, ban_reason = NULL, cooldown_until = NULL\n       WHERE session_id = ?", [_0xed157f]);
    await this._run("UPDATE device_ban_events SET acknowledged = 1 WHERE session_id = ?", [_0xed157f]);
    return this.computeScore(_0xed157f);
  }
  async preflightCheck(_0x5870aa = [], _0x360439 = 0) {
    const _0x4bac99 = [];
    let _0x737c0f = 0;
    for (const _0x3ebb0f of _0x5870aa) {
      try {
        const _0xd2fded = await this.computeScore(_0x3ebb0f, {
          persist: false
        });
        _0x737c0f += _0xd2fded.remainingToday;
        _0x4bac99.push({
          sessionId: _0x3ebb0f,
          phoneNumber: _0xd2fded.phoneNumber,
          riskScore: _0xd2fded.riskScore,
          riskLevel: _0xd2fded.riskLevel,
          remainingToday: _0xd2fded.remainingToday,
          recommendedDailyLimit: _0xd2fded.recommendedDailyLimit,
          banSuspected: _0xd2fded.banSuspected,
          topRecommendation: _0xd2fded.recommendations[0] || null
        });
      } catch (_0x186ebe) {
        devError("[DeviceHealth] Preflight failed for " + _0x3ebb0f + ": " + _0x186ebe.message);
      }
    }
    const _0x5510f1 = _0x4bac99.filter(_0x4bc33f => _0x4bc33f.banSuspected);
    const _0x303256 = _0x4bac99.filter(_0x5daa83 => _0x5daa83.riskLevel === "critical" && !_0x5daa83.banSuspected);
    const _0x2b0830 = _0x4bac99.filter(_0x3ceaa7 => _0x3ceaa7.riskLevel === "at_risk");
    const _0x32d9e7 = _0x360439 > _0x737c0f;
    let _0x46a847 = "safe";
    if (_0x5510f1.length > 0 || _0x303256.length > 0) {
      _0x46a847 = "blocked";
    } else if (_0x2b0830.length > 0 || _0x32d9e7) {
      _0x46a847 = "caution";
    }
    const _0x2c970e = [];
    if (_0x5510f1.length > 0) {
      _0x2c970e.push(_0x5510f1.length + " device(s) flagged with suspected bans. Remove them before sending.");
    }
    if (_0x303256.length > 0) {
      _0x2c970e.push(_0x303256.length + " device(s) at critical risk. Sending now is likely to get them banned.");
    }
    if (_0x2b0830.length > 0) {
      _0x2c970e.push(_0x2b0830.length + " device(s) at elevated risk. Consider reducing volume or warming first.");
    }
    if (_0x32d9e7) {
      _0x2c970e.push("Planned " + _0x360439 + " messages exceeds today's safe capacity of " + _0x737c0f + " across the selected devices. Split across more devices or spread over multiple days.");
    }
    return {
      verdict: _0x46a847,
      totalCapacity: _0x737c0f,
      plannedMessageCount: _0x360439,
      overCapacity: _0x32d9e7,
      devices: _0x4bac99,
      warnings: _0x2c970e
    };
  }
}
module.exports = DeviceHealthService;