const {
  HttpsProxyAgent
} = require("https-proxy-agent");
const {
  SocksProxyAgent
} = require("socks-proxy-agent");
const http = require("http");
const https = require("https");
class ProxyAgentService {
  constructor() {
    this.activeAgents = new Map();
  }
  createProxyAgent(_0x1fa3b2) {
    try {
      if (!_0x1fa3b2 || !_0x1fa3b2.host || !_0x1fa3b2.port) {
        console.error("❌ Invalid proxy configuration:", _0x1fa3b2);
        return null;
      }
      const _0x8a6bf0 = (_0x1fa3b2.type || "http").toLowerCase();
      let _0x35d6cc;
      let _0x376f33;
      if (_0x1fa3b2.username && _0x1fa3b2.password) {
        _0x35d6cc = _0x8a6bf0 + "://" + _0x1fa3b2.username + ":" + _0x1fa3b2.password + "@" + _0x1fa3b2.host + ":" + _0x1fa3b2.port;
      } else {
        _0x35d6cc = _0x8a6bf0 + "://" + _0x1fa3b2.host + ":" + _0x1fa3b2.port;
      }
      if (_0x8a6bf0 === "socks" || _0x8a6bf0 === "socks4" || _0x8a6bf0 === "socks5") {
        _0x376f33 = new SocksProxyAgent(_0x35d6cc);
      } else {
        _0x376f33 = new HttpsProxyAgent(_0x35d6cc);
      }
      return _0x376f33;
    } catch (_0x2838d3) {
      console.error("❌ Error creating proxy agent:", _0x2838d3.message);
      return null;
    }
  }
  setSessionProxy(_0x11fca6, _0x4111f2) {
    try {
      if (this.activeAgents.has(_0x11fca6)) {
        this.removeSessionProxy(_0x11fca6);
      }
      const _0x3fba50 = this.createProxyAgent(_0x4111f2);
      if (_0x3fba50) {
        this.activeAgents.set(_0x11fca6, {
          agent: _0x3fba50,
          proxy: {
            host: _0x4111f2.host,
            port: _0x4111f2.port,
            type: _0x4111f2.type,
            id: _0x4111f2.id
          }
        });
        return _0x3fba50;
      }
      return null;
    } catch (_0x17db4f) {
      console.error("❌ Error setting session proxy:", _0x17db4f.message);
      return null;
    }
  }
  getSessionProxy(_0x4d7d13) {
    const _0x2d1388 = this.activeAgents.get(_0x4d7d13);
    if (_0x2d1388) {
      return _0x2d1388.agent;
    } else {
      return null;
    }
  }
  getSessionProxyInfo(_0x2b2ac0) {
    const _0x210a13 = this.activeAgents.get(_0x2b2ac0);
    if (_0x210a13) {
      return _0x210a13.proxy;
    } else {
      return null;
    }
  }
  removeSessionProxy(_0x1c09b4) {
    if (this.activeAgents.has(_0x1c09b4)) {
      const _0x10b271 = this.activeAgents.get(_0x1c09b4);
      if (_0x10b271.agent && typeof _0x10b271.agent.destroy === "function") {
        _0x10b271.agent.destroy();
      }
      this.activeAgents.delete(_0x1c09b4);
    }
  }
  clearAll() {
    for (const [_0x12f81e, _0x3d2bbd] of this.activeAgents.entries()) {
      if (_0x3d2bbd.agent && typeof _0x3d2bbd.agent.destroy === "function") {
        _0x3d2bbd.agent.destroy();
      }
    }
    this.activeAgents.clear();
  }
  getFetchOptions(_0x2acf81) {
    const _0x3cfcee = this.getSessionProxy(_0x2acf81);
    if (_0x3cfcee) {
      return {
        agent: _0x53b37c => {
          return _0x3cfcee;
        }
      };
    }
    return {};
  }
  getAxiosConfig(_0x553526) {
    const _0x2e634f = this.getSessionProxy(_0x553526);
    if (_0x2e634f) {
      return {
        httpAgent: _0x2e634f,
        httpsAgent: _0x2e634f
      };
    }
    return {};
  }
}
module.exports = ProxyAgentService;