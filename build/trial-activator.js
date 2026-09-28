/**
 * WAGrow WhatsApp CRM - Free 2-Day Trial Activation Injector
 * Seamlessly injects the 2-Day Trial form into the initial license screen
 */
(function () {
  'use strict';

  let trialInjected = false;
  let isSubmitting = false;

  function injectStyles() {
    if (document.getElementById('wagrow-trial-styles')) return;
    const style = document.createElement('style');
    style.id = 'wagrow-trial-styles';
    style.textContent = `
      .wg-trial-card {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 16px;
        padding: 18px 20px;
        margin-bottom: 20px;
        box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05);
        color: #f8fafc;
        font-family: inherit;
        position: relative;
        overflow: hidden;
      }
      .wg-trial-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
      }
      .wg-trial-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .wg-trial-title {
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .wg-trial-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        border-radius: 20px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .wg-trial-desc {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.4;
        margin-bottom: 14px;
      }
      .wg-trial-field {
        margin-bottom: 10px;
      }
      .wg-trial-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #cbd5e1;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .wg-trial-input {
        width: 100%;
        padding: 9px 12px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 9px;
        color: #ffffff;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      .wg-trial-input:focus {
        border-color: #818cf8;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
      }
      .wg-trial-input::placeholder {
        color: #64748b;
      }
      .wg-trial-btn {
        width: 100%;
        margin-top: 12px;
        padding: 11px 16px;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        border: none;
        border-radius: 10px;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      }
      .wg-trial-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.55);
      }
      .wg-trial-btn:active {
        transform: translateY(0);
      }
      .wg-trial-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }
      .wg-trial-msg {
        margin-top: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.4;
        display: none;
      }
      .wg-trial-msg.error {
        display: block;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #fca5a5;
      }
      .wg-trial-msg.success {
        display: block;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #6ee7b7;
      }
      .wg-trial-divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 16px 0 12px 0;
        color: #64748b;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .wg-trial-divider::before,
      .wg-trial-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(148, 163, 184, 0.2);
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
    `;
    document.head.appendChild(style);
  }

  function createTrialCard() {
    const card = document.createElement('div');
    card.id = 'wagrow-trial-section';
    card.className = 'wg-trial-card';
    card.innerHTML = `
      <div class="wg-trial-header">
        <div class="wg-trial-title">
          <span>🎁</span>
          <span>Start 2-Day Free Trial</span>
        </div>
        <span class="wg-trial-badge">Free Access</span>
      </div>
      <p class="wg-trial-desc">
        Apna naam aur WhatsApp number enter karein. Instant 2 din ka trial bina kisi credit card ke activate ho jayega!
      </p>

      <form id="wg-trial-form" onsubmit="return false;">
        <div class="wg-trial-field">
          <label class="wg-trial-label" for="wg-name">Aapka Pura Naam / Full Name</label>
          <input type="text" id="wg-name" class="wg-trial-input" placeholder="e.g. Rahul Sharma" autocomplete="name" required />
        </div>

        <div class="wg-trial-field">
          <label class="wg-trial-label" for="wg-mobile">WhatsApp Number</label>
          <input type="tel" id="wg-mobile" class="wg-trial-input" placeholder="e.g. 9876543210 (10 digits)" autocomplete="tel" required />
        </div>

        <button type="submit" id="wg-trial-btn" class="wg-trial-btn">
          <span>⚡ Generate &amp; Activate 2-Day Trial</span>
        </button>

        <div id="wg-trial-msg" class="wg-trial-msg"></div>
      </form>

      <div class="wg-trial-divider">Ya Fir Paid License Key Use Karein</div>
    `;

    const form = card.querySelector('#wg-trial-form');
    const btn = card.querySelector('#wg-trial-btn');
    const msg = card.querySelector('#wg-trial-msg');
    const nameIn = card.querySelector('#wg-name');
    const mobileIn = card.querySelector('#wg-mobile');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      const name = (nameIn.value || '').trim();
      const mobile = (mobileIn.value || '').replace(/[^0-9]/g, '');

      if (!name || name.length < 2) {
        showMsg('Kripya apna pura naam likhein (kam se kam 2 akshar).', 'error');
        nameIn.focus();
        return;
      }
      if (!mobile || mobile.length < 10) {
        showMsg('Valid 10-digit WhatsApp number likhein.', 'error');
        mobileIn.focus();
        return;
      }

      isSubmitting = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="wg-spinner"></span><span>Trial Activate Ho Raha Hai...</span>';
      showMsg('', '');

      try {
        if (!window.electronAPI || !window.electronAPI.license || !window.electronAPI.license.requestGasTrial) {
          throw new Error('Trial activation API load nahi hui. App restart karein.');
        }

        const res = await window.electronAPI.license.requestGasTrial({
          name: name,
          mobile: mobile,
          gas_url: 'https://script.google.com/macros/s/AKfycbz1XvaCZjCbonh1bqeNycOGFwFD7rApZUMuZb3XMOsIfJtoHlVFUqJILdfOVcRlEpk/exec'
        });

        if (res && res.success) {
          showMsg('🎉 Mubarak! 2 Din ka Trial Activate Ho Gaya! App start ho raha hai...', 'success');
          nameIn.disabled = true;
          mobileIn.disabled = true;
          btn.innerHTML = '<span>✅ Trial Active! Launching...</span>';
          setTimeout(() => {
            window.location.reload();
          }, 1800);
        } else {
          const errMsg = (res && res.message) ? res.message : 'Trial activate nahi ho saka. Dobara koshish karein.';
          showMsg('❌ ' + errMsg, 'error');
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ Generate &amp; Activate 2-Day Trial</span>';
          isSubmitting = false;
        }
      } catch (err) {
        showMsg('❌ Error: ' + (err.message || 'Server se connect nahi ho saka.'), 'error');
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Generate &amp; Activate 2-Day Trial</span>';
        isSubmitting = false;
      }
    });

    function showMsg(text, type) {
      if (!text) {
        msg.className = 'wg-trial-msg';
        msg.style.display = 'none';
        msg.textContent = '';
        return;
      }
      msg.className = 'wg-trial-msg ' + type;
      msg.textContent = text;
      msg.style.display = 'block';
    }

    return card;
  }

  function tryInject() {
    if (document.getElementById('wagrow-trial-section')) return;

    // Check if we are on the license activation screen
    // Step 01 contains "Your Device Code" or "Identify" or "How to activate"
    // Step 02 contains "licenseKey" input or "ENTER LICENSE KEY"
    const licenseInput = document.getElementById('licenseKey');
    const root = document.getElementById('root');
    if (!root) return;

    injectStyles();

    // Look for the license right-side panel:
    // It typically has classes like `p-7 lg:p-10 flex flex-col` or contains the device code or license input
    let targetContainer = null;

    if (licenseInput) {
      // Step 02: Found license key input form
      const form = licenseInput.closest('form');
      if (form && form.parentElement) {
        targetContainer = form.parentElement;
        const card = createTrialCard();
        targetContainer.insertBefore(card, form);
        trialInjected = true;
        return;
      }
    }

    // Step 01: Look for "Your Device Code" box
    const codeElement = root.querySelector('code');
    if (codeElement && (root.innerText.includes('Device Code') || root.innerText.includes('Identify') || root.innerText.includes('ACTIVATION REQUIRED'))) {
      const codeBox = codeElement.closest('.relative.mb-5') || codeElement.parentElement?.parentElement?.parentElement;
      if (codeBox && codeBox.parentElement) {
        targetContainer = codeBox.parentElement;
        const card = createTrialCard();
        targetContainer.insertBefore(card, codeBox);
        trialInjected = true;
        return;
      }
    }

    // Fallback: look for lg:col-span-3
    const col3 = root.querySelector('.lg\\:col-span-3');
    if (col3) {
      const card = createTrialCard();
      col3.insertBefore(card, col3.firstChild);
      trialInjected = true;
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
