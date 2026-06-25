(() => {
  const STORAGE_KEY = 'closeSalesPrivacyMode';
  const MASK = 'RM••••';
  const MONEY_PATTERN = /^[−-]?\s*RM[\d,.Kk\s]+$/;
  let isApplying = false;
  let scheduled = false;

  const privacyOn = () => localStorage.getItem(STORAGE_KEY) === 'on';

  function makeMask(text) {
    return /^[−-]/.test(String(text).trim()) ? `−${MASK}` : MASK;
  }

  function shouldMask(element) {
    const text = element.textContent.trim();
    if (!text || text.includes('••••')) return false;
    return MONEY_PATTERN.test(text);
  }

  function sensitiveElements() {
    return [
      ...document.querySelectorAll('#dashboard .metric-card strong'),
      ...document.querySelectorAll('#dashboard .monthly-sales-chart svg text'),
      ...document.querySelectorAll('.monthly-detail-modal .monthly-detail-total strong'),
      ...document.querySelectorAll('.monthly-detail-modal .monthly-detail-row > strong')
    ];
  }

  function applyPrivacyMode() {
    if (isApplying) return;
    isApplying = true;
    const on = privacyOn();
    document.body.classList.toggle('privacy-mode', on);
    const toggle = document.querySelector('#privacy-mode-toggle');
    if (toggle) toggle.checked = on;

    sensitiveElements().forEach(element => {
      if (on) {
        if (shouldMask(element)) {
          element.dataset.privacyOriginal = element.textContent;
          element.textContent = makeMask(element.textContent);
          element.classList.add('privacy-value');
        }
      } else if (element.dataset.privacyOriginal) {
        element.textContent = element.dataset.privacyOriginal;
        delete element.dataset.privacyOriginal;
        element.classList.remove('privacy-value');
      }
    });
    isApplying = false;
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyPrivacyMode();
    });
  }

  function installToggle() {
    const controls = document.querySelector('.monthly-sales-panel .panel-heading > div:last-child');
    if (!controls || document.querySelector('.privacy-toggle')) return Boolean(controls);

    const label = document.createElement('label');
    label.className = 'privacy-toggle';
    label.innerHTML = `
      <span>Privacy Mode</span>
      <input id="privacy-mode-toggle" type="checkbox" aria-label="Privacy Mode" />
      <span class="privacy-toggle-track" aria-hidden="true"></span>
    `;
    controls.prepend(label);
    label.querySelector('input').checked = privacyOn();
    label.querySelector('input').addEventListener('change', event => {
      localStorage.setItem(STORAGE_KEY, event.target.checked ? 'on' : 'off');
      applyPrivacyMode();
    });
    return true;
  }

  function initPrivacyMode() {
    installToggle();
    applyPrivacyMode();
    const observer = new MutationObserver(() => {
      installToggle();
      scheduleApply();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setTimeout(() => { installToggle(); applyPrivacyMode(); }, 300);
    setTimeout(() => { installToggle(); applyPrivacyMode(); }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPrivacyMode, { once: true });
  } else {
    initPrivacyMode();
  }
})();
