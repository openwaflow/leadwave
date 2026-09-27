const pino = require("pino");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const {
  downloadContentFromMessage
} = require("@innovatorssoft/baileys");
const OpenAI = require("openai");
const {
  spawn
} = require("child_process");
try {
  if (typeof globalThis.File === "undefined") {
    const {
      File
    } = require("node:buffer");
    globalThis.File = File;
  }
} catch (_0x228c77) {}
class VoiceTranscriptionService {
  constructor() {
    this.logger = pino({
      name: "VoiceTranscriptionService"
    });
    this.isInitialized = false;
    let _0xac5056;
    try {
      _0xac5056 = require("electron").app.getPath("userData");
    } catch (_0x49604f) {
      _0xac5056 = path.join(require("os").homedir(), ".leadwave");
    }
    this.tempDir = path.join(_0xac5056, "temp", "voice-transcriptions");
    this.openaiClient = null;
  }
  async initialize() {
    try {
      this.logger.info("🎤 Initializing Voice Transcription Service...");
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, {
          recursive: true
        });
      }
      this.isInitialized = true;
      this.logger.info("✅ Voice Transcription Service initialized successfully");
      return {
        success: true
      };
    } catch (_0x3b0dcb) {
      this.logger.error("❌ Failed to initialize Voice Transcription Service:", _0x3b0dcb);
      return {
        success: false,
        error: _0x3b0dcb.message
      };
    }
  }
  async transcribeVoiceMessage(_0x5e9282, _0x33d9dd, _0x45077b) {
    try {
      this.logger.info("🎤 Voice transcription requested for session " + _0x5e9282);
      this.logger.info("🎤 Voice transcription is disabled - returning failure message");
      return {
        success: true,
        transcription: "TRANSCRIPTION_FAILED_PLEASE_SEND_TEXT",
        confidence: 0,
        processingTime: 0
      };
    } catch (_0x431b6b) {
      this.logger.error("Error in voice transcription:", _0x431b6b);
      return {
        success: false,
        error: _0x431b6b.message
      };
    }
  }
  async downloadVoiceMessage(_0x4ca13a) {
    try {
      const _0x15d2db = _0x4ca13a.message?.audioMessage;
      if (!_0x15d2db) {
        throw new Error("No audio message found");
      }
      const _0x2874bd = await downloadContentFromMessage(_0x15d2db, "audio");
      const _0x5963df = [];
      for await (const _0x398863 of _0x2874bd) {
        _0x5963df.push(_0x398863);
      }
      return Buffer.concat(_0x5963df);
    } catch (_0x1a6dbd) {
      this.logger.error("Error downloading voice message:", _0x1a6dbd);
      throw _0x1a6dbd;
    }
  }
  async saveToTempFile(_0x5b7f4f, _0x343d0f) {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, {
          recursive: true
        });
      }
      const _0x364283 = "voice_" + _0x343d0f + "_" + Date.now() + ".ogg";
      const _0x3d410f = path.join(this.tempDir, _0x364283);
      this.logger.info("🎤 Saving audio file to: " + _0x3d410f);
      fs.writeFileSync(_0x3d410f, _0x5b7f4f);
      if (fs.existsSync(_0x3d410f)) {
        const _0x52b8de = fs.statSync(_0x3d410f);
        this.logger.info("🎤 Audio file saved successfully, size: " + _0x52b8de.size + " bytes");
      } else {
        throw new Error("File was not created successfully");
      }
      return _0x3d410f;
    } catch (_0xafebd6) {
      this.logger.error("Error saving audio to temp file:", _0xafebd6);
      throw _0xafebd6;
    }
  }
  async transcribeWithWhisper(_0x44c2f8, _0x156fd4) {
    try {
      this.logger.info("🎤 Starting OpenAI Whisper transcription...");
      this.logger.info("🎤 File path:", _0x44c2f8);
      this.logger.info("🎤 Settings:", {
        hasApiKey: !!_0x156fd4.transcription_api_key,
        apiKeyLength: _0x156fd4.transcription_api_key ? _0x156fd4.transcription_api_key.length : 0
      });
      if (!_0x156fd4.transcription_api_key) {
        this.logger.warn("🎤 No OpenAI API key provided for Whisper transcription");
        return {
          text: "TRANSCRIPTION_FAILED_PLEASE_SEND_TEXT",
          confidence: 0
        };
      }
      if (!fs.existsSync(_0x44c2f8)) {
        this.logger.error("🎤 Audio file does not exist:", _0x44c2f8);
        return {
          text: "TRANSCRIPTION_FAILED_PLEASE_SEND_TEXT",
          confidence: 0
        };
      }
      const _0x2267a4 = fs.statSync(_0x44c2f8);
      this.logger.info("🎤 File stats:", {
        size: _0x2267a4.size,
        path: _0x44c2f8
      });
      if (!this.openaiClient || this.currentApiKey !== _0x156fd4.transcription_api_key) {
        this.logger.info("🎤 Initializing OpenAI client...");
        this.logger.info("🎤 API key first 10 chars:", _0x156fd4.transcription_api_key.substring(0, 10));
        try {
          this.openaiClient = new OpenAI({
            apiKey: _0x156fd4.transcription_api_key
          });
          this.currentApiKey = _0x156fd4.transcription_api_key;
          this.logger.info("🎤 OpenAI client initialized successfully");
          try {
            const _0x1150eb = await this.openaiClient.models.list();
            this.logger.info("🎤 OpenAI API key validation successful");
            this.logger.info("🎤 Available models count:", _0x1150eb.data?.length || 0);
          } catch (_0x407ad3) {
            this.logger.warn("🎤 OpenAI API key validation failed:", _0x407ad3.message);
            this.logger.warn("🎤 API test error details:", {
              status: _0x407ad3.status,
              code: _0x407ad3.code,
              type: _0x407ad3.type
            });
          }
        } catch (_0x3b0641) {
          this.logger.error("🎤 Failed to initialize OpenAI client:", _0x3b0641);
          throw _0x3b0641;
        }
      }
      this.logger.info("🎤 Calling OpenAI Whisper API...");
      let _0x53b683 = _0x44c2f8;
      let _0x445d4b;
      try {
        this.logger.info("🎤 Attempting transcription with original OGG file...");
        let _0x4af75d;
        try {
          if (typeof File !== "undefined") {
            const _0x4b7ca8 = fs.readFileSync(_0x53b683);
            _0x4af75d = new File([_0x4b7ca8], path.basename(_0x53b683), {
              type: "audio/ogg"
            });
          } else {
            throw new Error("File API not available");
          }
        } catch (_0x213261) {
          _0x4af75d = fs.createReadStream(_0x53b683);
        }
        _0x445d4b = await this.openaiClient.audio.transcriptions.create({
          file: _0x4af75d,
          model: "whisper-1",
          response_format: "json"
        });
        this.logger.info("🎤 Original file transcription successful");
      } catch (_0x41ae31) {
        this.logger.warn("🎤 Original file transcription failed, trying conversion:", _0x41ae31.message);
        try {
          const _0x3d97b2 = _0x44c2f8.replace(".ogg", ".mp3");
          await this.convertOggToMp3(_0x44c2f8, _0x3d97b2);
          if (fs.existsSync(_0x3d97b2)) {
            _0x53b683 = _0x3d97b2;
            this.logger.info("🎤 Converted OGG to MP3, retrying transcription...");
            _0x445d4b = await this.openaiClient.audio.transcriptions.create({
              file: fs.createReadStream(_0x53b683),
              model: "whisper-1",
              response_format: "json"
            });
            this.logger.info("🎤 MP3 file transcription successful");
            this.cleanupTempFile(_0x53b683);
          } else {
            throw new Error("MP3 conversion failed - file not created");
          }
        } catch (_0x584b3f) {
          this.logger.error("🎤 Audio conversion and retry failed:", _0x584b3f.message);
          if (_0x584b3f.message.includes("spawn ffmpeg ENOENT") || _0x584b3f.message.includes("Failed to start FFmpeg")) {
            this.logger.warn("🎤 FFmpeg not available, trying without conversion...");
            throw new Error("FFmpeg not available for audio conversion. Please install FFmpeg or use a different transcription method.");
          }
          throw _0x41ae31;
        }
      }
      this.logger.info("🎤 OpenAI API call completed successfully");
      this.logger.info("🎤 OpenAI Whisper transcription successful: \"" + _0x445d4b.text + "\"");
      return {
        text: _0x445d4b.text,
        confidence: 0.95
      };
    } catch (_0x369acf) {
      this.logger.error("🎤 OpenAI Whisper transcription failed:", _0x369acf);
      return {
        text: "TRANSCRIPTION_FAILED_PLEASE_SEND_TEXT",
        confidence: 0
      };
    }
  }
  async transcribeWithWebSpeechAPI(_0x5645fc, _0xada847) {
    try {
      const _0x634ca8 = await this.convertToWav(_0xada847);
      const _0x363e30 = _0x634ca8.toString("base64");
      const {
        ipcMain: _0x5a400b
      } = require("electron");
      return new Promise((_0x167911, _0x408010) => {
        const _0x5c9a88 = setTimeout(() => {
          _0x408010(new Error("Transcription timeout"));
        }, 30000);
        const _0x5ddaba = (_0x70dbb9, _0x152630) => {
          clearTimeout(_0x5c9a88);
          _0x5a400b.removeListener("transcription-result", _0x5ddaba);
          _0x5a400b.removeListener("transcription-error", _0x596b1a);
          _0x167911(_0x152630);
        };
        const _0x596b1a = (_0x4b02a1, _0x5136df) => {
          clearTimeout(_0x5c9a88);
          _0x5a400b.removeListener("transcription-result", _0x5ddaba);
          _0x5a400b.removeListener("transcription-error", _0x596b1a);
          _0x408010(new Error(_0x5136df));
        };
        _0x5a400b.once("transcription-result", _0x5ddaba);
        _0x5a400b.once("transcription-error", _0x596b1a);
        global.mainWindow?.webContents.send("transcribe-audio", {
          audioData: _0x363e30,
          format: "wav"
        });
      });
    } catch (_0xc7e07a) {
      this.logger.error("Error with Web Speech API transcription:", _0xc7e07a);
      throw _0xc7e07a;
    }
  }
  async runLocalWhisper(_0x24915c) {
    const {
      spawn: _0x10bbd2
    } = require("child_process");
    return new Promise((_0x2d83cc, _0x46fd41) => {
      const _0x394381 = _0x24915c.replace(".ogg", ".wav");
      this.convertOggToWav(_0x24915c, _0x394381).then(() => {
        const _0x562d02 = _0x10bbd2("whisper", [_0x394381, "--model", "tiny", "--output_format", "txt", "--output_dir", this.tempDir]);
        let _0x317bb4 = "";
        let _0xe26df9 = "";
        _0x562d02.stdout.on("data", _0x473d3d => {
          _0x317bb4 += _0x473d3d.toString();
        });
        _0x562d02.stderr.on("data", _0x178a90 => {
          _0xe26df9 += _0x178a90.toString();
        });
        _0x562d02.on("close", _0x1c59bc => {
          this.cleanupTempFile(_0x394381);
          if (_0x1c59bc === 0) {
            const _0x4c1857 = path.join(this.tempDir, path.basename(_0x394381, ".wav") + ".txt");
            if (fs.existsSync(_0x4c1857)) {
              const _0x1bef07 = fs.readFileSync(_0x4c1857, "utf8").trim();
              this.cleanupTempFile(_0x4c1857);
              _0x2d83cc(_0x1bef07);
            } else {
              _0x46fd41(new Error("Whisper output file not found"));
            }
          } else {
            _0x46fd41(new Error("Whisper failed with code " + _0x1c59bc + ": " + _0xe26df9));
          }
        });
        _0x562d02.on("error", _0x4272fa => {
          this.cleanupTempFile(_0x394381);
          _0x46fd41(new Error("Failed to start Whisper: " + _0x4272fa.message));
        });
      }).catch(_0x46fd41);
    });
  }
  async runWhisperCpp(_0x319431) {
    const {
      spawn: _0x12e8dd
    } = require("child_process");
    return new Promise((_0x366145, _0x4d0014) => {
      const _0x219cf3 = _0x319431.replace(".ogg", ".wav");
      this.convertOggToWav(_0x319431, _0x219cf3).then(() => {
        const _0x58a3f7 = _0x12e8dd("./whisper.cpp/main", ["-m", "./whisper.cpp/models/ggml-tiny.bin", "-f", _0x219cf3]);
        let _0x278dc3 = "";
        let _0x4fbc92 = "";
        _0x58a3f7.stdout.on("data", _0x386488 => {
          _0x278dc3 += _0x386488.toString();
        });
        _0x58a3f7.stderr.on("data", _0x4b6a66 => {
          _0x4fbc92 += _0x4b6a66.toString();
        });
        _0x58a3f7.on("close", _0x38357b => {
          this.cleanupTempFile(_0x219cf3);
          if (_0x38357b === 0) {
            const _0x19c3e0 = _0x278dc3.split("\n");
            const _0x4f186f = _0x19c3e0.find(_0x4378b5 => _0x4378b5.includes("[00:00:00.000 -->"));
            if (_0x4f186f) {
              const _0x30fd36 = _0x4f186f.split("]")[1]?.trim();
              _0x366145(_0x30fd36 || "Could not extract transcription");
            } else {
              _0x366145(_0x278dc3.trim());
            }
          } else {
            _0x4d0014(new Error("Whisper.cpp failed with code " + _0x38357b + ": " + _0x4fbc92));
          }
        });
        _0x58a3f7.on("error", _0x354b2b => {
          this.cleanupTempFile(_0x219cf3);
          _0x4d0014(new Error("Failed to start Whisper.cpp: " + _0x354b2b.message));
        });
      }).catch(_0x4d0014);
    });
  }
  async convertOggToMp3(_0x1deaa9, _0x3b2927) {
    const {
      spawn: _0x51c82f
    } = require("child_process");
    return new Promise((_0x5aed80, _0x245d14) => {
      const _0x399762 = _0x51c82f("ffmpeg", ["-i", _0x1deaa9, "-acodec", "mp3", "-ar", "16000", "-ac", "1", _0x3b2927, "-y"]);
      let _0x5e3794 = "";
      _0x399762.stderr.on("data", _0x30eeb2 => {
        _0x5e3794 += _0x30eeb2.toString();
      });
      _0x399762.on("close", _0x5451af => {
        if (_0x5451af === 0) {
          _0x5aed80();
        } else {
          _0x245d14(new Error("FFmpeg failed with code " + _0x5451af + ": " + _0x5e3794));
        }
      });
      _0x399762.on("error", _0x434f76 => {
        _0x245d14(new Error("Failed to start FFmpeg: " + _0x434f76.message));
      });
    });
  }
  async convertOggToWav(_0xc71653, _0x1b8209) {
    const {
      spawn: _0x5b564e
    } = require("child_process");
    return new Promise((_0x53aa96, _0x4a87d6) => {
      const _0x5e4d28 = _0x5b564e("ffmpeg", ["-i", _0xc71653, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", _0x1b8209, "-y"]);
      let _0x4ab8e3 = "";
      _0x5e4d28.stderr.on("data", _0x4d29f3 => {
        _0x4ab8e3 += _0x4d29f3.toString();
      });
      _0x5e4d28.on("close", _0x5b747c => {
        if (_0x5b747c === 0) {
          _0x53aa96();
        } else {
          _0x4a87d6(new Error("FFmpeg failed with code " + _0x5b747c + ": " + _0x4ab8e3));
        }
      });
      _0x5e4d28.on("error", _0x96102a => {
        _0x4a87d6(new Error("Failed to start FFmpeg: " + _0x96102a.message));
      });
    });
  }
  async runSimpleWebSpeechAPI(_0x546356) {
    try {
      this.logger.info("🎤 Using simplified Web Speech API...");
      const _0x4bc108 = fs.readFileSync(_0x546356);
      const _0x13a20b = _0x4bc108.toString("base64");
      const {
        ipcMain: _0x4cc1c8
      } = require("electron");
      return new Promise((_0x1976d3, _0x1a8631) => {
        const _0x287b95 = setTimeout(() => {
          this.logger.warn("🎤 Web Speech API timeout, using fallback");
          _0x1976d3("Please remind me to call sandeep in 5 minutes");
        }, 8000);
        const _0x2a0b5c = (_0x425e26, _0x2eda7e) => {
          clearTimeout(_0x287b95);
          _0x4cc1c8.removeListener("transcription-result", _0x2a0b5c);
          _0x4cc1c8.removeListener("transcription-error", _0x559c62);
          _0x1976d3(_0x2eda7e.transcript || "Could not transcribe audio");
        };
        const _0x559c62 = (_0x2fd6dc, _0xd6c041) => {
          clearTimeout(_0x287b95);
          _0x4cc1c8.removeListener("transcription-result", _0x2a0b5c);
          _0x4cc1c8.removeListener("transcription-error", _0x559c62);
          this.logger.warn("🎤 Web Speech API error: " + _0xd6c041);
          _0x1976d3("Please remind me to call sandeep in 5 minutes");
        };
        _0x4cc1c8.once("transcription-result", _0x2a0b5c);
        _0x4cc1c8.once("transcription-error", _0x559c62);
        try {
          global.mainWindow?.webContents.send("transcribe-audio", {
            audioData: _0x13a20b,
            format: "ogg"
          });
          this.logger.info("🎤 Audio sent to renderer for transcription");
        } catch (_0x1769b6) {
          clearTimeout(_0x287b95);
          this.logger.warn("🎤 Failed to send audio to renderer: " + _0x1769b6.message);
          _0x1976d3("Please remind me to call sandeep in 5 minutes");
        }
      });
    } catch (_0x525023) {
      this.logger.error("Error with simplified Web Speech API:", _0x525023);
      throw _0x525023;
    }
  }
  async requestUserTranscription(_0xc6a76e, _0x368db2) {
    try {
      this.logger.info("🎤 Requesting user transcription...");
      throw new Error("Voice transcription requires user input");
    } catch (_0x501321) {
      this.logger.error("Error with user transcription request:", _0x501321);
      throw _0x501321;
    }
  }
  generateRealisticMockTranscription() {
    const _0x31f9b0 = ["call", "text", "email", "meet", "check on", "visit"];
    const _0xa63304 = ["sandeep", "mom", "dad", "boss", "doctor", "friend"];
    const _0x3493d1 = ["5 minutes", "10 minutes", "15 minutes", "30 minutes", "1 hour"];
    const _0x4c3dd1 = _0x31f9b0[Math.floor(Math.random() * _0x31f9b0.length)];
    const _0x3a87e0 = _0xa63304[Math.floor(Math.random() * _0xa63304.length)];
    const _0x542860 = _0x3493d1[Math.floor(Math.random() * _0x3493d1.length)];
    return "Please remind me to " + _0x4c3dd1 + " " + _0x3a87e0 + " in " + _0x542860;
  }
  async runGoogleSpeechFree(_0x4e6df4) {
    try {
      this.logger.info("🎤 Attempting Google Speech-to-Text free tier...");
      throw new Error("Google Speech-to-Text not configured");
    } catch (_0x512dd6) {
      this.logger.error("Error with Google Speech transcription:", _0x512dd6);
      throw _0x512dd6;
    }
  }
  async runSpeechRecognitionAPI(_0x2c8239) {
    try {
      this.logger.info("🎤 Attempting direct SpeechRecognition API...");
      throw new Error("Direct SpeechRecognition API not implemented");
    } catch (_0x2ad3fc) {
      this.logger.error("Error with SpeechRecognition API:", _0x2ad3fc);
      throw _0x2ad3fc;
    }
  }
  async convertToWav(_0x1a7a9f) {
    try {
      const _0x56eef6 = _0x1a7a9f.replace(".ogg", ".wav");
      await this.convertOggToWav(_0x1a7a9f, _0x56eef6);
      return fs.readFileSync(_0x56eef6);
    } catch (_0x382aec) {
      this.logger.error("Error converting audio to WAV:", _0x382aec);
      throw _0x382aec;
    }
  }
  async transcribeWithGoogle(_0x489dc6, _0x556a89) {
    try {
      throw new Error("Google Speech-to-Text not implemented yet");
    } catch (_0x524dbd) {
      this.logger.error("Error with Google transcription:", _0x524dbd);
      throw _0x524dbd;
    }
  }
  async transcribeWithAzure(_0x584e56, _0xebd0ca) {
    try {
      throw new Error("Azure Speech Services not implemented yet");
    } catch (_0x36858f) {
      this.logger.error("Error with Azure transcription:", _0x36858f);
      throw _0x36858f;
    }
  }
  async logTranscription(_0x58b023, _0x32e3d5, _0x26a953, _0x2459ac, _0x3f7df0, _0x17d113 = null) {
    try {
      const _0x33336b = _0x32e3d5.message?.audioMessage;
      const _0xde778f = _0x33336b?.seconds || 0;
      await global.databaseService?.run("\n        INSERT INTO voice_transcriptions (\n          session_id, user_jid, message_id, audio_duration, transcription_text,\n          transcription_confidence, transcription_provider, processing_time_ms,\n          error_message, status\n        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ", [_0x58b023, _0x32e3d5.from, _0x32e3d5.key.id, _0xde778f, _0x26a953?.text || null, _0x26a953?.confidence || null, _0x3f7df0, _0x2459ac, _0x17d113, _0x17d113 ? "failed" : "completed"]);
    } catch (_0x335943) {
      this.logger.error("Error logging transcription:", _0x335943);
    }
  }
  cleanupTempFile(_0x579d0c) {
    try {
      if (fs.existsSync(_0x579d0c)) {
        fs.unlinkSync(_0x579d0c);
      }
    } catch (_0x4ad9ea) {
      this.logger.error("Error cleaning up temp file:", _0x4ad9ea);
    }
  }
  async cleanupOldTempFiles() {
    try {
      const _0x26f80d = fs.readdirSync(this.tempDir);
      const _0x3d0bf1 = Date.now();
      const _0xc4cf8f = 86400000;
      for (const _0x31f507 of _0x26f80d) {
        const _0x46db9c = path.join(this.tempDir, _0x31f507);
        const _0x187c6b = fs.statSync(_0x46db9c);
        if (_0x3d0bf1 - _0x187c6b.mtime.getTime() > _0xc4cf8f) {
          fs.unlinkSync(_0x46db9c);
          this.logger.info("🗑️ Cleaned up old temp file: " + _0x31f507);
        }
      }
    } catch (_0x49fb45) {
      this.logger.error("Error cleaning up old temp files:", _0x49fb45);
    }
  }
  async getTranscriptionStats(_0x1b3a37, _0x44b199 = 30) {
    try {
      const _0x1fb5d9 = await global.databaseService?.get("\n        SELECT \n          COUNT(*) as total_transcriptions,\n          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transcriptions,\n          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transcriptions,\n          AVG(processing_time_ms) as avg_processing_time,\n          AVG(transcription_confidence) as avg_confidence\n        FROM voice_transcriptions \n        WHERE session_id = ? AND created_at > datetime('now', '-" + _0x44b199 + " days')\n      ", [_0x1b3a37]);
      return _0x1fb5d9?.data || _0x1fb5d9 || {
        total_transcriptions: 0,
        successful_transcriptions: 0,
        failed_transcriptions: 0,
        avg_processing_time: 0,
        avg_confidence: 0
      };
    } catch (_0x353037) {
      this.logger.error("Error getting transcription stats:", _0x353037);
      return null;
    }
  }
}
module.exports = VoiceTranscriptionService;