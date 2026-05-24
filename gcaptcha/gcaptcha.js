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
        :host { display: block; margin: 10px 0; user-select: none; }
        .gcaptcha-container {
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 74px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .gcaptcha-container:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .gcaptcha-container.verified {
          border-color: #10b981;
          background: #f0fdf4;
          cursor: default;
        }
        .gcaptcha-container.verified:hover {
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .gcaptcha-left {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }
        .gcaptcha-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid #d1d5db;
          border-radius: 3px;
          background: #fff;
          transition: all 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }
        .gcaptcha-checkbox.checked {
          background: #10b981;
          border-color: #10b981;
        }
        .gcaptcha-checkbox svg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.2s ease;
        }
        .gcaptcha-checkbox.checked svg {
          transform: translate(-50%, -50%) scale(1);
        }
        .gcaptcha-label {
          font-size: 14px;
          font-weight: 400;
          color: #374151;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .gcaptcha-right {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
        }
        .gcaptcha-logo {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .gcaptcha-logo img {
          width: 24px;
          height: 24px;
          border-radius: 4px;
        }
        .gcaptcha-logo span {
          font-size: 10px;
          font-weight: 700;
          color: #9ca3af;
          letter-spacing: 0.5px;
        }
        .gcaptcha-spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: gcaptcha-spin 0.7s linear infinite;
          display: none;
        }
        @keyframes gcaptcha-spin {
          to { transform: rotate(360deg); }
        }
        .gcaptcha-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
          padding: 0 4px;
        }
        .gcaptcha-help {
          font-size: 10px;
          color: #9ca3af;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .gcaptcha-help:hover {
          background: #f3f4f6;
          color: #6b7280;
        }
        .gcaptcha-help svg {
          width: 12px;
          height: 12px;
        }
        .gcaptcha-terms {
          font-size: 9px;
          color: #d1d5db;
        }
        .gcaptcha-tooltip {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 0;
          background: #1f2937;
          color: #fff;
          font-size: 11px;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .gcaptcha-help-wrap {
          position: relative;
        }
        .gcaptcha-help-wrap:hover .gcaptcha-tooltip {
          display: block;
        }
      </style>
      <div class="gcaptcha-container" id="container">
        <div class="gcaptcha-left">
          <div class="gcaptcha-checkbox" id="checkbox">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
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
      <div class="gcaptcha-footer">
        <div class="gcaptcha-help-wrap">
          <button class="gcaptcha-help" id="helpBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Yardım
          </button>
          <div class="gcaptcha-tooltip">Bot olmadığınızı doğrulamak için tıklayın</div>
        </div>
        <span class="gcaptcha-terms">Gettic Güvenlik</span>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const container = this.shadowRoot.getElementById('container');
    const checkbox = this.shadowRoot.getElementById('checkbox');
    const spinner = this.shadowRoot.getElementById('spinner');
    const label = this.shadowRoot.querySelector('.gcaptcha-label');

    container.addEventListener('click', async () => {
      if (this._verified) return;

      checkbox.classList.add('checked');
      spinner.style.display = 'block';
      label.textContent = 'Doğrulanıyor...';
      label.style.color = '#6b7280';
      
      await new Promise(r => setTimeout(r, 2000));
      
      spinner.style.display = 'none';
      this._verified = true;
      this._token = 'gcaptcha_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      
      container.classList.add('verified');
      label.textContent = 'Doğrulandı!';
      label.style.color = '#10b981';
    });

    this.shadowRoot.getElementById('helpBtn').addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  getValue() {
    return this._verified ? this._token : null;
  }

  reset() {
    this._verified = false;
    this._token = null;
    this.connectedCallback();
  }
}

customElements.define('gcaptcha-widget', GCaptchaWidget);
