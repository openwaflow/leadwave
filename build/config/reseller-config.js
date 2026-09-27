const _0x5e9b59 = _0x2a1b;
const _0x2f999b = _0x2a1b;
(function (_0x2d6ad2, _0x5ac9d5) {
  const _0x21f0ff = {
    _0x5b65c1: 354,
    _0xfb20b9: 330,
    _0x56d29b: 331,
    _0x2883ef: 342
  };
  const _0x3dcfe5 = _0x2a1b;
  const _0x596ef0 = _0x2a1b;
  const _0x13d1b3 = _0x2d6ad2();
  while (true) {
    try {
      const _0x4dbf6a = parseInt(_0x3dcfe5(_0x21f0ff._0x5b65c1)) / 1 * (-parseInt(_0x3dcfe5(348)) / 2) + -parseInt(_0x596ef0(_0x21f0ff._0xfb20b9)) / 3 + -parseInt(_0x596ef0(_0x21f0ff._0x56d29b)) / 4 + -parseInt(_0x3dcfe5(344)) / 5 + -parseInt(_0x3dcfe5(_0x21f0ff._0x2883ef)) / 6 + -parseInt(_0x596ef0(351)) / 7 * (parseInt(_0x596ef0(357)) / 8) + parseInt(_0x596ef0(334)) / 9;
      if (_0x4dbf6a === _0x5ac9d5) {
        break;
      } else {
        _0x13d1b3.push(_0x13d1b3.shift());
      }
    } catch (_0x132d3f) {
      _0x13d1b3.push(_0x13d1b3.shift());
    }
  }
})(_0x23c7, 281635);
const path = require(_0x5e9b59(346));
const configEncryption = require(_0x5e9b59(352));
let cachedConfig = null;
let configLoadTime = 0;
const CONFIG_CACHE_DURATION = 300000;
function loadEncryptedConfig() {
  const _0x79c48c = {
    _0x18baba: 329,
    _0x5a406a: 359,
    _0x5ebb6e: 355,
    _0x458e1f: 364
  };
  const _0x2d99c8 = _0x5e9b59;
  const _0x4caba9 = _0x5e9b59;
  try {
    const _0x26c6e5 = Date[_0x2d99c8(_0x79c48c._0x18baba)]();
    if (cachedConfig && _0x26c6e5 - configLoadTime < CONFIG_CACHE_DURATION) {
      return cachedConfig;
    }
    const _0x5e4efc = path.join(__dirname, _0x2d99c8(_0x79c48c._0x5a406a));
    const _0x6761e1 = configEncryption[_0x4caba9(343)](_0x5e4efc);
    configEncryption[_0x2d99c8(362)](_0x6761e1);
    cachedConfig = _0x6761e1;
    configLoadTime = _0x26c6e5;
    return _0x6761e1;
  } catch (_0x3767df) {
    console[_0x4caba9(333)]("Failed to load encrypted configuration:", _0x3767df);
    return {
      RESELLER_CODE: null,
      RESELLER_INFO: {
        name: _0x2d99c8(_0x79c48c._0x5ebb6e),
        logo: null,
        website: null,
        support_email: null,
        support_phone: null
      },
      LICENSE_SERVER: {
        base_url: _0x4caba9(_0x79c48c._0x458e1f),
        api_version: "api"
      },
      APP_BRANDING: {
        show_reseller_info: false,
        custom_title: _0x2d99c8(355),
        splash_message: null
      }
    };
  }
}
const RESELLER_CONFIG = loadEncryptedConfig();
function _0x2a1b(_0x2d0895, _0x578dcd) {
  _0x2d0895 = _0x2d0895 - 328;
  const _0x5a01cd = _0x23c7();
  let _0x1a171b = _0x5a01cd[_0x2d0895];
  if (_0x2a1b.yPwESS === undefined) {
    function _0x5ce1d9(_0x15ffb4) {
      const _0x38218e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
      let _0x343ab7 = "";
      let _0xb7f773 = "";
      for (let _0x44ae85 = 0, _0x219546, _0x41054d, _0x2b0525 = 0; _0x41054d = _0x15ffb4.charAt(_0x2b0525++); ~_0x41054d && (_0x219546 = _0x44ae85 % 4 ? _0x219546 * 64 + _0x41054d : _0x41054d, _0x44ae85++ % 4) ? _0x343ab7 += String.fromCharCode(_0x219546 >> (_0x44ae85 * -2 & 6) & 255) : 0) {
        _0x41054d = _0x38218e.indexOf(_0x41054d);
      }
      for (let _0x311168 = 0, _0x59ef30 = _0x343ab7.length; _0x311168 < _0x59ef30; _0x311168++) {
        _0xb7f773 += "%" + ("00" + _0x343ab7.charCodeAt(_0x311168).toString(16)).slice(-2);
      }
      return decodeURIComponent(_0xb7f773);
    }
    _0x2a1b.zZfyAf = _0x5ce1d9;
    _0x2a1b.NtOSaN = {};
    _0x2a1b.yPwESS = true;
  }
  const _0xc1dddf = _0x5a01cd[0];
  const _0x46ed4f = _0x2d0895 + _0xc1dddf;
  const _0x1a114 = _0x2a1b.NtOSaN[_0x46ed4f];
  if (!_0x1a114) {
    _0x1a171b = _0x2a1b.zZfyAf(_0x1a171b);
    _0x2a1b.NtOSaN[_0x46ed4f] = _0x1a171b;
  } else {
    _0x1a171b = _0x1a114;
  }
  return _0x1a171b;
}
function getResellerCode() {
  const _0x3e2d96 = _0x2f999b;
  const _0x29cdd = loadEncryptedConfig();
  return _0x29cdd[_0x3e2d96(361)];
}
function _0x23c7() {
  const _0x3e1330 = ["tgvHzcbxyxzL", "CgXHDgzVCM0", "mZi1nLbPq1jgyW", "C2HHmJu2", "CMvZzwXSzxiTy29UzMLNlMvUyW", "y3jLyxrLsgfZAa", "uKvtruXmrvjFq09erq", "DMfSAwrHDgvdB25MAwDtDhj1y3r1CMu", "Ag9ZDg5HBwu", "Ahr0Chm6lY9SAwnLBNnLlMDLDgXLywr3yxzLlMLU", "yxbW", "DxbKyxrL", "ms4WlJa", "z2v0vMvYC2LVBG", "l3jLC2vSBgvYl3rYAwfSlwXPy2vUC2u", "BM93", "mtyZndu4mfbeEfresG", "mtG5odG5nKHnrNfxDG", "qvbqx0jsqu5esu5h", "zxjYB3i", "mJu2mZC5mZfstMfHqLC", "Agv4", "zwXLy3rYB24", "uKvtruXmrvjFsu5gtW", "y3j5ChrV", "l2fWAs8", "yxbP", "zxHWB3j0CW", "mZa3nJeYoff0AwvTBW", "Bg9HzevUy3j5ChrLzenVBMzPzW", "mtu0nta4mffIsNHLEa", "zgLNzxn0", "Cgf0Aa", "yMfZzv91CMW", "mKvfq2zkza", "l3rYAwfSl3jLz2LZDgvY", "teLdru5trv9trvjwrvi", "nZe1ngjPuNzjwa", "lI4VC2vJDxjPDhKVy29UzMLNlwvUy3j5ChrPB24", "DhjPBq", "mZa5nZGYDxHguunI"];
  _0x23c7 = function () {
    return _0x3e1330;
  };
  return _0x23c7();
}
function isResellerBuild() {
  const _0xddf4cd = {
    _0x205295: 353
  };
  const _0x4d39e0 = _0x5e9b59;
  const _0x5b018d = _0x2f999b;
  const _0xdb075 = loadEncryptedConfig();
  return _0xdb075.RESELLER_CODE !== null && _0xdb075[_0x4d39e0(361)][_0x4d39e0(_0xddf4cd._0x205295)]() !== "";
}
function getResellerInfo() {
  const _0x43d3f = _0x5e9b59;
  const _0x2fc0a9 = loadEncryptedConfig();
  return _0x2fc0a9[_0x43d3f(337)] || {};
}
function getLicenseServerConfig() {
  const _0x5bba5f = {
    _0x2f3e28: 350,
    _0x468189: 340
  };
  const _0x16d0c2 = _0x5e9b59;
  const _0x2ccb3c = _0x2f999b;
  const _0x2c66da = loadEncryptedConfig();
  return _0x2c66da[_0x16d0c2(_0x5bba5f._0x2f3e28)] || {
    base_url: "https://license.getleadwave.in",
    api_version: _0x16d0c2(_0x5bba5f._0x468189)
  };
}
function getAppBranding() {
  const _0x5d15f4 = {
    _0x5b34b5: 332
  };
  const _0x104b0a = _0x2f999b;
  const _0x7a9d53 = loadEncryptedConfig();
  return _0x7a9d53[_0x104b0a(_0x5d15f4._0x5b34b5)] || {
    show_reseller_info: false,
    custom_title: null,
    splash_message: null
  };
}
function getTrialRegistrationEndpoint() {
  const _0x40f2d5 = {
    _0x22c02e: 339,
    _0x4b02c8: 328,
    _0x44e0fa: 349
  };
  const _0x499ab9 = _0x5e9b59;
  const _0x2149ba = _0x2f999b;
  const _0x31d734 = getLicenseServerConfig();
  const _0x503a80 = _0x31d734[_0x499ab9(347)];
  const _0x24517d = _0x31d734.api_version;
  if (isResellerBuild()) {
    return _0x503a80 + _0x2149ba(_0x40f2d5._0x22c02e) + _0x24517d + _0x2149ba(_0x40f2d5._0x4b02c8);
  } else {
    return _0x503a80 + _0x499ab9(339) + _0x24517d + _0x499ab9(_0x40f2d5._0x44e0fa);
  }
}
function prepareTrialRegistrationData(_0x400095, _0x32fb58) {
  const _0x5da457 = {
    _0x2180fc: 358,
    _0x29c853: 365,
    _0xa45094: 367,
    _0x584225: 356
  };
  const _0x47d5da = _0x2f999b;
  const _0x18fdab = _0x5e9b59;
  return {
    email: _0x400095,
    phone: _0x32fb58,
    machine_id: require(_0x47d5da(338))[_0x18fdab(360)](_0x47d5da(_0x5da457._0x2180fc))[_0x47d5da(366)](require("os")[_0x47d5da(363)]())[_0x47d5da(345)](_0x18fdab(335)).substring(0, 32),
    app_version: require("electron")[_0x18fdab(365)] ? require(_0x47d5da(336))[_0x47d5da(_0x5da457._0x29c853)][_0x18fdab(368)]() : _0x18fdab(_0x5da457._0xa45094),
    platform: require("os")[_0x18fdab(_0x5da457._0x584225)](),
    reseller_code: getResellerCode()
  };
}
const _0x46492c = {
  RESELLER_CONFIG: RESELLER_CONFIG,
  getResellerCode: getResellerCode,
  isResellerBuild: isResellerBuild,
  getResellerInfo: getResellerInfo,
  getLicenseServerConfig: getLicenseServerConfig,
  getAppBranding: getAppBranding,
  getTrialRegistrationEndpoint: getTrialRegistrationEndpoint,
  prepareTrialRegistrationData: prepareTrialRegistrationData
};
module[_0x5e9b59(341)] = _0x46492c;