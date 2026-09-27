const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const zlib = require("zlib");
const DEFAULT_IMAGE_QUALITY = 80;
const MIN_IMAGE_QUALITY = 1;
const MAX_IMAGE_QUALITY = 100;
const FFMPEG_TIMEOUT_MS = 120000;
const SUPPORTED_AUDIO_CODECS = new Set(["opus", "aac", "mp3", "m4a", "mp4a", "amr", "amr_nb", "amr_wb"]);
const SUPPORTED_VIDEO_FORMATS = new Set(["mp4", "3gp", "3gpp"]);
const STICKER_DIMENSION = 512;
const STICKER_QUALITY = 80;
class MediaPipeline {
  constructor({
    logger: _0x348dec
  } = {}) {
    this.logger = _0x348dec || console;
    this.artifacts = new Map();
  }
  async generateThumbnail(_0x1028cc, {
    maxDim = 320,
    timeoutMs = 5000
  } = {}) {
    let _0x3b4b95;
    try {
      const _0x3fd66a = new Promise((_0x207bc3, _0x2fc90b) => {
        _0x3b4b95 = setTimeout(() => _0x2fc90b(new Error("Thumbnail generation exceeded " + timeoutMs + "ms")), timeoutMs);
      });
      const _0x8a9ff9 = sharp(_0x1028cc).resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true
      }).toBuffer();
      const _0x364747 = await Promise.race([_0x8a9ff9, _0x3fd66a]);
      return {
        thumbnail: _0x364747,
        degraded: false
      };
    } catch (_0x36e989) {
      const _0x1d5364 = _0x36e989 && _0x36e989.message ? _0x36e989.message : "thumbnail generation failed";
      this.logger.warn("[MediaPipeline] Thumbnail unavailable, degrading: " + _0x1d5364);
      return {
        thumbnail: null,
        degraded: true,
        reason: _0x1d5364
      };
    } finally {
      if (_0x3b4b95) {
        clearTimeout(_0x3b4b95);
      }
    }
  }
  clampQuality(_0x10834b) {
    if (_0x10834b === undefined || _0x10834b === null) {
      return {
        value: DEFAULT_IMAGE_QUALITY
      };
    }
    if (typeof _0x10834b !== "number" || Number.isNaN(_0x10834b)) {
      return {
        value: DEFAULT_IMAGE_QUALITY,
        warning: "Invalid image quality \"" + _0x10834b + "\"; must be an integer from " + MIN_IMAGE_QUALITY + " to " + MAX_IMAGE_QUALITY + ". Retaining default quality " + DEFAULT_IMAGE_QUALITY + "."
      };
    }
    if (_0x10834b < MIN_IMAGE_QUALITY || _0x10834b > MAX_IMAGE_QUALITY) {
      return {
        value: DEFAULT_IMAGE_QUALITY,
        warning: "Image quality " + _0x10834b + " is outside the range " + MIN_IMAGE_QUALITY + "-" + MAX_IMAGE_QUALITY + "; retaining default quality " + DEFAULT_IMAGE_QUALITY + "."
      };
    }
    return {
      value: Math.round(_0x10834b)
    };
  }
  async encodeImage(_0xbcda6f, _0x185f6b) {
    const {
      value: _0x3aa82a
    } = this.clampQuality(_0x185f6b);
    const _0x42b32b = sharp(_0xbcda6f);
    const _0x3c95ea = await _0x42b32b.metadata();
    switch (_0x3c95ea.format) {
      case "png":
        return _0x42b32b.png({
          quality: _0x3aa82a
        }).toBuffer();
      case "webp":
        return _0x42b32b.webp({
          quality: _0x3aa82a
        }).toBuffer();
      case "jpeg":
      case "jpg":
      default:
        return _0x42b32b.jpeg({
          quality: _0x3aa82a
        }).toBuffer();
    }
  }
  async generateWaveform(_0x2a0604, {
    points = 64,
    timeoutMs = FFMPEG_TIMEOUT_MS,
    messageId: _0x7e258f
  } = {}) {
    const _0x296e7a = path.basename(String(_0x2a0604 || ""));
    const _0x16efb8 = this._tempPath("waveform", ".pcm");
    try {
      const _0x4f4616 = ffmpeg(_0x2a0604).noVideo().audioChannels(1).audioFrequency(8000).audioCodec("pcm_s16le").format("s16le");
      await this._runFfmpegWithTimeout(_0x4f4616, {
        timeoutMs: timeoutMs,
        fileName: _0x296e7a,
        outPath: _0x16efb8
      });
      const _0x21db33 = await fs.promises.readFile(_0x16efb8);
      const _0x366262 = this._computeWaveform(_0x21db33, points);
      return {
        waveform: _0x366262,
        degraded: false
      };
    } catch (_0x388b5e) {
      const _0x17ac36 = _0x388b5e && _0x388b5e.message ? _0x388b5e.message : "waveform generation failed";
      this.logger.warn("[MediaPipeline] Waveform unavailable for \"" + _0x296e7a + "\", degrading: " + _0x17ac36);
      return {
        waveform: new Uint8Array(points),
        degraded: true
      };
    } finally {
      await fs.promises.unlink(_0x16efb8).catch(() => {});
      this._untrackArtifact(_0x7e258f, _0x16efb8);
    }
  }
  async transcodeAudio(_0x5d0644, {
    timeoutMs = FFMPEG_TIMEOUT_MS,
    messageId: _0x2b6207
  } = {}) {
    const _0x5e8187 = path.basename(String(_0x5d0644 || ""));
    const _0x5603a2 = this._tempPath("audio", ".ogg");
    const _0x265585 = ffmpeg(_0x5d0644).noVideo().audioCodec("libopus").audioChannels(1).audioFrequency(48000).format("ogg");
    try {
      await this._runFfmpegWithTimeout(_0x265585, {
        timeoutMs: timeoutMs,
        fileName: _0x5e8187,
        outPath: _0x5603a2
      });
    } catch (_0x3bf9e8) {
      await fs.promises.unlink(_0x5603a2).catch(() => {});
      const _0x4a1b4f = _0x3bf9e8 && _0x3bf9e8.message ? _0x3bf9e8.message : "transcoding failed";
      throw new Error("Audio transcoding failed for \"" + _0x5e8187 + "\": " + _0x4a1b4f);
    }
    this._trackArtifact(_0x2b6207, _0x5603a2);
    return {
      outPath: _0x5603a2
    };
  }
  async transcodeVideo(_0x1b9c9d, {
    timeoutMs = FFMPEG_TIMEOUT_MS,
    messageId: _0x144aec
  } = {}) {
    const _0x3b6bbe = path.basename(String(_0x1b9c9d || ""));
    const _0x54df4e = this._tempPath("video", ".mp4");
    const _0xe2850 = ffmpeg(_0x1b9c9d).videoCodec("libx264").audioCodec("aac").format("mp4").outputOptions(["-movflags", "+faststart", "-pix_fmt", "yuv420p"]);
    try {
      await this._runFfmpegWithTimeout(_0xe2850, {
        timeoutMs: timeoutMs,
        fileName: _0x3b6bbe,
        outPath: _0x54df4e
      });
    } catch (_0x16197a) {
      await fs.promises.unlink(_0x54df4e).catch(() => {});
      const _0x1cc1bd = _0x16197a && _0x16197a.message ? _0x16197a.message : "transcoding failed";
      throw new Error("Video transcoding failed for \"" + _0x3b6bbe + "\": " + _0x1cc1bd);
    }
    this._trackArtifact(_0x144aec, _0x54df4e);
    return {
      outPath: _0x54df4e
    };
  }
  isSupportedAudioCodec(_0x5d1695) {
    if (typeof _0x5d1695 !== "string") {
      return false;
    }
    return SUPPORTED_AUDIO_CODECS.has(_0x5d1695.trim().toLowerCase());
  }
  isSupportedVideoFormat(_0x1025aa) {
    if (typeof _0x1025aa !== "string") {
      return false;
    }
    return SUPPORTED_VIDEO_FORMATS.has(_0x1025aa.trim().toLowerCase());
  }
  async cleanupArtifacts(_0x8855e8) {
    const _0x596ad7 = this.artifacts.get(_0x8855e8);
    this.artifacts.delete(_0x8855e8);
    if (!_0x596ad7 || _0x596ad7.length === 0) {
      return {
        removed: [],
        failed: []
      };
    }
    const _0x289eec = [];
    const _0x53e246 = [];
    await Promise.all(_0x596ad7.map(async _0x18f6ec => {
      try {
        await fs.promises.unlink(_0x18f6ec);
        _0x289eec.push(_0x18f6ec);
      } catch (_0x2d3e9a) {
        if (_0x2d3e9a && _0x2d3e9a.code === "ENOENT") {
          _0x289eec.push(_0x18f6ec);
        } else {
          _0x53e246.push(_0x18f6ec);
          this.logger.warn("[MediaPipeline] Failed to remove artifact \"" + _0x18f6ec + "\": " + (_0x2d3e9a && _0x2d3e9a.message));
        }
      }
    }));
    return {
      removed: _0x289eec,
      failed: _0x53e246
    };
  }
  _tempPath(_0x335041, _0x1d9218) {
    const _0x1fe9f5 = path.join(os.tmpdir(), "leadwave-media");
    try {
      fs.mkdirSync(_0x1fe9f5, {
        recursive: true
      });
    } catch (_0x51586e) {}
    const _0x27915c = _0x335041 + "-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex") + _0x1d9218;
    return path.join(_0x1fe9f5, _0x27915c);
  }
  _trackArtifact(_0x551445, _0x4a74d7) {
    if (_0x551445 === undefined || _0x551445 === null || !_0x4a74d7) {
      return;
    }
    const _0x34a349 = this.artifacts.get(_0x551445);
    if (_0x34a349) {
      _0x34a349.push(_0x4a74d7);
    } else {
      this.artifacts.set(_0x551445, [_0x4a74d7]);
    }
  }
  _untrackArtifact(_0x2c9b70, _0x434e3e) {
    if (_0x2c9b70 === undefined || _0x2c9b70 === null || !_0x434e3e) {
      return;
    }
    const _0x32378c = this.artifacts.get(_0x2c9b70);
    if (!_0x32378c) {
      return;
    }
    const _0x39ad85 = _0x32378c.indexOf(_0x434e3e);
    if (_0x39ad85 !== -1) {
      _0x32378c.splice(_0x39ad85, 1);
    }
    if (_0x32378c.length === 0) {
      this.artifacts.delete(_0x2c9b70);
    }
  }
  _runFfmpegWithTimeout(_0x5ec0e4, {
    timeoutMs = FFMPEG_TIMEOUT_MS,
    fileName = "media",
    outPath: _0x49d48e
  }) {
    return new Promise((_0x3d0cc0, _0x58fe68) => {
      let _0xd21836 = false;
      let _0x164f87 = false;
      const _0x4ee2bf = setTimeout(() => {
        _0x164f87 = true;
        try {
          _0x5ec0e4.kill("SIGKILL");
        } catch (_0x2925f3) {}
      }, timeoutMs);
      if (typeof _0x4ee2bf.unref === "function") {
        _0x4ee2bf.unref();
      }
      const _0x40cc17 = (_0x9abc80, _0x1f85f7) => {
        if (_0xd21836) {
          return;
        }
        _0xd21836 = true;
        clearTimeout(_0x4ee2bf);
        _0x9abc80(_0x1f85f7);
      };
      _0x5ec0e4.on("error", _0x2979a6 => {
        if (_0x164f87) {
          _0x40cc17(_0x58fe68, new Error("operation on \"" + fileName + "\" exceeded " + timeoutMs + "ms timeout"));
        } else {
          _0x40cc17(_0x58fe68, _0x2979a6 instanceof Error ? _0x2979a6 : new Error(String(_0x2979a6)));
        }
      }).on("end", () => _0x40cc17(_0x3d0cc0)).save(_0x49d48e);
    });
  }
  _computeWaveform(_0x1fb104, _0x382765) {
    const _0x1c11ea = new Uint8Array(_0x382765);
    if (!_0x1fb104 || _0x1fb104.length < 2 || _0x382765 <= 0) {
      return _0x1c11ea;
    }
    const _0x3ecba2 = Math.floor(_0x1fb104.length / 2);
    if (_0x3ecba2 === 0) {
      return _0x1c11ea;
    }
    const _0x325a8c = Math.max(1, Math.floor(_0x3ecba2 / _0x382765));
    const _0x215c06 = new Array(_0x382765).fill(0);
    let _0x5ba2dd = 1;
    for (let _0x41c250 = 0; _0x41c250 < _0x382765; _0x41c250++) {
      const _0x42a0bc = _0x41c250 * _0x325a8c;
      let _0x3bacbf = 0;
      let _0xf82931 = 0;
      for (let _0x54ff47 = _0x42a0bc; _0x54ff47 < _0x42a0bc + _0x325a8c && _0x54ff47 < _0x3ecba2; _0x54ff47++) {
        const _0x28d686 = _0x1fb104.readInt16LE(_0x54ff47 * 2);
        _0x3bacbf += _0x28d686 * _0x28d686;
        _0xf82931 += 1;
      }
      const _0x1d400f = _0xf82931 > 0 ? Math.sqrt(_0x3bacbf / _0xf82931) : 0;
      _0x215c06[_0x41c250] = _0x1d400f;
      if (_0x1d400f > _0x5ba2dd) {
        _0x5ba2dd = _0x1d400f;
      }
    }
    for (let _0x1c6696 = 0; _0x1c6696 < _0x382765; _0x1c6696++) {
      _0x1c11ea[_0x1c6696] = Math.round(_0x215c06[_0x1c6696] / _0x5ba2dd * 100);
    }
    return _0x1c11ea;
  }
  async convertLottieSticker(_0x5c9ebd) {
    if (!Buffer.isBuffer(_0x5c9ebd) || _0x5c9ebd.length === 0) {
      throw this._stickerError("EMPTY_INPUT", "Sticker input is empty or not a Buffer");
    }
    let _0x112957 = _0x5c9ebd;
    if (_0x5c9ebd.length >= 2 && _0x5c9ebd[0] === 31 && _0x5c9ebd[1] === 139) {
      try {
        _0x112957 = zlib.gunzipSync(_0x5c9ebd);
      } catch (_0x227392) {
        throw this._stickerError("TGS_DECOMPRESSION_FAILED", "Failed to decompress TGS (gzipped Lottie) input: " + (_0x227392 && _0x227392.message ? _0x227392.message : "unknown error"));
      }
    }
    if (this._looksLikeJson(_0x112957)) {
      let _0x29d932;
      try {
        _0x29d932 = JSON.parse(_0x112957.toString("utf8"));
      } catch (_0x706c99) {
        throw this._stickerError("INVALID_JSON", "Sticker input looks like JSON but failed to parse: " + (_0x706c99 && _0x706c99.message ? _0x706c99.message : "unknown error"));
      }
      if (!this._isLottieShape(_0x29d932)) {
        throw this._stickerError("INVALID_LOTTIE", "Sticker JSON is not a valid Lottie animation (expected numeric w/h, a layers array, and a version or in/out-point marker)");
      }
      throw this._stickerError("LOTTIE_RENDERER_UNAVAILABLE", "Valid Lottie/TGS animation received, but no Lottie-to-WebP renderer is available in the current dependency set; cannot produce an animated WebP sticker");
    }
    try {
      const _0x2a4672 = await sharp(_0x112957, {
        animated: true
      }).resize(STICKER_DIMENSION, STICKER_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true
      }).webp({
        quality: STICKER_QUALITY
      }).toBuffer();
      return {
        sticker: _0x2a4672
      };
    } catch (_0x3c07e1) {
      throw this._stickerError("WEBP_ENCODE_FAILED", "Failed to convert sticker source to WebP: " + (_0x3c07e1 && _0x3c07e1.message ? _0x3c07e1.message : "unknown error"));
    }
  }
  _stickerError(_0x4fdfeb, _0x267b6e) {
    const _0x12e117 = new Error(_0x267b6e);
    _0x12e117.name = "StickerConversionError";
    _0x12e117.code = _0x4fdfeb;
    return _0x12e117;
  }
  _looksLikeJson(_0x35e31f) {
    for (let _0x4052a1 = 0; _0x4052a1 < _0x35e31f.length; _0x4052a1++) {
      const _0x33bf47 = _0x35e31f[_0x4052a1];
      if (_0x33bf47 === 32 || _0x33bf47 === 9 || _0x33bf47 === 10 || _0x33bf47 === 13) {
        continue;
      }
      return _0x33bf47 === 123;
    }
    return false;
  }
  _isLottieShape(_0x1b44e2) {
    return !!_0x1b44e2 && typeof _0x1b44e2 === "object" && !Array.isArray(_0x1b44e2) && typeof _0x1b44e2.w === "number" && typeof _0x1b44e2.h === "number" && Array.isArray(_0x1b44e2.layers) && (_0x1b44e2.v !== undefined || typeof _0x1b44e2.ip === "number" && typeof _0x1b44e2.op === "number");
  }
}
module.exports = MediaPipeline;