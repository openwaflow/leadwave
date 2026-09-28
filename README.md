# WAGrow - WhatsApp Automation & CRM Desktop Application

WAGrow is a full-featured desktop WhatsApp CRM and marketing automation software built with **Electron**, **React**, and **Baileys**.

## Features

- **Multi-Device / Account WhatsApp Pairing** (QR Code & Phone Pairing Code)
- **Live Chat Module** (Real-time conversation management with incoming/outgoing synchronization)
- **Template Messaging & Interactive Buttons** (Quick replies, CTA URL, Call buttons, Polls)
- **Bulk Campaigns & Follow-up Scheduler**
- **Group Grabber & Member Extraction**
- **WhatsApp Number Validator / Batch Checker**
- **Built-in SQLite CRM Database** (Contacts, Notes, Quick Replies, Tags)
- **Cross-Platform Support** (Linux, Windows, macOS)

## Prerequisites

- **Node.js**: v18 - v22
- **npm** or **yarn**

## Installation & Running

```bash
# Clone the repository
git clone https://github.com/openwaflow/leadwave.git
cd leadwave

# Install dependencies
npm install

# Start the application in development/production mode
npm start
```

## Packaging & Multi-Platform Desktop Builds

To package native desktop executables for each operating system:

```bash
# Build for Linux (.AppImage and .deb installer)
npm run build:linux

# Build for Windows (.exe NSIS Installer and Portable .exe)
npm run build:win

# Build for macOS (.dmg and .zip)
npm run build:mac

# Build for all platforms at once
npm run build:all
```

### Automated Cloud Builds (GitHub Actions CI/CD)
Whenever you push code to GitHub (`main` branch) or create a new release tag (`v*`), the included GitHub Actions workflow automatically builds all 3 platforms (Ubuntu Linux, Windows, and macOS) on dedicated cloud runners and generates the download artifacts.

## License

MIT
