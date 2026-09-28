/**
 * WAGrow WhatsApp CRM - License & Trial Activation Hub
 * Dual Options:
 * 1. "I Have a License Key" (Paid / Pro / Reseller Key)
 * 2. "2-Day Free Trial" (Instant activation via Name & WhatsApp)
 */
(function () {
  'use strict';

  let activatorInjected = false;
  let isSubmitting = false;

  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbynPdf4uikZeryEdTVTm8Ymc26CtSwLzvGZ7QuVCxVENotWhy_lUM7TES2XTd4JMe4/exec';

  function injectStyles() {
    if (document.getElementById('wagrow-activator-styles')) return;
    const style = document.createElement('style');
    style.id = 'wagrow-activator-styles';
    style.textContent = `
      .wg-hub-card {
        background: linear-gradient(145deg, rgba(17, 24, 39, 0.96) 0%, rgba(10, 15, 29, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        color: #f8fafc;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      .wg-hub-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #10b981, #06b6d4, #6366f1);
      }

      /* Tab Switcher */
      .wg-tabs-header {
        display: flex;
        gap: 6px;
        background: rgba(3, 7, 18, 0.7);
        padding: 4px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 16px;
      }
      .wg-tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 9px 12px;
        border-radius: 9px;
        font-size: 12.5px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        color: #94a3b8;
        background: transparent;
      }
      .wg-tab-btn:hover {
        color: #f8fafc;
        background: rgba(255, 255, 255, 0.04);
      }
      .wg-tab-btn.active {
        color: #ffffff;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%);
        border: 1px solid rgba(16, 185, 129, 0.4);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
      }
      .wg-tab-btn.active.tab-trial-btn {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.2) 100%);
        border: 1px solid rgba(99, 102, 241, 0.4);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
      }

      /* Pane Headers */
      .wg-pane-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .wg-pane-title {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .wg-badge-paid {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        border-radius: 20px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .wg-badge-trial {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        background: rgba(99, 102, 241, 0.15);
        border: 1px solid rgba(99, 102, 241, 0.35);
        color: #a5b4fc;
        border-radius: 20px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .wg-pane-desc {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.45;
        margin-bottom: 14px;
      }

      /* Fields & Inputs */
      .wg-field {
        margin-bottom: 12px;
      }
      .wg-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .wg-input {
        width: 100%;
        padding: 11px 14px;
        background: rgba(8, 13, 24, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: #ffffff;
        font-size: 13.5px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      }
      .wg-input:focus {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        background: rgba(8, 13, 24, 1);
      }
      .wg-input.input-mono {
        font-family: 'JetBrains Mono', monospace, ui-monospace, Menlo, Consolas;
        letter-spacing: 0.04em;
      }
      .wg-input::placeholder {
        color: #64748b;
      }

      /* Action Buttons */
      .wg-btn {
        width: 100%;
        margin-top: 14px;
        padding: 12px 18px;
        border: none;
        border-radius: 11px;
        color: #ffffff;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
      }
      .wg-btn-paid {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      }
      .wg-btn-paid:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55);
      }
      .wg-btn-trial {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
      }
      .wg-btn-trial:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 22px rgba(79, 70, 229, 0.55);
      }
      .wg-btn:active {
        transform: translateY(0);
      }
      .wg-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }

      /* Feedback Messages */
      .wg-msg {
        margin-top: 12px;
        padding: 10px 14px;
        border-radius: 9px;
        font-size: 12px;
        line-height: 1.45;
        display: none;
      }
      .wg-msg.error {
        display: block;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #fca5a5;
      }
      .wg-msg.success {
        display: block;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #6ee7b7;
      }

      .wg-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: wg-spin 0.8s linear infinite;
      }
      @keyframes wg-spin {
        to { transform: rotate(360deg); }
      }

      /* Footnote / Help link */
      .wg-footnote {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        text-align: center;
        font-size: 11px;
        color: #64748b;
      }
      .wg-footnote a {
        color: #38bdf8;
        text-decoration: none;
        cursor: pointer;
      }
      .wg-footnote a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  function createHubCard() {
    const card = document.createElement('div');
    card.id = 'wagrow-license-hub';
    card.className = 'wg-hub-card';
    card.innerHTML = `
      <!-- Tabs -->
      <div class="wg-tabs-header">
        <button type="button" id="wg-tab-paid-btn" class="wg-tab-btn active">
          <span>🔑</span>
          <span>I Have a Key (Paid / Pro)</span>
        </button>
        <button type="button" id="wg-tab-trial-btn" class="wg-tab-btn tab-trial-btn">
          <span>🎁</span>
          <span>2-Day Free Trial</span>
        </button>
      </div>

      <!-- PANE 1: Paid License Key -->
      <div id="wg-pane-paid" class="wg-pane">
        <div class="wg-pane-header">
          <div class="wg-pane-title">
            <span>🔑</span>
            <span>Activate Software License</span>
          </div>
          <span class="wg-badge-paid">Paid / Lifetime</span>
        </div>
        <p class="wg-pane-desc">
          Apne Admin ya Reseller Partner se mili License Key enter karein aur software turant unlock karein.
        </p>

        <form id="wg-paid-form" onsubmit="return false;">
          <div class="wg-field">
            <label class="wg-label" for="wg-paid-key-input">License Key</label>
            <input
              type="text"
              id="wg-paid-key-input"
              class="wg-input input-mono"
              placeholder="e.g. LW-XXXX-XXXX-XXXX-XXXX"
              autocomplete="off"
              spellcheck="false"
              required
            />
          </div>

          <button type="submit" id="wg-paid-submit-btn" class="wg-btn wg-btn-paid">
            <span>⚡ Activate License &amp; Launch App</span>
          </button>

          <div id="wg-paid-msg" class="wg-msg"></div>
        </form>
      </div>

      <!-- PANE 2: 2-Day Free Trial -->
      <div id="wg-pane-trial" class="wg-pane" style="display: none;">
        <div class="wg-pane-header">
          <div class="wg-pane-title">
            <span>🎁</span>
            <span>Start 2-Day Free Trial</span>
          </div>
          <span class="wg-badge-trial">Free 48h Access</span>
        </div>
        <p class="wg-pane-desc">
          Apna naam aur WhatsApp number enter karein. Bina kisi credit card ke instant 2 din ka free trial activate hoga!
        </p>

        <form id="wg-trial-form" onsubmit="return false;">
          <div class="wg-field">
            <label class="wg-label" for="wg-trial-name">Aapka Pura Naam / Full Name</label>
            <input type="text" id="wg-trial-name" class="wg-input" placeholder="e.g. Rahul Sharma" autocomplete="name" required />
          </div>

          <div class="wg-field">
            <label class="wg-label" for="wg-trial-mobile">WhatsApp Number (10 Digits)</label>
            <input type="tel" id="wg-trial-mobile" class="wg-input" placeholder="e.g. 9876543210" autocomplete="tel" required />
          </div>

          <button type="submit" id="wg-trial-submit-btn" class="wg-btn wg-btn-trial">
            <span>⚡ Generate &amp; Activate 2-Day Trial</span>
          </button>

          <div id="wg-trial-msg" class="wg-msg"></div>
        </form>
      </div>

      <!-- Bottom helper -->
      <div class="wg-footnote">
        🔒 Official License Verification &amp; Security System
      </div>
    `;

    // Elements
    const tabPaidBtn = card.querySelector('#wg-tab-paid-btn');
    const tabTrialBtn = card.querySelector('#wg-tab-trial-btn');
    const panePaid = card.querySelector('#wg-pane-paid');
    const paneTrial = card.querySelector('#wg-pane-trial');

    // Tab Switching
    tabPaidBtn.addEventListener('click', () => {
      tabPaidBtn.classList.add('active');
      tabTrialBtn.classList.remove('active');
      panePaid.style.display = 'block';
      paneTrial.style.display = 'none';
      const keyIn = card.querySelector('#wg-paid-key-input');
      if (keyIn) keyIn.focus();
    });

    tabTrialBtn.addEventListener('click', () => {
      tabTrialBtn.classList.add('active');
      tabPaidBtn.classList.remove('active');
      paneTrial.style.display = 'block';
      panePaid.style.display = 'none';
      const nameIn = card.querySelector('#wg-trial-name');
      if (nameIn) nameIn.focus();
    });

    // Handle Paid Form Submission
    const paidForm = card.querySelector('#wg-paid-form');
    const paidBtn = card.querySelector('#wg-paid-submit-btn');
    const paidMsg = card.querySelector('#wg-paid-msg');
    const paidKeyInput = card.querySelector('#wg-paid-key-input');

    paidForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const key = (paidKeyInput.value || '').trim();
      if (!key || key.length < 5) {
        showMsg(paidMsg, 'Kripya sahi License Key enter karein.', 'error');
        paidKeyInput.focus();
        return;
      }

      isSubmitting = true;
      paidBtn.disabled = true;
      paidBtn.innerHTML = '<span class="wg-spinner"></span><span>Verifying &amp; Activating License...</span>';
      showMsg(paidMsg, '', '');

      try {
        let res = null;

        // Try direct GAS activation handler in Electron API
        if (window.electronAPI?.license?.activateGasPaidKey) {
          res = await window.electronAPI.license.activateGasPaidKey({
            license_key: key,
            gas_url: DEFAULT_GAS_URL
          });
        } else if (window.electronAPI?.license?.activate) {
          // Fallback to native activate method
          res = await window.electronAPI.license.activate(key);
        }

        if (res && res.success) {
          showMsg(paidMsg, res.message || '🎉 Mubarak! License activate ho gaya! Software chalu ho raha hai...', 'success');
          paidKeyInput.disabled = true;
          paidBtn.innerHTML = '<span>✅ License Active! Launching...</span>';
          setTimeout(() => {
            window.location.reload();
          }, 1600);
        } else {
          const errMsg = (res && res.message) ? res.message : 'Galat license key hai ya server se connect nahi hua.';
          showMsg(paidMsg, errMsg, 'error');
          paidBtn.disabled = false;
          paidBtn.innerHTML = '<span>⚡ Activate License &amp; Launch App</span>';
          isSubmitting = false;
        }
      } catch (err) {
        showMsg(paidMsg, '❌ Error: ' + (err.message || 'Activation failed.'), 'error');
        paidBtn.disabled = false;
        paidBtn.innerHTML = '<span>⚡ Activate License &amp; Launch App</span>';
        isSubmitting = false;
      }
    });

    // Handle Trial Form Submission
    const trialForm = card.querySelector('#wg-trial-form');
    const trialBtn = card.querySelector('#wg-trial-submit-btn');
    const trialMsg = card.querySelector('#wg-trial-msg');
    const trialNameIn = card.querySelector('#wg-trial-name');
    const trialMobileIn = card.querySelector('#wg-trial-mobile');

    trialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const name = (trialNameIn.value || '').trim();
      const mobile = (trialMobileIn.value || '').replace(/[^0-9]/g, '');

      if (!name || name.length < 2) {
        showMsg(trialMsg, 'Kripya apna pura naam likhein (kam se kam 2 akshar).', 'error');
        trialNameIn.focus();
        return;
      }
      if (!mobile || mobile.length < 10) {
        showMsg(trialMsg, 'Valid 10-digit WhatsApp number likhein.', 'error');
        trialMobileIn.focus();
        return;
      }

      isSubmitting = true;
      trialBtn.disabled = true;
      trialBtn.innerHTML = '<span class="wg-spinner"></span><span>Trial Activate Ho Raha Hai...</span>';
      showMsg(trialMsg, '', '');

      try {
        if (!window.electronAPI?.license?.requestGasTrial) {
          throw new Error('Trial activation API load nahi hui. App restart karein.');
        }

        const res = await window.electronAPI.license.requestGasTrial({
          name: name,
          mobile: mobile,
          gas_url: DEFAULT_GAS_URL
        });

        if (res && res.success) {
          showMsg(trialMsg, '🎉 Mubarak! 2 Din ka Trial Activate Ho Gaya! App start ho raha hai...', 'success');
          trialNameIn.disabled = true;
          trialMobileIn.disabled = true;
          trialBtn.innerHTML = '<span>✅ Trial Active! Launching...</span>';
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        } else {
          const errMsg = (res && res.message) ? res.message : 'Trial activate nahi ho saka.';
          showMsg(trialMsg, errMsg, 'error');
          trialBtn.disabled = false;
          trialBtn.innerHTML = '<span>⚡ Generate &amp; Activate 2-Day Trial</span>';
          isSubmitting = false;
        }
      } catch (err) {
        showMsg(trialMsg, '❌ Error: ' + (err.message || 'Server se connect nahi ho saka.'), 'error');
        trialBtn.disabled = false;
        trialBtn.innerHTML = '<span>⚡ Generate &amp; Activate 2-Day Trial</span>';
        isSubmitting = false;
      }
    });

    function showMsg(el, text, type) {
      if (!text) {
        el.className = 'wg-msg';
        el.style.display = 'none';
        el.textContent = '';
        return;
      }
      el.className = 'wg-msg ' + type;
      el.textContent = text;
      el.style.display = 'block';
    }

    return card;
  }

  function tryInject() {
    if (document.getElementById('wagrow-license-hub')) return;

    const licenseInput = document.getElementById('licenseKey');
    const root = document.getElementById('root');
    if (!root) return;

    injectStyles();

    let targetContainer = null;

    // Case 1: Built-in Step 02 (Form with #licenseKey input)
    if (licenseInput) {
      const form = licenseInput.closest('form');
      if (form && form.parentElement) {
        targetContainer = form.parentElement;
        const card = createHubCard();
        targetContainer.insertBefore(card, form);
        activatorInjected = true;

        // Auto-sync input if user types in either
        const hubInput = card.querySelector('#wg-paid-key-input');
        if (hubInput) {
          hubInput.addEventListener('input', () => {
            licenseInput.value = hubInput.value;
            licenseInput.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
        return;
      }
    }

    // Case 2: Built-in Step 01 (Contains "Device Code" or "Identify" or "ACTIVATION REQUIRED")
    const codeElement = root.querySelector('code');
    if (codeElement && (root.innerText.includes('Device Code') || root.innerText.includes('Identify') || root.innerText.includes('ACTIVATION REQUIRED'))) {
      const codeBox = codeElement.closest('.relative.mb-5') || codeElement.parentElement?.parentElement?.parentElement;
      if (codeBox && codeBox.parentElement) {
        targetContainer = codeBox.parentElement;
        const card = createHubCard();
        targetContainer.insertBefore(card, codeBox);
        activatorInjected = true;
        return;
      }
    }

    // Case 3: Right side container column
    const col3 = root.querySelector('.lg\\:col-span-3');
    if (col3) {
      const card = createHubCard();
      col3.insertBefore(card, col3.firstChild);
      activatorInjected = true;
    }
  }

  // Observe DOM for changes
  const observer = new MutationObserver(() => {
    tryInject();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryInject();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    tryInject();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
