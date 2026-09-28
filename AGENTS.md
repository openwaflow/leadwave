# AGENTS.md — Master AI Agent Operating Guide & Fast Router

> 🛑 **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS**:
> **DO NOT SCAN OR GREP THE REPOSITORY.**
> Doing so wastes thousands of tokens, bloats the conversation context, and slows down response times.
> **Consult the Master Task-to-File Router below first.** Identify the exact 1–2 files for your task, inspect only the relevant lines, and make surgical, targeted changes.

---

- **Application Name**: **WAGrow** (formerly Lead Wave)
- **Workspace Path**: `/home/jitendra/Desktop/leadwave/`
- **Active Code Directory**: `/home/jitendra/Desktop/leadwave/leadwave_clean/`
- **Tech Stack**:
  - **Desktop Core**: Electron v30 (Main process in `build/electron.js`, Preload in `build/preload.js`)
  - **Frontend**: React 18 SPA (Compiled bundle in `build/static/`)
  - **WhatsApp Engine**: `@innovatorssoft/baileys` v7.4.7 (in `build/services/whatsapp.service.js`)
  - **Database**: SQLite via `better-sqlite3` v12.1.1 (File: `build/data/wapp.db`, 92 tables)
  - **REST API**: Embedded Express server (in `build/api/server.js`, port 8080)
  - **Convenience Symlinks** in `leadwave_clean/`:
    `services/` -> `build/services/` | `models/` -> `build/models/` | `api/` -> `build/api/` | `database/` -> `build/database/` | `security/` -> `build/security/` | `config/` -> `build/config/` | `utils/` -> `build/utils/`

---

## 2. Deep Brain Knowledge Base

