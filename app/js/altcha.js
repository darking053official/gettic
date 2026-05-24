class AltchaWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const challengeurl = this.getAttribute('challengeurl') || '/api/auth/altcha';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; margin: 10px 0; }
        .altcha-box {
          background: var(--bg2, #1a0f24);
          border: 1px solid var(--b2, #333);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .altcha-checkbox {
          width: 24px; height: 24px;
          accent-color: #ec4899;
        }
        .altcha-label {
          font-size: 12px;
          cursor: pointer;
          color: var(--t2, #ccc);
        }
      </style>
      <div class="altcha-box">
        <input type="checkbox" class="altcha-checkbox" id="altcha-check">
        <label for="altcha-check" class="altcha-label">Ben robot değilim</label>
      </div>
    `;
    
    this.shadowRoot.querySelector('.altcha-checkbox').addEventListener('change', async () => {
      try {
        const res = await fetch(challengeurl);
        const data = await res.json();
        this._payload = data;
      } catch(e) {
        console.error('Altcha fetch error:', e);
      }
    });
  }

  getValue() {
    return this.shadowRoot.querySelector('.altcha-checkbox').checked ? (this._payload || 'verified') : null;
  }

  reset() {
    const cb = this.shadowRoot.querySelector('.altcha-checkbox');
    if (cb) cb.checked = false;
    this._payload = null;
  }
}

customElements.define('altcha-widget', AltchaWidget);
