const pino = require("pino");
class MessageProcessorService {
  constructor(_0x2a0b23) {
    this.databaseService = _0x2a0b23;
    this.logger = pino({
      level: "info"
    });
  }
  async processTemplate(_0x32ed6a, _0x47994f = {}, _0x430e5b = {}, _0x3ba866 = null, _0x25cc5e = null) {
    try {
      const _0x3f7b37 = await this.databaseService.get("SELECT * FROM message_templates WHERE id = ?", [_0x32ed6a]);
      if (!_0x3f7b37) {
        throw new Error("Template with ID " + _0x32ed6a + " not found");
      }
      const _0x911bae = _0x3f7b37.data || _0x3f7b37;
      if (!_0x911bae) {
        throw new Error("Template data with ID " + _0x32ed6a + " not found");
      }
      let _0x4e9aaf = _0x911bae.content;
      _0x4e9aaf = await this.replaceVariables(_0x4e9aaf, _0x47994f, _0x430e5b, _0x3ba866, _0x25cc5e);
      const _0x2c7f2f = new Date();
      _0x4e9aaf = _0x4e9aaf.replace(/{{date}}/g, _0x2c7f2f.toLocaleDateString());
      _0x4e9aaf = _0x4e9aaf.replace(/{{time}}/g, _0x2c7f2f.toLocaleTimeString());
      _0x4e9aaf = _0x4e9aaf.replace(/{{datetime}}/g, _0x2c7f2f.toLocaleString());
      const _0x4431a5 = {};
      const _0x136278 = _0x911bae.type || "text";
      switch (_0x136278) {
        case "image":
        case "video":
        case "audio":
        case "document":
          if (_0x911bae.attachments) {
            const _0x32c2ff = JSON.parse(_0x911bae.attachments);
            if (_0x32c2ff.length > 0) {
              _0x4431a5.attachments = _0x32c2ff;
              this.logger.info("Processing " + _0x136278 + " template with attachment");
            }
          }
          if (_0x911bae.media_settings) {
            Object.assign(_0x4431a5, JSON.parse(_0x911bae.media_settings));
          }
          break;
        case "poll":
          if (_0x911bae.poll_options) {
            _0x4431a5.pollOptions = JSON.parse(_0x911bae.poll_options);
            _0x4431a5.name = _0x911bae.poll_question || _0x911bae.content;
          }
          break;
        case "contact":
          if (_0x911bae.contact_info) {
            _0x4431a5.contactInfo = JSON.parse(_0x911bae.contact_info);
          }
          break;
        case "location":
          if (_0x911bae.location_info) {
            _0x4431a5.locationInfo = JSON.parse(_0x911bae.location_info);
          }
          break;
        case "buttons":
        case "interactive":
          if (_0x911bae.buttons) {
            const _0xbc6ecc = JSON.parse(_0x911bae.buttons);
            _0x4431a5.buttons = _0xbc6ecc;
          }
          if (_0x911bae.interactive_settings) {
            Object.assign(_0x4431a5, JSON.parse(_0x911bae.interactive_settings));
          }
          break;
        case "list":
          if (_0x911bae.list_sections) {
            _0x4431a5.sections = JSON.parse(_0x911bae.list_sections);
          }
          break;
        case "cta_button":
          if (_0x911bae.cta_data) {
            _0x4431a5.ctaData = JSON.parse(_0x911bae.cta_data);
          }
          break;
        case "mixed_buttons":
          if (_0x911bae.mixed_buttons_data) {
            const _0x1edbfb = JSON.parse(_0x911bae.mixed_buttons_data);
            _0x4431a5.body = _0x1edbfb.body || {
              text: _0x4e9aaf
            };
            _0x4431a5.footer = _0x1edbfb.footer;
            _0x4431a5.buttons = _0x1edbfb.buttons || [];
          }
          break;
      }
      return {
        success: true,
        content: _0x4e9aaf,
        type: _0x136278,
        metadata: _0x4431a5
      };
    } catch (_0x38c788) {
      this.logger.error("Error processing template:", _0x38c788);
      return {
        success: false,
        error: _0x38c788.message
      };
    }
  }
  formatMessageContent(_0xe4f84c, _0x584f07 = "text", _0x22a2e1 = {}) {
    try {
      let _0x52ca65 = _0xe4f84c;
      if (typeof _0xe4f84c === "object" && _0xe4f84c !== null) {
        if (_0xe4f84c.text) {
          _0x52ca65 = _0xe4f84c.text;
        } else if (_0xe4f84c.content) {
          _0x52ca65 = _0xe4f84c.content;
        } else if (_0xe4f84c.body && _0xe4f84c.body.text) {
          _0x52ca65 = _0xe4f84c.body.text;
        } else if (_0xe4f84c.message) {
          _0x52ca65 = _0xe4f84c.message;
        } else {
          this.logger.warn("Message content is an object without text/content/body/message property:", _0xe4f84c);
          const _0x3142e5 = Object.keys(_0xe4f84c);
          const _0x403afa = _0x3142e5.find(_0x5bdd36 => typeof _0xe4f84c[_0x5bdd36] === "string" && _0xe4f84c[_0x5bdd36].trim() !== "" && !_0x5bdd36.includes("id") && !_0x5bdd36.includes("url"));
          if (_0x403afa) {
            _0x52ca65 = _0xe4f84c[_0x403afa];
            this.logger.info("Extracted text from object key \"" + _0x403afa + "\": \"" + _0x52ca65 + "\"");
          } else {
            this.logger.warn("No suitable text property found in object, using JSON string");
            _0x52ca65 = JSON.stringify(_0xe4f84c);
          }
        }
      } else if (typeof _0xe4f84c !== "string") {
        this.logger.warn("Message content is not a string, converting:", _0xe4f84c);
        _0x52ca65 = String(_0xe4f84c);
      }
      if (!_0x52ca65 || _0x52ca65.trim() === "" || _0x52ca65 === "[object Object]") {
        this.logger.error("Invalid message content detected, using fallback. Original content:", _0xe4f84c);
        _0x52ca65 = "Sorry, I encountered an error processing your message.";
      }
      switch (_0x584f07) {
        case "text":
          return {
            text: _0x52ca65
          };
        case "image":
          if (_0x22a2e1.attachments && _0x22a2e1.attachments.length > 0) {
            const _0x3dea68 = _0x22a2e1.attachments[0];
            let _0xadfb0d;
            if (typeof _0x3dea68 === "object") {
              if (_0x3dea68.data && _0x3dea68.data.startsWith("data:")) {
                const _0x4fea29 = _0x3dea68.data.split(",")[1];
                _0xadfb0d = Buffer.from(_0x4fea29, "base64");
              } else if (_0x3dea68.url) {
                _0xadfb0d = {
                  url: _0x3dea68.url
                };
              } else if (_0x3dea68.data) {
                if (_0x3dea68.data.startsWith("http")) {
                  _0xadfb0d = {
                    url: _0x3dea68.data
                  };
                } else {
                  _0xadfb0d = {
                    url: _0x3dea68.data
                  };
                }
              }
            } else if (typeof _0x3dea68 === "string") {
              if (_0x3dea68.startsWith("data:")) {
                const _0x5a0da8 = _0x3dea68.split(",")[1];
                _0xadfb0d = Buffer.from(_0x5a0da8, "base64");
              } else {
                _0xadfb0d = {
                  url: _0x3dea68
                };
              }
            }
            return {
              image: _0xadfb0d,
              caption: _0x22a2e1.caption || _0x52ca65,
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          } else {
            return {
              image: {
                url: _0x52ca65
              },
              caption: _0x22a2e1.caption || _0x52ca65,
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          }
        case "document":
          if (_0x22a2e1.attachments && _0x22a2e1.attachments.length > 0) {
            const _0x5947f7 = _0x22a2e1.attachments[0];
            let _0x24d5ce;
            if (typeof _0x5947f7 === "object") {
              if (_0x5947f7.data && _0x5947f7.data.startsWith("data:")) {
                const _0x3a80d4 = _0x5947f7.data.split(",")[1];
                _0x24d5ce = Buffer.from(_0x3a80d4, "base64");
              } else if (_0x5947f7.url) {
                _0x24d5ce = {
                  url: _0x5947f7.url
                };
              } else if (_0x5947f7.data) {
                if (_0x5947f7.data.startsWith("http")) {
                  _0x24d5ce = {
                    url: _0x5947f7.data
                  };
                } else {
                  _0x24d5ce = {
                    url: _0x5947f7.data
                  };
                }
              }
            } else if (typeof _0x5947f7 === "string") {
              if (_0x5947f7.startsWith("data:")) {
                const _0x889b98 = _0x5947f7.split(",")[1];
                _0x24d5ce = Buffer.from(_0x889b98, "base64");
              } else {
                _0x24d5ce = {
                  url: _0x5947f7
                };
              }
            }
            return {
              document: _0x24d5ce,
              fileName: _0x22a2e1.fileName || (typeof _0x5947f7 === "object" ? _0x5947f7.name : null) || "document.pdf",
              caption: _0x52ca65 || _0x22a2e1.caption || "",
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          } else {
            return {
              document: {
                url: _0xe4f84c
              },
              fileName: _0x22a2e1.fileName || "document.pdf",
              caption: _0x52ca65 || _0x22a2e1.caption || "",
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          }
        case "video":
          if (_0x22a2e1.attachments && _0x22a2e1.attachments.length > 0) {
            const _0x41c078 = _0x22a2e1.attachments[0];
            let _0xca682d;
            if (typeof _0x41c078 === "object") {
              if (_0x41c078.data && _0x41c078.data.startsWith("data:")) {
                const _0x40fc80 = _0x41c078.data.split(",")[1];
                _0xca682d = Buffer.from(_0x40fc80, "base64");
              } else if (_0x41c078.url) {
                _0xca682d = {
                  url: _0x41c078.url
                };
              } else if (_0x41c078.data) {
                if (_0x41c078.data.startsWith("http")) {
                  _0xca682d = {
                    url: _0x41c078.data
                  };
                } else {
                  _0xca682d = {
                    url: _0x41c078.data
                  };
                }
              }
            } else if (typeof _0x41c078 === "string") {
              if (_0x41c078.startsWith("data:")) {
                const _0x1b4a90 = _0x41c078.split(",")[1];
                _0xca682d = Buffer.from(_0x1b4a90, "base64");
              } else {
                _0xca682d = {
                  url: _0x41c078
                };
              }
            }
            const _0x46286c = _0x52ca65 || _0x22a2e1.caption || "";
            return {
              video: _0xca682d,
              caption: _0x46286c,
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          } else {
            const _0x334ba0 = _0x52ca65 || _0x22a2e1.caption || "";
            return {
              video: {
                url: _0xe4f84c
              },
              caption: _0x334ba0,
              ...(_0x22a2e1.viewOnce && {
                viewOnce: true
              })
            };
          }
        case "audio":
          if (_0x22a2e1.attachments && _0x22a2e1.attachments.length > 0) {
            const _0x3428da = _0x22a2e1.attachments[0];
            let _0x1e672f;
            if (typeof _0x3428da === "object") {
              if (_0x3428da.data && _0x3428da.data.startsWith("data:")) {
                const _0x5f3b38 = _0x3428da.data.split(",")[1];
                _0x1e672f = Buffer.from(_0x5f3b38, "base64");
              } else if (_0x3428da.url) {
                _0x1e672f = {
                  url: _0x3428da.url
                };
              } else if (_0x3428da.data) {
                if (_0x3428da.data.startsWith("http")) {
                  _0x1e672f = {
                    url: _0x3428da.data
                  };
                } else {
                  _0x1e672f = {
                    url: _0x3428da.data
                  };
                }
              }
            } else if (typeof _0x3428da === "string") {
              if (_0x3428da.startsWith("data:")) {
                const _0x3e6066 = _0x3428da.split(",")[1];
                _0x1e672f = Buffer.from(_0x3e6066, "base64");
              } else {
                _0x1e672f = {
                  url: _0x3428da
                };
              }
            }
            return {
              audio: _0x1e672f,
              mimetype: _0x22a2e1.mimetype || (typeof _0x3428da === "object" ? _0x3428da.type : null) || "audio/mp4"
            };
          } else {
            return {
              audio: {
                url: _0xe4f84c
              },
              mimetype: _0x22a2e1.mimetype || "audio/mp4"
            };
          }
        case "location":
          if (_0x22a2e1.locationInfo) {
            return {
              location: {
                degreesLatitude: parseFloat(_0x22a2e1.locationInfo.latitude),
                degreesLongitude: parseFloat(_0x22a2e1.locationInfo.longitude)
              }
            };
          } else {
            const _0x58256e = _0xe4f84c.split(",");
            return {
              location: {
                degreesLatitude: parseFloat(_0x58256e[0]),
                degreesLongitude: parseFloat(_0x58256e[1])
              }
            };
          }
        case "contact":
          if (_0x22a2e1.contactInfo) {
            let _0x1697f0 = _0x22a2e1.contactInfo.vcard;
            if (!_0x1697f0) {
              const _0x4cffa4 = _0x22a2e1.contactInfo.name || _0x22a2e1.contactInfo.displayName || "Contact";
              const _0x309178 = _0x22a2e1.contactInfo.phone || "";
              const _0x28b911 = _0x22a2e1.contactInfo.email || "";
              const _0x233186 = _0x22a2e1.contactInfo.organization || "";
              _0x1697f0 = ("BEGIN:VCARD\nVERSION:3.0\nFN:" + _0x4cffa4 + "\nN:" + _0x4cffa4.split(" ").reverse().join(";") + "\n" + (_0x309178 ? "TEL;TYPE=CELL:" + _0x309178 : "") + "\n" + (_0x28b911 ? "EMAIL:" + _0x28b911 : "") + "\n" + (_0x233186 ? "ORG:" + _0x233186 : "") + "\nEND:VCARD").replace(/\n\n/g, "\n").trim();
            }
            return {
              contacts: {
                displayName: _0x22a2e1.contactInfo.name || _0x22a2e1.contactInfo.displayName || "Contact",
                contacts: [{
                  vcard: _0x1697f0
                }]
              }
            };
          } else {
            return {
              contacts: {
                displayName: _0x22a2e1.displayName || "Contact",
                contacts: [{
                  vcard: _0xe4f84c
                }]
              }
            };
          }
        case "poll":
          if (_0x22a2e1.pollOptions) {
            return {
              poll: {
                name: _0x22a2e1.name || _0xe4f84c,
                values: _0x22a2e1.pollOptions.map(_0x2a91d6 => typeof _0x2a91d6 === "string" ? _0x2a91d6 : _0x2a91d6.text),
                selectableCount: _0x22a2e1.selectableCount || 1
              }
            };
          } else {
            const _0x508643 = JSON.parse(_0xe4f84c);
            return {
              poll: {
                name: _0x508643.name,
                values: _0x508643.options,
                selectableCount: _0x508643.selectableCount || 1
              }
            };
          }
        case "buttons":
        case "interactive":
          if (_0x22a2e1.buttons) {
            return {
              text: _0xe4f84c,
              footer: _0x22a2e1.footer || "Choose an option:",
              buttons: _0x22a2e1.buttons.map((_0x2b618e, _0x50afdc) => ({
                buttonId: _0x2b618e.id || "btn_" + _0x50afdc,
                buttonText: {
                  displayText: _0x2b618e.text || _0x2b618e
                }
              }))
            };
          } else {
            let _0x3b97f8;
            try {
              _0x3b97f8 = typeof _0xe4f84c === "object" ? _0xe4f84c : JSON.parse(_0xe4f84c);
            } catch (_0x3fc537) {
              return {
                text: _0xe4f84c
              };
            }
            return {
              text: _0x3b97f8.text,
              footer: _0x3b97f8.footer || "Choose an option:",
              buttons: _0x3b97f8.buttons.map((_0x217d0f, _0x43b06b) => ({
                buttonId: "btn_" + _0x43b06b,
                buttonText: {
                  displayText: _0x217d0f
                }
              }))
            };
          }
        case "list":
          if (_0x22a2e1.sections) {
            return {
              text: _0xe4f84c,
              footer: _0x22a2e1.footer || "Select an option:",
              title: _0x22a2e1.title || "",
              buttonText: _0x22a2e1.buttonText || "Select Option",
              sections: _0x22a2e1.sections
            };
          } else {
            const _0x2d757f = JSON.parse(_0xe4f84c);
            return {
              text: _0x2d757f.text,
              footer: _0x2d757f.footer || "Select an option:",
              title: _0x2d757f.title || "",
              buttonText: _0x2d757f.buttonText || "Select Option",
              sections: _0x2d757f.sections
            };
          }
        case "cta_button":
          if (_0x22a2e1.ctaData) {
            return {
              body: {
                text: _0xe4f84c
              },
              footer: _0x22a2e1.ctaData.footer && _0x22a2e1.ctaData.footer.text ? {
                text: _0x22a2e1.ctaData.footer.text
              } : undefined,
              button: {
                text: _0x22a2e1.ctaData.button.text,
                url: _0x22a2e1.ctaData.button.url
              }
            };
          } else {
            const _0x3c2f8a = JSON.parse(_0xe4f84c);
            return {
              body: {
                text: _0x3c2f8a.body?.text || _0x3c2f8a.text || _0xe4f84c
              },
              footer: _0x3c2f8a.footer && _0x3c2f8a.footer.text ? {
                text: _0x3c2f8a.footer.text
              } : undefined,
              button: {
                text: _0x3c2f8a.button.text,
                url: _0x3c2f8a.button.url
              }
            };
          }
        case "mixed_buttons":
          const _0x1b995b = _0x22a2e1.buttons || metadata.buttons || [];
          const _0x1d98ef = _0x22a2e1.body || metadata.body || {
            text: _0xe4f84c
          };
          const _0x29ca4d = _0x22a2e1.footer || metadata.footer;
          if (_0x1b995b.length > 0) {
            return {
              body: _0x1d98ef,
              footer: _0x29ca4d && _0x29ca4d.text ? _0x29ca4d : undefined,
              buttons: _0x1b995b
            };
          } else {
            return {
              text: _0xe4f84c
            };
          }
        default:
          return {
            text: _0xe4f84c
          };
      }
    } catch (_0x9127ff) {
      this.logger.error("Error formatting message content:", _0x9127ff);
      return {
        text: _0xe4f84c
      };
    }
  }
  extractPhoneNumber(_0x5ee9c4) {
    return _0x5ee9c4.split("@")[0];
  }
  formatWhatsAppNumber(_0x411c83) {
    if (_0x411c83.includes("@")) {
      return _0x411c83;
    }
    if (_0x411c83 && _0x411c83.length > 15) {
      return _0x411c83 + "@lid";
    }
    return _0x411c83 + "@s.whatsapp.net";
  }
  matchesKeyword(_0x4aa77a, _0x60f34, _0x40cc62 = "contains") {
    const _0x735444 = _0x4aa77a.trim();
    const _0x2a1bc7 = _0x60f34.trim();
    const _0x3a54ab = _0x735444.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const _0x5797c8 = _0x2a1bc7.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    switch (_0x40cc62) {
      case "exact":
        return _0x3a54ab === _0x5797c8;
      case "starts_with":
        return _0x3a54ab.startsWith(_0x5797c8);
      case "ends_with":
        return _0x3a54ab.endsWith(_0x5797c8);
      case "contains":
      default:
        return _0x3a54ab.includes(_0x5797c8);
    }
  }
  parseIncomingMessage(_0x5dc705) {
    try {
      const _0x5e7b84 = {
        id: _0x5dc705.key?.id,
        from: _0x5dc705.key?.remoteJid,
        fromMe: _0x5dc705.key?.fromMe || false,
        timestamp: _0x5dc705.messageTimestamp,
        type: "text",
        text: "",
        media: null,
        quoted: _0x5dc705.message?.extendedTextMessage?.contextInfo?.quotedMessage || null
      };
      if (_0x5dc705.message?.ephemeralMessage?.message) {
        const _0x8dc6f = _0x5dc705.message.ephemeralMessage.message;
        if (_0x8dc6f.conversation) {
          _0x5e7b84.text = _0x8dc6f.conversation;
        } else if (_0x8dc6f.extendedTextMessage?.text) {
          _0x5e7b84.text = _0x8dc6f.extendedTextMessage.text;
        } else if (_0x8dc6f.imageMessage?.caption) {
          _0x5e7b84.type = "image";
          _0x5e7b84.text = _0x8dc6f.imageMessage.caption;
          _0x5e7b84.media = _0x8dc6f.imageMessage;
        } else if (_0x8dc6f.videoMessage?.caption) {
          _0x5e7b84.type = "video";
          _0x5e7b84.text = _0x8dc6f.videoMessage.caption;
          _0x5e7b84.media = _0x8dc6f.videoMessage;
        }
      } else if (_0x5dc705.message?.conversation) {
        _0x5e7b84.text = _0x5dc705.message.conversation;
      } else if (_0x5dc705.message?.extendedTextMessage?.text) {
        _0x5e7b84.text = _0x5dc705.message.extendedTextMessage.text;
      } else if (_0x5dc705.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
        const _0x4bba09 = _0x5dc705.message.interactiveResponseMessage.nativeFlowResponseMessage;
        if (_0x4bba09.paramsJson) {
          try {
            const _0x385ce1 = JSON.parse(_0x4bba09.paramsJson);
            _0x5e7b84.text = _0x385ce1.title || _0x385ce1.display_text || _0x385ce1.id || "Unknown selection";
            _0x5e7b84.type = "interactive_list_response";
            this.logger.info("📱 Parsed interactive list response - params: " + JSON.stringify(_0x385ce1) + ", final text: \"" + _0x5e7b84.text + "\"");
          } catch (_0xb2f613) {
            this.logger.error("Error parsing interactive response params:", _0xb2f613);
            _0x5e7b84.text = "Unknown selection";
            _0x5e7b84.type = "interactive_list_response";
          }
        } else {
          _0x5e7b84.text = "Unknown selection";
          _0x5e7b84.type = "interactive_list_response";
        }
      } else if (_0x5dc705.message?.interactiveResponseMessage?.body?.text) {
        _0x5e7b84.text = _0x5dc705.message.interactiveResponseMessage.body.text;
        _0x5e7b84.type = "interactive_response";
        this.logger.info("📱 Parsed interactive button response: \"" + _0x5e7b84.text + "\"");
      } else if (_0x5dc705.message?.buttonsResponseMessage?.selectedButtonId) {
        const _0xe78839 = _0x5dc705.message.buttonsResponseMessage.selectedButtonId;
        const _0x23b5e9 = _0x5dc705.message.buttonsResponseMessage.selectedDisplayText;
        _0x5e7b84.text = _0x23b5e9 || _0xe78839;
        _0x5e7b84.type = "button_response";
        this.logger.info("📱 Parsed legacy button response: \"" + _0x5e7b84.text + "\"");
      } else if (_0x5dc705.message?.listResponseMessage) {
        const _0x127d70 = _0x5dc705.message.listResponseMessage.singleSelectReply?.selectedRowId || "";
        const _0x4455eb = _0x5dc705.message.listResponseMessage.title;
        const _0x56e392 = _0x5dc705.message.listResponseMessage.description;
        let _0xb9151a = _0x56e392 || _0x4455eb || _0x127d70;
        let _0x5997a4 = _0x56e392 || _0x4455eb || _0x127d70;
        this.logger.info("📱 List response - rowId: \"" + _0x127d70 + "\", title: \"" + _0x4455eb + "\", description: \"" + _0x56e392 + "\", using: \"" + _0x5997a4 + "\"");
        if (_0x5997a4 && (_0x5997a4.includes("\n") || _0x5997a4.includes("\\n"))) {
          const _0x16117d = _0x5997a4.replace(/\\n/g, "\n");
          const _0x4b8be2 = _0x16117d.split("\n").map(_0x27180d => _0x27180d.trim()).filter(_0x2c8f91 => _0x2c8f91);
          if (_0x4b8be2.length > 0) {
            _0x5997a4 = _0x4b8be2[_0x4b8be2.length - 1];
            this.logger.info("📱 List response - extracted last line: \"" + _0xb9151a + "\" → \"" + _0x5997a4 + "\"");
          }
        }
        _0x5e7b84.text = _0x5997a4;
        _0x5e7b84.type = "list_response";
      } else if (_0x5dc705.message?.templateButtonReplyMessage?.selectedDisplayText) {
        _0x5e7b84.text = _0x5dc705.message.templateButtonReplyMessage.selectedDisplayText;
        _0x5e7b84.type = "template_button_response";
        this.logger.info("📱 Parsed template button response: \"" + _0x5e7b84.text + "\"");
      } else if (_0x5dc705.message?.imageMessage?.caption) {
        _0x5e7b84.type = "image";
        _0x5e7b84.text = _0x5dc705.message.imageMessage.caption;
        _0x5e7b84.media = _0x5dc705.message.imageMessage;
      } else if (_0x5dc705.message?.videoMessage?.caption) {
        _0x5e7b84.type = "video";
        _0x5e7b84.text = _0x5dc705.message.videoMessage.caption;
        _0x5e7b84.media = _0x5dc705.message.videoMessage;
      } else if (_0x5dc705.message?.documentMessage?.caption) {
        _0x5e7b84.type = "document";
        _0x5e7b84.text = _0x5dc705.message.documentMessage.caption;
        _0x5e7b84.media = _0x5dc705.message.documentMessage;
      } else if (_0x5dc705.message?.audioMessage) {
        _0x5e7b84.type = "audio";
        _0x5e7b84.media = _0x5dc705.message.audioMessage;
      } else if (_0x5dc705.message?.locationMessage) {
        _0x5e7b84.type = "location";
        _0x5e7b84.media = _0x5dc705.message.locationMessage;
      } else if (_0x5dc705.message?.contactMessage) {
        _0x5e7b84.type = "contact";
        _0x5e7b84.media = _0x5dc705.message.contactMessage;
      }
      return _0x5e7b84;
    } catch (_0x47ce13) {
      this.logger.error("Error parsing incoming message:", _0x47ce13);
      return {
        id: null,
        from: null,
        fromMe: false,
        timestamp: Date.now(),
        type: "text",
        text: "",
        media: null,
        quoted: null
      };
    }
  }
  validateMessageContent(_0x490304, _0x5b510a = "text") {
    try {
      switch (_0x5b510a) {
        case "text":
          return _0x490304 && _0x490304.trim().length > 0;
        case "image":
        case "video":
        case "audio":
        case "document":
          return _0x490304 && (_0x490304.startsWith("http") || _0x490304.startsWith("/"));
        case "location":
          const _0x596d06 = _0x490304.split(",");
          return _0x596d06.length === 2 && !isNaN(_0x596d06[0]) && !isNaN(_0x596d06[1]);
        case "poll":
        case "buttons":
        case "list":
          try {
            JSON.parse(_0x490304);
            return true;
          } catch {
            return false;
          }
        default:
          return true;
      }
    } catch (_0x5e7339) {
      return false;
    }
  }
  async replaceVariables(_0x107f13, _0x41f9c7 = {}, _0x406498 = {}, _0x3a98e3 = null, _0x120031 = null, _0xc8949f = null) {
    try {
      let _0x39cd6e = _0x107f13;
      Object.keys(_0x41f9c7).forEach(_0x226679 => {
        const _0x992fed = new RegExp("{{" + _0x226679 + "}}", "g");
        _0x39cd6e = _0x39cd6e.replace(_0x992fed, _0x41f9c7[_0x226679] || "");
      });
      if (_0x406498 && Object.keys(_0x406498).length > 0) {
        if (_0x39cd6e.includes("[name]") && _0x120031) {
          const _0x234b4e = await this.getContactName(_0x3a98e3, _0x120031, _0xc8949f, _0x406498);
          _0x39cd6e = _0x39cd6e.replace(/\[name\]/g, _0x234b4e);
        }
        if (_0x39cd6e.includes("{{user_name}}") && _0x120031) {
          const _0x3a33b8 = await this.getContactName(_0x3a98e3, _0x120031, _0xc8949f, _0x406498);
          _0x39cd6e = _0x39cd6e.replace(/{{user_name}}/g, _0x3a33b8);
        }
        if (_0x39cd6e.includes("{{user_email}}") && _0x120031) {
          const _0x42e8b2 = await this.getContactEmail(_0x3a98e3, _0x120031, _0xc8949f, _0x406498);
          _0x39cd6e = _0x39cd6e.replace(/{{user_email}}/g, _0x42e8b2);
        }
        if (_0x39cd6e.includes("{{previous_response}}") && _0x406498.last_response) {
          _0x39cd6e = _0x39cd6e.replace(/{{previous_response}}/g, _0x406498.last_response);
        }
        const _0x163478 = /{{node_(\d+)_response}}/g;
        let _0x2c9a25;
        while ((_0x2c9a25 = _0x163478.exec(_0x39cd6e)) !== null) {
          const _0x1519d9 = _0x2c9a25[1];
          const _0x4f6b55 = "node_" + _0x1519d9 + "_response";
          const _0x681bc2 = _0x406498[_0x4f6b55] || "";
          _0x39cd6e = _0x39cd6e.replace(_0x2c9a25[0], _0x681bc2);
        }
        Object.keys(_0x406498).forEach(_0x198b85 => {
          if (_0x198b85.startsWith("custom_")) {
            const _0x2d6922 = _0x198b85.replace("custom_", "");
            const _0x4b7682 = new RegExp("{{" + _0x2d6922 + "}}", "g");
            _0x39cd6e = _0x39cd6e.replace(_0x4b7682, _0x406498[_0x198b85] || "");
          }
        });
      }
      return _0x39cd6e;
    } catch (_0x18ba27) {
      this.logger.error("Error replacing variables:", _0x18ba27);
      return _0x107f13;
    }
  }
  async getContactName(_0x3338a2, _0x3757f6, _0xcde086 = null, _0x139376 = {}) {
    try {
      this.logger.info("🔍 Getting contact name for JID: " + _0x3757f6 + " in session: " + _0x3338a2);
      if (_0x139376 && (_0x139376.user_name || _0x139376.custom_name)) {
        const _0x489c89 = _0x139376.user_name || _0x139376.custom_name;
        this.logger.info("✅ Found contact name from conversation data: " + _0x489c89);
        return _0x489c89.trim();
      }
      if (_0xcde086 && _0xcde086.pushName) {
        this.logger.info("✅ Found contact name from message context: " + _0xcde086.pushName);
        return _0xcde086.pushName.trim();
      }
      const _0x3efa29 = this.extractPhoneNumber(_0x3757f6);
      if (_0x3efa29) {
        try {
          const _0x374548 = require("./database.service");
          const _0x3f93fc = new _0x374548();
          const _0x58fdf2 = await _0x3f93fc.get("SELECT name FROM contacts WHERE phone_number = ? AND is_active = 1", [_0x3efa29]);
          if (_0x58fdf2 && _0x58fdf2.name) {
            this.logger.info("✅ Found contact name from database: " + _0x58fdf2.name);
            return _0x58fdf2.name.trim();
          }
        } catch (_0xe92321) {
          this.logger.warn("Error querying database for contact name:", _0xe92321);
        }
      }
      const _0x540541 = await this.getContactNameFromStore(_0x3338a2, _0x3757f6);
      if (_0x540541 && _0x540541 !== _0x3efa29 && _0x540541 !== "User") {
        this.logger.info("✅ Found contact name from Baileys store: " + _0x540541);
        return _0x540541;
      }
      this.logger.info("🔄 Using phone number as fallback for " + _0x3757f6 + ": " + _0x3efa29);
      return _0x3efa29 || "User";
    } catch (_0x10c1e) {
      this.logger.error("Error getting contact name:", _0x10c1e);
      const _0x1cb167 = this.extractPhoneNumber(_0x3757f6);
      return _0x1cb167 || "User";
    }
  }
  async getContactNameFromStore(_0x5aa905, _0x2035ff) {
    try {
      const _0xdae80a = global.services?.whatsapp;
      if (!_0xdae80a) {
        this.logger.warn("WhatsApp service not available for contact name retrieval");
        const _0x5917ce = this.extractPhoneNumber(_0x2035ff);
        return _0x5917ce || "User";
      }
      const _0x2ae6cd = _0xdae80a.getStore(_0x5aa905);
      if (_0x2ae6cd && _0x2ae6cd.contacts) {
        const _0x48a25e = _0x2ae6cd.contacts[_0x2035ff];
        if (_0x48a25e) {
          const _0x52bd51 = _0x48a25e.notify || _0x48a25e.name || _0x48a25e.verifiedName;
          if (_0x52bd51 && _0x52bd51.trim()) {
            this.logger.info("✅ Found contact name from store for " + _0x2035ff + ": " + _0x52bd51);
            return _0x52bd51.trim();
          }
        }
      }
      const _0x5b9ae0 = this.extractPhoneNumber(_0x2035ff);
      return _0x5b9ae0 || "User";
    } catch (_0x42e949) {
      this.logger.error("Error getting contact name from store:", _0x42e949);
      const _0x28ba86 = this.extractPhoneNumber(_0x2035ff);
      return _0x28ba86 || "User";
    }
  }
  async getContactEmail(_0x2e7cb9, _0x343f25, _0x3d0a49 = null, _0x5107d5 = {}) {
    try {
      this.logger.info("🔍 Getting contact email for JID: " + _0x343f25 + " in session: " + _0x2e7cb9);
      if (_0x5107d5 && (_0x5107d5.user_email || _0x5107d5.custom_email)) {
        const _0x3e61a0 = _0x5107d5.user_email || _0x5107d5.custom_email;
        this.logger.info("✅ Found contact email from conversation data: " + _0x3e61a0);
        return _0x3e61a0.trim();
      }
      const _0x5d2d44 = this.extractPhoneNumber(_0x343f25);
      if (_0x5d2d44) {
        try {
          const _0x16fbc8 = require("./database.service");
          const _0x58b032 = new _0x16fbc8();
          const _0x302d4e = await _0x58b032.get("SELECT email FROM contacts WHERE phone_number = ? AND is_active = 1", [_0x5d2d44]);
          if (_0x302d4e && _0x302d4e.email) {
            this.logger.info("✅ Found contact email from database: " + _0x302d4e.email);
            return _0x302d4e.email.trim();
          }
        } catch (_0x4627ad) {
          this.logger.warn("Error querying database for contact email:", _0x4627ad);
        }
      }
      this.logger.info("🔄 No email found for " + _0x343f25 + ", using empty string");
      return "";
    } catch (_0x5e0f4a) {
      this.logger.error("Error getting contact email:", _0x5e0f4a);
      return "";
    }
  }
  async getUserName(_0x3b5ad2, _0x145c28, _0x518a7d = {}) {
    try {
      if (_0x518a7d.user_name) {
        return _0x518a7d.user_name;
      }
      const _0x30ea35 = this.extractPhoneNumber(_0x145c28);
      return _0x30ea35 || "User";
    } catch (_0x19eb4a) {
      this.logger.error("Error getting user name:", _0x19eb4a);
      if (_0x145c28) {
        return this.extractPhoneNumber(_0x145c28);
      } else {
        return "User";
      }
    }
  }
  async processChatbotMessage(_0x3e8a8c, _0x1aa7cf = {}, _0x5ef3f6 = null, _0x266ba1 = null, _0x4984e4 = null) {
    try {
      const _0x42f13c = await this.replaceVariables(_0x3e8a8c, {}, _0x1aa7cf, _0x5ef3f6, _0x266ba1, _0x4984e4);
      return {
        success: true,
        content: _0x42f13c,
        type: "text"
      };
    } catch (_0x1126fc) {
      this.logger.error("Error processing chatbot message:", _0x1126fc);
      return {
        success: false,
        error: _0x1126fc.message,
        content: _0x3e8a8c
      };
    }
  }
  extractVariablesFromContent(_0x3ddaef) {
    const _0x5e4885 = /{{(\w+)}}/g;
    const _0x3cb0ea = [];
    let _0x28b8d1;
    while ((_0x28b8d1 = _0x5e4885.exec(_0x3ddaef)) !== null) {
      if (!_0x3cb0ea.includes(_0x28b8d1[1])) {
        _0x3cb0ea.push(_0x28b8d1[1]);
      }
    }
    return _0x3cb0ea;
  }
  storeCustomVariable(_0x299b67, _0x4daa6f, _0x1a94b1) {
    if (!_0x299b67) {
      _0x299b67 = {};
    }
    _0x299b67["custom_" + _0x4daa6f] = _0x1a94b1;
    return _0x299b67;
  }
  extractSmartVariable(_0x154ebf, _0x5bb327) {
    try {
      if (!_0x154ebf || typeof _0x154ebf !== "string") {
        return _0x154ebf || "";
      }
      if (!_0x5bb327 || typeof _0x5bb327 !== "string") {
        return _0x154ebf;
      }
      const _0x336d1f = _0x154ebf.trim();
      const _0x274892 = _0x336d1f.toLowerCase();
      switch (_0x5bb327.toLowerCase()) {
        case "name":
        case "user_name":
        case "first_name":
        case "last_name":
          return this.extractName(_0x336d1f, _0x274892);
        case "email":
        case "email_address":
          return this.extractEmail(_0x336d1f);
        case "phone":
        case "phone_number":
        case "mobile":
          return this.extractPhone(_0x336d1f);
        case "age":
          return this.extractAge(_0x336d1f);
        case "city":
        case "location":
          return this.extractLocation(_0x336d1f, _0x274892);
        default:
          return _0x336d1f;
      }
    } catch (_0x16b390) {
      return _0x154ebf;
    }
  }
  extractName(_0x47bcad, _0x3974fd) {
    const _0x1cc1fc = [/(?:my name is|i am|i'm)\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)?\s*([a-zA-Z\s]+)/i, /(?:call me)\s+([a-zA-Z\s]+)/i, /(?:it's|its)\s+([a-zA-Z]+)(?:\s+here)?/i, /(?:name\s*[:|-]\s*)([a-zA-Z\s]+)/i, /(?:i am called|they call me|people call me)\s+([a-zA-Z\s]+)/i, /(?:this is|here is)\s+(?:mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?)?\s*([a-zA-Z\s]+)/i, /^([a-zA-Z]+(?:\s+[a-zA-Z]+)*)$/];
    for (const _0x3c153e of _0x1cc1fc) {
      const _0x49386e = _0x47bcad.match(_0x3c153e);
      if (_0x49386e && _0x49386e[1]) {
        let _0x113ddc = _0x49386e[1].trim();
        _0x113ddc = this.cleanExtractedName(_0x113ddc);
        if (_0x113ddc && this.isValidName(_0x113ddc)) {
          return _0x113ddc;
        }
      }
    }
    const _0x101324 = _0x47bcad.split(/\s+/).filter(_0x21f689 => _0x21f689.length > 1 && /^[a-zA-Z]+$/.test(_0x21f689) && !this.isCommonWord(_0x21f689.toLowerCase()));
    if (_0x101324.length > 0) {
      const _0x5b0aee = _0x101324.slice(0, 2);
      const _0x220b31 = _0x5b0aee.join(" ");
      if (this.isValidName(_0x220b31)) {
        return _0x220b31;
      }
    }
    return _0x47bcad;
  }
  cleanExtractedName(_0x1a0ea6) {
    const _0x4fb67b = ["sir", "madam", "mr", "mrs", "ms", "dr", "prof", "professor", "and", "the", "a", "an", "is", "am", "are", "was", "were"];
    let _0x572460 = _0x1a0ea6;
    const _0x4827d0 = _0x572460.split(/\s+/);
    const _0x311379 = _0x4827d0.filter(_0xd9128a => !_0x4fb67b.includes(_0xd9128a.toLowerCase()));
    return _0x311379.join(" ").trim();
  }
  isValidName(_0x4594b1) {
    if (!_0x4594b1 || _0x4594b1.length < 2) {
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(_0x4594b1)) {
      return false;
    }
    if (_0x4594b1.length > 50) {
      return false;
    }
    const _0x37220a = _0x4594b1.split(/\s+/);
    const _0x573120 = _0x37220a.some(_0x302e28 => _0x302e28.length > 2 && !this.isCommonWord(_0x302e28.toLowerCase()) && _0x302e28[0] === _0x302e28[0].toUpperCase());
    return _0x573120 || _0x37220a.length <= 2;
  }
  isCommonWord(_0x24b2fd) {
    const _0x26391f = ["the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "through", "during", "before", "after", "above", "below", "between", "among", "this", "that", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "her", "its", "our", "their", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "shall", "hello", "hi", "hey", "good", "morning", "evening", "afternoon", "night", "please", "thank", "thanks", "welcome", "sorry", "yes", "no", "okay", "ok", "sure", "fine", "great", "nice", "well"];
    return _0x26391f.includes(_0x24b2fd);
  }
  extractEmail(_0x570498) {
    const _0x56204 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const _0x8b310f = _0x570498.match(_0x56204);
    if (_0x8b310f) {
      return _0x8b310f[0];
    } else {
      return _0x570498;
    }
  }
  extractPhone(_0x5cb0c0) {
    const _0x2c1281 = [/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/, /(\+?\d{10,15})/, /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/, /(\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/];
    for (const _0x20ecf1 of _0x2c1281) {
      const _0x430731 = _0x5cb0c0.match(_0x20ecf1);
      if (_0x430731) {
        return _0x430731[1].trim();
      }
    }
    let _0x133afe = _0x5cb0c0.replace(/(?:my (?:phone|number|mobile) is|call me at|reach me at|phone:|mobile:)/i, "").trim();
    for (const _0x3225c6 of _0x2c1281) {
      const _0x10ca08 = _0x133afe.match(_0x3225c6);
      if (_0x10ca08) {
        return _0x10ca08[1].trim();
      }
    }
    return _0x5cb0c0;
  }
  extractAge(_0x5b015a) {
    const _0x294772 = [/(?:i am|i'm|my age is|age:|years old)\s*(\d{1,3})/i, /(\d{1,3})\s*(?:years old|yrs old|years|yrs)/i, /^(\d{1,3})$/];
    for (const _0x483f5d of _0x294772) {
      const _0x1c368f = _0x5b015a.match(_0x483f5d);
      if (_0x1c368f && _0x1c368f[1]) {
        const _0x2afe20 = parseInt(_0x1c368f[1]);
        if (_0x2afe20 > 0 && _0x2afe20 < 150) {
          return _0x2afe20.toString();
        }
      }
    }
    return _0x5b015a;
  }
  extractLocation(_0x43f90b, _0xf168d6) {
    const _0x14ff38 = [/(?:i am from|i live in|my city is|city:|location:)\s*([a-zA-Z\s,]+)/i, /(?:from|in)\s+([a-zA-Z\s,]+)$/i];
    for (const _0x2b67a2 of _0x14ff38) {
      const _0x27ba63 = _0x43f90b.match(_0x2b67a2);
      if (_0x27ba63 && _0x27ba63[1]) {
        let _0x1b3eb9 = _0x27ba63[1].trim();
        _0x1b3eb9 = _0x1b3eb9.replace(/[.,;!?]+$/, "");
        if (_0x1b3eb9.length > 1 && _0x1b3eb9.length < 100) {
          return _0x1b3eb9;
        }
      }
    }
    if (_0x43f90b.length < 50 && /^[a-zA-Z\s,.-]+$/.test(_0x43f90b)) {
      return _0x43f90b;
    }
    return _0x43f90b;
  }
}
module.exports = MessageProcessorService;