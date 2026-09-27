import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
export function formatPhoneNumber(_0xcc8733, _0x221b2d = null) {
  try {
    let _0x5976d2 = _0xcc8733;
    if (_0xcc8733 && _0xcc8733.includes("@")) {
      _0x5976d2 = _0xcc8733.split("@")[0];
    }
    _0x5976d2 = _0x5976d2.replace(/[^\d+]/g, "");
    if (!_0x5976d2) {
      return _0xcc8733 || "";
    }
    if (!_0x5976d2.startsWith("+")) {
      _0x5976d2 = "+" + _0x5976d2;
    }
    try {
      const _0x4d1958 = parsePhoneNumber(_0x5976d2, _0x221b2d);
      if (_0x4d1958 && _0x4d1958.isValid()) {
        return _0x4d1958.formatInternational();
      }
    } catch (_0x1b13d5) {}
    return formatPhoneNumberBasic(_0x5976d2);
  } catch (_0x2c584f) {
    console.error("Error formatting phone number:", _0x2c584f);
    return _0xcc8733 || "";
  }
}
function formatPhoneNumberBasic(_0x6cb333) {
  const _0x412f83 = _0x6cb333.replace(/\+/g, "");
  if (_0x412f83.length === 12) {
    return "+" + _0x412f83.slice(0, 2) + " " + _0x412f83.slice(2, 5) + " " + _0x412f83.slice(5, 8) + " " + _0x412f83.slice(8);
  } else if (_0x412f83.length === 11) {
    return "+" + _0x412f83.slice(0, 1) + " " + _0x412f83.slice(1, 4) + " " + _0x412f83.slice(4, 7) + " " + _0x412f83.slice(7);
  } else if (_0x412f83.length === 10) {
    return "+" + _0x412f83.slice(0, 2) + " " + _0x412f83.slice(2, 5) + " " + _0x412f83.slice(5, 8) + " " + _0x412f83.slice(8);
  } else if (_0x412f83.length > 10) {
    return "+" + _0x412f83.slice(0, 2) + " " + _0x412f83.slice(2);
  } else {
    return "+" + _0x412f83;
  }
}
export function isValidPhone(_0x13eb29, _0x38588d = null) {
  try {
    let _0x26b15d = _0x13eb29;
    if (_0x13eb29 && _0x13eb29.includes("@")) {
      _0x26b15d = _0x13eb29.split("@")[0];
    }
    if (!_0x26b15d.startsWith("+")) {
      _0x26b15d = "+" + _0x26b15d;
    }
    return isValidPhoneNumber(_0x26b15d, _0x38588d);
  } catch (_0x1e401e) {
    return false;
  }
}
export function extractPhoneFromJid(_0x419d3d) {
  if (!_0x419d3d) {
    return "";
  }
  return _0x419d3d.split("@")[0];
}
export function getDisplayName({
  contactName: _0x3e63b2,
  resolvedName: _0x3494ff,
  pushName: _0x3d03c2,
  phone: _0x280f14
}) {
  const _0x51d0ae = _0x360eb3 => !_0x360eb3 || !_0x360eb3.trim() || /^[+0-9\s\-()]{6,}$/.test(_0x360eb3.trim()) || /^Contact\s+[0-9]+$/i.test(_0x360eb3.trim());
  if (!_0x51d0ae(_0x3e63b2)) {
    return _0x3e63b2.trim();
  }
  if (!_0x51d0ae(_0x3494ff)) {
    return _0x3494ff.trim();
  }
  if (!_0x51d0ae(_0x3d03c2)) {
    return _0x3d03c2.trim();
  }
  if (_0x280f14) {
    return formatPhoneNumber(_0x280f14);
  }
  return "Unknown";
}