const isSessionConnected = _0x1f3100 => {
  if (!_0x1f3100) {
    return false;
  }
  if (_0x1f3100.isLoggedIn === true) {
    return true;
  }
  if (_0x1f3100.realTimeStatus === "connected") {
    return true;
  }
  return _0x1f3100.status === "connected";
};
const getConnectedSessions = _0x4da4e2 => {
  if (!Array.isArray(_0x4da4e2)) {
    return [];
  }
  return _0x4da4e2.filter(isSessionConnected);
};
const getSessionDisplayName = _0x295168 => {
  if (!_0x295168) {
    return "Unknown Session";
  }
  return _0x295168.name || _0x295168.deviceName || _0x295168.device_name || _0x295168.sessionId || _0x295168.session_id || _0x295168.id || "Unknown Session";
};
const getSessionId = _0x119144 => {
  if (!_0x119144) {
    return null;
  }
  return _0x119144.sessionId || _0x119144.session_id || _0x119144.id;
};
const debugSessions = (_0x44c849, _0x1a557a = "Unknown") => {};
export { isSessionConnected, getConnectedSessions, getSessionDisplayName, getSessionId, debugSessions };
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isSessionConnected: isSessionConnected,
    getConnectedSessions: getConnectedSessions,
    getSessionDisplayName: getSessionDisplayName,
    getSessionId: getSessionId,
    debugSessions: debugSessions
  };
}