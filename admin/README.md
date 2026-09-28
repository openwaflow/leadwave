# 🚀 LeadWave Licensing Admin Panel (100% Free Serverless)

A modern, high-performance Admin & Licensing Portal for **LeadWave WhatsApp CRM**.
- **Frontend**: React + Vite (Hosted for free on **Vercel**)
- **Backend & Database**: **Google Sheets + Google Apps Script** (100% Free, zero server maintenance)

---

## ⚡ 1. Backend Setup: Google Sheet (2 Minutes)

1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet named **`LeadWave Licensing DB`**.
2. Click **Extensions** > **Apps Script**.
3. Delete any code in the editor, and paste the entire code from:
   📁 [`google-apps-script/Code.gs`](./google-apps-script/Code.gs)
4. In the Apps Script toolbar, select the function **`initDatabase`** and click **Run** (Grant permissions once).
   - This creates 3 sheets: `Licenses`, `Activations`, and `Settings`.
5. Click **Deploy** (top right) > **New deployment**:
   - **Select type**: Web app (click gear icon ⚙️)
   - **Description**: `LeadWave Admin API`
   - **Execute as**: `Me (your email)`
   - **Who has access**: **`Anyone`** ⚠️ *(Crucial so Vercel & Desktop can connect)*
6. Click **Deploy** and copy your **Web App URL** (looks like: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 🌐 2. Frontend Deployment: Vercel (1-Click Free)

### Option A: Via GitHub (Recommended)
1. Push this `leadwave-admin` directory to a GitHub repository (e.g. `leadwave-admin`).
2. Go to [Vercel](https://vercel.com) and click **Add New** > **Project**.
3. Import your `leadwave-admin` repo.
4. Click **Deploy**! (Vercel automatically detects Vite and builds it in seconds).

### Option B: Local Testing
Run in your terminal:
```bash
cd /home/jitendra/Desktop/leadwave/leadwave-admin
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔐 3. Login & Configuration

1. Open your deployed Vercel URL (or localhost).
2. Click **"Configure Google Apps Script URL"** and paste the Web App URL from Step 1.
3. Enter the default Master Admin PIN: **`123456`**.
4. Click **Unlock Admin Dashboard**!
*(You can change the PIN anytime from the Settings modal or directly in your Google Sheet)*.

---

## 💻 4. Connect LeadWave Desktop App

To make the desktop app validate against this Google Sheet server:
Set your environment variable or config in `leadwave_clean`:
```env
NEWLIC_API_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
```
The desktop app will automatically:
- Verify license keys on startup
- Enforce expiry dates
- Enforce maximum allowed PC/devices
- Allow device resets from the Admin Panel
