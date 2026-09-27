const _0x7aa83b = _0x30b9;
const _0x22f3fc = _0x30b9;
(function (_0x5792f0, _0x28601d) {
  const _0x55bf98 = {
    _0x372094: 474,
    _0x5c187e: 470,
    _0x55cc5d: 481,
    _0x289b16: 462,
    _0x566eb8: 480
  };
  const _0x2dcd2c = _0x30b9;
  const _0x3d464a = _0x30b9;
  const _0x13461a = _0x5792f0();
  while (true) {
    try {
      const _0x1bd071 = parseInt(_0x2dcd2c(466)) / 1 * (parseInt(_0x2dcd2c(463)) / 2) + parseInt(_0x2dcd2c(_0x55bf98._0x372094)) / 3 + parseInt(_0x3d464a(482)) / 4 + -parseInt(_0x2dcd2c(_0x55bf98._0x5c187e)) / 5 + -parseInt(_0x3d464a(_0x55bf98._0x55cc5d)) / 6 + -parseInt(_0x3d464a(_0x55bf98._0x289b16)) / 7 + parseInt(_0x3d464a(_0x55bf98._0x566eb8)) / 8;
      if (_0x1bd071 === _0x28601d) {
        break;
      } else {
        _0x13461a.push(_0x13461a.shift());
      }
    } catch (_0x5df97b) {
      _0x13461a.push(_0x13461a.shift());
    }
  }
})(_0x1f4f, 622943);
require(_0x7aa83b(478))[_0x7aa83b(469)]();
function getConfig(_0x308d91, _0x1d2686) {
  const _0x554d72 = _0x22f3fc;
  const _0x397b43 = _0x22f3fc;
  if (process[_0x554d72(458)][_0x308d91]) {
    return process[_0x397b43(458)][_0x308d91];
  }
  return _0x1d2686;
}
function _0x30b9(_0x4f1e03, _0x39080f) {
  _0x4f1e03 = _0x4f1e03 - 457;
  const _0x3e587b = _0x1f4f();
  let _0x16f529 = _0x3e587b[_0x4f1e03];
  if (_0x30b9.oEwIbm === undefined) {
    function _0x525161(_0x1e745c) {
      const _0x50621e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
      let _0x1ff977 = "";
      let _0x530552 = "";
      for (let _0xe68026 = 0, _0x5ce8ec, _0x1a8557, _0x13725f = 0; _0x1a8557 = _0x1e745c.charAt(_0x13725f++); ~_0x1a8557 && (_0x5ce8ec = _0xe68026 % 4 ? _0x5ce8ec * 64 + _0x1a8557 : _0x1a8557, _0xe68026++ % 4) ? _0x1ff977 += String.fromCharCode(_0x5ce8ec >> (_0xe68026 * -2 & 6) & 255) : 0) {
        _0x1a8557 = _0x50621e.indexOf(_0x1a8557);
      }
      for (let _0x1f5896 = 0, _0x4f44ed = _0x1ff977.length; _0x1f5896 < _0x4f44ed; _0x1f5896++) {
        _0x530552 += "%" + ("00" + _0x1ff977.charCodeAt(_0x1f5896).toString(16)).slice(-2);
      }
      return decodeURIComponent(_0x530552);
    }
    _0x30b9.CLrVWW = _0x525161;
    _0x30b9.gxZpwm = {};
    _0x30b9.oEwIbm = true;
  }
  const _0x2dc8db = _0x3e587b[0];
  const _0x4042c2 = _0x4f1e03 + _0x2dc8db;
  const _0x5f12c9 = _0x30b9.gxZpwm[_0x4042c2];
  if (!_0x5f12c9) {
    _0x16f529 = _0x30b9.CLrVWW(_0x16f529);
    _0x30b9.gxZpwm[_0x4042c2] = _0x16f529;
  } else {
    _0x16f529 = _0x5f12c9;
  }
  return _0x16f529;
}
const securityConfig = {
  newlicApiUrl: getConfig(_0x22f3fc(487), _0x7aa83b(479)),
  validationInterval: parseInt(getConfig(_0x7aa83b(457), _0x7aa83b(467))),
  offlineGracePeriod: parseInt(getConfig("OFFLINE_GRACE_PERIOD", _0x22f3fc(461))),
  enableTamperDetection: getConfig(_0x22f3fc(492), _0x22f3fc(460)) === _0x7aa83b(460),
  enableObfuscation: getConfig(_0x7aa83b(484), _0x7aa83b(491)) === _0x7aa83b(460),
  isProduction: process[_0x7aa83b(458)][_0x22f3fc(472)] === "production",
  isDevelopment: process[_0x22f3fc(458)].NODE_ENV !== "production"
};
function getLicenseSecret() {
  const _0x3d0f19 = {
    _0x45dfab: 473,
    _0x3c2ae1: 483
  };
  const _0x4879f1 = _0x22f3fc;
  const _0x14e66a = _0x7aa83b;
  if (process[_0x4879f1(458)][_0x14e66a(_0x3d0f19._0x45dfab)]) {
    return process[_0x14e66a(458)][_0x4879f1(473)];
  }
  if (securityConfig[_0x14e66a(_0x3d0f19._0x3c2ae1)]) {
    return _0x4879f1(459);
  }
  throw new Error("LICENSE_SECRET not configured! Set environment variable.");
}
function validateConfig() {
  const _0x3903b4 = {
    _0x3f182d: 486,
    _0x2db501: 458,
    _0x3a4112: 473,
    _0x3da1ee: 468,
    _0x3996a7: 477
  };
  const _0xb604fc = _0x7aa83b;
  const _0x2dacfd = _0x7aa83b;
  const _0x38a8f7 = [];
  if (securityConfig[_0xb604fc(_0x3903b4._0x3f182d)]) {
    if (!process.env.NEWLIC_API_URL) {
      _0x38a8f7.push(_0x2dacfd(489));
    }
    if (!process[_0x2dacfd(_0x3903b4._0x2db501)][_0xb604fc(_0x3903b4._0x3a4112)]) {
      _0x38a8f7[_0xb604fc(476)](_0x2dacfd(_0x3903b4._0x3da1ee));
    }
    if (_0x38a8f7[_0x2dacfd(485)] > 0) {
      console[_0xb604fc(471)](_0x2dacfd(464));
      _0x38a8f7[_0xb604fc(490)](_0x498ce4 => console[_0xb604fc(471)](_0x2dacfd(488), _0x498ce4));
      throw new Error(_0xb604fc(_0x3903b4._0x3996a7));
    }
  }
  return true;
}
if (securityConfig[_0x7aa83b(486)]) {
  try {
    validateConfig();
  } catch (_0x44bc04) {
    console.error(_0x22f3fc(475), _0x44bc04.message);
  }
}
const _0x527d1f = {
  ...securityConfig
};
_0x527d1f.getLicenseSecret = getLicenseSecret;
_0x527d1f.validateConfig = validateConfig;
module[_0x22f3fc(465)] = _0x527d1f;
function _0x1f4f() {
  const _0x4578ca = ["zxjYB3i", "tK9erv9ftLy", "teLdru5trv9trunsrvq", "mtC0nJKWmfvvAg9MDG", "4P2mifnLy3vYAxr5ignVBMzPz3vYyxrPB24GDMfSAwrHDgLVBIbMywLSzwq6", "ChvZAa", "sw52ywXPzcbZzwn1CML0EsbJB25MAwD1CMf0Aw9UigzVCIbWCM9KDwn0Aw9U", "zg90zw52", "Ahr0Chm6lY9SAwnLBNnLlMDLDgXLywr3yxzLlMLUl2fWAq", "mti4ntC1otjfrNfYqKK", "ntK3ndK4mgvSB2fYvW", "mJmXmJu4ogTuvenWAa", "AxnezxzLBg9WBwvUDa", "ru5bqKXfx0nprevFt0jgvvndqvrjt04", "BgvUz3rO", "AxnqCM9KDwn0Aw9U", "tKvxteLdx0fqsv9vuKW", "icaT", "tKvxteLdx0fqsv9vuKWGzw52AxjVBM1LBNqGDMfYAwfIBguGBM90ihnLDa", "zM9YrwfJAa", "zMfSC2u", "ru5bqKXfx1rbtvbfuL9ervrfq1rjt04", "teLdru5trv9wquXjrefusu9ox0LovevsvKfm", "zw52", "tevbrfDbvKuTmJaYns1ervyTu0vduKvuluniqu5hrs1jtI1quK9evunusu9o", "Dhj1zq", "nJa0odaWmdaW", "odaWnJK4nvDRCeXHqG", "mMPQwxnQvq", "4P2mifnLy3vYAxr5ignVBMzPz3vYyxrPB24GzxjYB3jZoG", "zxHWB3j0CW", "mJKYnty0zKfoEKrO", "mJe2mdaWmda", "teLdru5trv9trunsrvqGzw52AxjVBM1LBNqGDMfYAwfIBguGBM90ihnLDa", "y29UzMLN", "mtq4nZKXmgPgEg5XrG"];
  _0x1f4f = function () {
    return _0x4578ca;
  };
  return _0x1f4f();
}