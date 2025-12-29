const DEFAULT_DURATION = 3000;

const GameStates = {
  STATES: {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
  },

  _messageEl: null,

  _ensureElement() {
    if (!this._messageEl) {
      this._messageEl = document.getElementById('game-message');
      if (!this._messageEl) return null;
      this._messageEl.style.pointerEvents = 'auto';
      this._messageEl.style.padding = '10px 16px';
      this._messageEl.style.borderRadius = '8px';
      this._messageEl.style.background = 'rgba(0,0,0,0.6)';
      this._messageEl.style.color = '#dffaff';
      this._messageEl.style.fontFamily = "'Orbitron', monospace";
      this._messageEl.style.fontSize = '16px';
      this._messageEl.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.6)';
      this._messageEl.style.transition = 'opacity 200ms ease';
      this._messageEl.style.opacity = '0';
    }

    return this._messageEl;
  },

  showTemporary(text, duration = DEFAULT_DURATION) {
    const el = this._ensureElement();
    if (!el) return;

    el.textContent = text;
    el.classList.remove('hidden');
    requestAnimationFrame(() => (el.style.opacity = '1'));

    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this.hide(), duration);
  },

  showPersistent(text) {
    const el = this._ensureElement();
    if (!el) return;
    if (this._hideTimer) clearTimeout(this._hideTimer);
    el.textContent = text;
    el.classList.remove('hidden');
    requestAnimationFrame(() => (el.style.opacity = '1'));
  },

  hide() {
    const el = this._ensureElement();
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => {
      el.classList.add('hidden');
      el.textContent = '';
    }, 220);
  }
};

export default GameStates;
