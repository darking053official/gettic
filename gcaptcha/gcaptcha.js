class GCaptchaWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._verified = false;
    this._token = null;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; margin: 8px 0; user-select: none; max-width: 300px; }
        .gcaptcha-container { background: #ffffff; border: 1px solid #d1d5db; border-radius: 4px; padding: 2px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.3s ease; height: 60px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .gcaptcha-container:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .gcaptcha-container.verified { border-color: #10b981; background: #f0fdf4; cursor: default; }
        .gcaptcha-left { display: flex; align-items: center; gap: 10px; padding: 0 14px; }
        .gcaptcha-checkbox { width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 3px; background: #fff; transition: all 0.3s ease; position: relative; flex-shrink: 0; }
        .gcaptcha-checkbox.checked { background: #10b981; border-color: #10b981; }
        .gcaptcha-checkbox svg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); transition: transform 0.2s ease; }
        .gcaptcha-checkbox.checked svg { transform: translate(-50%, -50%) scale(1); }
        .gcaptcha-label { font-size: 13px; font-weight: 400; color: #374151; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .gcaptcha-right { display: flex; align-items: center; gap: 6px; padding: 0 10px; flex-shrink: 0; }
        .gcaptcha-logo { display: flex; align-items: center; gap: 4px; }
        .gcaptcha-logo img { width: 20px; height: 20px; border-radius: 3px; }
        .gcaptcha-logo span { font-size: 9px; font-weight: 700; color: #9ca3af; }
        .gcaptcha-spinner { width: 18px; height: 18px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: gcaptcha-spin 0.6s linear infinite; display: none; }
        @keyframes gcaptcha-spin { to { transform: rotate(360deg); } }
        .gcaptcha-footer { display: flex; justify-content: flex-end; align-items: center; margin-top: 4px; padding-right: 4px; }
        .gcaptcha-terms { font-size: 8px; color: #d1d5db; }
      </style>
      <div class="gcaptcha-container" id="container">
        <div class="gcaptcha-left">
          <div class="gcaptcha-checkbox" id="checkbox">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span class="gcaptcha-label">Ben robot değilim</span>
        </div>
        <div class="gcaptcha-right">
          <div class="gcaptcha-spinner" id="spinner"></div>
          <div class="gcaptcha-logo">
            <img src="https://raw.githubusercontent.com/darking053official/gettic/main/1777062266055.png" alt="Gettic">
            <span>GETTIC</span>
          </div>
        </div>
      </div>
      <div class="gcaptcha-footer"><span class="gcaptcha-terms">Gettic Güvenlik</span></div>
    `;

    const container = this.shadowRoot.getElementById('container');
    const checkbox = this.shadowRoot.getElementById('checkbox');
    const spinner = this.shadowRoot.getElementById('spinner');
    const label = this.shadowRoot.querySelector('.gcaptcha-label');

 const self = this;
container.addEventListener('click', async () => {
  if (self._verified) return;
  self._verified = true;
  checkbox.classList.add('checked');
  spinner.style.display = 'block';
  label.textContent = 'Doğrulanıyor...';
  label.style.color = '#6b7280';
  await new Promise(r => setTimeout(r, 2000));
  spinner.style.display = 'none';
  self._token = 'gcaptcha_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  container.classList.add('verified');
  label.textContent = 'Doğrulandı!';
  label.style.color = '#10b981';
});
    
  getValue() { return this._verified ? this._token : null; }

  reset() {
    this._verified = false;
    this._token = null;
    this.connectedCallback();
  }
}

customElements.define('gcaptcha-widget', GCaptchaWidget);
