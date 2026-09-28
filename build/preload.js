const {
  contextBridge,
  ipcRenderer,
  webFrame
} = require("electron");
try {
  webFrame.setZoomLevel(-0.5);
} catch (_0x33a785) {}
contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("app-version"),
  onShowCloseConfirmation: _0xb77c20 => {
    ipcRenderer.on("app:show-close-confirmation", (_0x4a21ae, _0x3d8ae9) => _0xb77c20(_0x3d8ae9));
  },
  sendCloseConfirmationResponse: _0x3c8b78 => {
    ipcRenderer.send("app:close-confirmation-response", _0x3c8b78);
  },
  showMessageBox: _0x324444 => ipcRenderer.invoke("show-message-box", _0x324444),
  showOpenDialog: _0x1cef97 => ipcRenderer.invoke("show-open-dialog", _0x1cef97),
  showSaveDialog: _0x80a728 => ipcRenderer.invoke("show-save-dialog", _0x80a728),
  whatsapp: {
    createSession: _0x3d62f9 => ipcRenderer.invoke("whatsapp:create-session", _0x3d62f9),
    disconnectSession: _0x2ca8c6 => ipcRenderer.invoke("whatsapp:disconnect-session", _0x2ca8c6),
    reconnectSession: _0x4ed067 => ipcRenderer.invoke("whatsapp:reconnect-session", _0x4ed067),
    deleteSession: _0x36e909 => ipcRenderer.invoke("whatsapp:delete-session", _0x36e909),
    getSessions: () => ipcRenderer.invoke("whatsapp:get-sessions"),
    getSessionStatus: _0x3c2bb0 => ipcRenderer.invoke("whatsapp:get-session-status", _0x3c2bb0),
    requestPairingCode: (_0x2a08b1, _0x29e5f9) => ipcRenderer.invoke("whatsapp:request-pairing-code", _0x2a08b1, _0x29e5f9),
    createPairingSession: _0x203a0f => ipcRenderer.invoke("whatsapp:create-pairing-session", _0x203a0f),
    sendMessage: (_0x7daa65, _0x54698d, _0x403520, _0x33969c, _0x42b3d3) => ipcRenderer.invoke("whatsapp:send-message", _0x7daa65, _0x54698d, _0x403520, _0x33969c, _0x42b3d3),
    sendTemplateMessage: (_0x33902a, _0x156b66, _0x39eb68, _0x2c304d) => ipcRenderer.invoke("whatsapp:send-template-message", _0x33902a, _0x156b66, _0x39eb68, _0x2c304d),
    checkNumber: (_0x3e2c27, _0x4deb13) => ipcRenderer.invoke("whatsapp:check-number", _0x3e2c27, _0x4deb13),
    verifyNumber: _0x1c8cf7 => ipcRenderer.invoke("whatsapp:verify-number", _0x1c8cf7),
    verifyNumbersBatch: _0x4b0acd => ipcRenderer.invoke("whatsapp:verify-numbers-batch", _0x4b0acd),
    getChats: _0x29ebc3 => ipcRenderer.invoke("whatsapp:get-chats", _0x29ebc3),
    getChatHistory: (_0x4a7fb8, _0x14f3b9, _0x2b0c4f) => ipcRenderer.invoke("whatsapp:get-chat-history", _0x4a7fb8, _0x14f3b9, _0x2b0c4f),
    markChatAsRead: (_0x5c479d, _0x4d145c) => ipcRenderer.invoke("whatsapp:mark-chat-as-read", _0x5c479d, _0x4d145c),
    resolveLID: (_0xf99fe6, _0x234df5) => ipcRenderer.invoke("whatsapp:resolve-lid", _0xf99fe6, _0x234df5),
    resolveLIDsBatch: (_0x2b52d2, _0x45c06e) => ipcRenderer.invoke("whatsapp:resolve-lids-batch", _0x2b52d2, _0x45c06e),
    resolveRecipient: (_0x2fcf8f, _0x543c15) => ipcRenderer.invoke("whatsapp:resolve-recipient", _0x2fcf8f, _0x543c15),
    getUsernameForJid: (_0x39289d, _0x4dc843) => ipcRenderer.invoke("whatsapp:get-username-for-jid", _0x39289d, _0x4dc843),
    getProfilePicture: (_0x7abf60, _0x3c1e35) => ipcRenderer.invoke("whatsapp:get-profile-picture", _0x7abf60, _0x3c1e35),
    triggerOutgoingCall: (_0x27fdd8, _0x5299e9) => ipcRenderer.invoke("whatsapp:trigger-outgoing-call", _0x27fdd8, _0x5299e9),
    downloadMedia: (_0x4c0901, _0x598903) => ipcRenderer.invoke("whatsapp:download-media", _0x4c0901, _0x598903),
    uploadMedia: _0x2ebeac => ipcRenderer.invoke("whatsapp:upload-media", _0x2ebeac),
    fetchAllGroups: _0x436b9a => ipcRenderer.invoke("whatsapp:fetch-all-groups", _0x436b9a),
    getGroupMetadata: (_0x5abda1, _0x283bd6) => ipcRenderer.invoke("whatsapp:get-group-metadata", _0x5abda1, _0x283bd6),
    getGroupInviteCode: (_0x4b56bf, _0x1d56d6) => ipcRenderer.invoke("whatsapp:get-group-invite-code", _0x4b56bf, _0x1d56d6),
    getGroupInfoByInvite: (_0x304d22, _0x54a313) => ipcRenderer.invoke("whatsapp:get-group-info-by-invite", _0x304d22, _0x54a313),
    createGroup: (_0x2d0ea6, _0x1dc951, _0x537101, _0x40efe1) => ipcRenderer.invoke("whatsapp:create-group", _0x2d0ea6, _0x1dc951, _0x537101, _0x40efe1),
    addGroupParticipants: (_0x49f164, _0x2c15d9, _0x28f572) => ipcRenderer.invoke("whatsapp:add-group-participants", _0x49f164, _0x2c15d9, _0x28f572),
    removeGroupParticipants: (_0xef557b, _0x120fb0, _0x356918) => ipcRenderer.invoke("whatsapp:remove-group-participants", _0xef557b, _0x120fb0, _0x356918),
    promoteGroupParticipants: (_0x403bf3, _0x13ffd6, _0x2b7f4a) => ipcRenderer.invoke("whatsapp:promote-group-participants", _0x403bf3, _0x13ffd6, _0x2b7f4a),
    demoteGroupParticipants: (_0x5a9ad7, _0x3f4d6e, _0x5829f0) => ipcRenderer.invoke("whatsapp:demote-group-participants", _0x5a9ad7, _0x3f4d6e, _0x5829f0),
    updateGroupSubject: (_0x4c7c84, _0x4c5719, _0x42d58f) => ipcRenderer.invoke("whatsapp:update-group-subject", _0x4c7c84, _0x4c5719, _0x42d58f),
    updateGroupDescription: (_0x5be9d8, _0x5cfa76, _0x4adb0c) => ipcRenderer.invoke("whatsapp:update-group-description", _0x5be9d8, _0x5cfa76, _0x4adb0c),
    updateGroupSettings: (_0x4ee7cd, _0x281940, _0xd121c8) => ipcRenderer.invoke("whatsapp:update-group-settings", _0x4ee7cd, _0x281940, _0xd121c8),
    updateGroupPhoto: (_0x2d0c0d, _0x43138f, _0x344ec9) => ipcRenderer.invoke("whatsapp:update-group-photo", _0x2d0c0d, _0x43138f, _0x344ec9),
    removeGroupPhoto: (_0xe5ea08, _0x30b6d1) => ipcRenderer.invoke("whatsapp:remove-group-photo", _0xe5ea08, _0x30b6d1),
    leaveGroup: (_0x57789e, _0x588aac) => ipcRenderer.invoke("whatsapp:leave-group", _0x57789e, _0x588aac),
    joinGroupWithInvite: (_0x36a0d9, _0x2c7cd5) => ipcRenderer.invoke("whatsapp:join-group-with-invite", _0x36a0d9, _0x2c7cd5),
    revokeGroupInvite: (_0x509d21, _0x555d3e) => ipcRenderer.invoke("whatsapp:revoke-group-invite", _0x509d21, _0x555d3e),
    sendGroupMessage: (_0xb3c4e3, _0x975acb, _0x2f7a27, _0x54388b, _0x308783) => ipcRenderer.invoke("whatsapp:send-group-message", _0xb3c4e3, _0x975acb, _0x2f7a27, _0x54388b, _0x308783),
    getLabels: _0x3fbf1b => ipcRenderer.invoke("whatsapp:get-labels", _0x3fbf1b),
    getChatsByLabel: (_0x68e5dc, _0x3d8135) => ipcRenderer.invoke("whatsapp:get-chats-by-label", _0x68e5dc, _0x3d8135),
    blockContact: (_0x19e516, _0x4de85c) => ipcRenderer.invoke("whatsapp:block-contact", _0x19e516, _0x4de85c),
    blockContactComprehensive: (_0x16cfc6, _0x236cd1, _0x4085fb) => ipcRenderer.invoke("whatsapp:comprehensive-block-contact", _0x16cfc6, _0x236cd1, _0x4085fb),
    unblockContact: (_0x49672b, _0x4379c3) => ipcRenderer.invoke("whatsapp:unblock-contact", _0x49672b, _0x4379c3),
    getBlockedContacts: _0x25a1e4 => ipcRenderer.invoke("whatsapp:get-blocked-contacts", _0x25a1e4),
    bulkUpdateGroups: (_0x150043, _0x5943a6) => ipcRenderer.invoke("whatsapp:bulk-update-groups", _0x150043, _0x5943a6),
    bulkUpdateGroupPhotos: (_0x27dbc0, _0x2fbaea) => ipcRenderer.invoke("whatsapp:bulk-update-group-photos", _0x27dbc0, _0x2fbaea),
    debugSpecificPoll: (_0x4f4106, _0x4f872d) => ipcRenderer.invoke("whatsapp:debug-specific-poll", _0x4f4106, _0x4f872d),
    scanExistingPolls: _0x5d257a => ipcRenderer.invoke("whatsapp:scan-existing-polls", _0x5d257a),
    debugDatabasePolls: () => ipcRenderer.invoke("whatsapp:debug-database-polls"),
    forceCheckPollVotes: _0x822d29 => ipcRenderer.invoke("whatsapp:force-check-poll-votes", _0x822d29),
    fixPollVotesDirectly: () => ipcRenderer.invoke("whatsapp:fix-poll-votes-directly"),
    on: (_0x2412c4, _0x520543) => {
      const _0x787dbe = "whatsapp:" + _0x2412c4.replace(/_/g, "-");
      ipcRenderer.on(_0x787dbe, (_0xb73775, _0x181e72) => _0x520543(_0x181e72));
      return () => ipcRenderer.removeAllListeners(_0x787dbe);
    },
    onQRCode: _0x2f2a74 => {
      ipcRenderer.on("whatsapp:qr-code", (_0x2f974e, _0x23f02c) => _0x2f2a74(_0x23f02c));
      return () => ipcRenderer.removeAllListeners("whatsapp:qr-code");
    },
    onSessionConnected: _0x19fba4 => {
      ipcRenderer.on("whatsapp:session-connected", (_0x19cf71, _0x23b334) => {
        _0x19fba4(_0x23b334);
      });
      return () => ipcRenderer.removeAllListeners("whatsapp:session-connected");
    },
    onSessionDisconnected: _0x342bb8 => {
      ipcRenderer.on("whatsapp:session-disconnected", (_0x3574aa, _0x4ebfc) => {
        _0x342bb8(_0x4ebfc);
      });
      return () => ipcRenderer.removeAllListeners("whatsapp:session-disconnected");
    },
    onSessionStatusUpdate: _0x1ac5bf => {
      ipcRenderer.on("whatsapp:session-status-update", (_0x4b275d, _0x3c36ff) => _0x1ac5bf(_0x3c36ff));
      return () => ipcRenderer.removeAllListeners("whatsapp:session-status-update");
    },
    onMessageReceived: _0x394dff => {
      const _0x12ce6f = (_0x527a7e, _0x4c0c4a) => _0x394dff(_0x4c0c4a);
      ipcRenderer.on("whatsapp:message-received", _0x12ce6f);
      return () => ipcRenderer.removeListener("whatsapp:message-received", _0x12ce6f);
    },
    onContactsUpdate: _0x4558bb => {
      ipcRenderer.on("whatsapp:contacts-update", (_0x5b5e9f, _0x44cd5d) => _0x4558bb(_0x44cd5d));
      return () => ipcRenderer.removeAllListeners("whatsapp:contacts-update");
    },
    onPresenceUpdate: _0x3b5f12 => {
      ipcRenderer.on("whatsapp:presence-update", (_0x300795, _0x450345) => _0x3b5f12(_0x450345));
      return () => ipcRenderer.removeAllListeners("whatsapp:presence-update");
    },
    onCallReceived: _0x3536ba => {
      ipcRenderer.on("whatsapp:call-received", (_0x12561d, _0x1de7d0) => _0x3536ba(_0x1de7d0));
      return () => ipcRenderer.removeAllListeners("whatsapp:call-received");
    },
    onSessionDeleted: _0x219ea0 => {
      ipcRenderer.on("whatsapp:session-deleted", (_0x40134a, _0x1f1ee7) => _0x219ea0(_0x1f1ee7));
      return () => ipcRenderer.removeAllListeners("whatsapp:session-deleted");
    },
    removeListener: (_0x53d3ef, _0x30382c) => ipcRenderer.removeListener(_0x53d3ef, _0x30382c),
    removeAllListeners: _0xdaa365 => {
      if (_0xdaa365) {
        const _0x2bfb31 = "whatsapp:" + _0xdaa365.replace(/_/g, "-");
        ipcRenderer.removeAllListeners(_0x2bfb31);
      } else {
        ipcRenderer.removeAllListeners("whatsapp:qr-code");
        ipcRenderer.removeAllListeners("whatsapp:session-connected");
        ipcRenderer.removeAllListeners("whatsapp:session-disconnected");
        ipcRenderer.removeAllListeners("whatsapp:session-status-update");
        ipcRenderer.removeAllListeners("whatsapp:message-received");
        ipcRenderer.removeAllListeners("whatsapp:call-received");
        ipcRenderer.removeAllListeners("whatsapp:session-deleted");
      }
    }
  },
  database: {
    query: (_0x3fddb3, _0x189b53) => ipcRenderer.invoke("db-query", _0x3fddb3, _0x189b53),
    deleteAllData: () => ipcRenderer.invoke("database:delete-all-data"),
    seedTestSessions: () => ipcRenderer.invoke("database:seed-test-sessions")
  },
  templates: {
    saveRichMessage: _0x25b95b => ipcRenderer.invoke("templates:save-rich-message", _0x25b95b),
    saveCarousel: _0x4abe79 => ipcRenderer.invoke("templates:save-carousel", _0x4abe79),
    saveLinkPreview: _0x5e7551 => ipcRenderer.invoke("templates:save-link-preview", _0x5e7551)
  },
  optOut: {
    isOptedOut: (_0x5bd9e1, _0x33615c) => ipcRenderer.invoke("optOut:isOptedOut", _0x5bd9e1, _0x33615c),
    optOut: (_0x47cb4b, _0x237f3e) => ipcRenderer.invoke("optOut:optOut", _0x47cb4b, _0x237f3e),
    optIn: (_0x350764, _0x1082f6) => ipcRenderer.invoke("optOut:optIn", _0x350764, _0x1082f6),
    deleteOptOuts: _0x1e5208 => ipcRenderer.invoke("optOut:deleteOptOuts", _0x1e5208),
    filterContactsForBulkMessaging: (_0x1f4f95, _0x3fff62) => ipcRenderer.invoke("optOut:filterContactsForBulkMessaging", _0x1f4f95, _0x3fff62),
    getOptedOutContacts: _0xcdb47e => ipcRenderer.invoke("optOut:getOptedOutContacts", _0xcdb47e),
    getStatistics: _0x18d524 => ipcRenderer.invoke("optOut:getStatistics", _0x18d524),
    getComplianceReport: _0x5ecae4 => ipcRenderer.invoke("optOut:getComplianceReport", _0x5ecae4),
    getAutoResponseMessages: () => ipcRenderer.invoke("optOut:getAutoResponseMessages"),
    updateAutoResponseMessages: _0x4a5e84 => ipcRenderer.invoke("optOut:updateAutoResponseMessages", _0x4a5e84)
  },
  campaignScheduler: {
    getStatus: () => ipcRenderer.invoke("campaign-scheduler:get-status"),
    triggerCheck: () => ipcRenderer.invoke("campaign-scheduler:trigger-check"),
    startCampaign: _0x23d9da => ipcRenderer.invoke("campaign-scheduler:start-campaign", _0x23d9da)
  },
  app: {
    getStats: () => ipcRenderer.invoke("app-stats"),
    getHealth: () => ipcRenderer.invoke("app-health"),
    getRecentActivities: _0x590f46 => ipcRenderer.invoke("app-recent-activities", _0x590f46),
    quit: () => ipcRenderer.invoke("app-quit"),
    restart: () => ipcRenderer.invoke("app:restart"),
    getServicesStatus: () => ipcRenderer.invoke("app:services-ready-status"),
    onServicesReady: _0x5aec29 => {
      ipcRenderer.on("app:services-ready", (_0x2cdf7b, _0x516e88) => _0x5aec29(_0x516e88));
      return () => ipcRenderer.removeAllListeners("app:services-ready");
    },
    getSampleFile: _0x541e54 => ipcRenderer.invoke("app:get-sample-file", _0x541e54)
  },
  recallBot: {
    test: () => ipcRenderer.invoke("recall-bot:test"),
    getSettings: _0x31f6ae => ipcRenderer.invoke("recall-bot:get-settings", _0x31f6ae),
    updateSettings: (_0x44fe74, _0x54c174) => ipcRenderer.invoke("recall-bot:update-settings", _0x44fe74, _0x54c174),
    getReminders: _0x29c098 => ipcRenderer.invoke("recall-bot:get-reminders", _0x29c098),
    cancelReminder: (_0x412978, _0x542675) => ipcRenderer.invoke("recall-bot:cancel-reminder", _0x412978, _0x542675),
    getStats: _0x3014d9 => ipcRenderer.invoke("recall-bot:get-stats", _0x3014d9),
    testAIConnection: (_0x7ac98e, _0x4a861e, _0x4e959d) => ipcRenderer.invoke("recall-bot:test-ai-connection", _0x7ac98e, _0x4a861e, _0x4e959d),
    testTranscription: (_0x5432c4, _0x8c3252) => ipcRenderer.invoke("recall-bot:test-transcription", _0x5432c4, _0x8c3252)
  },
  license: {
    getMachineId: () => ipcRenderer.invoke("license:get-machine-id"),
    activate: _0x351c5a => ipcRenderer.invoke("license:activate", _0x351c5a),
    upgrade: _0x31f917 => ipcRenderer.invoke("license:upgrade", _0x31f917),
    renew: _0x1dfa02 => ipcRenderer.invoke("license:renew", _0x1dfa02),
    registerTrial: _0x13fad3 => ipcRenderer.invoke("license:register-trial", _0x13fad3),
    requestGasTrial: params => ipcRenderer.invoke("license:request-gas-trial", params),
    activateGasPaidKey: params => ipcRenderer.invoke("license:activate-gas-key", params),
    validate: () => ipcRenderer.invoke("license:validate"),
    getLocalInfo: () => ipcRenderer.invoke("license:get-local-info"),
    saveLocalInfo: _0x527933 => ipcRenderer.invoke("license:save-local-info", _0x527933),
    clearLocalData: () => ipcRenderer.invoke("license:clear-local-data"),
    checkMachine: () => ipcRenderer.invoke("license:check-machine"),
    checkStatus: _0x30c34a => ipcRenderer.invoke("license:check-status", _0x30c34a),
    forceRefresh: () => ipcRenderer.invoke("license:force-refresh"),
    backgroundStatus: () => ipcRenderer.invoke("license:background-status"),
    debugClear: () => ipcRenderer.invoke("license:debug-clear"),
    extractCompanyInfo: _0x521bf0 => ipcRenderer.invoke("license:extract-company-info", _0x521bf0)
  },
  cloudLicense: {
    activate: _0x1d4a88 => ipcRenderer.invoke("cloud-license:activate", _0x1d4a88),
    validate: () => ipcRenderer.invoke("cloud-license:validate"),
    getInfo: () => ipcRenderer.invoke("cloud-license:get-info"),
    hasLicense: () => ipcRenderer.invoke("cloud-license:has-license"),
    delete: () => ipcRenderer.invoke("cloud-license:delete")
  },
  newlicLicense: {
    activate: _0x1135af => ipcRenderer.invoke("newlic-license:activate", _0x1135af),
    validate: () => ipcRenderer.invoke("newlic-license:validate"),
    getInfo: () => ipcRenderer.invoke("newlic-license:get-info"),
    clear: () => ipcRenderer.invoke("newlic-license:clear"),
    validateModule: _0x130b00 => ipcRenderer.invoke("newlic-license:validate-module", _0x130b00)
  },
  reseller: {
    getConfig: () => ipcRenderer.invoke("reseller:get-config")
  },
  window: {
    toggleFrame: _0x1ea0f1 => ipcRenderer.invoke("window:toggle-frame", _0x1ea0f1),
    getFrameStatus: () => ipcRenderer.invoke("window:get-frame-status"),
    applySavedPreference: () => ipcRenderer.invoke("window:apply-saved-preference")
  },
  email: {
    testConfiguration: _0x100a3a => ipcRenderer.invoke("email:test-configuration", _0x100a3a)
  },
  warmer: {
    createCampaign: _0x5bfc1b => ipcRenderer.invoke("warmer:create-campaign", _0x5bfc1b),
    getCampaigns: () => ipcRenderer.invoke("warmer:get-campaigns"),
    updateCampaign: (_0x314693, _0x29dada) => ipcRenderer.invoke("warmer:update-campaign", _0x314693, _0x29dada),
    deleteCampaign: _0x200d55 => ipcRenderer.invoke("warmer:delete-campaign", _0x200d55),
    startCampaign: _0x46c0a4 => ipcRenderer.invoke("warmer:start-campaign", _0x46c0a4),
    stopCampaign: _0x595c20 => ipcRenderer.invoke("warmer:stop-campaign", _0x595c20),
    createTemplate: _0x36ed62 => ipcRenderer.invoke("warmer:create-template", _0x36ed62),
    getTemplates: () => ipcRenderer.invoke("warmer:get-templates"),
    updateTemplate: (_0xb8eb8b, _0x425dcb) => ipcRenderer.invoke("warmer:update-template", _0xb8eb8b, _0x425dcb),
    deleteTemplate: _0x5db13b => ipcRenderer.invoke("warmer:delete-template", _0x5db13b),
    onCampaignUpdated: _0x4d7f63 => {
      ipcRenderer.on("warmer:campaign-updated", (_0x57a8f1, _0x44ceca) => _0x4d7f63(_0x44ceca));
      return () => ipcRenderer.removeAllListeners("warmer:campaign-updated");
    }
  },
  deviceHealth: {
    getScore: _0x5e596f => ipcRenderer.invoke("device-health:get-score", _0x5e596f),
    getAllScores: () => ipcRenderer.invoke("device-health:get-all-scores"),
    getCachedScores: () => ipcRenderer.invoke("device-health:get-cached-scores"),
    getHistory: (_0x330106, _0x460ec0) => ipcRenderer.invoke("device-health:get-history", _0x330106, _0x460ec0),
    preflightCheck: (_0x389ce1, _0xd4e730) => ipcRenderer.invoke("device-health:preflight-check", _0x389ce1, _0xd4e730),
    getBanEvents: _0x2329d4 => ipcRenderer.invoke("device-health:get-ban-events", _0x2329d4),
    clearBanFlag: _0x1a0b56 => ipcRenderer.invoke("device-health:clear-ban-flag", _0x1a0b56),
    onBanSuspected: _0x3fd6fa => {
      ipcRenderer.on("device-health:ban-suspected", (_0x1d3b7e, _0x41b7b9) => _0x3fd6fa(_0x41b7b9));
      return () => ipcRenderer.removeAllListeners("device-health:ban-suspected");
    }
  },
  proxy: {
    saveApiKey: _0x496d91 => ipcRenderer.invoke("proxy:save-api-key", _0x496d91),
    getSettings: () => ipcRenderer.invoke("proxy:get-settings"),
    syncAccount: () => ipcRenderer.invoke("proxy:sync-account"),
    getPrice: (_0x16fff0, _0x2eb850, _0x5948bd) => ipcRenderer.invoke("proxy:get-price", _0x16fff0, _0x2eb850, _0x5948bd),
    getCountries: _0x326ed4 => ipcRenderer.invoke("proxy:get-countries", _0x326ed4),
    getCount: (_0x3c45ad, _0x1d84c4) => ipcRenderer.invoke("proxy:get-count", _0x3c45ad, _0x1d84c4),
    buyProxy: (_0x4d31a7, _0x1da4c9, _0x40bb61, _0x30bc03, _0x4179ac, _0x1f63b6, _0x1b179e) => ipcRenderer.invoke("proxy:buy-proxy", _0x4d31a7, _0x1da4c9, _0x40bb61, _0x30bc03, _0x4179ac, _0x1f63b6, _0x1b179e),
    syncProxies: _0x51fc8b => ipcRenderer.invoke("proxy:sync-proxies", _0x51fc8b),
    getProxies: _0x970f3e => ipcRenderer.invoke("proxy:get-proxies", _0x970f3e),
    prolongProxy: (_0x10ff7b, _0x25d8e6) => ipcRenderer.invoke("proxy:prolong-proxy", _0x10ff7b, _0x25d8e6),
    deleteProxy: _0x43d5d6 => ipcRenderer.invoke("proxy:delete-proxy", _0x43d5d6),
    checkProxy: _0x5c1b4a => ipcRenderer.invoke("proxy:check-proxy", _0x5c1b4a),
    setProxyType: (_0x3a1220, _0x45727b) => ipcRenderer.invoke("proxy:set-type", _0x3a1220, _0x45727b),
    getStatistics: () => ipcRenderer.invoke("proxy:get-statistics"),
    assignToCampaign: (_0x328b9a, _0x3dc36e, _0x6f67cb) => ipcRenderer.invoke("proxy:assign-to-campaign", _0x328b9a, _0x3dc36e, _0x6f67cb),
    getForCampaign: (_0x286d12, _0x3e785f) => ipcRenderer.invoke("proxy:get-for-campaign", _0x286d12, _0x3e785f),
    saveAsocksApiKey: _0x4d0bf1 => ipcRenderer.invoke("proxy:save-asocks-api-key", _0x4d0bf1),
    syncAsocksAccount: () => ipcRenderer.invoke("proxy:sync-asocks-account"),
    syncAsocksProxies: () => ipcRenderer.invoke("proxy:sync-asocks-proxies")
  },
  fs: {
    readFile: _0x4d9f32 => ipcRenderer.invoke("fs-read-file", _0x4d9f32),
    writeFile: (_0x591784, _0x81e9a0) => ipcRenderer.invoke("fs-write-file", _0x591784, _0x81e9a0)
  },
  shell: {
    openExternal: _0x26a461 => ipcRenderer.invoke("shell-open-external", _0x26a461)
  },
  backup: {
    create: _0x5b967c => ipcRenderer.invoke("backup:create", _0x5b967c),
    restore: (_0x4f311a, _0x2f2f70) => ipcRenderer.invoke("backup:restore", _0x4f311a, _0x2f2f70),
    schedule: (_0x265683, _0x257b07) => ipcRenderer.invoke("backup:schedule", _0x265683, _0x257b07),
    cancelSchedule: _0x247f8c => ipcRenderer.invoke("backup:cancel-schedule", _0x247f8c),
    getHistory: () => ipcRenderer.invoke("backup:get-history"),
    selectFile: () => ipcRenderer.invoke("backup:select-file"),
    selectSaveLocation: _0x370b03 => ipcRenderer.invoke("backup:select-save-location", _0x370b03),
    downloadToLocal: _0x3fc088 => ipcRenderer.invoke("backup:download-to-local", _0x3fc088),
    validateFile: _0x114a91 => ipcRenderer.invoke("backup:validate-file", _0x114a91),
    getFileInfo: _0x15397a => ipcRenderer.invoke("backup:get-file-info", _0x15397a),
    cleanOld: _0x749704 => ipcRenderer.invoke("backup:clean-old", _0x749704)
  },
  utils: {
    isElectron: true,
    platform: process.platform,
    isDevelopment: () => ipcRenderer.invoke("app:is-development")
  },
  voiceTranscription: {
    sendTranscriptionResult: _0x28473f => {
      ipcRenderer.send("transcription-result", _0x28473f);
    },
    sendTranscriptionError: _0x5048c1 => {
      ipcRenderer.send("transcription-error", _0x5048c1);
    },
    onTranscribeAudio: _0x344337 => {
      ipcRenderer.on("transcribe-audio", (_0x5ed66f, _0x48f1c2) => _0x344337(_0x48f1c2));
      return () => ipcRenderer.removeAllListeners("transcribe-audio");
    }
  },
  events: {
    on: (_0x35a088, _0x3175c5) => {
      ipcRenderer.on(_0x35a088, (_0x51fba6, _0x1157ed) => _0x3175c5(_0x1157ed));
      return () => ipcRenderer.removeAllListeners(_0x35a088);
    },
    removeListener: (_0x24f07a, _0x3d0890) => {
      ipcRenderer.removeListener(_0x24f07a, _0x3d0890);
    },
    removeAllListeners: _0x1feec5 => {
      ipcRenderer.removeAllListeners(_0x1feec5);
    }
  },
  notifications: {
    getNotifications: () => ipcRenderer.invoke("notifications:get-notifications"),
    getLatestNotifications: _0x4bd3e0 => ipcRenderer.invoke("notifications:get-latest", _0x4bd3e0),
    markAsRead: _0x5936ff => ipcRenderer.invoke("notifications:mark-as-read", _0x5936ff),
    getStats: () => ipcRenderer.invoke("notifications:get-stats"),
    onNewNotification: _0x544117 => {
      ipcRenderer.on("notifications:new-notification", (_0x322157, _0x29570a) => _0x544117(_0x29570a));
      return () => ipcRenderer.removeAllListeners("notifications:new-notification");
    },
    onNotificationUpdate: _0x1a7dc2 => {
      ipcRenderer.on("notifications:update", (_0x9b68fc, _0x110786) => _0x1a7dc2(_0x110786));
      return () => ipcRenderer.removeAllListeners("notifications:update");
    },
    onShowToast: _0x213a63 => {
      ipcRenderer.on("notifications:show-toast", (_0x40278c, _0x22d35f) => _0x213a63(_0x22d35f));
      return () => ipcRenderer.removeAllListeners("notifications:show-toast");
    }
  },
  update: {
    checkForUpdates: (_0x490fd2 = false) => ipcRenderer.invoke("update:check-for-updates", _0x490fd2),
    downloadUpdate: () => ipcRenderer.invoke("update:download-update"),
    installUpdate: () => ipcRenderer.invoke("update:install-update"),
    installSimple: () => ipcRenderer.invoke("update:install-simple"),
    getUpdateInfo: () => ipcRenderer.invoke("update:get-update-info"),
    verifyDataIntegrity: () => ipcRenderer.invoke("update:verify-data-integrity"),
    createBackup: () => ipcRenderer.invoke("update:create-backup"),
    getDataSummary: () => ipcRenderer.invoke("update:get-data-summary"),
    validateBranding: () => ipcRenderer.invoke("update:validate-branding"),
    getBrandingSummary: () => ipcRenderer.invoke("update:get-branding-summary"),
    performBrandingAudit: () => ipcRenderer.invoke("update:perform-branding-audit"),
    lockBranding: () => ipcRenderer.invoke("update:lock-branding"),
    onInstallationProgress: _0x3ec03b => {
      ipcRenderer.on("show-installation-progress", (_0x4dd4c5, _0x23ddb8) => _0x3ec03b(_0x23ddb8));
      ipcRenderer.on("update-installation-progress", (_0x44f1f9, _0x5bb245) => _0x3ec03b(_0x5bb245));
      ipcRenderer.on("hide-installation-progress", (_0x589cd9, _0x1cd0dd) => _0x3ec03b(_0x1cd0dd));
      return () => {
        ipcRenderer.removeAllListeners("show-installation-progress");
        ipcRenderer.removeAllListeners("update-installation-progress");
        ipcRenderer.removeAllListeners("hide-installation-progress");
      };
    }
  },
  on: (_0x2822e1, _0x4b239b) => {
    ipcRenderer.on(_0x2822e1, (_0x37592e, _0x9d62dd) => _0x4b239b(_0x37592e, _0x9d62dd));
  },
  removeListener: (_0x3899bb, _0x56765f) => {
    ipcRenderer.removeListener(_0x3899bb, _0x56765f);
  },
  ipcRenderer: {
    on: (_0x3b6a89, _0x4a5240) => {
      ipcRenderer.on(_0x3b6a89, _0x4a5240);
    },
    removeListener: (_0x5b98e1, _0x2bb1b7) => {
      ipcRenderer.removeListener(_0x5b98e1, _0x2bb1b7);
    }
  },
  translation: {
    getTranslationsForLanguage: _0xf8d6a3 => ipcRenderer.invoke("translation:get-translations-for-language", _0xf8d6a3),
    updateTranslation: (_0x1311e4, _0xaaf357, _0x4dd5e5, _0x40dba3, _0x5550bf) => ipcRenderer.invoke("translation:update-translation", _0x1311e4, _0xaaf357, _0x4dd5e5, _0x40dba3, _0x5550bf),
    deleteTranslation: (_0xa7474f, _0x222845) => ipcRenderer.invoke("translation:delete-translation", _0xa7474f, _0x222845),
    getStats: () => ipcRenderer.invoke("translation:get-stats"),
    syncKeys: () => ipcRenderer.invoke("translation:sync-keys"),
    exportTranslations: _0x58f449 => ipcRenderer.invoke("translation:export-translations", _0x58f449),
    importTranslations: (_0x397ec2, _0x508f13, _0x1264d1) => ipcRenderer.invoke("translation:import-translations", _0x397ec2, _0x508f13, _0x1264d1),
    searchTranslations: (_0xe26f66, _0x27db0d) => ipcRenderer.invoke("translation:search-translations", _0xe26f66, _0x27db0d)
  },
  chatbot: {
    cleanupOrphanedConversations: () => ipcRenderer.invoke("chatbot:cleanup-orphaned-conversations")
  },
  ai: {
    forceMigration: () => ipcRenderer.invoke("ai-schema:force-migration"),
    chatbots: {
      getAll: () => ipcRenderer.invoke("ai-chatbots:get-all"),
      create: _0x497aec => ipcRenderer.invoke("ai-chatbots:create", _0x497aec),
      update: (_0x42faf2, _0x44b7bd) => ipcRenderer.invoke("ai-chatbots:update", _0x42faf2, _0x44b7bd),
      delete: _0xecb792 => ipcRenderer.invoke("ai-chatbots:delete", _0xecb792)
    },
    providers: {
      getAll: () => ipcRenderer.invoke("ai-providers:get-all"),
      create: _0x59f58f => ipcRenderer.invoke("ai-providers:create", _0x59f58f),
      update: (_0x352a2e, _0x225dc7) => ipcRenderer.invoke("ai-providers:update", _0x352a2e, _0x225dc7),
      delete: _0x31fd42 => ipcRenderer.invoke("ai-providers:delete", _0x31fd42)
    },
    documents: {
      upload: (_0x3ebbdd, _0x43ec15, _0xc75605) => ipcRenderer.invoke("ai-documents:upload", _0x3ebbdd, _0x43ec15, _0xc75605),
      getAll: _0x16c9f2 => ipcRenderer.invoke("ai-documents:get-all", _0x16c9f2),
      delete: _0x14129b => ipcRenderer.invoke("ai-documents:delete", _0x14129b)
    }
  },
  liveChat: {
    checkServiceStatus: () => ipcRenderer.invoke("live-chat:check-service-status"),
    forceInitialize: () => ipcRenderer.invoke("live-chat:force-initialize"),
    syncChatHistory: (_0x935610, _0x2e3b77, _0x136e04) => ipcRenderer.invoke("live-chat:sync-chat-history", _0x935610, _0x2e3b77, _0x136e04),
    getOrCreateConversation: (_0x50ef97, _0x886378, _0x480d2c, _0x53b67d, _0x4a5147) => ipcRenderer.invoke("live-chat:get-or-create-conversation", _0x50ef97, _0x886378, _0x480d2c, _0x53b67d, _0x4a5147),
    getConversations: (_0x1650ce, _0x1c8e3d) => ipcRenderer.invoke("live-chat:get-conversations", _0x1650ce, _0x1c8e3d),
    updateConversation: (_0x364e4d, _0xd09df) => ipcRenderer.invoke("live-chat:update-conversation", _0x364e4d, _0xd09df),
    updateConversationStatus: (_0x17c20a, _0x2d1253) => ipcRenderer.invoke("live-chat:update-conversation-status", _0x17c20a, _0x2d1253),
    markAsRead: _0x2893cf => ipcRenderer.invoke("live-chat:mark-as-read", _0x2893cf),
    searchConversations: (_0x1dfacc, _0x2f645f) => ipcRenderer.invoke("live-chat:search-conversations", _0x1dfacc, _0x2f645f),
    saveMessage: (_0x2a8272, _0x4045bc) => ipcRenderer.invoke("live-chat:save-message", _0x2a8272, _0x4045bc),
    getMessages: (_0x133cf7, _0x3334f0, _0x49fc12) => ipcRenderer.invoke("live-chat:get-messages", _0x133cf7, _0x3334f0, _0x49fc12),
    updateMessageAttachment: (_0xd991cd, _0x4e2f51, _0x112325) => ipcRenderer.invoke("live-chat:update-message-attachment", _0xd991cd, _0x4e2f51, _0x112325),
    getContact: _0x85bdf1 => ipcRenderer.invoke("live-chat:get-contact", _0x85bdf1),
    createOrUpdateContact: (_0x23ecc2, _0x242845, _0x55e62c, _0x998b04) => ipcRenderer.invoke("live-chat:create-or-update-contact", _0x23ecc2, _0x242845, _0x55e62c, _0x998b04),
    addNote: (_0x1d31e5, _0x12b23b, _0x46f838, _0x450edd) => ipcRenderer.invoke("live-chat:add-note", _0x1d31e5, _0x12b23b, _0x46f838, _0x450edd),
    getNotes: _0x1c4c89 => ipcRenderer.invoke("live-chat:get-notes", _0x1c4c89),
    updateNote: (_0x3b6f78, _0x1b4a88) => ipcRenderer.invoke("live-chat:update-note", _0x3b6f78, _0x1b4a88),
    deleteNote: _0x256b91 => ipcRenderer.invoke("live-chat:delete-note", _0x256b91),
    getQuickReplies: () => ipcRenderer.invoke("live-chat:get-quick-replies"),
    createQuickReply: (_0x4baf77, _0xd2574b, _0x319057, _0x3a6c3c) => ipcRenderer.invoke("live-chat:create-quick-reply", _0x4baf77, _0xd2574b, _0x319057, _0x3a6c3c),
    getStatistics: _0x54281e => ipcRenderer.invoke("live-chat:get-statistics", _0x54281e),
    onMessageNew: _0x38e782 => {
      const _0x187541 = (_0x16abda, _0x541432) => _0x38e782(_0x541432);
      ipcRenderer.on("live-chat:message-new", _0x187541);
      return () => ipcRenderer.removeListener("live-chat:message-new", _0x187541);
    }
  },
  notification: {
    showChat: _0x174670 => ipcRenderer.invoke("notification:show-chat", _0x174670),
    onChatClicked: _0x40e17a => {
      const _0x169f42 = (_0x165394, _0x18d992) => _0x40e17a(_0x18d992);
      ipcRenderer.on("notification:chat-clicked", _0x169f42);
      return () => ipcRenderer.removeListener("notification:chat-clicked", _0x169f42);
    }
  },
  telegram: {
    setCredentials: (_0x254cf9, _0xad3636) => ipcRenderer.invoke("telegram:set-credentials", _0x254cf9, _0xad3636),
    getSessions: () => ipcRenderer.invoke("telegram:get-sessions"),
    sendPhoneCode: (_0x32046f, _0x566d9a, _0xc69ca6, _0x1b1175) => ipcRenderer.invoke("telegram:send-phone-code", _0x32046f, _0x566d9a, _0xc69ca6, _0x1b1175),
    verifyCode: (_0x465fe2, _0x54e4e4, _0x53da63) => ipcRenderer.invoke("telegram:verify-code", _0x465fe2, _0x54e4e4, _0x53da63),
    disconnectSession: _0x3ceb2c => ipcRenderer.invoke("telegram:disconnect-session", _0x3ceb2c),
    reconnectSession: _0xa6b2e4 => ipcRenderer.invoke("telegram:reconnect-session", _0xa6b2e4),
    deleteSession: _0x3c4a18 => ipcRenderer.invoke("telegram:delete-session", _0x3c4a18),
    sendMessage: (_0x17e3b3, _0x53df60, _0x50365d, _0x572d0b) => ipcRenderer.invoke("telegram:send-message", _0x17e3b3, _0x53df60, _0x50365d, _0x572d0b),
    sendFile: (_0x44e365, _0x5ce0b4, _0x84e9d4, _0x4ebe12) => ipcRenderer.invoke("telegram:send-file", _0x44e365, _0x5ce0b4, _0x84e9d4, _0x4ebe12),
    getDialogs: (_0x53eb50, _0x456828) => ipcRenderer.invoke("telegram:get-dialogs", _0x53eb50, _0x456828),
    getMessages: (_0x2d447f, _0x19fa79, _0x3a3495) => ipcRenderer.invoke("telegram:get-messages", _0x2d447f, _0x19fa79, _0x3a3495),
    downloadMedia: (_0x2404e5, _0x2fb0b9, _0xfc348) => ipcRenderer.invoke("telegram:download-media", _0x2404e5, _0x2fb0b9, _0xfc348),
    getGroups: _0x3c51e8 => ipcRenderer.invoke("telegram:get-groups", _0x3c51e8),
    broadcast: (_0x240a2c, _0x23ef3c, _0x240e87, _0xb4d88b) => ipcRenderer.invoke("telegram:broadcast", _0x240a2c, _0x23ef3c, _0x240e87, _0xb4d88b),
    onBroadcastProgress: _0x448bdd => {
      const _0x51f5d3 = (_0x1461bb, _0x4ae661) => _0x448bdd(_0x4ae661);
      ipcRenderer.on("telegram:broadcast-progress", _0x51f5d3);
      return () => ipcRenderer.removeListener("telegram:broadcast-progress", _0x51f5d3);
    },
    getAutoReplies: _0x5d03d7 => ipcRenderer.invoke("telegram:get-auto-replies", _0x5d03d7),
    saveAutoReply: (_0x3cf262, _0x49bd4d) => ipcRenderer.invoke("telegram:save-auto-reply", _0x3cf262, _0x49bd4d),
    deleteAutoReply: _0x1d0893 => ipcRenderer.invoke("telegram:delete-auto-reply", _0x1d0893),
    getAISettings: _0x37eb89 => ipcRenderer.invoke("telegram:get-ai-settings", _0x37eb89),
    saveAISettings: (_0x38aed1, _0xad9738) => ipcRenderer.invoke("telegram:save-ai-settings", _0x38aed1, _0xad9738),
    getConversations: _0x3d6d86 => ipcRenderer.invoke("telegram:get-conversations", _0x3d6d86),
    getChatMessages: (_0x1e92ab, _0x79a81a, _0x561bfb, _0x5b8ccf) => ipcRenderer.invoke("telegram:get-chat-messages", _0x1e92ab, _0x79a81a, _0x561bfb, _0x5b8ccf),
    upsertConversation: (_0x5e68a4, _0x3e9717, _0x586cab) => ipcRenderer.invoke("telegram:upsert-conversation", _0x5e68a4, _0x3e9717, _0x586cab),
    subscribeMessages: _0x52127f => ipcRenderer.invoke("telegram:subscribe-messages", _0x52127f),
    onMessageNew: _0x1cd2fd => {
      const _0x101dbe = (_0x573a65, _0x350a37) => _0x1cd2fd(_0x350a37);
      ipcRenderer.on("telegram:message-new", _0x101dbe);
      return () => ipcRenderer.removeListener("telegram:message-new", _0x101dbe);
    },
    pickFile: _0x3bde47 => ipcRenderer.invoke("show-open-dialog", _0x3bde47 || {
      title: "Select File",
      filters: [{
        name: "Images",
        extensions: ["jpg", "jpeg", "png", "gif", "webp", "bmp"]
      }, {
        name: "Videos",
        extensions: ["mp4", "mov", "avi", "mkv", "webm"]
      }, {
        name: "Audio",
        extensions: ["mp3", "ogg", "wav", "m4a", "flac"]
      }, {
        name: "Documents",
        extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "txt"]
      }, {
        name: "All Files",
        extensions: ["*"]
      }],
      properties: ["openFile"]
    })
  },
  invoke: (_0x2c6a60, ..._0x25afcc) => ipcRenderer.invoke(_0x2c6a60, ..._0x25afcc)
});