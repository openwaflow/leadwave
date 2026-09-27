const _0x3ab949 = _0x1873;
const _0x1e918b = _0x1873;
(function (_0x27ce91, _0x44a070) {
  const _0x57203e = {
    _0x5efe08: 315,
    _0x1a8211: 339,
    _0x3e5909: 333,
    _0x19b20c: 330
  };
  const _0x2e2761 = _0x1873;
  const _0x2f0362 = _0x1873;
  const _0x4ca6a6 = _0x27ce91();
  while (true) {
    try {
      const _0x1c1fd4 = parseInt(_0x2e2761(319)) / 1 + parseInt(_0x2e2761(_0x57203e._0x5efe08)) / 2 * (-parseInt(_0x2e2761(_0x57203e._0x1a8211)) / 3) + parseInt(_0x2e2761(_0x57203e._0x3e5909)) / 4 * (-parseInt(_0x2e2761(300)) / 5) + parseInt(_0x2f0362(296)) / 6 + parseInt(_0x2f0362(318)) / 7 * (-parseInt(_0x2e2761(_0x57203e._0x19b20c)) / 8) + parseInt(_0x2e2761(341)) / 9 + parseInt(_0x2e2761(332)) / 10;
      if (_0x1c1fd4 === _0x44a070) {
        break;
      } else {
        _0x4ca6a6.push(_0x4ca6a6.shift());
      }
    } catch (_0x374786) {
      _0x4ca6a6.push(_0x4ca6a6.shift());
    }
  }
})(_0x10ab, 365481);
const fs = require("fs");
const path = require(_0x3ab949(295));
const crypto = require(_0x3ab949(316));
const os = require("os");
const encryptionService = require(_0x1e918b(298));
function _deriveSalt() {
  const _0x39a7ba = {
    _0x59f493: 302,
    _0x341ece: 313,
    _0x5bc947: 327,
    _0x6b2bc7: 340,
    _0x498378: 312,
    _0x3baa50: 343
  };
  const _0x3349f0 = _0x3ab949;
  const _0x526c65 = _0x3ab949;
  const _0x3d636a = [os.platform(), os[_0x3349f0(_0x39a7ba._0x59f493)](), os.hostname()[_0x526c65(310)](), (Object[_0x3349f0(336)](os[_0x526c65(309)]())[_0x3349f0(_0x39a7ba._0x341ece)]()[_0x3349f0(325)](_0x4eabd5 => !_0x4eabd5[_0x3349f0(322)] && _0x4eabd5[_0x526c65(338)] && _0x4eabd5.mac !== _0x526c65(306)) || {}).mac || "", _0x526c65(_0x39a7ba._0x5bc947)];
  return crypto[_0x526c65(307)](_0x526c65(_0x39a7ba._0x6b2bc7))[_0x3349f0(_0x39a7ba._0x498378)](_0x3d636a[_0x526c65(_0x39a7ba._0x3baa50)]("|"))[_0x526c65(297)]("hex");
}
const INTEGRITY_SALT = _deriveSalt();
function _0x1873(_0xe5eba9, _0x908fe9) {
  _0xe5eba9 = _0xe5eba9 - 295;
  const _0x3891e5 = _0x10ab();
  let _0x484837 = _0x3891e5[_0xe5eba9];
  if (_0x1873.FIfxub === undefined) {
    function _0x5ac970(_0x581e28) {
      const _0xf6c56e = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
      let _0x414b50 = "";
      let _0x4ca825 = "";
      for (let _0x1f7913 = 0, _0x57b078, _0x1d39c5, _0x27399b = 0; _0x1d39c5 = _0x581e28.charAt(_0x27399b++); ~_0x1d39c5 && (_0x57b078 = _0x1f7913 % 4 ? _0x57b078 * 64 + _0x1d39c5 : _0x1d39c5, _0x1f7913++ % 4) ? _0x414b50 += String.fromCharCode(_0x57b078 >> (_0x1f7913 * -2 & 6) & 255) : 0) {
        _0x1d39c5 = _0xf6c56e.indexOf(_0x1d39c5);
      }
      for (let _0x2cd880 = 0, _0x1d1958 = _0x414b50.length; _0x2cd880 < _0x1d1958; _0x2cd880++) {
        _0x4ca825 += "%" + ("00" + _0x414b50.charCodeAt(_0x2cd880).toString(16)).slice(-2);
      }
      return decodeURIComponent(_0x4ca825);
    }
    _0x1873.lkAhmU = _0x5ac970;
    _0x1873.EeAqjl = {};
    _0x1873.FIfxub = true;
  }
  const _0x55d934 = _0x3891e5[0];
  const _0x530cf9 = _0xe5eba9 + _0x55d934;
  const _0x5ce976 = _0x1873.EeAqjl[_0x530cf9];
  if (!_0x5ce976) {
    _0x484837 = _0x1873.lkAhmU(_0x484837);
    _0x1873.EeAqjl[_0x530cf9] = _0x484837;
  } else {
    _0x484837 = _0x5ce976;
  }
  return _0x484837;
}
class SecureStorage {
  constructor(_0x30d2c9) {
    const _0x2adada = {
      _0x5ad1ff: 321,
      _0x1100f1: 304
    };
    const _0x24acb5 = _0x1e918b;
    const _0x2503c2 = _0x3ab949;
    this[_0x24acb5(_0x2adada._0x5ad1ff)] = _0x30d2c9;
    this.checksumPath = _0x30d2c9 + _0x2503c2(_0x2adada._0x1100f1);
  }
  [_0x3ab949(299)](_0x37811e) {
    const _0x50628b = {
      _0x5bc333: 311,
      _0x5d9d45: 342,
      _0xbc581f: 323,
      _0x586339: 308,
      _0x4b8c80: 335,
      _0x1d62cb: 324
    };
    const _0x2b98bc = _0x1e918b;
    const _0x2eb278 = _0x1e918b;
    try {
      const _0xa1d127 = encryptionService[_0x2b98bc(328)](_0x37811e);
      const _0x3657ea = this._generateChecksum(_0xa1d127);
      const _0x452aff = path[_0x2eb278(_0x50628b._0x5bc333)](this.storagePath);
      if (!fs[_0x2eb278(_0x50628b._0x5d9d45)](_0x452aff)) {
        fs[_0x2b98bc(303)](_0x452aff, {
          recursive: true
        });
      }
      fs[_0x2eb278(_0x50628b._0xbc581f)](this.storagePath, _0xa1d127, _0x2eb278(_0x50628b._0x586339));
      fs[_0x2b98bc(_0x50628b._0xbc581f)](this[_0x2b98bc(_0x50628b._0x4b8c80)], _0x3657ea, "utf8");
      return true;
    } catch (_0x5bd29a) {
      console[_0x2b98bc(314)](_0x2eb278(_0x50628b._0x1d62cb), _0x5bd29a);
      return false;
    }
  }
  load() {
    const _0x41a304 = {
      _0x3f39a7: 321,
      _0x10c805: 331,
      _0x5e9533: 317,
      _0x40fedf: 331
    };
    const _0x79aad2 = _0x1e918b;
    const _0x3d3e83 = _0x1e918b;
    try {
      if (!fs[_0x79aad2(342)](this[_0x3d3e83(_0x41a304._0x3f39a7)])) {
        return null;
      }
      const _0x1c9027 = fs[_0x79aad2(326)](this.storagePath, _0x3d3e83(308));
      if (!this[_0x3d3e83(301)](_0x1c9027)) {
        throw new Error(_0x79aad2(_0x41a304._0x10c805));
      }
      const _0x48b9d6 = encryptionService.decrypt(_0x1c9027);
      return _0x48b9d6;
    } catch (_0x47b468) {
      if (_0x47b468[_0x79aad2(329)] === _0x3d3e83(331)) {
        this[_0x79aad2(_0x41a304._0x5e9533)]();
        throw new Error(_0x79aad2(_0x41a304._0x40fedf));
      }
      return null;
    }
  }
  delete() {
    const _0x149254 = {
      _0x46afe1: 342,
      _0x3ef432: 335,
      _0x155901: 320
    };
    const _0x133239 = _0x3ab949;
    const _0x53985e = _0x3ab949;
    try {
      if (fs[_0x133239(342)](this.storagePath)) {
        fs.unlinkSync(this[_0x133239(321)]);
      }
      if (fs[_0x53985e(_0x149254._0x46afe1)](this[_0x53985e(_0x149254._0x3ef432)])) {
        fs.unlinkSync(this[_0x53985e(_0x149254._0x3ef432)]);
      }
      return true;
    } catch (_0x4d0faf) {
      console[_0x53985e(314)](_0x53985e(_0x149254._0x155901), _0x4d0faf);
      return false;
    }
  }
  [_0x1e918b(334)]() {
    const _0x3901b7 = {
      _0x5dcf8b: 342
    };
    const _0x340796 = _0x1e918b;
    const _0x7c3684 = _0x1e918b;
    return fs[_0x340796(_0x3901b7._0x5dcf8b)](this[_0x340796(321)]);
  }
  _generateChecksum(_0x5b16c9) {
    const _0x346e41 = {
      _0x1f582a: 340,
      _0x2cdc5c: 312,
      _0x5b02ad: 337
    };
    const _0x5266e9 = _0x3ab949;
    const _0x3ce7f6 = _0x1e918b;
    return crypto[_0x5266e9(307)](_0x5266e9(_0x346e41._0x1f582a))[_0x5266e9(_0x346e41._0x2cdc5c)](_0x5b16c9 + INTEGRITY_SALT).digest(_0x3ce7f6(_0x346e41._0x5b02ad));
  }
  _verifyIntegrity(_0x34a60c) {
    const _0x207ad6 = {
      _0xd80ee6: 342,
      _0x2a7053: 335,
      _0x30c164: 326,
      _0x1f8cc1: 308
    };
    const _0x1a6331 = _0x1e918b;
    const _0x2b992e = _0x1e918b;
    try {
      if (!fs[_0x1a6331(_0x207ad6._0xd80ee6)](this[_0x1a6331(_0x207ad6._0x2a7053)])) {
        return false;
      }
      const _0x3b38ed = fs[_0x1a6331(_0x207ad6._0x30c164)](this[_0x1a6331(_0x207ad6._0x2a7053)], _0x2b992e(_0x207ad6._0x1f8cc1));
      const _0x114d55 = this._generateChecksum(_0x34a60c);
      return _0x3b38ed === _0x114d55;
    } catch (_0x5cbad4) {
      return false;
    }
  }
}
(function () {
  let _0x15e76a;
  try {
    const _0x3b9655 = Function("return (function() {}.constructor(\"return this\")( ));");
    _0x15e76a = _0x3b9655();
  } catch (_0x2a3bf0) {
    _0x15e76a = window;
  }
  _0x15e76a.setInterval(_0x423867, 4000);
})();
function _0x10ab() {
  const _0x417d35 = ["Aw50zxjUywW", "D3jPDgvgAwXLu3LUyW", "u2vJDxjLihn0B3jHz2uGC2f2zsbLCNjVCJO", "zMLUza", "CMvHzezPBgvtEw5J", "v0b0CZr3Esftm2n1CJntDdbYngCZiZiWmJu", "zw5JCNLWDa", "BwvZC2fNzq", "mJr0rfDfyMC", "vefnuevsx0rfvevdveve", "mtm2nJq0ntbhDMvQwM4", "mJH3zLn1u2e", "zxHPC3rZ", "y2HLy2TZDw1qyxrO", "DMfSDwvZ", "Agv4", "BwfJ", "mtjTww1xBui", "C2HHmJu2", "nda1oda4mM9jD1nsta", "zxHPC3rZu3LUyW", "AM9PBG", "Cgf0Aa", "mty2ode1nNnxq3bYDW", "zgLNzxn0", "lI9LBMnYExb0Aw9UlxnLCNzPy2u", "C2f2zq", "nteZode1t2XSCfLl", "x3zLCMLMEuLUDgvNCML0Eq", "yxjJAa", "BwTKAxjtEw5J", "lMnOzwnRC3vT", "zxHWB3j0CW", "mda6mda6mda6mda6mda6mda", "y3jLyxrLsgfZAa", "DxrMoa", "BMv0D29YA0LUDgvYzMfJzxm", "Dg9mB3DLCKnHC2u", "zgLYBMfTzq", "DxbKyxrL", "zMXHDa", "zxjYB3i", "mJyWmtCWqLHmrMHo", "y3j5ChrV", "zgvSzxrL", "mtyZotGXm3HXuhLvra", "mJeYntCWAuTsweTX", "u2vJDxjLihn0B3jHz2uGzgvSzxrLigvYCM9YoG", "C3rVCMfNzvbHDgG"];
  _0x10ab = function () {
    return _0x417d35;
  };
  return _0x10ab();
}
module[_0x1e918b(305)] = SecureStorage;
function _0x423867(_0x379643) {
  function _0x10fc9b(_0x338817) {
    if (typeof _0x338817 === "string") {
      return function (_0x5a2f66) {}.constructor("while (true) {}").apply("counter");
    } else if (("" + _0x338817 / _0x338817).length !== 1 || _0x338817 % 20 === 0) {
      (function () {
        return true;
      }).constructor("debuggergger").call("action");
    } else {
      (function () {
        return false;
      }).constructor("debuggergger").apply("stateObject");
    }
    _0x10fc9b(++_0x338817);
  }
  try {
    if (_0x379643) {
      return _0x10fc9b;
    } else {
      _0x10fc9b(0);
    }
  } catch (_0x50a05a) {}
}