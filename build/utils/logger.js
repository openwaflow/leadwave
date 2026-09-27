let isDevelopmentMode = null;
const checkDevelopmentMode = () => {
  if (typeof process !== "undefined") {
    return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  }
  if (typeof window !== "undefined") {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:" || window.electronAPI && window.electronAPI.isDevelopment;
  }
  return false;
};
const initLogger = async () => {
  if (isDevelopmentMode === null) {
    try {
      if (window.electronAPI?.utils?.isDevelopment) {
        isDevelopmentMode = await window.electronAPI.utils.isDevelopment();
      } else {
        isDevelopmentMode = checkDevelopmentMode();
      }
    } catch (_0x5618f2) {
      isDevelopmentMode = checkDevelopmentMode();
    }
  }
};
initLogger();
const devLog = (..._0x3c5cd5) => {
  if (isDevelopmentMode === null) {
    isDevelopmentMode = checkDevelopmentMode();
  }
  if (isDevelopmentMode) {}
};
const devWarn = (..._0x4f9798) => {
  if (isDevelopmentMode === null) {
    isDevelopmentMode = checkDevelopmentMode();
  }
  if (isDevelopmentMode) {}
};
const devError = (..._0x3c85e9) => {
  if (isDevelopmentMode === null) {
    isDevelopmentMode = checkDevelopmentMode();
  }
  if (isDevelopmentMode) {
    console.error(..._0x3c85e9);
  }
};
const logError = (..._0x4b0bf8) => {
  if (isDevelopmentMode === null) {
    isDevelopmentMode = checkDevelopmentMode();
  }
  if (isDevelopmentMode) {
    console.error(..._0x4b0bf8);
  }
};
const logWarn = (..._0xee98ef) => {
  if (isDevelopmentMode === null) {
    isDevelopmentMode = checkDevelopmentMode();
  }
  if (isDevelopmentMode) {}
};
const noLog = () => {};
const reinitLogger = () => {
  isDevelopmentMode = null;
  initLogger();
};
module.exports = {
  devLog: devLog,
  devWarn: devWarn,
  devError: devError,
  logError: logError,
  logWarn: logWarn,
  noLog: noLog,
  reinitLogger: reinitLogger
};