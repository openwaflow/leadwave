# Lead Wave - WhatsApp Automation & CRM Desktop Application

Lead Wave is a full-featured desktop WhatsApp CRM and marketing automation software built with **Electron**, **React**, and **Baileys**.

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

## Packaging & Distribution

To package the application for your operating system:

```bash
# Build desktop executable (configured via electron-builder)
npm run build
```

## License

MIT
