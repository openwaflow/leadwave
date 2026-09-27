class WebSpeechTranscriptionService {
  constructor() {
    this.isSupported = false;
    this.recognition = null;
    this.isListening = false;
    this.initializeWebSpeechAPI();
    this.setupIpcHandlers();
  }
  initializeWebSpeechAPI() {
    try {
      const _0x42502d = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (_0x42502d) {
        this.recognition = new _0x42502d();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = "en-US";
        this.recognition.maxAlternatives = 1;
        this.isSupported = true;
      } else {}
    } catch (_0x289dcc) {}
  }
  setupIpcHandlers() {
    if (window.electronAPI && window.electronAPI.ipcRenderer) {
      window.electronAPI.ipcRenderer.on("transcribe-audio", async (_0x5e0429, _0x450ee5) => {
        try {
          const _0x26d68b = await this.transcribeAudioData(_0x450ee5.audioData, _0x450ee5.format);
          window.electronAPI.ipcRenderer.send("transcription-result", _0x26d68b);
        } catch (_0xb58d35) {
          window.electronAPI.ipcRenderer.send("transcription-error", _0xb58d35.message);
        }
      });
    }
  }
  async transcribeAudioData(_0x286d22, _0x4d8ec8) {
    return new Promise((_0x315657, _0x319d16) => {
      if (!this.isSupported) {
        _0x319d16(new Error("Web Speech API not supported"));
        return;
      }
      try {
        const _0xcd39e3 = this.base64ToBlob(_0x286d22, "audio/" + _0x4d8ec8);
        const _0x56d0f0 = new Audio();
        const _0x374e89 = URL.createObjectURL(_0xcd39e3);
        _0x56d0f0.src = _0x374e89;
        this.recognition.onresult = _0x5aa576 => {
          const _0x2abab9 = _0x5aa576.results[0][0].transcript;
          const _0x214c26 = _0x5aa576.results[0][0].confidence;
          URL.revokeObjectURL(_0x374e89);
          _0x315657({
            text: _0x2abab9.trim(),
            confidence: _0x214c26 || 0.8
          });
        };
        this.recognition.onerror = _0x3c5319 => {
          URL.revokeObjectURL(_0x374e89);
          _0x319d16(new Error("Speech recognition error: " + _0x3c5319.error));
        };
        this.recognition.onend = () => {
          this.isListening = false;
        };
        this.isListening = true;
        this.recognition.start();
        _0x56d0f0.play().catch(_0x48b79e => {});
        setTimeout(() => {
          if (this.isListening) {
            this.recognition.stop();
            URL.revokeObjectURL(_0x374e89);
            _0x319d16(new Error("Transcription timeout"));
          }
        }, 10000);
      } catch (_0x326227) {
        _0x319d16(_0x326227);
      }
    });
  }
  base64ToBlob(_0x1335f8, _0x351706) {
    const _0x3da164 = atob(_0x1335f8);
    const _0x1de53f = new Array(_0x3da164.length);
    for (let _0x4ff430 = 0; _0x4ff430 < _0x3da164.length; _0x4ff430++) {
      _0x1de53f[_0x4ff430] = _0x3da164.charCodeAt(_0x4ff430);
    }
    const _0x1cee81 = new Uint8Array(_0x1de53f);
    return new Blob([_0x1cee81], {
      type: _0x351706
    });
  }
  async testMicrophoneTranscription() {
    return new Promise((_0x3e75f6, _0x3b7e34) => {
      if (!this.isSupported) {
        _0x3b7e34(new Error("Web Speech API not supported"));
        return;
      }
      this.recognition.onresult = _0x5b1d77 => {
        const _0x57a0d0 = _0x5b1d77.results[0][0].transcript;
        const _0x246821 = _0x5b1d77.results[0][0].confidence;
        _0x3e75f6({
          text: _0x57a0d0.trim(),
          confidence: _0x246821 || 0.8
        });
      };
      this.recognition.onerror = _0x13196c => {
        _0x3b7e34(new Error("Speech recognition error: " + _0x13196c.error));
      };
      this.recognition.start();
    });
  }
}
let webSpeechService = null;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    webSpeechService = new WebSpeechTranscriptionService();
  });
} else {
  webSpeechService = new WebSpeechTranscriptionService();
}
window.webSpeechTranscriptionService = webSpeechService;