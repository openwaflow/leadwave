window.testGroupParticipants = async function (_0x1306d8, _0x5cd8db) {
  if (!_0x1306d8) {
    console.error("❌ Please provide a valid sessionId");
    return;
  }
  if (!_0x5cd8db || !Array.isArray(_0x5cd8db)) {
    console.error("❌ Please provide an array of phone numbers");
    return;
  }
  const _0x34ed51 = [];
  for (const _0x3d0791 of _0x5cd8db) {
    try {
      const _0x1cb368 = await window.electronAPI.whatsapp.checkNumber(_0x1306d8, _0x3d0791);
      if (_0x1cb368.success) {
        if (_0x1cb368.exists) {} else {}
      } else {}
      _0x34ed51.push({
        phone: _0x3d0791,
        whatsappCheck: _0x1cb368,
        timestamp: new Date().toISOString()
      });
      await new Promise(_0x3c8f62 => setTimeout(_0x3c8f62, 2000));
    } catch (_0x353065) {
      console.error("   ❌ Error testing " + _0x3d0791 + ":", _0x353065);
      _0x34ed51.push({
        phone: _0x3d0791,
        error: _0x353065.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  _0x34ed51.forEach((_0x28ae47, _0x5ef58c) => {
    if (_0x28ae47.error) {} else if (_0x28ae47.whatsappCheck) {
      const _0x144e0a = _0x28ae47.whatsappCheck.success ? _0x28ae47.whatsappCheck.exists ? "✅ Valid" : "❌ Not on WhatsApp" : "⚠️ Check failed: " + _0x28ae47.whatsappCheck.error;
    }
  });
  const _0x5132b6 = _0x34ed51.filter(_0x4e1284 => _0x4e1284.whatsappCheck && _0x4e1284.whatsappCheck.success && _0x4e1284.whatsappCheck.exists);
  const _0x3aafc5 = _0x34ed51.filter(_0x4c2aed => _0x4c2aed.whatsappCheck && _0x4c2aed.whatsappCheck.success && !_0x4c2aed.whatsappCheck.exists);
  const _0x4f9949 = _0x34ed51.filter(_0x12dc9f => _0x12dc9f.error || _0x12dc9f.whatsappCheck && !_0x12dc9f.whatsappCheck.success);
  if (_0x3aafc5.length > 0) {}
  if (_0x4f9949.length > 0) {}
  return _0x34ed51;
};
window.testAddToGroup = async function (_0x3922f0, _0x546b17, _0x4a91d4) {
  if (!_0x3922f0 || !_0x546b17 || !_0x4a91d4) {
    console.error("❌ Usage: testAddToGroup(sessionId, groupId, [phoneNumbers])");
    return;
  }
  try {
    const _0x11ce77 = await window.electronAPI.whatsapp.addGroupParticipants(_0x3922f0, _0x546b17, _0x4a91d4);
    if (_0x11ce77.success) {
      if (_0x11ce77.validationResults) {
        _0x11ce77.validationResults.forEach((_0x123aca, _0x324d0d) => {
          const _0x1307c9 = _0x123aca.isValid ? "✅" : "❌";
        });
      }
      if (_0x11ce77.addedCount !== undefined && _0x11ce77.totalRequested !== undefined) {}
    } else if (_0x11ce77.validationResults) {
      _0x11ce77.validationResults.forEach((_0x2a8c4b, _0x38f0eb) => {
        const _0x2e105c = _0x2a8c4b.isValid ? "✅" : "❌";
      });
    }
    return _0x11ce77;
  } catch (_0x2605f2) {
    console.error("❌ Error during group addition:", _0x2605f2);
    return {
      success: false,
      error: _0x2605f2.message
    };
  }
};