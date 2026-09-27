class NotificationSoundService {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.5;
    this.initAudioContext();
  }
  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_0xf5ef8b) {}
  }
  createNotificationSound() {
    if (!this.audioContext || !this.isEnabled) {
      return;
    }
    try {
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      const _0x4a8931 = this.audioContext.createOscillator();
      const _0x49e5f4 = this.audioContext.createGain();
      _0x4a8931.connect(_0x49e5f4);
      _0x49e5f4.connect(this.audioContext.destination);
      _0x4a8931.type = "sine";
      _0x4a8931.frequency.setValueAtTime(800, this.audioContext.currentTime);
      _0x4a8931.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
      _0x49e5f4.gain.setValueAtTime(0, this.audioContext.currentTime);
      _0x49e5f4.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.05);
      _0x49e5f4.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
      _0x4a8931.start(this.audioContext.currentTime);
      _0x4a8931.stop(this.audioContext.currentTime + 0.3);
    } catch (_0x222835) {
      this.playFallbackSound();
    }
  }
  playFallbackSound() {
    if (!this.isEnabled) {
      return;
    }
    try {
      const _0x3b4475 = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT");
      _0x3b4475.volume = this.volume;
      _0x3b4475.play().catch(_0x5d589c => {});
    } catch (_0x3d43f5) {}
  }
  playNotificationSound() {
    this.createNotificationSound();
  }
  setEnabled(_0x13a580) {
    this.isEnabled = _0x13a580;
    localStorage.setItem("notificationSoundsEnabled", _0x13a580.toString());
  }
  isNotificationSoundEnabled() {
    const _0x3f2b33 = localStorage.getItem("notificationSoundsEnabled");
    if (_0x3f2b33 !== null) {
      this.isEnabled = _0x3f2b33 === "true";
    }
    return this.isEnabled;
  }
  setVolume(_0x4e6661) {
    this.volume = Math.max(0, Math.min(1, _0x4e6661));
    localStorage.setItem("notificationSoundVolume", this.volume.toString());
  }
  getVolume() {
    const _0x2ede17 = localStorage.getItem("notificationSoundVolume");
    if (_0x2ede17 !== null) {
      this.volume = parseFloat(_0x2ede17);
    }
    return this.volume;
  }
  testSound() {
    const _0x41c9a6 = this.isEnabled;
    this.isEnabled = true;
    this.playNotificationSound();
    this.isEnabled = _0x41c9a6;
  }
  loadPreferences() {
    this.isNotificationSoundEnabled();
    this.getVolume();
  }
}
const notificationSoundService = new NotificationSoundService();
notificationSoundService.loadPreferences();
export default notificationSoundService;