For comprehensive documentation, refer to the files in [`brain/`](file:///home/jitendra/Desktop/leadwave/brain/INDEX.md):
- [brain/01_ARCHITECTURE.md](file:///home/jitendra/Desktop/leadwave/brain/01_ARCHITECTURE.md) — 3-tier architecture, lifecycles, and process boundaries.
- [brain/02_DIRECTORY_AND_FILE_MAP.md](file:///home/jitendra/Desktop/leadwave/brain/02_DIRECTORY_AND_FILE_MAP.md) — Complete file catalog with 1-line descriptions.
- [brain/03_SERVICES_CATALOG.md](file:///home/jitendra/Desktop/leadwave/brain/03_SERVICES_CATALOG.md) — Breakdown of all 47 backend services.
- [brain/04_IPC_CHANNELS_MAP.md](file:///home/jitendra/Desktop/leadwave/brain/04_IPC_CHANNELS_MAP.md) — Reference of all 150+ Electron IPC channels.
- [brain/05_DATABASE_SCHEMA.md](file:///home/jitendra/Desktop/leadwave/brain/05_DATABASE_SCHEMA.md) — Full SQLite database schema (all 92 tables).
- [brain/06_REST_API_MAP.md](file:///home/jitendra/Desktop/leadwave/brain/06_REST_API_MAP.md) — Embedded Express REST API endpoints & webhooks.
- [brain/07_FEATURE_TASK_ROUTER.md](file:///home/jitendra/Desktop/leadwave/brain/07_FEATURE_TASK_ROUTER.md) — The Developer Playbook with 35+ step-by-step recipes.
- [brain/08_SECURITY_LICENSING.md](file:///home/jitendra/Desktop/leadwave/brain/08_SECURITY_LICENSING.md) — Anti-tamper, hardware fingerprinting, and licensing.

---

## 3. Master Task-to-File Fast Router

When user requests a task, match it to the table below and go directly to that file:

| What you want to do | Exact File to Edit | Key Method / Area | IPC Channel / Route |
|---|---|---|---|
| **WhatsApp Connection / QR / Pairing Code** | [whatsapp.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/whatsapp.service.js) | `createSession()`, `requestPairingCode()` | `whatsapp:create-session` |
| **Send WhatsApp Message (Text, Media, File)**| [whatsapp.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/whatsapp.service.js) | `sendMessage()`, `sendTextMessage()` | `whatsapp:send-message` |
| **WhatsApp Buttons, CTA Links, Carousels** | [interactive-builder.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/interactive-builder.js) | `sendInteractiveButtonsMessage()` | `whatsapp:send-template-message` |
| **WhatsApp Polls & Vote Collection** | [poll-tracking.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/poll-tracking.service.js) | `handlePollVote()`, `recordVote()` | `whatsapp:force-check-poll-votes` |
| **Bulk Campaigns & Sending Delay Timers** | [campaign-scheduler.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/campaign-scheduler.service.js) | `startCampaign()`, `processCampaignQueue()` | `campaign-scheduler:start-campaign` |
| **Spintax & Variables (`{name}`, `{phone}`)**| [spintax.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/spintax.service.js) | `parseSpintax()`, `processMessage()` | Used in campaign scheduler |
| **Opt-Out (STOP / Unsubscribe) & GDPR** | [opt-out.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/opt-out.service.js) | `isOptedOut()`, `optOut()` | `optOut:isOptedOut`, `optOut:optOut` |
| **Live Chat Sync, Messages & Agent Notes** | [live-chat.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/live-chat.service.js) | `syncChatHistory()`, `addNote()` | `live-chat:get-conversations` |
| **AI LLM Providers (OpenAI, Gemini, Ollama)**| [ai.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/ai.service.js) | `saveProvider()`, `generateResponse()` | `ai-providers:create` |
| **AI Chatbot WhatsApp Auto-Replies** | [ai-whatsapp.integration.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/ai-whatsapp.integration.js) | `handleIncomingMessage()` | `ai-chatbots:toggle-status` |
| **RAG Knowledge Base & Document Chunks** | [document.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/document.service.js) | `processDocument()`, `getRelevantChunks()` | `ai-documents:upload` |
| **WhatsApp Account Warmer (Anti-Ban)** | [warmer.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/warmer.service.js) | `createCampaign()`, `executeWarmingRound()`| `warmer:start-campaign` |
| **Device Health Score & Ban Risk Check** | [device-health.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/device-health.service.js) | `computeScore()`, `preflightCheck()` | `device-health:get-score` |
| **Proxy Settings & ASocks Assignment** | [proxy.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/proxy.service.js) | `saveApiKey()`, `assignToCampaign()` | `proxy:save-api-key` |
| **Telegram Multi-Account & Messaging** | [telegram.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/telegram.service.js) | `sendPhoneCode()`, `sendMessage()` | `telegram:send-message` |
| **Database Queries, Tables & Migrations** | [database.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/database.service.js) | `initialize()`, `run()`, `get()`, `all()` | `db-query` |
| **REST API Server & Routes** | [server.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/api/server.js) | `setupMiddleware()`, `setupRoutes()` | `rest-api:start` |
| **License Verification & Offline Keys** | [license-validator.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/security/license-validator.js) | `validate()`, `activate()` | `license:activate`, `license:validate` |
| **Hardware Fingerprint (Machine ID)** | [hardware-fingerprint.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/security/hardware-fingerprint.js) | `getMachineId()` | `license:get-machine-id` |
| **Reseller White-labeling & Branding** | [reseller-config.json](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/config/reseller-config.json) | JSON config: company, logo, support URL | `reseller:get-config` |
| **Group Grabber & Participant Extraction** | [whatsapp.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/whatsapp.service.js) | `fetchAllGroups()`, `getGroupMetadata()` | `whatsapp:fetch-all-groups` |
| **Phone Number Batch Verification** | [whatsapp.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/whatsapp.service.js) | `verifyNumbersBatch()` | `whatsapp:verify-numbers-batch` |
| **LID to Phone Number Resolution** | [recipient-resolver.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/recipient-resolver.service.js) | `resolveLIDToPhone()` | `whatsapp:resolve-lid` |
| **Drip Follow-ups & Reminders** | [followup-scheduler.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/followup-scheduler.service.js) | `scheduleFollowUp()` | Follow-up scheduler |
| **Voice Note Speech-to-Text** | [voice-transcription.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/voice-transcription.service.js) | `transcribeAudio()` | Inbound voice note event |
| **Database Backup & Restoration** | [backup.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/backup.service.js) | `createBackup()`, `restoreBackup()` | `backup:create`, `backup:restore` |
| **Translations & i18n Localization** | [translation.service.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/services/translation.service.js) | `updateTranslation()` | `translation:update-translation` |
| **Electron IPC Handler Bridge** | [electron.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/electron.js) | `ipcMain.handle(...)` lines 3000-8500 | `ipcMain.handle` / `preload.js` |
| **Preload UI Bridge (`window.electronAPI`)**| [preload.js](file:///home/jitendra/Desktop/leadwave/leadwave_clean/build/preload.js) | `contextBridge.exposeInMainWorld` | All IPC calls from React |

---

## 4. Operational Invariants for AI Agents

1. **Targeted Reading**: Always use `view_file` with explicit `StartLine` and `EndLine`. Never read 800 lines if 40 lines are needed.
2. **Minimal Edits**: Use `replace_file_content` for surgical modifications. Never rewrite complete files.
3. **No Unneeded Dependencies**: Avoid introducing new npm packages when native Node.js or existing dependencies (`better-sqlite3`, `axios`, `crypto`, `baileys`) can solve the issue.
4. **Preserve Compatibility**: Keep function signatures and database column defaults backward-compatible.
