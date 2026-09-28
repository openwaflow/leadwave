const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
class BrandingProtectionService {
  constructor() {
    this.protectedAssets = this.getProtectedAssets();
    this.brandingConfig = this.getBrandingConfig();
    this.checksums = new Map();
  }
  getProtectedAssets() {
    return ["build-resources/assets/app-icon.ico", "build-resources/assets/app-icon.png", "build-resources/assets/logo.png", "build-resources/assets/logo.svg", "public/logo.png", "public/logo.svg", "src/assets/logo.png", "src/assets/logo.svg", "src/assets/images/logo.png", "src/assets/images/logo.svg"];
  }
  getBrandingConfig() {
    return {
      appName: "WAGrow",
      productName: "WAGrow",
      appId: "com.wagrow.whatsapp-desktop",
      publisher: "WAGrow",
      copyright: "© 2026",
      description: "WAGrow WhatsApp automation desktop application built with Electron.js and Baileys",
      protectedPackageKeys: ["name", "productName", "description", "author", "build.appId", "build.productName", "build.copyright", "build.win.publisherName"],
      protectedFiles: ["package.json", "build/package.json", "public/index.html", "src/index.html"]
    };
  }
  async calculateChecksum(_0x2e64b1) {
    try {
      if (!fs.existsSync(_0x2e64b1)) {
        return null;
      }
      const _0x4cec19 = fs.readFileSync(_0x2e64b1);
      return crypto.createHash("sha256").update(_0x4cec19).digest("hex");
    } catch (_0x50b367) {
      return null;
    }
  }
  async createBrandingSnapshot() {
    try {
      const _0x4b0298 = {
        timestamp: new Date().toISOString(),
        assets: {},
        configurations: {},
        checksums: {}
      };
      for (const _0x1d2986 of this.protectedAssets) {
        const _0x30a387 = path.resolve(_0x1d2986);
        if (fs.existsSync(_0x30a387)) {
          const _0x763984 = await this.calculateChecksum(_0x30a387);
          _0x4b0298.assets[_0x1d2986] = {
            exists: true,
            checksum: _0x763984,
            size: fs.statSync(_0x30a387).size,
            modified: fs.statSync(_0x30a387).mtime.toISOString()
          };
          this.checksums.set(_0x1d2986, _0x763984);
        } else {
          _0x4b0298.assets[_0x1d2986] = {
            exists: false
          };
        }
      }
      for (const _0x59200d of this.brandingConfig.protectedFiles) {
        if (fs.existsSync(_0x59200d)) {
          try {
            const _0x19e91c = fs.readFileSync(_0x59200d, "utf8");
            const _0x12ead5 = crypto.createHash("sha256").update(_0x19e91c).digest("hex");
            _0x4b0298.configurations[_0x59200d] = {
              checksum: _0x12ead5,
              size: _0x19e91c.length,
              modified: fs.statSync(_0x59200d).mtime.toISOString()
            };
            if (_0x59200d.endsWith("package.json")) {
              try {
                const _0x6b32b6 = JSON.parse(_0x19e91c);
                _0x4b0298.configurations[_0x59200d].brandingValues = {
                  name: _0x6b32b6.name,
                  productName: _0x6b32b6.productName || _0x6b32b6.name,
                  description: _0x6b32b6.description,
                  author: _0x6b32b6.author,
                  appId: _0x6b32b6.build?.appId,
                  buildProductName: _0x6b32b6.build?.productName,
                  copyright: _0x6b32b6.build?.copyright,
                  publisherName: _0x6b32b6.build?.win?.publisherName
                };
              } catch (_0x296521) {}
            }
          } catch (_0x1ce8c4) {
            _0x4b0298.configurations[_0x59200d] = {
              error: _0x1ce8c4.message
            };
          }
        }
      }
      return _0x4b0298;
    } catch (_0x38e60e) {
      throw new Error("Failed to create branding snapshot: " + _0x38e60e.message);
    }
  }
  async validateBrandingIntegrity(_0x76582 = null) {
    try {
      if (!_0x76582) {
        _0x76582 = await this.createBrandingSnapshot();
      }
      const _0x2278bd = {
        success: true,
        issues: [],
        modifiedAssets: [],
        modifiedConfigurations: [],
        missingAssets: []
      };
      for (const _0x34aa51 of this.protectedAssets) {
        const _0x34d820 = await this.calculateChecksum(_0x34aa51);
        const _0x253d68 = _0x76582.assets[_0x34aa51];
        if (_0x253d68 && _0x253d68.exists) {
          if (_0x34d820 !== _0x253d68.checksum) {
            _0x2278bd.success = false;
            _0x2278bd.modifiedAssets.push({
              path: _0x34aa51,
              expected: _0x253d68.checksum,
              actual: _0x34d820
            });
            _0x2278bd.issues.push("Asset modified: " + _0x34aa51);
          }
        } else if (fs.existsSync(_0x34aa51)) {
          _0x2278bd.issues.push("New asset detected: " + _0x34aa51);
        }
        if (_0x253d68 && _0x253d68.exists && !fs.existsSync(_0x34aa51)) {
          _0x2278bd.success = false;
          _0x2278bd.missingAssets.push(_0x34aa51);
          _0x2278bd.issues.push("Asset missing: " + _0x34aa51);
        }
      }
      for (const _0x1b6384 of this.brandingConfig.protectedFiles) {
        if (fs.existsSync(_0x1b6384)) {
          const _0x16afd0 = fs.readFileSync(_0x1b6384, "utf8");
          const _0x5783d4 = crypto.createHash("sha256").update(_0x16afd0).digest("hex");
          const _0x362f26 = _0x76582.configurations[_0x1b6384];
          if (_0x362f26 && _0x5783d4 !== _0x362f26.checksum) {
            _0x2278bd.modifiedConfigurations.push({
              path: _0x1b6384,
              expected: _0x362f26.checksum,
              actual: _0x5783d4
            });
            if (_0x1b6384.endsWith("package.json") && _0x362f26.brandingValues) {
              try {
                const _0x5a175e = JSON.parse(_0x16afd0);
                const _0x30837d = _0x362f26.brandingValues;
                const _0x4b0c49 = [{
                  key: "name",
                  current: _0x5a175e.name,
                  expected: _0x30837d.name
                }, {
                  key: "productName",
                  current: _0x5a175e.productName,
                  expected: _0x30837d.productName
                }, {
                  key: "description",
                  current: _0x5a175e.description,
                  expected: _0x30837d.description
                }, {
                  key: "author",
                  current: _0x5a175e.author,
                  expected: _0x30837d.author
                }, {
                  key: "appId",
                  current: _0x5a175e.build?.appId,
                  expected: _0x30837d.appId
                }, {
                  key: "publisherName",
                  current: _0x5a175e.build?.win?.publisherName,
                  expected: _0x30837d.publisherName
                }];
                for (const _0xe6a4cc of _0x4b0c49) {
                  if (_0xe6a4cc.current !== _0xe6a4cc.expected) {
                    _0x2278bd.success = false;
                    _0x2278bd.issues.push("Branding changed in " + _0x1b6384 + ": " + _0xe6a4cc.key + " changed from \"" + _0xe6a4cc.expected + "\" to \"" + _0xe6a4cc.current + "\"");
                  }
                }
              } catch (_0x5bed9a) {
                _0x2278bd.issues.push("Failed to parse " + _0x1b6384 + ": " + _0x5bed9a.message);
              }
            }
          }
        }
      }
      return _0x2278bd;
    } catch (_0x4783f0) {
      throw new Error("Failed to validate branding integrity: " + _0x4783f0.message);
    }
  }
  async restoreBrandingFromSnapshot(_0x598334) {
    try {
      const _0x769d7c = {
        timestamp: new Date().toISOString(),
        restoredAssets: [],
        restoredConfigurations: [],
        errors: []
      };
      const _0x45ea92 = await this.validateBrandingIntegrity(_0x598334);
      if (!_0x45ea92.success) {
        _0x769d7c.errors.push("Branding integrity validation failed");
        _0x769d7c.errors.push(..._0x45ea92.issues);
      }
      return _0x769d7c;
    } catch (_0x29e926) {
      throw new Error("Failed to restore branding: " + _0x29e926.message);
    }
  }
  async lockBrandingElements() {
    try {
      const _0x44bbce = await this.createBrandingSnapshot();
      const _0x1a47e6 = path.resolve("branding.lock");
      fs.writeFileSync(_0x1a47e6, JSON.stringify(_0x44bbce, null, 2));
      return {
        success: true,
        lockFile: _0x1a47e6,
        timestamp: _0x44bbce.timestamp,
        protectedAssets: this.protectedAssets.length,
        protectedConfigurations: this.brandingConfig.protectedFiles.length
      };
    } catch (_0x3d1265) {
      throw new Error("Failed to lock branding elements: " + _0x3d1265.message);
    }
  }
  async unlockBrandingElements() {
    try {
      const _0x3cf5ec = path.resolve("branding.lock");
      if (fs.existsSync(_0x3cf5ec)) {
        fs.unlinkSync(_0x3cf5ec);
        return {
          success: true,
          message: "Branding lock removed"
        };
      } else {
        return {
          success: true,
          message: "No branding lock found"
        };
      }
    } catch (_0x5f1507) {
      throw new Error("Failed to unlock branding elements: " + _0x5f1507.message);
    }
  }
  getBrandingSummary() {
    return {
      protectedAssets: this.protectedAssets,
      brandingConfig: this.brandingConfig,
      description: "Branding protection ensures that app name, logo, icons, and other brand elements remain unchanged during updates.",
      protectionLevel: "High",
      monitoredFiles: this.protectedAssets.length + this.brandingConfig.protectedFiles.length
    };
  }
  async performBrandingAudit() {
    try {
      const _0x1c8ffa = {
        timestamp: new Date().toISOString(),
        summary: this.getBrandingSummary(),
        currentState: await this.createBrandingSnapshot(),
        recommendations: []
      };
      const _0x2b8e80 = path.resolve("branding.lock");
      if (fs.existsSync(_0x2b8e80)) {
        try {
          const _0x48011e = JSON.parse(fs.readFileSync(_0x2b8e80, "utf8"));
          const _0x3840d5 = await this.validateBrandingIntegrity(_0x48011e);
          _0x1c8ffa.lockValidation = _0x3840d5;
          if (!_0x3840d5.success) {
            _0x1c8ffa.recommendations.push("Branding integrity compromised - consider restoring from backup");
          }
        } catch (_0x129657) {
          _0x1c8ffa.recommendations.push("Branding lock file is corrupted - recreate lock");
        }
      } else {
        _0x1c8ffa.recommendations.push("Create branding lock file to monitor changes");
      }
      const _0x42a3ee = this.protectedAssets.filter(_0x4bcbf6 => !fs.existsSync(_0x4bcbf6));
      if (_0x42a3ee.length > 0) {
        _0x1c8ffa.missingAssets = _0x42a3ee;
        _0x1c8ffa.recommendations.push(_0x42a3ee.length + " protected assets are missing");
      }
      return _0x1c8ffa;
    } catch (_0x3ca6e9) {
      throw new Error("Failed to perform branding audit: " + _0x3ca6e9.message);
    }
  }
}
module.exports = BrandingProtectionService;