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
          background: var(--bg2, #1a0f24);
          border: 1px solid var(--b2, #333);
          border-radius: 8px;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 52px;
        }
        .gcaptcha-container:hover {
          border-color: var(--ac, #ec4899);
          box-shadow: 0 0 12px rgba(236,72,153,0.15);
        }
        .gcaptcha-left {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
        }
        .gcaptcha-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid var(--b2, #555);
          border-radius: 4px;
          background: var(--bg1);
          transition: all 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }
        .gcaptcha-checkbox.checked {
          background: var(--ac, #ec4899);
          border-color: var(--ac, #ec4899);
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
          font-size: 13px;
          font-weight: 500;
          color: var(--t1, #fff);
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
          gap: 4px;
          opacity: 0.6;
          transition: opacity 0.3s;
        }
        .gcaptcha-logo img {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }
        .gcaptcha-logo span {
          font-size: 9px;
          font-weight: 700;
          color: var(--t2, #aaa);
        }
        .gcaptcha-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--b2);
          border-top-color: var(--ac, #ec4899);
          border-radius: 50%;
          animation: gcaptcha-spin 0.6s linear infinite;
          display: none;
        }
        @keyframes gcaptcha-spin {
          to { transform: rotate(360deg); }
        }
        .gcaptcha-badge {
          text-align: center;
          font-size: 8px;
          color: var(--t3, #666);
          margin-top: 4px;
          opacity: 0.5;
        }
      </style>
      <div class="gcaptcha-container" id="container">
        <div class="gcaptcha-left">
          <div class="gcaptcha-checkbox" id="checkbox">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
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
      <div class="gcaptcha-badge">Gettic Güvenlik tarafından korunmaktadır</div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const container = this.shadowRoot.getElementById('container');
    const checkbox = this.shadowRoot.getElementById('checkbox');
    const spinner = this.shadowRoot.getElementById('spinner');

    container.addEventListener('click', async () => {
      if (this._verified) return;

      // Spinner animasyonu
      checkbox.classList.add('checked');
      spinner.style.display = 'block';
      
      // 1.5 saniye "doğrulama" animasyonu
      await new Promise(r => setTimeout(r, 1500));
      
      spinner.style.display = 'none';
      this._verified = true;
      this._token = 'gcaptcha_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      
      // Başarılı animasyonu
      this.shadowRoot.querySelector('.gcaptcha-label').textContent = 'Doğrulandı! ✅';
      this.shadowRoot.querySelector('.gcaptcha-container').style.borderColor = '#10b981';
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
